// Role constants for the 4-role system
export const AUTHORIZER_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000"
export const CONSUMER_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000"
export const PRODUCER_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000"

// These will be computed dynamically from the contract
export async function getRoleConstants(contract) {
  if (!contract) return {}
  
  try {
    const [authorizerRole, consumerRole, producerRole] = await Promise.all([
      contract.AUTHORIZER_ROLE(),
      contract.CONSUMER_ROLE(),
      contract.PRODUCER_ROLE()
    ])
    
    return {
      AUTHORIZER_ROLE: authorizerRole,
      CONSUMER_ROLE: consumerRole,
      PRODUCER_ROLE: producerRole
    }
  } catch (error) {
    console.error('Error getting role constants:', error)
    return {}
  }
}

// Role descriptions for UI
export const ROLE_DESCRIPTIONS = {
  AUTHORIZER_ROLE: {
    name: 'Authorizer',
    description: 'Can approve production requests and purchase requests',
    capabilities: [
      'Approve producer credit issuance requests',
      'Approve consumer credit purchase requests',
      'Monitor all system activities',
      'View production and purchase statistics'
    ]
  },
  CONSUMER_ROLE: {
    name: 'Consumer',
    description: 'Can request to purchase credits and retire them',
    capabilities: [
      'Request to purchase credits from approved producers',
      'Retire credits from their holdings',
      'View available credit batches',
      'Track purchase request status'
    ]
  },
  PRODUCER_ROLE: {
    name: 'Producer',
    description: 'Can request production approval and retire credits',
    capabilities: [
      'Request approval for credit issuance',
      'Retire credits from their holdings',
      'View production request status',
      'Track credit batch lifecycle'
    ]
  },
  ADMIN_ROLE: {
    name: 'Admin',
    description: 'Full administrative control over the system',
    capabilities: [
      'Grant and revoke all roles',
      'Manage user whitelist status',
      'Pause/unpause the contract',
      'Full system oversight'
    ]
  }
}

// Helper function to get role display name
export function getRoleDisplayName(role) {
  return ROLE_DESCRIPTIONS[role]?.name || role || 'Unknown Role'
}

// Helper function to get role description
export function getRoleDescription(role) {
  return ROLE_DESCRIPTIONS[role]?.description || 'No description available'
}

// Helper function to get role capabilities
export function getRoleCapabilities(role) {
  return ROLE_DESCRIPTIONS[role]?.capabilities || []
}
