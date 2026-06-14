/**
 * CarbonLens — Chart.js Helper Utilities
 * Wraps Chart.js with dark-theme defaults and convenience factories.
 * Loaded 3rd — depends on Chart.js CDN being available on `window.Chart`.
 */

(function () {
  'use strict';

  // ── Category color palette ──────────────────────────────────────
  const PALETTE = {
    transport: '#3B82F6',
    energy:    '#F59E0B',
    food:      '#EF4444',
    shopping:  '#8B5CF6',
    digital:   '#06B6D4'
  };

  // ── Shared dark-theme tokens ────────────────────────────────────
  const GRID_COLOR = 'rgba(255,255,255,0.1)';
  const TICK_COLOR = '#94A3B8';
  const FONT_FAMILY = "'Inter', sans-serif";

  const Charts = {
    /** Ordered color palette for categories */
    palette: PALETTE,

    /**
     * Set Chart.js global defaults for the dark theme.
     * Call once at app startup.
     */
    init() {
      if (typeof Chart === 'undefined') {
        console.warn('[Charts] Chart.js not loaded — skipping init');
        return;
      }

      Chart.defaults.color = TICK_COLOR;
      Chart.defaults.font.family = FONT_FAMILY;
      Chart.defaults.font.size = 12;
      Chart.defaults.responsive = true;
      Chart.defaults.maintainAspectRatio = false;
      Chart.defaults.plugins.legend.labels.boxWidth = 12;
      Chart.defaults.plugins.legend.labels.padding = 16;
      Chart.defaults.plugins.legend.labels.usePointStyle = true;
      Chart.defaults.plugins.legend.labels.borderWidth = 0;
      Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(15,23,42,0.9)';
      Chart.defaults.plugins.tooltip.titleFont = { weight: '600' };
      Chart.defaults.plugins.tooltip.padding = 10;
      Chart.defaults.plugins.tooltip.cornerRadius = 8;
      Chart.defaults.plugins.tooltip.borderColor = 'rgba(255,255,255,0.1)';
      Chart.defaults.plugins.tooltip.borderWidth = 1;
    },

    // ── Factory: Doughnut ─────────────────────────────────────────

    /**
     * Create a doughnut chart with the CarbonLens dark theme.
     * @param {string}   canvasId  ID of the <canvas> element
     * @param {string[]} labels    Segment labels
     * @param {number[]} data      Segment values
     * @param {string[]} colors    Segment colours (hex/rgba)
     * @returns {Chart} Chart instance
     */
    createDoughnut(canvasId, labelsOrOpts, data, colors) {
      // Support both: createDoughnut(id, labels, data, colors) and createDoughnut(id, {labels, data, colors})
      let labels;
      if (typeof labelsOrOpts === 'object' && !Array.isArray(labelsOrOpts)) {
        labels = labelsOrOpts.labels;
        data   = labelsOrOpts.data;
        colors = labelsOrOpts.colors;
      } else {
        labels = labelsOrOpts;
      }

      const ctx = document.getElementById(canvasId);
      if (!ctx) { console.warn('[Charts] canvas not found:', canvasId); return null; }

      return new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels,
          datasets: [{
            data,
            backgroundColor: colors,
            borderColor: 'rgba(15,23,42,0.8)',
            borderWidth: 2,
            hoverOffset: 6
          }]
        },
        options: {
          cutout: '68%',
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                color: TICK_COLOR,
                padding: 14,
                font: { size: 11, family: FONT_FAMILY }
              }
            }
          },
          animation: {
            animateRotate: true,
            duration: 800,
            easing: 'easeOutQuart'
          }
        }
      });
    },

    // ── Factory: Line ─────────────────────────────────────────────

    /**
     * Create a line chart with gradient fill and smooth curves.
     * @param {string}   canvasId  ID of the <canvas> element
     * @param {string[]} labels    X-axis labels
     * @param {number[]} data      Data points
     * @param {string}   label     Dataset label
     * @returns {Chart} Chart instance
     */
    createLine(canvasId, labelsOrOpts, data, label) {
      // Support both: createLine(id, labels, data, label) and createLine(id, {labels, datasets})
      let labels, datasets;
      if (typeof labelsOrOpts === 'object' && !Array.isArray(labelsOrOpts) && labelsOrOpts.labels) {
        labels   = labelsOrOpts.labels;
        datasets = labelsOrOpts.datasets;
      } else {
        labels = labelsOrOpts;
      }

      const canvas = document.getElementById(canvasId);
      if (!canvas) { console.warn('[Charts] canvas not found:', canvasId); return null; }
      const ctx = canvas.getContext('2d');

      // Build gradient fill
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.parentElement?.clientHeight || 250);
      gradient.addColorStop(0, 'rgba(13,159,110,0.35)');
      gradient.addColorStop(1, 'rgba(13,159,110,0.02)');

      // If datasets were provided, use them directly (fill gradient on first dataset if needed)
      if (datasets) {
        datasets.forEach(ds => {
          if (ds.fill && !ds.backgroundColor) {
            ds.backgroundColor = gradient;
          }
          if (!ds.pointBackgroundColor) ds.pointBackgroundColor = ds.borderColor || '#0D9F6E';
          if (!ds.pointBorderColor) ds.pointBorderColor = '#0F172A';
          if (!ds.pointBorderWidth) ds.pointBorderWidth = 2;
          if (!ds.pointRadius) ds.pointRadius = 4;
          if (!ds.pointHoverRadius) ds.pointHoverRadius = 6;
          if (ds.tension === undefined) ds.tension = 0.4;
        });
      } else {
        datasets = [{
          label,
          data,
          borderColor: '#0D9F6E',
          backgroundColor: gradient,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#0D9F6E',
          pointBorderColor: '#0F172A',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6
        }];
      }

      return new Chart(canvas, {
        type: 'line',
        data: { labels, datasets },
        options: {
          scales: {
            x: {
              grid: { color: GRID_COLOR, drawBorder: false },
              ticks: { color: TICK_COLOR, font: { size: 11 } }
            },
            y: {
              grid: { color: GRID_COLOR, drawBorder: false },
              ticks: { color: TICK_COLOR, font: { size: 11 } },
              beginAtZero: true
            }
          },
          plugins: {
            legend: { display: true, labels: { color: TICK_COLOR } }
          },
          animation: { duration: 800, easing: 'easeOutQuart' }
        }
      });
    },

    // ── Factory: Bar ──────────────────────────────────────────────

    /**
     * Create a bar chart with rounded bars and dark theme.
     * @param {string}   canvasId  ID of the <canvas> element
     * @param {string[]} labels    Bar labels
     * @param {number[]} data      Bar values
     * @param {string[]} colors    Bar colours
     * @returns {Chart} Chart instance
     */
    createBar(canvasId, labels, data, colors) {
      const ctx = document.getElementById(canvasId);
      if (!ctx) { console.warn('[Charts] canvas not found:', canvasId); return null; }

      return new Chart(ctx, {
        type: 'bar',
        data: {
          labels,
          datasets: [{
            data,
            backgroundColor: colors,
            borderRadius: 8,
            borderSkipped: false,
            maxBarThickness: 40
          }]
        },
        options: {
          scales: {
            x: {
              grid: { display: false },
              ticks: { color: TICK_COLOR, font: { size: 11 } }
            },
            y: {
              grid: { color: GRID_COLOR, drawBorder: false },
              ticks: { color: TICK_COLOR, font: { size: 11 } },
              beginAtZero: true
            }
          },
          plugins: {
            legend: { display: false }
          },
          animation: { duration: 700, easing: 'easeOutQuart' }
        }
      });
    },

    // ── Mutation helpers ──────────────────────────────────────────

    /**
     * Update chart data and re-render with animation.
     * @param {Chart}    chart    Existing Chart.js instance
     * @param {number[]} newData  New data array for the first dataset
     */
    updateChart(chart, newData) {
      if (!chart) return;
      chart.data.datasets[0].data = newData;
      chart.update('active');   // triggers default animation
    },

    /**
     * Safely destroy a Chart.js instance.
     * @param {Chart} chart
     */
    destroyChart(chart) {
      if (chart && typeof chart.destroy === 'function') {
        chart.destroy();
      }
    }
  };

  window.Charts = Charts;
})();
