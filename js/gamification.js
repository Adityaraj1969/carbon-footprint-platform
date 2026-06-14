/**
 * CarbonLens — Gamification Module
 * Badge system, streak tracking, levelling, virtual forest, and weekly challenges.
 *
 * Dependencies: EmissionFactors, CarbonStorage (loaded before this file)
 */

window.Gamification = (() => {
  'use strict';

  /* ── SVG Namespace ── */
  const SVG_NS = 'http://www.w3.org/2000/svg';

  /* ── DOM References ── */
  let els = {};

  /* ──────────────────────────────────────── */
  /*  Data Definitions                        */
  /* ──────────────────────────────────────── */

  /** 12 earnable badges with check functions. */
  const BADGES = [
    {
      id: 'seedling', name: 'First Seed', icon: '🌱',
      description: 'Complete your first carbon calculation',
      check: (_ach, fp) => fp && fp.total > 0,
    },
    {
      id: 'green_starter', name: 'Green Starter', icon: '🟢',
      description: 'Log activities for 7 consecutive days',
      check: (ach) => ach.streaks && ach.streaks.current >= 7,
    },
    {
      id: 'tree_hugger', name: 'Tree Hugger', icon: '🌳',
      description: 'Reduce footprint by 10% in a month',
      check: (_ach, _fp, _act, _prof, hist) => {
        if (!hist || hist.length < 2) return false;
        const prev = hist[hist.length - 2].total;
        const curr = hist[hist.length - 1].total;
        return prev > 0 && curr < prev * 0.9;
      },
    },
    {
      id: 'earth_guardian', name: 'Earth Guardian', icon: '🌍',
      description: 'Stay below Paris target (2.1 t/yr)',
      check: (_ach, fp) => fp && fp.yearly && fp.yearly < 2.1,
    },
    {
      id: 'energy_saver', name: 'Energy Saver', icon: '⚡',
      description: 'Home energy below 80 kg CO₂/month',
      check: (_ach, fp) => fp && typeof fp.energy === 'number' && fp.energy < 80,
    },
    {
      id: 'cycle_champion', name: 'Cycle Champion', icon: '🚲',
      description: 'Log 30 cycling / walking commutes',
      check: (_ach, _fp, acts) => {
        const count = acts.filter((a) =>
          a.description && (/cycl/i.test(a.description) || /walk/i.test(a.description))
        ).length;
        return count >= 30;
      },
    },
    {
      id: 'plant_power', name: 'Plant Power', icon: '🥬',
      description: 'Set diet to vegetarian or vegan',
      check: (_ach, _fp, _act, prof) =>
        prof && (prof.diet === 'vegetarian' || prof.diet === 'vegan'),
    },
    {
      id: 'zero_waste', name: 'Zero Waste Hero', icon: '♻️',
      description: 'Log 0 food waste for 7 consecutive days',
      check: () => false, // Requires dedicated food-waste tracking; simplified stub
    },
    {
      id: 'digital_detox', name: 'Digital Detox', icon: '📵',
      description: 'Digital footprint below 5 kg CO₂/month',
      check: (_ach, fp) => fp && typeof fp.digital === 'number' && fp.digital < 5,
    },
    {
      id: 'century_club', name: 'Century Club', icon: '💯',
      description: 'Log activities for 100 unique days',
      check: (_ach, _fp, acts) => {
        const uniqueDays = new Set(acts.map((a) => a.date)).size;
        return uniqueDays >= 100;
      },
    },
    {
      id: 'half_footprint', name: 'Half & Half', icon: '✂️',
      description: 'Reduce total footprint by 50%',
      check: (_ach, _fp, _act, _prof, hist) => {
        if (!hist || hist.length < 2) return false;
        const first = hist[0].total;
        const curr  = hist[hist.length - 1].total;
        return first > 0 && curr <= first * 0.5;
      },
    },
    {
      id: 'carbon_neutral', name: 'Carbon Neutral', icon: '🏆',
      description: 'Total footprint below 150 kg CO₂/month',
      check: (_ach, fp) => fp && fp.monthly && fp.monthly < 150,
    },
  ];

  /** Level tiers with XP thresholds. */
  const LEVELS = [
    { level: 1, name: 'Seedling',        icon: '🌱', desc: 'Every journey starts with a single step',   minXP: 0,    maxXP: 99 },
    { level: 2, name: 'Sprout',          icon: '🌿', desc: 'Growing your green awareness',              minXP: 100,  maxXP: 299 },
    { level: 3, name: 'Sapling',         icon: '🪴', desc: 'Taking root in sustainable living',         minXP: 300,  maxXP: 599 },
    { level: 4, name: 'Tree',            icon: '🌳', desc: 'A strong force for the environment',        minXP: 600,  maxXP: 999 },
    { level: 5, name: 'Forest',          icon: '🌲', desc: 'Your impact multiplies',                    minXP: 1000, maxXP: 1999 },
    { level: 6, name: 'Earth Guardian',  icon: '🌍', desc: 'A true champion of the planet',             minXP: 2000, maxXP: Infinity },
  ];

  /** Weekly challenges. */
  const CHALLENGES = [
    {
      id: 'no_car', name: 'No-Car Week', icon: '🚫🚗',
      description: 'Log 0 car trips for 7 days', target: 7, unit: 'days',
      checkProgress: (acts) => {
        // Count unique days this week where no driving activity was logged
        const thisWeek = getThisWeekDates();
        const driveDays = new Set(
          acts.filter((a) => a.description && /drove/i.test(a.description))
            .map((a) => a.date)
            .filter((d) => thisWeek.has(d))
        );
        return Math.max(0, thisWeek.size - driveDays.size);
      },
    },
    {
      id: 'plant_based', name: 'Plant-Based Week', icon: '🥗',
      description: 'Eat vegetarian for 7 days', target: 7, unit: 'days',
      checkProgress: (acts) => {
        const thisWeek = getThisWeekDates();
        return new Set(
          acts.filter((a) => a.description && /veg/i.test(a.description) && !/non/i.test(a.description))
            .map((a) => a.date)
            .filter((d) => thisWeek.has(d))
        ).size;
      },
    },
    {
      id: 'digital_detox', name: 'Digital Detox', icon: '📵',
      description: 'Under 2 hrs screen time for 3 days', target: 3, unit: 'days',
      checkProgress: (acts) => {
        const thisWeek = getThisWeekDates();
        // Days this week with < 2 hrs digital logged
        const digitalByDate = {};
        acts.filter((a) => a.category === 'digital')
          .forEach((a) => {
            if (thisWeek.has(a.date)) {
              digitalByDate[a.date] = (digitalByDate[a.date] || 0) + (a.amount || 0);
            }
          });
        let lowDays = 0;
        thisWeek.forEach((d) => {
          if ((digitalByDate[d] || 0) < 2) lowDays++;
        });
        return lowDays;
      },
    },
    {
      id: 'zero_waste', name: 'Zero Waste', icon: '♻️',
      description: 'No food waste for 5 days', target: 5, unit: 'days',
      checkProgress: (acts) => {
        const thisWeek = getThisWeekDates();
        const wasteDays = new Set(
          acts.filter((a) => a.description && /waste/i.test(a.description))
            .map((a) => a.date)
            .filter((d) => thisWeek.has(d))
        );
        return Math.max(0, thisWeek.size - wasteDays.size);
      },
    },
    {
      id: 'walk_more', name: 'Walk More', icon: '🚶',
      description: 'Log 5 walking / cycling commutes', target: 5, unit: 'commutes',
      checkProgress: (acts) => {
        const thisWeek = getThisWeekDates();
        return acts.filter((a) =>
          thisWeek.has(a.date) &&
          a.description && (/cycl/i.test(a.description) || /walk/i.test(a.description))
        ).length;
      },
    },
    {
      id: 'energy_saver', name: 'Energy Saver', icon: '💡',
      description: 'Reduce electricity by 20%', target: 20, unit: '%',
      checkProgress: () => {
        // Simplified: compare current energy footprint vs baseline
        const fp = CarbonStorage.getFootprint() || {};
        const hist = CarbonStorage.getMonthlyHistory() || [];
        if (hist.length < 2) return 0;
        const prev = hist[hist.length - 2].energy || 1;
        const curr = fp.energy || prev;
        const pct  = Math.max(0, Math.round(((prev - curr) / prev) * 100));
        return Math.min(pct, 20);
      },
    },
  ];

  /* ── Green shades for tree canopies ── */
  const GREEN_SHADES = ['#10B981', '#059669', '#047857', '#0D9F6E', '#34D399'];

  /* ──────────────────────────────────────── */
  /*  Public API                              */
  /* ──────────────────────────────────────── */

  function init() {
    els = {
      levelIcon:      document.getElementById('level-icon'),
      levelName:      document.getElementById('level-name'),
      levelDesc:      document.getElementById('level-desc'),
      levelBar:       document.getElementById('level-progress-bar'),
      levelText:      document.getElementById('level-progress-text'),
      co2Saved:       document.getElementById('total-co2-saved'),
      daysTracked:    document.getElementById('total-days-tracked'),
      badgesEarned:   document.getElementById('total-badges-earned'),
      forest:         document.getElementById('virtual-forest'),
      forestCount:    document.getElementById('forest-tree-count'),
      badgesGrid:     document.getElementById('badges-grid'),
      challengesList: document.getElementById('challenges-list'),
    };

    // React to data changes
    document.addEventListener('carbonlens:footprint-updated', () => { checkBadges(); });
    document.addEventListener('carbonlens:activity-logged',   () => { updateStreak(); checkBadges(); });
  }

  function refresh() {
    checkBadges();
    renderLevel();
    renderImpactCounters();
    renderBadgesGrid();
    renderForest();
    renderChallenges();
  }

  /* ──────────────────────────────────────── */
  /*  Badge Checking                          */
  /* ──────────────────────────────────────── */

  function checkBadges() {
    const achievements = CarbonStorage.getAchievements() || { badges: [], xp: 0, streaks: { current: 0, best: 0, lastDate: null }, co2Saved: 0 };
    const footprint    = CarbonStorage.getFootprint()     || {};
    const activities   = CarbonStorage.getActivities()    || [];
    const profile      = CarbonStorage.getUserProfile()   || {};
    const history      = CarbonStorage.getMonthlyHistory() || [];

    let newBadgesEarned = false;
    const badges = [...(achievements.badges || [])];

    BADGES.forEach((badge) => {
      if (badges.includes(badge.id)) return; // already earned
      try {
        if (badge.check(achievements, footprint, activities, profile, history)) {
          badges.push(badge.id);
          achievements.xp = (achievements.xp || 0) + 50;
          newBadgesEarned = true;

          // Dispatch achievement event
          document.dispatchEvent(new CustomEvent('carbonlens:achievement-unlocked', {
            detail: { badge },
          }));
        }
      } catch (_) {
        // Gracefully skip broken badge checks
      }
    });

    if (newBadgesEarned) {
      achievements.badges = badges;
      achievements.level  = getLevelForXP(achievements.xp).level;
      CarbonStorage.updateAchievements(achievements);
    }
  }

  /* ──────────────────────────────────────── */
  /*  Streak System                           */
  /* ──────────────────────────────────────── */

  function updateStreak() {
    const achievements = CarbonStorage.getAchievements() || {};
    const streaks = achievements.streaks || { current: 0, best: 0, lastDate: null };
    const today     = todayStr();
    const yesterday = yesterdayStr();

    if (streaks.lastDate === today) {
      // Already logged today — no streak change
      return;
    }

    if (streaks.lastDate === yesterday) {
      streaks.current = (streaks.current || 0) + 1;
    } else {
      streaks.current = 1;
    }

    if (streaks.current > (streaks.best || 0)) {
      streaks.best = streaks.current;
    }

    streaks.lastDate = today;

    // Award +5 XP for streak maintenance
    const newXP = (achievements.xp || 0) + 5;

    CarbonStorage.updateAchievements({
      streaks,
      xp:    newXP,
      level: getLevelForXP(newXP).level,
    });
  }

  /* ──────────────────────────────────────── */
  /*  Level Rendering                         */
  /* ──────────────────────────────────────── */

  function getLevelForXP(xp) {
    for (let i = LEVELS.length - 1; i >= 0; i--) {
      if (xp >= LEVELS[i].minXP) return LEVELS[i];
    }
    return LEVELS[0];
  }

  function renderLevel() {
    const achievements = CarbonStorage.getAchievements() || {};
    const xp    = achievements.xp || 0;
    const tier  = getLevelForXP(xp);

    if (els.levelIcon) els.levelIcon.textContent = tier.icon;
    if (els.levelName) els.levelName.textContent = tier.name;
    if (els.levelDesc) els.levelDesc.textContent = tier.desc;

    // Progress within the current tier
    if (tier.maxXP === Infinity) {
      // Max level
      if (els.levelBar)  els.levelBar.style.width   = '100%';
      if (els.levelText) els.levelText.textContent   = 'MAX LEVEL ✨';
    } else {
      const range    = tier.maxXP - tier.minXP + 1;
      const progress = xp - tier.minXP;
      const pct      = Math.min(Math.round((progress / range) * 100), 100);

      if (els.levelBar)  els.levelBar.style.width  = `${pct}%`;
      if (els.levelText) els.levelText.textContent  = `${xp} / ${tier.maxXP + 1} XP`;
    }
  }

  /* ──────────────────────────────────────── */
  /*  Impact Counters                         */
  /* ──────────────────────────────────────── */

  function renderImpactCounters() {
    const achievements = CarbonStorage.getAchievements() || {};
    const activities   = CarbonStorage.getActivities()   || [];

    if (els.co2Saved)     els.co2Saved.textContent     = `${(achievements.co2Saved || 0).toFixed(1)} kg`;
    if (els.daysTracked)  els.daysTracked.textContent   = new Set(activities.map((a) => a.date)).size;
    if (els.badgesEarned) els.badgesEarned.textContent  = (achievements.badges || []).length;
  }

  /* ──────────────────────────────────────── */
  /*  Badges Grid                             */
  /* ──────────────────────────────────────── */

  function renderBadgesGrid() {
    if (!els.badgesGrid) return;

    const earned = new Set((CarbonStorage.getAchievements() || {}).badges || []);

    els.badgesGrid.innerHTML = BADGES.map((badge) => {
      const isEarned = earned.has(badge.id);
      const cls = isEarned ? 'badge-card card--glass badge-card--earned' : 'badge-card card--glass badge-card--locked';
      const icon = isEarned ? badge.icon : '🔒';
      return `
        <div class="${cls}">
          <span class="badge-icon">${icon}</span>
          <span class="badge-name">${badge.name}</span>
          <span class="badge-desc">${badge.description}</span>
        </div>`;
    }).join('');
  }

  /* ──────────────────────────────────────── */
  /*  Virtual Forest (SVG)                    */
  /* ──────────────────────────────────────── */

  function renderForest() {
    if (!els.forest) return;

    const achievements = CarbonStorage.getAchievements() || {};
    const co2Saved     = achievements.co2Saved || 0;
    const treeCount    = Math.min(Math.floor(co2Saved / 10), 50);

    els.forest.innerHTML = ''; // clear

    if (treeCount <= 0) {
      els.forest.innerHTML = `<p style="color:var(--color-text-muted,#94A3B8);text-align:center;padding:40px 20px;font-size:0.95rem;">
        Start reducing your footprint to grow trees! 🌱</p>`;
      if (els.forestCount) els.forestCount.textContent = '0';
      return;
    }

    // Create SVG
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 800 300');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.style.overflow = 'visible';

    // Inject keyframe animation via <style>
    const defs = document.createElementNS(SVG_NS, 'defs');
    const style = document.createElementNS(SVG_NS, 'style');
    style.textContent = `
      @keyframes growIn {
        0%   { transform: scaleY(0); opacity: 0; }
        60%  { transform: scaleY(1.1); opacity: 1; }
        100% { transform: scaleY(1); opacity: 1; }
      }
      .tree-group {
        transform-origin: bottom center;
        animation: growIn 0.6s ease-out both;
      }
    `;
    defs.appendChild(style);
    svg.appendChild(defs);

    for (let i = 0; i < treeCount; i++) {
      const group = document.createElementNS(SVG_NS, 'g');
      group.setAttribute('class', 'tree-group');
      group.style.animationDelay = `${i * 80}ms`;

      const x = 20 + Math.random() * 760;
      const trunkH = 35 + Math.random() * 25;  // 35-60 height
      const trunkW = 8 + Math.random() * 4;    // 8-12 width
      const canopyR = 16 + Math.random() * 10; // 16-26 radius
      const green = GREEN_SHADES[Math.floor(Math.random() * GREEN_SHADES.length)];

      // Trunk
      const trunk = document.createElementNS(SVG_NS, 'rect');
      trunk.setAttribute('x', x - trunkW / 2);
      trunk.setAttribute('y', 280 - trunkH);
      trunk.setAttribute('width', trunkW);
      trunk.setAttribute('height', trunkH);
      trunk.setAttribute('rx', 2);
      trunk.setAttribute('fill', '#8B6914');

      // Canopy
      const canopy = document.createElementNS(SVG_NS, 'circle');
      canopy.setAttribute('cx', x);
      canopy.setAttribute('cy', 280 - trunkH - canopyR + 4); // slight overlap
      canopy.setAttribute('r', canopyR);
      canopy.setAttribute('fill', green);

      group.appendChild(trunk);
      group.appendChild(canopy);
      svg.appendChild(group);
    }

    els.forest.appendChild(svg);
    if (els.forestCount) els.forestCount.textContent = treeCount;
  }

  /* ──────────────────────────────────────── */
  /*  Weekly Challenges                       */
  /* ──────────────────────────────────────── */

  function renderChallenges() {
    if (!els.challengesList) return;

    const activities = CarbonStorage.getActivities() || [];

    // Deterministic challenge selection based on week number
    const weekNum = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
    const indices = [
      weekNum % CHALLENGES.length,
      (weekNum + 2) % CHALLENGES.length,
      (weekNum + 4) % CHALLENGES.length,
    ];
    // Deduplicate
    const activeIndices = [...new Set(indices)].slice(0, 3);

    els.challengesList.innerHTML = activeIndices.map((idx) => {
      const ch = CHALLENGES[idx];
      const progress = typeof ch.checkProgress === 'function' ? ch.checkProgress(activities) : 0;
      const pct = Math.min(Math.round((progress / ch.target) * 100), 100);

      return `
        <div class="challenge-card card--glass">
          <div class="challenge-header">
            <span class="challenge-icon">${ch.icon}</span>
            <div>
              <h4 class="challenge-name">${ch.name}</h4>
              <p class="challenge-desc">${ch.description}</p>
            </div>
          </div>
          <div class="challenge-progress">
            <div class="challenge-progress-bar">
              <div class="challenge-progress-fill" style="width:${pct}%"></div>
            </div>
            <span class="challenge-progress-text">${progress}/${ch.target} ${ch.unit}</span>
          </div>
        </div>`;
    }).join('');
  }

  /* ──────────────────────────────────────── */
  /*  Utility Helpers                         */
  /* ──────────────────────────────────────── */

  function todayStr() {
    return fmtDate(new Date());
  }

  function yesterdayStr() {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return fmtDate(d);
  }

  function fmtDate(d) {
    const y   = d.getFullYear();
    const m   = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  /**
   * Returns a Set of YYYY-MM-DD strings for the current ISO week (Mon–Sun).
   */
  function getThisWeekDates() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dow = today.getDay(); // 0=Sun
    const mondayOffset = dow === 0 ? -6 : 1 - dow;
    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayOffset);

    const dates = new Set();
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      if (d <= today) dates.add(fmtDate(d));
    }
    return dates;
  }

  /* ──────────────────────────────────────── */
  /*  Expose                                  */
  /* ──────────────────────────────────────── */

  return {
    init,
    refresh,
    checkBadges,
    updateStreak,
    renderForest,
  };
})();
