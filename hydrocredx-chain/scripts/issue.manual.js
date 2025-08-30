// scripts/issue.manual.js
const hre = require("hardhat");
const { ethers } = hre;
require("dotenv").config();

function getArg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  if (i !== -1 && process.argv[i + 1]) return process.argv[i + 1];
  return fallback;
}

async function main() {
  const network = getArg("net", "localhost");
  const rpc = network === "sepolia" ? process.env.SEPOLIA_URL : process.env.LOCAL_URL;

  const CONTRACT = getArg("contract");
  const TO       = getArg("to");       // producer address
  const AMOUNT   = BigInt(getArg("amount", "1000"));
  const META     = getArg("meta", "ipfs://meta");

  if (!CONTRACT || !TO) throw new Error("Usage: --contract <addr> --to <producer> [--amount 1000] [--meta ipfs://...]");

  const auditor = new ethers.Wallet(process.env.AUDITOR_PK, new ethers.JsonRpcProvider(rpc));
  const c = await ethers.getContractAt("GreenH2CreditsV2", CONTRACT, auditor);

  const tx = await c.issueCredit(TO, AMOUNT, META);
  const rc = await tx.wait();
  console.log("Issued:", AMOUNT.toString(), "to", TO, "| tx:", rc.hash);
}

main().catch((e)=>{ console.error(e); process.exit(1); });

