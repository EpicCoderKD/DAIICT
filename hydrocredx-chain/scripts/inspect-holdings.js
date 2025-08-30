// scripts/inspect-holdings.js
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


  const c = await ethers.getContractAt("GreenH2CreditsV2", CONTRACT);

  for (const who of [producer, consumer]) {
    const addr = await who.getAddress();
    const [ids, amts] = await c.getHoldings(addr);
    console.log(`Holdings of ${addr}:`);
    for (let i = 0; i < ids.length; i++) {
      console.log(`  batch ${ids[i].toString()} -> ${amts[i].toString()}`);
    }
  }
}
main().catch((e)=>{ console.error(e); process.exit(1); });
