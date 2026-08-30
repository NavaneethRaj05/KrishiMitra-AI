/**
 * KrishiMitra AI — Lightweight Chart Utilities
 * Canvas-based bar, line, and donut charts with no external dependencies
 */

const KrishiCharts = (() => {

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

  function createCanvas(container, width, height) {
    const canvas = document.createElement('canvas');
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    if (typeof container === 'string') container = document.getElementById(container);
    if (container) { container.innerHTML = ''; container.appendChild(canvas); }
    return { canvas, ctx, width, height };
  }

  /**
   * Bar Chart
   * @param {string|HTMLElement} container
   * @param {Object} options - { labels: string[], datasets: [{label, data, color}], width, height }
   */
  function barChart(container, options) {
    const { labels, datasets, width = 500, height = 250, horizontal = false } = options;
    const { ctx, width: w, height: h } = createCanvas(container, width, height);

    const pad = { top: 20, right: 20, bottom: 40, left: 50 };
    const chartW = w - pad.left - pad.right;
    const chartH = h - pad.top - pad.bottom;

    // Find max value
    let maxVal = 0;
    datasets.forEach(ds => ds.data.forEach(v => { if (v > maxVal) maxVal = v; }));
    maxVal = maxVal * 1.15;

    // Draw grid lines
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 0.5;
    ctx.font = '11px Plus Jakarta Sans, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'right';

    for (let i = 0; i <= 4; i++) {
      const y = pad.top + chartH - (i / 4) * chartH;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(w - pad.right, y);
      ctx.stroke();
      ctx.fillText(Math.round((i / 4) * maxVal).toLocaleString(), pad.left - 8, y + 4);
    }

    // Draw bars
    const groupWidth = chartW / labels.length;
    const barWidth = Math.min(groupWidth * 0.6 / datasets.length, 40);
    const groupPad = (groupWidth - barWidth * datasets.length) / 2;

    datasets.forEach((ds, di) => {
      const color = ds.color || COLORS[di];
      ds.data.forEach((val, i) => {
        const x = pad.left + i * groupWidth + groupPad + di * barWidth;
        const barH = (val / maxVal) * chartH;
        const y = pad.top + chartH - barH;

        // Bar with rounded top
        ctx.fillStyle = color;
        ctx.beginPath();
        const r = Math.min(4, barWidth / 2);
        ctx.moveTo(x, pad.top + chartH);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.lineTo(x + barWidth - r, y);
        ctx.quadraticCurveTo(x + barWidth, y, x + barWidth, y + r);
        ctx.lineTo(x + barWidth, pad.top + chartH);
        ctx.fill();
      });
    });

    // X-axis labels
    ctx.fillStyle = '#64748b';
    ctx.textAlign = 'center';
    ctx.font = '11px Plus Jakarta Sans, sans-serif';
    labels.forEach((label, i) => {
      const x = pad.left + i * groupWidth + groupWidth / 2;
      ctx.fillText(label, x, h - pad.bottom + 16);
    });
  }

  /**
   * Line Chart
   * @param {string|HTMLElement} container
   * @param {Object} options - { labels, datasets: [{label, data, color, dashed}], width, height, showArea }
   */
  function lineChart(container, options) {
    const { labels, datasets, width = 500, height = 250, showArea = true } = options;
    const { ctx, width: w, height: h } = createCanvas(container, width, height);

    const pad = { top: 20, right: 20, bottom: 40, left: 55 };
    const chartW = w - pad.left - pad.right;
    const chartH = h - pad.top - pad.bottom;

    let minVal = Infinity, maxVal = -Infinity;
    datasets.forEach(ds => ds.data.forEach(v => {
      if (v != null && !isNaN(v)) {
        if (v < minVal) minVal = v;
        if (v > maxVal) maxVal = v;
      }
    }));
    if (minVal === Infinity) { minVal = 1000; maxVal = 3000; }
    const range = maxVal - minVal || 1;
    minVal = Math.max(0, minVal - range * 0.05);
    maxVal += range * 0.1;

    // Grid
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 0.5;
    ctx.font = '11px Plus Jakarta Sans, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'right';

    for (let i = 0; i <= 4; i++) {
      const y = pad.top + chartH - (i / 4) * chartH;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(w - pad.right, y);
      ctx.stroke();
      const val = minVal + (i / 4) * (maxVal - minVal);
      ctx.fillText('₹' + Math.round(val).toLocaleString(), pad.left - 8, y + 4);
    }

    // Draw datasets
    datasets.forEach((ds, di) => {
      const color = ds.color || COLORS[di];
      const points = [];
      ds.data.forEach((v, i) => {
        if (v != null && !isNaN(v)) {
          points.push({
            x: pad.left + (i / Math.max(labels.length - 1, 1)) * chartW,
            y: pad.top + chartH - ((v - minVal) / (maxVal - minVal)) * chartH,
          });
        }
      });

      if (points.length === 0) return;

      // Area fill
      if (showArea && !ds.dashed) {
        ctx.beginPath();
        ctx.moveTo(points[0].x, pad.top + chartH);
        points.forEach(p => ctx.lineTo(p.x, p.y));
        ctx.lineTo(points[points.length - 1].x, pad.top + chartH);
        ctx.closePath();
        const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + chartH);
        grad.addColorStop(0, color + '25');
        grad.addColorStop(1, color + '05');
        ctx.fillStyle = grad;
        ctx.fill();
      }

      // Line
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      if (ds.dashed) ctx.setLineDash([6, 4]);
      else ctx.setLineDash([]);
      points.forEach((p, i) => { if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); });
      ctx.stroke();
      ctx.setLineDash([]);

      // Dots
      points.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.stroke();
      });
    });

    // X labels
    ctx.fillStyle = '#64748b';
    ctx.textAlign = 'center';
    ctx.font = '10px Plus Jakarta Sans, sans-serif';
    const step = Math.max(1, Math.floor(labels.length / 8));
    labels.forEach((label, i) => {
      if (i % step === 0 || i === labels.length - 1) {
        const x = pad.left + (i / Math.max(labels.length - 1, 1)) * chartW;
        ctx.fillText(label, x, h - pad.bottom + 16);
      }
    });
  }

  /**
   * Donut Chart
   * @param {string|HTMLElement} container
   * @param {Object} options - { labels, data, colors, width, height, centerLabel }
   */
  function donutChart(container, options) {
    const { labels, data, colors = COLORS, width = 200, height = 200, centerLabel = '' } = options;
    const { ctx, width: w, height: h } = createCanvas(container, width, height);

    const cx = w / 2, cy = h / 2;
    const radius = Math.min(w, h) / 2 - 10;
    const innerRadius = radius * 0.6;
    const total = data.reduce((a, b) => a + b, 0);

    let startAngle = -Math.PI / 2;
    data.forEach((val, i) => {
      const sliceAngle = (val / total) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, startAngle, startAngle + sliceAngle);
      ctx.arc(cx, cy, innerRadius, startAngle + sliceAngle, startAngle, true);
      ctx.closePath();
      ctx.fillStyle = colors[i % colors.length];
      ctx.fill();
      startAngle += sliceAngle;
    });

    // Center text
    if (centerLabel) {
      ctx.fillStyle = '#334155';
      ctx.font = 'bold 18px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(centerLabel, cx, cy);
    }
  }

  /**
   * Horizontal Bar (for SHAP values)
   * @param {string|HTMLElement} container
   * @param {Object} options - { labels, values, width, height, title }
   */
  function shapBar(container, options) {
    const { labels, values, width = 500, height = 200, title = '' } = options;
    const { ctx, width: w, height: h } = createCanvas(container, width, height);

    const pad = { top: title ? 30 : 10, right: 20, bottom: 10, left: 120 };
    const chartW = w - pad.left - pad.right;
    const barHeight = Math.min(24, (h - pad.top - pad.bottom) / labels.length - 4);

    // Title
    if (title) {
      ctx.fillStyle = '#1e293b';
      ctx.font = 'bold 14px Outfit, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(title, pad.left, 20);
    }

    const maxAbs = Math.max(...values.map(Math.abs)) || 1;
    const midX = pad.left + chartW / 2;

    // Zero line
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(midX, pad.top);
    ctx.lineTo(midX, h - pad.bottom);
    ctx.stroke();

    labels.forEach((label, i) => {
      const y = pad.top + i * (barHeight + 6);
      const val = values[i];
      const barW = (Math.abs(val) / maxAbs) * (chartW / 2 - 10);
      const color = val >= 0 ? '#10b981' : '#ef4444';

      // Bar
      ctx.fillStyle = color;
      const r = 3;
      if (val >= 0) {
        ctx.beginPath();
        ctx.moveTo(midX, y);
        ctx.lineTo(midX + barW - r, y);
        ctx.quadraticCurveTo(midX + barW, y, midX + barW, y + r);
        ctx.lineTo(midX + barW, y + barHeight - r);
        ctx.quadraticCurveTo(midX + barW, y + barHeight, midX + barW - r, y + barHeight);
        ctx.lineTo(midX, y + barHeight);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.moveTo(midX, y);
        ctx.lineTo(midX - barW + r, y);
        ctx.quadraticCurveTo(midX - barW, y, midX - barW, y + r);
        ctx.lineTo(midX - barW, y + barHeight - r);
        ctx.quadraticCurveTo(midX - barW, y + barHeight, midX - barW + r, y + barHeight);
        ctx.lineTo(midX, y + barHeight);
        ctx.fill();
      }

      // Label
      ctx.fillStyle = '#475569';
      ctx.font = '12px Plus Jakarta Sans, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(label, pad.left - 8, y + barHeight / 2 + 4);
    });
  }

  return { barChart, lineChart, donutChart, shapBar, COLORS };
})();

window.KrishiCharts = KrishiCharts;
