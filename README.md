# 🌍 CarbonLens — Carbon Footprint Awareness Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white)](#)
[![CSS3](https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=white)](#)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=black)](#)
[![Chart.js](https://img.shields.io/badge/Chart.js-FF6384?logo=chartdotjs&logoColor=white)](https://www.chartjs.org/)

> A comprehensive, India-specific carbon footprint tracking platform that empowers individuals to measure, understand, and reduce their environmental impact through data-driven insights, gamification, and actionable recommendations.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Module Reference](#module-reference)
- [Data Model](#data-model)
- [Getting Started](#getting-started)
- [Deployment](#deployment)
- [Emission Factor Sources](#emission-factor-sources)
- [Browser Support](#browser-support)
- [License](#license)

---

## Overview

### Problem Statement

India's per-capita carbon emissions stand at **1.9 tons CO₂/year** — below the global average of 4.7 tons but rising rapidly with urbanization. Most individuals lack awareness of how daily habits (commute mode, diet, AC usage, online shopping, streaming) contribute to their personal carbon footprint. Existing tools are Western-centric and don't account for Indian energy grids, transport modes (auto-rickshaws, metros), cooking fuels (LPG/PNG), or dietary patterns.

### Solution

**CarbonLens** is a zero-backend, privacy-first Single Page Application (SPA) that calculates personal carbon footprints across **5 emission categories** using India-specific emission factors. It provides real-time equivalence visualizations, personalized reduction strategies with ₹ savings estimates, and uses behavioral gamification (badges, streaks, virtual forest) to drive sustained engagement.

### Key Differentiators

| Feature | CarbonLens | Generic Calculators |
|---------|-----------|-------------------|
| **Localization** | India-specific factors (ISRO/BEE/CEA) | Western averages |
| **Transport Modes** | Auto-rickshaw, metro, train, EV | Car-only |
| **Cooking Fuel** | LPG cylinder, PNG, induction | Gas/electric only |
| **Diet Categories** | Non-veg, vegetarian, vegan (Indian context) | Generic |
| **Currency** | ₹ savings estimates | USD only |
| **Privacy** | 100% client-side (localStorage) | Server-dependent |
| **Gamification** | 12 badges, 5 levels, virtual forest | None |

---

## Key Features

### 🧮 5-Category Carbon Calculator
Multi-step wizard covering Transport → Energy → Food → Shopping → Digital with real-time per-step emission calculations, interactive range sliders, and animated results breakdown.

### 📊 Interactive Dashboard
- Animated monthly/yearly footprint counters
- Benchmark comparison bar: India Avg (1.9t) → Global Avg (4.7t) → Paris Target (2.1t)
- 4-card equivalence grid (trees needed, Delhi-Mumbai flights, LED bulbs, phone charges)
- Category breakdown doughnut chart + monthly trend line chart (Chart.js)
- Personalized quick-action tips based on highest-impact category

### 📋 Activity Tracker
- 8 one-tap quick-log presets (car, bus, metro, cycling, meals, AC, shopping, streaming)
- Custom activity logger with category selector and CO₂ input
- GitHub-style activity heatmap calendar (90 days, 5-level color scale)
- Filterable history timeline (Today / Week / Month tabs)

### 🔍 Smart Insights Engine
- Automatic biggest-impact category identification with contextual messaging
- 5 personalized "What-If" scenarios with calculated CO₂ and ₹ monthly savings
- 8 India-specific actionable tips (pressure cookers, solar heaters, metro, seasonal produce)
- Aggregate potential savings summary (CO₂, money, trees equivalent)

### 🏆 Gamification System
- **12 Earnable Badges**: Seedling, Green Starter, Tree Hugger, Earth Guardian, Energy Saver, Cycle Champion, Plant Power, Zero Waste, Digital Detox, Century Club, Half Footprint, Carbon Neutral
- **5-Tier Level System**: Seedling → Sprout → Sapling → Tree → Forest Guardian
- **Streak Tracking**: Consecutive daily logging with best-streak persistence
- **Virtual Forest**: SVG-rendered trees growing proportionally to CO₂ saved (1 tree / 10 kg)
- **Weekly Challenges**: 4 rotating challenges with progress bars and XP rewards

### 🎨 Premium UI/UX
- Dark-mode glassmorphism design with `backdrop-filter: blur(20px)`
- 15+ CSS keyframe animations (fadeIn, slideUp, float, growIn, glowPulse, shimmer, particleFloat)
- Smooth SPA screen transitions with module lifecycle management
- Mobile-first responsive design (480px / 768px / 1024px breakpoints)
- Custom scrollbar, selection styling, and toast notifications

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    index.html (SPA Shell)                    │
│  7 Screens: Landing → Onboarding → Dashboard → Calculator   │
│             → Tracker → Insights → Achievements             │
├─────────────────────────────────────────────────────────────┤
│                 app.js (Router / Orchestrator)               │
│         Handles navigation, onboarding, event wiring        │
├─────────────────────────────────────────────────────────────┤
│              Feature Modules (init + refresh lifecycle)      │
│  ┌────────────┐ ┌──────────┐ ┌────────┐ ┌────────────────┐  │
│  │ calculator │ │dashboard │ │tracker │ │   insights     │  │
│  │    .js     │ │   .js    │ │  .js   │ │     .js        │  │
│  └────────────┘ └──────────┘ └────────┘ └────────────────┘  │
│  ┌──────────────┐                                           │
│  │ gamification │                                           │
│  │    .js       │                                           │
│  └──────────────┘                                           │
├─────────────────────────────────────────────────────────────┤
│           Core Libraries (loaded first, no DOM deps)        │
│  ┌────────────────┐  ┌──────────┐  ┌────────────┐          │
│  │emission-factors│  │ storage  │  │   charts   │          │
│  │     .js        │  │   .js    │  │    .js     │          │
│  └────────────────┘  └──────────┘  └────────────┘          │
├─────────────────────────────────────────────────────────────┤
│               localStorage (Browser, Key Prefix: carbonlens_)│
└─────────────────────────────────────────────────────────────┘
```

### Design Patterns

- **IIFE Module Pattern**: Each file is a self-contained IIFE exposing `init()` and `refresh()` on `window`
- **Event-Driven Communication**: Modules communicate via `CustomEvent` on `document` (`carbonlens:footprint-updated`, `carbonlens:activity-logged`, `carbonlens:achievement-unlocked`)
- **Centralized State**: `CarbonStorage` is the single source of truth with JSON serialization
- **Lazy Rendering**: Dynamic sections render only when their screen becomes active
- **Fresh-Start Model**: All data is cleared on every page load for demo/presentation mode

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Markup** | HTML5 (Semantic) | SPA shell with 7 section-based screens |
| **Styling** | Vanilla CSS3 | Design system with 30+ CSS custom properties, glassmorphism, 15+ animations |
| **Logic** | Vanilla JavaScript (ES6+) | Modular IIFE architecture, zero framework dependency |
| **Charts** | Chart.js 4.4.7 (CDN) | Doughnut, line, and bar chart visualizations |
| **Fonts** | Google Fonts (CDN) | Inter 400/500/600 (body) + Outfit 600/700/800 (headings) |
| **Storage** | localStorage API | Zero-backend client-side persistence |
| **Deployment** | GitHub Pages / Netlify | Static hosting, no build step required |

### Why Zero-Framework?

- **No build step**: Push to GitHub → live. No `npm install`, no Webpack, no transpilation
- **Minimal bundle**: ~210 KB total (vs. 200KB+ for React alone)
- **Judge-friendly**: Clean, readable vanilla code — no black-box abstractions
- **Instant load**: No hydration delay — DOM is immediately interactive

---

## Project Structure

```
carbon-footprint-platform/
├── index.html                    # SPA shell — 7 screens, 888 lines
├── README.md                     # Technical documentation
├── LICENSE                       # MIT License
├── .gitignore                    # Git exclusions
│
├── css/
│   ├── design-system.css         # CSS reset, variables, typography, 15+ animations
│   ├── components.css            # Reusable UI: cards, buttons, forms, badges, toast
│   └── pages.css                 # Per-screen layouts + responsive breakpoints
│
└── js/
    ├── emission-factors.js       # India-specific CO₂ coefficients (data-only)
    ├── storage.js                # localStorage CRUD with carbonlens_ prefix
    ├── charts.js                 # Chart.js dark-theme factory wrappers
    ├── calculator.js             # 5-step calculator wizard + formula engine
    ├── dashboard.js              # Stats, benchmark, equivalents, charts, tips
    ├── tracker.js                # Quick-log, custom logger, heatmap, history
    ├── insights.js               # What-if scenarios, tips, savings analysis
    ├── gamification.js           # Badges, levels, streaks, virtual forest, challenges
    └── app.js                    # Main orchestrator — routing, onboarding, init
```

| File | Size | Lines | Role |
|------|------|-------|------|
| `index.html` | 35.6 KB | 888 | SPA markup shell |
| `design-system.css` | 6.8 KB | 415 | Design tokens & animations |
| `components.css` | 28.6 KB | 1300+ | All UI component styles |
| `pages.css` | 19.8 KB | 1060+ | Page layouts & responsive |
| `emission-factors.js` | 4.1 KB | ~120 | Data constants |
| `storage.js` | 7.1 KB | ~220 | Persistence API |
| `charts.js` | 9.2 KB | ~280 | Chart.js wrappers |
| `calculator.js` | 16.6 KB | ~440 | Calculator logic |
| `dashboard.js` | 12.4 KB | ~330 | Dashboard rendering |
| `tracker.js` | 18.3 KB | ~500 | Activity tracking |
| `insights.js` | 10.8 KB | ~250 | Insights engine |
| `gamification.js` | 22.1 KB | ~560 | Gamification system |
| `app.js` | 14.9 KB | ~415 | App orchestrator |
| **Total** | **~210 KB** | **~6800** | |

---

## Module Reference

### `window.EmissionFactors` — Data Layer
```javascript
EmissionFactors.transport.car_petrol     // 0.21 kg CO₂/km
EmissionFactors.transport.metro          // 0.041 kg CO₂/km
EmissionFactors.transport.auto_rickshaw  // 0.15 kg CO₂/km
EmissionFactors.energy.electricity_per_kwh // 0.82 kg CO₂/kWh (India grid avg)
EmissionFactors.energy.lpg_per_cylinder  // 44.1 kg CO₂/cylinder
EmissionFactors.food.non_vegetarian      // 7.2 kg CO₂/day
EmissionFactors.food.vegetarian          // 3.8 kg CO₂/day
EmissionFactors.food.vegan              // 2.9 kg CO₂/day
EmissionFactors.convertToEquivalents(kgCO2PerYear)  // → {trees, flights, bulbs, phones}
```

### `window.CarbonStorage` — Persistence API
```javascript
CarbonStorage.getUserProfile()       // → {name, city, transport, distance, diet, electricity, fuel}
CarbonStorage.setUserProfile(obj)
CarbonStorage.getFootprint()         // → {transport, energy, food, shopping, digital, total, monthly, yearly}
CarbonStorage.setFootprint(obj)
CarbonStorage.getActivities()        // → [{id, date, category, description, amount, co2, timestamp}]
CarbonStorage.addActivity(obj)       // Auto-assigns id + timestamp
CarbonStorage.getAchievements()      // → {badges:[], streaks:{current,best,lastDate}, xp, level, co2Saved}
CarbonStorage.isOnboarded()          // → boolean
CarbonStorage.clearAll()             // Wipe all carbonlens_ keys
```

### `window.Charts` — Visualization Factory
```javascript
Charts.init()                                        // Set Chart.js dark-theme defaults
Charts.createDoughnut(canvasId, {labels, data, colors})  // → Chart instance
Charts.createLine(canvasId, {labels, datasets})          // → Chart instance
Charts.createBar(canvasId, labels, data, colors)         // → Chart instance
Charts.destroyChart(instance)                            // Safe destroy
```

### Feature Modules — Lifecycle
```javascript
// Each module exposes init() + refresh()
Calculator.init()     →  Calculator.refresh()     →  Calculator.getAllEmissions()
Dashboard.init()      →  Dashboard.refresh()
Tracker.init()        →  Tracker.refresh()
Insights.init()       →  Insights.refresh()
Gamification.init()   →  Gamification.refresh()
```

### `window.App` — Orchestrator
```javascript
App.navigateTo('dashboard')   // Switch screen + call module.refresh()
App.showNav()                 // Show bottom navigation bar
App.hideNav()                 // Hide bottom navigation bar
```

---

## Data Model

### localStorage Keys

| Key | Type | Description |
|-----|------|-------------|
| `carbonlens_profile` | Object | User profile from onboarding |
| `carbonlens_footprint` | Object | Latest footprint calculation |
| `carbonlens_activities` | Array | All logged activities |
| `carbonlens_achievements` | Object | Badges, streaks, XP, level |
| `carbonlens_onboarded` | Boolean | Onboarding completion flag |
| `carbonlens_monthly_history` | Array | Monthly footprint snapshots |

### Custom Events

| Event | Payload | Emitted By |
|-------|---------|------------|
| `carbonlens:footprint-updated` | `{transport, energy, food, shopping, digital, total}` | Calculator, App |
| `carbonlens:activity-logged` | `{id, category, description, co2}` | Tracker |
| `carbonlens:achievement-unlocked` | `{badge}` | Calculator, Gamification |
| `carbonlens:screen-change` | `{screen}` | App |

---

## Getting Started

### Prerequisites
- A modern web browser (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)

### Run Locally

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/carbon-footprint-platform.git
cd carbon-footprint-platform

# Serve with Python (built-in)
python -m http.server 8080

# OR with Node.js
npx serve .

# OR with VS Code Live Server extension
# Right-click index.html → "Open with Live Server"
```

Open **http://localhost:8080** in your browser.

### User Flow
1. **Landing** → Click "🚀 Get Started"
2. **Onboarding** → Enter name, select transport/diet/energy options (4 steps)
3. **Dashboard** → View auto-estimated footprint, charts, and personalized tips
4. **Calculator** → Run detailed 5-step calculation → Save results
5. **Tracker** → Quick-log daily activities, view heatmap
6. **Insights** → Explore what-if scenarios and India-specific tips
7. **Achievements** → Check badges, level progress, virtual forest

---

## Deployment

### GitHub Pages (Recommended)

```bash
git init
git add .
git commit -m "feat: CarbonLens v1.0"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/carbon-footprint-platform.git
git push -u origin main
```

Then: Repository **Settings** → **Pages** → Branch: `main` → `/ (root)` → **Save**

Live at: `https://YOUR_USERNAME.github.io/carbon-footprint-platform/`

### Alternative Platforms

| Platform | Method | URL |
|----------|--------|-----|
| **Netlify** | Drag & drop folder at [netlify.com/drop](https://app.netlify.com/drop) | `*.netlify.app` |
| **Vercel** | `npx vercel --prod` | `*.vercel.app` |
| **Surge** | `npx surge ./ carbonlens.surge.sh` | `carbonlens.surge.sh` |

> No build step required for any platform — pure static files.

---

## Emission Factor Sources

| Category | Source | Value |
|----------|--------|-------|
| Electricity Grid | Central Electricity Authority (CEA), India 2023 | 0.82 kg CO₂/kWh |
| Transport Modes | TERI / MoRTH India | Per-mode factors |
| LPG Emissions | Petroleum Conservation Research Association (PCRA) | 44.1 kg CO₂/cylinder |
| Food / Diet | FAO, IPCC AR6 (adapted for India) | Daily rates by diet |
| Digital | International Energy Agency (IEA) 2023 | Per-hour/per-action |
| Benchmarks | World Bank 2023 | India: 1.9t, Global: 4.7t |

---

## Browser Support

| Browser | Version | Status |
|---------|---------|--------|
| Chrome / Edge | 90+ | ✅ Full Support |
| Firefox | 88+ | ✅ Full Support |
| Safari | 14+ | ✅ Full Support |
| Mobile Chrome | 90+ | ✅ Full Support |
| Mobile Safari | 14+ | ✅ Full Support |

---

## License

This project is licensed under the **MIT License** — see [LICENSE](LICENSE) for details.

---

<div align="center">
  <strong>Built with 💚 for a greener planet</strong>
  <br>
  <em>CarbonLens — Know Your Carbon Footprint</em>
</div>
