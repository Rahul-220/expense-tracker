import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { PieChart, Pie, Cell, Sector, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";

const SUBCATS = {
  "Housing": ["Rent/Mortgage", "HOA", "Repairs", "Furniture"],
  "Utilities": ["Electric", "Gas", "Water", "Internet", "Phone"],
  "Groceries": ["Supermarket", "Farmers Market", "Warehouse/Bulk"],
  "Dining & Takeout": ["Restaurants", "Takeout/Delivery", "Coffee"],
  "Transportation": ["Fuel", "Transit", "Rideshare", "Parking"],
  "Auto": ["Car Payment", "Insurance", "Maintenance", "Registration"],
  "Health": ["Insurance", "Doctor", "Pharmacy", "Gym"],
  "Subscriptions & Memberships": ["Streaming", "Software/Apps", "Music", "Memberships"],
  "Shopping": ["Clothing", "Household", "Personal Care", "Electronics"],
  "Entertainment & Leisure": ["Movies/Events", "Games", "Hobbies", "Books"],
  "Travel": ["Flights", "Hotels", "Activities", "Other Travel"],
  "Miscellaneous": ["Fees & Charges", "One-off", "Other"],
};

const CATEGORIES = Object.keys(SUBCATS);
const INCOME_SOURCES = ["Salary/Wages", "Freelance/Side income", "Investment income", "Other income"];
const ACCOUNT_TYPES = ["Checking", "Savings", "Credit Card", "Cash", "Investment"];
const PIE_COLORS = ["#2DD4BF","#5EEAD4","#0D9488","#99F6E4","#14B8A6","#A7F3D0","#0F766E","#6EE7B7","#34D399","#CCFBF1","#10B981","#D1FAE5"];
const STORAGE_KEY = "expense-tracker-data";

const fmt = (n) =>
  (n < 0 ? "−" : "") + "$" + Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const today = () => new Date().toISOString().slice(0, 10);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

const DEFAULT_ACCOUNTS = [
  { id: "a1", type: "Credit Card", name: "Citi Bank", starting: 0 },
  { id: "a2", type: "Credit Card", name: "Discover", starting: 0 },
  { id: "a3", type: "Checking", name: "Capital One", starting: 0 },
  { id: "a4", type: "Checking", name: "India", starting: 0 },
];

/* ---------- localStorage helpers ---------- */
const storage = {
  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  },
  save(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      return true;
    } catch { return false; }
  },
};

/* ---------- animated number ---------- */
function useCountUp(target, duration = 700) {
  const [display, setDisplay] = useState(target);
  const prev = useRef(target);
  useEffect(() => {
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced) { setDisplay(target); prev.current = target; return; }
    const from = prev.current;
    prev.current = target;
    if (from === target) return;
    let raf;
    const t0 = performance.now();
    const tick = (t) => {
      const p = Math.min((t - t0) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setDisplay(from + (target - from) * ease);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return display;
}

/* ---------- donut active segment ---------- */
const ActiveSlice = (props) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
  return (
    <g>
      <Sector cx={cx} cy={cy} innerRadius={innerRadius - 2} outerRadius={outerRadius + 8}
        startAngle={startAngle} endAngle={endAngle} fill={fill}
        style={{ filter: `drop-shadow(0 0 10px ${fill}66)` }} />
    </g>
  );
};

function Kpi({ label, value, tone, caption, delay }) {
  const animated = useCountUp(value);
  return (
    <div className={`kpi tone-${tone}`} style={{ animationDelay: `${delay}ms` }}>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{fmt(animated)}</div>
      <div className="kpi-caption">{caption}</div>
      <div className="kpi-bar" />
    </div>
  );
}

/* ---------- styles ---------- */
const css = `
  :root {
    --bg: #0A1413; --surface: #101D1B; --surface2: #162825; --line: #1E3531;
    --ink: #E8F4F0; --ink-dim: #8FB0A8; --ink-faint: #54716B;
    --mint: #2DD4BF; --mint-soft: #5EEAD4; --coral: #FB7185; --gold: #FBBF24;
  }
  .app {
    background:
      radial-gradient(1100px 500px at 80% -10%, rgba(45,212,191,.07), transparent 60%),
      radial-gradient(800px 400px at -10% 110%, rgba(251,113,133,.05), transparent 60%),
      var(--bg);
    color: var(--ink); min-height: 100vh;
    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
  }
  .panel {
    background: var(--surface); border: 1px solid var(--line); border-radius: 16px;
    overflow: hidden; animation: rise .5s cubic-bezier(.2,.8,.2,1) both;
  }
  .panel-head {
    display: flex; align-items: center; justify-content: space-between; gap: 8px;
    padding: 14px 18px; border-bottom: 1px solid var(--line);
    background: linear-gradient(180deg, rgba(45,212,191,.06), transparent);
  }
  .panel-title {
    font-weight: 700; letter-spacing: .06em; text-transform: uppercase;
    font-size: 12px; color: var(--mint-soft);
  }
  .kpi {
    position: relative; flex: 1; min-width: 170px; background: var(--surface);
    border: 1px solid var(--line); border-radius: 16px; padding: 18px 20px 22px;
    overflow: hidden; animation: rise .5s cubic-bezier(.2,.8,.2,1) both;
    transition: transform .25s, border-color .25s, box-shadow .25s;
  }
  .kpi:hover { transform: translateY(-3px); border-color: rgba(45,212,191,.35); box-shadow: 0 12px 30px -12px rgba(0,0,0,.6); }
  .kpi-label { font-size: 11px; letter-spacing: .12em; text-transform: uppercase; color: var(--ink-dim); margin-bottom: 6px; }
  .kpi-value { font-size: 30px; font-weight: 800; font-variant-numeric: tabular-nums; letter-spacing: -.01em; }
  .kpi-caption { font-size: 11px; color: var(--ink-faint); margin-top: 4px; }
  .kpi-bar { position: absolute; left: 0; right: 0; bottom: 0; height: 3px; opacity: .9; }
  .tone-mint .kpi-value { color: var(--mint-soft); } .tone-mint .kpi-bar { background: linear-gradient(90deg, var(--mint), transparent); }
  .tone-coral .kpi-value { color: var(--coral); } .tone-coral .kpi-bar { background: linear-gradient(90deg, var(--coral), transparent); }
  .tone-gold .kpi-value { color: var(--gold); } .tone-gold .kpi-bar { background: linear-gradient(90deg, var(--gold), transparent); }
  .tone-coral-neg .kpi-value { color: var(--coral); } .tone-coral-neg .kpi-bar { background: linear-gradient(90deg, var(--coral), transparent); }
  .field {
    background: var(--surface2); color: var(--ink); border: 1px solid var(--line);
    border-radius: 999px; padding: 7px 14px; font-size: 13px; width: 100%;
    transition: border-color .2s, box-shadow .2s;
  }
  .field:focus { outline: none; border-color: var(--mint); box-shadow: 0 0 0 3px rgba(45,212,191,.15); }
  .field:disabled { opacity: .4; cursor: not-allowed; }
  select.field { cursor: pointer; appearance: none; }
  select.field option { background: var(--surface2); color: var(--ink); }
  input.field::placeholder { color: var(--ink-faint); }
  input[type=date].field { color-scheme: dark; }
  .add-btn {
    width: 30px; height: 30px; border-radius: 999px; background: var(--mint);
    color: #06302B; font-weight: 800; font-size: 16px; display: flex;
    align-items: center; justify-content: center; border: none; cursor: pointer; flex: none;
    transition: transform .15s, box-shadow .2s, background .2s;
  }
  .add-btn:hover { transform: scale(1.12); box-shadow: 0 0 16px rgba(45,212,191,.45); background: var(--mint-soft); }
  .add-btn:active { transform: scale(.95); }
  .row {
    display: grid; gap: 8px; align-items: center; padding: 9px 18px; font-size: 13px;
    border-top: 1px solid transparent; animation: rowIn .3s ease both; transition: background .15s;
  }
  .row:nth-child(odd) { background: rgba(255,255,255,.015); }
  .row:hover { background: rgba(45,212,191,.06); }
  .row .del {
    opacity: 0; color: var(--ink-faint); background: none; border: none; cursor: pointer;
    font-size: 15px; transition: opacity .15s, color .15s, transform .15s;
  }
  .row:hover .del { opacity: 1; }
  .del:hover { color: var(--coral); transform: scale(1.25); }
  .grid-head {
    display: grid; gap: 8px; padding: 9px 18px; font-size: 11px;
    letter-spacing: .1em; text-transform: uppercase; color: var(--ink-dim);
    background: var(--surface2); border-bottom: 1px solid var(--line);
  }
  .chip {
    border: 1px solid var(--line); background: var(--surface2); color: var(--ink-dim);
    border-radius: 999px; padding: 5px 12px; font-size: 12px; cursor: pointer;
    transition: all .2s; white-space: nowrap;
  }
  .chip:hover { border-color: var(--mint); color: var(--mint-soft); }
  .chip.on { background: rgba(45,212,191,.14); border-color: var(--mint); color: var(--mint-soft); font-weight: 600; }
  .legend-row {
    display: flex; align-items: center; justify-content: space-between;
    padding: 6px 10px; border-radius: 10px; cursor: pointer;
    transition: background .15s, transform .15s; font-size: 13px;
  }
  .legend-row:hover { background: rgba(45,212,191,.08); transform: translateX(3px); }
  .legend-row.on { background: rgba(45,212,191,.12); outline: 1px solid rgba(45,212,191,.3); }
  .toast {
    position: fixed; bottom: 22px; left: 50%; transform: translateX(-50%);
    background: var(--surface2); border: 1px solid var(--mint); color: var(--mint-soft);
    padding: 9px 20px; border-radius: 999px; font-size: 13px;
    box-shadow: 0 10px 30px rgba(0,0,0,.5); animation: rise .3s ease both; z-index: 50;
  }
  .ghost-btn {
    background: none; border: 1px solid var(--line); color: var(--ink-dim);
    border-radius: 999px; padding: 5px 14px; font-size: 12px; cursor: pointer; transition: all .2s;
  }
  .ghost-btn:hover { border-color: var(--coral); color: var(--coral); }
  .empty { color: var(--ink-faint); font-size: 13px; text-align: center; padding: 26px 10px; }
  .total-bar {
    display: flex; justify-content: space-between; padding: 11px 18px; font-size: 13px;
    font-weight: 700; background: var(--surface2); border-top: 1px solid var(--line); color: var(--mint-soft);
  }
  @keyframes rise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
  @keyframes rowIn { from { opacity: 0; transform: translateX(-6px); } to { opacity: 1; transform: none; } }
  @media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation: none !important; transition: none !important; } }
`;

/* ---------- main component ---------- */
export default function ExpenseTracker() {
  const [income, setIncome] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [accounts, setAccounts] = useState(DEFAULT_ACCOUNTS);
  const [loaded, setLoaded] = useState(false);
  const [toast, setToast] = useState("");
  const toastTimer = useRef(null);

  const [incForm, setIncForm] = useState({ date: today(), source: "", amount: "" });
  const [expForm, setExpForm] = useState({ date: today(), category: "", subcategory: "", account: "", amount: "" });
  const [accForm, setAccForm] = useState({ type: "", name: "", starting: "" });
  const [showAccForm, setShowAccForm] = useState(false);

  const [filterCat, setFilterCat] = useState("All");
  const [filterSub, setFilterSub] = useState("All");
  const [filterAcct, setFilterAcct] = useState("All");
  const [filterMonth, setFilterMonth] = useState("All");
  const [activeSlice, setActiveSlice] = useState(null);

  /* load from localStorage on mount */
  useEffect(() => {
    const data = storage.load();
    if (data) {
      setIncome(data.income || []);
      setExpenses(data.expenses || []);
      setAccounts(data.accounts?.length ? data.accounts : DEFAULT_ACCOUNTS);
    }
    setLoaded(true);
  }, []);

  const ping = (msg) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 1800);
  };

  const update = (i, e, a) => {
    setIncome(i); setExpenses(e); setAccounts(a);
    const ok = storage.save({ income: i, expenses: e, accounts: a });
    ping(ok ? "Saved" : "Couldn't save — kept for this session");
  };

  const totalIncome  = useMemo(() => income.reduce((s, r) => s + Number(r.amount || 0), 0), [income]);
  const totalExpenses = useMemo(() => expenses.reduce((s, r) => s + Number(r.amount || 0), 0), [expenses]);
  const net = totalIncome - totalExpenses;

  const balances = useMemo(() => {
    const spent = {};
    expenses.forEach((e) => { spent[e.account] = (spent[e.account] || 0) + Number(e.amount || 0); });
    return accounts.map((a) => ({ ...a, balance: Number(a.starting || 0) - (spent[a.name] || 0) }));
  }, [accounts, expenses]);

  const months = useMemo(() => {
    const s = new Set(expenses.map((e) => (e.date || "").slice(0, 7)).filter(Boolean));
    return Array.from(s).sort().reverse();
  }, [expenses]);

  const filteredExpenses = useMemo(() =>
    expenses
      .filter((e) => filterCat === "All" || e.category === filterCat)
      .filter((e) => filterSub === "All" || e.subcategory === filterSub)
      .filter((e) => filterAcct === "All" || e.account === filterAcct)
      .filter((e) => filterMonth === "All" || (e.date || "").startsWith(filterMonth))
      .sort((a, b) => (b.date || "").localeCompare(a.date || "")),
  [expenses, filterCat, filterSub, filterAcct, filterMonth]);

  const filteredTotal = filteredExpenses.reduce((s, r) => s + Number(r.amount || 0), 0);
  const filterActive = filterCat !== "All" || filterSub !== "All" || filterAcct !== "All" || filterMonth !== "All";

  const chartData = useMemo(() => {
    const byCat = {};
    expenses
      .filter((e) => filterAcct === "All" || e.account === filterAcct)
      .filter((e) => filterMonth === "All" || (e.date || "").startsWith(filterMonth))
      .forEach((e) => { byCat[e.category] = (byCat[e.category] || 0) + Number(e.amount || 0); });
    return Object.entries(byCat).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [expenses, filterAcct, filterMonth]);
  const chartTotal = chartData.reduce((s, d) => s + d.value, 0);

  const monthlyData = useMemo(() => {
    const byMonth = {};
    expenses.forEach((e) => {
      const m = (e.date || "").slice(0, 7);
      if (m) byMonth[m] = (byMonth[m] || 0) + Number(e.amount || 0);
    });
    return Object.entries(byMonth).sort((a, b) => a[0].localeCompare(b[0])).slice(-12)
      .map(([m, v]) => ({ month: m.slice(5) + "/" + m.slice(2, 4), spent: v }));
  }, [expenses]);

  const addIncome = () => {
    if (!incForm.source || !incForm.amount) { ping("Pick a source and amount first"); return; }
    update([...income, { id: uid(), ...incForm, amount: Number(incForm.amount) }], expenses, accounts);
    setIncForm({ date: today(), source: "", amount: "" });
  };
  const addExpense = () => {
    if (!expForm.category || !expForm.amount) { ping("Pick a category and amount first"); return; }
    update(income, [...expenses, { id: uid(), ...expForm, amount: Number(expForm.amount) }], accounts);
    setExpForm({ date: today(), category: "", subcategory: "", account: "", amount: "" });
  };
  const addAccount = () => {
    if (!accForm.name || !accForm.type) { ping("Account needs a type and a name"); return; }
    update(income, expenses, [...accounts, { id: uid(), ...accForm, starting: Number(accForm.starting || 0) }]);
    setAccForm({ type: "", name: "", starting: "" });
    setShowAccForm(false);
  };
  const delIncome  = (id) => update(income.filter((r) => r.id !== id), expenses, accounts);
  const delExpense = (id) => update(income, expenses.filter((r) => r.id !== id), accounts);
  const delAccount = (id) => update(income, expenses, accounts.filter((r) => r.id !== id));
  const resetAll   = () => { if (window.confirm("Delete all entries and start fresh?")) update([], [], DEFAULT_ACCOUNTS); };

  const clickSlice = useCallback((data) => {
    setFilterCat((c) => (c === data.name ? "All" : data.name));
    setFilterSub("All");
  }, []);
  const clearFilters = () => { setFilterCat("All"); setFilterSub("All"); setFilterAcct("All"); setFilterMonth("All"); };

  const incomeCols  = "0.95fr 1.3fr 0.9fr 24px";
  const expenseCols = "0.85fr 1.2fr 1.1fr 1fr 0.8fr 24px";
  const accountCols = "1fr 1.2fr 0.9fr 1fr 24px";

  if (!loaded) return (
    <div className="app flex items-center justify-center" style={{ minHeight: "100vh", color: "#5EEAD4", fontWeight: 600 }}>
      <style>{css}</style>
      Loading your tracker…
    </div>
  );

  return (
    <div className="app p-4 md:p-8">
      <style>{css}</style>
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-end justify-between flex-wrap gap-3 mb-7">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
              Expense <span style={{ color: "var(--mint)" }}>Tracker</span>
            </h1>
            <p style={{ color: "var(--ink-faint)" }} className="text-sm mt-1">
              {expenses.length} expense{expenses.length === 1 ? "" : "s"} · {income.length} income entr{income.length === 1 ? "y" : "ies"} · {accounts.length} accounts
            </p>
          </div>
          <button className="ghost-btn" onClick={resetAll}>Reset all data</button>
        </div>

        {/* KPIs */}
        <div className="flex flex-wrap gap-4 mb-7">
          <Kpi label="Total Income"    value={totalIncome}    tone="mint"                         caption="All sources"              delay={0}   />
          <Kpi label="Total Expenses"  value={totalExpenses}  tone="coral"                        caption="All categories"           delay={80}  />
          <Kpi label="Net Balance"     value={net}            tone={net < 0 ? "coral-neg" : "gold"} caption={net < 0 ? "Spending exceeds income" : "Income minus expenses"} delay={160} />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

          {/* LEFT: Income + Accounts */}
          <div className="space-y-5">

            {/* Income */}
            <div className="panel" style={{ animationDelay: "120ms" }}>
              <div className="panel-head"><span className="panel-title">Income</span></div>
              <div className="grid-head" style={{ gridTemplateColumns: incomeCols }}>
                <span>Date</span><span>Source</span><span>Amount</span><span></span>
              </div>
              <div className="row" style={{ gridTemplateColumns: incomeCols, background: "rgba(45,212,191,.04)" }}>
                <input type="date" className="field" value={incForm.date}
                  onChange={(e) => setIncForm({ ...incForm, date: e.target.value })} />
                <select className="field" value={incForm.source}
                  onChange={(e) => setIncForm({ ...incForm, source: e.target.value })}>
                  <option value="">Source…</option>
                  {INCOME_SOURCES.map((s) => <option key={s}>{s}</option>)}
                </select>
                <input type="number" className="field" placeholder="0.00" value={incForm.amount}
                  onChange={(e) => setIncForm({ ...incForm, amount: e.target.value })}
                  onKeyDown={(e) => e.key === "Enter" && addIncome()} />
                <button className="add-btn" title="Add income" onClick={addIncome}>+</button>
              </div>
              <div style={{ maxHeight: 260, overflowY: "auto" }}>
                {income.length === 0 && <p className="empty">No income yet — your first entry goes above.</p>}
                {income.slice().sort((a, b) => (b.date || "").localeCompare(a.date || "")).map((r) => (
                  <div key={r.id} className="row" style={{ gridTemplateColumns: incomeCols }}>
                    <span style={{ color: "var(--ink-dim)" }}>{r.date}</span>
                    <span className="truncate">{r.source}</span>
                    <span style={{ color: "var(--mint-soft)", fontWeight: 600 }}>{fmt(Number(r.amount))}</span>
                    <button className="del" onClick={() => delIncome(r.id)}>×</button>
                  </div>
                ))}
              </div>
            </div>

            {/* Accounts */}
            <div className="panel" style={{ animationDelay: "200ms" }}>
              <div className="panel-head">
                <span className="panel-title">Accounts</span>
                <button className="chip" onClick={() => setShowAccForm(!showAccForm)}>
                  {showAccForm ? "Close" : "+ Add account"}
                </button>
              </div>
              {showAccForm && (
                <div className="row" style={{ gridTemplateColumns: accountCols, background: "rgba(45,212,191,.04)" }}>
                  <select className="field" value={accForm.type}
                    onChange={(e) => setAccForm({ ...accForm, type: e.target.value })}>
                    <option value="">Type…</option>
                    {ACCOUNT_TYPES.map((t) => <option key={t}>{t}</option>)}
                  </select>
                  <input className="field" placeholder="Name" value={accForm.name}
                    onChange={(e) => setAccForm({ ...accForm, name: e.target.value })} />
                  <input type="number" className="field" placeholder="Starting $" value={accForm.starting}
                    onChange={(e) => setAccForm({ ...accForm, starting: e.target.value })}
                    onKeyDown={(e) => e.key === "Enter" && addAccount()} />
                  <span />
                  <button className="add-btn" onClick={addAccount}>+</button>
                </div>
              )}
              <div className="grid-head" style={{ gridTemplateColumns: accountCols }}>
                <span>Type</span><span>Account</span><span>Start</span><span>Balance</span><span></span>
              </div>
              {balances.map((a) => (
                <div key={a.id} className="row" style={{ gridTemplateColumns: accountCols }}>
                  <span style={{ color: "var(--ink-dim)" }} className="truncate">{a.type}</span>
                  <span className="truncate font-semibold">{a.name}</span>
                  <span style={{ color: "var(--ink-dim)" }}>{fmt(Number(a.starting))}</span>
                  <span style={{ color: a.balance < 0 ? "var(--coral)" : "var(--mint-soft)", fontWeight: 700 }}>
                    {fmt(a.balance)}
                  </span>
                  <button className="del" onClick={() => delAccount(a.id)}>×</button>
                </div>
              ))}
              <p style={{ color: "var(--ink-faint)" }} className="text-xs px-4 py-3">
                Balance = starting amount − expenses charged to that account.
              </p>
            </div>
          </div>

          {/* RIGHT: Expenses + Charts */}
          <div className="xl:col-span-2 space-y-5">

            {/* Expenses */}
            <div className="panel" style={{ animationDelay: "160ms" }}>
              <div className="panel-head">
                <span className="panel-title">Expenses</span>
                {filterActive && <button className="chip on" onClick={clearFilters}>Clear filters ×</button>}
              </div>

              {/* Filters */}
              <div className="flex flex-wrap gap-2 items-center px-4 py-3"
                style={{ borderBottom: "1px solid var(--line)" }}>
                <span className="text-xs font-bold" style={{ color: "var(--ink-dim)", letterSpacing: ".1em" }}>FILTER</span>
                <select className="field" style={{ width: "auto" }} value={filterCat}
                  onChange={(e) => { setFilterCat(e.target.value); setFilterSub("All"); }}>
                  <option value="All">All categories</option>
                  {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
                <select className="field" style={{ width: "auto" }} value={filterSub}
                  disabled={filterCat === "All"}
                  onChange={(e) => setFilterSub(e.target.value)}>
                  <option value="All">All subcategories</option>
                  {(SUBCATS[filterCat] || []).map((s) => <option key={s}>{s}</option>)}
                </select>
                <select className="field" style={{ width: "auto" }} value={filterAcct}
                  onChange={(e) => setFilterAcct(e.target.value)}>
                  <option value="All">All accounts</option>
                  {accounts.map((a) => <option key={a.id}>{a.name}</option>)}
                </select>
                <select className="field" style={{ width: "auto" }} value={filterMonth}
                  onChange={(e) => setFilterMonth(e.target.value)}>
                  <option value="All">All months</option>
                  {months.map((m) => <option key={m}>{m}</option>)}
                </select>
              </div>

              <div className="grid-head" style={{ gridTemplateColumns: expenseCols }}>
                <span>Date</span><span>Category</span><span>Subcategory</span><span>Account</span><span>Amount</span><span></span>
              </div>
              <div className="row" style={{ gridTemplateColumns: expenseCols, background: "rgba(45,212,191,.04)" }}>
                <input type="date" className="field" value={expForm.date}
                  onChange={(e) => setExpForm({ ...expForm, date: e.target.value })} />
                <select className="field" value={expForm.category}
                  onChange={(e) => setExpForm({ ...expForm, category: e.target.value, subcategory: "" })}>
                  <option value="">Category…</option>
                  {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
                <select className="field" value={expForm.subcategory} disabled={!expForm.category}
                  onChange={(e) => setExpForm({ ...expForm, subcategory: e.target.value })}>
                  <option value="">{expForm.category ? "Subcategory…" : "Pick category"}</option>
                  {(SUBCATS[expForm.category] || []).map((s) => <option key={s}>{s}</option>)}
                </select>
                <select className="field" value={expForm.account}
                  onChange={(e) => setExpForm({ ...expForm, account: e.target.value })}>
                  <option value="">Account…</option>
                  {accounts.map((a) => <option key={a.id}>{a.name}</option>)}
                </select>
                <input type="number" className="field" placeholder="0.00" value={expForm.amount}
                  onChange={(e) => setExpForm({ ...expForm, amount: e.target.value })}
                  onKeyDown={(e) => e.key === "Enter" && addExpense()} />
                <button className="add-btn" onClick={addExpense}>+</button>
              </div>

              <div style={{ maxHeight: 340, overflowY: "auto" }}>
                {filteredExpenses.length === 0 && (
                  <p className="empty">
                    {expenses.length === 0 ? "No expenses yet — add your first one above." : "Nothing matches these filters."}
                  </p>
                )}
                {filteredExpenses.map((r) => (
                  <div key={r.id} className="row" style={{ gridTemplateColumns: expenseCols }}>
                    <span style={{ color: "var(--ink-dim)" }}>{r.date}</span>
                    <span className="truncate">{r.category}</span>
                    <span className="truncate" style={{ color: "var(--ink-dim)" }}>{r.subcategory}</span>
                    <span className="truncate" style={{ color: "var(--ink-dim)" }}>{r.account}</span>
                    <span style={{ color: "var(--coral)", fontWeight: 600 }}>{fmt(Number(r.amount))}</span>
                    <button className="del" onClick={() => delExpense(r.id)}>×</button>
                  </div>
                ))}
              </div>
              <div className="total-bar">
                <span>{filterActive ? "Filtered total" : "Total"} · {filteredExpenses.length} {filteredExpenses.length === 1 ? "entry" : "entries"}</span>
                <span>{fmt(filteredTotal)}</span>
              </div>
            </div>

            {/* Charts */}
            {chartData.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="panel" style={{ animationDelay: "240ms" }}>
                  <div className="panel-head">
                    <span className="panel-title">Spending by category</span>
                    <span className="text-xs" style={{ color: "var(--ink-faint)" }}>click a slice to filter</span>
                  </div>
                  <div className="relative" style={{ height: 230 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={chartData} dataKey="value" nameKey="name"
                          innerRadius={62} outerRadius={92} paddingAngle={2} stroke="none"
                          activeIndex={activeSlice} activeShape={ActiveSlice}
                          onMouseEnter={(_, i) => setActiveSlice(i)}
                          onMouseLeave={() => setActiveSlice(null)}
                          onClick={(d) => clickSlice(d)}
                          style={{ cursor: "pointer" }}>
                          {chartData.map((d, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]}
                              opacity={filterCat !== "All" && d.name !== filterCat ? 0.25 : 1} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      {activeSlice !== null && chartData[activeSlice] ? (
                        <>
                          <span className="text-xs" style={{ color: "var(--ink-dim)", maxWidth: 110, textAlign: "center" }}>
                            {chartData[activeSlice].name}
                          </span>
                          <span className="text-lg font-extrabold" style={{ color: "var(--mint-soft)" }}>
                            {fmt(chartData[activeSlice].value)}
                          </span>
                          <span className="text-xs" style={{ color: "var(--ink-faint)" }}>
                            {((chartData[activeSlice].value / chartTotal) * 100).toFixed(1)}%
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="text-xs" style={{ color: "var(--ink-dim)" }}>Total</span>
                          <span className="text-lg font-extrabold">{fmt(chartTotal)}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="px-3 pb-3 space-y-0.5" style={{ maxHeight: 170, overflowY: "auto" }}>
                    {chartData.map((d, i) => (
                      <div key={d.name} className={`legend-row ${filterCat === d.name ? "on" : ""}`}
                        onClick={() => clickSlice(d)}
                        onMouseEnter={() => setActiveSlice(i)}
                        onMouseLeave={() => setActiveSlice(null)}>
                        <span className="flex items-center gap-2 truncate">
                          <span style={{ width: 10, height: 10, borderRadius: 99, background: PIE_COLORS[i % PIE_COLORS.length], flex: "none" }} />
                          <span className="truncate">{d.name}</span>
                        </span>
                        <span style={{ fontVariantNumeric: "tabular-nums" }}>
                          {fmt(d.value)}{" "}
                          <span style={{ color: "var(--ink-faint)", fontSize: 11 }}>
                            {((d.value / chartTotal) * 100).toFixed(0)}%
                          </span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="panel" style={{ animationDelay: "300ms" }}>
                  <div className="panel-head"><span className="panel-title">Monthly spending</span></div>
                  <div style={{ height: 230, padding: "16px 10px 4px" }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={monthlyData} barCategoryGap="30%">
                        <XAxis dataKey="month" tick={{ fill: "#8FB0A8", fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: "#54716B", fontSize: 10 }} axisLine={false} tickLine={false}
                          tickFormatter={(v) => "$" + (v >= 1000 ? (v / 1000).toFixed(1) + "k" : v)} width={44} />
                        <Tooltip cursor={{ fill: "rgba(45,212,191,.06)" }}
                          contentStyle={{ background: "#162825", border: "1px solid #1E3531", borderRadius: 12, color: "#E8F4F0" }}
                          formatter={(v) => [fmt(v), "Spent"]} />
                        <Bar dataKey="spent" radius={[6, 6, 0, 0]} fill="#2DD4BF" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <p style={{ color: "var(--ink-faint)" }} className="text-xs px-4 pb-3">Last 12 months with activity.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <p className="text-xs text-center mt-7" style={{ color: "var(--ink-faint)" }}>
          Data is saved in your browser's local storage — it stays on this device.
        </p>
      </div>
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
