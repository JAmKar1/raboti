document.addEventListener('DOMContentLoaded', function () {
  // Мобильное меню
  var burger = document.getElementById('burger');
  var nav = document.getElementById('nav');
  if (burger && nav) {
    burger.addEventListener('click', function () {
      nav.classList.toggle('open');
    });
  }

  // Плавный переход к блоку по data-scroll
  document.querySelectorAll('[data-scroll]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      var id = link.getAttribute('href');
      if (!id || id.charAt(0) !== '#') return;
      var target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  // Маска телефона
  document.querySelectorAll('input[type="tel"]').forEach(function (input) {
    input.addEventListener('input', function () {
      var digits = input.value.replace(/\D/g, '');
      if (digits.startsWith('8')) digits = '7' + digits.slice(1);
      if (!digits.startsWith('7')) digits = '7' + digits;
      digits = digits.slice(0, 11);
      var out = '+7';
      if (digits.length > 1) out += ' (' + digits.slice(1, 4);
      if (digits.length >= 5) out += ') ' + digits.slice(4, 7);
      if (digits.length >= 8) out += '-' + digits.slice(7, 9);
      if (digits.length >= 10) out += '-' + digits.slice(9, 11);
      input.value = out;
    });
  });

  // ------------------------------------------------------------------
  // Глобальный поиск с живыми подсказками
  // ------------------------------------------------------------------
  var searchInput = document.getElementById('global-search');
  var suggestBox = document.getElementById('suggest');
  if (searchInput && suggestBox) {
    var suggestTimer = null;
    var items = [];
    var activeIdx = -1;

    function goCatalog() {
      var q = searchInput.value.trim();
      window.location.href = '/catalog' + (q ? '?q=' + encodeURIComponent(q) : '');
    }

    function closeSuggest() {
      suggestBox.hidden = true;
      suggestBox.innerHTML = '';
      items = [];
      activeIdx = -1;
    }

    function renderSuggest(list) {
      items = list;
      activeIdx = -1;
      if (!list.length) {
        suggestBox.innerHTML = '<li class="suggest__empty">Ничего не найдено. Нажмите Enter — покажем весь каталог.</li>';
        suggestBox.hidden = false;
        return;
      }
      suggestBox.innerHTML = '';
      list.forEach(function (it) {
        var li = document.createElement('li');
        var a = document.createElement('a');
        a.href = it.url;
        a.textContent = it.title;
        li.appendChild(a);
        suggestBox.appendChild(li);
      });
      var last = document.createElement('li');
      var all = document.createElement('a');
      all.href = '#';
      all.textContent = 'Смотреть все в каталоге →';
      all.addEventListener('click', function (e) { e.preventDefault(); goCatalog(); });
      last.appendChild(all);
      suggestBox.appendChild(last);
      suggestBox.hidden = false;
    }

    function fetchSuggest() {
      var q = searchInput.value.trim();
      if (q.length < 2) { closeSuggest(); return; }
      fetch('/api/suggest?q=' + encodeURIComponent(q))
        .then(function (r) { return r.json(); })
        .then(function (data) { renderSuggest(data.items || []); })
        .catch(closeSuggest);
    }

    searchInput.addEventListener('input', function () {
      clearTimeout(suggestTimer);
      suggestTimer = setTimeout(fetchSuggest, 250);
    });

    searchInput.addEventListener('keydown', function (e) {
      var links = suggestBox.querySelectorAll('li a');
      if (e.key === 'ArrowDown' && links.length) {
        e.preventDefault();
        activeIdx = Math.min(activeIdx + 1, links.length - 1);
      } else if (e.key === 'ArrowUp' && links.length) {
        e.preventDefault();
        activeIdx = Math.max(activeIdx - 1, 0);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (activeIdx >= 0 && links[activeIdx]) { window.location.href = links[activeIdx].href; }
        else { goCatalog(); }
        return;
      } else if (e.key === 'Escape') {
        closeSuggest();
        return;
      } else { return; }
      links.forEach(function (l, i) { l.parentElement.classList.toggle('is-active', i === activeIdx); });
    });

    document.addEventListener('click', function (e) {
      if (!e.target.closest('.header__search')) closeSuggest();
    });
  }

  // ------------------------------------------------------------------
  // Избранное и сравнение — без перезагрузки страницы
  // ------------------------------------------------------------------
  function toast(text, ok) {
    var t = document.createElement('div');
    t.className = 'toast' + (ok ? '' : ' toast--error');
    t.textContent = text;
    document.body.appendChild(t);
    setTimeout(function () { t.classList.add('toast--hide'); }, 2600);
    setTimeout(function () { t.remove(); }, 3100);
  }

  document.addEventListener('submit', function (e) {
    var form = e.target.closest('.js-fav, .js-compare');
    if (!form) return;
    e.preventDefault();
    var isFav = form.classList.contains('js-fav');
    var btn = form.querySelector('button');
    fetch(form.action, {
      method: 'POST',
      headers: { 'X-Requested-With': 'fetch', 'X-CSRF-Token': window.CSRF || '' },
      body: new FormData(form),
    })
      .then(function (r) {
        return r.json().then(function (data) { return { status: r.status, data: data }; });
      })
      .then(function (res) {
        if (res.status === 401 || res.data.error === 'auth') {
          toast(res.data.message || 'Войдите в аккаунт.', false);
          setTimeout(function () {
            window.location.href = '/login?next=' + encodeURIComponent(window.location.pathname + window.location.search);
          }, 900);
          return;
        }
        if (!res.data.ok) {
          toast(res.data.message || 'Что-то пошло не так.', false);
          return;
        }
        if (isFav) {
          form.querySelectorAll('.tool, .btn').forEach(function (b) {
            b.classList.toggle('is-active', res.data.added);
          });
          var favCount = document.getElementById('fav-count');
          if (favCount) {
            favCount.textContent = res.data.count;
            favCount.hidden = !res.data.count;
          }
          toast(res.data.added ? 'Добавлено в избранное ♥' : 'Удалено из избранного');
        } else {
          form.querySelectorAll('.tool, .btn').forEach(function (b) {
            b.classList.toggle('is-active', res.data.added);
          });
          var cmpCount = document.getElementById('compare-count');
          if (cmpCount && typeof res.data.count === 'number') {
            cmpCount.textContent = res.data.count;
            cmpCount.hidden = !res.data.count;
          }
          toast(res.data.added ? 'Добавлено к сравнению ⇄' : 'Убрано из сравнения');
        }
      })
      .catch(function () { toast('Нет связи с сервером.', false); });
  });

  // Валидация форм (кроме js-fav / js-compare — они уходят через fetch)
  document.querySelectorAll('form').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      if (form.classList.contains('js-fav') || form.classList.contains('js-compare')) return;
      if (form.id === 'credit-form' || form.id === 'filters-form') return; // живые формы
      if (!form.checkValidity()) {
        e.preventDefault();
        form.reportValidity();
        return;
      }
      var btn = form.querySelector('button[type="submit"]');
      if (btn) {
        btn.disabled = true;
        btn.dataset.original = btn.textContent;
        btn.textContent = 'Отправляем...';
        setTimeout(function () {
          btn.disabled = false;
          btn.textContent = btn.dataset.original;
        }, 4000);
      }
    });
  });

  // ------------------------------------------------------------------
  // Каталог: фильтры применяются мгновенно (без перезагрузки)
  // ------------------------------------------------------------------
  var grid = document.getElementById('catalog-grid');
  var countEl = document.getElementById('catalog-count');
  var filtersForm = document.getElementById('filters-form');
  if (grid && filtersForm) {
    var catalogTimer = null;
    function onFilterChange() {
      clearTimeout(catalogTimer);
      catalogTimer = setTimeout(updateCatalog, 250);
    }
    filtersForm.querySelectorAll('input, select').forEach(function (el) {
      el.addEventListener('change', onFilterChange);
      if (el.type === 'range' || el.type === 'search' || el.type === 'number') {
        el.addEventListener('input', onFilterChange);
      }
    });

    // Ползунок цены связан с полем "до"
    var priceRange = document.getElementById('price-range');
    var priceOut = document.getElementById('price-out');
    var maxPrice = document.getElementById('max_price');
    if (priceRange && maxPrice) {
      priceRange.addEventListener('input', function () {
        maxPrice.value = priceRange.value;
        if (priceOut) priceOut.textContent = nf(parseInt(priceRange.value, 10)) + ' ₽';
      });
      maxPrice.addEventListener('input', function () {
        if (maxPrice.value) {
          priceRange.value = maxPrice.value;
          if (priceOut) priceOut.textContent = nf(parseInt(maxPrice.value, 10)) + ' ₽';
        }
      });
    }

    // Кнопка "Применить" не перезагружает страницу
    var applyBtn = filtersForm.querySelector('button[type="submit"]');
    if (applyBtn) {
      applyBtn.addEventListener('click', function (e) { e.preventDefault(); updateCatalog(); });
    }

    // Сортировка тоже применяется на лету
    var sortSel = document.getElementById('sort');
    if (sortSel) {
      sortSel.addEventListener('change', function (e) {
        e.preventDefault();
        updateCatalog();
      });
      var sortForm = sortSel.closest('form');
      if (sortForm) sortForm.addEventListener('submit', function (e) {
        e.preventDefault();
        updateCatalog();
      });
    }
  }

  function currentParams() {
    var params = new URLSearchParams();
    filtersForm.querySelectorAll('input, select').forEach(function (el) {
      if (el.type === 'radio' || el.type === 'checkbox') {
        if (el.checked && el.value !== 'all') params.set(el.name, el.value);
        else if (el.checked && el.type === 'checkbox') params.set(el.name, el.value);
      } else if (el.value && el.value !== 'all') {
        params.set(el.name, el.value);
      }
    });
    return params;
  }

  function updateCatalog() {
    if (!grid || !filtersForm) return;
    var params = currentParams();
    params.set('limit', '200');
    params.set('page', '1');
    var sortSel = document.getElementById('sort');
    if (sortSel) params.set('sort', sortSel.value);

    grid.style.opacity = '.4';
    fetch('/api/cars?' + params.toString())
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (countEl) countEl.textContent = data.total + ' авто';
        grid.innerHTML = '';
        if (!data.items.length) {
          var empty = document.createElement('div');
          empty.className = 'empty';
          empty.innerHTML = '<h3>Ничего не найдено</h3><p>Попробуйте изменить параметры фильтра.</p>';
          grid.appendChild(empty);
          return;
        }
        data.items.forEach(function (car) {
          grid.appendChild(buildCard(car));
        });
      })
      .catch(function () { /* остаётся серверная выдача */ })
      .finally(function () { grid.style.opacity = '1'; });
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function buildCard(car) {
    var article = document.createElement('article');
    article.className = 'card';
    article.dataset.carId = car.id;
    var url = escapeHtml(car.url);
    var media = car.photo
      ? '<img src="/static/uploads/' + encodeURIComponent(car.photo) + '" alt="' + escapeHtml(car.brand) + ' ' + escapeHtml(car.model) + '" loading="lazy">'
      : '<div class="car-visual car-visual--' + bodyClass(car.body) + '">' +
          '<span class="car-visual__body"></span>' +
          '<span class="car-visual__cabin"></span>' +
          '<span class="car-visual__wheel car-visual__wheel--left"></span>' +
          '<span class="car-visual__wheel car-visual__wheel--right"></span>' +
        '</div>';
    article.innerHTML =
      '<a class="card__media" href="' + url + '">' + media +
        (car.condition === 'Новый' ? '<span class="badge badge--new">Новый</span>' : '') +
      '</a>' +
      '<div class="card__tools">' +
        '<button class="tool' + (car.is_fav ? ' is-active' : '') + '" data-fav-id="' + car.id + '" title="В избранное"><span aria-hidden="true">♥</span></button>' +
        '<button class="tool' + (car.is_compared ? ' is-active' : '') + '" data-cmp-id="' + car.id + '" title="Сравнить"><span aria-hidden="true">⇄</span></button>' +
      '</div>' +
      '<div class="card__body">' +
        '<div class="card__head"><h3><a href="' + url + '">' + escapeHtml(car.brand) + ' ' + escapeHtml(car.model) + '</a></h3>' +
        '<span class="card__year">' + escapeHtml(car.year) + '</span></div>' +
        '<div class="card__specs"><span>' + escapeHtml(nf(car.mileage)) + ' км</span><span>' + escapeHtml(car.body) + '</span>' +
        '<span>' + escapeHtml(car.fuel) + '</span><span>' + escapeHtml(car.color) + '</span></div>' +
        '<div class="card__foot"><span class="card__price">' + escapeHtml(car.price_label) + '</span>' +
        '<a class="btn btn--ghost" href="' + url + '">Подробнее</a></div>' +
      '</div>';
    return article;
  }

  // Клик по кнопкам избранныого/сравнения в карточках, отрисованных через API
  document.addEventListener('click', function (e) {
    var favBtn = e.target.closest('[data-fav-id]');
    var cmpBtn = e.target.closest('[data-cmp-id]');
    var btn = favBtn || cmpBtn;
    if (!btn) return;
    e.preventDefault();
    var id = btn.dataset.favId || btn.dataset.cmpId;
    var path = favBtn ? '/favorites/' + id : '/compare/toggle';
    var body = new URLSearchParams();
    if (cmpBtn) body.set('car_id', id);
    fetch(path, {
      method: 'POST',
      headers: { 'X-Requested-With': 'fetch', 'X-CSRF-Token': window.CSRF || '' },
      body: body,
    })
      .then(function (r) { return r.json().then(function (d) { return { status: r.status, data: d }; }); })
      .then(function (res) {
        if (res.status === 401 || res.data.error === 'auth') {
          toast(res.data.message || 'Войдите в аккаунт.', false);
          setTimeout(function () {
            window.location.href = '/login?next=' + encodeURIComponent(window.location.pathname);
          }, 900);
          return;
        }
        if (res.data.ok) {
          btn.classList.toggle('is-active', res.data.added);
          if (favBtn) {
            var fc = document.getElementById('fav-count');
            if (fc) { fc.textContent = res.data.count; fc.hidden = !res.data.count; }
          }
        }
      })
      .catch(function () { toast('Нет связи с сервером.', false); });
  });

  // Латинские классы кузовов — должны совпадать с BODY_CLASS в data.py
  var BODY_CLASS = {
    'Седан': 'sedan',
    'Кроссовер': 'crossover',
    'Хэтчбек': 'hatchback',
    'Универсал': 'wagon',
    'Купе': 'coupe',
    'Внедорожник': 'suv'
  };

  function bodyClass(body) { return BODY_CLASS[body] || 'sedan'; }
  function nf(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); }

  // ------------------------------------------------------------------
  // Кредитный калькулятор: живой пересчёт без перезагрузки
  // ------------------------------------------------------------------
  var creditForm = document.getElementById('credit-form');
  if (creditForm) {
    var priceIn = document.getElementById('price');
    var downIn = document.getElementById('down');
    var downRange = document.getElementById('down-range');
    var downOut = document.getElementById('down-out');
    var yearsIn = document.getElementById('years');
    var yearsOut = document.getElementById('years-out');
    var rateIn = document.getElementById('rate');

    var monthlyEl = document.getElementById('monthly');
    var overpayEl = document.getElementById('overpay');
    var totalEl = document.getElementById('total');
    var monthsEl = document.getElementById('months');
    var bodyEl = document.querySelector('.credit-result__grid div:first-child b');

    var creditTimer = null;

    function pluralYears(n) {
      n = Math.abs(n) % 100;
      var n1 = n % 10;
      if (n > 10 && n < 20) return 'лет';
      if (n1 > 1 && n1 < 5) return 'года';
      if (n1 === 1) return 'год';
      return 'лет';
    }

    function renderSchedule(rows) {
      var tbody = document.querySelector('.credit-result .table-wrap tbody');
      if (!tbody) return;
      tbody.innerHTML = '';
      rows.forEach(function (r) {
        var tr = document.createElement('tr');
        [r[0], nf(Math.round(r[1])) + ' ₽', nf(Math.round(r[2])) + ' ₽',
         nf(Math.round(r[3])) + ' ₽', nf(Math.round(r[4])) + ' ₽']
          .forEach(function (v, i) {
            var td = document.createElement(i === 0 ? 'td' : 'td');
            td.textContent = v;
            tr.appendChild(td);
          });
        tbody.appendChild(tr);
      });
      if (!rows.length) {
        var tr = document.createElement('tr');
        tr.innerHTML = '<td colspan="5">Нет данных — сумма кредита равна нулю.</td>';
        tbody.appendChild(tr);
      }
    }

    function syncDown() {
      if (!downRange || !downIn) return;
      downRange.max = priceIn.value || downRange.max;
      if (parseInt(downIn.value, 10) > parseInt(downRange.max, 10)) downIn.value = downRange.max;
      downRange.value = downIn.value;
      var p = parseInt(priceIn.value, 10) || 1;
      var d = parseInt(downIn.value, 10) || 0;
      if (downOut) downOut.textContent = nf(d) + ' ₽ (' + Math.round(d / p * 100) + '%)';
    }

    function syncYears() {
      if (yearsOut && yearsIn) yearsOut.textContent = yearsIn.value + ' ' + pluralYears(parseInt(yearsIn.value, 10));
    }

    function recalcCredit() {
      var params = new URLSearchParams({
        price: priceIn.value || 0,
        down: downIn.value || 0,
        years: yearsIn.value || 5,
        rate: rateIn.value || 9.9,
      });
      fetch('/api/credit?' + params.toString())
        .then(function (r) { return r.json(); })
        .then(function (s) {
          if (monthlyEl) monthlyEl.textContent = nf(s.monthly) + ' ₽';
          if (overpayEl) overpayEl.textContent = nf(s.overpay) + ' ₽';
          if (totalEl) totalEl.textContent = nf(s.total) + ' ₽';
          if (monthsEl) monthsEl.textContent = s.months + ' мес.';
          if (bodyEl) bodyEl.textContent = nf(s.body) + ' ₽';
          renderSchedule(s.schedule || []);
          // обновляем график
          var chart = document.getElementById('chart');
          if (chart && window.drawCreditChart) {
            chart.dataset.body = s.body;
            chart.dataset.monthly = s.monthly;
            window.drawCreditChart(chart);
          }
        })
        .catch(function () { /* тихо: серверная выдача остаётся */ });
    }

    function scheduleRecalc() {
      clearTimeout(creditTimer);
      creditTimer = setTimeout(recalcCredit, 200);
    }

    [priceIn, downIn, rateIn].forEach(function (el) {
      if (el) el.addEventListener('input', function () { syncDown(); scheduleRecalc(); });
    });
    if (downRange) {
      downRange.addEventListener('input', function () {
        downIn.value = downRange.value;
        syncDown();
        scheduleRecalc();
      });
    }
    if (yearsIn) {
      yearsIn.addEventListener('input', function () { syncYears(); scheduleRecalc(); });
    }

    // Кнопка «Рассчитать» тоже считает на лету
    creditForm.addEventListener('submit', function (e) {
      e.preventDefault();
      recalcCredit();
    });

    syncDown();
    syncYears();
  }

  // ------------------------------------------------------------------
  // Trade-in: живой пересчёт оценки
  // ------------------------------------------------------------------
  var tradeForm = document.getElementById('tradein-form');
  if (tradeForm && document.getElementById('tradein-value')) {
    var tradeTimer = null;
    var brandSel = document.getElementById('brand');
    var condSel = document.getElementById('condition');
    var yearIn = document.getElementById('year');
    var yearOut = document.getElementById('year-out');
    var mileageIn = document.getElementById('mileage');
    var mileageOut = document.getElementById('mileage-out');
    var valueEl = document.getElementById('tradein-value');

    function recalcTrade() {
      var params = new URLSearchParams({
        brand: brandSel ? brandSel.value : '',
        year: yearIn ? yearIn.value : 2019,
        mileage: mileageIn ? mileageIn.value : 60000,
        condition: condSel ? condSel.value : 'С пробегом',
      });
      fetch('/api/tradein?' + params.toString())
        .then(function (r) { return r.json(); })
        .then(function (d) {
          if (d && d.ok && valueEl) valueEl.textContent = nf(d.value) + ' ₽';
        })
        .catch(function () { });
    }

    function scheduleTrade() {
      clearTimeout(tradeTimer);
      tradeTimer = setTimeout(recalcTrade, 200);
    }

    [brandSel, condSel].forEach(function (el) {
      if (el) el.addEventListener('change', scheduleTrade);
    });
    if (yearIn) {
      yearIn.addEventListener('input', function () {
        if (yearOut) yearOut.textContent = yearIn.value;
        scheduleTrade();
      });
    }
    if (mileageIn) {
      mileageIn.addEventListener('input', function () {
        if (mileageOut) mileageOut.textContent = nf(parseInt(mileageIn.value, 10)) + ' км';
        scheduleTrade();
      });
    }

    tradeForm.addEventListener('submit', function (e) {
      e.preventDefault();
      recalcTrade();
    });
  }
});
