/**
 * CarbonLens — Main Application Controller
 * Orchestrates initialisation, navigation, onboarding, and global events.
 * Loaded LAST — depends on every other module.
 */

(function () {
  'use strict';

  const CS = () => window.CarbonStorage;

  // ── Cached DOM references ───────────────────────────────────────
  const dom = {};

  // ── Internal state ──────────────────────────────────────────────
  let onboardStep = 1;
  const ONBOARD_TOTAL = 4;

  // ── Screen registry ─────────────────────────────────────────────
  const SCREENS = ['landing', 'onboarding', 'dashboard', 'calculator', 'tracker', 'insights', 'achievements'];

  // ── Helpers ─────────────────────────────────────────────────────
  function $(id) { return document.getElementById(id); }
  function $$(sel) { return document.querySelectorAll(sel); }

  // ── Loading screen ──────────────────────────────────────────────

  function dismissLoading() {
    return new Promise(resolve => {
      setTimeout(() => {
        if (dom.loadingScreen) {
          dom.loadingScreen.style.opacity = '0';
          dom.loadingScreen.style.transition = 'opacity 0.5s ease';
          setTimeout(() => {
            dom.loadingScreen.style.display = 'none';
            resolve();
          }, 500);
        } else {
          resolve();
        }
      }, 1500);
    });
  }

  // ── Navigation ──────────────────────────────────────────────────

  function navigateTo(screenName) {
    // Hide all screens
    $$('.screen').forEach(s => s.classList.remove('screen--active'));

    // Show target
    const target = $('screen-' + screenName);
    if (target) target.classList.add('screen--active');

    // Update nav active state
    $$('.nav-item').forEach(n => {
      n.classList.toggle('active', n.dataset.screen === screenName);
    });

    // Call module refresh
    const moduleMap = {
      dashboard:    window.Dashboard,
      calculator:   window.Calculator,
      tracker:      window.Tracker,
      insights:     window.Insights,
      achievements: window.Gamification
    };
    const mod = moduleMap[screenName];
    if (mod && typeof mod.refresh === 'function') {
      try { mod.refresh(); } catch (e) { console.warn('[App] refresh error:', e); }
    }

    // Dispatch event
    document.dispatchEvent(new CustomEvent('carbonlens:screen-change', {
      detail: { screen: screenName }
    }));
  }

  function showNav() {
    if (dom.mainNav) dom.mainNav.style.display = '';
  }

  function hideNav() {
    if (dom.mainNav) dom.mainNav.style.display = 'none';
  }

  // ── Onboarding logic ───────────────────────────────────────────

  /** Show a specific onboarding step */
  function showOnboardStep(step) {
    onboardStep = step;

    // Toggle panels
    $$('.onboarding-step').forEach(el => {
      el.classList.toggle('active', Number(el.dataset.step) === step);
    });

    // Progress bar: 25 % per step
    if (dom.onboardProgress) {
      dom.onboardProgress.style.width = (step * 25) + '%';
    }

    // Label
    if (dom.onboardLabel) {
      dom.onboardLabel.textContent = `Step ${step} of ${ONBOARD_TOTAL}`;
    }

    // Back button visibility
    if (dom.btnOnboardPrev) {
      dom.btnOnboardPrev.style.display = step === 1 ? 'none' : '';
    }

    // Next button label
    if (dom.btnOnboardNext) {
      dom.btnOnboardNext.textContent = step === ONBOARD_TOTAL ? 'Get Started 🚀' : 'Next →';
    }
  }

  /** Validate the current onboarding step before advancing */
  function validateOnboardStep() {
    if (onboardStep === 1) {
      const name = $('onboard-name');
      if (name && name.value.trim() === '') {
        name.focus();
        return false;
      }
    }
    return true;
  }

  /** Gather all onboarding data and persist */
  function finishOnboarding() {
    const name       = $('onboard-name')?.value.trim() || 'User';
    const city       = $('onboard-city')?.value.trim() || '';
    const transport  = document.querySelector('#transport-options .option-card.selected')?.dataset.value || 'bus';
    const distance   = parseFloat($('onboard-distance')?.value) || 10;
    const diet       = document.querySelector('#diet-options .option-card.selected')?.dataset.value || 'vegetarian';
    const electricity= parseFloat($('onboard-electricity')?.value) || 100;
    const fuel       = document.querySelector('#fuel-options .option-card.selected')?.dataset.value || 'lpg';

    const profile = { name, city, transport, distance, diet, electricity, fuel };
    CS().setUserProfile(profile);
    CS().setOnboarded(true);

    // Auto-run a basic footprint estimation from onboarding answers
    autoEstimateFootprint(profile);

    navigateTo('dashboard');
    showNav();
  }

  /**
   * Quick footprint estimate from onboarding profile.
   * Uses simplified monthly calculations — users can refine via the full calculator.
   */
  function autoEstimateFootprint(profile) {
    const ef = window.EmissionFactors;
    if (!ef) return;

    const transportRate = ef.transport[profile.transport] || ef.transport.bus;
    const transportMonthly = profile.distance * transportRate * 22 * 4.33; // 22 workdays

    const energyMonthly = (profile.electricity * ef.energy.electricity_per_kwh)
                        + (profile.fuel === 'lpg' ? ef.energy.lpg_per_cylinder : 0);

    const foodDaily = ef.food[profile.diet] || ef.food.vegetarian;
    const foodMonthly = foodDaily * 30;

    // Default shopping & digital estimates
    const shoppingMonthly = (2 * ef.shopping.clothing_per_item) + (4 * ef.shopping.online_order_delivery);
    const digitalMonthly  = (2 * ef.digital.streaming_per_hour * 30)
                          + (1 * ef.digital.social_media_per_hour * 30)
                          + (20 * ef.digital.email_per_email * 30);

    const total = transportMonthly + energyMonthly + foodMonthly + shoppingMonthly + digitalMonthly;

    const footprint = {
      transport: parseFloat(transportMonthly.toFixed(2)),
      energy:    parseFloat(energyMonthly.toFixed(2)),
      food:      parseFloat(foodMonthly.toFixed(2)),
      shopping:  parseFloat(shoppingMonthly.toFixed(2)),
      digital:   parseFloat(digitalMonthly.toFixed(2)),
      total:     parseFloat(total.toFixed(2)),
      monthly:   parseFloat(total.toFixed(2)),
      yearly:    parseFloat(((total * 12) / 1000).toFixed(2))
    };

    CS().setFootprint(footprint);

    // First monthly snapshot
    const monthKey = new Date().toISOString().slice(0, 7);
    CS().addMonthlySnapshot({
      month:     monthKey,
      total:     footprint.total,
      transport: footprint.transport,
      energy:    footprint.energy,
      food:      footprint.food,
      shopping:  footprint.shopping,
      digital:   footprint.digital
    });

    document.dispatchEvent(new CustomEvent('carbonlens:footprint-updated', {
      detail: footprint
    }));
  }

  // ── Onboarding range + option-card helpers ──────────────────────

  function bindOnboardRanges() {
    const pairs = [
      ['onboard-distance',    'onboard-distance-label'],
      ['onboard-electricity', 'onboard-electricity-label']
    ];
    pairs.forEach(([inputId, labelId]) => {
      const input = $(inputId);
      const label = $(labelId);
      if (input && label) {
        input.addEventListener('input', () => { label.textContent = input.value; });
      }
    });
  }

  function bindOnboardOptionCards() {
    const groups = ['#transport-options', '#diet-options', '#fuel-options'];
    groups.forEach(selector => {
      const cards = $$(selector + ' .option-card');
      cards.forEach(card => {
        card.addEventListener('click', () => {
          cards.forEach(c => c.classList.remove('selected'));
          card.classList.add('selected');
        });
      });
    });
  }

  // ── Landing page animations ─────────────────────────────────────

  /** Animate .counter elements from 0 to data-target over 2 seconds */
  function animateCounters() {
    const counters = $$('.counter[data-target]');
    counters.forEach(counter => {
      const target = parseFloat(counter.dataset.target) || 0;
      const duration = 2000; // ms
      const startTime = performance.now();

      function tick(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // Ease-out cubic
        const ease = 1 - Math.pow(1 - progress, 3);
        counter.textContent = (target * ease).toFixed(target % 1 === 0 ? 0 : 1);
        if (progress < 1) requestAnimationFrame(tick);
      }

      requestAnimationFrame(tick);
    });
  }

  /** Create 20 floating particle dots in .hero-particles */
  function createParticles() {
    const container = document.querySelector('.hero-particles');
    if (!container) return;

    for (let i = 0; i < 20; i++) {
      const dot = document.createElement('div');
      dot.className = 'particle';
      dot.style.cssText = `
        position: absolute;
        width: ${4 + Math.random() * 6}px;
        height: ${4 + Math.random() * 6}px;
        background: rgba(13, 159, 110, ${0.15 + Math.random() * 0.35});
        border-radius: 50%;
        left: ${Math.random() * 100}%;
        top: ${Math.random() * 100}%;
        animation: particleFloat ${5 + Math.random() * 10}s ease-in-out infinite;
        animation-delay: ${Math.random() * 5}s;
        pointer-events: none;
      `;
      container.appendChild(dot);
    }

    // Inject keyframes once
    if (!document.getElementById('particle-keyframes')) {
      const style = document.createElement('style');
      style.id = 'particle-keyframes';
      style.textContent = `
        @keyframes particleFloat {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.4; }
          25%      { transform: translate(${20}px, -${30}px) scale(1.2); opacity: 0.7; }
          50%      { transform: translate(-${15}px, -${50}px) scale(0.9); opacity: 0.5; }
          75%      { transform: translate(${10}px, -${20}px) scale(1.1); opacity: 0.6; }
        }
      `;
      document.head.appendChild(style);
    }
  }

  // ── Global event listeners ──────────────────────────────────────

  function bindGlobalEvents() {
    document.addEventListener('carbonlens:footprint-updated', (e) => {
      console.log('[App] Footprint updated:', e.detail);
    });

    document.addEventListener('carbonlens:activity-logged', (e) => {
      console.log('[App] Activity logged:', e.detail);
    });

    document.addEventListener('carbonlens:achievement-unlocked', (e) => {
      console.log('[App] Achievement unlocked:', e.detail);
      // Could trigger a toast notification here
    });
  }

  // ── Main App object ─────────────────────────────────────────────

  const App = {
    /**
     * Boot the entire application.
     * Called on DOMContentLoaded.
     */
    async init() {
      // Cache top-level DOM refs
      dom.loadingScreen  = $('loading-screen');
      dom.mainNav        = $('main-nav');
      dom.btnGetStarted  = $('btn-get-started');
      dom.btnOnboardNext = $('btn-onboard-next');
      dom.btnOnboardPrev = $('btn-onboard-prev');
      dom.onboardProgress= $('onboarding-progress-bar');
      dom.onboardLabel   = $('onboarding-step-label');

      // 1. Loading screen
      await dismissLoading();

      // 1.5 Fresh start — clear previous session data so the app
      //     always begins from the landing page with new user input.
      try { if (CS().clearAll) CS().clearAll(); } catch(e) { /* ignore */ }

      // 2. Initialise all modules (order matters for dependencies)
      try { if (window.Charts)       window.Charts.init();       } catch(e) { console.warn(e); }
      // CarbonStorage needs no init
      try { if (window.Gamification) window.Gamification.init(); } catch(e) { console.warn(e); }
      try { if (window.Calculator)   window.Calculator.init();   } catch(e) { console.warn(e); }
      try { if (window.Dashboard)    window.Dashboard.init();    } catch(e) { console.warn(e); }
      try { if (window.Tracker)      window.Tracker.init();      } catch(e) { console.warn(e); }
      try { if (window.Insights)     window.Insights.init();     } catch(e) { console.warn(e); }

      // 3. Always start from landing (data was cleared above)
      navigateTo('landing');
      hideNav();
      animateCounters();
      createParticles();

      // 4. Navigation click handlers
      $$('.nav-item').forEach(btn => {
        btn.addEventListener('click', () => {
          const screen = btn.dataset.screen;
          if (screen) navigateTo(screen);
        });
      });

      // 5. Landing CTA
      if (dom.btnGetStarted) {
        dom.btnGetStarted.addEventListener('click', () => {
          navigateTo('onboarding');
          showOnboardStep(1);
          bindOnboardRanges();
          bindOnboardOptionCards();
        });
      }

      // 6. Onboarding navigation
      if (dom.btnOnboardNext) {
        dom.btnOnboardNext.addEventListener('click', () => {
          if (!validateOnboardStep()) return;
          if (onboardStep < ONBOARD_TOTAL) {
            showOnboardStep(onboardStep + 1);
          } else {
            finishOnboarding();
          }
        });
      }
      if (dom.btnOnboardPrev) {
        dom.btnOnboardPrev.addEventListener('click', () => {
          if (onboardStep > 1) showOnboardStep(onboardStep - 1);
        });
      }

      // 7. Global events
      bindGlobalEvents();
    },

    /** Navigate to a screen by name */
    navigateTo,

    /** Show the bottom nav bar */
    showNav,

    /** Hide the bottom nav bar */
    hideNav
  };

  // ── Bootstrap ───────────────────────────────────────────────────
  window.App = App;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => App.init());
  } else {
    App.init();
  }
})();
