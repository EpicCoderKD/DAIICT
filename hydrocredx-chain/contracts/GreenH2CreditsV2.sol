// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * GreenH2CreditsV2 — fungible-like credits with FIFO batch lots.
 * Roles:
 *  - DEFAULT_ADMIN_ROLE: grant/revoke roles, whitelist, pause
 *  - AUDITOR_ROLE: issue new credits to authorized producers
 *  - REGULATOR_ROLE: reserved for future regulator functions
 *  - CONSUMER_ROLE: can retire credits
 *  - PRODUCER_ROLE: optional producer authorization (alternative to whitelist)
 */
contract GreenH2CreditsV2 is AccessControl, Pausable {
    bytes32 public constant AUDITOR_ROLE   = keccak256("AUDITOR_ROLE");
    bytes32 public constant REGULATOR_ROLE = keccak256("REGULATOR_ROLE");
    bytes32 public constant CONSUMER_ROLE  = keccak256("CONSUMER_ROLE");
    bytes32 public constant PRODUCER_ROLE  = keccak256("PRODUCER_ROLE");

    struct Batch {
        uint256 id;
        address producer;
        uint256 issuedAmount;
        uint256 retiredAmount;
        string  metadataURI; // ipfs://... or cert:...
        uint256 issuedAt;
    }

    struct Lot { uint256 batchId; uint256 amount; }

    // --- state ---
    mapping(address => bool) public isWhitelisted;   // KYC allowlist
    mapping(address => uint256) public balanceOf;    // fungible view
    mapping(address => Lot[])   private _holdings;   // per-holder FIFO lots

    mapping(uint256 => Batch) public batches;
    uint256 public nextBatchId;
    uint256 public totalIssued;
    uint256 public totalRetired;

    // --- events ---
    event Issued(uint256 indexed batchId, address indexed producer, uint256 amount, string metadataURI);
    event Transferred(address indexed from, address indexed to, uint256 amount);
    event TransferredBatch(address indexed from, address indexed to, uint256 indexed batchId, uint256 amount);
    event Retired(address indexed holder, uint256 amount);
    event RetiredBatch(address indexed holder, uint256 indexed batchId, uint256 amount);
    event WhitelistSet(address indexed account, bool ok);

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

    function grantAuditor(address a)   external onlyRole(DEFAULT_ADMIN_ROLE) { _grantRole(AUDITOR_ROLE, a); }
    function revokeAuditor(address a)  external onlyRole(DEFAULT_ADMIN_ROLE) { _revokeRole(AUDITOR_ROLE, a); }
    function grantRegulator(address a) external onlyRole(DEFAULT_ADMIN_ROLE) { _grantRole(REGULATOR_ROLE, a); }
    function revokeRegulator(address a)external onlyRole(DEFAULT_ADMIN_ROLE) { _revokeRole(REGULATOR_ROLE, a); }
    function grantConsumer(address a)  external onlyRole(DEFAULT_ADMIN_ROLE) { _grantRole(CONSUMER_ROLE, a); }
    function revokeConsumer(address a) external onlyRole(DEFAULT_ADMIN_ROLE) { _revokeRole(CONSUMER_ROLE, a); }
    function grantProducer(address a)  external onlyRole(DEFAULT_ADMIN_ROLE) { _grantRole(PRODUCER_ROLE, a); }
    function revokeProducer(address a) external onlyRole(DEFAULT_ADMIN_ROLE) { _revokeRole(PRODUCER_ROLE, a); }

    function pause()   external onlyRole(DEFAULT_ADMIN_ROLE) { _pause(); }
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) { _unpause(); }

    // --- views / helpers ---
    function isAuditor(address a)   external view returns (bool) { return hasRole(AUDITOR_ROLE, a); }
    function isRegulator(address a) external view returns (bool) { return hasRole(REGULATOR_ROLE, a); }
    function isConsumer(address a)  external view returns (bool) { return hasRole(CONSUMER_ROLE, a); }
    function isProducer(address a)  external view returns (bool) { return hasRole(PRODUCER_ROLE, a); }

    function getHoldings(address holder) external view returns (uint256[] memory batchIds, uint256[] memory amounts) {
        Lot[] storage lots = _holdings[holder];
        uint256 n = lots.length;
        batchIds = new uint256[](n);
        amounts  = new uint256[](n);
        for (uint256 i = 0; i < n; ) {
            batchIds[i] = lots[i].batchId;
            amounts[i]  = lots[i].amount;
            unchecked { ++i; }
        }
    }

    function getBatch(uint256 id) external view returns (Batch memory) {
        return batches[id];
    }

    function getBatches(uint256 start, uint256 count) external view returns (Batch[] memory) {
    uint256 end = start + count;
    if (end > nextBatchId) {
        end = nextBatchId;
    }

    uint256 n = end > start ? (end - start) : 0;
    Batch[] memory out = new Batch[](n);

    for (uint256 i = 0; i < n; ) {
        out[i] = batches[start + i];
        unchecked { ++i; }
    }

    return out;
}






    // --- core ---
    /**
     * Auditor issues new credits to an authorized producer.
     * Producer must be whitelisted OR have PRODUCER_ROLE.
     */
    function issueCredit(address producer, uint256 amount, string calldata metadataURI)
        external whenNotPaused onlyRole(AUDITOR_ROLE)
    {
        require(producer != address(0), "bad producer");
        require(amount > 0, "amount=0");
        require(isWhitelisted[producer] || hasRole(PRODUCER_ROLE, producer), "producer not authorized");

        uint256 id = nextBatchId++;
        batches[id] = Batch({
            id: id,
            producer: producer,
            issuedAmount: amount,
            retiredAmount: 0,
            metadataURI: metadataURI,
            issuedAt: block.timestamp
        });

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
                // shift-left O(n)
                for (uint256 i = 0; i + 1 < fromLots.length; ) {
                    fromLots[i] = fromLots[i + 1];
                    unchecked { ++i; }
                }
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
                for (uint256 i = 0; i + 1 < lots.length; ) {
                    lots[i] = lots[i + 1];
                    unchecked { ++i; }
                }
                lots.pop();
            }
        }
    }

    function supportsInterface(bytes4 interfaceId)
        public view override(AccessControl) returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
