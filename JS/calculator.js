/**
 * CarbonLens — Multi-Step Carbon Calculator
 * 5-step wizard: Transport → Energy → Food → Shopping → Digital
 * Loaded 5th — depends on EmissionFactors, CarbonStorage, Charts.
 */

(function () {
  'use strict';

  const EF = () => window.EmissionFactors;
  const CS = () => window.CarbonStorage;

  // ── Internal state ──────────────────────────────────────────────
  let currentStep = 1;
  const TOTAL_STEPS = 5;

  /** Cached DOM references (populated in init) */
  const dom = {};

  /** Per-step emissions in kgCO₂/month */
  const emissions = {
    transport: 0,
    energy:    0,
    food:      0,
    shopping:  0,
    digital:   0
  };

  /** Selected diet for step 3 */
  let selectedDiet = 'vegetarian';
  /** Selected food waste level */
  let selectedWaste = 'sometimes';

  // ── DOM helpers ─────────────────────────────────────────────────

  /** Safe element getter */
  function $(id) { return document.getElementById(id); }

  /** Read a range/number input, default to 0 */
  function val(el) { return parseFloat(el?.value) || 0; }

  // ── Calculation formulas ────────────────────────────────────────

  function calcTransport() {
    const ef = EF().transport;
    const mode     = dom.transportMode?.value || 'bus';
    const distance = val(dom.transportDistance);
    const days     = val(dom.transportDays);
    const flights  = val(dom.flights);

    const rate = ef[mode] || 0;
    const commuteMonthly = distance * rate * days * 4.33;
    const flightMonthly  = flights * ef.avg_domestic_flight_km * ef.flight_domestic_per_km / 12;

    emissions.transport = commuteMonthly + flightMonthly;
    updateStepResult('calc-transport-result', emissions.transport);
  }

  function calcEnergy() {
    const ef = EF().energy;
    const electricity = val(dom.electricity);
    const lpg         = val(dom.lpg);
    const ac          = val(dom.ac);

    // 0.3 seasonal averaging factor for AC
    emissions.energy = (electricity * ef.electricity_per_kwh)
                     + (lpg * ef.lpg_per_cylinder)
                     + (ac * ef.ac_per_hour * 30 * 0.3);
    updateStepResult('calc-energy-result', emissions.energy);
  }

  function calcFood() {
    const ef = EF().food;
    const dailyRate = ef[selectedDiet] || ef.vegetarian;
    const eatingOut = val(dom.eatingOut);
    const wasteRate = ef.food_waste[selectedWaste] || ef.food_waste.sometimes;

    emissions.food = (dailyRate * 30)
                   + (eatingOut * ef.eating_out_multiplier * 4.33)
                   + (wasteRate * 30);
    updateStepResult('calc-food-result', emissions.food);
  }

  function calcShopping() {
    const ef = EF().shopping;
    const clothing = val(dom.clothing);
    const online   = val(dom.onlineOrders);
    const elec     = val(dom.electronics);

    emissions.shopping = (clothing * ef.clothing_per_item)
                       + (online * ef.online_order_delivery)
                       + (elec * ef.electronics_per_item_per_year / 12);
    updateStepResult('calc-shopping-result', emissions.shopping);
  }

  function calcDigital() {
    const ef = EF().digital;
    const streaming = val(dom.streaming);
    const social    = val(dom.socialMedia);
    const emails    = val(dom.emails);

    emissions.digital = (streaming * ef.streaming_per_hour * 30)
                      + (social * ef.social_media_per_hour * 30)
                      + (emails * ef.email_per_email * 30);
    updateStepResult('calc-digital-result', emissions.digital);
  }

  /** Update the step-emission badge text */
  function updateStepResult(elementId, value) {
    const el = $(elementId);
    if (el) el.textContent = value.toFixed(1) + ' kg CO₂/mo';
  }

  /** Recalculate whichever step is currently active */
  function recalcCurrentStep() {
    switch (currentStep) {
      case 1: calcTransport(); break;
      case 2: calcEnergy();    break;
      case 3: calcFood();      break;
      case 4: calcShopping();  break;
      case 5: calcDigital();   break;
    }
  }

  // ── Step navigation ─────────────────────────────────────────────

  function showStep(step) {
    currentStep = step;

    // Toggle .active on step panels
    document.querySelectorAll('.calc-step').forEach(el => {
      el.classList.toggle('active', Number(el.dataset.calcStep) === step);
    });

    // Update step dots
    document.querySelectorAll('.calc-steps-indicator .step-dot').forEach(dot => {
      dot.classList.toggle('active', Number(dot.dataset.step) <= step);
    });

    // Progress bar: 20 % per step
    if (dom.progressBar) {
      dom.progressBar.style.width = (step * 20) + '%';
    }

    // Enable/disable prev button
    if (dom.btnPrev) {
      dom.btnPrev.style.display = step === 1 ? 'none' : '';
    }

    // Change next button label on last step
    if (dom.btnNext) {
      dom.btnNext.textContent = step === TOTAL_STEPS ? 'See Results' : 'Next →';
    }

    recalcCurrentStep();
  }

  function nextStep() {
    if (currentStep < TOTAL_STEPS) {
      showStep(currentStep + 1);
    } else {
      // Last step — show results
      showResults();
    }
  }

  function prevStep() {
    if (currentStep > 1) {
      showStep(currentStep - 1);
    }
  }

  // ── Results display ─────────────────────────────────────────────

  function showResults() {
    const total = emissions.transport + emissions.energy + emissions.food
                + emissions.shopping + emissions.digital;

    // Hide steps container & nav buttons
    document.querySelectorAll('.calc-step').forEach(el => el.classList.remove('active'));
    if (dom.btnNext) dom.btnNext.style.display = 'none';
    if (dom.btnPrev) dom.btnPrev.style.display = 'none';
    const stepsIndicator = document.querySelector('.calc-steps-indicator');
    if (stepsIndicator) stepsIndicator.style.display = 'none';

    // Show results panel
    if (dom.results) dom.results.style.display = '';

    // Total monthly
    const totalEl = $('results-total-monthly');
    if (totalEl) totalEl.textContent = total.toFixed(1);

    // Breakdown cards
    renderBreakdown();

    // Equivalents grid
    renderEquivalents(total);
  }

  function renderBreakdown() {
    const container = $('results-breakdown');
    if (!container) return;

    const palette = window.Charts?.palette || {};
    const categories = [
      { key: 'transport', label: 'Transport', color: palette.transport || '#3B82F6' },
      { key: 'energy',    label: 'Energy',    color: palette.energy    || '#F59E0B' },
      { key: 'food',      label: 'Food',      color: palette.food      || '#EF4444' },
      { key: 'shopping',  label: 'Shopping',  color: palette.shopping  || '#8B5CF6' },
      { key: 'digital',   label: 'Digital',   color: palette.digital   || '#06B6D4' }
    ];

    container.innerHTML = categories.map(c => `
      <div class="breakdown-card" style="border-left: 3px solid ${c.color};">
        <span class="breakdown-label">${c.label}</span>
        <span class="breakdown-value" style="color:${c.color}">
          ${emissions[c.key].toFixed(1)} <small>kg</small>
        </span>
      </div>
    `).join('');
  }

  function renderEquivalents(totalMonthly) {
    const container = $('results-equivalents');
    if (!container) return;

    const eq = EF().convertToEquivalents(totalMonthly);
    container.innerHTML = `
      <div class="equiv-item"><span class="equiv-value">${eq.trees}</span><span class="equiv-label">🌳 Trees needed</span></div>
      <div class="equiv-item"><span class="equiv-value">${eq.flights}</span><span class="equiv-label">✈️ DEL↔BOM flights</span></div>
      <div class="equiv-item"><span class="equiv-value">${eq.bulbs}</span><span class="equiv-label">💡 LED bulbs/year</span></div>
      <div class="equiv-item"><span class="equiv-value">${eq.phones.toLocaleString()}</span><span class="equiv-label">📱 Phone charges</span></div>
    `;
  }

  // ── Save results ────────────────────────────────────────────────

  function saveResults() {
    const total = emissions.transport + emissions.energy + emissions.food
                + emissions.shopping + emissions.digital;

    const footprint = {
      transport: parseFloat(emissions.transport.toFixed(2)),
      energy:    parseFloat(emissions.energy.toFixed(2)),
      food:      parseFloat(emissions.food.toFixed(2)),
      shopping:  parseFloat(emissions.shopping.toFixed(2)),
      digital:   parseFloat(emissions.digital.toFixed(2)),
      total:     parseFloat(total.toFixed(2)),
      monthly:   parseFloat(total.toFixed(2)),
      yearly:    parseFloat(((total * 12) / 1000).toFixed(2))
    };

    CS().setFootprint(footprint);

    // Monthly snapshot
    const now = new Date();
    const monthKey = now.toISOString().slice(0, 7); // YYYY-MM
    CS().addMonthlySnapshot({
      month:     monthKey,
      total:     footprint.total,
      transport: footprint.transport,
      energy:    footprint.energy,
      food:      footprint.food,
      shopping:  footprint.shopping,
      digital:   footprint.digital
    });

    // Award seedling badge (first calculation)
    const achievements = CS().getAchievements();
    if (!achievements.badges.includes('seedling')) {
      CS().updateAchievements({
        badges: ['seedling'],
        xp: achievements.xp + 50
      });
      document.dispatchEvent(new CustomEvent('carbonlens:achievement-unlocked', {
        detail: { badge: 'seedling' }
      }));
    }

    // Dispatch update event
    document.dispatchEvent(new CustomEvent('carbonlens:footprint-updated', {
      detail: footprint
    }));

    // Navigate to dashboard
    if (window.App && typeof window.App.navigateTo === 'function') {
      window.App.navigateTo('dashboard');
    }
  }

  // ── Range input live label updaters ─────────────────────────────

  function bindRange(input, label) {
    if (!input || !label) return;
    input.addEventListener('input', () => {
      label.textContent = input.value;
      recalcCurrentStep();
    });
  }

  // ── Option-card single-select handler ───────────────────────────

  function bindOptionCards(containerSelector, callback) {
    const cards = document.querySelectorAll(containerSelector);
    cards.forEach(card => {
      card.addEventListener('click', () => {
        // Deselect siblings
        cards.forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        if (callback) callback(card.dataset.value);
        recalcCurrentStep();
      });
    });
  }

  // ── Public API ──────────────────────────────────────────────────

  const Calculator = {
    /**
     * Initialise the calculator: cache DOM, bind events.
     */
    init() {
      // Progress & navigation
      dom.progressBar = $('calc-progress-bar');
      dom.btnNext     = $('btn-calc-next');
      dom.btnPrev     = $('btn-calc-prev');
      dom.results     = $('calc-results');

      // Step 1 — Transport
      dom.transportMode     = $('calc-transport-mode');
      dom.transportDistance  = $('calc-transport-distance');
      dom.transportDistLabel= $('calc-transport-distance-label');
      dom.transportDays     = $('calc-transport-days');
      dom.transportDaysLabel= $('calc-transport-days-label');
      dom.flights           = $('calc-flights');

      // Step 2 — Energy
      dom.electricity      = $('calc-electricity');
      dom.electricityLabel = $('calc-electricity-label');
      dom.lpg              = $('calc-lpg');
      dom.lpgLabel         = $('calc-lpg-label');
      dom.ac               = $('calc-ac');
      dom.acLabel          = $('calc-ac-label');

      // Step 3 — Food
      dom.eatingOut        = $('calc-eating-out');
      dom.eatingOutLabel   = $('calc-eating-out-label');
      dom.foodWaste        = $('calc-food-waste');

      // Step 4 — Shopping
      dom.clothing         = $('calc-clothing');
      dom.clothingLabel    = $('calc-clothing-label');
      dom.onlineOrders     = $('calc-online-orders');
      dom.onlineOrdersLabel= $('calc-online-orders-label');
      dom.electronics      = $('calc-electronics');
      dom.electronicsLabel = $('calc-electronics-label');

      // Step 5 — Digital
      dom.streaming        = $('calc-streaming');
      dom.streamingLabel   = $('calc-streaming-label');
      dom.socialMedia      = $('calc-social-media');
      dom.socialMediaLabel = $('calc-social-media-label');
      dom.emails           = $('calc-emails');
      dom.emailsLabel      = $('calc-emails-label');

      // ── Bind navigation ───────────────────────────────────────
      if (dom.btnNext) dom.btnNext.addEventListener('click', nextStep);
      if (dom.btnPrev) dom.btnPrev.addEventListener('click', prevStep);

      // ── Bind save button ──────────────────────────────────────
      const btnSave = $('btn-save-results');
      if (btnSave) btnSave.addEventListener('click', saveResults);

      // ── Range inputs → live label updates ─────────────────────
      bindRange(dom.transportDistance, dom.transportDistLabel);
      bindRange(dom.transportDays,    dom.transportDaysLabel);
      bindRange(dom.electricity,      dom.electricityLabel);
      bindRange(dom.lpg,              dom.lpgLabel);
      bindRange(dom.ac,               dom.acLabel);
      bindRange(dom.eatingOut,        dom.eatingOutLabel);
      bindRange(dom.clothing,         dom.clothingLabel);
      bindRange(dom.onlineOrders,     dom.onlineOrdersLabel);
      bindRange(dom.streaming,        dom.streamingLabel);
      bindRange(dom.socialMedia,      dom.socialMediaLabel);
      bindRange(dom.electronics,      dom.electronicsLabel);
      bindRange(dom.emails,           dom.emailsLabel);

      // ── Select / number inputs that should trigger recalc ─────
      [dom.transportMode, dom.flights, dom.foodWaste, dom.electronics, dom.emails].forEach(el => {
        if (el) el.addEventListener('input', recalcCurrentStep);
      });

      // ── Option cards: diet selection (step 3) ─────────────────
      bindOptionCards('.option-card[data-group="calc-diet"]', v => { selectedDiet = v; });

      // ── Option cards: food waste (if option-card style) ───────
      // Fallback: treat food waste as a <select> already bound above

      // ── Initial state ─────────────────────────────────────────
      if (dom.results) dom.results.style.display = 'none';
      showStep(1);
    },

    /**
     * Reset the calculator UI to step 1 (called when screen becomes active).
     */
    refresh() {
      // Reset to step 1, re-show navigation, hide results
      if (dom.results) dom.results.style.display = 'none';
      if (dom.btnNext) { dom.btnNext.style.display = ''; dom.btnNext.textContent = 'Next →'; }
      if (dom.btnPrev) dom.btnPrev.style.display = 'none';

      const stepsIndicator = document.querySelector('.calc-steps-indicator');
      if (stepsIndicator) stepsIndicator.style.display = '';

      showStep(1);
    },

    /**
     * @returns {number} Current step's kgCO₂/month
     */
    getCurrentStepEmissions() {
      const keys = ['transport', 'energy', 'food', 'shopping', 'digital'];
      return emissions[keys[currentStep - 1]] || 0;
    },

    /**
     * @returns {{ transport, energy, food, shopping, digital, total }}
     */
    getAllEmissions() {
      const total = emissions.transport + emissions.energy + emissions.food
                  + emissions.shopping + emissions.digital;
      return { ...emissions, total };
    }
  };

  window.Calculator = Calculator;
})();
