import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend
} from "recharts";

// ─── Constants ───
const NUM_HH = 131_000_000;
const BASE_GDP = 29_000_000_000_000;
const BASE_YEAR = 2025;
const BASE_MEDIAN = 83_730;

// ─── Color palette ───
const C = {
  wages:      "#5B8DEF",
  swf:        "#F5A623",
  ubi:        "#2DD4A8",
  social:     "#A78BFA",
  esop:       "#FF6B6B",
  babyBonds:  "#C084FC",
  dataRoyalty: "#38BDF8",
  privateInv: "#FB923C",
  carbon:     "#34D399",
  deMonet:    "#F472B6",
};

const STREAM_META = [
  { key: "wages",      label: "Residual Wages",       color: C.wages },
  { key: "social",     label: "Social Insurance",     color: C.social },
  { key: "ubi",        label: "Universal Basic Income",color: C.ubi },
  { key: "swf",        label: "SWF Dividend",         color: C.swf },
  { key: "esop",       label: "ESOP / Co-op Share",   color: C.esop },
  { key: "babyBonds",  label: "Baby Bond Returns",    color: C.babyBonds },
  { key: "dataRoyalty", label: "Data / AI Royalty",    color: C.dataRoyalty },
  { key: "privateInv", label: "Private Investment",   color: C.privateInv },
  { key: "carbon",     label: "Carbon Dividend",      color: C.carbon },
  { key: "deMonet",    label: "Demonetization Gain",  color: C.deMonet },
];

// ─── Defaults ───
const DEFAULTS = {
  endYear: 2060,
  automationPace: 2.5,    // % per year
  baseGdpGrowth: 2.0,     // % real
  swfSeed: 100,            // $B
  swfContribRate: 1.5,     // % of GDP
  swfReturnRate: 7.0,      // %
  swfSpendRule: 3.0,       // %
  ubiMonthly: 2000,        // $/month per adult
  ubiRampYears: 12,
  babyBondSeed: 5000,      // $
  babyBondReturn: 7.0,     // %
  babyBondMaturity: 18,    // years
  esopGrowth: 7.0,         // %/yr coverage growth
  dataRoyaltyMax: 12000,   // $/HH at full automation
  carbonBase: 900,         // $/HH/yr
  carbonGrowth: 4.0,       // %/yr
  privateInvBase: 4185,    // $/HH/yr (current capital income)
  privateInvGrowth: 3.5,   // %/yr
  demonetRate: 35,         // % cost reduction at full automation
  // Toggles
  enableSWF: true,
  enableUBI: true,
  enableBabyBonds: true,
  enableVAT: true,
  enableCarbon: true,
  enableAutoLevy: true,
  enableWealthTax: true,
  enableDataRoyalty: true,
  enableESOP: true,
  enableDemonet: true,
};

// ─── Simulation engine ───
function simulate(p) {
  const data = [];
  let gdp = BASE_GDP;
  let swfBalance = p.enableSWF ? p.swfSeed * 1e9 : 0;
  let automationLevel = 0.05; // 5% in 2025

  for (let year = BASE_YEAR; year <= p.endYear; year++) {
    const t = year - BASE_YEAR;

    // Automation level (sigmoid-ish: accelerates then slows)
    const rawPace = p.automationPace / 100;
    automationLevel = Math.min(0.95, automationLevel + rawPace * (1 + automationLevel) * (1 - automationLevel));

    // GDP grows faster with more automation
    const autoBoost = automationLevel * 0.025;
    gdp = gdp * (1 + p.baseGdpGrowth / 100 + autoBoost);

    // Revenue factor: some interventions are revenue sources that boost transfer capacity
    let revenueFactor = 0.6; // baseline fiscal capacity
    if (p.enableVAT) revenueFactor += 0.15;
    if (p.enableAutoLevy) revenueFactor += 0.10;
    if (p.enableWealthTax) revenueFactor += 0.08;
    revenueFactor = Math.min(1.0, revenueFactor);

    // ── WAGES ──
    // Calibrated so at automation=0.05 (2025), wages ≈ $68,660
    // Decline with automation, remaining workers get productivity premium
    const autoFromBase = Math.max(0, automationLevel - 0.05) / 0.95; // normalized 0→1
    const wageMultiplier = Math.max(0.04, 1 - autoFromBase * 0.96);
    const productivityPremium = 1 + autoFromBase * 0.3;
    const wages = Math.max(3000, 68660 * wageMultiplier * productivityPremium);

    // ── SOCIAL INSURANCE ──
    // Grows slowly, scales somewhat with GDP
    const socialGrowth = Math.pow(gdp / BASE_GDP, 0.25);
    const social = 10885 * socialGrowth * (1 + t * 0.005);

    // ── SWF ──
    let swfDiv = 0;
    if (p.enableSWF) {
      const contrib = (p.swfContribRate / 100) * gdp * revenueFactor;
      const returns = swfBalance * (p.swfReturnRate / 100);
      const distribution = swfBalance * (p.swfSpendRule / 100);
      swfBalance = swfBalance + contrib + returns - distribution;
      swfDiv = distribution / NUM_HH;
    }

    // ── UBI ──
    let ubi = 0;
    if (p.enableUBI) {
      const ramp = Math.min(1, t / Math.max(1, p.ubiRampYears));
      // ~1.5 adults per HH, scaled by revenue capacity
      ubi = p.ubiMonthly * 12 * 1.5 * ramp * revenueFactor;
    }

    // ── ESOP / CO-OP ──
    let esop = 0;
    if (p.enableESOP) {
      // Starts small, ramps as coverage expands and GDP grows
      const ramp = Math.min(1, t / 5);
      esop = 800 * Math.pow(1 + p.esopGrowth / 100, t) * Math.pow(gdp / BASE_GDP, 0.3) * ramp;
      esop = Math.min(esop, 30000); // cap
    }

    // ── BABY BONDS ──
    let babyBonds = 0;
    if (p.enableBabyBonds && t >= p.babyBondMaturity) {
      // After maturity, cohorts start generating returns
      const yearsActive = t - p.babyBondMaturity;
      const maturedValue = p.babyBondSeed * Math.pow(1 + p.babyBondReturn / 100, p.babyBondMaturity);
      // Fraction of working-age pop with bonds increases each year
      const cohortFraction = Math.min(1, yearsActive / 25);
      // Annual return on the matured capital
      babyBonds = maturedValue * (p.babyBondReturn / 100) * cohortFraction;
    }

    // ── DATA / AI ROYALTY ──
    let dataRoyalty = 0;
    if (p.enableDataRoyalty) {
      const ramp = Math.min(1, t / 8); // 8yr phase-in for legislation + implementation
      dataRoyalty = p.dataRoyaltyMax * automationLevel * Math.pow(gdp / BASE_GDP, 0.4) * revenueFactor * ramp;
    }

    // ── CARBON DIVIDEND ──
    let carbon = 0;
    if (p.enableCarbon) {
      const ramp = Math.min(1, t / 3); // 3yr phase-in
      carbon = p.carbonBase * Math.pow(1 + p.carbonGrowth / 100, t) * ramp;
    }

    // ── PRIVATE INVESTMENT ──
    const privateInv = p.privateInvBase * Math.pow(1 + p.privateInvGrowth / 100, t) *
                       Math.pow(gdp / BASE_GDP, 0.2);

    // ── NOMINAL TOTAL ──
    const nominalTotal = wages + social + ubi + swfDiv + esop + babyBonds + dataRoyalty + carbon + privateInv;

    // ── DEMONETIZATION ──
    let deMonet = 0;
    if (p.enableDemonet) {
      // Cost of living falls relative to today → purchasing power rises
      const costReduction = (p.demonetRate / 100) * autoFromBase;
      if (costReduction > 0 && costReduction < 1) {
        const ppMultiplier = 1 / (1 - costReduction);
        deMonet = nominalTotal * (ppMultiplier - 1);
      }
    }

    const effectiveTotal = nominalTotal + deMonet;

    data.push({
      year,
      wages: Math.round(wages),
      social: Math.round(social),
      ubi: Math.round(ubi),
      swf: Math.round(swfDiv),
      esop: Math.round(esop),
      babyBonds: Math.round(babyBonds),
      dataRoyalty: Math.round(dataRoyalty),
      privateInv: Math.round(privateInv),
      carbon: Math.round(carbon),
      deMonet: Math.round(deMonet),
      total: Math.round(effectiveTotal),
      automationLevel: Math.round(automationLevel * 100),
      gdpT: +(gdp / 1e12).toFixed(1),
      swfT: +(swfBalance / 1e12).toFixed(1),
    });
  }
  return data;
}

// ─── Slider component ───
function Slider({ label, value, onChange, min, max, step = 1, unit = "", disabled = false }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div style={{ marginBottom: 10, opacity: disabled ? 0.35 : 1, pointerEvents: disabled ? "none" : "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
        <span style={{ fontSize: 11, color: "#94a3b8", letterSpacing: 0.3 }}>{label}</span>
        <span style={{ fontSize: 11, color: "#e2e8f0", fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>
          {typeof value === 'number' ? value.toLocaleString() : value}{unit}
        </span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{
          width: "100%", height: 4, appearance: "none", borderRadius: 2,
          background: `linear-gradient(to right, #5B8DEF ${pct}%, #334155 ${pct}%)`,
          cursor: "pointer", outline: "none",
        }}
      />
    </div>
  );
}

// ─── Toggle component ───
function Toggle({ label, checked, onChange, color }) {
  return (
    <div
      onClick={onChange}
      role="button"
      tabIndex={0}
      onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onChange(); } }}
      style={{
        display: "flex", alignItems: "center", gap: 8, cursor: "pointer",
        padding: "5px 0", fontSize: 12, color: checked ? "#e2e8f0" : "#64748b",
        transition: "color 0.2s", userSelect: "none",
      }}
    >
      <div style={{
        width: 34, height: 18, borderRadius: 9, position: "relative",
        background: checked ? (color || "#5B8DEF") : "#334155",
        transition: "background 0.2s", flexShrink: 0,
      }}>
        <div style={{
          width: 14, height: 14, borderRadius: 7, background: "#fff",
          position: "absolute", top: 2, left: checked ? 18 : 2,
          transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.3)"
        }} />
      </div>
      {label}
    </div>
  );
}

// ─── Section header ───
function Section({ title, children }) {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ marginBottom: 12 }}>
      <div
        onClick={() => setOpen(!open)}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          cursor: "pointer", padding: "6px 0", borderBottom: "1px solid #1e293b",
          marginBottom: open ? 8 : 0,
        }}
      >
        <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, color: "#64748b" }}>
          {title}
        </span>
        <span style={{ fontSize: 10, color: "#475569" }}>{open ? "▾" : "▸"}</span>
      </div>
      {open && children}
    </div>
  );
}

// ─── Custom tooltip ───
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s, p) => s + (p.value || 0), 0);
  const row = payload[0]?.payload;
  return (
    <div style={{
      background: "#0f172aee", border: "1px solid #1e293b", borderRadius: 8,
      padding: "12px 16px", fontSize: 11, color: "#e2e8f0", minWidth: 220,
      backdropFilter: "blur(8px)",
    }}>
      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6, color: "#f8fafc" }}>
        {label} — ${total.toLocaleString()}/yr
      </div>
      <div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 8 }}>
        Automation: {row?.automationLevel}% · GDP: ${row?.gdpT}T · SWF: ${row?.swfT}T
      </div>
      {[...payload].reverse().filter(p => p.value > 0).map(p => (
        <div key={p.dataKey} style={{ display: "flex", justifyContent: "space-between", padding: "2px 0" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: p.color, display: "inline-block" }} />
            {STREAM_META.find(s => s.key === p.dataKey)?.label}
          </span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>
            ${p.value.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Dollar formatter ───
const fmtK = v => v >= 1000 ? `$${Math.round(v / 1000)}k` : `$${v}`;
const fmtFull = v => `$${v.toLocaleString()}`;

// ─── Main component ───
export default function UHISimulator() {
  const [params, setParams] = useState(DEFAULTS);
  const [panelOpen, setPanelOpen] = useState(true);

  const set = useCallback((key, val) => {
    setParams(prev => ({ ...prev, [key]: val }));
  }, []);

  const data = useMemo(() => simulate(params), [params]);

  const firstRow = data[0];
  const lastRow = data[data.length - 1];
  const midIdx = Math.floor(data.length / 2);
  const midRow = data[midIdx];

  // Active streams (only show enabled ones)
  const activeStreams = STREAM_META.filter(s => {
    if (s.key === "wages" || s.key === "social" || s.key === "privateInv") return true;
    if (s.key === "swf") return params.enableSWF;
    if (s.key === "ubi") return params.enableUBI;
    if (s.key === "esop") return params.enableESOP;
    if (s.key === "babyBonds") return params.enableBabyBonds;
    if (s.key === "dataRoyalty") return params.enableDataRoyalty;
    if (s.key === "carbon") return params.enableCarbon;
    if (s.key === "deMonet") return params.enableDemonet;
    return true;
  });

  // Presets
  const applyPreset = (preset) => {
    if (preset === "proactive") setParams({ ...DEFAULTS });
    if (preset === "reactive") setParams({ ...DEFAULTS, swfSeed: 0, swfContribRate: 0.8, ubiRampYears: 18, babyBondSeed: 2000, automationPace: 2.5 });
    if (preset === "delayed") setParams({ ...DEFAULTS, enableSWF: false, enableBabyBonds: false, enableDataRoyalty: false, enableESOP: false, ubiRampYears: 22, enableVAT: false, enableWealthTax: false, automationPace: 2.5 });
    if (preset === "noAction") setParams({ ...DEFAULTS, enableSWF: false, enableUBI: false, enableBabyBonds: false, enableVAT: false, enableCarbon: false, enableAutoLevy: false, enableWealthTax: false, enableDataRoyalty: false, enableESOP: false, enableDemonet: false });
  };

  return (
    <div style={{
      fontFamily: "'IBM Plex Sans', 'Segoe UI', system-ui, sans-serif",
      background: "#0a0f1a",
      color: "#e2e8f0",
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
    }}>
      {/* Header */}
      <div style={{
        padding: "16px 24px",
        borderBottom: "1px solid #1e293b",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "linear-gradient(180deg, #0f172a 0%, #0a0f1a 100%)",
      }}>
        <div>
          <h1 style={{
            margin: 0, fontSize: 18, fontWeight: 800, letterSpacing: -0.5,
            background: "linear-gradient(135deg, #5B8DEF, #2DD4A8)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>
            Universal High Income Simulator
          </h1>
          <p style={{ margin: "2px 0 0", fontSize: 11, color: "#64748b" }}>
            Post-Labor Economy · Median Household Income · Constant 2024 Dollars
          </p>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {[
            ["proactive", "Proactive"],
            ["reactive", "Reactive"],
            ["delayed", "Delayed"],
            ["noAction", "No Action"],
          ].map(([k, l]) => (
            <button key={k} onClick={() => applyPreset(k)} style={{
              padding: "5px 10px", fontSize: 10, fontWeight: 600, borderRadius: 4,
              border: "1px solid #334155", background: "#1e293b", color: "#94a3b8",
              cursor: "pointer", letterSpacing: 0.3, transition: "all 0.15s",
            }}
              onMouseEnter={e => { e.target.style.background = "#334155"; e.target.style.color = "#e2e8f0"; }}
              onMouseLeave={e => { e.target.style.background = "#1e293b"; e.target.style.color = "#94a3b8"; }}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Control Panel */}
        <div style={{
          width: panelOpen ? 300 : 0, overflow: panelOpen ? "auto" : "hidden",
          transition: "width 0.3s", background: "#0f172a",
          borderRight: "1px solid #1e293b", flexShrink: 0,
          padding: panelOpen ? "16px 16px" : 0,
        }}>
          {panelOpen && (
            <>
              <Section title="Simulation Range">
                <Slider label="End Year" value={params.endYear} onChange={v => set("endYear", v)}
                  min={2035} max={2100} step={5} />
              </Section>

              <Section title="Automation & Growth">
                <Slider label="Automation Pace" value={params.automationPace} onChange={v => set("automationPace", v)}
                  min={0.5} max={6} step={0.1} unit="%/yr" />
                <Slider label="Base GDP Growth" value={params.baseGdpGrowth} onChange={v => set("baseGdpGrowth", v)}
                  min={0.5} max={5} step={0.1} unit="%" />
              </Section>

              <Section title="Sovereign Wealth Fund">
                <Toggle label="Enable SWF" checked={params.enableSWF} onChange={() => set("enableSWF", !params.enableSWF)} color={C.swf} />
                <Slider label="Initial Seed" value={params.swfSeed} onChange={v => set("swfSeed", v)}
                  min={0} max={500} step={10} unit="B" disabled={!params.enableSWF} />
                <Slider label="Annual Contribution" value={params.swfContribRate} onChange={v => set("swfContribRate", v)}
                  min={0.1} max={5} step={0.1} unit="% GDP" disabled={!params.enableSWF} />
                <Slider label="Return Rate" value={params.swfReturnRate} onChange={v => set("swfReturnRate", v)}
                  min={2} max={12} step={0.5} unit="%" disabled={!params.enableSWF} />
                <Slider label="Spending Rule" value={params.swfSpendRule} onChange={v => set("swfSpendRule", v)}
                  min={1} max={6} step={0.25} unit="%" disabled={!params.enableSWF} />
              </Section>

              <Section title="Universal Basic Income">
                <Toggle label="Enable UBI" checked={params.enableUBI} onChange={() => set("enableUBI", !params.enableUBI)} color={C.ubi} />
                <Slider label="Target (per adult/mo)" value={params.ubiMonthly} onChange={v => set("ubiMonthly", v)}
                  min={250} max={5000} step={50} unit="$" disabled={!params.enableUBI} />
                <Slider label="Ramp-Up Period" value={params.ubiRampYears} onChange={v => set("ubiRampYears", v)}
                  min={3} max={25} step={1} unit=" yrs" disabled={!params.enableUBI} />
              </Section>

              <Section title="Baby Bonds">
                <Toggle label="Enable Baby Bonds" checked={params.enableBabyBonds} onChange={() => set("enableBabyBonds", !params.enableBabyBonds)} color={C.babyBonds} />
                <Slider label="Seed Amount" value={params.babyBondSeed} onChange={v => set("babyBondSeed", v)}
                  min={1000} max={50000} step={500} unit="$" disabled={!params.enableBabyBonds} />
                <Slider label="Return Rate" value={params.babyBondReturn} onChange={v => set("babyBondReturn", v)}
                  min={3} max={12} step={0.5} unit="%" disabled={!params.enableBabyBonds} />
                <Slider label="Maturity Age" value={params.babyBondMaturity} onChange={v => set("babyBondMaturity", v)}
                  min={12} max={25} step={1} unit=" yrs" disabled={!params.enableBabyBonds} />
              </Section>

              <Section title="Other Income Streams">
                <Toggle label="ESOP / Cooperative Expansion" checked={params.enableESOP} onChange={() => set("enableESOP", !params.enableESOP)} color={C.esop} />
                <Slider label="ESOP Coverage Growth" value={params.esopGrowth} onChange={v => set("esopGrowth", v)}
                  min={1} max={15} step={0.5} unit="%/yr" disabled={!params.enableESOP} />
                <Toggle label="Data / AI Royalty" checked={params.enableDataRoyalty} onChange={() => set("enableDataRoyalty", !params.enableDataRoyalty)} color={C.dataRoyalty} />
                <Slider label="Max Royalty (full auto)" value={params.dataRoyaltyMax} onChange={v => set("dataRoyaltyMax", v)}
                  min={1000} max={30000} step={500} unit="$/HH" disabled={!params.enableDataRoyalty} />
                <Toggle label="Carbon / Commons Dividend" checked={params.enableCarbon} onChange={() => set("enableCarbon", !params.enableCarbon)} color={C.carbon} />
                <Slider label="Carbon Base" value={params.carbonBase} onChange={v => set("carbonBase", v)}
                  min={200} max={3000} step={50} unit="$/yr" disabled={!params.enableCarbon} />
              </Section>

              <Section title="Revenue Sources">
                <Toggle label="Value-Added Tax (VAT)" checked={params.enableVAT} onChange={() => set("enableVAT", !params.enableVAT)} />
                <Toggle label="Automation Levy" checked={params.enableAutoLevy} onChange={() => set("enableAutoLevy", !params.enableAutoLevy)} />
                <Toggle label="Wealth Tax" checked={params.enableWealthTax} onChange={() => set("enableWealthTax", !params.enableWealthTax)} />
                <p style={{ fontSize: 9, color: "#475569", margin: "4px 0 0", lineHeight: 1.4 }}>
                  Revenue sources fund UBI, SWF contributions, and data royalties. Disabling reduces transfer capacity.
                </p>
              </Section>

              <Section title="Demonetization & Deflation">
                <Toggle label="Enable Demonetization" checked={params.enableDemonet} onChange={() => set("enableDemonet", !params.enableDemonet)} color={C.deMonet} />
                <Slider label="Max Cost Reduction" value={params.demonetRate} onChange={v => set("demonetRate", v)}
                  min={0} max={60} step={1} unit="%" disabled={!params.enableDemonet} />
                <p style={{ fontSize: 9, color: "#475569", margin: "4px 0 0", lineHeight: 1.4 }}>
                  AI lowers costs of healthcare, education, legal, digital services. Purchasing power rises even if nominal income stays flat.
                </p>
              </Section>
            </>
          )}
        </div>

        {/* Toggle panel button */}
        <div style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
          <button onClick={() => setPanelOpen(!panelOpen)} style={{
            width: 20, height: 44, borderRadius: "0 6px 6px 0",
            background: "#1e293b", border: "1px solid #334155", borderLeft: "none",
            color: "#64748b", cursor: "pointer", fontSize: 11,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {panelOpen ? "◂" : "▸"}
          </button>
        </div>

        {/* Chart area */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "16px 24px 16px 32px", minWidth: 0 }}>
          {/* Key metrics */}
          <div style={{
            display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap",
          }}>
            {[
              { label: `${BASE_YEAR}`, value: fmtFull(firstRow?.total || 0), sub: "Starting Income", accent: "#94a3b8" },
              { label: `${midRow?.year}`, value: fmtFull(midRow?.total || 0), sub: `Midpoint · ${midRow?.automationLevel}% Automated`, accent: "#5B8DEF" },
              { label: `${lastRow?.year}`, value: fmtFull(lastRow?.total || 0), sub: `End State · ${lastRow?.automationLevel}% Automated`, accent: "#2DD4A8" },
              { label: "SWF Balance", value: `$${lastRow?.swfT || 0}T`, sub: `GDP: $${lastRow?.gdpT || 0}T`, accent: "#F5A623" },
              { label: "vs. Today", value: `${Math.round(((lastRow?.total || 0) / BASE_MEDIAN) * 100)}%`, sub: `of $${BASE_MEDIAN.toLocaleString()}`, accent: "#C084FC" },
            ].map((m, i) => (
              <div key={i} style={{
                background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8,
                padding: "10px 16px", flex: "1 1 140px", minWidth: 120,
              }}>
                <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "#475569", marginBottom: 2 }}>
                  {m.label}
                </div>
                <div style={{ fontSize: 20, fontWeight: 800, color: m.accent, fontFamily: "'JetBrains Mono', monospace", letterSpacing: -0.5 }}>
                  {m.value}
                </div>
                <div style={{ fontSize: 10, color: "#64748b", marginTop: 1 }}>{m.sub}</div>
              </div>
            ))}
          </div>

          {/* Chart */}
          <div style={{ flex: 1, minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
                <defs>
                  {activeStreams.map(s => (
                    <linearGradient key={s.key} id={`g_${s.key}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={s.color} stopOpacity={0.8} />
                      <stop offset="100%" stopColor={s.color} stopOpacity={0.3} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                  dataKey="year" stroke="#475569" fontSize={11}
                  tick={{ fill: "#64748b" }}
                  tickLine={{ stroke: "#334155" }}
                />
                <YAxis
                  stroke="#475569" fontSize={10}
                  tick={{ fill: "#64748b" }}
                  tickFormatter={fmtK}
                  tickLine={{ stroke: "#334155" }}
                  width={55}
                />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine
                  y={BASE_MEDIAN} stroke="#475569" strokeDasharray="6 4"
                  label={{ value: `Today: ${fmtFull(BASE_MEDIAN)}`, fill: "#64748b", fontSize: 10, position: "insideTopLeft" }}
                />
                {activeStreams.map(s => (
                  <Area
                    key={s.key}
                    type="monotone"
                    dataKey={s.key}
                    stackId="1"
                    stroke={s.color}
                    fill={`url(#g_${s.key})`}
                    strokeWidth={0.5}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div style={{
            display: "flex", flexWrap: "wrap", gap: "6px 16px", padding: "10px 0 4px",
            justifyContent: "center",
          }}>
            {activeStreams.map(s => (
              <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: "#94a3b8" }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: s.color }} />
                {s.label}
              </div>
            ))}
          </div>

          {/* Footer note */}
          <div style={{ fontSize: 9, color: "#334155", textAlign: "center", padding: "4px 0" }}>
            Shapiro (2026) UHI Framework · Toy model for scenario exploration, not point forecast · All values in constant 2024 USD
          </div>
        </div>
      </div>

      <style>{`
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 12px; height: 12px; border-radius: 50%;
          background: #e2e8f0; cursor: pointer;
          box-shadow: 0 0 4px rgba(91,141,239,0.5);
        }
        input[type="range"]::-moz-range-thumb {
          width: 12px; height: 12px; border-radius: 50%;
          background: #e2e8f0; cursor: pointer; border: none;
          box-shadow: 0 0 4px rgba(91,141,239,0.5);
        }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #0a0f1a; }
        ::-webkit-scrollbar-thumb { background: #334155; border-radius: 3px; }
      `}</style>
    </div>
  );
}
