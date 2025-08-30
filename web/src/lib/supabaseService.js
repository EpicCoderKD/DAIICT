import { supabase, isSupabaseEnabled } from './supabase.js'

export class SupabaseService {
  constructor() {
    this.isEnabled = isSupabaseEnabled
  }

  // Production Request management
  async upsertProductionRequest(requestData) {
    if (!this.isEnabled) return null
    
    try {
      const { data, error } = await supabase
        .from('production_requests')
        .upsert(requestData, { onConflict: 'id' })
        .select()
      
      if (error) throw error
      return data?.[0]
    } catch (error) {
      console.error('Error upserting production request:', error)
      return null
    }
  }

  async getProductionRequest(requestId) {
    if (!this.isEnabled) return null
    
    try {
      const { data, error } = await supabase
        .from('production_requests')
        .select('*')
        .eq('id', requestId)
        .single()
      
      if (error) throw error
      return data
    } catch (error) {
      console.error('Error getting production request:', error)
      return null
    }
  }

  async getAllProductionRequests() {
    if (!this.isEnabled) return []
    
    try {
      const { data, error } = await supabase
        .from('production_requests')
        .select('*')
        .order('requested_at', { ascending: false })
      
      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error getting all production requests:', error)
      return []
    }
  }

  async getProducerProductionRequests(producerAddress) {
    if (!this.isEnabled) return []
    
    try {
      const { data, error } = await supabase
        .from('production_requests')
        .select('*')
        .eq('producer_address', producerAddress)
        .order('requested_at', { ascending: false })
      
      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error getting producer production requests:', error)
      return []
    }
  }

  // Purchase Request management
  async upsertPurchaseRequest(requestData) {
    if (!this.isEnabled) return null
    
    try {
      const { data, error } = await supabase
        .from('purchase_requests')
        .upsert(requestData, { onConflict: 'id' })
        .select()
      
      if (error) throw error
      return data?.[0]
    } catch (error) {
      console.error('Error upserting purchase request:', error)
      return null
    }
  }

  async getPurchaseRequest(requestId) {
    if (!this.isEnabled) return null
    
    try {
      const { data, error } = await supabase
        .from('purchase_requests')
        .select('*')
        .eq('id', requestId)
        .single()
      
      if (error) throw error
      return data
    } catch (error) {
      console.error('Error getting purchase request:', error)
      return null
    }
  }

  async getAllPurchaseRequests() {
    if (!this.isEnabled) return []
    
    try {
      const { data, error } = await supabase
        .from('purchase_requests')
        .select('*')
        .order('requested_at', { ascending: false })
      
      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error getting all purchase requests:', error)
      return []
    }
  }

  async getConsumerPurchaseRequests(consumerAddress) {
    if (!this.isEnabled) return []
    
    try {
      const { data, error } = await supabase
        .from('purchase_requests')
        .select('*')
        .eq('consumer_address', consumerAddress)
        .order('requested_at', { ascending: false })
      
      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error getting consumer purchase requests:', error)
      return []
    }
  }

  async getProducerPurchaseRequests(producerAddress) {
    if (!this.isEnabled) return []
    
    try {
      const { data, error } = await supabase
        .from('purchase_requests')
        .select('*')
        .eq('producer_address', producerAddress)
        .order('requested_at', { ascending: false })
      
      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error getting producer purchase requests:', error)
      return []
    }
  }

  // Batch management (enhanced with approval status)
  async upsertBatch(batchData) {
    if (!this.isEnabled) return null
    
    try {
      const { data, error } = await supabase
        .from('batches')
        .upsert(batchData, { onConflict: 'id' })
        .select()
      
      if (error) throw error
      return data?.[0]
    } catch (error) {
      console.error('Error upserting batch:', error)
      return null
    }
  }

  async getBatch(batchId) {
    if (!this.isEnabled) return null
    
    try {
      const { data, error } = await supabase
        .from('batches')
        .select('*')
        .eq('id', batchId)
        .single()
      
      if (error) throw error
      return data
    } catch (error) {
      console.error('Error getting batch:', error)
      return null
    }
  }

  async getAllBatches() {
    if (!this.isEnabled) return []
    
    try {
      const { data, error } = await supabase
        .from('batches')
        .select('*')
        .order('issued_at', { ascending: false })
      
      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error getting all batches:', error)
      return []
    }
  }

  async getApprovedBatches() {
    if (!this.isEnabled) return []
    
    try {
      const { data, error } = await supabase
        .from('batches')
        .select('*')
        .eq('is_approved', true)
        .order('issued_at', { ascending: false })
      
      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error getting approved batches:', error)
      return []
    }
  }

  // User management (updated for 4-role system)
  async upsertUser(userData) {
    if (!this.isEnabled) return null
    
    try {
      const { data, error } = await supabase
        .from('users')
        .upsert(userData, { onConflict: 'address' })
        .select()
      
      if (error) throw error
      return data?.[0]
    } catch (error) {
      console.error('Error upserting user:', error)
      return null
    }
  }

  async getUser(address) {
    if (!this.isEnabled) return null
    
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('address', address)
        .single()
      
      if (error) throw error
      return data
    } catch (error) {
      console.error('Error getting user:', error)
      return null
    }
  }

  async updateUserRole(address, role, hasRole) {
    if (!this.isEnabled) return null
    
    try {
      const user = await this.getUser(address)
      if (!user) {
        return await this.upsertUser({
          address,
          [role.toLowerCase()]: hasRole,
          updated_at: new Date().toISOString()
        })
      }

      const { data, error } = await supabase
        .from('users')
        .update({
          [role.toLowerCase()]: hasRole,
          updated_at: new Date().toISOString()
        })
        .eq('address', address)
        .select()
      
      if (error) throw error
      return data?.[0]
    } catch (error) {
      console.error('Error updating user role:', error)
      return null
    }
  }

  // Transaction queries (enhanced for new events)
  async getTransactions(filters = {}) {
    if (!this.isEnabled) return []
    
    try {
      let query = supabase
        .from('transactions')
        .select('*')
        .order('block_timestamp', { ascending: false })
      
      // Apply filters
      if (filters.eventName) {
        query = query.eq('event_name', filters.eventName)
      }
      if (filters.fromAddress) {
        query = query.eq('from_address', filters.fromAddress)
      }
      if (filters.toAddress) {
        query = query.eq('to_address', filters.toAddress)
      }
      if (filters.batchId) {
        query = query.eq('batch_id', filters.batchId)
      }
      if (filters.requestId) {
        query = query.eq('request_id', filters.requestId)
      }
      if (filters.limit) {
        query = query.limit(filters.limit)
      }
      
      const { data, error } = await query
      
      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error getting transactions:', error)
      return []
    }
  }

  async getTransactionStats() {
    if (!this.isEnabled) return {}
    
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('event_name, amount')
      
      if (error) throw error
      
      const stats = {
        totalTransactions: data.length,
        totalIssued: 0,
        totalTransferred: 0,
        totalRetired: 0,
        eventCounts: {}
      }
      
      data.forEach(tx => {
        if (tx.event_name === 'Issued' && tx.amount) {
          stats.totalIssued += BigInt(tx.amount)
        } else if (tx.event_name === 'Transferred' && tx.amount) {
          stats.totalTransferred += BigInt(tx.amount)
        } else if (tx.event_name === 'Retired' && tx.amount) {
          stats.totalRetired += BigInt(tx.amount)
        }
        
        stats.eventCounts[tx.event_name] = (stats.eventCounts[tx.event_name] || 0) + 1
      })
      
      return stats
    } catch (error) {
      console.error('Error getting transaction stats:', error)
      return {}
    }
  }

  // Holdings management
  async upsertHolding(holdingData) {
    if (!this.isEnabled) return null
    
    try {
      const { data, error } = await supabase
        .from('holdings')
        .upsert(holdingData, { onConflict: 'user_address,batch_id' })
        .select()
      
      if (error) throw error
      return data?.[0]
    } catch (error) {
      console.error('Error upserting holding:', error)
      return null
    }
  }

  async getUserHoldings(address) {
    if (!this.isEnabled) return []
    
    try {
      const { data, error } = await supabase
        .from('holdings')
        .select(`
          *,
          batches (
            id,
            metadata_uri,
            issued_at,
            is_approved
          )
        `)
        .eq('user_address', address)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error getting user holdings:', error)
      return []
    }
  }

  // Sync blockchain data to Supabase (enhanced for new entities)
  async syncBlockchainData(contract) {
    if (!this.isEnabled) return
    
    try {
      console.log('Starting blockchain data sync...')
      
      // Sync batches
      const nextBatchId = await contract.nextBatchId()
      for (let i = 0; i < nextBatchId; i++) {
        const batch = await contract.batches(i)
        await this.upsertBatch({
          id: i,
          producer_address: batch.producer,
          issued_amount: String(batch.issuedAmount),
          retired_amount: String(batch.retiredAmount),
          metadata_uri: batch.metadataURI,
          issued_at: new Date(Number(batch.issuedAt) * 1000).toISOString(),
          is_approved: batch.isApproved,
          created_at: new Date().toISOString()
        })
      }
      
      // Sync production requests
      const nextProductionRequestId = await contract.nextProductionRequestId()
      for (let i = 0; i < nextProductionRequestId; i++) {
        const request = await contract.getProductionRequest(i)
        if (request.producer !== '0x0000000000000000000000000000000000000000') {
          await this.upsertProductionRequest({
            id: i,
            producer_address: request.producer,
            requested_amount: String(request.requestedAmount),
            metadata_uri: request.metadataURI,
            is_approved: request.isApproved,
            approved_amount: String(request.approvedAmount || 0),
            requested_at: new Date(Number(request.requestedAt) * 1000).toISOString(),
            approved_at: request.approvedAt ? new Date(Number(request.approvedAt) * 1000).toISOString() : null,
            created_at: new Date().toISOString()
          })
        }
      }
      
      // Sync purchase requests
      const nextPurchaseRequestId = await contract.nextPurchaseRequestId()
      for (let i = 0; i < nextPurchaseRequestId; i++) {
        const request = await contract.getPurchaseRequest(i)
        if (request.consumer !== '0x0000000000000000000000000000000000000000') {
          await this.upsertPurchaseRequest({
            id: i,
            consumer_address: request.consumer,
            producer_address: request.producer,
            batch_id: request.batchId ? Number(request.batchId) : null,
            requested_amount: String(request.requestedAmount),
            approved_amount: String(request.approvedAmount || 0),
            is_approved: request.isApproved,
            is_completed: request.isCompleted,
            requested_at: new Date(Number(request.requestedAt) * 1000).toISOString(),
            approved_at: request.approvedAt ? new Date(Number(request.approvedAt) * 1000).toISOString() : null,
            completed_at: request.completedAt ? new Date(Number(request.completedAt) * 1000).toISOString() : null,
            created_at: new Date().toISOString()
          })
        }
      }
      
      // Sync users and their roles
      const events = await contract.queryFilter(contract.filters.WhitelistSet())
      for (const event of events) {
        const { account, ok } = event.args
        await this.upsertUser({
          address: account,
          whitelisted: ok,
          created_at: new Date().toISOString()
        })
      }
      
      console.log('Blockchain data sync completed')
    } catch (error) {
      console.error('Error syncing blockchain data:', error)
    }
  }
}
