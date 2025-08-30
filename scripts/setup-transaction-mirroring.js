const { ethers } = require("hardhat");

async function main() {
  console.log("Setting up Transaction Mirroring System for 4-Role System...");
  
  try {
    // Get the deployed contract
    const contractAddress = require("../web/public/contract-address.json").address;
    const GreenH2CreditsV2 = await ethers.getContractFactory("GreenH2CreditsV2");
    const contract = GreenH2CreditsV2.attach(contractAddress);
    
    console.log("Contract address:", contractAddress);
    
    // Get the current network
    const network = await ethers.provider.getNetwork();
    console.log("Network:", network.name, "Chain ID:", network.chainId);
    
    // Get contract stats
    const totalIssued = await contract.totalIssued();
    const totalRetired = await contract.totalRetired();
    const nextBatchId = await contract.nextBatchId();
    const nextProductionRequestId = await contract.nextProductionRequestId();
    const nextPurchaseRequestId = await contract.nextPurchaseRequestId();
    
    console.log("Contract Stats:");
    console.log("- Total Issued:", totalIssued.toString());
    console.log("- Total Retired:", totalRetired.toString());
    console.log("- Next Batch ID:", nextBatchId.toString());
    console.log("- Next Production Request ID:", nextProductionRequestId.toString());
    console.log("- Next Purchase Request ID:", nextPurchaseRequestId.toString());
    
    // Check if there are existing events to sync
    console.log("\nChecking for existing events...");
    
    const fromBlock = 0;
    const toBlock = await ethers.provider.getNetwork();
    
    // Check for new 4-role system events
    const productionRequestedEvents = await contract.queryFilter(contract.filters.ProductionRequested(), fromBlock, toBlock);
    const productionApprovedEvents = await contract.queryFilter(contract.filters.ProductionApproved(), fromBlock, toBlock);
    const purchaseRequestedEvents = await contract.queryFilter(contract.filters.PurchaseRequested(), fromBlock, toBlock);
    const purchaseApprovedEvents = await contract.queryFilter(contract.filters.PurchaseApproved(), fromBlock, toBlock);
    const purchaseCompletedEvents = await contract.queryFilter(contract.filters.PurchaseCompleted(), fromBlock, toBlock);
    
    // Check for legacy events
    const issuedEvents = await contract.queryFilter(contract.filters.Issued(), fromBlock, toBlock);
    const transferredEvents = await contract.queryFilter(contract.filters.Transferred(), fromBlock, toBlock);
    const retiredEvents = await contract.queryFilter(contract.filters.Retired(), fromBlock, toBlock);
    const whitelistEvents = await contract.queryFilter(contract.filters.WhitelistSet(), fromBlock, toBlock);
    
    console.log("Existing Events Found:");
    console.log("- Production Requested:", productionRequestedEvents.length);
    console.log("- Production Approved:", productionApprovedEvents.length);
    console.log("- Purchase Requested:", purchaseRequestedEvents.length);
    console.log("- Purchase Approved:", purchaseApprovedEvents.length);
    console.log("- Purchase Completed:", purchaseCompletedEvents.length);
    console.log("- Issued:", issuedEvents.length);
    console.log("- Transferred:", transferredEvents.length);
    console.log("- Retired:", retiredEvents.length);
    console.log("- Whitelist Changes:", whitelistEvents.length);
    
    // Show sample events if they exist
    if (productionRequestedEvents.length > 0) {
      console.log("\nSample Production Request Event:");
      const sampleEvent = productionRequestedEvents[0];
      console.log("- Request ID:", sampleEvent.args.requestId.toString());
      console.log("- Producer:", sampleEvent.args.producer);
      console.log("- Amount:", sampleEvent.args.amount.toString());
      console.log("- Metadata:", sampleEvent.args.metadataURI);
    }
    
    if (purchaseRequestedEvents.length > 0) {
      console.log("\nSample Purchase Request Event:");
      const sampleEvent = purchaseRequestedEvents[0];
      console.log("- Request ID:", sampleEvent.args.requestId.toString());
      console.log("- Consumer:", sampleEvent.args.consumer);
      console.log("- Producer:", sampleEvent.args.producer);
      console.log("- Batch ID:", sampleEvent.args.batchId.toString());
      console.log("- Amount:", sampleEvent.args.amount.toString());
    }
    
    // Check role assignments
    console.log("\nChecking role assignments...");
    const deployer = await ethers.provider.getSigner();
    const deployerAddress = await deployer.getAddress();
    
    const isAdmin = await contract.hasRole(await contract.DEFAULT_ADMIN_ROLE(), deployerAddress);
    const isAuthorizer = await contract.hasRole(await contract.AUTHORIZER_ROLE(), deployerAddress);
    const isProducer = await contract.hasRole(await contract.PRODUCER_ROLE(), deployerAddress);
    const isConsumer = await contract.hasRole(await contract.CONSUMER_ROLE(), deployerAddress);
    
    console.log("Deployer Roles:");
    console.log("- Admin:", isAdmin);
    console.log("- Authorizer:", isAuthorizer);
    console.log("- Producer:", isProducer);
    console.log("- Consumer:", isConsumer);
    
    // Check whitelist status
    const isWhitelisted = await contract.isWhitelisted(deployerAddress);
    console.log("- Whitelisted:", isWhitelisted);
    
    console.log("\n✅ Transaction Mirroring System for 4-Role System is ready!");
    console.log("\nNext steps:");
    console.log("1. Set up Supabase project and get credentials");
    console.log("2. Copy env.example to .env and fill in Supabase details");
    console.log("3. Run the updated SQL schema in Supabase SQL editor");
    console.log("4. Grant roles to other addresses:");
    console.log("   - grantAuthorizer(address)");
    console.log("   - grantProducer(address)");
    console.log("   - grantConsumer(address)");
    console.log("5. Set whitelist status for addresses: setWhitelist(address, true)");
    console.log("6. Start the web application with 'npm run dev'");
    console.log("7. The system will automatically start mirroring transactions");
    
    console.log("\n📋 New 4-Role System Features:");
    console.log("- Production requests require authorizer approval");
    console.log("- Purchase requests require authorizer approval");
    console.log("- Producers can retire their own credits");
    console.log("- Consumers can retire credits after purchase");
    console.log("- Enhanced audit trail and compliance");
    
  } catch (error) {
    console.error("❌ Error setting up transaction mirroring:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
