import { useState } from "react";
import {
  Sprout, Building2, Wheat, MapPin, Calendar, Truck,
  CheckCircle2, Circle, PlusCircle, Factory, Receipt, QrCode, ChevronRight, Wallet, Clock,
} from "lucide-react";
import {
  useDemands, addDemand, pledgeProduce, scheduleProcessing, markDelivered, computeEarnings,
} from "./lib/sasyathraData";

const STAGES = ["Posted", "Aggregating", "Confirmed", "Processing", "Delivered"];

function getPhase(d) {
  if (d.status === "delivered") return 4;
  if (d.status === "processing") return 3;
  if (d.matched_kg >= d.qty_kg) return 2;
  if (d.matched_kg > 0) return 1;
  return 0;
}

function money(n) {
  return "₹" + Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function SiloGauge({ percent, ready }) {
  const p = Math.max(0, Math.min(100, percent));
  const fillY = 92 - (p / 100) * 78;
  return (
    <div className="flex flex-col items-center gap-1">
      <svg viewBox="0 0 60 100" className="w-10 h-16">
        <defs>
          <clipPath id={`clip-${p}-${ready}`}>
            <rect x="10" y={fillY} width="40" height={92 - fillY} rx="2" />
          </clipPath>
        </defs>
        <path d="M10 14 L50 14 L50 90 Q30 98 10 90 Z" fill="none" stroke="#5C6B57" strokeWidth="2" />
        <path d="M8 14 L30 4 L52 14 Z" fill="none" stroke="#5C6B57" strokeWidth="2" />
        <g clipPath={`url(#clip-${p}-${ready})`}>
          <rect x="10" y="4" width="40" height="94" fill={ready ? "#C99A3A" : "#8FAE7C"} />
        </g>
      </svg>
      <span className="text-[10px] font-mono" style={{ color: "#5C6B57" }}>{p}%</span>
    </div>
  );
}

function Stepper({ phase }) {
  return (
    <div className="flex items-center w-full">
      {STAGES.map((s, i) => (
        <div key={s} className="flex items-center flex-1 last:flex-none">
          <div className="flex flex-col items-center gap-1">
            {i < phase ? <CheckCircle2 size={16} style={{ color: "#5B8C5A" }} />
              : i === phase ? <Circle size={16} style={{ color: "#C99A3A" }} fill="#C99A3A" />
              : <Circle size={16} style={{ color: "#D8D0BC" }} />}
            <span className="text-[9px] whitespace-nowrap" style={{ color: i <= phase ? "#2F4B3C" : "#B5AE99" }}>{s}</span>
          </div>
          {i < STAGES.length - 1 && (
            <div className="flex-1 h-[2px] mx-1" style={{ background: i < phase ? "#5B8C5A" : "#E4DECB" }} />
          )}
        </div>
      ))}
    </div>
  );
}

function DemandCard({ d, children }) {
  const phase = getPhase(d);
  const ready = d.matched_kg >= d.qty_kg;
  return (
    <div className="rounded-xl p-4 mb-3" style={{ background: "#FAF7F0", border: "1px solid #E4DECB" }}>
      <div className="flex justify-between items-start gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Wheat size={15} style={{ color: "#A9714A" }} />
            <span className="font-semibold text-sm" style={{ color: "#24291F", fontFamily: "Fraunces, serif" }}>{d.product}</span>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs" style={{ color: "#5C6B57" }}>
            <span className="flex items-center gap-1"><Building2 size={12} />{d.buyer_name}</span>
            <span className="flex items-center gap-1"><MapPin size={12} />{d.location}</span>
            {d.required_date && <span className="flex items-center gap-1"><Calendar size={12} />{d.required_date}</span>}
            {d.price_per_kg > 0 && <span className="font-mono">{money(d.price_per_kg)}/kg</span>}
          </div>
          <div className="mt-2 text-xs font-mono" style={{ color: "#24291F" }}>
            {Number(d.matched_kg).toLocaleString()} / {Number(d.qty_kg).toLocaleString()} kg matched
          </div>
        </div>
        <SiloGauge percent={Math.round((d.matched_kg / d.qty_kg) * 100)} ready={ready} />
      </div>
      <div className="mt-3"><Stepper phase={phase} /></div>
      {children}
    </div>
  );
}

function BuyerView({ demands }) {
  const [form, setForm] = useState({ product: "Sona Masuri Rice", qty: "", location: "", date: "", buyer: "GreenLeaf Supermarket", price: "" });
  const [err, setErr] = useState("");

  const submit = async () => {
    if (!form.qty || Number(form.qty) <= 0) return setErr("Quantity must be greater than zero.");
    if (!form.location.trim()) return setErr("Delivery location is required.");
    if (!form.price || Number(form.price) <= 0) return setErr("Expected price per kg is required.");
    setErr("");
    await addDemand({ product: form.product, qty: Number(form.qty), location: form.location, buyer: form.buyer, date: form.date, price: Number(form.price) });
    setForm({ ...form, qty: "", location: "", date: "", price: "" });
  };

  return (
    <div className="grid md:grid-cols-3 gap-5">
      <div className="md:col-span-2">
        <h3 className="text-sm font-semibold mb-3" style={{ color: "#2F4B3C", fontFamily: "Fraunces, serif" }}>Live demand on the platform</h3>
        {demands.length === 0 && <p className="text-xs" style={{ color: "#8B8570" }}>No demand posted yet — use the form to post the first order.</p>}
        {demands.map((d) => (
          <DemandCard key={d.id} d={d}>
            {d.status === "delivered" && (
              <div className="mt-3 pt-3 flex items-center gap-2 text-xs" style={{ borderTop: "1px dashed #E4DECB", color: "#5C6B57" }}>
                <QrCode size={14} /> Batch <span className="font-mono">{d.batch_id}</span> · processed at {d.processing_units?.name}
              </div>
            )}
          </DemandCard>
        ))}
      </div>
      <div>
        <div className="rounded-xl p-4" style={{ background: "#FAF7F0", border: "1px solid #E4DECB" }}>
          <div className="flex items-center gap-2 mb-3">
            <PlusCircle size={16} style={{ color: "#A9714A" }} />
            <span className="text-sm font-semibold" style={{ color: "#24291F", fontFamily: "Fraunces, serif" }}>Post a demand</span>
          </div>
          <div className="flex flex-col gap-2">
            <input placeholder="Your business name" value={form.buyer} onChange={(e) => setForm({ ...form, buyer: e.target.value })}
              className="text-xs rounded-lg px-3 py-2" style={{ border: "1px solid #D8D0BC" }} />
            <select value={form.product} onChange={(e) => setForm({ ...form, product: e.target.value })}
              className="text-xs rounded-lg px-3 py-2" style={{ border: "1px solid #D8D0BC", background: "#fff" }}>
              <option>Sona Masuri Rice</option>
              <option>BPT 5204 Rice</option>
              <option>HMT Rice</option>
            </select>
            <input placeholder="Quantity (kg)" value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })}
              className="text-xs rounded-lg px-3 py-2" style={{ border: "1px solid #D8D0BC" }} />
            <input placeholder="Expected price (₹/kg)" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })}
              className="text-xs rounded-lg px-3 py-2" style={{ border: "1px solid #D8D0BC" }} />
            <input placeholder="Delivery location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })}
              className="text-xs rounded-lg px-3 py-2" style={{ border: "1px solid #D8D0BC" }} />
            <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="text-xs rounded-lg px-3 py-2" style={{ border: "1px solid #D8D0BC" }} />
            {err && <div className="text-xs" style={{ color: "#B5423A" }}>⚠️ {err}</div>}
            <button onClick={submit} className="text-xs font-semibold rounded-lg py-2 mt-1"
              style={{ background: "#2F4B3C", color: "#EDE3CC" }}>Post demand</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function EarningsLedger({ items }) {
  const totalAvailable = items.reduce((s, i) => s + i.earnings.availableNow, 0);
  const totalPending = items.reduce((s, i) => s + i.earnings.pending, 0);

  return (
    <div className="rounded-xl p-4" style={{ background: "#2F4B3C" }}>
      <div className="flex items-center gap-2 mb-3">
        <Wallet size={16} style={{ color: "#EDE3CC" }} />
        <span className="text-sm font-semibold" style={{ color: "#EDE3CC", fontFamily: "Fraunces, serif" }}>Your earnings</span>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="rounded-lg p-2.5" style={{ background: "#3D5847" }}>
          <div className="text-[10px]" style={{ color: "#C9C2AB" }}>Available now</div>
          <div className="text-sm font-mono font-semibold" style={{ color: "#C99A3A" }}>{money(totalAvailable)}</div>
        </div>
        <div className="rounded-lg p-2.5" style={{ background: "#3D5847" }}>
          <div className="text-[10px]" style={{ color: "#C9C2AB" }}>Pending on delivery</div>
          <div className="text-sm font-mono font-semibold" style={{ color: "#EDE3CC" }}>{money(totalPending)}</div>
        </div>
      </div>

      {items.length === 0 && <p className="text-xs" style={{ color: "#8FA08F" }}>Pledge produce against a demand to start earning.</p>}

      {items.map(({ contribution, demand, earnings }) => (
        <div key={contribution.id} className="py-2" style={{ borderBottom: "1px solid #3D5847" }}>
          <div className="flex justify-between text-xs" style={{ color: "#EDE3CC" }}>
            <span>{demand.product} · {contribution.qty_kg} kg @ {money(demand.price_per_kg)}/kg</span>
            <span className="font-mono">{money(earnings.gross)}</span>
          </div>
          <div className="flex justify-between text-[11px] mt-1" style={{ color: "#A9B89F" }}>
            <span className="flex items-center gap-1">
              <CheckCircle2 size={11} style={{ color: "#C99A3A" }} /> Advance ({demand.advance_percent}%): {money(earnings.advance)} — available now
            </span>
          </div>
          <div className="flex justify-between text-[11px]" style={{ color: earnings.balanceReleased ? "#8FAE7C" : "#A9B89F" }}>
            <span className="flex items-center gap-1">
              {earnings.balanceReleased
                ? <><CheckCircle2 size={11} /> Balance released: {money(earnings.balance)}</>
                : <><Clock size={11} /> Balance on delivery: {money(earnings.balance)} (pending)</>}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function FarmerView({ demands }) {
  const [amounts, setAmounts] = useState({});
  const [farmer, setFarmer] = useState({ name: "Ramesh", village: "Kondapur" });
  const [feedback, setFeedback] = useState({});
  const open = demands.filter((d) => d.matched_kg < d.qty_kg);

  const doPledge = async (demandId) => {
    const qty = Number(amounts[demandId] || 0);
    if (!qty || qty <= 0) {
      setFeedback({ ...feedback, [demandId]: { type: "error", msg: "Enter a quantity greater than zero." } });
      return;
    }
    try {
      const accepted = await pledgeProduce({ demandId, farmerName: farmer.name, village: farmer.village, qty });
      setAmounts({ ...amounts, [demandId]: "" });
      setFeedback({
        ...feedback,
        [demandId]: accepted < qty
          ? { type: "warn", msg: `Only ${accepted} kg was still needed — that's what was recorded, not the full ${qty} kg.` }
          : { type: "ok", msg: `${accepted} kg pledged. Your advance is now available in "Your earnings."` },
      });
    } catch (e) {
      setFeedback({ ...feedback, [demandId]: { type: "error", msg: e.message } });
    }
  };

  const myEarnings = demands.flatMap((d) =>
    d.contributions
      .filter((c) => c.farmer_name === farmer.name)
      .map((c) => ({ contribution: c, demand: d, earnings: computeEarnings(c, d) }))
  );

  return (
    <div className="grid md:grid-cols-3 gap-5">
      <div className="md:col-span-2">
        <h3 className="text-sm font-semibold mb-3" style={{ color: "#2F4B3C", fontFamily: "Fraunces, serif" }}>Open demand near you</h3>
        {open.length === 0 && <p className="text-xs" style={{ color: "#8B8570" }}>No open demand right now.</p>}
        {open.map((d) => (
          <DemandCard key={d.id} d={d}>
            <div className="mt-3 pt-3 flex items-center gap-2" style={{ borderTop: "1px dashed #E4DECB" }}>
              <input type="number" placeholder="Your qty (kg)" value={amounts[d.id] || ""}
                onChange={(e) => setAmounts({ ...amounts, [d.id]: e.target.value })}
                className="text-xs rounded-lg px-3 py-1.5 w-32" style={{ border: "1px solid #D8D0BC" }} />
              <button onClick={() => doPledge(d.id)}
                className="text-xs font-semibold rounded-lg px-3 py-1.5" style={{ background: "#5B8C5A", color: "#fff" }}>
                Pledge produce
              </button>
            </div>
            {feedback[d.id] && (
              <div className="mt-2 text-xs" style={{
                color: feedback[d.id].type === "error" ? "#B5423A" : feedback[d.id].type === "warn" ? "#A9714A" : "#5B8C5A"
              }}>
                {feedback[d.id].type === "error" ? "⚠️ " : feedback[d.id].type === "warn" ? "ℹ️ " : "✅ "}{feedback[d.id].msg}
              </div>
            )}
          </DemandCard>
        ))}
      </div>
      <div className="flex flex-col gap-5">
        <div className="rounded-xl p-4" style={{ background: "#FAF7F0", border: "1px solid #E4DECB" }}>
          <div className="flex items-center gap-2 mb-3">
            <Sprout size={16} style={{ color: "#5B8C5A" }} />
            <span className="text-sm font-semibold" style={{ color: "#24291F", fontFamily: "Fraunces, serif" }}>Your farmer profile</span>
          </div>
          <input value={farmer.name} onChange={(e) => setFarmer({ ...farmer, name: e.target.value })}
            className="text-xs rounded-lg px-3 py-2 w-full mb-2" style={{ border: "1px solid #D8D0BC" }} placeholder="Your name" />
          <input value={farmer.village} onChange={(e) => setFarmer({ ...farmer, village: e.target.value })}
            className="text-xs rounded-lg px-3 py-2 w-full" style={{ border: "1px solid #D8D0BC" }} placeholder="Your village" />
        </div>
        <EarningsLedger items={myEarnings} />
      </div>
    </div>
  );
}

function CoopView({ demands, units }) {
  const [chosen, setChosen] = useState({});
  const readyToSchedule = demands.filter((d) => d.matched_kg >= d.qty_kg && d.status === "open");
  const processing = demands.filter((d) => d.status === "processing");
  const aggregating = demands.filter((d) => d.matched_kg < d.qty_kg);

  return (
    <div className="grid md:grid-cols-3 gap-5">
      <div className="md:col-span-2 flex flex-col gap-6">
        {readyToSchedule.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold mb-3" style={{ color: "#2F4B3C", fontFamily: "Fraunces, serif" }}>Confirmed — ready to schedule milling</h3>
            {readyToSchedule.map((d) => (
              <DemandCard key={d.id} d={d}>
                <div className="mt-3 pt-3 flex items-center gap-2 flex-wrap" style={{ borderTop: "1px dashed #E4DECB" }}>
                  <select value={chosen[d.id] || ""} onChange={(e) => setChosen({ ...chosen, [d.id]: e.target.value })}
                    className="text-xs rounded-lg px-2 py-1.5" style={{ border: "1px solid #D8D0BC" }}>
                    <option value="">Select processing unit…</option>
                    {units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                  <button disabled={!chosen[d.id]} onClick={() => scheduleProcessing({ demandId: d.id, unitId: chosen[d.id] })}
                    className="text-xs font-semibold rounded-lg px-3 py-1.5 flex items-center gap-1"
                    style={{ background: chosen[d.id] ? "#C99A3A" : "#E4DECB", color: chosen[d.id] ? "#24291F" : "#B5AE99" }}>
                    <Factory size={13} /> Confirm & schedule milling
                  </button>
                </div>
              </DemandCard>
            ))}
          </div>
        )}
        {processing.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold mb-3" style={{ color: "#2F4B3C", fontFamily: "Fraunces, serif" }}>In processing</h3>
            {processing.map((d) => (
              <DemandCard key={d.id} d={d}>
                <div className="mt-3 pt-3 flex items-center justify-between" style={{ borderTop: "1px dashed #E4DECB" }}>
                  <span className="text-xs flex items-center gap-1" style={{ color: "#5C6B57" }}><Factory size={13} />{d.processing_units?.name}</span>
                  <button onClick={() => markDelivered(d.id)} className="text-xs font-semibold rounded-lg px-3 py-1.5 flex items-center gap-1"
                    style={{ background: "#5B8C5A", color: "#fff" }}><Truck size={13} /> Mark delivered</button>
                </div>
              </DemandCard>
            ))}
          </div>
        )}
        {aggregating.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold mb-3" style={{ color: "#2F4B3C", fontFamily: "Fraunces, serif" }}>Still aggregating — not yet triggered</h3>
            {aggregating.map((d) => <DemandCard key={d.id} d={d} />)}
          </div>
        )}
      </div>
      <div>
        <h3 className="text-sm font-semibold mb-3" style={{ color: "#2F4B3C", fontFamily: "Fraunces, serif" }}>Existing processing partners</h3>
        <div className="flex flex-col gap-2">
          {units.map((u) => (
            <div key={u.id} className="rounded-lg p-3 text-xs" style={{ background: "#FAF7F0", border: "1px solid #E4DECB" }}>
              <div className="font-semibold" style={{ color: "#24291F" }}>{u.name}</div>
              <div style={{ color: "#8B8570" }}>{u.village} · {u.capacity_kg_per_day} kg/day capacity</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [role, setRole] = useState("buyer");
  const { demands, units, loading } = useDemands();

  const roles = [
    { key: "buyer", label: "Buyer", icon: Building2 },
    { key: "farmer", label: "Farmer", icon: Sprout },
    { key: "coop", label: "Cooperative", icon: Factory },
  ];

  return (
    <div className="min-h-screen w-full" style={{ background: "#F3EFE3" }}>
      <div className="max-w-5xl mx-auto px-5 py-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Wheat size={22} style={{ color: "#A9714A" }} />
              <h1 className="text-2xl font-bold" style={{ color: "#2F4B3C", fontFamily: "Fraunces, serif" }}>Sasyathra</h1>
            </div>
            <p className="text-xs mt-0.5" style={{ color: "#8B8570" }}>Demand-first agriculture · one platform, three roles, one shared ledger</p>
          </div>
          <div className="flex rounded-full p-1 gap-1" style={{ background: "#E4DECB" }}>
            {roles.map((r) => {
              const Icon = r.icon;
              const active = role === r.key;
              return (
                <button key={r.key} onClick={() => setRole(r.key)}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-full transition-all"
                  style={{ background: active ? "#2F4B3C" : "transparent", color: active ? "#EDE3CC" : "#5C6B57" }}>
                  <Icon size={13} /> {r.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl p-4 mb-6 flex items-center gap-2 text-xs" style={{ background: "#EDE3CC", color: "#5C6B57" }}>
          <ChevronRight size={14} style={{ color: "#A9714A" }} />
          Processing is only scheduled once a demand order reaches 100% matched supply — and farmers get most of their earnings the moment their pledge is accepted, not after processing finishes.
        </div>

        {loading ? (
          <p className="text-xs" style={{ color: "#8B8570" }}>Loading live data…</p>
        ) : (
          <>
            {role === "buyer" && <BuyerView demands={demands} />}
            {role === "farmer" && <FarmerView demands={demands} />}
            {role === "coop" && <CoopView demands={demands} units={units} />}
          </>
        )}
      </div>
    </div>
  );
}
