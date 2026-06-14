/**
 * CarbonLens — Dashboard Module
 * Renders the main dashboard screen with footprint summary, charts, and quick actions.
 *
 * Dependencies: EmissionFactors, CarbonStorage, Charts (loaded before this file)
 */

window.Dashboard = (() => {
  'use strict';

  /* ── DOM References (populated in init) ── */
  let els = {};

  /* ── Chart Instances ── */
  let categoryChart = null;
  let trendChart = null;

  /* ── Personalised Tips Data ── */
  const TIPS_BY_CATEGORY = {
    transport: [
      { emoji: '🚌', title: 'Switch to public transit', desc: 'Taking the bus or metro can cut your commute emissions by up to 80%.' },
      { emoji: '🚲', title: 'Try cycling short distances', desc: 'Trips under 5 km are perfect for cycling — zero emissions & great exercise.' },
      { emoji: '🚗', title: 'Carpool with colleagues', desc: 'Sharing a ride 3×/week could save 40 kg CO₂/month and ₹3,000 in fuel.' },
    ],
    energy: [
      { emoji: '❄️', title: 'Set AC to 24 °C', desc: 'Every degree lower adds ~6% to your electricity bill and emissions.' },
      { emoji: '💡', title: 'Switch to LED bulbs', desc: 'LEDs use 75% less energy and last 25× longer than incandescent bulbs.' },
      { emoji: '☀️', title: 'Use natural light', desc: 'Open curtains during the day and reduce artificial lighting hours.' },
    ],
    food: [
      { emoji: '🥗', title: 'Try Meatless Mondays', desc: 'Replacing one non-veg day/week saves ~14 kg CO₂/month.' },
      { emoji: '🍲', title: 'Cook at home more', desc: 'Eating out has 30% higher emissions due to food waste and energy use.' },
      { emoji: '🌽', title: 'Choose seasonal produce', desc: 'Local, seasonal food has significantly lower carbon miles.' },
    ],
    shopping: [
      { emoji: '👕', title: 'Buy less, choose well', desc: 'Each clothing item carries ~7 kg CO₂. Quality over quantity saves emissions.' },
      { emoji: '📦', title: 'Consolidate orders', desc: 'Group online orders to reduce delivery trips and packaging waste.' },
      { emoji: '♻️', title: 'Go second-hand', desc: 'Thrift stores and marketplaces extend product life and cut manufacturing emissions.' },
    ],
    digital: [
      { emoji: '📱', title: 'Lower streaming quality', desc: 'Switching from HD to SD halves streaming emissions. Audio-only saves even more.' },
      { emoji: '⏰', title: 'Set screen-time limits', desc: 'Reducing 1 hr of daily screen time saves ~1 kg CO₂/month.' },
      { emoji: '📧', title: 'Unsubscribe & declutter', desc: 'Fewer emails stored means less data-centre energy used.' },
    ],
  };

  /* ──────────────────────────────────────── */
  /*  Public API                              */
  /* ──────────────────────────────────────── */

  /**
   * Initialise the dashboard — cache DOM references, bind events.
   * Called once by App.init().
   */
  function init() {
    // Cache DOM elements
    els = {
      greeting:           document.getElementById('dashboard-greeting'),
      streakCount:        document.getElementById('streak-count'),
      totalFootprint:     document.getElementById('total-footprint'),
      yearlyFootprint:    document.getElementById('yearly-footprint'),
      benchmarkComparison: document.getElementById('benchmark-comparison'),
      benchmarkBar:       document.getElementById('benchmark-bar'),
      userMarker:         document.getElementById('user-marker'),
      equivTrees:         document.getElementById('equiv-trees'),
      equivFlights:       document.getElementById('equiv-flights'),
      equivBulbs:         document.getElementById('equiv-bulbs'),
      equivPhones:        document.getElementById('equiv-phones'),
      categoryChart:      document.getElementById('category-chart'),
      trendChart:         document.getElementById('trend-chart'),
      quickActions:       document.getElementById('quick-actions-list'),
    };

    // Auto-refresh on data changes
    document.addEventListener('carbonlens:footprint-updated', () => refresh());
    document.addEventListener('carbonlens:activity-logged', () => refresh());
  }

  /**
   * Refresh the entire dashboard — called when the screen becomes active.
   */
  function refresh() {
    const profile     = CarbonStorage.getUserProfile()    || {};
    const footprint   = CarbonStorage.getFootprint()      || {};
    const achievements = CarbonStorage.getAchievements()  || {};
    const history     = CarbonStorage.getMonthlyHistory()  || [];

    const monthly = footprint.monthly || 0;
    const yearly  = footprint.yearly  || (monthly * 12 / 1000);

    /* 1. Greeting */
    if (els.greeting) {
      const name = profile.name || 'Eco Warrior';
      els.greeting.textContent = `Hello, ${name}! 👋`;
    }

    /* 2. Total Footprint (animated) */
    if (els.totalFootprint) {
      animateCounter(els.totalFootprint, monthly, 1000);
    }

    /* 3. Yearly Footprint */
    if (els.yearlyFootprint) {
      els.yearlyFootprint.textContent = yearly.toFixed(1);
    }

    /* 4. Benchmark Comparison */
    if (els.benchmarkComparison) {
      if (monthly === 0) {
        els.benchmarkComparison.textContent = 'Calculate your footprint to compare!';
      } else if (yearly < 1.9) {
        els.benchmarkComparison.textContent = 'Below India Avg ✅';
      } else if (yearly < 4.7) {
        els.benchmarkComparison.textContent = 'Above India Avg ⚠️';
      } else {
        els.benchmarkComparison.textContent = 'Above Global Avg 🔴';
      }
    }

    /* 5. Position user marker on benchmark bar */
    if (els.userMarker) {
      const pct = Math.min((yearly / 15) * 100, 100);
      els.userMarker.style.left = `${pct}%`;
    }

    /* 6. Equivalents */
    if (typeof EmissionFactors !== 'undefined' && EmissionFactors.convertToEquivalents) {
      const eq = EmissionFactors.convertToEquivalents(yearly);
      if (els.equivTrees)   els.equivTrees.textContent   = eq.trees;
      if (els.equivFlights) els.equivFlights.textContent  = eq.flights;
      if (els.equivBulbs)   els.equivBulbs.textContent    = eq.bulbs;
      if (els.equivPhones)  els.equivPhones.textContent   = eq.phones;
    }

    /* 7. Category Donut Chart */
    renderCategoryChart(footprint);

    /* 8. Trend Line Chart */
    renderTrendChart(history, monthly);

    /* 9. Streak Count */
    if (els.streakCount) {
      const streaks = achievements.streaks || { current: 0 };
      els.streakCount.textContent = streaks.current || 0;
    }

    /* 10. Quick Actions */
    renderQuickActions(footprint);
  }

  /* ──────────────────────────────────────── */
  /*  Animated Counter                        */
  /* ──────────────────────────────────────── */

  /**
   * Smoothly animate a number from 0 → target over `duration` ms.
   * @param {HTMLElement} element  — DOM element whose textContent is updated
   * @param {number}      target   — destination value
   * @param {number}      duration — animation length in ms
   */
  function animateCounter(element, target, duration) {
    if (!element) return;

    // Handle zero / falsy
    if (!target || target === 0) {
      element.textContent = '0';
      return;
    }

    const start = performance.now();

    function step(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);

      // Ease-out cubic for a natural feel
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = eased * target;

      element.textContent = current.toFixed(1);

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        element.textContent = target.toFixed(1);
      }
    }

    requestAnimationFrame(step);
  }

  /* ──────────────────────────────────────── */
  /*  Charts                                  */
  /* ──────────────────────────────────────── */

  /**
   * Render or re-render the category donut chart.
   */
  function renderCategoryChart(footprint) {
    if (!els.categoryChart || typeof Charts === 'undefined') return;

    // Destroy existing chart before creating a new one
    if (categoryChart) {
      Charts.destroyChart(categoryChart);
      categoryChart = null;
    }

    const labels = ['Transport', 'Energy', 'Food', 'Shopping', 'Digital'];
    const data = [
      footprint.transport || 0,
      footprint.energy    || 0,
      footprint.food      || 0,
      footprint.shopping  || 0,
      footprint.digital   || 0,
    ];
    const colors = ['#3B82F6', '#F59E0B', '#10B981', '#8B5CF6', '#EC4899'];

    categoryChart = Charts.createDoughnut('category-chart', { labels, data, colors });
  }

  /**
   * Render or re-render the monthly trend line chart.
   */
  function renderTrendChart(history, currentMonthly) {
    if (!els.trendChart || typeof Charts === 'undefined') return;

    // Destroy existing chart
    if (trendChart) {
      Charts.destroyChart(trendChart);
      trendChart = null;
    }

    let labels, data;

    if (history && history.length > 0) {
      labels = history.map(h => h.month);
      data   = history.map(h => h.total);
    } else {
      // Fallback: show current month only
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                          'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const now = new Date();
      labels = [monthNames[now.getMonth()]];
      data   = [currentMonthly || 0];
    }

    trendChart = Charts.createLine('trend-chart', {
      labels,
      datasets: [
        {
          label: 'Monthly CO₂ (kg)',
          data,
          borderColor: '#0D9F6E',
          backgroundColor: 'rgba(13, 159, 110, 0.15)',
          fill: true,
          tension: 0.4,
        },
      ],
    });
  }

  /* ──────────────────────────────────────── */
  /*  Quick Actions                           */
  /* ──────────────────────────────────────── */

  /**
   * Populate personalised tip cards based on the user's highest-impact category.
   */
  function renderQuickActions(footprint) {
    if (!els.quickActions) return;

    // Find highest-impact category
    const categories = {
      transport: footprint.transport || 0,
      energy:    footprint.energy    || 0,
      food:      footprint.food      || 0,
      shopping:  footprint.shopping  || 0,
      digital:   footprint.digital   || 0,
    };

    const sorted = Object.entries(categories).sort((a, b) => b[1] - a[1]);
    const topCategory = sorted[0][0];

    // Get tips for top category, fallback to transport
    const tips = TIPS_BY_CATEGORY[topCategory] || TIPS_BY_CATEGORY.transport;

    // If no data at all, show an encouraging starter message
    const total = sorted.reduce((sum, [, v]) => sum + v, 0);
    if (total === 0) {
      els.quickActions.innerHTML = `
        <div class="action-card card--glass">
          <span class="action-icon">🚀</span>
          <div class="action-text">
            <strong>Get Started!</strong>
            <p>Complete your carbon footprint calculation to receive personalized tips.</p>
          </div>
        </div>`;
      return;
    }

    els.quickActions.innerHTML = tips
      .slice(0, 3)
      .map(
        (tip) => `
        <div class="action-card card--glass">
          <span class="action-icon">${tip.emoji}</span>
          <div class="action-text">
            <strong>${tip.title}</strong>
            <p>${tip.desc}</p>
          </div>
        </div>`
      )
      .join('');
  }

  /* ──────────────────────────────────────── */
  /*  Expose Public Interface                 */
  /* ──────────────────────────────────────── */

  return {
    init,
    refresh,
    animateCounter,
  };
})();
