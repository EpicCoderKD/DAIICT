const hre = require("hardhat");

async function main() {
  const [admin, ...others] = await hre.ethers.getSigners();

  // 🔹 Replace with your deployed contract address
  const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

  const contract = await hre.ethers.getContractAt("GreenH2CreditsV2", contractAddress);

  console.log("Admin (Deployer):", admin.address);

  for (let i = 0; i < 5; i++) {
    const signer = (await hre.ethers.getSigners())[i];
    const addr = signer.address;

    const DEFAULT_ADMIN_ROLE = ethers.ZeroHash;
    const isAdmin = await contract.hasRole(DEFAULT_ADMIN_ROLE, admin.address);
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
