const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("GreenH2CreditsV2 — core flow", () => {
  async function deploy() {
    const [admin, auditor, regulator, producer, consumer] = await ethers.getSigners();
    const F = await ethers.getContractFactory("GreenH2CreditsV2", admin);
    const c = await F.deploy(
      await admin.getAddress(),
      await auditor.getAddress(),
      await regulator.getAddress()
    );
    await c.waitForDeployment();

    // bootstrap: whitelist + role
    await (await c.setWhitelist(await producer.getAddress(), true)).wait();
    await (await c.setWhitelist(await consumer.getAddress(), true)).wait();
    await (await c.grantConsumer(await consumer.getAddress())).wait();

    return { c, admin, auditor, regulator, producer, consumer };
  }

  it("Issue → Transfer(FIFO) → Retire works end-to-end", async () => {
    const { c, auditor, producer, consumer } = await deploy();

    // issue 1000 to producer (1 batch)
    await expect(
      c.connect(auditor).issueCredit(await producer.getAddress(), 1000n, "ipfs://m1")
    ).to.emit(c, "Issued");

    expect(await c.balanceOf(await producer.getAddress())).to.eq(1000n);

    // transfer 300 to consumer
    await expect(
      c.connect(producer).transferCredit(await consumer.getAddress(), 300n)
    ).to.emit(c, "Transferred").and.to.emit(c, "TransferredBatch");

    expect(await c.balanceOf(await producer.getAddress())).to.eq(700n);
    expect(await c.balanceOf(await consumer.getAddress())).to.eq(300n);

    // retire 200 as consumer
    await expect(
      c.connect(consumer).retireCredit(200n)
    ).to.emit(c, "Retired").and.to.emit(c, "RetiredBatch");

    expect(await c.balanceOf(await consumer.getAddress())).to.eq(100n);
    expect(await c.totalRetired()).to.eq(200n);

    // holdings sanity (FIFO lots)
    const [idsP, amtsP] = await c.getHoldings(await producer.getAddress());
    const [idsC, amtsC] = await c.getHoldings(await consumer.getAddress());

    // producer has 700 from batch 0
    expect(idsP.length).to.be.greaterThan(0);
    expect(amtsP.reduce((a, b) => a + b, 0n)).to.eq(700n);

    // consumer has 100 from batch 0
    expect(idsC.length).to.be.greaterThan(0);
    expect(amtsC.reduce((a, b) => a + b, 0n)).to.eq(100n);
  });

  it("pause blocks core actions, unpause restores", async () => {
    const { c, admin, auditor, producer } = await deploy();

    await (await c.connect(admin).pause()).wait();

    await expect(
      c.connect(auditor).issueCredit(await producer.getAddress(), 1n, "m")
    ).to.be.reverted; // Pausable revert

    await (await c.connect(admin).unpause()).wait();

    await expect(
      c.connect(auditor).issueCredit(await producer.getAddress(), 1n, "m")
    ).to.emit(c, "Issued");
  });
});
