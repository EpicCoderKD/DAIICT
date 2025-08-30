// scripts/transfer.js
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const { ethers } = hre;
  const [ , , , producer, consumer] = await ethers.getSigners();
  let CONTRACT = process.env.CONTRACT || "REPLACE_ME";
if (CONTRACT === "REPLACE_ME") {
  const p = path.join(__dirname, "..", "deployments", "localhost", "GreenH2CreditsV2.json");
  CONTRACT = JSON.parse(fs.readFileSync(p)).address;
}

  const c = await ethers.getContractAt("GreenH2CreditsV2", CONTRACT, producer);

  const amt = 300n;
  console.log(`Transferring ${amt} from producer -> consumer`);
  await (await c.transferCredit(await consumer.getAddress(), amt)).wait();

  const cRO = await ethers.getContractAt("GreenH2CreditsV2", CONTRACT);
  console.log("Producer balance:", (await cRO.balanceOf(await producer.getAddress())).toString());
  console.log("Consumer balance:", (await cRO.balanceOf(await consumer.getAddress())).toString());
}
main().catch((e)=>{ console.error(e); process.exit(1); });
