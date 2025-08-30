const hre = require("hardhat");

async function main() {
  const [admin, user1, user2, user3, user4] = await hre.ethers.getSigners();

  // 🔹 Use the deployed contract address from the latest deployment
  const contractAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

  const contract = await hre.ethers.getContractAt("GreenH2CreditsV2", contractAddress);

  console.log("Admin (Deployer):", admin.address);
  console.log("Contract Address:", contractAddress);
  console.log("");

  // Get role constants
  try {
    const authorizerRole = await contract.AUTHORIZER_ROLE();
    const consumerRole = await contract.CONSUMER_ROLE();
    const producerRole = await contract.PRODUCER_ROLE();
    
    console.log("Role Constants:");
    console.log("- AUTHORIZER_ROLE:", authorizerRole);
    console.log("- CONSUMER_ROLE:", consumerRole);
    console.log("- PRODUCER_ROLE:", producerRole);
    console.log("");
  } catch (error) {
    console.log("Could not fetch role constants:", error.message);
    console.log("");
  }

  // Grant some roles to demonstrate the system
  console.log("Granting roles to demonstrate the system...");
  try {
    // Grant authorizer role to user1
    await contract.grantAuthorizer(user1.address);
    console.log(`✅ Granted AUTHORIZER_ROLE to ${user1.address}`);
    
    // Grant producer role to user2
    await contract.grantProducer(user2.address);
    console.log(`✅ Granted PRODUCER_ROLE to ${user2.address}`);
    
    // Grant consumer role to user3
    await contract.grantConsumer(user3.address);
    console.log(`✅ Granted CONSUMER_ROLE to ${user3.address}`);
    
    // Grant consumer role to user4 as well
    await contract.grantConsumer(user4.address);
    console.log(`✅ Granted CONSUMER_ROLE to ${user4.address}`);
    
    console.log("");
  } catch (error) {
    console.log("Error granting roles:", error.message);
    console.log("");
  }

  // Check roles for all accounts
  console.log("Checking roles for all accounts:");
  console.log("=" .repeat(80));
  
  const accounts = [admin, user1, user2, user3, user4];
  const accountNames = ["Admin", "User1", "User2", "User3", "User4"];

  for (let i = 0; i < accounts.length; i++) {
    const signer = accounts[i];
    const addr = signer.address;
    const name = accountNames[i];

    try {
      const isAdmin = await contract.hasRole(await contract.DEFAULT_ADMIN_ROLE(), addr);
      const isAuthorizer = await contract.hasRole(await contract.AUTHORIZER_ROLE(), addr);
      const isProducer = await contract.hasRole(await contract.PRODUCER_ROLE(), addr);
      const isConsumer = await contract.hasRole(await contract.CONSUMER_ROLE(), addr);
      const isWhitelisted = await contract.isWhitelisted(addr);

      console.log(
        `${name.padEnd(8)} ${addr} →`,
        {
          Admin: isAdmin,
          Authorizer: isAuthorizer,
          Producer: isProducer,
          Consumer: isConsumer,
          Whitelisted: isWhitelisted
        }
      );
    } catch (error) {
      console.log(`${name.padEnd(8)} ${addr} → Error checking roles:`, error.message);
    }
  }

  console.log("=" .repeat(80));
  console.log("Note: Only accounts that have been granted specific roles will show 'true'");
  console.log("Use grantAuthorizer(), grantProducer(), grantConsumer() to assign roles");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
