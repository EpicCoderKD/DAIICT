const fs = require("node:fs");

async function main() {
  const [admin, auditor, regulator, producer, buyer] = await ethers.getSigners();
  const F = await ethers.getContractFactory("GreenH2CreditsV2");
  const c = await F.deploy(admin.address, auditor.address, regulator.address);
  await c.waitForDeployment();
  const addr = await c.getAddress();
  console.log("Deployed:", addr);

  // Whitelist & roles
  await (await c.setWhitelist(producer.address, true)).wait();
  await (await c.setWhitelist(buyer.address, true)).wait();
  await (await c.grantConsumer(buyer.address)).wait();

  // Seed demo batches
  await (await c.connect(auditor).issueCredit(producer.address, 300n, "cert:PLANT-JULY")).wait();
  await (await c.connect(auditor).issueCredit(producer.address, 200n, "cert:PLANT-AUG")).wait();
  await (await c.connect(producer).transferCredit(buyer.address, 150n)).wait();

  // Optional: save ABI/address for a future web app
  try {
    fs.mkdirSync("web/public", { recursive: true });
    fs.writeFileSync(
      "web/public/contract-address.json",
      JSON.stringify({ address: addr, network: "localhost", time: Date.now() }, null, 2)
    );
    const artifactPath = "artifacts/contracts/GreenH2CreditsV2.sol/GreenH2CreditsV2.json";
    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
    fs.mkdirSync("web/src/abi", { recursive: true });
    fs.writeFileSync("web/src/abi/GreenH2CreditsV2.json", JSON.stringify(artifact.abi, null, 2));
  } catch {}
}

main().catch((e) => { console.error(e); process.exit(1); });
