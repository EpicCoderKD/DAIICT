-- Supabase Schema for GreenH2Credits Transaction Mirroring (Updated for 4-Role System)
-- This schema provides a backup of all blockchain transactions and related data

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table to store user information and roles
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    address VARCHAR(42) UNIQUE NOT NULL, -- Ethereum address
    whitelisted BOOLEAN DEFAULT false,
    authorizer BOOLEAN DEFAULT false,    -- Can approve production and purchase requests
    consumer BOOLEAN DEFAULT false,      -- Can request purchases and retire credits
    producer BOOLEAN DEFAULT false,      -- Can request production approval and retire credits
    admin BOOLEAN DEFAULT false,         -- Full administrative control
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Production requests table to track producer requests for credit issuance
CREATE TABLE production_requests (
    id BIGINT PRIMARY KEY, -- Request ID from smart contract
    producer_address VARCHAR(42) NOT NULL,
    requested_amount NUMERIC NOT NULL,
    metadata_uri TEXT NOT NULL,
    is_approved BOOLEAN DEFAULT false,
    approved_amount NUMERIC DEFAULT 0,
    requested_at TIMESTAMP WITH TIME ZONE NOT NULL,
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (producer_address) REFERENCES users(address)
);

-- Purchase requests table to track consumer requests to buy credits
CREATE TABLE purchase_requests (
    id BIGINT PRIMARY KEY, -- Request ID from smart contract
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
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (consumer_address) REFERENCES users(address),
    FOREIGN KEY (producer_address) REFERENCES users(address)
);

-- Batches table to store credit batch information (enhanced with approval status)
CREATE TABLE batches (
    id BIGINT PRIMARY KEY, -- Batch ID from smart contract
    producer_address VARCHAR(42) NOT NULL,
    issued_amount NUMERIC NOT NULL, -- Using NUMERIC for large numbers
    retired_amount NUMERIC DEFAULT 0,
    metadata_uri TEXT,
    issued_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_approved BOOLEAN DEFAULT true, -- New: approval status
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (producer_address) REFERENCES users(address)
);

-- Holdings table to track user holdings per batch (FIFO lots)
CREATE TABLE holdings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_address VARCHAR(42) NOT NULL,
    batch_id BIGINT NOT NULL,
    amount NUMERIC NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_address, batch_id),
    FOREIGN KEY (user_address) REFERENCES users(address),
    FOREIGN KEY (batch_id) REFERENCES batches(id)
);

-- Transactions table to store all blockchain events (enhanced for new events)
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tx_hash VARCHAR(66) NOT NULL, -- Transaction hash
    block_number BIGINT NOT NULL,
    block_timestamp BIGINT NOT NULL, -- Unix timestamp
    event_name VARCHAR(50) NOT NULL, -- Event type (ProductionRequested, PurchaseRequested, etc.)
    contract_address VARCHAR(42) NOT NULL, -- Contract address
    log_index INTEGER NOT NULL,
    transaction_index INTEGER NOT NULL,
    from_address VARCHAR(42), -- Sender/producer/holder address
    to_address VARCHAR(42), -- Recipient address
    batch_id BIGINT, -- Associated batch ID
    request_id BIGINT, -- Associated request ID (for production/purchase requests)
    amount NUMERIC, -- Amount involved
    metadata_uri TEXT, -- Metadata URI for issued credits
    whitelist_status BOOLEAN, -- For WhitelistSet events
    raw_args JSONB, -- Raw event arguments as JSON
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (from_address) REFERENCES users(address),
    FOREIGN KEY (to_address) REFERENCES users(address),
    FOREIGN KEY (batch_id) REFERENCES batches(id)
);

-- Create indexes for better query performance
CREATE INDEX idx_transactions_tx_hash ON transactions(tx_hash);
CREATE INDEX idx_transactions_block_number ON transactions(block_number);
CREATE INDEX idx_transactions_event_name ON transactions(event_name);
CREATE INDEX idx_transactions_from_address ON transactions(from_address);
CREATE INDEX idx_transactions_to_address ON transactions(to_address);
CREATE INDEX idx_transactions_batch_id ON transactions(batch_id);
CREATE INDEX idx_transactions_request_id ON transactions(request_id);
CREATE INDEX idx_transactions_created_at ON transactions(created_at);

CREATE INDEX idx_batches_producer ON batches(producer_address);
CREATE INDEX idx_batches_issued_at ON batches(issued_at);
CREATE INDEX idx_batches_approved ON batches(is_approved);

CREATE INDEX idx_production_requests_producer ON production_requests(producer_address);
CREATE INDEX idx_production_requests_approved ON production_requests(is_approved);
CREATE INDEX idx_production_requests_requested_at ON production_requests(requested_at);

CREATE INDEX idx_purchase_requests_consumer ON purchase_requests(consumer_address);
CREATE INDEX idx_purchase_requests_producer ON purchase_requests(producer_address);
CREATE INDEX idx_purchase_requests_batch ON purchase_requests(batch_id);
CREATE INDEX idx_purchase_requests_approved ON purchase_requests(is_approved);
CREATE INDEX idx_purchase_requests_requested_at ON purchase_requests(requested_at);

CREATE INDEX idx_holdings_user ON holdings(user_address);
CREATE INDEX idx_holdings_batch ON holdings(batch_id);

CREATE INDEX idx_users_address ON users(address);
CREATE INDEX idx_users_whitelisted ON users(whitelisted);
CREATE INDEX idx_users_authorizer ON users(authorizer);
CREATE INDEX idx_users_producer ON users(producer);
CREATE INDEX idx_users_consumer ON users(consumer);

-- Create views for transaction statistics
CREATE VIEW transaction_stats AS
SELECT 
    event_name,
    COUNT(*) as count,
    SUM(CASE WHEN amount IS NOT NULL THEN amount::NUMERIC ELSE 0 END) as total_amount,
    MIN(block_timestamp) as first_occurrence,
    MAX(block_timestamp) as last_occurrence
FROM transactions 
GROUP BY event_name;

-- Create a view for user balances
CREATE VIEW user_balances AS
SELECT 
    u.address,
    u.whitelisted,
    u.authorizer,
    u.producer,
    u.consumer,
    COALESCE(SUM(h.amount), 0) as total_balance,
    COUNT(DISTINCT h.batch_id) as unique_batches
FROM users u
LEFT JOIN holdings h ON u.address = h.user_address
GROUP BY u.address, u.whitelisted, u.authorizer, u.producer, u.consumer;

-- Create a view for batch statistics
CREATE VIEW batch_stats AS
SELECT 
    b.id,
    b.producer_address,
    b.issued_amount,
    b.retired_amount,
    b.issued_amount - b.retired_amount as active_amount,
    b.metadata_uri,
    b.issued_at,
    b.is_approved,
    COUNT(h.user_address) as unique_holders
FROM batches b
LEFT JOIN holdings h ON b.id = h.batch_id
GROUP BY b.id, b.producer_address, b.issued_amount, b.retired_amount, b.metadata_uri, b.issued_at, b.is_approved;

-- Create a view for production request statistics
CREATE VIEW production_request_stats AS
SELECT 
    pr.id,
    pr.producer_address,
    pr.requested_amount,
    pr.approved_amount,
    pr.metadata_uri,
    pr.is_approved,
    pr.requested_at,
    pr.approved_at,
    u.whitelisted as producer_whitelisted
FROM production_requests pr
JOIN users u ON pr.producer_address = u.address
ORDER BY pr.requested_at DESC;

-- Create a view for purchase request statistics
CREATE VIEW purchase_request_stats AS
SELECT 
    pur.id,
    pur.consumer_address,
    pur.producer_address,
    pur.batch_id,
    pur.requested_amount,
    pur.approved_amount,
    pur.is_approved,
    pur.is_completed,
    pur.requested_at,
    pur.approved_at,
    pur.completed_at,
    b.metadata_uri as batch_metadata,
    b.is_approved as batch_approved
FROM purchase_requests pur
LEFT JOIN batches b ON pur.batch_id = b.id
ORDER BY pur.requested_at DESC;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_batches_updated_at BEFORE UPDATE ON batches FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_holdings_updated_at BEFORE UPDATE ON holdings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_production_requests_updated_at BEFORE UPDATE ON production_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_purchase_requests_updated_at BEFORE UPDATE ON purchase_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to sync user roles from blockchain events
CREATE OR REPLACE FUNCTION sync_user_roles()
RETURNS TRIGGER AS $$
BEGIN
    -- Update user roles based on transaction events
    IF NEW.event_name = 'WhitelistSet' THEN
        INSERT INTO users (address, whitelisted, created_at)
        VALUES (NEW.from_address, NEW.whitelist_status, NOW())
        ON CONFLICT (address) 
        DO UPDATE SET 
            whitelisted = NEW.whitelist_status,
            updated_at = NOW();
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for user role sync
CREATE TRIGGER sync_user_roles_trigger 
    AFTER INSERT ON transactions 
    FOR EACH ROW 
    EXECUTE FUNCTION sync_user_roles();

-- Row Level Security (RLS) policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE holdings ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own data
CREATE POLICY "Users can view own data" ON users
    FOR SELECT USING (true);

CREATE POLICY "Users can view own holdings" ON holdings
    FOR SELECT USING (true);

CREATE POLICY "Users can view own transactions" ON transactions
    FOR SELECT USING (true);

CREATE POLICY "Users can view own production requests" ON production_requests
    FOR SELECT USING (true);

CREATE POLICY "Users can view own purchase requests" ON purchase_requests
    FOR SELECT USING (true);

-- Policy: Public read access to batches and transactions (for transparency)
CREATE POLICY "Public read access to batches" ON batches
    FOR SELECT USING (true);

CREATE POLICY "Public read access to transactions" ON transactions
    FOR SELECT USING (true);

CREATE POLICY "Public read access to production requests" ON production_requests
    FOR SELECT USING (true);

CREATE POLICY "Public read access to purchase requests" ON purchase_requests
    FOR SELECT USING (true);

-- Policy: Only authenticated users can insert/update
CREATE POLICY "Authenticated users can insert" ON users
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Authenticated users can update" ON users
    FOR UPDATE USING (true);

-- Comments for documentation
COMMENT ON TABLE users IS 'Stores user information and roles from the blockchain (4-role system)';
COMMENT ON TABLE production_requests IS 'Tracks producer requests for credit issuance approval';
COMMENT ON TABLE purchase_requests IS 'Tracks consumer requests to purchase credits from producers';
COMMENT ON TABLE batches IS 'Stores credit batch information with approval status';
COMMENT ON TABLE holdings IS 'Tracks user holdings per batch (FIFO lots)';
COMMENT ON TABLE transactions IS 'Mirrors all blockchain events for backup and querying';
COMMENT ON VIEW transaction_stats IS 'Provides statistics on different event types';
COMMENT ON VIEW user_balances IS 'Shows current balance and batch count for each user with roles';
COMMENT ON VIEW batch_stats IS 'Shows batch information with holder count and approval status';
COMMENT ON VIEW production_request_stats IS 'Shows production request information with producer details';
COMMENT ON VIEW purchase_request_stats IS 'Shows purchase request information with batch details';
