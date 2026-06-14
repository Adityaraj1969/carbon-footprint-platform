/**
 * CarbonLens — Tracker Module
 * Manages activity logging, heatmap calendar, and activity history.
 *
 * Dependencies: EmissionFactors, CarbonStorage (loaded before this file)
 */

window.Tracker = (() => {
  'use strict';

  /* ── DOM References ── */
  let els = {};

  /* ── State ── */
  let currentView = 'today'; // 'today' | 'week' | 'month'

  /* ── Category Emoji Map ── */
  const CATEGORY_EMOJI = {
    transport: '🚗',
    energy:    '⚡',
    food:      '🍽️',
    shopping:  '🛒',
    digital:   '📱',
  };

  /* ── Quick-Log Presets ── */
  const QUICK_LOG_PRESETS = [
    { type: 'drove',      emoji: '🚗', label: 'Drove to work',    category: 'transport' },
    { type: 'bus',        emoji: '🚌', label: 'Took the bus',     category: 'transport' },
    { type: 'cycled',     emoji: '🚲', label: 'Cycled/Walked',    category: 'transport' },
    { type: 'nonveg',     emoji: '🍔', label: 'Ate non-veg meal', category: 'food' },
    { type: 'veg',        emoji: '🥗', label: 'Ate veg meal',     category: 'food' },
    { type: 'shopping',   emoji: '🛒', label: 'Online shopping',  category: 'shopping' },
    { type: 'streaming',  emoji: '📺', label: 'Streaming (2hrs)', category: 'digital' },
    { type: 'ac',         emoji: '⚡', label: 'Used AC (4hrs)',   category: 'energy' },
  ];

  /* ──────────────────────────────────────── */
  /*  Public API                              */
  /* ──────────────────────────────────────── */

  function init() {
    els = {
      quickLogGrid:    document.getElementById('quick-log-grid'),
      customForm:      document.getElementById('custom-activity-form'),
      activityCategory: document.getElementById('activity-category'),
      activityDesc:    document.getElementById('activity-description'),
      activityAmount:  document.getElementById('activity-amount'),
      heatmap:         document.getElementById('heatmap-container'),
      viewTabs:        document.getElementById('tracker-view-tabs'),
      activityList:    document.getElementById('activity-list'),
    };

    // Tab switching
    if (els.viewTabs) {
      els.viewTabs.addEventListener('click', (e) => {
        const tab = e.target.closest('.tab[data-view]');
        if (!tab) return;
        setActiveTab(tab.dataset.view);
      });
    }

    // Custom activity form
    if (els.customForm) {
      els.customForm.addEventListener('submit', handleCustomActivity);
    }
  }

  function refresh() {
    renderQuickLogGrid();
    renderHeatmap();
    renderActivityList();
  }

  /* ──────────────────────────────────────── */
  /*  Quick-Log Grid                          */
  /* ──────────────────────────────────────── */

  function renderQuickLogGrid() {
    if (!els.quickLogGrid) return;

    els.quickLogGrid.innerHTML = QUICK_LOG_PRESETS
      .map((preset) => {
        const co2 = getQuickLogCO2(preset.type);
        return `
          <button class="quick-log-btn card--glass" data-type="${preset.type}">
            <span class="quick-log-emoji">${preset.emoji}</span>
            <span class="quick-log-label">${preset.label}</span>
            <span class="quick-log-co2">${co2.toFixed(2)} kg CO₂</span>
          </button>`;
      })
      .join('');

    // Attach click handlers
    els.quickLogGrid.querySelectorAll('.quick-log-btn').forEach((btn) => {
      btn.addEventListener('click', () => handleQuickLog(btn.dataset.type));
    });
  }

  /**
   * Calculate CO₂ for a quick-log preset type.
   * @param {string} type — preset identifier
   * @returns {number} kg CO₂
   */
  function getQuickLogCO2(type) {
    const profile  = CarbonStorage.getUserProfile() || {};
    const distance = profile.distance || 15; // km one-way
    const transport = profile.transport || 'car_petrol';
    const factor    = (EmissionFactors && EmissionFactors.transport)
      ? (EmissionFactors.transport[transport] || 0.21)
      : 0.21;

    switch (type) {
      case 'drove':     return factor * distance * 2;                       // round trip
      case 'bus':       return 0.089 * distance * 2;                        // bus round trip
      case 'cycled':    return 0;                                           // zero emissions
      case 'nonveg':    return 2.4;                                         // per meal
      case 'veg':       return 1.27;                                        // per meal
      case 'shopping':  return 0.5;                                         // per order
      case 'streaming': return 0.036 * 2;                                   // 2 hours
      case 'ac':        return 1.5 * 4;                                     // 4 hours
      default:          return 0;
    }
  }

  /**
   * Handle a quick-log button click.
   */
  function handleQuickLog(type) {
    const preset = QUICK_LOG_PRESETS.find((p) => p.type === type);
    if (!preset) return;

    const co2 = getQuickLogCO2(type);
    const activity = {
      id:          Date.now().toString(),
      date:        todayStr(),
      category:    preset.category,
      description: preset.label,
      amount:      1,
      co2:         parseFloat(co2.toFixed(3)),
      timestamp:   Date.now(),
    };

    CarbonStorage.addActivity(activity);

    // Award XP
    const achievements = CarbonStorage.getAchievements() || { xp: 0 };
    CarbonStorage.updateAchievements({ xp: (achievements.xp || 0) + 10 });

    // Dispatch event
    document.dispatchEvent(new CustomEvent('carbonlens:activity-logged'));

    showToast(`✅ Logged: ${preset.label} (${co2.toFixed(2)} kg CO₂)`);
    refresh();
  }

  /* ──────────────────────────────────────── */
  /*  Custom Activity Form                    */
  /* ──────────────────────────────────────── */

  function handleCustomActivity(e) {
    e.preventDefault();

    const category    = els.activityCategory ? els.activityCategory.value : 'transport';
    const description = els.activityDesc     ? els.activityDesc.value.trim() : '';
    const amount      = els.activityAmount   ? parseFloat(els.activityAmount.value) || 0 : 0;

    if (!description || amount <= 0) return;

    const co2 = calculateCustomCO2(category, amount);

    const activity = {
      id:          Date.now().toString(),
      date:        todayStr(),
      category,
      description,
      amount,
      co2:         parseFloat(co2.toFixed(3)),
      timestamp:   Date.now(),
    };

    CarbonStorage.addActivity(activity);

    // Award XP
    const achievements = CarbonStorage.getAchievements() || { xp: 0 };
    CarbonStorage.updateAchievements({ xp: (achievements.xp || 0) + 10 });

    document.dispatchEvent(new CustomEvent('carbonlens:activity-logged'));

    showToast(`✅ Logged: ${description} (${co2.toFixed(2)} kg CO₂)`);

    // Reset form
    if (els.customForm) els.customForm.reset();

    refresh();
  }

  /**
   * Calculate CO₂ for a custom activity based on category and amount.
   */
  function calculateCustomCO2(category, amount) {
    const ef = typeof EmissionFactors !== 'undefined' ? EmissionFactors : {};

    switch (category) {
      case 'transport':
        return amount * ((ef.transport && ef.transport.car_petrol) || 0.21);
      case 'energy':
        return amount * ((ef.energy && ef.energy.electricity_per_kwh) || 0.82);
      case 'food':
        return amount * ((ef.food && ef.food.non_vegetarian) ? (ef.food.non_vegetarian / 3) : 2.4);
      case 'shopping':
        return amount * ((ef.shopping && ef.shopping.clothing_per_item) || 7);
      case 'digital':
        return amount * ((ef.digital && ef.digital.streaming_per_hour) || 0.036);
      default:
        return amount * 0.5;
    }
  }

  /* ──────────────────────────────────────── */
  /*  Heatmap Calendar                        */
  /* ──────────────────────────────────────── */

  function renderHeatmap() {
    if (!els.heatmap) return;

    const activities = CarbonStorage.getActivities() || [];

    // Build a date → CO₂ map for last 90 days
    const co2ByDate = {};
    activities.forEach((a) => {
      co2ByDate[a.date] = (co2ByDate[a.date] || 0) + (a.co2 || 0);
    });

    // Generate last 91 days (13 full weeks)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find the start date: go back 90 days, then align to Monday
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 90);
    const dayOfWeek = startDate.getDay(); // 0=Sun … 6=Sat
    const daysToMonday = dayOfWeek === 0 ? 1 : (dayOfWeek === 1 ? 0 : 8 - dayOfWeek);
    startDate.setDate(startDate.getDate() - ((dayOfWeek + 6) % 7)); // align to Monday

    // Calculate number of weeks
    const totalDays = Math.ceil((today - startDate) / (24 * 60 * 60 * 1000)) + 1;
    const weeks = Math.ceil(totalDays / 7);

    // Day labels
    const dayLabels = ['Mon', '', 'Wed', '', 'Fri', '', 'Sun'];

    // Month labels — track which months appear in which columns
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    let html = '<div class="heatmap">';

    // Month labels row
    html += '<div class="heatmap-months">';
    html += '<div class="heatmap-day-label"></div>'; // spacer for day labels column
    let lastMonth = -1;
    for (let w = 0; w < weeks; w++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + w * 7);
      const m = d.getMonth();
      if (m !== lastMonth) {
        html += `<div class="heatmap-month-label">${monthNames[m]}</div>`;
        lastMonth = m;
      } else {
        html += '<div class="heatmap-month-label"></div>';
      }
    }
    html += '</div>';

    // Grid: 7 rows × weeks columns
    for (let row = 0; row < 7; row++) {
      html += '<div class="heatmap-row">';
      html += `<div class="heatmap-day-label">${dayLabels[row]}</div>`;
      for (let w = 0; w < weeks; w++) {
        const cellDate = new Date(startDate);
        cellDate.setDate(cellDate.getDate() + w * 7 + row);

        if (cellDate > today) {
          html += '<div class="heatmap-cell heatmap-cell--empty"></div>';
          continue;
        }

        const dateStr = formatDateStr(cellDate);
        const co2 = co2ByDate[dateStr] || 0;
        const color = heatmapColor(co2);
        const title = `${dateStr}: ${co2.toFixed(1)} kg CO₂`;

        html += `<div class="heatmap-cell" title="${title}" style="background:${color}"></div>`;
      }
      html += '</div>';
    }

    html += '</div>';
    els.heatmap.innerHTML = html;
  }

  /**
   * Return a CSS colour for a given daily CO₂ value.
   */
  function heatmapColor(co2) {
    if (co2 <= 0)  return 'rgba(255,255,255,0.05)';
    if (co2 <= 2)  return 'rgba(16,185,129,0.4)';   // green-ish
    if (co2 <= 5)  return 'rgba(245,158,11,0.6)';    // amber
    return 'rgba(239,68,68,0.8)';                     // red
  }

  /* ──────────────────────────────────────── */
  /*  Activity History                        */
  /* ──────────────────────────────────────── */

  function renderActivityList() {
    if (!els.activityList) return;

    const activities = CarbonStorage.getActivities() || [];
    const filtered   = filterActivities(activities, currentView);

    if (filtered.length === 0) {
      els.activityList.innerHTML = `
        <div class="empty-state">
          <p>🌱 No activities logged yet. Start tracking to see your impact!</p>
        </div>`;
      return;
    }

    // Sort newest first
    filtered.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    els.activityList.innerHTML = filtered
      .map(
        (a) => `
        <div class="activity-entry card--glass">
          <span class="activity-emoji">${CATEGORY_EMOJI[a.category] || '📌'}</span>
          <div class="activity-details">
            <span class="activity-desc">${escapeHtml(a.description)}</span>
            <span class="activity-time">${formatRelativeTime(a.timestamp)}</span>
          </div>
          <span class="activity-co2">${(a.co2 || 0).toFixed(2)} kg</span>
          <button class="activity-delete" data-id="${a.id}" title="Delete">×</button>
        </div>`
      )
      .join('');

    // Attach delete handlers
    els.activityList.querySelectorAll('.activity-delete').forEach((btn) => {
      btn.addEventListener('click', () => {
        CarbonStorage.deleteActivity(btn.dataset.id);
        document.dispatchEvent(new CustomEvent('carbonlens:activity-logged'));
        refresh();
      });
    });
  }

  /**
   * Filter activities by time window.
   */
  function filterActivities(activities, view) {
    const today = todayStr();

    switch (view) {
      case 'today':
        return activities.filter((a) => a.date === today);

      case 'week': {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        const weekAgo = formatDateStr(d);
        return activities.filter((a) => a.date >= weekAgo);
      }

      case 'month': {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        const monthAgo = formatDateStr(d);
        return activities.filter((a) => a.date >= monthAgo);
      }

      default:
        return activities;
    }
  }

  /* ──────────────────────────────────────── */
  /*  Tab Switching                           */
  /* ──────────────────────────────────────── */

  function setActiveTab(view) {
    currentView = view;

    // Update active tab styling
    if (els.viewTabs) {
      els.viewTabs.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
      const active = els.viewTabs.querySelector(`.tab[data-view="${view}"]`);
      if (active) active.classList.add('active');
    }

    // Re-render activity list only (no need to rebuild heatmap)
    renderActivityList();
  }

  /* ──────────────────────────────────────── */
  /*  Toast Notification                      */
  /* ──────────────────────────────────────── */

  function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.textContent = message;

    // Inline styles for portability (CSS can override)
    Object.assign(toast.style, {
      position:       'fixed',
      bottom:         '90px',
      left:           '50%',
      transform:      'translateX(-50%) translateY(20px)',
      background:     'rgba(16, 185, 129, 0.95)',
      color:          '#fff',
      padding:        '12px 24px',
      borderRadius:   '12px',
      fontSize:       '0.9rem',
      fontWeight:     '500',
      zIndex:         '10000',
      opacity:        '0',
      transition:     'opacity 0.3s ease, transform 0.3s ease',
      pointerEvents:  'none',
      boxShadow:      '0 8px 32px rgba(16,185,129,0.3)',
      whiteSpace:     'nowrap',
    });

    document.body.appendChild(toast);

    // Trigger slide-up animation
    requestAnimationFrame(() => {
      toast.style.opacity   = '1';
      toast.style.transform = 'translateX(-50%) translateY(0)';
    });

    // Fade out & remove
    setTimeout(() => {
      toast.style.opacity   = '0';
      toast.style.transform = 'translateX(-50%) translateY(20px)';
      setTimeout(() => toast.remove(), 350);
    }, 2500);
  }

  /* ──────────────────────────────────────── */
  /*  Utility Helpers                         */
  /* ──────────────────────────────────────── */

  /** Today as YYYY-MM-DD */
  function todayStr() {
    return formatDateStr(new Date());
  }

  /** Format a Date object to YYYY-MM-DD */
  function formatDateStr(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  /** Format a timestamp into a human-readable relative time string. */
  function formatRelativeTime(ts) {
    if (!ts) return '';
    const diff = Date.now() - ts;
    const mins  = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days  = Math.floor(diff / 86400000);

    if (mins < 1)   return 'Just now';
    if (mins < 60)  return `${mins} min${mins > 1 ? 's' : ''} ago`;
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (days === 1)  return 'Yesterday';
    if (days < 7)    return `${days} days ago`;
    return new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  }

  /** Basic HTML escape to prevent XSS in user-entered descriptions. */
  function escapeHtml(str) {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return String(str || '').replace(/[&<>"']/g, (c) => map[c]);
  }

  /* ──────────────────────────────────────── */
  /*  Expose                                  */
  /* ──────────────────────────────────────── */

  return {
    init,
    refresh,
    getQuickLogCO2,
  };
})();
