/**
 * CarbonLens — Emission Factors Database
 * India-specific CO₂ emission factors for all calculation categories.
 * Loaded first — no dependencies.
 */

(function () {
  'use strict';

  const EmissionFactors = {
    // ─── Transportation (kg CO₂ per km) ───────────────────────────
    transport: {
      car_petrol:   0.21,
      car_diesel:   0.27,
      motorcycle:   0.103,
      auto_rickshaw: 0.12,
      bus:          0.089,
      metro:        0.035,
      train:        0.041,
      bicycle:      0,
      walking:      0,
      ev_car:       0.053,
      // Domestic flights
      flight_domestic_per_km: 0.255,
      avg_domestic_flight_km: 1500
    },

    // ─── Home Energy ──────────────────────────────────────────────
    energy: {
      electricity_per_kwh: 0.82,   // kg CO₂ per kWh (India grid average)
      lpg_per_cylinder:    44.1,   // kg CO₂ per 14.2 kg LPG cylinder
      png_per_scm:         2.04,   // kg CO₂ per standard cubic meter
      ac_per_hour:         1.5     // kg CO₂/hr (1.5-ton AC, ~1.2 kW × 0.82 grid + cycling)
    },

    // ─── Food (kg CO₂ per day by diet type) ───────────────────────
    food: {
      non_vegetarian: 7.2,
      vegetarian:     3.8,
      vegan:          2.9,
      eating_out_multiplier: 1.3,  // 30 % surcharge on meals eaten out
      food_waste: {
        rarely:    0.5,            // kg CO₂/day from waste
        sometimes: 1.5,
        often:     3.0
      }
    },

    // ─── Shopping (kg CO₂ per item) ───────────────────────────────
    shopping: {
      clothing_per_item:          7,
      online_order_delivery:      0.5,
      electronics_per_item_per_year: 150
    },

    // ─── Digital (kg CO₂ per hour / per unit) ─────────────────────
    digital: {
      streaming_per_hour:    0.036,
      social_media_per_hour: 0.01,
      email_per_email:       0.004
    },

    // ─── Benchmarks (tons CO₂ per year) ───────────────────────────
    benchmarks: {
      india_average:  1.9,
      global_average: 4.7,
      paris_target:   2.1,
      us_average:     14.7
    },

    // ─── Lifestyle Equivalents (per 1 ton CO₂) ───────────────────
    equivalents: {
      trees_to_absorb:       45,       // trees needed to absorb 1 ton/year
      delhi_mumbai_flights:  2.6,      // number of Delhi↔Mumbai flights
      lightbulbs_year:       103,      // 10 W LED bulbs running a full year
      phone_charges:         121951    // smartphone charge cycles
    },

    // ─── Helper: Convert monthly kgCO₂ to yearly equivalents ─────
    /**
     * @param  {number} kgCO2PerMonth — monthly emissions in kg CO₂
     * @returns {{ trees: number, flights: number, bulbs: number, phones: number }}
     */
    convertToEquivalents(kgCO2PerMonth) {
      const tonsPerYear = (kgCO2PerMonth * 12) / 1000;
      return {
        trees:   parseFloat((tonsPerYear * this.equivalents.trees_to_absorb).toFixed(1)),
        flights: parseFloat((tonsPerYear * this.equivalents.delhi_mumbai_flights).toFixed(1)),
        bulbs:   parseFloat((tonsPerYear * this.equivalents.lightbulbs_year).toFixed(1)),
        phones:  parseFloat((tonsPerYear * this.equivalents.phone_charges).toFixed(0))
      };
    }
  };

  // Freeze to prevent accidental mutation
  Object.freeze(EmissionFactors.transport);
  Object.freeze(EmissionFactors.energy);
  Object.freeze(EmissionFactors.food.food_waste);
  Object.freeze(EmissionFactors.food);
  Object.freeze(EmissionFactors.shopping);
  Object.freeze(EmissionFactors.digital);
  Object.freeze(EmissionFactors.benchmarks);
  Object.freeze(EmissionFactors.equivalents);

  window.EmissionFactors = EmissionFactors;
})();
