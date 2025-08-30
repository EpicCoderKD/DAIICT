// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

contract GreenH2CreditsV2 is AccessControl, Pausable {
    bytes32 public constant AUTHORIZER_ROLE = keccak256("AUTHORIZER_ROLE");
    bytes32 public constant CONSUMER_ROLE  = keccak256("CONSUMER_ROLE");
    bytes32 public constant PRODUCER_ROLE = keccak256("PRODUCER_ROLE");

    struct Batch {
        uint256 id;
        address producer;
        uint256 issuedAmount;
        uint256 retiredAmount;
        string  metadataURI; // ipfs://... or cert:...
        uint256 issuedAt;
        bool isApproved; // New: approval status
    }

    struct PurchaseRequest {
        uint256 id;
        address consumer;
        address producer;
        uint256 batchId;
        uint256 requestedAmount;
        uint256 approvedAmount;
        bool isApproved;
        bool isCompleted;
        uint256 requestedAt;
        uint256 completedAt;
    }

    struct ProductionRequest {
        uint256 id;
        address producer;
        uint256 requestedAmount;
        string metadataURI;
        bool isApproved;
        uint256 requestedAt;
        uint256 approvedAt;
    }

    struct Lot { uint256 batchId; uint256 amount; }

    mapping(address => bool) public isWhitelisted;   // KYC allowlist
    mapping(address => uint256) public balanceOf;    // fungible view
    mapping(address => Lot[])   private _holdings;   // per-holder FIFO lots

    mapping(uint256 => Batch) public batches;
    mapping(uint256 => PurchaseRequest) public purchaseRequests;
    mapping(uint256 => ProductionRequest) public productionRequests;
    
    uint256 public nextBatchId;
    uint256 public nextPurchaseRequestId;
    uint256 public nextProductionRequestId;
    uint256 public totalIssued;
    uint256 public totalRetired;

    event ProductionRequested(uint256 indexed requestId, address indexed producer, uint256 amount, string metadataURI);
    event ProductionApproved(uint256 indexed requestId, address indexed producer, uint256 amount, string metadataURI);
    event PurchaseRequested(uint256 indexed requestId, address indexed consumer, address indexed producer, uint256 batchId, uint256 amount);
    event PurchaseApproved(uint256 indexed requestId, address indexed consumer, address indexed producer, uint256 batchId, uint256 amount);
    event PurchaseCompleted(uint256 indexed requestId, address indexed consumer, address indexed producer, uint256 batchId, uint256 amount);
    event Issued(uint256 indexed batchId, address indexed producer, uint256 amount, string metadataURI);
    event Transferred(address indexed from, address indexed to, uint256 amount);
    event TransferredBatch(address indexed from, address indexed to, uint256 indexed batchId, uint256 amount);
    event Retired(address indexed holder, uint256 amount);
    event RetiredBatch(address indexed holder, uint256 indexed batchId, uint256 amount);
    event WhitelistSet(address indexed account, bool ok);
    event Paused();
    event Unpaused();

    constructor(address admin, address authorizer) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(AUTHORIZER_ROLE, authorizer);
        isWhitelisted[admin] = true;
        isWhitelisted[authorizer] = true;
    }

    // --- admin ---
    function setWhitelist(address account, bool ok) external onlyRole(DEFAULT_ADMIN_ROLE) {
        isWhitelisted[account] = ok;
        emit WhitelistSet(account, ok);
    }
    
    function grantAuthorizer(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(AUTHORIZER_ROLE, account);
        isWhitelisted[account] = true;
    }
    
    function grantConsumer(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(CONSUMER_ROLE, account);
        isWhitelisted[account] = true;
    }
    
    function grantProducer(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(PRODUCER_ROLE, account);
        isWhitelisted[account] = true;
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) { _pause(); emit Paused(); }
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) { _unpause(); emit Unpaused(); }

    // --- producer functions ---
    function requestProductionApproval(uint256 amount, string calldata metadataURI) 
        external whenNotPaused onlyRole(PRODUCER_ROLE) 
    {
        require(amount > 0, "amount=0");
        require(bytes(metadataURI).length > 0, "metadata required");
        
        uint256 requestId = nextProductionRequestId++;
        productionRequests[requestId] = ProductionRequest({
            id: requestId,
            producer: msg.sender,
            requestedAmount: amount,
            metadataURI: metadataURI,
            isApproved: false,
            requestedAt: block.timestamp,
            approvedAt: 0
        });
        
        emit ProductionRequested(requestId, msg.sender, amount, metadataURI);
    }

    function retireCredit(uint256 amount) external whenNotPaused {
        require(balanceOf[msg.sender] >= amount, "insufficient");
        require(isWhitelisted[msg.sender], "not whitelisted");

        balanceOf[msg.sender] -= amount;
        totalRetired += amount;
        emit Retired(msg.sender, amount);

        // FIFO burn with per-batch retired counters
        uint256 remaining = amount;
        Lot[] storage lots = _holdings[msg.sender];
        while (remaining > 0) {
            require(lots.length > 0, "empty lots");
            Lot storage lot = lots[0];
            uint256 burnAmt = remaining < lot.amount ? remaining : lot.amount;

            batches[lot.batchId].retiredAmount += burnAmt;
            emit RetiredBatch(msg.sender, lot.batchId, burnAmt);

            lot.amount -= burnAmt;
            remaining -= burnAmt;

            if (lot.amount == 0) {
                for (uint256 i=0; i+1<lots.length; i++) { lots[i] = lots[i+1]; }
                lots.pop();
            }
        }
    }

    // --- consumer functions ---
    function requestPurchase(address producer, uint256 batchId, uint256 amount) 
        external whenNotPaused onlyRole(CONSUMER_ROLE) 
    {
        require(producer != address(0), "bad producer");
        require(amount > 0, "amount=0");
        require(isWhitelisted[producer], "producer not whitelisted");
        require(batches[batchId].producer == producer, "batch not from producer");
        require(batches[batchId].isApproved, "batch not approved");
        
        uint256 requestId = nextPurchaseRequestId++;
        purchaseRequests[requestId] = PurchaseRequest({
            id: requestId,
            consumer: msg.sender,
            producer: producer,
            batchId: batchId,
            requestedAmount: amount,
            approvedAmount: 0,
            isApproved: false,
            isCompleted: false,
            requestedAt: block.timestamp,
            completedAt: 0
        });
        
        emit PurchaseRequested(requestId, msg.sender, producer, batchId, amount);
    }

    function retireCreditConsumer(uint256 amount) external whenNotPaused onlyRole(CONSUMER_ROLE) {
        require(balanceOf[msg.sender] >= amount, "insufficient");

        balanceOf[msg.sender] -= amount;
        totalRetired += amount;
        emit Retired(msg.sender, amount);

        // FIFO burn with per-batch retired counters
        uint256 remaining = amount;
        Lot[] storage lots = _holdings[msg.sender];
        while (remaining > 0) {
            require(lots.length > 0, "empty lots");
            Lot storage lot = lots[0];
            uint256 burnAmt = remaining < lot.amount ? remaining : lot.amount;

            batches[lot.batchId].retiredAmount += burnAmt;
            emit RetiredBatch(msg.sender, lot.batchId, burnAmt);

            lot.amount -= burnAmt;
            remaining -= burnAmt;

            if (lot.amount == 0) {
                for (uint256 i=0; i+1<lots.length; i++) { lots[i] = lots[i+1]; }
                lots.pop();
            }
        }
    }

    // --- authorizer functions ---
    function approveProduction(uint256 requestId, uint256 approvedAmount) 
        external whenNotPaused onlyRole(AUTHORIZER_ROLE) 
    {
        ProductionRequest storage request = productionRequests[requestId];
        require(request.id == requestId, "request not found");
        require(!request.isApproved, "already approved");
        require(approvedAmount > 0, "amount=0");
        require(approvedAmount <= request.requestedAmount, "amount exceeds request");
        
        request.isApproved = true;
        request.approvedAt = block.timestamp;
        
        // Create batch and issue credits
        uint256 batchId = nextBatchId++;
        batches[batchId] = Batch({
            id: batchId,
            producer: request.producer,
            issuedAmount: approvedAmount,
            retiredAmount: 0,
            metadataURI: request.metadataURI,
            issuedAt: block.timestamp,
            isApproved: true
        });

        balanceOf[request.producer] += approvedAmount;
        totalIssued += approvedAmount;
        _holdings[request.producer].push(Lot({ batchId: batchId, amount: approvedAmount }));

        emit ProductionApproved(requestId, request.producer, approvedAmount, request.metadataURI);
        emit Issued(batchId, request.producer, approvedAmount, request.metadataURI);
    }

    function approvePurchase(uint256 requestId, uint256 approvedAmount) 
        external whenNotPaused onlyRole(AUTHORIZER_ROLE) 
    {
        PurchaseRequest storage request = purchaseRequests[requestId];
        require(request.id == requestId, "request not found");
        require(!request.isApproved, "already approved");
        require(approvedAmount > 0, "amount=0");
        require(approvedAmount <= request.requestedAmount, "amount exceeds request");
        
        // Check if producer has enough credits
        require(balanceOf[request.producer] >= approvedAmount, "producer insufficient");
        
        request.isApproved = true;
        request.approvedAmount = approvedAmount;
        
        // Transfer credits from producer to consumer
        balanceOf[request.producer] -= approvedAmount;
        balanceOf[request.consumer] += approvedAmount;
        
        // FIFO transfer of lots
        uint256 remaining = approvedAmount;
        Lot[] storage producerLots = _holdings[request.producer];
        while (remaining > 0) {
            require(producerLots.length > 0, "empty lots");
            Lot storage lot = producerLots[0];
            uint256 transferAmt = remaining < lot.amount ? remaining : lot.amount;

            _holdings[request.consumer].push(Lot({ batchId: lot.batchId, amount: transferAmt }));
            emit TransferredBatch(request.producer, request.consumer, lot.batchId, transferAmt);

            lot.amount -= transferAmt;
            remaining -= transferAmt;

            if (lot.amount == 0) {
                for (uint256 i=0; i+1<producerLots.length; i++) { producerLots[i] = producerLots[i+1]; }
                producerLots.pop();
            }
        }
        
        request.isCompleted = true;
        request.completedAt = block.timestamp;
        
        emit PurchaseApproved(requestId, request.consumer, request.producer, request.batchId, approvedAmount);
        emit PurchaseCompleted(requestId, request.consumer, request.producer, request.batchId, approvedAmount);
        emit Transferred(request.producer, request.consumer, approvedAmount);
    }

    // --- views ---
    function getHoldings(address holder) external view returns (uint256[] memory batchIds, uint256[] memory amounts) {
        Lot[] storage lots = _holdings[holder];
        uint256 n = lots.length;
        batchIds = new uint256[](n);
        amounts  = new uint256[](n);
        for (uint256 i=0; i<n; i++) { batchIds[i]=lots[i].batchId; amounts[i]=lots[i].amount; }
    }

    function getProductionRequest(uint256 requestId) external view returns (ProductionRequest memory) {
        return productionRequests[requestId];
    }

    function getPurchaseRequest(uint256 requestId) external view returns (PurchaseRequest memory) {
        return purchaseRequests[requestId];
    }

    // --- legacy transfer function (for backward compatibility) ---
    function transferCredit(address to, uint256 amount) external whenNotPaused {
        require(to != address(0), "bad to");
        require(isWhitelisted[msg.sender] && isWhitelisted[to], "not whitelisted");
        require(balanceOf[msg.sender] >= amount, "insufficient");

        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        emit Transferred(msg.sender, to, amount);

        // FIFO move of lots
        uint256 remaining = amount;
        Lot[] storage fromLots = _holdings[msg.sender];
        while (remaining > 0) {
            require(fromLots.length > 0, "empty lots");
            Lot storage lot = fromLots[0];
            uint256 moveAmt = remaining < lot.amount ? remaining : lot.amount;

            _holdings[to].push(Lot({ batchId: lot.batchId, amount: moveAmt }));
            emit TransferredBatch(msg.sender, to, lot.batchId, moveAmt);

            lot.amount -= moveAmt;
            remaining -= moveAmt;

            if (lot.amount == 0) {
                for (uint256 i=0; i+1<fromLots.length; i++) { fromLots[i] = fromLots[i+1]; }
                fromLots.pop();
            }
        }
    }
}
