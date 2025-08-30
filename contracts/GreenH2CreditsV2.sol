// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

contract GreenH2CreditsV2 is AccessControl, Pausable {
    bytes32 public constant AUDITOR_ROLE   = keccak256("AUDITOR_ROLE");
    bytes32 public constant REGULATOR_ROLE = keccak256("REGULATOR_ROLE");
    bytes32 public constant CONSUMER_ROLE  = keccak256("CONSUMER_ROLE");
    bytes32 public constant PRODUCER_ROLE = keccak256("PRODUCER_ROLE");


    struct Batch {
        uint256 id;
        address producer;
        uint256 issuedAmount;
        uint256 retiredAmount;
        string  metadataURI; // ipfs://... or cert:...
        uint256 issuedAt;
    }
    struct Lot { uint256 batchId; uint256 amount; }

    mapping(address => bool) public isWhitelisted;   // KYC allowlist
    mapping(address => uint256) public balanceOf;    // fungible view
    mapping(address => Lot[])   private _holdings;   // per-holder FIFO lots

    mapping(uint256 => Batch) public batches;
    uint256 public nextBatchId;
    uint256 public totalIssued;
    uint256 public totalRetired;

    event Issued(uint256 indexed batchId, address indexed producer, uint256 amount, string metadataURI);
    event Transferred(address indexed from, address indexed to, uint256 amount);
    event TransferredBatch(address indexed from, address indexed to, uint256 indexed batchId, uint256 amount);
    event Retired(address indexed holder, uint256 amount);
    event RetiredBatch(address indexed holder, uint256 indexed batchId, uint256 amount);
    event WhitelistSet(address indexed account, bool ok);
    event Paused();
    event Unpaused();

constructor(address admin, address auditor, address regulator) {
    _grantRole(DEFAULT_ADMIN_ROLE, admin);
    _grantRole(AUDITOR_ROLE, auditor);
    _grantRole(REGULATOR_ROLE, regulator);
    isWhitelisted[admin] = true;
    isWhitelisted[auditor] = true;
    isWhitelisted[regulator] = true;
}

    // --- admin ---
    function setWhitelist(address account, bool ok) external onlyRole(DEFAULT_ADMIN_ROLE) {
        isWhitelisted[account] = ok;
        emit WhitelistSet(account, ok);
    }
    function grantConsumer(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(CONSUMER_ROLE, account);
    }
    function grantProducer(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
    _grantRole(PRODUCER_ROLE, account);
    isWhitelisted[account] = true; // optional: auto-whitelist them
}

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) { _pause(); emit Paused(); }
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) { _unpause(); emit Unpaused(); }

    // --- views ---
    function getHoldings(address holder) external view returns (uint256[] memory batchIds, uint256[] memory amounts) {
        Lot[] storage lots = _holdings[holder];
        uint256 n = lots.length;
        batchIds = new uint256[](n);
        amounts  = new uint256[](n);
        for (uint256 i=0; i<n; i++) { batchIds[i]=lots[i].batchId; amounts[i]=lots[i].amount; }
    }

    // --- core ---
    function issueCredit(address producer, uint256 amount, string calldata metadataURI)
        external whenNotPaused onlyRole(AUDITOR_ROLE)
    {
        require(producer != address(0), "bad producer");
        require(amount > 0, "amount=0");
        require(isWhitelisted[producer], "producer not whitelisted");
        require(hasRole(PRODUCER_ROLE, producer), "not producer role");

        uint256 id = nextBatchId++;
        batches[id] = Batch({ id: id, producer: producer, issuedAmount: amount, retiredAmount: 0, metadataURI: metadataURI, issuedAt: block.timestamp });

        balanceOf[producer] += amount;
        totalIssued += amount;
        _holdings[producer].push(Lot({ batchId: id, amount: amount }));

        emit Issued(id, producer, amount, metadataURI);
    }

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

    function retireCredit(uint256 amount) external whenNotPaused onlyRole(CONSUMER_ROLE) {
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
}
