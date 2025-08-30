// scripts/deploy-local.js
const fs = require("fs");
const path = require("path");
const hre = require("hardhat");

async function main() {
  const { ethers, network } = hre;
  console.log(`Network: ${network.name}`);

  const [admin, auditor, regulator, producer, consumer] = await ethers.getSigners();

  console.log("Admin    :", await admin.getAddress());
  console.log("Auditor  :", await auditor.getAddress());
  console.log("Regulator:", await regulator.getAddress());
  console.log("Producer :", await producer.getAddress());
  console.log("Consumer :", await consumer.getAddress());

  const Factory = await ethers.getContractFactory("GreenH2CreditsV2", admin);
  const contract = await Factory.deploy(
    await admin.getAddress(),
    await auditor.getAddress(),
    await regulator.getAddress()
  );
  await contract.waitForDeployment();

  const addr = await contract.getAddress();
  console.log("Deployed GreenH2CreditsV2 at:", addr);
  const outDir = path.join(__dirname, "..", "deployments", "localhost");
fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, "GreenH2CreditsV2.json");
fs.writeFileSync(outFile, JSON.stringify({ address: addr }, null, 2));
console.log("Saved:", outFile);
  
  // Quick sanity checks
  console.log("isAuditor(auditor)?", await contract.isAuditor(await auditor.getAddress()));
  console.log("isRegulator(reg)?", await contract.isRegulator(await regulator.getAddress()));
  console.log("isConsumer(consumer)?", await contract.isConsumer(await consumer.getAddress()));

  // whitelist a couple of accounts so transfers/issue will work immediately
  await (await contract.setWhitelist(await producer.getAddress(), true)).wait();
  await (await contract.setWhitelist(await consumer.getAddress(), true)).wait();

  // grant CONSUMER to consumer
  await (await contract.grantConsumer(await consumer.getAddress())).wait();

  console.log("Bootstrap done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
