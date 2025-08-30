import { supabase, isSupabaseEnabled } from './supabase.js'

export class TransactionListener {
  constructor(contract, provider) {
    this.contract = contract
    this.provider = provider
    this.isListening = false
    this.lastProcessedBlock = 0
  }

  async startListening() {
    if (this.isListening) return
    
    try {
      // Get the latest block number to start from
      const latestBlock = await this.provider.getBlockNumber()
      this.lastProcessedBlock = latestBlock - 1000 // Start from 1000 blocks ago to catch recent events
      
      console.log('Starting transaction listener from block:', this.lastProcessedBlock)
      
      // Listen to all relevant events (updated for 4-role system)
      this.contract.on('ProductionRequested', this.handleProductionRequested.bind(this))
      this.contract.on('ProductionApproved', this.handleProductionApproved.bind(this))
      this.contract.on('PurchaseRequested', this.handlePurchaseRequested.bind(this))
      this.contract.on('PurchaseApproved', this.handlePurchaseApproved.bind(this))
      this.contract.on('PurchaseCompleted', this.handlePurchaseCompleted.bind(this))
      this.contract.on('Issued', this.handleIssued.bind(this))
      this.contract.on('Transferred', this.handleTransferred.bind(this))
      this.contract.on('TransferredBatch', this.handleTransferredBatch.bind(this))
      this.contract.on('Retired', this.handleRetired.bind(this))
      this.contract.on('RetiredBatch', this.handleRetiredBatch.bind(this))
      this.contract.on('WhitelistSet', this.handleWhitelistSet.bind(this))
      this.contract.on('Paused', this.handlePaused.bind(this))
      this.contract.on('Unpaused', this.handleUnpaused.bind(this))
      
      this.isListening = true
      
      // Also process historical events
      await this.processHistoricalEvents()
      
    } catch (error) {
      console.error('Error starting transaction listener:', error)
    }
  }

  stopListening() {
    if (!this.isListening) return
    
    this.contract.off('ProductionRequested', this.handleProductionRequested.bind(this))
    this.contract.off('ProductionApproved', this.handleProductionApproved.bind(this))
    this.contract.off('PurchaseRequested', this.handlePurchaseRequested.bind(this))
    this.contract.off('PurchaseApproved', this.handlePurchaseApproved.bind(this))
    this.contract.off('PurchaseCompleted', this.handlePurchaseCompleted.bind(this))
    this.contract.off('Issued', this.handleIssued.bind(this))
    this.contract.off('Transferred', this.handleTransferred.bind(this))
    this.contract.off('TransferredBatch', this.handleTransferredBatch.bind(this))
    this.contract.off('Retired', this.handleRetired.bind(this))
    this.contract.off('RetiredBatch', this.handleRetiredBatch.bind(this))
    this.contract.off('WhitelistSet', this.handleWhitelistSet.bind(this))
    this.contract.off('Paused', this.handlePaused.bind(this))
    this.contract.off('Unpaused', this.handleUnpaused.bind(this))
    
    this.isListening = false
    console.log('Transaction listener stopped')
  }

  async processHistoricalEvents() {
    try {
      const fromBlock = this.lastProcessedBlock
      const toBlock = await this.provider.getBlockNumber()
      
      console.log(`Processing historical events from block ${fromBlock} to ${toBlock}`)
      
      // Process all event types (updated for 4-role system)
      await Promise.all([
        this.processEventType('ProductionRequested', fromBlock, toBlock),
        this.processEventType('ProductionApproved', fromBlock, toBlock),
        this.processEventType('PurchaseRequested', fromBlock, toBlock),
        this.processEventType('PurchaseApproved', fromBlock, toBlock),
        this.processEventType('PurchaseCompleted', fromBlock, toBlock),
        this.processEventType('Issued', fromBlock, toBlock),
        this.processEventType('Transferred', fromBlock, toBlock),
        this.processEventType('TransferredBatch', fromBlock, toBlock),
        this.processEventType('Retired', fromBlock, toBlock),
        this.processEventType('RetiredBatch', fromBlock, toBlock),
        this.processEventType('WhitelistSet', fromBlock, toBlock),
        this.processEventType('Paused', fromBlock, toBlock),
        this.processEventType('Unpaused', fromBlock, toBlock)
      ])
      
      this.lastProcessedBlock = toBlock
      console.log('Historical events processing completed')
      
    } catch (error) {
      console.error('Error processing historical events:', error)
    }
  }

  async processEventType(eventName, fromBlock, toBlock) {
    try {
      const filter = this.contract.filters[eventName]()
      const events = await this.contract.queryFilter(filter, fromBlock, toBlock)
      
      for (const event of events) {
        await this.processEvent(eventName, event)
      }
    } catch (error) {
      console.error(`Error processing ${eventName} events:`, error)
    }
  }

  // New event handlers for 4-role system
  async handleProductionRequested(requestId, producer, amount, metadataURI, event) {
    await this.processEvent('ProductionRequested', event)
  }

  async handleProductionApproved(requestId, producer, amount, metadataURI, event) {
    await this.processEvent('ProductionApproved', event)
  }

  async handlePurchaseRequested(requestId, consumer, producer, batchId, amount, event) {
    await this.processEvent('PurchaseRequested', event)
  }

  async handlePurchaseApproved(requestId, consumer, producer, batchId, amount, event) {
    await this.processEvent('PurchaseApproved', event)
  }

  async handlePurchaseCompleted(requestId, consumer, producer, batchId, amount, event) {
    await this.processEvent('PurchaseCompleted', event)
  }

  // Existing event handlers
  async handleIssued(batchId, producer, amount, metadataURI, event) {
    await this.processEvent('Issued', event)
  }

  async handleTransferred(from, to, amount, event) {
    await this.processEvent('Transferred', event)
  }

  async handleTransferredBatch(from, to, batchId, amount, event) {
    await this.processEvent('TransferredBatch', event)
  }

  async handleRetired(holder, amount, event) {
    await this.processEvent('Retired', event)
  }

  async handleRetiredBatch(holder, batchId, amount, event) {
    await this.processEvent('RetiredBatch', event)
  }

  async handleWhitelistSet(account, ok, event) {
    await this.processEvent('WhitelistSet', event)
  }

  async handlePaused(event) {
    await this.processEvent('Paused', event)
  }

  async handleUnpaused(event) {
    await this.processEvent('Unpaused', event)
  }

  async processEvent(eventName, event) {
    if (!isSupabaseEnabled) {
      console.log('Supabase not configured, skipping event storage:', eventName, event.args)
      return
    }

    try {
      // Extract request_id for production and purchase events
      let requestId = null
      if (eventName === 'ProductionRequested' || eventName === 'ProductionApproved') {
        requestId = event.args.requestId ? Number(event.args.requestId) : null
      } else if (eventName === 'PurchaseRequested' || eventName === 'PurchaseApproved' || eventName === 'PurchaseCompleted') {
        requestId = event.args.requestId ? Number(event.args.requestId) : null
      }

      const transactionData = {
        tx_hash: event.transactionHash,
        block_number: event.blockNumber,
        block_timestamp: (await event.getBlock()).timestamp,
        event_name: eventName,
        contract_address: event.address,
        log_index: event.logIndex,
        transaction_index: event.transactionIndex,
        from_address: event.args?.from || event.args?.producer || event.args?.holder || event.args?.account || null,
        to_address: event.args?.to || null,
        batch_id: event.args?.batchId ? Number(event.args.batchId) : null,
        request_id: requestId,
        amount: event.args?.amount ? String(event.args.amount) : null,
        metadata_uri: event.args?.metadataURI || null,
        whitelist_status: event.args?.ok !== undefined ? event.args.ok : null,
        raw_args: JSON.stringify(event.args),
        created_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from('transactions')
        .insert(transactionData)

      if (error) {
        console.error('Error storing transaction in Supabase:', error)
      } else {
        console.log(`Stored ${eventName} transaction:`, transactionData.tx_hash)
      }
      
    } catch (error) {
      console.error(`Error processing ${eventName} event:`, error)
    }
  }
}
