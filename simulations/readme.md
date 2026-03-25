# Universal High Income (UHI) Simulator

## Technical Documentation & Reference

**Version:** 1.0  
**Date:** March 2026  
**Source framework:** Shapiro (2026), *Post-Labor Economics and Universal High Income*  
**Status:** Toy model for scenario exploration — not a point forecast

---

## Table of Contents

1. [What This Is](#1-what-this-is)
2. [Files in This Directory](#2-files-in-this-directory)
3. [How to Run](#3-how-to-run)
4. [Theoretical Foundation](#4-theoretical-foundation)
5. [Simulation Architecture](#5-simulation-architecture)
6. [Baseline Constants & Calibration](#6-baseline-constants--calibration)
7. [The Simulation Engine: Formula-by-Formula](#7-the-simulation-engine-formula-by-formula)
   - 7.1 [Automation Level](#71-automation-level)
   - 7.2 [GDP Growth](#72-gdp-growth)
   - 7.3 [Revenue Factor](#73-revenue-factor)
   - 7.4 [Residual Wages](#74-residual-wages)
   - 7.5 [Social Insurance](#75-social-insurance)
   - 7.6 [Sovereign Wealth Fund Dividend](#76-sovereign-wealth-fund-dividend)
   - 7.7 [Universal Basic Income](#77-universal-basic-income)
   - 7.8 [ESOP / Cooperative Profit Share](#78-esop--cooperative-profit-share)
   - 7.9 [Baby Bond Returns](#79-baby-bond-returns)
   - 7.10 [Data / AI Royalty](#710-data--ai-royalty)
   - 7.11 [Carbon / Commons Dividend](#711-carbon--commons-dividend)
   - 7.12 [Private Investment Returns](#712-private-investment-returns)
   - 7.13 [Demonetization / Deflation Gain](#713-demonetization--deflation-gain)
   - 7.14 [Total Effective Household Income](#714-total-effective-household-income)
8. [Default Parameter Values & Justifications](#8-default-parameter-values--justifications)
9. [Preset Scenarios](#9-preset-scenarios)
10. [Revenue Source Toggles: How They Affect the Model](#10-revenue-source-toggles-how-they-affect-the-model)
11. [Intervention Toggles: What Each One Controls](#11-intervention-toggles-what-each-one-controls)
12. [UI Architecture](#12-ui-architecture)
13. [Design Decisions & Trade-Offs](#13-design-decisions--trade-offs)
14. [Known Limitations](#14-known-limitations)
15. [Mapping to Source Material](#15-mapping-to-source-material)
16. [Extending the Model](#16-extending-the-model)

---

## 1. What This Is

An interactive browser-based simulator that models median U.S. household income over time as automation displaces labor, allowing users to adjust assumptions about the pace of automation, GDP growth, policy interventions (sovereign wealth fund, UBI, baby bonds, ESOPs, data royalties, carbon dividends), revenue sources (VAT, automation levy, wealth tax), and demonetization effects.

The output is a stacked area chart showing the composition and total of effective household income in constant 2024 dollars, from 2025 through a user-selected endpoint (2035–2100). The goal is to make the post-labor income transition tangible and explorable — to let people see what happens when you turn knobs up or down, add or remove entire policy interventions, and compare proactive vs. delayed timelines.

This is a **scenario exploration tool**, not an econometric model. The formulas are deliberately simplified to be transparent and auditable by anyone who reads this document. Precision is not the point. Structural intuition is.

---

## 2. Files in This Directory

| File | Purpose |
|---|---|
| `uhi_simulator.jsx` | React/Recharts component for use inside Claude.ai or any React environment. Uses `useState`, `useMemo`, `useCallback` hooks and Recharts' `AreaChart` with stacked areas. |
| `UHI_Simulator.html` | **Standalone HTML file.** Zero build tools, zero installation. Double-click to open in any modern browser. Uses vanilla JavaScript + Chart.js loaded from jsdelivr CDN. Contains the identical simulation engine, UI controls, and visualization. |
| `README.md` | This file. |

**Why two files?** The `.jsx` artifact runs inside Claude.ai's rendering environment (which provides React, Recharts, and Babel). The `.html` file is a fully self-contained version that anyone can open locally — it replaces React with vanilla DOM manipulation and Recharts with Chart.js, but the simulation engine is identical line-for-line.

---

## 3. How to Run

**HTML version (recommended for sharing):**
1. Download `UHI_Simulator.html`
2. Double-click it. Done.
3. Requires an internet connection on first load (to fetch Chart.js from CDN; ~200KB, cached afterward).

**JSX version (inside Claude.ai):**
- The artifact renders automatically when created in a Claude conversation. No setup needed.

**JSX version (in your own React project):**
1. Install dependencies: `npm install react recharts`
2. Import the component: `import UHISimulator from './uhi_simulator'`
3. Render: `<UHISimulator />`

---

## 4. Theoretical Foundation

The simulator operationalizes the framework from Shapiro (2026), which makes three core claims:

**Claim 1: The Three-Bucket Identity.** All household income arrives through exactly three channels — wages, capital returns, and government transfers. This is an accounting identity (per BEA National Income and Product Accounts), not a theory. If one channel declines, the other two must expand by exactly that amount, or total household income falls.

**Claim 2: Wages Are Structurally Declining.** Labor's share of national income has fallen from ~65% (postwar peak) to ~56–58% across every industrialized nation since the early 1980s. GDP-wage decoupling has been measured for 40+ years. AI is not initiating this trend — it is accelerating it into the last remaining sector (services/knowledge/creative work), which has no successor sector to absorb displaced workers.

**Claim 3: The Deflationary Death Spiral.** Consumer spending drives 68–70% of U.S. GDP. If household income collapses due to automation without replacement channels, aggregate demand collapses, tax revenues collapse, and a self-reinforcing contraction follows. This makes income redistribution not a policy preference but a structural requirement — capital owners need customers.

The simulator models the **compositional transition** of median household income from a wage-dominant portfolio (~82% wages today) to a diversified portfolio of nine income streams across all three buckets. It does NOT model macroeconomic dynamics (multiplier effects, inflation, interest rates, trade, migration, political economy). It answers one question: *Given these assumptions about automation speed and policy choices, what does the median household's income look like year by year?*

---

## 5. Simulation Architecture

The simulation is a **deterministic annual loop** from `BASE_YEAR` (2025) to `endYear` (user-configurable, default 2060). Each year, it:

1. Updates the automation level (logistic-curve dynamics)
2. Grows GDP (base growth + automation productivity boost)
3. Computes fiscal revenue capacity (based on which tax instruments are enabled)
4. Computes each of the nine income streams independently
5. Sums the nominal income streams
6. Applies the demonetization purchasing-power multiplier
7. Records the year's data point

There is no feedback between income streams — each is computed from its own formula using only global state variables (GDP, automation level, time, SWF balance) and user parameters. This is a deliberate simplification. In reality, these streams would interact (e.g., UBI spending would increase GDP, which would increase SWF contributions). Omitting feedback makes the model transparent and auditable at the cost of understating compound effects.

The one exception is the **SWF balance**, which is a genuine state variable that accumulates across years (contributions + returns - distributions). This is essential because the entire thesis depends on compounding — you cannot model a sovereign wealth fund without tracking its balance over time.

---

## 6. Baseline Constants & Calibration

| Constant | Value | Source / Rationale |
|---|---|---|
| `NUM_HH` | 131,000,000 | U.S. Census Bureau, ~131M households (2024) |
| `BASE_GDP` | $29,000,000,000,000 | BEA, U.S. GDP ~$29.0T (2024) |
| `BASE_YEAR` | 2025 | Simulation start year |
| `BASE_MEDIAN` | $83,730 | Census Bureau, real median household income (2024) |

**Calibration of starting income composition (2025):**

The whitepaper's decomposition for the median household is approximately:
- Wages: ~$68,660 (82%)
- Transfers (social insurance): ~$10,885 (13%)
- Capital income: ~$4,185 (5%)

These three numbers anchor the simulation at t=0. Each subsequent year's values are computed from formulas, not from a lookup table.

---

## 7. The Simulation Engine: Formula-by-Formula

### 7.1 Automation Level

```
automationLevel(t) = min(0.95, automationLevel(t-1) + pace × (1 + automationLevel(t-1)) × (1 - automationLevel(t-1)))
```

**Starting value:** 0.05 (5% in 2025)  
**Ceiling:** 0.95 (95% — full automation is asymptotically approached, never reached)  
**User parameter:** `automationPace` (default: 2.5%/yr)

**Why this formula:** The update rule `pace × (1 + x) × (1 - x)` produces logistic-style dynamics. At low automation levels, `(1 + x)` is close to 1 and `(1 - x)` is close to 1, so growth is approximately linear at the pace rate. As automation rises, `(1 + x)` provides mild acceleration (more automation enables more automation — a modest positive feedback) while `(1 - x)` provides deceleration (diminishing returns as remaining tasks get harder to automate). The net effect is an S-curve: slow start, acceleration through the middle, deceleration approaching the ceiling.

**Auxiliary variable — `autoFromBase`:**
```
autoFromBase = max(0, automationLevel - 0.05) / 0.95
```
This normalizes the automation level so that the 2025 starting point maps to 0.0 and the 95% ceiling maps to 1.0. Used by wages and demonetization to measure *change from today* rather than absolute level.

### 7.2 GDP Growth

```
gdp(t) = gdp(t-1) × (1 + baseGdpGrowth/100 + automationLevel × 0.025)
```

**User parameter:** `baseGdpGrowth` (default: 2.0% real)  
**Automation boost:** Up to 2.375% additional at 95% automation (0.95 × 0.025)

**Rationale:** Historical U.S. real GDP growth averages ~2–3%. The automation boost reflects the productivity gains from machines working 24/7, zero sick days, continuous improvement. At full automation, total growth approaches ~4.4%/yr (2.0 + 2.375), consistent with the whitepaper's GDP multiplier of ~2x by 2045 and ~3.5x by 2060+ under advanced scenarios. The 0.025 coefficient was calibrated to reproduce the whitepaper's cross-path GDP trajectories.

### 7.3 Revenue Factor

```
revenueFactor = min(1.0, 0.6 + [0.15 if VAT] + [0.10 if AutoLevy] + [0.08 if WealthTax])
```

**Range:** 0.6 (no new taxes) to 0.93 (all three enabled)

**What this does:** The revenue factor is a scalar applied to transfer-funded income streams (UBI, SWF contributions, data royalties). It represents the government's fiscal capacity to fund these programs. With only the existing tax base (income + payroll), fiscal capacity is limited to 60% of theoretical maximum. Each new revenue instrument expands capacity:

- **VAT (+0.15):** A broad consumption tax. The whitepaper models 10–20% VAT phased in through the transition (EU-level by Phase 3). VAT is the single largest revenue expander because it taxes consumption regardless of whether the producer is human or machine.
- **Automation levy (+0.10):** Replaces the eroding payroll tax base. As fewer humans are employed, payroll tax revenue falls; an automation levy taxes machine-generated value-add instead.
- **Wealth tax (+0.08):** 1–2% on wealth above $50M, revenue directed to SWF. Smaller impact because it targets a narrow base, but structurally important for preventing concentration.

**Design choice:** Rather than modeling each tax instrument's revenue explicitly (which would require elasticity assumptions, compliance rates, etc.), we use a single multiplicative scalar. This is a transparency trade-off: it's less realistic but immediately understandable. When you toggle off VAT, you can see exactly what happens — every transfer-dependent stream shrinks by a proportional amount.

### 7.4 Residual Wages

```
wageMultiplier = max(0.04, 1 - autoFromBase × 0.96)
productivityPremium = 1 + autoFromBase × 0.3
wages = max($3,000, $68,660 × wageMultiplier × productivityPremium)
```

**Base value:** $68,660 (calibrated to 2025 median wage income)  
**Floor:** $3,000/yr (even at maximum automation, some human provenance premium work exists)

**Logic:** Two opposing forces act on wages:

1. **Volume erosion** (`wageMultiplier`): As automation rises from today's level to full, the fraction of the workforce employed declines. The multiplier falls from 1.0 to 0.04 — a 96% reduction in the number of people earning wages. This is calibrated to match the whitepaper's projection of wage share falling from ~82% to ~2–14% across scenarios.

2. **Productivity premium** (`productivityPremium`): The humans who *do* remain employed are in higher-value, harder-to-automate roles. They benefit from working alongside AI (augmentation). The premium scales up to 30% above today's base. This reflects the whitepaper's observation that residual wages are concentrated in "human provenance premium" work — artisan, performance, bespoke care — which commands higher per-unit compensation.

The net effect: total wage income to the median household falls substantially, but not to zero. At `autoFromBase = 1.0`, wages = max($3,000, $68,660 × 0.04 × 1.3) = ~$3,570.

### 7.5 Social Insurance

```
social = $10,885 × (gdp / BASE_GDP)^0.25 × (1 + t × 0.005)
```

**Base value:** $10,885 (calibrated to current Social Security + Medicare + other social insurance receipts per median household)

**Logic:** Social insurance is modeled as a slow-growth baseline. The GDP elasticity of 0.25 means it grows with the economy but at a quarter of the pace — reflecting the institutional inertia of existing programs (benefits are indexed to CPI, not GDP). The linear time trend (0.5%/yr) captures gradual program expansion. Social insurance is always-on (no toggle) because these programs have massive institutional momentum and are politically nearly impossible to eliminate.

**Why it doesn't scale faster:** In reality, Social Security faces a funding crisis as the payroll tax base erodes. This model doesn't capture that risk — it assumes the programs persist at roughly current real levels, potentially funded by redirected revenue. This is an optimistic assumption. A more conservative model would apply the revenue factor here too.

### 7.6 Sovereign Wealth Fund Dividend

```
contribution(t) = (swfContribRate / 100) × gdp(t) × revenueFactor
returns(t)      = swfBalance(t-1) × (swfReturnRate / 100)
distribution(t) = swfBalance(t-1) × (swfSpendRule / 100)
swfBalance(t)   = swfBalance(t-1) + contribution(t) + returns(t) - distribution(t)
swfDividend(t)  = distribution(t) / NUM_HH
```

**User parameters:**
| Parameter | Default | Range | Rationale |
|---|---|---|---|
| `swfSeed` | $100B | 0–500B | Initial capitalization. Norway's GPFG started with oil revenues; $100B is a modest start for a $29T economy. |
| `swfContribRate` | 1.5% GDP | 0.1–5% | Annual contributions from tax revenue. The whitepaper models 0.5–2.5% GDP across phases. |
| `swfReturnRate` | 7.0% | 2–12% | Nominal return. Norway's GPFG has returned ~6.3% annualized since 1998. 7% is a common long-run equity assumption. |
| `swfSpendRule` | 3.0% | 1–6% | Percent of balance distributed annually. Norway uses ~3% real. Alaska's POMV is 5%. |

**This is the most important state variable in the model.** The SWF balance compounds over time. Contributions go in, returns accumulate, distributions go out. The spending rule is the critical governance parameter — it determines how much of the fund's returns flow to households vs. being reinvested for future growth. A lower spending rule means smaller current dividends but faster fund growth (and larger future dividends). A higher spending rule means more money now but risks depleting the fund.

**Key insight from the model:** The SWF takes 20–30 years to reach critical mass. At default parameters, the fund grows from $0.1T (2025) to ~$7T (2035) to ~$34T (2045) to ~$130T+ (2060). The dividend per household is negligible in the first decade but becomes a major income stream by Phase 4. This is why the whitepaper emphasizes "capital before crisis" — every year of delay in starting the compounding clock costs exponentially more than the year before it.

### 7.7 Universal Basic Income

```
ramp = min(1, t / ubiRampYears)
ubi = ubiMonthly × 12 × 1.5 × ramp × revenueFactor
```

**User parameters:**
| Parameter | Default | Range | Rationale |
|---|---|---|---|
| `ubiMonthly` | $2,000 | $250–5,000 | Per-adult monthly payment. $2,000/mo ≈ $24,000/yr, roughly the federal poverty line for a single adult. |
| `ubiRampYears` | 12 | 3–25 | Years to reach full deployment. Reflects political/logistical phase-in. |

**The 1.5 multiplier:** Represents ~1.5 adults per median household. UBI is paid per person, but the model tracks household income. Average U.S. household size is ~2.5 persons, of which ~1.5 are adults (18+).

**Revenue factor dependency:** UBI is the most fiscally intensive intervention — it requires annual tax revenue to fund. When revenue sources are disabled (VAT off, automation levy off, wealth tax off), the revenue factor drops from 0.93 to 0.60, and UBI shrinks proportionally. This models the real constraint: you can't write $2,000/month checks to every adult if you don't have the tax base to fund them.

**Ramp function:** Linear ramp from 0 to full over `ubiRampYears`. This is a simplification — real deployment would be lumpy (pilots → state programs → federal legislation). The linear ramp is a reasonable central tendency.

### 7.8 ESOP / Cooperative Profit Share

```
ramp = min(1, t / 5)
esop = min($30,000, $800 × (1 + esopGrowth/100)^t × (gdp/BASE_GDP)^0.3 × ramp)
```

**User parameter:** `esopGrowth` (default: 7%/yr coverage expansion)  
**Starting value:** ~$800/yr (current median household ESOP/profit-share income, for those who have it, diluted across all households)  
**Cap:** $30,000/yr  
**Ramp:** 5-year phase-in for initial legislation and tax incentive deployment

**Logic:** ESOP income grows exponentially as coverage expands (more companies adopt employee ownership structures) and GDP grows (more profit to share). The whitepaper cites 6,609 existing ESOP plans with 15.1M participants and $2.1T in assets. The model assumes aggressive expansion via tax incentives, particularly targeting the boomer business succession wave (~2.3M businesses changing hands). The GDP elasticity of 0.3 means ESOP profits grow with the economy but at a modest pace, reflecting that not all GDP growth flows to employee-owned firms.

### 7.9 Baby Bond Returns

```
if t >= babyBondMaturity:
    maturedValue = babyBondSeed × (1 + babyBondReturn/100)^babyBondMaturity
    cohortFraction = min(1, (t - babyBondMaturity) / 25)
    babyBonds = maturedValue × (babyBondReturn/100) × cohortFraction
else:
    babyBonds = 0
```

**User parameters:**
| Parameter | Default | Range | Rationale |
|---|---|---|---|
| `babyBondSeed` | $5,000 | $1K–50K | Government-funded investment at birth. Connecticut's program seeds $3,200. The whitepaper's moderate scenario uses $5,000–25,000. |
| `babyBondReturn` | 7.0% | 3–12% | Annual return on invested capital (S&P 500 index). |
| `babyBondMaturity` | 18 years | 12–25 | Age at which the individual can begin drawing returns. |

**Delayed onset:** Baby bonds produce zero income until the first cohort matures. At default parameters: bonds created in 2025 mature in 2043. This 18-year lag is the defining characteristic of baby bonds — they are the "ultimate long game" per the whitepaper.

**Cohort fraction:** After the first cohort matures, each subsequent year adds a new cohort of 18-year-olds with matured bonds. `cohortFraction` ramps linearly from 0 to 1 over 25 years, representing the gradual saturation of the working-age population with bond-holders. After 25 years post-maturity (2068 at defaults), every working-age adult has a matured baby bond.

**Matured value at defaults:** $5,000 × (1.07)^18 = $16,906. Annual return: $16,906 × 0.07 = $1,183. This grows to full population coverage over 25 years.

### 7.10 Data / AI Royalty

```
ramp = min(1, t / 8)
dataRoyalty = dataRoyaltyMax × automationLevel × (gdp/BASE_GDP)^0.4 × revenueFactor × ramp
```

**User parameter:** `dataRoyaltyMax` (default: $12,000/HH at full automation)  
**Ramp:** 8-year phase-in (legislative design + implementation + legal challenges)

**Logic:** A data/AI royalty taxes the use of collective data and AI-generated value, distributing proceeds per capita. The payment scales with three factors:
1. **Automation level:** More automation → more AI-generated value → more royalty revenue.
2. **GDP:** Larger economy → larger royalty base.
3. **Revenue factor:** Implementation requires tax infrastructure.

The 8-year ramp reflects the reality that data royalty legislation doesn't exist yet and would require novel legal frameworks, international coordination, and extensive political negotiation. The whitepaper's Phase 2 (2030–2035) targets establishing the framework; Phase 3 (2035–2045) achieves full scale.

### 7.11 Carbon / Commons Dividend

```
ramp = min(1, t / 3)
carbon = carbonBase × (1 + carbonGrowth/100)^t × ramp
```

**User parameters:**
| Parameter | Default | Range | Rationale |
|---|---|---|---|
| `carbonBase` | $900/yr | $200–3,000 | Starting per-household dividend. Canada's carbon pricing returned CAD $1,120 (~$900 USD) per family in 2024. |
| `carbonGrowth` | 4%/yr | — | Annual growth in carbon price (and thus dividend). Reflects escalating carbon price schedules. |

**Ramp:** 3-year phase-in (shortest of any intervention — carbon tax + dividend is the most legislatively mature proposal).

**Logic:** Carbon dividends are the simplest intervention: tax carbon emissions, distribute 100% of proceeds per capita. The model assumes exponential growth in the carbon price (and thus dividend) as climate policy tightens. This stream is independent of the revenue factor — it's self-funding by definition.

### 7.12 Private Investment Returns

```
privateInv = privateInvBase × (1 + privateInvGrowth/100)^t × (gdp/BASE_GDP)^0.2
```

**Base value:** $4,185/yr (current median household capital income from all private sources — dividends, interest, rent, 401k distributions)  
**Growth rate:** 3.5%/yr  
**GDP elasticity:** 0.2

**Always on:** Private investment returns have no toggle because they exist in the baseline — every household has some capital income today (even if it's just bank interest). The model assumes modest organic growth as financial literacy increases and capital-broadening policies (ESOPs, baby bonds, auto-enrollment retirement accounts) take effect over time.

**Why the GDP elasticity is low (0.2):** Capital returns to the *median* household grow much slower than GDP because the median household has very little capital. The wealthy capture most of the GDP-to-capital-returns linkage. The 0.2 elasticity reflects modest democratization of capital ownership over time.

### 7.13 Demonetization / Deflation Gain

```
costReduction = (demonetRate / 100) × autoFromBase
if costReduction > 0 and costReduction < 1:
    purchasingPowerMultiplier = 1 / (1 - costReduction)
    demonetGain = nominalTotal × (purchasingPowerMultiplier - 1)
```

**User parameter:** `demonetRate` (default: 35% — maximum cost reduction at full automation)

**This is the most conceptually novel stream.** It represents the purchasing power gain from AI-driven cost deflation. When AI makes healthcare, education, legal services, and digital goods dramatically cheaper, a household's nominal income buys more. The model treats this as equivalent to additional income.

**Example:** If nominal income is $100,000 and costs have fallen 25%, then $100,000 buys what $133,333 would have bought at today's prices. The "demonetization gain" is $33,333 — the purchasing power equivalent of extra income.

**The formula:** The purchasing power multiplier is `1 / (1 - costReduction)`. This is a standard deflation-to-real-income conversion. At 35% cost reduction (full automation at defaults), the multiplier is 1 / (1 - 0.35) = 1.538, meaning every dollar of nominal income is worth $1.54 in today's purchasing power.

**Why `autoFromBase` instead of `automationLevel`:** We measure cost reduction relative to today, not relative to zero automation. In 2025, the cost structure is the baseline. Demonetization gain only appears as automation *increases from today's level*.

**Sensitivity note:** This is the most speculative parameter. Reasonable people could argue the max cost reduction should be 15% or 60%. The slider range (0–60%) lets users explore the full range.

### 7.14 Total Effective Household Income

```
nominalTotal = wages + social + ubi + swf + esop + babyBonds + dataRoyalty + carbon + privateInv
effectiveTotal = nominalTotal + demonetGain
```

All values are in constant 2024 dollars. The model does not include an inflation adjustment because all growth rates are specified in real terms. The demonetization gain is additive — it converts the nominal total into an effective purchasing-power-equivalent total.

---

## 8. Default Parameter Values & Justifications

| Parameter | Default | Units | Justification |
|---|---|---|---|
| `endYear` | 2060 | year | 35-year horizon. Matches whitepaper's Phase 4 maturity target. |
| `automationPace` | 2.5 | %/yr | Moderate pace. Produces ~50% automation by 2040, ~80% by 2055. |
| `baseGdpGrowth` | 2.0 | % real | CBO long-run potential GDP growth estimate. |
| `swfSeed` | 100 | $B | Modest initial capitalization (~0.3% of GDP). |
| `swfContribRate` | 1.5 | % GDP | Whitepaper's Phase 1–2 range (0.5–2.5%). Midpoint. |
| `swfReturnRate` | 7.0 | % nominal | Long-run global equity return. Norway GPFG: 6.3% since 1998. |
| `swfSpendRule` | 3.0 | % | Norway's fiscal rule. Conservative; preserves real fund value. |
| `ubiMonthly` | 2,000 | $/adult/mo | ~Federal poverty line. Whitepaper's Phase 2–3 target range ($1K–$3K). |
| `ubiRampYears` | 12 | years | Full deployment by ~2037. Matches whitepaper's Phase 2–3 transition. |
| `babyBondSeed` | 5,000 | $ | Whitepaper's moderate scenario. Connecticut seeds $3,200. |
| `babyBondReturn` | 7.0 | % | S&P 500 long-run average. Federal Trump Accounts use S&P 500 index. |
| `babyBondMaturity` | 18 | years | Age of majority. First cohort matures 2043. |
| `esopGrowth` | 7.0 | %/yr | Aggressive coverage expansion from boomer succession + tax incentives. |
| `dataRoyaltyMax` | 12,000 | $/HH | Whitepaper's moderate estimate at full automation. Highly speculative. |
| `carbonBase` | 900 | $/HH/yr | Calibrated to Canada's 2024 carbon rebate (~CAD $1,120/family). |
| `carbonGrowth` | 4.0 | %/yr | Carbon price escalation consistent with net-zero pathways. |
| `privateInvBase` | 4,185 | $/HH/yr | BEA: current median household capital income (dividends + interest + rent). |
| `privateInvGrowth` | 3.5 | %/yr | Organic capital accumulation + modest democratization. |
| `demonetRate` | 35 | % | Maximum cost reduction at full automation. Speculative but conservative vs. some AI-deflation estimates. |

---

## 9. Preset Scenarios

### Proactive (default)
All interventions enabled. All revenue sources enabled. Default parameter values. Models the whitepaper's recommended path: policy leads automation, SWF capitalized early, UBI ramped during Phase 2, baby bonds started in 2025.

### Reactive
Same as Proactive except: SWF seed = $0 (no initial capitalization), SWF contribution rate = 0.8% GDP (lower), UBI ramp = 18 years (slower), baby bond seed = $2,000 (smaller). Models crisis-driven policy that follows automation rather than leading it. Policy arrives but is less generous and later.

### Delayed
Most capital-building programs disabled: SWF off, baby bonds off, data royalty off, ESOPs off. VAT off, wealth tax off. UBI ramp extended to 22 years. This is the "political failure" scenario — society relies primarily on UBI funded by the existing tax base, without building the capital infrastructure that eventually reduces transfer dependence.

### No Action
Every intervention toggled off. No SWF, no UBI, no baby bonds, no carbon dividend, no data royalty, no ESOPs, no demonetization. The only income streams are residual wages, social insurance (inertia-maintained), and organic private investment growth. This shows what happens when automation proceeds without any policy response — the "deflationary death spiral" scenario.

---

## 10. Revenue Source Toggles: How They Affect the Model

Revenue toggles do NOT directly create income streams. They modulate the **revenue factor** (see §7.3), which scales three transfer-dependent streams:

| Revenue source | Revenue factor contribution | Streams affected |
|---|---|---|
| VAT | +0.15 | UBI, SWF contributions, Data royalty |
| Automation Levy | +0.10 | UBI, SWF contributions, Data royalty |
| Wealth Tax | +0.08 | UBI, SWF contributions, Data royalty |
| (baseline) | 0.60 | — |

**Example:** With all three enabled, revenueFactor = min(1.0, 0.6 + 0.15 + 0.10 + 0.08) = 0.93. With none enabled, revenueFactor = 0.60. This means UBI, SWF contributions, and data royalties all shrink by ~35% when all new revenue sources are disabled.

**Streams NOT affected by revenue factor:** Wages, social insurance, baby bond returns (these are investment returns, not tax-funded), ESOP income, carbon dividend (self-funding), private investment, demonetization. These streams operate independently of fiscal capacity.

---

## 11. Intervention Toggles: What Each One Controls

| Toggle | Streams directly affected | Secondary effects |
|---|---|---|
| Enable SWF | SWF dividend appears/disappears | SWF balance accumulation stops |
| Enable UBI | UBI stream appears/disappears | (none) |
| Enable Baby Bonds | Baby bond returns appear/disappear after maturity | (none) |
| Enable ESOP | ESOP/co-op stream appears/disappears | (none) |
| Enable Data Royalty | Data royalty stream appears/disappears | (none) |
| Enable Carbon | Carbon dividend stream appears/disappears | (none) |
| Enable Demonetization | Demonetization gain appears/disappears | Affects effective total but not nominal streams |
| Enable VAT | (none directly) | Revenue factor changes → scales UBI, SWF contrib, data royalty |
| Enable Automation Levy | (none directly) | Revenue factor changes → scales UBI, SWF contrib, data royalty |
| Enable Wealth Tax | (none directly) | Revenue factor changes → scales UBI, SWF contrib, data royalty |

When a toggle is off, related sliders are grayed out (disabled). The corresponding stream contributes $0 to the stacked chart.

---

## 12. UI Architecture

### JSX Version (Claude.ai artifact)
- **Framework:** React 18 with hooks (`useState`, `useMemo`, `useCallback`)
- **Charting:** Recharts `AreaChart` with stacked `Area` components, gradient fills, custom tooltip
- **Layout:** Flexbox — collapsible left panel (300px) + main chart area
- **State management:** Single `params` state object; `set(key, value)` updater
- **Reactivity:** `useMemo` on `simulate(params)` — chart recomputes on any parameter change

### HTML Version (standalone)
- **Framework:** Vanilla JavaScript (zero dependencies beyond Chart.js)
- **Charting:** Chart.js 4.4 with stacked line chart (`fill: true`), custom tooltip callbacks, and a plugin for the reference line
- **Layout:** Same visual structure, built with CSS classes + DOM manipulation
- **State management:** Global `P` object; `update()` function re-simulates and rebuilds chart
- **Panel:** Built programmatically by `buildPanel()` → `makeSection()` → `makeSlider()` / `makeToggle()`

### Why Chart.js for standalone (not Recharts)
Recharts' UMD bundle has complex dependency chains (it expects React's UMD globals to be wired in a specific way, plus prop-types, and its own internal module system). In testing, loading Recharts + React + Babel standalone from CDN produced silent failures — the loading spinner would spin indefinitely. Chart.js has a single, self-contained UMD bundle (~200KB) that loads reliably from any CDN with zero configuration. For a "double-click to open" file, reliability trumps API elegance.

---

## 13. Design Decisions & Trade-Offs

**Decision: Deterministic simulation, no stochastic elements.**  
*Trade-off:* The model produces a single trajectory per parameter set, which can create false precision. In reality, every parameter has uncertainty. We chose determinism because (a) the point is structural intuition, not forecasting, (b) stochastic simulations require displaying confidence bands, which makes the chart harder to read, and (c) users can manually explore uncertainty by adjusting parameters.

**Decision: No feedback loops between income streams.**  
*Trade-off:* In reality, UBI spending increases GDP, which increases SWF contributions, which increases future dividends. Omitting this understates compound effects. We chose no feedback because (a) it makes every formula independently auditable, (b) feedback loops can produce unrealistic runaway dynamics in toy models, and (c) the SWF is already a feedback loop (it compounds), which captures the most important dynamic.

**Decision: Single representative household (median).**  
*Trade-off:* Distributional effects are invisible. The model can't show that the bottom quintile benefits more from UBI or that the top quintile captures more capital income. We chose a single household because (a) the whitepaper's central argument is about the median, (b) distributional modeling requires a full household microsimulation, which is a different class of tool, and (c) the median is the politically salient metric.

**Decision: Constant 2024 dollars throughout.**  
*Trade-off:* We don't model inflation, which means we can't capture the interaction between monetary policy and fiscal expansion. All growth rates are implicitly real rates. We chose constant dollars because (a) inflation modeling requires a macro model, (b) it eliminates a source of confusion (users don't have to mentally deflate), and (c) it's how the whitepaper frames its estimates.

**Decision: Revenue factor as a scalar rather than per-tax modeling.**  
*Trade-off:* We can't show the revenue composition or model Laffer-curve effects. We chose the scalar because (a) per-tax modeling requires assumptions about tax bases, elasticities, and compliance that would dwarf the rest of the model in complexity, (b) the scalar captures the structural insight (more tax instruments = more fiscal capacity), and (c) it's immediately legible.

**Decision: Demonetization as additive purchasing power.**  
*Trade-off:* This conflates nominal income with real purchasing power, which is technically incorrect (they're different concepts). We chose to add it because (a) the whitepaper's framing explicitly converts cost reduction to "effective purchasing power equivalent," (b) showing it as a separate colored band in the stacked chart makes the demonetization thesis visible and debatable, and (c) separating nominal and real charts would require two charts and confuse most users.

---

## 14. Known Limitations

1. **No macroeconomic feedback.** GDP is exogenous, not endogenous. Household spending doesn't feed back into GDP growth. Inflation doesn't respond to fiscal expansion. Interest rates don't adjust.

2. **No distributional modeling.** Everything is the median household. Inequality dynamics, quintile-specific effects, and regional variation are invisible.

3. **No political economy.** The model assumes policies, once enacted, persist. In reality, SWFs can be raided, UBI can be repealed, tax policy oscillates with elections. The whitepaper's "transfer trap" (where political dependency corrodes democratic accountability) is not modeled.

4. **No international dynamics.** Trade, capital flows, immigration, competitive tax arbitrage, and geopolitical disruption are all absent.

5. **No labor market dynamics.** There's no unemployment rate, no wage bargaining, no sectoral composition, no skill distribution. Wages decline as a smooth function of automation level.

6. **Automation level is exogenous.** The pace of automation doesn't respond to policy choices. In reality, an automation levy might slow adoption; UBI might accelerate it (by raising the effective minimum wage).

7. **Baby bond returns assume constant investment return.** In reality, sequence-of-returns risk means the matured value varies enormously depending on when the person turns 18.

8. **The revenue factor is crude.** It doesn't model fiscal sustainability — whether the government can actually fund the implied spending levels. The whitepaper's tax-to-GDP ratios (41–50% in moderate-to-advanced scenarios) are high by U.S. standards, normal by Nordic standards. The model doesn't flag when spending exceeds revenue.

9. **No housing, healthcare, or education cost modeling.** The demonetization parameter is a single scalar applied to all costs. In reality, some costs (housing) may not deflate with automation, while others (digital services) may deflate dramatically.

10. **No demographic modeling.** Household count, dependency ratios, and population aging are static.

---

## 15. Mapping to Source Material

| Whitepaper concept | Simulator implementation |
|---|---|
| "Three Buckets" (wages, capital, transfers) | Nine streams roll up into three buckets. Wages = residual wages. Capital = SWF dividend + ESOP + baby bonds + data royalty + private investment + carbon dividend. Transfers = UBI + social insurance. |
| "Deflationary death spiral" | Visible in "No Action" preset — wages collapse with no replacement, total income falls below today's median. |
| "Capital before crisis" | Visible by comparing Proactive vs. Delayed — the SWF balance divergence is exponential. |
| "The bridge problem" | UBI carries the heaviest load during Phase 3 (2035–2045) while the SWF is still immature. Visible in the chart as the green UBI band expanding before the orange SWF band catches up. |
| "Transfer trap" | Visible in Delayed preset — without capital-building, the system is permanently transfer-dependent. |
| "Fiscal scissors" | Modeled by disabling revenue sources — when VAT and automation levy are off, transfer streams shrink (simulating eroding payroll tax base). |
| "$300K effective household income" | Achievable in the model at advanced scenarios (high automation pace, long time horizon, all interventions enabled, moderate demonetization). |
| "Human provenance premium" | The wage floor ($3,000) and productivity premium (up to 30%) represent the residual boutique economy. |
| Cross-model convergence (GPT/Grok/Claude) | The whitepaper's five scenarios (ultra-conservative through ultra-advanced) can be approximately reproduced by adjusting automation pace and end year. The model's moderate-scenario output (~$142K at 2060) matches the whitepaper's S3 moderate scenario ($142,577). |

---

## 16. Extending the Model

**To add a new income stream:**
1. Add a new entry to `STREAMS` / `STREAM_META` (key, label, color).
2. Add a default parameter and toggle to `DEFAULTS`.
3. Add the computation in the simulation loop (between "NOMINAL TOTAL" and the `data.push`).
4. Include the new key in the `nominalTotal` sum.
5. Add UI controls (toggle + sliders) in the panel builder.
6. Add the stream to the `activeStreams` filter.

**To add distributional modeling:**
Replace the single-household simulation with a cohort model (e.g., quintile-specific wage bases, capital holdings, and transfer eligibility). This would require 5× the computation and a more complex chart (small multiples or dropdown selector).

**To add feedback loops:**
Make GDP endogenous: `gdp(t) = f(gdp(t-1), totalHouseholdSpending(t-1), investment(t-1))`. This requires assumptions about marginal propensity to consume, investment multipliers, and import leakage. Start simple (Keynesian multiplier) and iterate.

**To add fiscal sustainability checks:**
Track total government revenue (sum of all tax instruments × their respective bases) and total government spending (UBI + social insurance + SWF contributions + baby bond seeds + administrative overhead). Display the fiscal balance as a secondary chart or warning indicator.

---

*This documentation is released alongside the simulator code. Both are intended for educational and exploratory purposes. The model is a toy — treat its outputs as structured what-if scenarios, not forecasts.*
