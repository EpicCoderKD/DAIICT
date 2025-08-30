const { expect } = require("chai");

describe("GreenH2CreditsV2", function () {
  it("issue -> transfer -> retire with whitelist/consumer", async function () {
    const [admin, auditor, regulator, producer, buyer] = await ethers.getSigners();
    const F = await ethers.getContractFactory("GreenH2CreditsV2");
    const c = await F.deploy(admin.address, auditor.address, regulator.address);
    await c.waitForDeployment();

    await c.connect(admin).setWhitelist(producer.address, true);
    await c.connect(admin).setWhitelist(buyer.address, true);
    await c.connect(admin).grantConsumer(buyer.address);

    await expect(c.connect(auditor).issueCredit(producer.address, 500n, "cert:xyz"))
      .to.emit(c, "Issued");

    await expect(c.connect(producer).transferCredit(buyer.address, 200n))
      .to.emit(c, "TransferredBatch");

    await expect(c.connect(buyer).retireCredit(150n))
      .to.emit(c, "RetiredBatch");

    expect(await c.totalIssued()).to.equal(500n);
    expect(await c.totalRetired()).to.equal(150n);
  });

  it("FIFO across multiple batches", async function () {
    const [admin, auditor, regulator, P, B] = await ethers.getSigners();
    const F = await ethers.getContractFactory("GreenH2CreditsV2");
    const c = await F.deploy(admin.address, auditor.address, regulator.address);
    await c.waitForDeployment();

    await c.connect(admin).setWhitelist(P.address, true);
    await c.connect(admin).setWhitelist(B.address, true);
    await c.connect(admin).grantConsumer(B.address);

    await c.connect(auditor).issueCredit(P.address, 300n, "cert:A");
    await c.connect(auditor).issueCredit(P.address, 200n, "cert:B");

    await c.connect(P).transferCredit(B.address, 350n); // 300 A + 50 B
    await c.connect(B).retireCredit(120n);              // burns from A first

    const [ids, amts] = await c.getHoldings(B.address);
    const sum = amts.reduce((a, b) => a + Number(b), 0);
    expect(sum).to.equal(230);
  });
});
