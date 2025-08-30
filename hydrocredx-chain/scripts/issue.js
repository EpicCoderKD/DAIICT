// scripts/issue.js
const fs = require("fs");
const path = require("path");

const hre = require("hardhat");

async function main() {
  const { ethers } = hre;
  const [ , auditor, , producer] = await ethers.getSigners();

  let CONTRACT = process.env.CONTRACT || "REPLACE_ME";
if (CONTRACT === "REPLACE_ME") {
  const p = path.join(__dirname, "..", "deployments", "localhost", "GreenH2CreditsV2.json");
  CONTRACT = JSON.parse(fs.readFileSync(p)).address;
}


  // Auditor signer
  const c = await ethers.getContractAt("GreenH2CreditsV2", CONTRACT, auditor);

  const amount = 1000n;
  const metadataURI = "ipfs://QmExampleHash";

  console.log("Issuing...", amount.toString(), "to producer", await producer.getAddress());
  const tx = await c.issueCredit(await producer.getAddress(), amount, metadataURI);
  const rc = await tx.wait();

  for (const l of rc.logs) {
    try {
      const ev = c.interface.parseLog(l);
      if (ev.name === "Issued") {
        console.log("Issued batch:", ev.args.batchId.toString(), "amount:", ev.args.amount.toString());
      }
    } catch {}
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
