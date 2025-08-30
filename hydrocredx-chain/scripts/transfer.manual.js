// scripts/transfer.manual.js
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
  const FROM_PK  = getArg("frompk");      // private key of the sender (producer)
  const TO       = getArg("to");
  const AMOUNT   = BigInt(getArg("amount", "300"));

  if (!CONTRACT || !FROM_PK || !TO) throw new Error("Usage: --contract <addr> --frompk 0x... --to <addr> --amount 300");

  const sender = new ethers.Wallet(FROM_PK, new ethers.JsonRpcProvider(rpc));
  const c = await ethers.getContractAt("GreenH2CreditsV2", CONTRACT, sender);

  await (await c.transferCredit(TO, AMOUNT)).wait();
  console.log(`Transferred ${AMOUNT} from ${await sender.getAddress()} to ${TO}`);
}

main().catch((e)=>{ console.error(e); process.exit(1); });
