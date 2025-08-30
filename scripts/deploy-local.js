const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying GreenH2CreditsV2...");

  // Get the contract factory
  const GreenH2CreditsV2 = await ethers.getContractFactory("GreenH2CreditsV2");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  // Deploy the contract with admin and authorizer roles
  // The deployer will be both admin and authorizer initially
  const contract = await GreenH2CreditsV2.deploy(deployer.address, deployer.address);
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("GreenH2CreditsV2 deployed to:", address);

  // Save the contract address
  const fs = require("fs");
  const path = require("path");
  
  const contractAddressPath = path.join(__dirname, "../web/public/contract-address.json");
  const contractAddressData = {
    address: address,
    network: "localhost",
    deployer: deployer.address,
    deployedAt: new Date().toISOString()
  };

  // Ensure the directory exists
  const dir = path.dirname(contractAddressPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(contractAddressPath, JSON.stringify(contractAddressData, null, 2));
  console.log("Contract address saved to:", contractAddressPath);

  // Verify initial setup
  console.log("\nInitial setup verification:");
  console.log("- Admin role granted to:", deployer.address);
  console.log("- Authorizer role granted to:", deployer.address);
  console.log("- Contract paused:", await contract.paused());
  
  // Get role constants
  const [authorizerRole, consumerRole, producerRole] = await Promise.all([
    contract.AUTHORIZER_ROLE(),
    contract.CONSUMER_ROLE(),
    contract.PRODUCER_ROLE()
  ]);
  
  console.log("\nRole constants:");
  console.log("- AUTHORIZER_ROLE:", authorizerRole);
  console.log("- CONSUMER_ROLE:", consumerRole);
  console.log("- PRODUCER_ROLE:", producerRole);

  console.log("\n✅ Deployment completed successfully!");
  console.log("\nNext steps:");
  console.log("1. Grant roles to other addresses using grantAuthorizer(), grantConsumer(), grantProducer()");
  console.log("2. Set whitelist status for addresses using setWhitelist()");
  console.log("3. Start the web application to test the system");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
