/**
 * CarbonLens — Insights Module
 * Analyses the user's footprint and provides actionable reduction strategies,
 * what-if scenarios, India-specific tips, and potential savings.
 *
 * Dependencies: EmissionFactors, CarbonStorage (loaded before this file)
 */

window.Insights = (() => {
  'use strict';

  /* ── DOM References ── */
  let els = {};

  /* ── India-Specific Tips ── */
  const TIPS = [
    { emoji: '🍲', title: 'Use a pressure cooker',      desc: 'Saves 70% cooking energy compared to regular pots. A staple in Indian kitchens for a reason!' },
    { emoji: '☀️', title: 'Solar water heater',          desc: 'Reduces water heating energy by 30%. Ideal for Indian climate with 300+ sunny days.' },
    { emoji: '🚗', title: 'Carpool to work',              desc: 'Saves ₹3,000+/month and cuts 40 kg CO₂. Share rides with colleagues.' },
    { emoji: '👕', title: 'Line-dry clothes',              desc: 'Skip the dryer — Indian weather is perfect for air-drying. Saves 2.5 kg CO₂/load.' },
    { emoji: '🚇', title: 'Use public metro',             desc: '6× less CO₂ than driving alone. Delhi Metro alone saves 5.7 lakh tons CO₂/year.' },
    { emoji: '🥬', title: 'Buy local & seasonal',         desc: 'Reduces food miles significantly. Visit your local sabzi mandi!' },
    { emoji: '🔌', title: 'Kill standby power',           desc: 'Turn off appliances at the switch. Saves 10% of electricity bill.' },
    { emoji: '🌱', title: 'Plant-based Mondays',          desc: 'One day a week makes a big difference. Try dal, rajma, chole — delicious & green!' },
  ];

  /* ── Contextual messages per category ── */
  const IMPACT_MESSAGES = {
    transport: 'Your commute and travel are your biggest carbon contributors. Consider public transit or carpooling.',
    energy:    'Home energy use dominates your footprint. Focus on AC usage and electricity conservation.',
    food:      'Your dietary choices have the most impact. Try incorporating more plant-based meals.',
    shopping:  'Consumer purchases are your top source. Buy less, choose quality, and go second-hand.',
    digital:   'Your digital habits add up! Reduce streaming quality and screen time.',
  };

  /* ──────────────────────────────────────── */
  /*  Public API                              */
  /* ──────────────────────────────────────── */

  /**
   * Initialise the insights module — cache DOM, bind events.
   */
  function init() {
    els = {
      impactCard:    document.getElementById('biggest-impact-card'),
      impactTitle:   document.getElementById('biggest-impact-title'),
      impactDesc:    document.getElementById('biggest-impact-desc'),
      impactPercent: document.getElementById('biggest-impact-percent'),
      whatIfList:    document.getElementById('what-if-list'),
      tipsList:      document.getElementById('tips-list'),
      savingsCO2:    document.getElementById('savings-co2'),
      savingsMoney:  document.getElementById('savings-money'),
      savingsTrees:  document.getElementById('savings-trees'),
    };

    // Auto-refresh when footprint is recalculated
    document.addEventListener('carbonlens:footprint-updated', () => refresh());
  }

  /**
   * Refresh all insights — called when the screen becomes active.
   */
  function refresh() {
    const footprint = CarbonStorage.getFootprint() || {};
    const profile   = CarbonStorage.getUserProfile() || {};

    const hasData = footprint.total && footprint.total > 0;

    renderBiggestImpact(footprint, hasData);
    const scenarios = buildScenarios(footprint, profile);
    renderWhatIf(scenarios, hasData);
    renderTips();
    renderSavingsSummary(scenarios, hasData);
  }

  /* ──────────────────────────────────────── */
  /*  1. Biggest Impact Category              */
  /* ──────────────────────────────────────── */

  function renderBiggestImpact(footprint, hasData) {
    if (!hasData) {
      if (els.impactTitle)   els.impactTitle.textContent   = 'No Data Yet';
      if (els.impactDesc)    els.impactDesc.textContent    = 'Complete your footprint calculation to see insights!';
      if (els.impactPercent) els.impactPercent.textContent  = '—';
      return;
    }

    const categories = {
      transport: footprint.transport || 0,
      energy:    footprint.energy    || 0,
      food:      footprint.food      || 0,
      shopping:  footprint.shopping  || 0,
      digital:   footprint.digital   || 0,
    };

    const total  = Object.values(categories).reduce((s, v) => s + v, 0);
    const sorted = Object.entries(categories).sort((a, b) => b[1] - a[1]);
    const [topCat, topVal] = sorted[0];
    const pct = total > 0 ? Math.round((topVal / total) * 100) : 0;

    if (els.impactTitle)   els.impactTitle.textContent   = topCat.charAt(0).toUpperCase() + topCat.slice(1);
    if (els.impactDesc)    els.impactDesc.textContent    = IMPACT_MESSAGES[topCat] || '';
    if (els.impactPercent) els.impactPercent.textContent  = `${pct}%`;
  }

  /* ──────────────────────────────────────── */
  /*  2. What-If Scenarios                    */
  /* ──────────────────────────────────────── */

  /**
   * Build an array of scenario objects with calculated savings.
   */
  function buildScenarios(footprint, profile) {
    const scenarios = [];

    // --- 1. Switch to public transit 3×/week ---
    const userTransport = profile.transport || 'car_petrol';
    const currentFactor = (EmissionFactors && EmissionFactors.transport)
      ? (EmissionFactors.transport[userTransport] || 0.21)
      : 0.21;
    const distance = profile.distance || 15; // km one-way
    const busFactor = 0.089;
    const transitSaving = Math.max(0, (currentFactor - busFactor) * distance * 2 * 3 * 4); // 3 days/wk, round-trip, 4 wks
    scenarios.push({
      emoji: '🚌',
      title: 'Switch to public transit 3×/week',
      co2:   transitSaving,
      money: Math.round((distance * 2 * 3 * 4) * 100 / 10), // fuel ₹100/L, 10 km/L
    });

    // --- 2. Go vegetarian 3 days/week ---
    const vegSaving = (7.2 - 3.8) * 3 * 4; // 40.8 kg/month
    scenarios.push({
      emoji: '🥗',
      title: 'Go vegetarian 3 days/week',
      co2:   vegSaving,
      money: Math.round(vegSaving * 15),
    });

    // --- 3. Reduce AC by 2 hours daily ---
    const acSaving = 1.5 * 2 * 30; // 90 kg/month
    scenarios.push({
      emoji: '❄️',
      title: 'Reduce AC by 2 hours daily',
      co2:   acSaving,
      money: Math.round((1.2 * 2 * 30) * 8), // ~1.2 kWh × 2 hrs × 30 days × ₹8/kWh
    });

    // --- 4. Cut streaming by 1 hour/day ---
    const streamSaving = 0.036 * 1 * 30; // 1.08 kg/month
    scenarios.push({
      emoji: '📺',
      title: 'Cut streaming by 1 hour/day',
      co2:   streamSaving,
      money: Math.round(streamSaving * 5),
    });

    // --- 5. Use LED bulbs throughout home ---
    const ledSaving = 15; // ~15 kg/month estimate
    scenarios.push({
      emoji: '💡',
      title: 'Use LED bulbs throughout home',
      co2:   ledSaving,
      money: Math.round((15 / 0.82) * 8), // approximate kWh savings × ₹8
    });

    return scenarios;
  }

  /**
   * Render what-if scenario cards.
   */
  function renderWhatIf(scenarios, hasData) {
    if (!els.whatIfList) return;

    if (!hasData) {
      els.whatIfList.innerHTML = `
        <div class="empty-state card--glass">
          <p>🔮 Complete your footprint calculation to unlock personalised what-if scenarios!</p>
        </div>`;
      return;
    }

    els.whatIfList.innerHTML = scenarios
      .map(
        (s) => `
        <div class="what-if-card card--glass">
          <div class="what-if-header">
            <span class="what-if-icon">${s.emoji}</span>
            <h4>${s.title}</h4>
          </div>
          <div class="what-if-savings">
            <span class="what-if-co2">-${s.co2.toFixed(1)} kg CO₂/month</span>
            <span class="what-if-money">Save ~₹${s.money.toLocaleString('en-IN')}/month</span>
          </div>
        </div>`
      )
      .join('');
  }

  /* ──────────────────────────────────────── */
  /*  3. India-Specific Tips                  */
  /* ──────────────────────────────────────── */

  function renderTips() {
    if (!els.tipsList) return;

    els.tipsList.innerHTML = TIPS
      .map(
        (tip) => `
        <div class="tip-card card--glass">
          <span class="tip-icon">${tip.emoji}</span>
          <div class="tip-content">
            <h4 class="tip-title">${tip.title}</h4>
            <p class="tip-desc">${tip.desc}</p>
          </div>
        </div>`
      )
      .join('');
  }

  /* ──────────────────────────────────────── */
  /*  4. Potential Savings Summary             */
  /* ──────────────────────────────────────── */

  function renderSavingsSummary(scenarios, hasData) {
    if (!hasData) {
      if (els.savingsCO2)   els.savingsCO2.textContent   = '—';
      if (els.savingsMoney) els.savingsMoney.textContent  = '—';
      if (els.savingsTrees) els.savingsTrees.textContent  = '—';
      return;
    }

    // Sort scenarios by CO₂ savings descending, take top 3
    const top3 = [...scenarios].sort((a, b) => b.co2 - a.co2).slice(0, 3);
    const totalCO2   = top3.reduce((s, sc) => s + sc.co2, 0);
    const totalMoney = top3.reduce((s, sc) => s + sc.money, 0);
    const treesEquiv = totalCO2 / 22; // kg per tree per year

    if (els.savingsCO2)   els.savingsCO2.textContent   = `${totalCO2.toFixed(1)} kg`;
    if (els.savingsMoney) els.savingsMoney.textContent  = `₹${totalMoney.toLocaleString('en-IN')}`;
    if (els.savingsTrees) els.savingsTrees.textContent  = `${Math.round(treesEquiv)} trees`;
  }

  /* ──────────────────────────────────────── */
  /*  Expose                                  */
  /* ──────────────────────────────────────── */

  return { init, refresh };
})();
