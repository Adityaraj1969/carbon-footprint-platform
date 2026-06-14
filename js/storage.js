/**
 * CarbonLens — LocalStorage Abstraction Layer
 * All persistent data goes through this module.
 * Uses the 'carbonlens_' key prefix for namespace isolation.
 * Loaded 2nd — no dependencies.
 */

(function () {
  'use strict';

  /** @type {string} Prefix for all localStorage keys */
  const PREFIX = 'carbonlens_';

  // ── Default shapes ──────────────────────────────────────────────
  const DEFAULTS = {
    profile: {
      name: '',
      city: '',
      transport: 'bus',
      distance: 10,
      diet: 'vegetarian',
      electricity: 100,
      fuel: 'lpg'
    },
    footprint: {
      transport: 0,
      energy: 0,
      food: 0,
      shopping: 0,
      digital: 0,
      total: 0,
      monthly: 0,
      yearly: 0
    },
    achievements: {
      badges: [],
      streaks: { current: 0, best: 0, lastDate: null },
      xp: 0,
      level: 1,
      co2Saved: 0
    }
  };

  const CarbonStorage = {
    // ── Generic helpers ────────────────────────────────────────────

    /**
     * Read a value from localStorage.
     * @param {string} key  Key name (prefix is added automatically)
     * @returns {*} Parsed JSON value or null
     */
    get(key) {
      try {
        const raw = localStorage.getItem(PREFIX + key);
        return raw === null ? null : JSON.parse(raw);
      } catch (err) {
        console.warn('[CarbonStorage] get error:', err);
        return null;
      }
    },

    /**
     * Write a value to localStorage.
     * @param {string} key   Key name (prefix is added automatically)
     * @param {*}      value Any JSON-serialisable value
     */
    set(key, value) {
      try {
        localStorage.setItem(PREFIX + key, JSON.stringify(value));
      } catch (err) {
        console.warn('[CarbonStorage] set error:', err);
      }
    },

    // ── User Profile ──────────────────────────────────────────────

    /** @returns {{ name, city, transport, distance, diet, electricity, fuel }} */
    getUserProfile() {
      return this.get('profile') || { ...DEFAULTS.profile };
    },

    /** @param {Object} profile */
    setUserProfile(profile) {
      this.set('profile', profile);
    },

    // ── Footprint ─────────────────────────────────────────────────

    /** @returns {{ transport, energy, food, shopping, digital, total, monthly, yearly }} */
    getFootprint() {
      return this.get('footprint') || { ...DEFAULTS.footprint };
    },

    /** @param {Object} footprint */
    setFootprint(footprint) {
      this.set('footprint', footprint);
    },

    // ── Activities ────────────────────────────────────────────────

    /** @returns {Array<{ id, date, category, description, amount, co2, timestamp }>} */
    getActivities() {
      return this.get('activities') || [];
    },

    /**
     * Append an activity to the list.
     * Assigns `id` (Date.now string) and `timestamp` automatically.
     * @param {Object} activity  { date, category, description, amount, co2 }
     * @returns {Object} The activity with id/timestamp added
     */
    addActivity(activity) {
      const activities = this.getActivities();
      const enriched = {
        ...activity,
        id: String(Date.now()),
        timestamp: new Date().toISOString()
      };
      activities.push(enriched);
      this.set('activities', activities);
      return enriched;
    },

    /**
     * Remove an activity by its id.
     * @param {string} id
     */
    deleteActivity(id) {
      const activities = this.getActivities().filter(a => a.id !== id);
      this.set('activities', activities);
    },

    // ── Achievements ──────────────────────────────────────────────

    /** @returns {{ badges: string[], streaks: {current, best, lastDate}, xp, level, co2Saved }} */
    getAchievements() {
      return this.get('achievements') || JSON.parse(JSON.stringify(DEFAULTS.achievements));
    },

    /**
     * Merge partial achievement data into existing record.
     * @param {Object} data  Partial achievements object
     */
    updateAchievements(data) {
      const current = this.getAchievements();
      const merged = { ...current, ...data };

      // Deep-merge streaks if provided
      if (data.streaks) {
        merged.streaks = { ...current.streaks, ...data.streaks };
      }
      // Deduplicate badges
      if (data.badges) {
        merged.badges = [...new Set([...current.badges, ...data.badges])];
      }

      this.set('achievements', merged);
    },

    // ── Onboarding flag ───────────────────────────────────────────

    /** @returns {boolean} */
    isOnboarded() {
      return this.get('onboarded') === true;
    },

    /** @param {boolean} flag */
    setOnboarded(flag) {
      this.set('onboarded', !!flag);
    },

    // ── Monthly History (trend tracking) ──────────────────────────

    /**
     * @returns {Array<{ month, total, transport, energy, food, shopping, digital }>}
     */
    getMonthlyHistory() {
      return this.get('monthly_history') || [];
    },

    /**
     * Add or update a monthly snapshot.
     * If a snapshot for the same `month` key already exists it is replaced.
     * @param {Object} snapshot  { month, total, transport, energy, food, shopping, digital }
     */
    addMonthlySnapshot(snapshot) {
      const history = this.getMonthlyHistory();
      const idx = history.findIndex(h => h.month === snapshot.month);
      if (idx !== -1) {
        history[idx] = snapshot;
      } else {
        history.push(snapshot);
      }
      // Keep last 12 months only
      while (history.length > 12) history.shift();
      this.set('monthly_history', history);
    },

    // ── Utility ───────────────────────────────────────────────────

    /** Wipe ALL CarbonLens data from localStorage (useful for testing). */
    clearAll() {
      try {
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(PREFIX)) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(k => localStorage.removeItem(k));
      } catch (err) {
        console.warn('[CarbonStorage] clearAll error:', err);
      }
    }
  };

  window.CarbonStorage = CarbonStorage;
})();
