const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("GreenH2CreditsV2 roles & batches", () => {
  async function deploy() {
    const [admin, auditor, regulator, producer, consumer, extra] = await ethers.getSigners();
    const F = await ethers.getContractFactory("GreenH2CreditsV2", admin);
    const c = await F.deploy(
      await admin.getAddress(),
      await auditor.getAddress(),
      await regulator.getAddress()
    );
    await c.waitForDeployment();

    // setup baseline
    await (await c.setWhitelist(await producer.getAddress(), true)).wait();
    await (await c.setWhitelist(await consumer.getAddress(), true)).wait();
    await (await c.grantConsumer(await consumer.getAddress())).wait();
    return { c, admin, auditor, regulator, producer, consumer, extra };
  }

  it("producer authorized via whitelist OR PRODUCER_ROLE", async () => {
    const { c, auditor, producer, extra } = await deploy();

    // by whitelist
    await expect(
      c.connect(auditor).issueCredit(await producer.getAddress(), 100n, "m1")
    ).to.emit(c, "Issued");

    // switch to PRODUCER_ROLE
    await (await c.setWhitelist(await producer.getAddress(), false)).wait();
    await (await c.grantProducer(await producer.getAddress())).wait();
    await expect(
      c.connect(auditor).issueCredit(await producer.getAddress(), 50n, "m2")
    ).to.emit(c, "Issued");

    // unauthorized producer
    await expect(
      c.connect(auditor).issueCredit(await extra.getAddress(), 10n, "m3")
    ).to.be.revertedWith("producer not authorized");
  });

  it("getBatch / getBatches return expected data", async () => {
    const { c, auditor, producer } = await deploy();

    await (await c.connect(auditor).issueCredit(await producer.getAddress(), 600n, "m1")).wait();
    await (await c.connect(auditor).issueCredit(await producer.getAddress(), 500n, "m2")).wait();

    const b0 = await c.getBatch(0);
    expect(b0.issuedAmount).to.eq(600n);

    const list = await c.getBatches(0, 10);
    expect(list.length).to.eq(2);
    expect(list[1].issuedAmount).to.eq(500n);
  });
});
