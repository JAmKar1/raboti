document.addEventListener('DOMContentLoaded', function () {
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  // Мобильное меню
  var burger = $('#burger'), nav = $('#nav');
  if (burger && nav) burger.addEventListener('click', function () { nav.classList.toggle('open'); });

  // Закрытие уведомлений
  $$('.flash__close').forEach(function (b) {
    b.addEventListener('click', function () { b.closest('.flash').remove(); });
  });

  // Маска телефона
  $$('input[type="tel"]').forEach(function (input) {
    input.addEventListener('input', function () {
      var d = input.value.replace(/\D/g, '');
      if (!d) { input.value = ''; return; }
      if (d[0] === '8') d = '7' + d.slice(1);
      if (d[0] !== '7') d = '7' + d;
      d = d.slice(0, 11);
      var out = '+7';
      if (d.length > 1) out += ' (' + d.slice(1, 4);
      if (d.length >= 5) out += ') ' + d.slice(4, 7);
      if (d.length >= 8) out += '-' + d.slice(7, 9);
      if (d.length >= 10) out += '-' + d.slice(9, 11);
      input.value = out;
    });
  });

  // Защита от двойной отправки форм
  $$('form').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      if (!form.checkValidity()) { e.preventDefault(); form.reportValidity(); return; }
      var btn = $('button[type="submit"].btn--primary, button[type="submit"].btn--lg', form);
      if (!btn) return;
      var label = btn.textContent;
      btn.disabled = true; btn.textContent = 'Отправляем…';
      setTimeout(function () { btn.disabled = false; btn.textContent = label; }, 4000);
    });
  });

  // Каталог: ползунок цены задаёт «цена до»
  var range = $('#price-range'), out = $('#price-out'), maxInput = $('input[name="max_price"]');
  var fmt = function (n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0') + '\u00a0₽'; };
  if (range && out) {
    range.addEventListener('input', function () {
      out.textContent = fmt(range.value);
      if (maxInput) maxInput.value = range.value;
    });
    range.addEventListener('change', function () { range.form.submit(); });
  }

  // Кредит и trade-in: значения у ползунков и пересчёт без кнопки
  function liveForm(formSel, pairs) {
    var form = $(formSel); if (!form) return;
    var t;
    pairs.forEach(function (p) {
      var el = $(p[0]), o = $(p[1]); if (!el) return;
      el.addEventListener('input', function () { if (o) o.textContent = p[2](el.value); });
    });
    $$('input, select', form).forEach(function (el) {
      el.addEventListener('change', function () { clearTimeout(t); t = setTimeout(function () { form.submit(); }, 350); });
    });
  }
  liveForm('#credit-form', [['#years', '#years-out', function (v) { return v + ' лет'; }]]);
  liveForm('#tradein-form', [
    ['#year', '#year-out', function (v) { return v; }],
    ['#mileage', '#mileage-out', function (v) { return fmt(v).replace('\u00a0₽', ' км'); }]
  ]);
  var down = $('#down-range'), downInput = $('#down');
  if (down && downInput) {
    down.addEventListener('input', function () { downInput.value = down.value; });
    down.addEventListener('change', function () { down.form.submit(); });
  }

  // Подсказки поиска в шапке
  var search = $('#global-search'), box = $('#suggest'), timer;
  if (search && box) {
    search.addEventListener('input', function () {
      clearTimeout(timer);
      var q = search.value.trim();
      if (q.length < 2) { box.hidden = true; return; }
      timer = setTimeout(function () {
        fetch('/api/suggest?q=' + encodeURIComponent(q)).then(function (r) { return r.json(); }).then(function (d) {
          box.innerHTML = '';
          (d.items || []).slice(0, 6).forEach(function (it) {
            var a = document.createElement('a');
            a.href = it.url || ('/catalog?q=' + encodeURIComponent(it.title));
            a.textContent = it.title;
            box.appendChild(a);
          });
          box.hidden = !box.children.length;
        }).catch(function () { box.hidden = true; });
      }, 200);
    });
    search.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && search.value.trim()) { window.location = '/catalog?q=' + encodeURIComponent(search.value.trim()); }
      if (e.key === 'Escape') box.hidden = true;
    });
    document.addEventListener('click', function (e) { if (!e.target.closest('.header__search')) box.hidden = true; });
  }
});
