// scripts/retire.manual.js
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
  if (!CONTRACT) throw new Error("Provide --contract 0xContractAddress");

  // ✅ This is the new line — try CLI flag first, else fallback to .env
  const CONSUMER_PK = getArg("frompk") || process.env.CONSUMER_PK;
  if (!CONSUMER_PK) throw new Error("Provide --frompk 0x... or set CONSUMER_PK in .env");

  const AMOUNT = BigInt(getArg("amount", "200"));

  const consumer = new ethers.Wallet(CONSUMER_PK, new ethers.JsonRpcProvider(rpc));
  const c = await ethers.getContractAt("GreenH2CreditsV2", CONTRACT, consumer);

  const tx = await c.retireCredit(AMOUNT);
  await tx.wait();
  console.log(`Retired ${AMOUNT} from ${await consumer.getAddress()}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
