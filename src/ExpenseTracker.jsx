import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { PieChart, Pie, Cell, Sector, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";

const DEFAULT_SUBCATS = {
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

/* ---------- localStorage ---------- */
const storage = {
  load() {
    try { const r = localStorage.getItem(STORAGE_KEY); return r ? JSON.parse(r) : null; }
    catch { return null; }
  },
  save(data) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); return true; }
    catch { return false; }
  },
};

/* ---------- animated number ---------- */
function useCountUp(target, duration = 700) {
  const [display, setDisplay] = useState(target);
  const prev = useRef(target);
  useEffect(() => {
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced) { setDisplay(target); prev.current = target; return; }
    const from = prev.current; prev.current = target;
    if (from === target) return;
    let raf; const t0 = performance.now();
    const tick = (t) => {
      const p = Math.min((t - t0) / duration, 1);
      setDisplay(from + (target - from) * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return display;
}

/* ---------- donut active segment ---------- */
const ActiveSlice = ({ cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill }) => (
  <g>
    <Sector cx={cx} cy={cy} innerRadius={innerRadius - 2} outerRadius={outerRadius + 8}
      startAngle={startAngle} endAngle={endAngle} fill={fill}
      style={{ filter: `drop-shadow(0 0 10px ${fill}66)` }} />
  </g>
);

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
    --bg:#0A1413; --surface:#101D1B; --surface2:#162825; --line:#1E3531;
    --ink:#E8F4F0; --ink-dim:#8FB0A8; --ink-faint:#54716B;
    --mint:#2DD4BF; --mint-soft:#5EEAD4; --coral:#FB7185; --gold:#FBBF24;
  }
  .app {
    background:
      radial-gradient(1100px 500px at 80% -10%, rgba(45,212,191,.07), transparent 60%),
      radial-gradient(800px 400px at -10% 110%, rgba(251,113,133,.05), transparent 60%),
      var(--bg);
    color:var(--ink); min-height:100vh;
    font-family:'Segoe UI',system-ui,-apple-system,sans-serif;
  }
  .panel { background:var(--surface); border:1px solid var(--line); border-radius:16px; overflow:hidden; animation:rise .5s cubic-bezier(.2,.8,.2,1) both; }
  .panel-head { display:flex; align-items:center; justify-content:space-between; gap:8px; padding:14px 18px; border-bottom:1px solid var(--line); background:linear-gradient(180deg,rgba(45,212,191,.06),transparent); }
  .panel-title { font-weight:700; letter-spacing:.06em; text-transform:uppercase; font-size:12px; color:var(--mint-soft); }
  .kpi { position:relative; flex:1; min-width:170px; background:var(--surface); border:1px solid var(--line); border-radius:16px; padding:18px 20px 22px; overflow:hidden; animation:rise .5s cubic-bezier(.2,.8,.2,1) both; transition:transform .25s,border-color .25s,box-shadow .25s; }
  .kpi:hover { transform:translateY(-3px); border-color:rgba(45,212,191,.35); box-shadow:0 12px 30px -12px rgba(0,0,0,.6); }
  .kpi-label { font-size:11px; letter-spacing:.12em; text-transform:uppercase; color:var(--ink-dim); margin-bottom:6px; }
  .kpi-value { font-size:30px; font-weight:800; font-variant-numeric:tabular-nums; letter-spacing:-.01em; }
  .kpi-caption { font-size:11px; color:var(--ink-faint); margin-top:4px; }
  .kpi-bar { position:absolute; left:0; right:0; bottom:0; height:3px; opacity:.9; }
  .tone-mint .kpi-value{color:var(--mint-soft);} .tone-mint .kpi-bar{background:linear-gradient(90deg,var(--mint),transparent);}
  .tone-coral .kpi-value{color:var(--coral);} .tone-coral .kpi-bar{background:linear-gradient(90deg,var(--coral),transparent);}
  .tone-gold .kpi-value{color:var(--gold);} .tone-gold .kpi-bar{background:linear-gradient(90deg,var(--gold),transparent);}
  .tone-coral-neg .kpi-value{color:var(--coral);} .tone-coral-neg .kpi-bar{background:linear-gradient(90deg,var(--coral),transparent);}
  .field { background:var(--surface2); color:var(--ink); border:1px solid var(--line); border-radius:999px; padding:7px 14px; font-size:13px; width:100%; transition:border-color .2s,box-shadow .2s; }
  .field:focus { outline:none; border-color:var(--mint); box-shadow:0 0 0 3px rgba(45,212,191,.15); }
  .field:disabled { opacity:.4; cursor:not-allowed; }
  select.field { cursor:pointer; appearance:none; }
  select.field option { background:var(--surface2); color:var(--ink); }
  input.field::placeholder { color:var(--ink-faint); }
  input[type=date].field { color-scheme:dark; }
  .add-btn { width:30px; height:30px; border-radius:999px; background:var(--mint); color:#06302B; font-weight:800; font-size:16px; display:flex; align-items:center; justify-content:center; border:none; cursor:pointer; flex:none; transition:transform .15s,box-shadow .2s,background .2s; }
  .add-btn:hover { transform:scale(1.12); box-shadow:0 0 16px rgba(45,212,191,.45); background:var(--mint-soft); }
  .add-btn:active { transform:scale(.95); }
  .row { display:grid; gap:8px; align-items:center; padding:9px 18px; font-size:13px; animation:rowIn .3s ease both; transition:background .15s; }
  .row:nth-child(odd){background:rgba(255,255,255,.015);}
  .row:hover{background:rgba(45,212,191,.06);}
  .row .del { opacity:0; color:var(--ink-faint); background:none; border:none; cursor:pointer; font-size:15px; transition:opacity .15s,color .15s,transform .15s; }
  .row:hover .del{opacity:1;}
  .del:hover{color:var(--coral);transform:scale(1.25);}
  .grid-head { display:grid; gap:8px; padding:9px 18px; font-size:11px; letter-spacing:.1em; text-transform:uppercase; color:var(--ink-dim); background:var(--surface2); border-bottom:1px solid var(--line); }
  .chip { border:1px solid var(--line); background:var(--surface2); color:var(--ink-dim); border-radius:999px; padding:5px 12px; font-size:12px; cursor:pointer; transition:all .2s; white-space:nowrap; }
  .chip:hover{border-color:var(--mint);color:var(--mint-soft);}
  .chip.on{background:rgba(45,212,191,.14);border-color:var(--mint);color:var(--mint-soft);font-weight:600;}
  .legend-row { display:flex; align-items:center; justify-content:space-between; padding:6px 10px; border-radius:10px; cursor:pointer; transition:background .15s,transform .15s; font-size:13px; }
  .legend-row:hover{background:rgba(45,212,191,.08);transform:translateX(3px);}
  .legend-row.on{background:rgba(45,212,191,.12);outline:1px solid rgba(45,212,191,.3);}
  .toast { position:fixed; bottom:22px; left:50%; transform:translateX(-50%); background:var(--surface2); border:1px solid var(--mint); color:var(--mint-soft); padding:9px 20px; border-radius:999px; font-size:13px; box-shadow:0 10px 30px rgba(0,0,0,.5); animation:rise .3s ease both; z-index:50; }
  .ghost-btn { background:none; border:1px solid var(--line); color:var(--ink-dim); border-radius:999px; padding:5px 14px; font-size:12px; cursor:pointer; transition:all .2s; }
  .ghost-btn:hover{border-color:var(--coral);color:var(--coral);}
  .empty{color:var(--ink-faint);font-size:13px;text-align:center;padding:26px 10px;}
  .total-bar{display:flex;justify-content:space-between;padding:11px 18px;font-size:13px;font-weight:700;background:var(--surface2);border-top:1px solid var(--line);color:var(--mint-soft);}
  /* category manager */
  .cat-item { display:flex; align-items:flex-start; gap:10px; padding:12px 16px; border-radius:12px; border:1px solid var(--line); background:var(--surface2); transition:border-color .2s,background .2s; }
  .cat-item:hover{border-color:rgba(45,212,191,.3);background:rgba(45,212,191,.04);}
  .cat-item.editing{border-color:var(--mint);background:rgba(45,212,191,.06);}
  .sub-tag { display:inline-flex; align-items:center; gap:5px; background:rgba(45,212,191,.1); border:1px solid rgba(45,212,191,.2); color:var(--mint-soft); border-radius:999px; padding:3px 10px; font-size:11px; transition:all .15s; }
  .sub-tag:hover{background:rgba(251,113,133,.15);border-color:rgba(251,113,133,.3);color:var(--coral);}
  .sub-tag .xtag{background:none;border:none;color:inherit;cursor:pointer;font-size:12px;padding:0;line-height:1;}
  .icon-btn{background:none;border:none;cursor:pointer;padding:4px;border-radius:6px;transition:background .15s,color .15s;color:var(--ink-faint);}
  .icon-btn:hover{background:rgba(45,212,191,.1);color:var(--mint-soft);}
  .icon-btn.danger:hover{background:rgba(251,113,133,.1);color:var(--coral);}
  .inline-field{background:var(--surface);color:var(--ink);border:1px solid var(--mint);border-radius:8px;padding:5px 10px;font-size:13px;width:100%;transition:box-shadow .2s;}
  .inline-field:focus{outline:none;box-shadow:0 0 0 3px rgba(45,212,191,.15);}
  .panel-head { cursor:pointer; user-select:none; }
  .collapse-btn { background:none; border:none; color:var(--ink-faint); cursor:pointer; padding:2px 6px; border-radius:6px; font-size:13px; line-height:1; transition:color .15s,transform .2s; flex:none; }
  .collapse-btn:hover { color:var(--mint-soft); }
  .collapse-btn.open { transform:rotate(0deg); }
  .collapse-btn.closed { transform:rotate(-90deg); }
  .panel-body { overflow:hidden; transition:max-height .3s cubic-bezier(.4,0,.2,1), opacity .25s ease; }
  .panel-body.open { max-height:2000px; opacity:1; }
  .panel-body.closed { max-height:0; opacity:0; pointer-events:none; }
  @keyframes rise{from{opacity:0;transform:translateY(14px);}to{opacity:1;transform:none;}}
  @keyframes rowIn{from{opacity:0;transform:translateX(-6px);}to{opacity:1;transform:none;}}
  @media(prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important;}}
`;

/* ---------- collapsible panel ---------- */
function usePanel(defaultOpen = true) {
  const [open, setOpen] = useState(defaultOpen);
  return { open, toggle: () => setOpen((o) => !o) };
}

function Panel({ title, open, toggle, right, delay, children }) {
  return (
    <div className="panel" style={{ animationDelay: delay || "0ms" }}>
      <div className="panel-head" onClick={toggle} style={{ cursor: "pointer" }}>
        <span className="panel-title">{title}</span>
        <span className="flex items-center gap-2">
          {right && <span onClick={(e) => e.stopPropagation()}>{right}</span>}
          <button className={`collapse-btn ${open ? "open" : "closed"}`}
            onClick={(e) => { e.stopPropagation(); toggle(); }}
            title={open ? "Collapse" : "Expand"}>▼</button>
        </span>
      </div>
      <div className={`panel-body ${open ? "open" : "closed"}`}>{children}</div>
    </div>
  );
}

/* ============================
   CATEGORY MANAGER PANEL
   ============================ */
function CategoryManager({ subcats, onChange, ping }) {
  const [editingCat, setEditingCat] = useState(null);   // cat name being renamed
  const [editName, setEditName] = useState("");
  const [newSubInput, setNewSubInput] = useState({});   // { catName: "text" }
  const [newCatName, setNewCatName] = useState("");
  const [newCatSubs, setNewCatSubs] = useState("");

  const categories = Object.keys(subcats);

  const renameCat = (oldName) => {
    if (!editName.trim() || editName === oldName) { setEditingCat(null); return; }
    if (subcats[editName.trim()]) { ping("That category already exists"); return; }
    const next = {};
    Object.entries(subcats).forEach(([k, v]) => { next[k === oldName ? editName.trim() : k] = v; });
    onChange(next);
    setEditingCat(null);
    ping(`Renamed to "${editName.trim()}"`);
  };

  const deleteCat = (name) => {
    if (!window.confirm(`Delete "${name}"? Expenses logged under it will show as Uncategorized.`)) return;
    const next = { ...subcats };
    delete next[name];
    onChange(next);
    ping(`Deleted "${name}"`);
  };

  const addSub = (cat) => {
    const val = (newSubInput[cat] || "").trim();
    if (!val) return;
    if (subcats[cat].includes(val)) { ping("Subcategory already exists"); return; }
    onChange({ ...subcats, [cat]: [...subcats[cat], val] });
    setNewSubInput((s) => ({ ...s, [cat]: "" }));
  };

  const deleteSub = (cat, sub) => {
    onChange({ ...subcats, [cat]: subcats[cat].filter((s) => s !== sub) });
  };

  const addCategory = () => {
    const name = newCatName.trim();
    if (!name) { ping("Enter a category name"); return; }
    if (subcats[name]) { ping("Category already exists"); return; }
    const subs = newCatSubs.split(",").map((s) => s.trim()).filter(Boolean);
    onChange({ ...subcats, [name]: subs });
    setNewCatName(""); setNewCatSubs("");
    ping(`Added "${name}"`);
  };

  return (
    <div className="panel" style={{ animationDelay: "280ms" }}>
      <div className="panel-head">
        <span className="panel-title">Manage Categories</span>
        <span className="text-xs" style={{ color: "var(--ink-faint)" }}>{categories.length} categories</span>
      </div>

      {/* Add new category */}
      <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--line)", background: "rgba(45,212,191,.03)" }}>
        <p className="text-xs font-semibold mb-2" style={{ color: "var(--ink-dim)", letterSpacing: ".08em", textTransform: "uppercase" }}>Add new category</p>
        <div className="flex gap-2 mb-2">
          <input className="field" placeholder="Category name" value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addCategory()} />
          <button className="add-btn" onClick={addCategory} title="Add category">+</button>
        </div>
        <input className="field" placeholder="Subcategories, comma separated (optional)" value={newCatSubs}
          onChange={(e) => setNewCatSubs(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addCategory()} />
      </div>

      {/* Category list */}
      <div style={{ maxHeight: 480, overflowY: "auto", padding: "12px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
        {categories.map((cat) => (
          <div key={cat} className={`cat-item ${editingCat === cat ? "editing" : ""}`}>
            <div style={{ flex: 1, minWidth: 0 }}>
              {/* Category name row */}
              <div className="flex items-center gap-2 mb-2">
                {editingCat === cat ? (
                  <div className="flex gap-2 items-center flex-1">
                    <input className="inline-field" value={editName}
                      autoFocus
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") renameCat(cat); if (e.key === "Escape") setEditingCat(null); }} />
                    <button className="icon-btn" title="Save" onClick={() => renameCat(cat)}>✓</button>
                    <button className="icon-btn" title="Cancel" onClick={() => setEditingCat(null)}>✕</button>
                  </div>
                ) : (
                  <>
                    <span className="font-semibold text-sm flex-1">{cat}</span>
                    <button className="icon-btn" title="Rename category"
                      onClick={() => { setEditingCat(cat); setEditName(cat); }}>✏️</button>
                    <button className="icon-btn danger" title="Delete category"
                      onClick={() => deleteCat(cat)}>🗑️</button>
                  </>
                )}
              </div>

              {/* Subcategory tags */}
              <div className="flex flex-wrap gap-1.5 mb-2">
                {subcats[cat].length === 0 && (
                  <span style={{ color: "var(--ink-faint)", fontSize: 12 }}>No subcategories</span>
                )}
                {subcats[cat].map((sub) => (
                  <span key={sub} className="sub-tag" title={`Remove "${sub}"`}
                    onClick={() => deleteSub(cat, sub)}>
                    {sub}
                    <button className="xtag">×</button>
                  </span>
                ))}
              </div>

              {/* Add subcategory input */}
              <div className="flex gap-2">
                <input className="inline-field" placeholder="Add subcategory…"
                  value={newSubInput[cat] || ""}
                  onChange={(e) => setNewSubInput((s) => ({ ...s, [cat]: e.target.value }))}
                  onKeyDown={(e) => e.key === "Enter" && addSub(cat)} />
                <button className="add-btn" style={{ width: 26, height: 26, fontSize: 14 }}
                  onClick={() => addSub(cat)} title="Add subcategory">+</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================
   MAIN APP
   ============================ */
export default function ExpenseTracker() {
  const [income, setIncome] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [accounts, setAccounts] = useState(DEFAULT_ACCOUNTS);
  const [subcats, setSubcats] = useState(DEFAULT_SUBCATS);
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
  const [incMonth, setIncMonth] = useState("All");
  const [accMonth, setAccMonth] = useState("All");

  const pIncome   = usePanel(true);
  const pAccounts = usePanel(true);
  const pCats     = usePanel(true);
  const pExpenses = usePanel(true);
  const pCharts   = usePanel(true);

  /* load on mount */
  useEffect(() => {
    const data = storage.load();
    if (data) {
      setIncome(data.income || []);
      setExpenses(data.expenses || []);
      setAccounts(data.accounts?.length ? data.accounts : DEFAULT_ACCOUNTS);
      setSubcats(data.subcats && Object.keys(data.subcats).length ? data.subcats : DEFAULT_SUBCATS);
    }
    setLoaded(true);
  }, []);

  const ping = (msg) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 1800);
  };

  const persist = (i, e, a, s) => {
    const ok = storage.save({ income: i, expenses: e, accounts: a, subcats: s });
    ping(ok ? "Saved" : "Couldn't save — kept for this session");
  };

  const update = (i, e, a, s = subcats) => {
    setIncome(i); setExpenses(e); setAccounts(a); setSubcats(s);
    persist(i, e, a, s);
  };

  const updateSubcats = (s) => {
    setSubcats(s);
    persist(income, expenses, accounts, s);
  };

  const categories = useMemo(() => Object.keys(subcats), [subcats]);

  const [kpiMonth, setKpiMonth] = useState("All");

  const months = useMemo(() => {
    const se = new Set(expenses.map((e) => (e.date || "").slice(0, 7)).filter(Boolean));
    const si = new Set(income.map((r) => (r.date || "").slice(0, 7)).filter(Boolean));
    return Array.from(new Set([...se, ...si])).sort().reverse();
  }, [expenses, income]);

  const kpiIncome = useMemo(() =>
    income.filter((r) => kpiMonth === "All" || (r.date || "").startsWith(kpiMonth))
          .reduce((s, r) => s + Number(r.amount || 0), 0),
  [income, kpiMonth]);

  const kpiExpenses = useMemo(() =>
    expenses.filter((e) => kpiMonth === "All" || (e.date || "").startsWith(kpiMonth))
            .reduce((s, r) => s + Number(r.amount || 0), 0),
  [expenses, kpiMonth]);

  const kpiNet = kpiIncome - kpiExpenses;

  const filteredIncome = useMemo(() =>
    income
      .filter((r) => incMonth === "All" || (r.date || "").startsWith(incMonth))
      .sort((a, b) => (b.date || "").localeCompare(a.date || "")),
  [income, incMonth]);
  const filteredIncomeTotal = filteredIncome.reduce((s, r) => s + Number(r.amount || 0), 0);

  const filteredBalances = useMemo(() => {
    const spent = {};
    expenses
      .filter((e) => accMonth === "All" || (e.date || "").startsWith(accMonth))
      .forEach((e) => { spent[e.account] = (spent[e.account] || 0) + Number(e.amount || 0); });
    return accounts.map((a) => ({ ...a, balance: Number(a.starting || 0) - (spent[a.name] || 0) }));
  }, [accounts, expenses, accMonth]);

  const totalIncome   = useMemo(() => income.reduce((s, r) => s + Number(r.amount || 0), 0), [income]);
  const totalExpenses = useMemo(() => expenses.reduce((s, r) => s + Number(r.amount || 0), 0), [expenses]);

  const balances = useMemo(() => {
    const spent = {};
    expenses.forEach((e) => { spent[e.account] = (spent[e.account] || 0) + Number(e.amount || 0); });
    return accounts.map((a) => ({ ...a, balance: Number(a.starting || 0) - (spent[a.name] || 0) }));
  }, [accounts, expenses]);

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
    setAccForm({ type: "", name: "", starting: "" }); setShowAccForm(false);
  };
  const delIncome  = (id) => update(income.filter((r) => r.id !== id), expenses, accounts);
  const delExpense = (id) => update(income, expenses.filter((r) => r.id !== id), accounts);
  const delAccount = (id) => update(income, expenses, accounts.filter((r) => r.id !== id));
  const resetAll   = () => {
    if (window.confirm("Delete all data and reset categories?"))
      update([], [], DEFAULT_ACCOUNTS, DEFAULT_SUBCATS);
  };

  const clickSlice = useCallback((data) => {
    setFilterCat((c) => (c === data.name ? "All" : data.name));
    setFilterSub("All");
  }, []);
  const clearFilters = () => { setFilterCat("All"); setFilterSub("All"); setFilterAcct("All"); setFilterMonth("All"); };

  /* reset subcategory if category changes and old sub no longer valid */
  useEffect(() => {
    if (expForm.subcategory && subcats[expForm.category] && !subcats[expForm.category].includes(expForm.subcategory))
      setExpForm((f) => ({ ...f, subcategory: "" }));
  }, [expForm.category, expForm.subcategory, subcats]);

  const incomeCols  = "0.95fr 1.3fr 0.9fr 24px";
  const expenseCols = "0.85fr 1.2fr 1.1fr 1fr 0.8fr 24px";
  const accountCols = "1fr 1.2fr 0.9fr 1fr 24px";

  const exportData = () => {
    const data = { income, expenses, accounts, subcats, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `expense-tracker-backup-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    ping("Data exported — save that file somewhere safe!");
  };

  const importData = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (!data.expenses && !data.income) { ping("Invalid file — doesn't look like a tracker backup"); return; }
        update(
          data.income   || [],
          data.expenses || [],
          data.accounts?.length ? data.accounts : DEFAULT_ACCOUNTS,
          data.subcats && Object.keys(data.subcats).length ? data.subcats : DEFAULT_SUBCATS
        );
        ping(`Imported: ${data.expenses?.length || 0} expenses, ${data.income?.length || 0} income entries`);
      } catch { ping("Couldn't read that file — make sure it's a tracker backup JSON"); }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  if (!loaded) return (
    <div className="app flex items-center justify-center" style={{ minHeight: "100vh", color: "#5EEAD4", fontWeight: 600 }}>
      <style>{css}</style>Loading your tracker…
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
              {expenses.length} expense{expenses.length === 1 ? "" : "s"} · {income.length} income entr{income.length === 1 ? "y" : "ies"} · {categories.length} categories
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button className="ghost-btn" style={{ borderColor: "rgba(45,212,191,.3)", color: "var(--mint-soft)" }}
              onClick={exportData} title="Download all your data as a JSON backup">
              ↓ Export data
            </button>
            <label className="ghost-btn" style={{ cursor: "pointer" }} title="Load a previously exported backup file">
              ↑ Import data
              <input type="file" accept=".json" style={{ display: "none" }} onChange={importData} />
            </label>
            <button className="ghost-btn" onClick={resetAll}>Reset all</button>
          </div>
        </div>

        {/* KPIs */}
        <div className="mb-7">
          <div className="flex items-center gap-3 mb-3 flex-wrap">
            <span className="text-xs font-bold" style={{ color: "var(--ink-dim)", letterSpacing: ".1em" }}>SHOWING</span>
            <div className="flex flex-wrap gap-2">
              <button className={`chip ${kpiMonth === "All" ? "on" : ""}`} onClick={() => setKpiMonth("All")}>All time</button>
              {months.map((m) => (
                <button key={m} className={`chip ${kpiMonth === m ? "on" : ""}`} onClick={() => setKpiMonth(m)}>
                  {new Date(m + "-02").toLocaleString("default", { month: "short", year: "numeric" })}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-4">
            <Kpi label="Total Income"   value={kpiIncome}   tone="mint"
              caption={kpiMonth === "All" ? "All time" : new Date(kpiMonth + "-02").toLocaleString("default", { month: "long", year: "numeric" })}
              delay={0} />
            <Kpi label="Total Expenses" value={kpiExpenses} tone="coral"
              caption={kpiMonth === "All" ? "All time" : new Date(kpiMonth + "-02").toLocaleString("default", { month: "long", year: "numeric" })}
              delay={80} />
            <Kpi label="Net Balance"    value={kpiNet}      tone={kpiNet < 0 ? "coral-neg" : "gold"}
              caption={kpiNet < 0 ? "Spending exceeds income" : "Income minus expenses"}
              delay={160} />
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

          {/* LEFT: Income + Accounts + Category Manager */}
          <div className="space-y-5">

            {/* Income */}
            <Panel title="Income" open={pIncome.open} toggle={pIncome.toggle} delay="120ms">
              {/* Month filter */}
              <div className="flex flex-wrap gap-1.5 px-4 py-2" style={{ borderBottom: "1px solid var(--line)" }}>
                <button className={`chip ${incMonth === "All" ? "on" : ""}`} onClick={() => setIncMonth("All")}>All</button>
                {months.map((m) => (
                  <button key={m} className={`chip ${incMonth === m ? "on" : ""}`} onClick={() => setIncMonth(m)}>
                    {new Date(m + "-02").toLocaleString("default", { month: "short", year: "2-digit" })}
                  </button>
                ))}
              </div>
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
                <button className="add-btn" onClick={addIncome} title="Add income">+</button>
              </div>
              <div style={{ maxHeight: 220, overflowY: "auto" }}>
                {filteredIncome.length === 0 && <p className="empty">{income.length === 0 ? "No income yet — add your first entry above." : "No income for this month."}</p>}
                {filteredIncome.map((r) => (
                  <div key={r.id} className="row" style={{ gridTemplateColumns: incomeCols }}>
                    <span style={{ color: "var(--ink-dim)" }}>{r.date}</span>
                    <span className="truncate">{r.source}</span>
                    <span style={{ color: "var(--mint-soft)", fontWeight: 600 }}>{fmt(Number(r.amount))}</span>
                    <button className="del" onClick={() => delIncome(r.id)}>×</button>
                  </div>
                ))}
              </div>
              <div className="total-bar">
                <span>{incMonth === "All" ? "All time" : new Date(incMonth + "-02").toLocaleString("default", { month: "long", year: "numeric" })} · {filteredIncome.length} entr{filteredIncome.length === 1 ? "y" : "ies"}</span>
                <span style={{ color: "var(--mint-soft)" }}>{fmt(filteredIncomeTotal)}</span>
              </div>
            </Panel>

            {/* Accounts */}
            <Panel title="Accounts" open={pAccounts.open} toggle={pAccounts.toggle} delay="200ms"
              right={<button className="chip" onClick={() => setShowAccForm(!showAccForm)}>{showAccForm ? "Close" : "+ Add"}</button>}>
              {/* Month filter */}
              <div className="flex flex-wrap gap-1.5 px-4 py-2" style={{ borderBottom: "1px solid var(--line)" }}>
                <button className={`chip ${accMonth === "All" ? "on" : ""}`} onClick={() => setAccMonth("All")}>All</button>
                {months.map((m) => (
                  <button key={m} className={`chip ${accMonth === m ? "on" : ""}`} onClick={() => setAccMonth(m)}>
                    {new Date(m + "-02").toLocaleString("default", { month: "short", year: "2-digit" })}
                  </button>
                ))}
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
                <span>Type</span><span>Account</span><span>Spent{accMonth !== "All" ? ` (${new Date(accMonth + "-02").toLocaleString("default", { month: "short" })})` : ""}</span><span>Balance</span><span></span>
              </div>
              {filteredBalances.map((a) => (
                <div key={a.id} className="row" style={{ gridTemplateColumns: accountCols }}>
                  <span style={{ color: "var(--ink-dim)" }} className="truncate">{a.type}</span>
                  <span className="truncate font-semibold">{a.name}</span>
                  <span style={{ color: "var(--coral)" }}>
                    {fmt(Number(a.starting || 0) - a.balance)}
                  </span>
                  <span style={{ color: a.balance < 0 ? "var(--coral)" : "var(--mint-soft)", fontWeight: 700 }}>
                    {fmt(a.balance)}
                  </span>
                  <button className="del" onClick={() => delAccount(a.id)}>×</button>
                </div>
              ))}
              <p style={{ color: "var(--ink-faint)" }} className="text-xs px-4 py-2">
                {accMonth === "All" ? "Spent = all expenses charged to that account." : `Spent = expenses in ${new Date(accMonth + "-02").toLocaleString("default", { month: "long", year: "numeric" })} only.`}
              </p>
            </Panel>

            {/* Category Manager */}
            <Panel title="Manage Categories" open={pCats.open} toggle={pCats.toggle} delay="280ms"
              right={<span className="text-xs" style={{ color: "var(--ink-faint)" }}>{categories.length} categories</span>}>
              <CategoryManager subcats={subcats} onChange={updateSubcats} ping={ping} />
            </Panel>
          </div>

          {/* RIGHT: Expenses + Charts */}
          <div className="xl:col-span-2 space-y-5">

            {/* Expenses */}
            <Panel title="Expenses" open={pExpenses.open} toggle={pExpenses.toggle} delay="160ms"
              right={filterActive ? <button className="chip on" onClick={clearFilters}>Clear filters ×</button> : null}>
              {/* Filters */}
              <div className="flex flex-wrap gap-2 items-center px-4 py-3" style={{ borderBottom: "1px solid var(--line)" }}>
                <span className="text-xs font-bold" style={{ color: "var(--ink-dim)", letterSpacing: ".1em" }}>FILTER</span>
                <select className="field" style={{ width: "auto" }} value={filterCat}
                  onChange={(e) => { setFilterCat(e.target.value); setFilterSub("All"); }}>
                  <option value="All">All categories</option>
                  {categories.map((c) => <option key={c}>{c}</option>)}
                </select>
                <select className="field" style={{ width: "auto" }} value={filterSub}
                  disabled={filterCat === "All"}
                  onChange={(e) => setFilterSub(e.target.value)}>
                  <option value="All">All subcategories</option>
                  {(subcats[filterCat] || []).map((s) => <option key={s}>{s}</option>)}
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
              {/* Add row */}
              <div className="row" style={{ gridTemplateColumns: expenseCols, background: "rgba(45,212,191,.04)" }}>
                <input type="date" className="field" value={expForm.date}
                  onChange={(e) => setExpForm({ ...expForm, date: e.target.value })} />
                <select className="field" value={expForm.category}
                  onChange={(e) => setExpForm({ ...expForm, category: e.target.value, subcategory: "" })}>
                  <option value="">Category…</option>
                  {categories.map((c) => <option key={c}>{c}</option>)}
                </select>
                <select className="field" value={expForm.subcategory} disabled={!expForm.category}
                  onChange={(e) => setExpForm({ ...expForm, subcategory: e.target.value })}>
                  <option value="">{expForm.category ? "Subcategory…" : "Pick category"}</option>
                  {(subcats[expForm.category] || []).map((s) => <option key={s}>{s}</option>)}
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
                  <p className="empty">{expenses.length === 0 ? "No expenses yet — add your first one above." : "Nothing matches these filters."}</p>
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
            </Panel>

            {/* Charts */}
            {chartData.length > 0 && (
              <Panel title="Charts" open={pCharts.open} toggle={pCharts.toggle} delay="240ms">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 p-4">

                  {/* Donut */}
                  <div style={{ background: "var(--surface2)", borderRadius: 12, overflow: "hidden" }}>
                    <div className="panel-head" style={{ cursor: "default" }}>
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
                            <span className="text-xs" style={{ color: "var(--ink-dim)", maxWidth: 110, textAlign: "center" }}>{chartData[activeSlice].name}</span>
                            <span className="text-lg font-extrabold" style={{ color: "var(--mint-soft)" }}>{fmt(chartData[activeSlice].value)}</span>
                            <span className="text-xs" style={{ color: "var(--ink-faint)" }}>{((chartData[activeSlice].value / chartTotal) * 100).toFixed(1)}%</span>
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
                          onMouseEnter={() => setActiveSlice(i)} onMouseLeave={() => setActiveSlice(null)}>
                          <span className="flex items-center gap-2 truncate">
                            <span style={{ width: 10, height: 10, borderRadius: 99, background: PIE_COLORS[i % PIE_COLORS.length], flex: "none" }} />
                            <span className="truncate">{d.name}</span>
                          </span>
                          <span style={{ fontVariantNumeric: "tabular-nums" }}>
                            {fmt(d.value)}{" "}
                            <span style={{ color: "var(--ink-faint)", fontSize: 11 }}>{((d.value / chartTotal) * 100).toFixed(0)}%</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Bar chart */}
                  <div style={{ background: "var(--surface2)", borderRadius: 12, overflow: "hidden" }}>
                    <div className="panel-head" style={{ cursor: "default" }}>
                      <span className="panel-title">Monthly spending</span>
                    </div>
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
              </Panel>
            )}
          </div>
        </div>

        <p className="text-xs text-center mt-7" style={{ color: "var(--ink-faint)" }}>
          Data saved in your browser's localStorage — persists across restarts on this device.
        </p>
      </div>
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}