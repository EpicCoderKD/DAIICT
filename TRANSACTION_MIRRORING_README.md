# Transaction Mirroring System

This project now includes a comprehensive transaction mirroring system that stores all blockchain transactions both on-chain and in Supabase as a backup. This ensures data redundancy and provides a queryable database for analytics and reporting.

## Features

- **Real-time Transaction Monitoring**: Listens to all smart contract events
- **Dual Storage**: Transactions stored both on-chain and in Supabase
- **Historical Sync**: Automatically syncs existing blockchain data
- **Comprehensive Schema**: Full database schema for users, batches, holdings, and transactions
- **Performance Optimized**: Indexed tables and views for fast queries
- **Security**: Row Level Security (RLS) policies for data protection

## Architecture

```
Blockchain Events → Transaction Listener → Supabase Database
     ↓                    ↓                    ↓
Smart Contract    →  Event Processing  →  Structured Tables
     ↓                    ↓                    ↓
On-chain Storage  →  Real-time Mirror  →  Backup & Analytics
```

## Setup Instructions

### 1. Install Dependencies

```bash
cd web
npm install
```

### 2. Set up Supabase

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Get your project URL and anon key from the project settings
3. Copy `env.example` to `.env` and fill in your Supabase credentials:

```bash
cp env.example .env
```

Edit `.env`:
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 3. Create Database Schema

1. Go to your Supabase project SQL editor
2. Copy and paste the contents of `supabase-schema.sql`
3. Execute the SQL to create all tables, views, and functions

### 4. Deploy Smart Contract

```bash
# Deploy to local network
npx hardhat run scripts/deploy-local.js --network localhost

# Or deploy to testnet/mainnet
npx hardhat run scripts/deploy-local.js --network <network-name>
```

### 5. Start the Application

```bash
cd web
npm run dev
```

## Database Schema

### Core Tables

#### `transactions`
Stores all blockchain events with full metadata:
- Transaction hash, block number, timestamp
- Event type and arguments
- Associated addresses and batch IDs
- Raw event data for debugging

#### `users`
Tracks user information and roles:
- Ethereum addresses
- Whitelist status
- Role assignments (auditor, regulator, consumer, producer, admin)

#### `batches`
Credit batch information:
- Batch ID, producer, amounts
- Metadata URI and timestamps
- Retired vs. active amounts

#### `holdings`
User holdings per batch (FIFO lots):
- User address and batch ID
- Amount held
- Creation and update timestamps

### Views

- **`transaction_stats`**: Event counts and amounts by type
- **`user_balances`**: Current balances and batch counts per user
- **`batch_stats`**: Batch information with holder counts

## Transaction Types Monitored

1. **Issued**: Credit issuance events
2. **Transferred**: Credit transfer events
3. **TransferredBatch**: Batch-specific transfers
4. **Retired**: Credit retirement events
5. **RetiredBatch**: Batch-specific retirements
6. **WhitelistSet**: User whitelist status changes
7. **Paused/Unpaused**: Contract pause state changes

## API Endpoints

The system provides several methods for querying data:

### Transaction Queries
```javascript
// Get all transactions
const transactions = await supabaseService.getTransactions()

// Filter by event type
const issuedEvents = await supabaseService.getTransactions({ 
  eventName: 'Issued' 
})

// Filter by address
const userTransactions = await supabaseService.getTransactions({ 
  fromAddress: '0x...' 
})
```

### Statistics
```javascript
// Get transaction statistics
const stats = await supabaseService.getTransactionStats()
// Returns: totalTransactions, totalIssued, totalTransferred, totalRetired, eventCounts
```

### User Data
```javascript
// Get user information
const user = await supabaseService.getUser('0x...')

// Get user holdings
const holdings = await supabaseService.getUserHoldings('0x...')
```

## Real-time Features

### Automatic Sync
- New transactions are automatically mirrored to Supabase
- Historical data is synced on startup
- User roles and whitelist status are kept in sync

### Event Processing
- All smart contract events are captured in real-time
- Event data is normalized and stored in structured tables
- Raw event arguments are preserved for debugging

## Security Features

### Row Level Security (RLS)
- Public read access to batches and transactions (transparency)
- User-specific access to personal data
- Controlled insert/update permissions

### Data Validation
- Foreign key constraints ensure data integrity
- Input validation on all user inputs
- Transaction hash uniqueness enforcement

## Monitoring and Maintenance

### Health Checks
- Transaction listener status monitoring
- Database connection health
- Sync status indicators

### Performance
- Indexed tables for fast queries
- Efficient event processing
- Optimized database views

### Backup and Recovery
- All blockchain data is preserved in Supabase
- Transaction history is immutable
- Easy data export and analysis

## Troubleshooting

### Common Issues

1. **Supabase Connection Failed**
   - Check environment variables
   - Verify Supabase project is active
   - Check network connectivity

2. **Transaction Mirroring Not Working**
   - Ensure smart contract is deployed
   - Check browser console for errors
   - Verify event listener is active

3. **Database Schema Errors**
   - Run schema creation SQL again
   - Check for conflicting table names
   - Verify Supabase extensions are enabled

### Debug Mode

Enable debug logging in the browser console:
```javascript
localStorage.setItem('debug', 'true')
```

## Performance Considerations

- **Event Processing**: Events are processed asynchronously
- **Database Indexes**: Optimized for common query patterns
- **Batch Operations**: Historical sync processes data in batches
- **Memory Management**: Event listeners are properly cleaned up

## Future Enhancements

- **Webhook Support**: Notify external systems of events
- **Advanced Analytics**: Custom dashboards and reports
- **Data Export**: CSV/JSON export functionality
- **Multi-chain Support**: Support for multiple blockchain networks
- **Real-time Notifications**: Push notifications for important events

## Support

For issues or questions:
1. Check the browser console for error messages
2. Verify Supabase configuration
3. Check smart contract deployment status
4. Review transaction listener logs

## License

This transaction mirroring system is part of the GreenH2Credits project and follows the same licensing terms.
