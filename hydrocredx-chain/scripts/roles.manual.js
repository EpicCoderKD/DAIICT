// scripts/roles.manual.js
const hre = require("hardhat");
const { ethers } = hre;
require("dotenv").config();

function getArg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  if (i !== -1 && process.argv[i + 1]) return process.argv[i + 1];
  return fallback;
}

async function main() {
  const network = getArg("net", "localhost"); // localhost | sepolia
  const CONTRACT = getArg("contract");
  if (!CONTRACT) throw new Error("Pass --contract <address>");

  // target addresses to grant/whitelist (you choose them!)
  const PRODUCER = getArg("producer");
  const CONSUMER = getArg("consumer");
  const AUDITOR  = getArg("auditor");
  const REGULATOR= getArg("regulator");

  // admin signs all role/whitelist ops
  const rpc = network === "sepolia" ? process.env.SEPOLIA_URL : process.env.LOCAL_URL;
  const adminWallet = new ethers.Wallet(process.env.ADMIN_PK, new ethers.JsonRpcProvider(rpc));
  const c = await ethers.getContractAt("GreenH2CreditsV2", CONTRACT, adminWallet);

  if (PRODUCER) {
    await (await c.setWhitelist(PRODUCER, true)).wait();
    // Optional role instead of whitelist:
    // await (await c.grantProducer(PRODUCER)).wait();
    console.log("Whitelisted PRODUCER:", PRODUCER);
  }

  if (CONSUMER) {
    await (await c.setWhitelist(CONSUMER, true)).wait();
    await (await c.grantConsumer(CONSUMER)).wait();
    console.log("Whitelisted+Granted CONSUMER:", CONSUMER);
  }

  if (AUDITOR) {
    await (await c.grantAuditor(AUDITOR)).wait();
    console.log("Granted AUDITOR:", AUDITOR);
  }

  if (REGULATOR) {
    await (await c.grantRegulator(REGULATOR)).wait();
    console.log("Granted REGULATOR:", REGULATOR);
  }

  console.log("Done.");
}

main().catch((e) => { console.error(e); process.exit(1); });
