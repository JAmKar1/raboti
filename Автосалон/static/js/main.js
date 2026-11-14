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

  // Валидация форм
  document.querySelectorAll('form').forEach(function (form) {
    form.addEventListener('submit', function (e) {
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

  // Загрузка карточек каталога через API при изменении фильтров
  var grid = document.getElementById('catalog-grid');
  var countEl = document.getElementById('catalog-count');
  if (grid) {
    document.querySelectorAll('.filters select, .filters input').forEach(function (el) {
      el.addEventListener('change', function () {
        updateCatalog();
      });
    });
  }

  function updateCatalog() {
    var form = document.querySelector('.filters form');
    if (!form || !grid) return;
    var params = new URLSearchParams(new FormData(form));
    if (!params.get('sort')) params.set('sort', 'price_asc');

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
  function nf(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); }
});
