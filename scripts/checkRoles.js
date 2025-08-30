const hre = require("hardhat");

async function main() {
  const [admin, ...others] = await hre.ethers.getSigners();

  // 🔹 Replace with your deployed contract address
  const contractAddress = "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9";

  const contract = await hre.ethers.getContractAt("GreenH2CreditsV2", contractAddress);

  console.log("Admin (Deployer):", admin.address);

  for (let i = 0; i < 5; i++) {
    const signer = (await hre.ethers.getSigners())[i];
    const addr = signer.address;

    const isAdmin = await contract.hasRole(await contract.DEFAULT_ADMIN_ROLE(), addr);
    const isProducer = await contract.hasRole(await contract.PRODUCER_ROLE(), addr);
    const isAuditor = await contract.hasRole(await contract.AUDITOR_ROLE(), addr);
    const isRegulator = await contract.hasRole(await contract.REGULATOR_ROLE(), addr);
    const isConsumer = await contract.hasRole(await contract.CONSUMER_ROLE(), addr);

    console.log(
      `Account[${i}] ${addr} →`,
      {
        Admin: isAdmin,
        Producer: isProducer,
        Auditor: isAuditor,
        Regulator: isRegulator,
        Consumer: isConsumer
      }
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
