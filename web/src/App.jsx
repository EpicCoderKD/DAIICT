import { useEffect, useState } from "react";
import { getContract, initializeTransactionMirroring } from "./lib/eth";
import { AUDITOR_ROLE, REGULATOR_ROLE, CONSUMER_ROLE, PRODUCER_ROLE } from "./lib/roles";

function Stat({ label, value }) {
  return (
    <div className="p-4 rounded-2xl shadow border">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}

export default function App() {
  const [c, setC] = useState(null);
  const [me, setMe] = useState("");
  const [totalIssued, setTI] = useState(0);
  const [totalRetired, setTR] = useState(0);
  const [myBal, setMyBal] = useState(0);
  const [myHoldings, setMyHoldings] = useState([]);
  const [issued, setIssued] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [retired, setRetired] = useState([]);
  const [networkMsg, setNetworkMsg] = useState("");
  const [myRoles, setMyRoles] = useState([]);
  const [activeRole, setActiveRole] = useState(""); // selected role
  
  // New state for transaction mirroring
  const [supabaseService, setSupabaseService] = useState(null);
  const [mirroredTransactions, setMirroredTransactions] = useState([]);
  const [transactionStats, setTransactionStats] = useState({});
  const [isMirroringEnabled, setIsMirroringEnabled] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const contract = await getContract();
        setC(contract);
        const signerAddr = await contract.runner.getAddress();
        setMe(signerAddr);
        await refresh(contract, signerAddr);
        setNetworkMsg("Connected (use MetaMask: Localhost 8545, chainId 31337)");
        
        // Initialize transaction mirroring
        try {
          const { supabaseService: service } = await initializeTransactionMirroring();
          setSupabaseService(service);
          setIsMirroringEnabled(true);
          await loadMirroredTransactions(service);
          await loadTransactionStats(service);
        } catch (mirrorError) {
          console.warn('Transaction mirroring not available:', mirrorError.message);
          setIsMirroringEnabled(false);
        }
      } catch (e) {
        console.error(e);
        setNetworkMsg(e.message || String(e));
      }
    })();
  }, []);

  async function loadMirroredTransactions(service) {
    if (!service) return;
    try {
      const transactions = await service.getTransactions({ limit: 50 });
      setMirroredTransactions(transactions);
    } catch (error) {
      console.error('Error loading mirrored transactions:', error);
    }
  }

  async function loadTransactionStats(service) {
    if (!service) return;
    try {
      const stats = await service.getTransactionStats();
      setTransactionStats(stats);
    } catch (error) {
      console.error('Error loading transaction stats:', error);
    }
  }

  async function refresh(contract, addr) {
    const [ti, tr, bal, isAuditor, isRegulator, isConsumer, isProducer] =
      await Promise.all([
        contract.totalIssued(),
        contract.totalRetired(),
        contract.balanceOf(addr),
        await contract.hasRole(AUDITOR_ROLE, addr),
        await contract.hasRole(REGULATOR_ROLE, addr),
        await contract.hasRole(CONSUMER_ROLE, addr),
        await contract.hasRole(await contract.PRODUCER_ROLE(), addr)

      ]);

    setTI(Number(ti));
    setTR(Number(tr));
    setMyBal(Number(bal));

    const roles = [];
    if (isAuditor) roles.push("Auditor");
    if (isRegulator) roles.push("Regulator");
    if (isConsumer) roles.push("Consumer");
    if (isProducer) roles.push("Producer");
    if (roles.length === 0) roles.push("Unassigned");
    setMyRoles(roles);

    // default activeRole
    if (!activeRole && roles.length > 0) {
      setActiveRole(roles[0]);
    }

    const [ids, amts] = await contract.getHoldings(addr);
    const rows = await Promise.all(
      ids.map(async (id, i) => {
        const b = await contract.batches(id);
        return {
          batchId: Number(id),
          amount: Number(amts[i]),
          meta: b.metadataURI,
          issuedAt: Number(b.issuedAt),
        };
      })
    );
    setMyHoldings(rows);

    const from = 0;
    const iss = await contract.queryFilter(
      contract.filters.Issued(),
      from,
      "latest"
    );
    setIssued(
      iss.map((e) => ({
        batchId: Number(e.args.batchId),
        producer: e.args.producer,
        amount: String(e.args.amount),
        meta: e.args.metadataURI,
      }))
    );

    const trs = await contract.queryFilter(
      contract.filters.TransferredBatch(),
      from,
      "latest"
    );
    setTransfers(
      trs.map((e) => ({
        from: e.args.from,
        to: e.args.to,
        batchId: Number(e.args.batchId),
        amount: String(e.args.amount),
      }))
    );

    const ret = await contract.queryFilter(
      contract.filters.RetiredBatch(),
      from,
      "latest"
    );
    setRetired(
      ret.map((e) => ({
        holder: e.args.holder,
        batchId: Number(e.args.batchId),
        amount: String(e.args.amount),
      }))
    );
  }

  async function issue(e) {
    e.preventDefault();
    const f = new FormData(e.target);
    const producer = f.get("producer");
    const amount = BigInt(f.get("amount"));
    const meta = f.get("meta");
    await (await c.issueCredit(producer, amount, meta)).wait();
    await refresh(c, me);
    e.target.reset();
  }

  async function transfer(e) {
    e.preventDefault();
    const f = new FormData(e.target);
    const to = f.get("to");
    const amount = BigInt(f.get("amount"));
    await (await c.transferCredit(to, amount)).wait();
    await refresh(c, me);
    e.target.reset();
  }

  async function retire(e) {
    e.preventDefault();
    const f = new FormData(e.target);
    const amount = BigInt(f.get("amount"));
    await (await c.retireCredit(amount)).wait();
    await refresh(c, me);
    e.target.reset();
  }

  // wallet account change
  window.ethereum.on("accountsChanged", (accounts) => {
    if (accounts.length > 0) {
      const addr = accounts[0];
      setMe(addr);
      refresh(c, addr);
    }
  });

  if (!c) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-2">HydroCredX</h1>
        <div className="text-sm text-red-600">{networkMsg}</div>
        <p className="mt-4 text-gray-600">
          Tip: run <code>npx hardhat node</code> and deploy with{" "}
          <code>npx hardhat run scripts/deploy-local.js --network localhost</code>
          . Add MetaMask network: RPC http://127.0.0.1:8545, chainId 31337.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">HydroCredX</h1>
        <div className="flex flex-col text-xs text-gray-500 items-end">
          <div>
            Connected: {me.slice(0, 6)}…{me.slice(-4)} ({myRoles.join(", ")})
          </div>
          {myRoles.length > 1 && (
            <div className="mt-1 flex gap-2">
              {myRoles.map((r) => (
                <button
                  key={r}
                  onClick={() => setActiveRole(r)}
                  className={`px-2 py-1 rounded ${
                    activeRole === r
                      ? "bg-blue-500 text-white"
                      : "bg-gray-200 text-gray-700"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="My Balance" value={myBal} />
        <Stat label="Total Issued" value={totalIssued} />
        <Stat label="Total Retired" value={totalRetired} />
        <Stat label="Mirroring Status" value={isMirroringEnabled ? "Active" : "Disabled"} />
      </div>

      {/* Transaction Mirroring Status */}
      {isMirroringEnabled && (
        <div className="p-4 rounded-2xl border bg-green-50">
          <h2 className="text-xl font-semibold mb-3 text-green-800">Transaction Mirroring Active</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Stat label="Total Transactions" value={transactionStats.totalTransactions || 0} />
            <Stat label="Issued Events" value={transactionStats.eventCounts?.Issued || 0} />
            <Stat label="Transfer Events" value={transactionStats.eventCounts?.Transferred || 0} />
            <Stat label="Retired Events" value={transactionStats.eventCounts?.Retired || 0} />
          </div>
          <p className="text-sm text-green-600 mt-2">
            All blockchain transactions are being mirrored to Supabase in real-time
          </p>
        </div>
      )}

      <section className="p-4 rounded-2xl border">
        <h2 className="text-xl font-semibold mb-3">My Batch Holdings (FIFO lots)</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left">
                <th className="py-2">Batch</th>
                <th>Amount</th>
                <th>Metadata</th>
                <th>Issued At (unix)</th>
              </tr>
            </thead>
            <tbody>
              {myHoldings.map((r, i) => (
                <tr key={i} className="border-t">
                  <td className="py-2">{r.batchId}</td>
                  <td>{r.amount}</td>
                  <td
                    className="truncate max-w-[320px]"
                    title={r.meta}
                  >
                    {r.meta}
                  </td>
                  <td>{r.issuedAt}</td>
                </tr>
              ))}
              {myHoldings.length === 0 && (
                <tr>
                  <td
                    className="py-2 text-gray-500"
                    colSpan={4}
                  >
                    No holdings
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid md:grid-cols-3 gap-6">
        {activeRole === "Auditor" && (
          <div className="p-4 rounded-2xl border space-y-3">
            <h3 className="font-semibold">Auditor — Issue</h3>
            <form onSubmit={issue} className="space-y-2">
              <input
                name="producer"
                placeholder="Producer address"
                className="w-full p-2 border rounded"
                required
              />
              <input
                name="amount"
                type="number"
                placeholder="Amount"
                className="w-full p-2 border rounded"
                required
              />
              <input
                name="meta"
                placeholder="metadataURI (e.g. cert:PLANT-SEP)"
                className="w-full p-2 border rounded"
                required
              />
              <button className="px-4 py-2 rounded bg-black text-white">
                Issue
              </button>
            </form>
            <p className="text-xs text-gray-500">
              Requires AUDITOR_ROLE & producer whitelisted.
            </p>
          </div>
        )}

        <div className="p-4 rounded-2xl border space-y-3">
          <h3 className="font-semibold">Holder — Transfer</h3>
          <form onSubmit={transfer} className="space-y-2">
            <input
              name="to"
              placeholder="Recipient address"
              className="w-full p-2 border rounded"
              required
            />
            <input
              name="amount"
              type="number"
              placeholder="Amount"
              className="w-full p-2 border rounded"
              required
            />
            <button className="px-4 py-2 rounded bg-black text-white">
              Transfer
            </button>
          </form>
          <p className="text-xs text-gray-500">
            Requires both addresses whitelisted.
          </p>
        </div>

        {activeRole === "Consumer" && (
          <div className="p-4 rounded-2xl border space-y-3">
            <h3 className="font-semibold">Consumer — Retire</h3>
            <form onSubmit={retire} className="space-y-2">
              <input
                name="amount"
                type="number"
                placeholder="Amount"
                className="w-full p-2 border rounded"
                required
              />
              <button className="px-4 py-2 rounded bg-black text-white">
                Retire
              </button>
            </form>
            <p className="text-xs text-gray-500">
              Requires CONSUMER_ROLE. FIFO per-batch burning.
            </p>
          </div>
        )}
      </section>

      <section className="grid md:grid-cols-3 gap-6">
        <div className="p-4 rounded-2xl border">
          <h3 className="font-semibold mb-2">Issued</h3>
          <ul className="text-sm space-y-1 max-h-64 overflow-auto">
            {issued.map((e, i) => (
              <li key={i}>
                batch {e.batchId} → {e.producer.slice(0, 6)}… amt {e.amount}{" "}
                <span className="text-gray-500">({e.meta})</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="p-4 rounded-2xl border">
          <h3 className="font-semibold mb-2">Transferred (per batch)</h3>
          <ul className="text-sm space-y-1 max-h-64 overflow-auto">
            {transfers.map((e, i) => (
              <li key={i}>
                {e.from.slice(0, 6)}… → {e.to.slice(0, 6)}… batch {e.batchId} amt{" "}
                {e.amount}
              </li>
            ))}
          </ul>
        </div>
        <div className="p-4 rounded-2xl border">
          <h3 className="font-semibold mb-2">Retired (per batch)</h3>
          <ul className="text-sm space-y-1 max-h-64 overflow-auto">
            {retired.map((e, i) => (
              <li key={i}>
                {e.holder.slice(0, 6)}… batch {e.batchId} retired {e.amount}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Mirrored Transactions from Supabase */}
      {isMirroringEnabled && (
        <section className="p-4 rounded-2xl border">
          <h2 className="text-xl font-semibold mb-3">Mirrored Transactions (Supabase Backup)</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left">
                  <th className="py-2">Event</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Amount</th>
                  <th>Batch ID</th>
                  <th>Block</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {mirroredTransactions.map((tx, i) => (
                  <tr key={i} className="border-t">
                    <td className="py-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        tx.event_name === 'Issued' ? 'bg-green-100 text-green-800' :
                        tx.event_name === 'Transferred' ? 'bg-blue-100 text-blue-800' :
                        tx.event_name === 'Retired' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {tx.event_name}
                      </span>
                    </td>
                    <td className="py-2">
                      {tx.from_address ? `${tx.from_address.slice(0, 6)}…${tx.from_address.slice(-4)}` : '-'}
                    </td>
                    <td className="py-2">
                      {tx.to_address ? `${tx.to_address.slice(0, 6)}…${tx.to_address.slice(-4)}` : '-'}
                    </td>
                    <td className="py-2">{tx.amount || '-'}</td>
                    <td className="py-2">{tx.batch_id || '-'}</td>
                    <td className="py-2">{tx.block_number}</td>
                    <td className="py-2">
                      {tx.block_timestamp ? new Date(tx.block_timestamp * 1000).toLocaleString() : '-'}
                    </td>
                  </tr>
                ))}
                {mirroredTransactions.length === 0 && (
                  <tr>
                    <td className="py-2 text-gray-500" colSpan={7}>
                      No transactions mirrored yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="mt-3 text-xs text-gray-500">
            Showing last 50 transactions. All transactions are automatically mirrored from the blockchain to Supabase.
          </div>
        </section>
      )}
    </div>
  );
}
