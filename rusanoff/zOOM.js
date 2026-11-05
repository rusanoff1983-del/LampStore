(function () {
  'use strict';

  /* ================================================================
   * Card Zoom (Uiverse) + True Obsidian Posters (Stars & Alloha Quality)
   * 1) НА ПОСТЕРЕ (как в levende.github.io/lampa-plugins/obsidian.js):
   *    - Звёзды рейтинга Uiverse (10 звёзд, заливка по рейтингу, цвет от обводки).
   *    - Качество видео (4K, HD, TS) с авто-запросом к Alloha API + кэш Lampa.
   *    - Градиентная подложка снизу постера.
   *    - Штатные плашки TV, vote, age, quality полностью скрыты.
   * 2) ПОД ПОСТЕРОМ (как в obsiview.js):
   *    - Жанры + Год сероватым тоном.
   *    - Название фильма в 2 строки.
   * 3) ЭФФЕКТЫ UIVERSE:
   *    - Плавный зум постера при фокусе.
   *    - Скруглённые углы в единицах em.
   *    - Мягкая круговая тень и настраиваемый контур.
   * 4) НАСТРОЙКИ:
   *    - Качество постеров TMDB (w500 / w780 / original 4K).
   *    - Параметры зума, радиуса и цвета обводки/звёзд.
   * Автор: rusanoff
   * ================================================================ */

  if (window.__uiverse_obsidian_plugin_active) return;
  window.__uiverse_obsidian_plugin_active = true;

  // Серверы Alloha API из оригинального плагина Obsidian
  var ALLOHA_SERVERS = [
    { url: 'https://api.apbugall.org', token: '8da1c9beda9545174264dc9f63a77d' },
    { url: 'https://upn.stull.xyz', token: 'd317441359e505c343c2063edc97e7' }
  ];

  var QUALITY_CACHE_KEY = 'uiverse_obsidian_q_cache_v2';
  var qualityMemoryCache = {};

  function loadQualityCache() {
    try {
      var saved = Lampa.Storage.get(QUALITY_CACHE_KEY, {});
      if (saved && typeof saved === 'object') qualityMemoryCache = saved;
    } catch (e) {}
  }

  function saveQualityCache(key, val) {
    try {
      qualityMemoryCache[key] = { q: val, t: Date.now() };
      Lampa.Storage.set(QUALITY_CACHE_KEY, qualityMemoryCache);
    } catch (e) {}
  }

  function getCachedQuality(key) {
    var c = qualityMemoryCache[key];
    if (c && c.q && (Date.now() - c.t < 86400000 * 3)) { // кэш 3 дня
      return c.q;
    }
    return null;
  }

  // Очередь сетевых запросов
  var requestQueue = [];
  var activeRequests = 0;
  var MAX_PARALLEL = 6;

  function queueRequest(task) {
    requestQueue.push(task);
    processQueue();
  }

  function processQueue() {
    if (activeRequests >= MAX_PARALLEL || requestQueue.length === 0) return;
    var task = requestQueue.shift();
    activeRequests++;
    task(function () {
      activeRequests--;
      processQueue();
    });
  }

  // Запрос качества через Alloha API (как в obsidian.js)
  function fetchAllohaQuality(data, callback) {
    if (!data || !data.id) return callback(null);
    var isTV = data.name || data.first_air_date ? true : false;
    var cacheKey = (isTV ? 'tv_' : 'movie_') + data.id;

    var cached = getCachedQuality(cacheKey);
    if (cached) return callback(cached);

    // Если в данных карточки уже есть качество (например из торрентов)
    var nativeQ = data.quality || data.release_quality;
    if (nativeQ && typeof nativeQ === 'string') {
      var upper = nativeQ.toUpperCase();
      var foundQ = null;
      if (upper.indexOf('4K') !== -1 || upper.indexOf('2160') !== -1) foundQ = '4k';
      else if (upper.indexOf('TS') !== -1 || upper.indexOf('CAM') !== -1) foundQ = 'ts';
      else if (upper.indexOf('HD') !== -1 || upper.indexOf('1080') !== -1 || upper.indexOf('720') !== -1) foundQ = 'hd';
      if (foundQ) {
        saveQualityCache(cacheKey, foundQ);
        return callback(foundQ);
      }
    }

    queueRequest(function (next) {
      var s = ALLOHA_SERVERS[0];
      var url = s.url + '?token=' + s.token;
      if (data.kinopoisk_id) url += '&kp=' + encodeURIComponent(data.kinopoisk_id);
      else if (data.imdb_id) url += '&imdb=' + encodeURIComponent(data.imdb_id);
      else url += '&tmdb=' + encodeURIComponent(data.id);

      var done = false;
      var timer = setTimeout(function () {
        if (!done) { done = true; next(); callback(null); }
      }, 4500);

      Lampa.Network.silent(url, function (res) {
        if (!done) {
          done = true;
          clearTimeout(timer);
          next();
          if (res && res.status === 'success' && res.data) {
            var q = res.data.quality;
            var finalQ = null;
            if (q) {
              if (res.data.uhd) finalQ = '4k';
              else if (/(^|,\s*)ts(\s*,|$)/i.test(q)) finalQ = 'ts';
              else finalQ = 'hd';
            }
            if (finalQ) saveQualityCache(cacheKey, finalQ);
            callback(finalQ);
          } else {
            callback(null);
          }
        }
      }, function () {
        if (!done) { done = true; clearTimeout(timer); next(); callback(null); }
      });
    });
  }

  // Жанры
  var GENRES_MAP = {
    28: 'Боевик', 12: 'Приключения', 16: 'Мультфильм', 35: 'Комедия', 80: 'Криминал',
    99: 'Документальный', 18: 'Драма', 10751: 'Семейный', 14: 'Фэнтези', 36: 'История',
    27: 'Ужасы', 10402: 'Музыка', 9648: 'Детектив', 10749: 'Мелодрама', 878: 'Фантастика',
    10770: 'Телефильм', 53: 'Триллер', 10752: 'Военный', 37: 'Вестерн', 10759: 'Боевик, Приключения',
    10762: 'Детский', 10765: 'НФ и Фэнтези', 10766: 'Мыльная опера', 10767: 'Ток-шоу', 10768: 'Война и Политика'
  };

  function capitalizeGenre(genre) {
    var s = String(genre || '').trim();
    if (!s) return '';
    return s.split(/([\s-]+)/).map(function (w) {
      if (/^[\s-]+$/.test(w)) return w;
      return w.toLowerCase() === 'и' ? 'и' : (w.charAt(0).toUpperCase() + w.slice(1));
    }).join('');
  }

  function extractGenres(data) {
    if (!data) return [];
    var list = [];
    var raw = data.genres || data.genre_ids || [];
    if (Array.isArray(raw)) {
      for (var i = 0; i < raw.length; i++) {
        var item = raw[i];
        var name = '';
        if (typeof item === 'object' && item && item.name) {
          name = item.name;
        } else if (typeof item === 'number' || typeof item === 'string') {
          name = GENRES_MAP[item] || (typeof item === 'string' ? item : '');
        }
        if (name) {
          var parts = String(name).split(',');
          for (var j = 0; j < parts.length; j++) {
            var g = capitalizeGenre(parts[j].trim());
            if (g && list.indexOf(g) === -1) list.push(g);
          }
        }
      }
    }
    return list.slice(0, 2);
  }

  function extractYear(data) {
    if (!data) return '';
    var dateStr = data.release_date || data.first_air_date || data.year || data.date || '';
    var match = String(dateStr).match(/(19|20)\d{2}/);
    return match ? match[0] : '';
  }

  function extractRating(card, data) {
    if (data) {
      var v = parseFloat(data.vote_average || data.kp_rating || data.ratingKinopoisk || data.rating || data.imdb_rating);
      if (v > 0 && isFinite(v)) return v.toFixed(1);
    }
    if (card) {
      var voteEl = card.querySelector('.card__vote');
      if (voteEl && voteEl.textContent) {
        var parsed = parseFloat(voteEl.textContent.trim().replace(',', '.'));
        if (parsed > 0 && isFinite(parsed)) return parsed.toFixed(1);
      }
    }
    return '';
  }

  function applyPosterQuality() {
    var quality = Lampa.Storage.get('zoom_poster_quality', 'default');
    if (quality === 'default') return;

    if (window.Lampa && Lampa.TMDB && Lampa.TMDB.image && !window.__lampa_tmdb_orig_image) {
      window.__lampa_tmdb_orig_image = Lampa.TMDB.image;
      Lampa.TMDB.image = function (url) {
        var res = window.__lampa_tmdb_orig_image.apply(this, arguments);
        var curQ = Lampa.Storage.get('zoom_poster_quality', 'default');
        if (curQ !== 'default' && typeof res === 'string') {
          res = res.replace(/\/t\/p\/(w200|w300|w500)/g, '/t/p/' + curQ);
        }
        return res;
      };
    }
  }

  function injectCSS() {
    var scale = Lampa.Storage.get('zoom_scale', '1.15');
    var duration = Lampa.Storage.get('zoom_duration', '0.3s');
    var radius = Lampa.Storage.get('zoom_radius', '0.6em');
    var removeBorder = Lampa.Storage.get('zoom_remove_border', false);
    var borderColor = Lampa.Storage.get('zoom_border_color', '#ffffff');

    var focusBorder = removeBorder ? '' : (', 0 0 0 2.5px ' + borderColor);

    var css = '' +
    '/* Полное скрытие штатных плашек Lampa на карточке */\n' +
    '.card.uiverse-card .card__title,\n' +
    '.card.uiverse-card .card__quality,\n' +
    '.card.uiverse-card .card__age,\n' +
    '.card.uiverse-card .card__type,\n' +
    '.card.uiverse-card .card__vote {\n' +
    '  display: none !important;\n' +
    '}\n\n' +
    '/* Контейнер постера Uiverse */\n' +
    '.card__view,\n' +
    '.poster__view {\n' +
    '  border-radius: ' + radius + ' !important;\n' +
    '  overflow: hidden !important;\n' +
    '  box-shadow: 0px 0px 10px 4px rgba(0, 0, 0, 0.6) !important;\n' +
    '  transition: transform ' + duration + ' cubic-bezier(0.2, 0.9, 0.2, 1), box-shadow ' + duration + ' ease !important;\n' +
    '  transform-origin: center center !important;\n' +
    '  position: relative !important;\n' +
    '}\n\n' +
    '.card__img,\n' +
    '.card__view img,\n' +
    '.poster__img,\n' +
    '.poster__view img {\n' +
    '  border-radius: inherit !important;\n' +
    '  overflow: hidden !important;\n' +
    '}\n\n' +
    '/* Отключение старой рамки Lampa */\n' +
    '.card.focus .card__view::before,\n' +
    '.card.focus .card__view::after,\n' +
    '.selector.focus .card__view::before,\n' +
    '.selector.focus .card__view::after {\n' +
    '  display: none !important;\n' +
    '  content: none !important;\n' +
    '  border: 0 !important;\n' +
    '}\n\n' +
    '/* Uiverse Zoom в фокусе */\n' +
    '.card.focus .card__view,\n' +
    '.poster.focus .poster__view {\n' +
    '  transform: scale(' + scale + ') !important;\n' +
    '  box-shadow: 0px 0px 14px 6px rgba(0, 0, 0, 0.85)' + focusBorder + ' !important;\n' +
    '  z-index: 10 !important;\n' +
    '}\n\n' +
    '/* НА ПОСТЕРЕ: плашка метаданных Obsidian с градиентом */\n' +
    '.card__poster-meta {\n' +
    '  position: absolute !important;\n' +
    '  bottom: 0 !important;\n' +
    '  left: 0 !important;\n' +
    '  right: 0 !important;\n' +
    '  display: flex !important;\n' +
    '  align-items: center !important;\n' +
    '  justify-content: space-between !important;\n' +
    '  padding: 1.6em 0.55em 0.45em !important;\n' +
    '  background: linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.5) 60%, rgba(0,0,0,0) 100%) !important;\n' +
    '  pointer-events: none !important;\n' +
    '  z-index: 5 !important;\n' +
    '}\n\n' +
    '/* Звёзды Uiverse на постере */\n' +
    '.card__poster-rate {\n' +
    '  display: inline-flex !important;\n' +
    '  align-items: center !important;\n' +
    '  line-height: 1 !important;\n' +
    '}\n\n' +
    '.ott-stars-box {\n' +
    '  position: relative !important;\n' +
    '  display: inline-block !important;\n' +
    '  font-size: 0.95em !important;\n' +
    '  line-height: 1 !important;\n' +
    '  letter-spacing: 0.04em !important;\n' +
    '  vertical-align: middle !important;\n' +
    '  margin-right: 0.35em !important;\n' +
    '  white-space: nowrap !important;\n' +
    '}\n\n' +
    '.ott-stars-bg {\n' +
    '  color: rgba(255, 255, 255, 0.25) !important;\n' +
    '}\n\n' +
    '.ott-stars-fill {\n' +
    '  position: absolute !important;\n' +
    '  top: 0 !important;\n' +
    '  left: 0 !important;\n' +
    '  height: 100% !important;\n' +
    '  overflow: hidden !important;\n' +
    '  white-space: nowrap !important;\n' +
    '  color: ' + borderColor + ' !important;\n' +
    '  text-shadow: 0 0 5px ' + borderColor + '66 !important;\n' +
    '}\n\n' +
    '.ott-rate-val {\n' +
    '  font-size: 0.85em !important;\n' +
    '  font-weight: 700 !important;\n' +
    '  color: #ffffff !important;\n' +
    '  text-shadow: 0 1px 3px rgba(0,0,0,0.9) !important;\n' +
    '}\n\n' +
    '/* Качество видео на постере (Alloha) */\n' +
    '.metadata__quality {\n' +
    '  display: inline-block !important;\n' +
    '  padding: 0.12em 0.35em !important;\n' +
    '  font-size: 0.72em !important;\n' +
    '  font-weight: 800 !important;\n' +
    '  letter-spacing: 0.04em !important;\n' +
    '  line-height: 1.2 !important;\n' +
    '  border-radius: 0.25em !important;\n' +
    '  text-transform: uppercase !important;\n' +
    '  background: rgba(0, 0, 0, 0.6) !important;\n' +
    '  border: 1px solid rgba(255, 255, 255, 0.25) !important;\n' +
    '  text-shadow: 0 1px 2px rgba(0,0,0,0.8) !important;\n' +
    '}\n\n' +
    '.metadata__quality--4k {\n' +
    '  color: #66bb6a !important;\n' +
    '  border-color: rgba(102, 187, 106, 0.5) !important;\n' +
    '}\n\n' +
    '.metadata__quality--hd {\n' +
    '  color: #42a5f5 !important;\n' +
    '  border-color: rgba(66, 165, 245, 0.5) !important;\n' +
    '}\n\n' +
    '.metadata__quality--ts {\n' +
    '  color: #ef5350 !important;\n' +
    '  border-color: rgba(239, 83, 80, 0.5) !important;\n' +
    '}\n\n' +
    '/* ПОД ПОСТЕРОМ: только Название и Жанры (как в obsiview) */\n' +
    '.card .ott-info {\n' +
    '  position: static !important;\n' +
    '  box-sizing: border-box !important;\n' +
    '  width: 100% !important;\n' +
    '  padding: 0.4em 0.15em 0 !important;\n' +
    '  color: #ffffff !important;\n' +
    '  text-align: left !important;\n' +
    '  pointer-events: none !important;\n' +
    '}\n\n' +
    '.card .ott-meta-row {\n' +
    '  display: flex !important;\n' +
    '  align-items: baseline !important;\n' +
    '  min-height: 1.25em !important;\n' +
    '  margin: 0 0 0.15em !important;\n' +
    '  font-size: 0.75em !important;\n' +
    '  line-height: 1.25 !important;\n' +
    '  color: rgba(255, 255, 255, 0.6) !important;\n' +
    '}\n\n' +
    '.card .ott-genres {\n' +
    '  min-width: 0 !important;\n' +
    '  overflow: hidden !important;\n' +
    '  white-space: nowrap !important;\n' +
    '  text-overflow: ellipsis !important;\n' +
    '  flex: 0 1 auto !important;\n' +
    '}\n\n' +
    '.card .ott-year {\n' +
    '  flex: 0 0 auto !important;\n' +
    '  white-space: pre !important;\n' +
    '}\n\n' +
    '.card .ott-title {\n' +
    '  position: static !important;\n' +
    '  display: -webkit-box !important;\n' +
    '  -webkit-line-clamp: 2 !important;\n' +
    '  -webkit-box-orient: vertical !important;\n' +
    '  height: 2.5em !important;\n' +
    '  overflow: hidden !important;\n' +
    '  overflow-wrap: break-word !important;\n' +
    '  white-space: normal !important;\n' +
    '  font-size: 0.95em !important;\n' +
    '  font-weight: 600 !important;\n' +
    '  line-height: 1.25 !important;\n' +
    '  margin: 0 !important;\n' +
    '}\n';

    var styleId = 'uiverse-obsidian-plugin-css';
    var existingStyle = document.getElementById(styleId);
    
    if (existingStyle) {
      existingStyle.textContent = css;
    } else {
      var style = document.createElement('style');
      style.id = styleId;
      style.textContent = css;
      document.head.appendChild(style);
    }
  }

  // Оформление карточки
  function renderCard(cardEl, data) {
    if (!cardEl || !data) return;
    try {
      var card = $(cardEl)[0];
      if (!card || !card.querySelector) return;
      var view = card.querySelector('.card__view, .poster__view');
      if (!view) return;

      var title = data.title || data.name || '';
      if (!title && data.card) title = data.card.title || data.card.name || '';
      if (!title) return;

      card.classList.add('uiverse-card');

      // 1. НА ПОСТЕРЕ: блок .card__poster-meta (звёзды слева, качество справа)
      var posterMeta = view.querySelector('.card__poster-meta');
      if (!posterMeta) {
        posterMeta = document.createElement('div');
        posterMeta.className = 'card__poster-meta';
        posterMeta.innerHTML = '' +
          '<div class="card__poster-rate">' +
            '<div class="ott-stars-box">' +
              '<div class="ott-stars-bg">★★★★★★★★★★</div>' +
              '<div class="ott-stars-fill">★★★★★★★★★★</div>' +
            '</div>' +
            '<span class="ott-rate-val"></span>' +
          '</div>' +
          '<span class="metadata__quality" style="display:none"></span>';
        view.appendChild(posterMeta);
      }

      // Рейтинг
      var rating = extractRating(card, data);
      var rateWrap = posterMeta.querySelector('.card__poster-rate');
      var starsFill = posterMeta.querySelector('.ott-stars-fill');
      var rateVal = posterMeta.querySelector('.ott-rate-val');

      if (rating) {
        var num = parseFloat(rating);
        var pct = Math.min(100, Math.max(0, num * 10)).toFixed(1) + '%';
        starsFill.style.width = pct;
        rateVal.textContent = rating;
        rateWrap.style.display = 'inline-flex';
      } else {
        rateWrap.style.display = 'none';
      }

      // Качество (через Alloha API)
      var qualityBadge = posterMeta.querySelector('.metadata__quality');
      fetchAllohaQuality(data, function (q) {
        if (q) {
          qualityBadge.className = 'metadata__quality metadata__quality--' + q.toLowerCase();
          qualityBadge.textContent = q.toUpperCase();
          qualityBadge.style.display = 'inline-block';
        }
      });

      // 2. ПОД ПОСТЕРОМ: блок .ott-info (только жанры + год и название)
      var info = card.querySelector('.ott-info');
      if (!info) {
        info = document.createElement('div');
        info.className = 'ott-info';
        info.innerHTML = '' +
          '<div class="ott-meta-row">' +
            '<span class="ott-genres"></span>' +
            '<span class="ott-year"></span>' +
          '</div>' +
          '<div class="ott-title"></div>';
        view.parentNode.insertBefore(info, view.nextSibling);
      }

      var genres = extractGenres(data);
      var year = extractYear(data);

      var genresEl = info.querySelector('.ott-genres');
      var yearEl = info.querySelector('.ott-year');
      var titleEl = info.querySelector('.ott-title');

      if (titleEl) titleEl.textContent = title;
      if (genresEl) genresEl.textContent = genres.join(', ');
      if (yearEl) yearEl.textContent = year ? ((genres.length ? ', ' : '') + year) : '';

    } catch (e) {}
  }

  function initHooks() {
    loadQualityCache();

    if (window.Lampa && Lampa.Listener) {
      Lampa.Listener.follow('card', function (e) {
        if (!e || !e.object) return;
        var cardEl = e.object.card || e.object.html;
        var data = e.object.data;
        if (cardEl && data) {
          renderCard(cardEl, data);
        }
      });
    }

    if (window.MutationObserver) {
      var observer = new MutationObserver(function (mutations) {
        for (var i = 0; i < mutations.length; i++) {
          var added = mutations[i].addedNodes;
          for (var j = 0; j < added.length; j++) {
            var node = added[j];
            if (node.nodeType === 1) {
              if (node.classList && node.classList.contains('card')) {
                var cardData = $(node).data('card');
                if (cardData && cardData.data) renderCard(node, cardData.data);
              } else if (node.querySelectorAll) {
                var cards = node.querySelectorAll('.card');
                for (var k = 0; k < cards.length; k++) {
                  var c = cards[k];
                  var cData = $(c).data('card');
                  if (cData && cData.data) renderCard(c, cData.data);
                }
              }
            }
          }
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }
  }

  function initSettings() {
    var lang = Lampa.Storage.get('language', 'ru');

    var i18n = {
      'en': {
        'zoom_title': 'Cards Uiverse + Obsidian Posters',
        'zoom_poster_quality': 'Poster Resolution (TMDB)',
        'q_def': 'Default Lampa',
        'q_w500': 'High (w500)',
        'q_w780': 'Full HD (w780)',
        'q_orig': 'Original 4K (Ultra)',
        'zoom_scale': 'Zoom Scale',
        'zoom_duration': 'Animation Speed',
        'zoom_radius': 'Corner Radius',
        'zoom_remove_border': 'Remove Border',
        'zoom_border_color': 'Border & Stars Color',
        'c_white': 'White',
        'c_lgrey': 'Light Grey',
        'c_dgrey': 'Dark Grey',
        'c_black': 'Black',
        'c_lblue': 'Light Blue',
        'c_blue': 'Blue',
        'c_dblue': 'Dark Blue',
        'c_lred': 'Light Red',
        'c_red': 'Red',
        'c_dred': 'Dark Red',
        'c_lgreen': 'Light Green',
        'c_green': 'Green',
        'c_dgreen': 'Dark Green',
        'c_yellow': 'Yellow',
        'c_orange': 'Orange',
        'c_purple': 'Purple',
        'c_cyan': 'Cyan',
        'c_pink': 'Pink',
        'none': 'Disabled (1.0x)',
        'tiny': 'Tiny (1.03x)',
        'small': 'Small (1.05x)',
        'medium': 'Medium (1.08x)',
        'large': 'Large (1.12x)',
        'xlarge': 'Extra Large (1.15x)',
        'uiverse': 'Uiverse (1.20x)',
        'max': 'Max (1.25x)',
        'very_fast': 'Very Fast (0.15s)',
        'fast': 'Fast (0.2s)',
        'normal': 'Normal (0.3s)',
        'smooth': 'Smooth (0.4s)',
        'slow': 'Slow (0.5s)',
        'very_slow': 'Very Slow (0.8s)',
        'r_none': 'Square (0)',
        'r_small': 'Small (0.3em)',
        'r_medium': 'Medium (0.6em)',
        'r_large': 'Large (0.9em)',
        'r_xlarge': 'Strong (1.3em)',
        'r_round': 'Round (1.8em)'
      },
      'ru': {
        'zoom_title': 'Карточки Uiverse + Постеры Obsidian',
        'zoom_poster_quality': 'Качество постеров (TMDB)',
        'q_def': 'Штатное Lampa',
        'q_w500': 'Высокое (w500)',
        'q_w780': 'Full HD (w780)',
        'q_orig': 'Оригинал 4K (Ultra)',
        'zoom_scale': 'Масштаб увеличения',
        'zoom_duration': 'Скорость анимации',
        'zoom_radius': 'Закругление углов',
        'zoom_remove_border': 'Выключить обводку',
        'zoom_border_color': 'Цвет обводки и звёзд',
        'c_white': 'Белый',
        'c_lgrey': 'Светло-серый',
        'c_dgrey': 'Темно-серый',
        'c_black': 'Черный',
        'c_lblue': 'Светло-синий',
        'c_blue': 'Синий',
        'c_dblue': 'Темно-синий',
        'c_lred': 'Светло-красный',
        'c_red': 'Красный',
        'c_dred': 'Темно-красный',
        'c_lgreen': 'Светло-зеленый',
        'c_green': 'Зеленый',
        'c_dgreen': 'Темно-зеленый',
        'c_yellow': 'Желтый',
        'c_orange': 'Оранжевый',
        'c_purple': 'Фиолетовый',
        'c_cyan': 'Голубой',
        'c_pink': 'Розовый',
        'none': 'Отключено (1.0x)',
        'tiny': 'Минимальное (1.03x)',
        'small': 'Малое (1.05x)',
        'medium': 'Среднее (1.08x)',
        'large': 'Большое (1.12x)',
        'xlarge': 'Очень большое (1.15x)',
        'uiverse': 'Uiverse (1.20x)',
        'max': 'Максимальное (1.25x)',
        'very_fast': 'Очень быстро (0.15s)',
        'fast': 'Быстро (0.2s)',
        'normal': 'Нормально (0.3s)',
        'smooth': 'Плавно (0.4s)',
        'slow': 'Медленно (0.5s)',
        'very_slow': 'Очень медленно (0.8s)',
        'r_none': 'Квадратные (0)',
        'r_small': 'Малые (0.3em)',
        'r_medium': 'Средние (0.6em)',
        'r_large': 'Большие (0.9em)',
        'r_xlarge': 'Сильные (1.3em)',
        'r_round': 'Круглые (1.8em)'
      }
    };

    function t(key) {
      var dict = i18n[lang] || i18n['ru'];
      return dict[key] || i18n['en'][key] || key;
    }

    function cBox(hex, nameKey) {
      return '<span style="display:inline-block;width:18px;height:18px;background:' + hex + ';border-radius:4px;margin-right:10px;vertical-align:middle;border:1px solid rgba(255,255,255,0.2);"></span>' + t(nameKey);
    }

    Lampa.SettingsApi.addComponent({
      component: 'card_zoom_plugin',
      name: t('zoom_title'),
      icon: '<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9l6 6m0-6l-6 6"/></svg>'
    });

    Lampa.SettingsApi.addParam({
      component: 'card_zoom_plugin',
      param: {
        name: 'zoom_poster_quality',
        type: 'select',
        default: 'default',
        values: { 'default': t('q_def'), 'w500': t('q_w500'), 'w780': t('q_w780'), 'original': t('q_orig') }
      },
      field: { name: t('zoom_poster_quality') },
      onChange: function () { applyPosterQuality(); }
    });

    Lampa.SettingsApi.addParam({
      component: 'card_zoom_plugin',
      param: {
        name: 'zoom_scale',
        type: 'select',
        default: '1.15',
        values: { '1.0': t('none'), '1.03': t('tiny'), '1.05': t('small'), '1.08': t('medium'), '1.12': t('large'), '1.15': t('xlarge'), '1.20': t('uiverse'), '1.25': t('max') }
      },
      field: { name: t('zoom_scale') },
      onChange: function () { injectCSS(); }
    });

    Lampa.SettingsApi.addParam({
      component: 'card_zoom_plugin',
      param: {
        name: 'zoom_duration',
        type: 'select',
        default: '0.3s',
        values: { '0.15s': t('very_fast'), '0.2s': t('fast'), '0.3s': t('normal'), '0.4s': t('smooth'), '0.5s': t('slow'), '0.8s': t('very_slow') }
      },
      field: { name: t('zoom_duration') },
      onChange: function () { injectCSS(); }
    });

    Lampa.SettingsApi.addParam({
      component: 'card_zoom_plugin',
      param: {
        name: 'zoom_radius',
        type: 'select',
        default: '0.6em',
        values: { '0': t('r_none'), '0.3em': t('r_small'), '0.6em': t('r_medium'), '0.9em': t('r_large'), '1.3em': t('r_xlarge'), '1.8em': t('r_round') }
      },
      field: { name: t('zoom_radius') },
      onChange: function () { injectCSS(); }
    });

    Lampa.SettingsApi.addParam({
      component: 'card_zoom_plugin',
      param: { name: 'zoom_remove_border', type: 'trigger', default: false },
      field: { name: t('zoom_remove_border') },
      onChange: function () { injectCSS(); }
    });

    Lampa.SettingsApi.addParam({
      component: 'card_zoom_plugin',
      param: {
        name: 'zoom_border_color',
        type: 'select',
        default: '#ffffff',
        values: {
          '#ffffff': cBox('#ffffff', 'c_white'), '#cccccc': cBox('#cccccc', 'c_lgrey'), '#666666': cBox('#666666', 'c_dgrey'), '#000000': cBox('#000000', 'c_black'),
          '#64b5f6': cBox('#64b5f6', 'c_lblue'), '#2196f3': cBox('#2196f3', 'c_blue'), '#0d47a1': cBox('#0d47a1', 'c_dblue'),
          '#e57373': cBox('#e57373', 'c_lred'), '#f44336': cBox('#f44336', 'c_red'), '#b71c1c': cBox('#b71c1c', 'c_dred'),
          '#81c784': cBox('#81c784', 'c_lgreen'), '#4caf50': cBox('#4caf50', 'c_green'), '#1b5e20': cBox('#1b5e20', 'c_dgreen'),
          '#ffeb3b': cBox('#ffeb3b', 'c_yellow'), '#ff9800': cBox('#ff9800', 'c_orange'), '#9c27b0': cBox('#9c27b0', 'c_purple'),
          '#00bcd4': cBox('#00bcd4', 'c_cyan'), '#e91e63': cBox('#e91e63', 'c_pink')
        }
      },
      field: { name: t('zoom_border_color') },
      onChange: function () { injectCSS(); }
    });
  }

  function bootstrap() {
    initSettings();
    injectCSS();
    applyPosterQuality();
    initHooks();

    if (window.Lampa && Lampa.Storage && Lampa.Storage.listener) {
      Lampa.Storage.listener.follow('change', function (e) {
        if (e.name && (e.name === 'zoom_scale' || e.name === 'zoom_duration' || e.name === 'zoom_radius' || e.name === 'zoom_remove_border' || e.name === 'zoom_border_color')) {
          injectCSS();
        }
        if (e.name && e.name === 'zoom_poster_quality') {
          applyPosterQuality();
        }
      });
    }

    console.log('[Card Uiverse + True Obsidian Posters] Ready');
  }

  if (window.Lampa && Lampa.Listener) {
    Lampa.Listener.follow('app', function (e) {
      if (e.type === 'ready') bootstrap();
    });
    setTimeout(bootstrap, 800);
  } else {
    var poll = setInterval(function () {
      if (typeof Lampa !== 'undefined' && Lampa.Listener) {
        clearInterval(poll);
        Lampa.Listener.follow('app', function (e) {
          if (e.type === 'ready') bootstrap();
        });
        setTimeout(bootstrap, 800);
      }
    }, 200);
  }

})();
