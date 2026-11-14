// Диаграмма выплат по кредиту — рисует SVG-график остатка долга.
// Данные берутся из калькулятора: data-body (сумма кредита) и data-monthly.
(function () {
  var chart = document.getElementById('chart');
  if (!chart) return;

  var body = parseFloat(chart.dataset.body) || 0;
  var monthly = parseFloat(chart.dataset.monthly) || 0;
  if (body <= 0 || monthly <= 0) {
    chart.textContent = 'Нет данных для графика';
    return;
  }

  // Остаток долга по месяцам — считаем на клиенте по аннуитетной формуле,
  // срок берём из поля years на странице.
  var yearsField = document.getElementById('years');
  var months = yearsField ? parseInt(yearsField.value, 10) * 12 : 60;
  var rateField = document.getElementById('rate');
  var rate = rateField ? parseFloat(rateField.value) / 100 / 12 : 0.0075;

  var points = [];
  var balance = body;
  var n = Math.max(months, 1);
  for (var m = 0; m <= n; m++) {
    points.push(balance);
    var interest = balance * rate;
    balance = Math.max(balance - (monthly - interest), 0);
  }

  var W = 560, H = 200, P = 10;
  var max = Math.max.apply(null, points);
  var stepX = (W - P * 2) / n;
  var coords = points.map(function (v, i) {
    var x = P + i * stepX;
    var y = P + (1 - v / max) * (H - P * 2);
    return x.toFixed(1) + ',' + y.toFixed(1);
  });

  var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" style="width:100%;height:auto" role="img" aria-label="График остатка долга">';
  svg += '<defs><linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">';
  svg += '<stop offset="0%" stop-color="#1f5cff" stop-opacity=".35"/>';
  svg += '<stop offset="100%" stop-color="#1f5cff" stop-opacity="0"/></linearGradient></defs>';
  svg += '<polygon points="' + P + ',' + (H - P) + ' ' + coords.join(' ') + ' ' + (W - P) + ',' + (H - P) + '" fill="url(#cg)"/>';
  svg += '<polyline points="' + coords.join(' ') + '" fill="none" stroke="#1f5cff" stroke-width="2.5" stroke-linejoin="round"/>';
  svg += '</svg>';
  svg += '<div style="display:flex;justify-content:space-between;font-size:.8rem;color:#8b93a1;margin-top:4px">' +
    '<span>Остаток долга: ' + Math.round(points[0]).toLocaleString('ru-RU') + ' ₽</span>' +
    '<span>' + n + ' мес.</span>' +
    '<span>' + Math.round(points[n]).toLocaleString('ru-RU') + ' ₽</span></div>';

  chart.innerHTML = svg;
})();
