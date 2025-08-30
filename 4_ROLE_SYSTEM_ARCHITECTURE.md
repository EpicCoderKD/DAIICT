# GreenH2Credits 4-Role System Architecture

## 🎯 **Overview**

The GreenH2Credits system has been redesigned to implement a streamlined 4-role system that provides clear separation of responsibilities and enhanced workflow management for credit issuance and trading.

## 🏗️ **Role Hierarchy**

```
ADMIN_ROLE (Highest Authority)
    ├── AUTHORIZER_ROLE (Credit Approval & Management)
    ├── PRODUCER_ROLE (Credit Creation & Management)
    └── CONSUMER_ROLE (Credit Purchase & Retirement)
```

## 👥 **Role Definitions & Permissions**

### **1. ADMIN_ROLE**
**Purpose**: Full administrative control over the system
**Permissions**:
- Grant/revoke any role to any address
- Manage user whitelist status
- Pause/unpause the entire contract
- Emergency functions and system control

**Key Functions**:
```solidity
function grantAuthorizer(address account)
function grantConsumer(address account)
function grantProducer(address account)
function setWhitelist(address account, bool ok)
function pause() / unpause()
```

### **2. AUTHORIZER_ROLE**
**Purpose**: Approve credit production and purchase requests
**Permissions**:
- Approve producer credit issuance requests
- Approve consumer credit purchase requests
- Monitor all system activities
- View production and purchase statistics

**Key Functions**:
```solidity
function approveProduction(uint256 requestId, uint256 approvedAmount)
function approvePurchase(uint256 requestId, uint256 approvedAmount)
```

**Workflow**:
1. **Production Approval**: Reviews producer requests and approves credit issuance
2. **Purchase Approval**: Reviews consumer requests and approves credit purchases
3. **Quality Control**: Ensures compliance and proper documentation

### **3. PRODUCER_ROLE**
**Purpose**: Create and manage credit batches
**Permissions**:
- Request approval for credit issuance
- Retire credits from their holdings
- View production request status
- Track credit batch lifecycle

**Key Functions**:
```solidity
function requestProductionApproval(uint256 amount, string metadataURI)
function retireCredit(uint256 amount)
```

**Workflow**:
1. **Production Request**: Submit request with amount and metadata
2. **Wait for Approval**: Authorizer reviews and approves/rejects
3. **Credit Issuance**: Credits issued upon approval
4. **Credit Management**: Can retire credits as needed

### **4. CONSUMER_ROLE**
**Purpose**: Purchase and retire credits
**Permissions**:
- Request to purchase credits from approved producers
- Retire credits from their holdings
- View available credit batches
- Track purchase request status

**Key Functions**:
```solidity
function requestPurchase(address producer, uint256 batchId, uint256 amount)
function retireCreditConsumer(uint256 amount)
```

**Workflow**:
1. **Purchase Request**: Request credits from specific producer/batch
2. **Wait for Approval**: Authorizer reviews and approves/rejects
3. **Credit Transfer**: Credits transferred upon approval
4. **Credit Retirement**: Can retire credits for compliance

## 🔄 **System Workflows**

### **Credit Production Workflow**
```
Producer → Request Production → Authorizer Review → Approval → Credit Issuance
   ↓              ↓                ↓              ↓           ↓
requestProductionApproval() → Authorizer Review → approveProduction() → Batch Created
```

**Steps**:
1. **Producer** calls `requestProductionApproval(amount, metadataURI)`
2. **Authorizer** reviews the request (off-chain)
3. **Authorizer** calls `approveProduction(requestId, approvedAmount)`
4. **System** creates new batch and issues credits to producer
5. **Events** emitted: `ProductionApproved`, `Issued`

### **Credit Purchase Workflow**
```
Consumer → Request Purchase → Authorizer Review → Approval → Credit Transfer
   ↓              ↓                ↓              ↓           ↓
requestPurchase() → Authorizer Review → approvePurchase() → Credits Transferred
```

**Steps**:
1. **Consumer** calls `requestPurchase(producer, batchId, amount)`
2. **Authorizer** reviews the request (off-chain)
3. **Authorizer** calls `approvePurchase(requestId, approvedAmount)`
4. **System** transfers credits from producer to consumer
5. **Events** emitted: `PurchaseApproved`, `PurchaseCompleted`, `Transferred`

### **Credit Retirement Workflow**
```
User → Retire Credits → FIFO Processing → Batch Updates → Credits Burned
   ↓              ↓              ↓              ↓           ↓
retireCredit() → FIFO Logic → Update Batches → Emit Events
```

**Steps**:
1. **User** calls `retireCredit(amount)` or `retireCreditConsumer(amount)`
2. **System** processes retirement using FIFO logic
3. **Batch** retired amounts updated
4. **Holdings** reduced accordingly
5. **Events** emitted: `Retired`, `RetiredBatch`

## 📊 **Database Schema Updates**

### **New Tables**

#### **`production_requests`**
```sql
CREATE TABLE production_requests (
    id BIGINT PRIMARY KEY,
    producer_address VARCHAR(42) NOT NULL,
    requested_amount NUMERIC NOT NULL,
    metadata_uri TEXT NOT NULL,
    is_approved BOOLEAN DEFAULT false,
    approved_amount NUMERIC DEFAULT 0,
    requested_at TIMESTAMP WITH TIME ZONE NOT NULL,
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### **`purchase_requests`**
```sql
CREATE TABLE purchase_requests (
    id BIGINT PRIMARY KEY,
    consumer_address VARCHAR(42) NOT NULL,
    producer_address VARCHAR(42) NOT NULL,
    batch_id BIGINT,
    requested_amount NUMERIC NOT NULL,
    approved_amount NUMERIC DEFAULT 0,
    is_approved BOOLEAN DEFAULT false,
    is_completed BOOLEAN DEFAULT false,
    requested_at TIMESTAMP WITH TIME ZONE NOT NULL,
    approved_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### **Enhanced Tables**

#### **`batches`** (Added `is_approved` field)
```sql
CREATE TABLE batches (
    id BIGINT PRIMARY KEY,
    producer_address VARCHAR(42) NOT NULL,
    issued_amount NUMERIC NOT NULL,
    retired_amount NUMERIC DEFAULT 0,
    metadata_uri TEXT,
    issued_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_approved BOOLEAN DEFAULT true, -- NEW FIELD
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### **`transactions`** (Added `request_id` field)
```sql
CREATE TABLE transactions (
    -- ... existing fields ...
    request_id BIGINT, -- NEW FIELD for production/purchase requests
    -- ... existing fields ...
);
```

### **New Views**

#### **`production_request_stats`**
```sql
CREATE VIEW production_request_stats AS
SELECT 
    pr.id, pr.producer_address, pr.requested_amount, pr.approved_amount,
    pr.metadata_uri, pr.is_approved, pr.requested_at, pr.approved_at,
    u.whitelisted as producer_whitelisted
FROM production_requests pr
JOIN users u ON pr.producer_address = u.address
ORDER BY pr.requested_at DESC;
```

#### **`purchase_request_stats`**
```sql
CREATE VIEW purchase_request_stats AS
SELECT 
    pur.id, pur.consumer_address, pur.producer_address, pur.batch_id,
    pur.requested_amount, pur.approved_amount, pur.is_approved, pur.is_completed,
    pur.requested_at, pur.approved_at, pur.completed_at,
    b.metadata_uri as batch_metadata, b.is_approved as batch_approved
FROM purchase_requests pur
LEFT JOIN batches b ON pur.batch_id = b.id
ORDER BY pur.requested_at DESC;
```

## 🆕 **New Smart Contract Events**

### **Production Events**
```solidity
event ProductionRequested(uint256 indexed requestId, address indexed producer, uint256 amount, string metadataURI);
event ProductionApproved(uint256 indexed requestId, address indexed producer, uint256 amount, string metadataURI);
```

### **Purchase Events**
```solidity
event PurchaseRequested(uint256 indexed requestId, address indexed consumer, address indexed producer, uint256 batchId, uint256 amount);
event PurchaseApproved(uint256 indexed requestId, address indexed consumer, address indexed producer, uint256 batchId, uint256 amount);
event PurchaseCompleted(uint256 indexed requestId, address indexed consumer, address indexed producer, uint256 batchId, uint256 amount);
```

## 🔐 **Security Features**

### **Role-Based Access Control**
- Each function restricted to appropriate roles
- Clear permission boundaries
- No role escalation possible

### **Request-Approval Workflow**
- Two-step process for credit operations
- Authorizer oversight on all critical operations
- Audit trail for compliance

### **Whitelist Management**
- Admin controls user participation
- KYC/AML compliance support
- Granular access control

## 📈 **Benefits of New System**

### **1. Clear Separation of Concerns**
- **Authorizer**: Focuses on compliance and approval
- **Producer**: Focuses on credit creation
- **Consumer**: Focuses on credit acquisition
- **Admin**: Focuses on system management

### **2. Enhanced Compliance**
- All credit operations require approval
- Complete audit trail
- Regulatory compliance support

### **3. Improved Workflow**
- Structured request-approval process
- Better tracking and monitoring
- Reduced operational risks

### **4. Scalability**
- Modular role system
- Easy to add new roles
- Flexible permission management

## 🚀 **Implementation Steps**

### **1. Deploy Updated Contract**
```bash
npx hardhat run scripts/deploy-local.js --network localhost
```

### **2. Update Database Schema**
```bash
# Run supabase-schema.sql in Supabase SQL editor
```

### **3. Grant Initial Roles**
```solidity
// Grant authorizer role
await contract.grantAuthorizer(authorizerAddress);

// Grant producer role
await contract.grantProducer(producerAddress);

// Grant consumer role
await contract.grantConsumer(consumerAddress);
```

### **4. Set Whitelist Status**
```solidity
// Whitelist addresses
await contract.setWhitelist(address, true);
```

## 🔍 **Monitoring & Analytics**

### **Key Metrics**
- Production request approval rates
- Purchase request completion rates
- Credit issuance volumes
- Retirement patterns
- User activity by role

### **Dashboard Views**
- **Authorizer Dashboard**: Pending requests, approval statistics
- **Producer Dashboard**: Request status, credit balances
- **Consumer Dashboard**: Available credits, purchase history
- **Admin Dashboard**: System overview, user management

## 🔮 **Future Enhancements**

### **1. Advanced Approval Workflows**
- Multi-signature approvals
- Hierarchical approval chains
- Automated compliance checks

### **2. Enhanced Analytics**
- Credit lifecycle tracking
- Market analysis tools
- Compliance reporting

### **3. Integration Features**
- API endpoints for external systems
- Webhook notifications
- Third-party integrations

This 4-role system provides a robust, compliant, and scalable foundation for managing green hydrogen credits while maintaining clear accountability and operational efficiency.
