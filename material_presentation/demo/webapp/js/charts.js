/* charts.js — mini biblioteca de gráficos em SVG inline (sem dependências).
 * Todas as funções retornam uma string SVG pronta para innerHTML.
 */
(function (global) {
  'use strict';

  function minmax(arr) {
    var min = Infinity, max = -Infinity;
    for (var i = 0; i < arr.length; i++) { if (arr[i] < min) min = arr[i]; if (arr[i] > max) max = arr[i]; }
    if (!isFinite(min)) { min = 0; max = 1; }
    return { min: min, max: max, rng: (max - min) || 1 };
  }

  /* sparkline pequeno (linha simples) */
  function sparkline(arr, opt) {
    opt = opt || {};
    var w = opt.w || 60, h = opt.h || 24, pad = 2, color = opt.color || '#38bdf8';
    if (!arr || arr.length < 2) return '<svg viewBox="0 0 ' + w + ' ' + h + '"></svg>';
    var mm = minmax(arr);
    var pts = arr.map(function (v, i) {
      var x = pad + (i / (arr.length - 1)) * (w - 2 * pad);
      var y = h - pad - ((v - mm.min) / mm.rng) * (h - 2 * pad);
      return x.toFixed(1) + ',' + y.toFixed(1);
    }).join(' ');
    return '<svg viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none">' +
      '<polyline points="' + pts + '" fill="none" stroke="' + color + '" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/></svg>';
  }

  /* gráfico de área com gradiente (para a página de telemetria) */
  function area(arr, opt) {
    opt = opt || {};
    var w = opt.w || 320, h = opt.h || 120, padX = 4, padY = 8, color = opt.color || '#38bdf8';
    var id = 'g' + Math.random().toString(36).slice(2, 8);
    if (!arr || arr.length < 2) {
      return '<svg viewBox="0 0 ' + w + ' ' + h + '" style="width:100%;height:' + h + 'px"></svg>';
    }
    var mm = minmax(arr);
    var xy = arr.map(function (v, i) {
      var x = padX + (i / (arr.length - 1)) * (w - 2 * padX);
      var y = padY + (1 - (v - mm.min) / mm.rng) * (h - 2 * padY);
      return [x, y];
    });
    var line = xy.map(function (p, i) { return (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' ');
    var fill = 'M' + xy[0][0].toFixed(1) + ' ' + (h - padY) + ' ' +
      xy.map(function (p) { return 'L' + p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' ') +
      ' L' + xy[xy.length - 1][0].toFixed(1) + ' ' + (h - padY) + ' Z';
    // linhas de grade horizontais
    var grid = '';
    for (var g = 1; g <= 3; g++) {
      var gy = padY + (g / 4) * (h - 2 * padY);
      grid += '<line x1="0" y1="' + gy.toFixed(1) + '" x2="' + w + '" y2="' + gy.toFixed(1) +
        '" stroke="currentColor" stroke-opacity=".08" stroke-width="1"/>';
    }
    var lastX = xy[xy.length - 1][0], lastY = xy[xy.length - 1][1];
    return '<svg viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none" style="width:100%;height:' + h + 'px;color:var(--muted)">' +
      '<defs><linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="' + color + '" stop-opacity=".35"/>' +
      '<stop offset="1" stop-color="' + color + '" stop-opacity="0"/></linearGradient></defs>' +
      grid +
      '<path d="' + fill + '" fill="url(#' + id + ')"/>' +
      '<path d="' + line + '" fill="none" stroke="' + color + '" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>' +
      '<circle cx="' + lastX.toFixed(1) + '" cy="' + lastY.toFixed(1) + '" r="3.2" fill="' + color + '"/></svg>';
  }

  /* barras verticais simples */
  function bars(data, opt) {
    opt = opt || {};
    var w = opt.w || 320, h = opt.h || 120, padY = 8, gap = opt.gap || 6;
    if (!data || !data.length) return '<svg viewBox="0 0 ' + w + ' ' + h + '"></svg>';
    var vals = data.map(function (d) { return d.v; });
    var max = Math.max.apply(null, vals) || 1;
    var bw = (w - gap * (data.length - 1)) / data.length;
    var out = data.map(function (d, i) {
      var bh = (d.v / max) * (h - padY * 2);
      var x = i * (bw + gap);
      var y = h - padY - bh;
      var c = d.color || '#38bdf8';
      return '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + bw.toFixed(1) +
        '" height="' + Math.max(1, bh).toFixed(1) + '" rx="3" fill="' + c + '"/>';
    }).join('');
    return '<svg viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none" style="width:100%;height:' + h + 'px">' + out + '</svg>';
  }

  /* donut (segmentos) — retorna svg quadrado */
  function donut(segments, opt) {
    opt = opt || {};
    var size = opt.size || 132, sw = opt.stroke || 16, r = (size - sw) / 2, cx = size / 2, cy = size / 2;
    var C = 2 * Math.PI * r;
    var total = segments.reduce(function (a, s) { return a + s.v; }, 0) || 1;
    var off = 0;
    var ring = segments.map(function (s) {
      var frac = s.v / total, len = frac * C;
      var seg = '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="' + s.color +
        '" stroke-width="' + sw + '" stroke-dasharray="' + len.toFixed(2) + ' ' + (C - len).toFixed(2) +
        '" stroke-dashoffset="' + (-off).toFixed(2) + '" stroke-linecap="butt" transform="rotate(-90 ' + cx + ' ' + cy + ')"/>';
      off += len;
      return seg;
    }).join('');
    var center = opt.center != null
      ? '<text x="' + cx + '" y="' + (cy - 2) + '" text-anchor="middle" font-size="' + (opt.centerSize || 26) +
        '" font-weight="800" fill="var(--ink)">' + opt.center + '</text>' +
        (opt.sub ? '<text x="' + cx + '" y="' + (cy + 16) + '" text-anchor="middle" font-size="10" fill="var(--muted)">' + opt.sub + '</text>' : '')
      : '';
    return '<svg viewBox="0 0 ' + size + ' ' + size + '" style="width:' + size + 'px;height:' + size + 'px">' +
      '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="var(--line)" stroke-width="' + sw + '"/>' +
      ring + center + '</svg>';
  }

  /* gauge semicircular (0..100) */
  function gauge(value, opt) {
    opt = opt || {};
    var w = 180, h = 108, cx = 90, cy = 96, r = 74, sw = 15;
    var v = Math.max(0, Math.min(100, value));
    var color = opt.color || (v >= 70 ? '#1f9d6b' : v >= 40 ? '#e8a13a' : '#e0533d');
    function pt(frac) {
      var a = Math.PI * (1 - frac);
      return [cx + r * Math.cos(a), cy - r * Math.sin(a)];
    }
    var start = pt(0), end = pt(1), cur = pt(v / 100);
    var large = 0;
    var track = 'M' + start[0].toFixed(1) + ' ' + start[1].toFixed(1) + ' A' + r + ' ' + r + ' 0 ' + large + ' 1 ' + end[0].toFixed(1) + ' ' + end[1].toFixed(1);
    var val = 'M' + start[0].toFixed(1) + ' ' + start[1].toFixed(1) + ' A' + r + ' ' + r + ' 0 ' + large + ' 1 ' + cur[0].toFixed(1) + ' ' + cur[1].toFixed(1);
    return '<svg viewBox="0 0 ' + w + ' ' + h + '" style="width:100%;max-width:200px;height:auto">' +
      '<path d="' + track + '" fill="none" stroke="var(--line)" stroke-width="' + sw + '" stroke-linecap="round"/>' +
      '<path d="' + val + '" fill="none" stroke="' + color + '" stroke-width="' + sw + '" stroke-linecap="round"/>' +
      '<text x="' + cx + '" y="' + (cy - 8) + '" text-anchor="middle" font-size="30" font-weight="800" fill="var(--ink)">' + Math.round(v) + '</text>' +
      '<text x="' + cx + '" y="' + (cy + 8) + '" text-anchor="middle" font-size="10" fill="var(--muted)">' + (opt.label || '/ 100') + '</text></svg>';
  }

  global.Charts = { sparkline: sparkline, area: area, bars: bars, donut: donut, gauge: gauge };
})(window);
