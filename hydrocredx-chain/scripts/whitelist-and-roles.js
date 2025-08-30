// scripts/whitelist-and-roles.js
const fs = require("fs");
const path = require("path");

const hre = require("hardhat");

async function main() {
  const { ethers } = hre;
  const [admin, auditor, regulator, producer, consumer] = await ethers.getSigners();

  // load deployed contract address from env
  let CONTRACT = process.env.CONTRACT || "REPLACE_ME";
if (CONTRACT === "REPLACE_ME") {
  const p = path.join(__dirname, "..", "deployments", "localhost", "GreenH2CreditsV2.json");
  CONTRACT = JSON.parse(fs.readFileSync(p)).address;
}


  const c = await ethers.getContractAt("GreenH2CreditsV2", CONTRACT, admin);

  console.log("Using contract at:", CONTRACT);

  // whitelist producer + consumer
  await (await c.setWhitelist(await producer.getAddress(), true)).wait();
  await (await c.setWhitelist(await consumer.getAddress(), true)).wait();

  // grant roles
  await (await c.grantAuditor(await auditor.getAddress())).wait();
  await (await c.grantRegulator(await regulator.getAddress())).wait();
  await (await c.grantConsumer(await consumer.getAddress())).wait();

  console.log("isAuditor:", await c.isAuditor(await auditor.getAddress()));
  console.log("isRegulator:", await c.isRegulator(await regulator.getAddress()));
  console.log("isConsumer:", await c.isConsumer(await consumer.getAddress()));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
