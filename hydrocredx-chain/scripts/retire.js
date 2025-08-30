// scripts/retire.js
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const { ethers } = hre;
  const [ , , , , consumer] = await ethers.getSigners();
  let CONTRACT = process.env.CONTRACT || "REPLACE_ME";
if (CONTRACT === "REPLACE_ME") {
  const p = path.join(__dirname, "..", "deployments", "localhost", "GreenH2CreditsV2.json");
  CONTRACT = JSON.parse(fs.readFileSync(p)).address;
}

  const c = await ethers.getContractAt("GreenH2CreditsV2", CONTRACT, consumer);
  const amt = 200n;

  console.log(`Retiring ${amt} as consumer...`);
  await (await c.retireCredit(amt)).wait();

  const cRO = await ethers.getContractAt("GreenH2CreditsV2", CONTRACT);
  console.log("Consumer balance:", (await cRO.balanceOf(await consumer.getAddress())).toString());
  console.log("Total retired:", (await cRO.totalRetired()).toString());
}
main().catch((e)=>{ console.error(e); process.exit(1); });
