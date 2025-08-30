const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const { ethers, network } = hre;
  console.log(`Network: ${network.name}`);

  // Expect 3 funded keys in .env (admin, auditor, regulator)
  const [admin, auditor, regulator] = await ethers.getSigners();
  console.log("Admin    :", await admin.getAddress());
  console.log("Auditor  :", await auditor.getAddress());
  console.log("Regulator:", await regulator.getAddress());

  const F = await ethers.getContractFactory("GreenH2CreditsV2", admin);
  const c = await F.deploy(
    await admin.getAddress(),
    await auditor.getAddress(),
    await regulator.getAddress()
  );
  await c.waitForDeployment();

  const addr = await c.getAddress();
  console.log("Deployed GreenH2CreditsV2 at:", addr);

  // Save address
  const outDir = path.join(__dirname, "..", "deployments", "sepolia");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "GreenH2CreditsV2.json"), JSON.stringify({ address: addr }, null, 2));

  // Export ABI + address for frontend/backend
  const artifact = await hre.artifacts.readArtifact("GreenH2CreditsV2");
  const feDir = path.join(__dirname, "..", "frontend-export");
  fs.mkdirSync(feDir, { recursive: true });
  fs.writeFileSync(path.join(feDir, "GreenH2CreditsV2.abi.json"), JSON.stringify(artifact.abi, null, 2));
  fs.writeFileSync(path.join(feDir, "address.sepolia.json"), JSON.stringify({ address: addr }, null, 2));

  console.log("Wrote:", path.join(outDir, "GreenH2CreditsV2.json"));
  console.log("Exported ABI/address to frontend-export/");
}

main().catch((e) => { console.error(e); process.exit(1); });
