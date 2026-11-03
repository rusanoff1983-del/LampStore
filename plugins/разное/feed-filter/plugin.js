(function () {
  'use strict';
  // «Фільтр стрічки» — hides from the TMDB / CUB lists (Home, categories, «See all», recommendations
  // on a card; search only when asked) what the viewer does not want: titles of chosen regions (by the
  // original language, and by the country of production where the list gives it: series and full
  // cards; movies in lists carry only the language), erotica, cards without a poster, little-known
  // titles. The lists of other plugins that ask TMDB through Lampa.Reguest are filtered too.
  // Settings: «Закусь» › Cards. Lampa's cached answers are not changed: a filter switched off shows
  // everything again at once.
  var VERSION = '1.0.0';   // shown in «Закусь» › «О паке»
  if (window.alc_feed_filter_ready) return;
  window.alc_feed_filter_ready = true;

  var STR = {
    plugin_name: ['Фильтр ленты', 'Фільтр стрічки', 'Feed filter'],
    enable:      ['Фильтр включён', 'Фільтр увімкнено', 'Filter on'],
    off:         ['Выключен', 'Вимкнено', 'Off'],
    nothing:     ['Ничего не скрывается', 'Нічого не ховається', 'Nothing is hidden'],
    on_d:        ['Скрывать в лентах TMDB и CUB то, что выбрано ниже', 'Ховати у стрічках TMDB і CUB те, що вибрано нижче', 'Hide from the TMDB and CUB lists what is chosen below'],
    regions:     ['Скрывать регионы', 'Ховати регіони', 'Hide regions'],
    none:        ['ничего', 'нічого', 'nothing'],
    regions_d:   ['По языку оригинала; у сериалов и в карточке — и по стране производства', 'За мовою оригіналу; у серіалів і в картці — і за країною виробництва', 'By the original language; series and full cards also by the country of production'],
    softcore:    ['Скрывать эротику', 'Ховати еротику', 'Hide erotica'],
    softcore_d:  ['Отметка TMDB «softcore» и 18+', 'Позначка TMDB «softcore» і 18+', 'TMDB’s «softcore» mark and 18+'],
    noposter:    ['Скрывать карточки без постера', 'Ховати картки без постера', 'Hide cards without a poster'],
    votes:       ['Минимум оценок на TMDB', 'Мінімум оцінок на TMDB', 'Minimum TMDB votes'],
    votes_d:     ['Скрывать малоизвестное (новинки с малым числом оценок тоже скроются)', 'Ховати маловідоме (новинки з малою кількістю оцінок теж сховаються)', 'Hide little-known titles (new ones with few votes too)'],
    votes_0:     ['Не скрывать', 'Не ховати', 'Do not hide'],
    search:      ['Фильтровать и поиск', 'Фільтрувати й пошук', 'Filter the search too'],
    search_d:    ['Обычно в поиске нужно всё, что ищешь', 'Зазвичай у пошуку потрібне все, що шукаєш', 'Usually a search should find everything'],
    r_india:     ['Индия', 'Індія', 'India'],
    r_russia:    ['Россия, Беларусь (украинское производство остаётся)', 'Росія, Білорусь (українське виробництво лишається)', 'Russia, Belarus (Ukrainian productions stay)'],
    r_turkey:    ['Турция', 'Туреччина', 'Turkey'],
    r_china:     ['Китай, Гонконг, Тайвань', 'Китай, Гонконг, Тайвань', 'China, Hong Kong, Taiwan'],
    r_korea:     ['Корея', 'Корея', 'Korea'],
    r_sea:       ['Филиппины, Таиланд, Индонезия, Вьетнам, Малайзия', 'Філіппіни, Таїланд, Індонезія, В’єтнам, Малайзія', 'Philippines, Thailand, Indonesia, Vietnam, Malaysia'],
    r_mideast:   ['Арабские страны, Иран, Пакистан', 'Арабські країни, Іран, Пакистан', 'Arab countries, Iran, Pakistan'],
    r_latam:     ['Латинская Америка (испанский и португальский — только по стране)', 'Латинська Америка (іспанська й португальська — лише за країною)', 'Latin America (Spanish and Portuguese: by country only)']
  };
  function lang() { var l = 'ru'; try { l = String(Lampa.Storage.get('language', 'ru') || 'ru'); } catch (e) {} return l; }
  function tr(k) { var l = lang(); return STR[k][l === 'uk' ? 1 : l === 'ru' || l === 'be' ? 0 : 2]; }

  // a region: original languages and production countries (ISO); keep: countries that keep a title anyway
  var REGIONS = [
    { id: 'india', langs: ['hi', 'ta', 'te', 'ml', 'kn', 'bn', 'mr', 'pa', 'gu', 'or', 'as', 'bh'], countries: ['IN'], def: true },
    { id: 'russia', langs: ['ru'], countries: ['RU', 'BY', 'SU'], keep: ['UA'] },
    { id: 'turkey', langs: ['tr'], countries: ['TR'] },
    { id: 'china', langs: ['zh', 'cn'], countries: ['CN', 'HK', 'TW'] },
    { id: 'korea', langs: ['ko'], countries: ['KR'] },
    { id: 'sea', langs: ['tl', 'th', 'id', 'vi', 'ms'], countries: ['PH', 'TH', 'ID', 'VN', 'MY'] },
    { id: 'mideast', langs: ['ar', 'fa', 'ur'], countries: ['EG', 'SA', 'AE', 'IR', 'PK', 'IQ', 'SY', 'JO', 'LB', 'KW', 'QA', 'MA', 'DZ', 'TN'] },
    { id: 'latam', langs: [], countries: ['MX', 'BR', 'AR', 'CO', 'CL', 'PE', 'VE'] }
  ];
  var K = { on: 'feed_filter', regions: 'feed_filter_regions', softcore: 'feed_filter_softcore', noposter: 'feed_filter_noposter',
    votes: 'feed_filter_votes', search: 'feed_filter_search' };

  function isArr(x) { return Object.prototype.toString.call(x) === '[object Array]'; }
  // (Lampa's Storage.get gives '' for a key never set when the default is false: the default then)
  function bool(k, d) { var v = d; try { v = Lampa.Storage.get(k, d); } catch (e) {} if (v === '' || v === null || v === undefined) return d; return !(v === false || v === 'false'); }
  function regionsOn() {
    var v = null;
    try { v = Lampa.Storage.get(K.regions, ''); } catch (e) {}
    if (typeof v === 'string' && v) try { v = JSON.parse(v); } catch (e) { v = null; }
    if (!isArr(v)) return REGIONS.filter(function (r) { return r.def; }).map(function (r) { return r.id; });
    return v;
  }

  // the rules worked out once per settings change
  var rules = null;
  function getRules() {
    if (rules) return rules;
    var on = regionsOn(), L = {}, C = {}, keep = {};
    REGIONS.forEach(function (r) {
      if (on.indexOf(r.id) < 0) return;
      r.langs.forEach(function (x) { L[x] = 1; });
      r.countries.forEach(function (x) { C[x] = 1; });
      (r.keep || []).forEach(function (x) { keep[x] = 1; });
    });
    var votes = 0;
    try { votes = parseInt(Lampa.Storage.get(K.votes, '0'), 10) || 0; } catch (e) {}
    rules = { on: bool(K.on, true), langs: L, countries: C, keep: keep, softcore: bool(K.softcore, false),
      noposter: bool(K.noposter, false), votes: votes, search: bool(K.search, false) };
    return rules;
  }
  try { Lampa.Storage.listener.follow('change', function (e) { if (e && /^feed_filter/.test(e.name)) rules = null; }); } catch (e) {}

  function countriesOf(c) {
    var out = [];
    if (c.origin_country && c.origin_country.length) out = out.concat(c.origin_country);
    if (c.production_countries && c.production_countries.length) c.production_countries.forEach(function (p) { if (p && p.iso_3166_1) out.push(p.iso_3166_1); });
    return out;
  }
  // a title card of a list (not a person, a video, a season…)
  function isCard(c) {
    return c && typeof c === 'object' && c.id && (c.title || c.name) && c.media_type !== 'person' && !c.profile_path &&
      ('original_language' in c || 'poster_path' in c) && !('iso_639_1' in c && 'key' in c);
  }
  function keep(c, R) {
    if (!isCard(c)) return true;
    var cs = countriesOf(c), i;
    for (i = 0; i < cs.length; i++) if (R.keep[cs[i]]) { cs = null; break; }
    if (cs) {
      if (c.original_language && R.langs[c.original_language]) return false;
      for (i = 0; i < cs.length; i++) if (R.countries[cs[i]]) return false;
    }
    if (R.softcore && (c.softcore || c.adult)) return false;
    if (R.noposter && !c.poster_path && !c.img) return false;
    if (R.votes && typeof c.vote_count === 'number' && c.vote_count < R.votes) return false;
    return true;
  }

  // the answer of a source, filtered without touching the original (Lampa keeps it in its cache):
  // objects with a «results» list of cards, in arrays / objects up to a few levels; functions in it
  // (a row that loads itself) get their callbacks filtered
  // an answer can pass several hooks (a source's method, its list(), a Reguest of it): the result is marked
  // with the rules it was filtered by (a hidden property; new rules are a new object) and passes again as is
  function filterData(x, R) {
    if (!x || typeof x !== 'object') return filterAt(x, R, 0);
    // only our own filtered copies are marked (never Lampa's originals, which it may fill later), with
    // the count of cards they had: cards added to it afterwards are filtered again
    if (x.feed_filtered === R && (!isArr(x.results) || x.results.length === x.feed_filtered_n)) return x;
    var f = filterAt(x, R, 0);
    return f !== x ? marked(f, R) : f;
  }
  function filterAt(x, R, d) {
    if (!x || d > 4) return x;
    if (typeof x === 'function') return wrapLoader(x, R);
    if (isArr(x)) {
      var arr = null;
      for (var i = 0; i < x.length; i++) {
        var v = filterAt(x[i], R, d + 1);
        if (v !== x[i]) { if (!arr) arr = x.slice(); arr[i] = v; }
      }
      return arr || x;
    }
    if (typeof x !== 'object' || isCard(x)) return x;
    var copy = null;
    if (isArr(x.results)) {
      var res = x.results.filter(function (c) { return keep(c, R); });
      if (res.length !== x.results.length) { copy = copyOf(x); copy.results = res; }
    }
    for (var k in x) {
      if (k === 'results' || !Object.prototype.hasOwnProperty.call(x, k)) continue;
      var val = x[k];
      if (!val || typeof val !== 'object' || isCard(val)) continue;
      var nv = filterAt(val, R, d + 1);
      if (nv !== val) { if (!copy) copy = copyOf(x); copy[k] = nv; }
    }
    return copy || x;
  }
  function marked(x, R) {
    try {
      if (x && typeof x === 'object') {
        Object.defineProperty(x, 'feed_filtered', { value: R, writable: true, configurable: true });
        Object.defineProperty(x, 'feed_filtered_n', { value: isArr(x.results) ? x.results.length : -1, writable: true, configurable: true });
      }
    } catch (e) {}
    return x;
  }
  function copyOf(o) { var c = {}; for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) c[k] = o[k]; return c; }
  function wrapCb(f, R) {
    if (typeof f !== 'function' || f.feed_filter) return f;
    var w = function () {
      var a = Array.prototype.slice.call(arguments);
      try { for (var i = 0; i < a.length; i++) a[i] = filterData(a[i], R); } catch (e) {}
      return f.apply(this, a);
    };
    w.feed_filter = true;
    return w;
  }
  function wrapLoader(f, R) {
    if (f.feed_filter) return f;
    var w = function () {
      var a = Array.prototype.slice.call(arguments);
      for (var i = 0; i < a.length; i++) if (typeof a[i] === 'function') a[i] = wrapCb(a[i], R);
      var out = f.apply(this, a);
      return typeof out === 'function' ? wrapLoader(out, R) : out;
    };
    w.feed_filter = true;
    return w;
  }

  // «See all» (a source's list(), page by page): a page the filter emptied (or nearly) would stop Lampa's
  // list there (no card left to load the next page from). The next pages are asked at once until there
  // are MIN_PAGE cards (or no pages, or EXTRA pages taken); the pages taken this way are remembered per
  // list (shift), so the list's next page goes on after them
  var MIN_PAGE = 10, EXTRA = 5, shift = {};
  function listFilled(orig) {
    return function (params, oncomplite, onerror) {
      var R = getRules();
      if (!R.on || !params || typeof oncomplite !== 'function') return orig.apply(this, arguments);
      var self = this, key = [params.source, params.url, params.genres, params.sort_by, params.id].join('|');
      var page = parseInt(params.page, 10) || 1;
      if (page === 1) shift[key] = 0;
      var taken = 0, acc = [], seen = {}, first = null, total = 0;
      var done = function () {
        var out = copyOf(first || {});
        out.results = acc;
        out.page = page;
        if (total) out.total_pages = Math.max(page, total - (shift[key] || 0));
        oncomplite(marked(out, R));
      };
      var load = function (actual) {
        var q = copyOf(params);
        q.page = actual;
        orig.call(self, q, function (json) {
          var f = filterData(json, R);
          if (!first) first = f;
          total = (json && json.total_pages) || total;
          ((f && f.results) || []).forEach(function (c) { var id = c && (c.media_type || '') + c.id; if (c && !seen[id]) { seen[id] = 1; acc.push(c); } });
          if (acc.length < MIN_PAGE && total && actual < total && taken < EXTRA) { taken++; shift[key] = (shift[key] || 0) + 1; load(actual + 1); }
          else done();
        }, function () {
          if (first) done();
          else if (typeof onerror === 'function') onerror.apply(this, arguments);
        });
      };
      load(page + (shift[key] || 0));
    };
  }

  // the methods of Lampa's sources that give lists (main, categories, «See all», a card's recommendations)
  var METHODS = ['main', 'category', 'list', 'full', 'company', 'search'];
  function hookSource(name) {
    var src = Lampa.Api && Lampa.Api.sources && Lampa.Api.sources[name];
    if (!src || src.feed_filter) return;
    src.feed_filter = true;
    METHODS.forEach(function (m) {
      var orig = src[m];
      if (typeof orig !== 'function') return;
      if (m === 'list') { src[m] = listFilled(orig); return; }
      src[m] = function () {
        var R = getRules();
        if (!R.on || (m === 'search' && !R.search)) return orig.apply(this, arguments);
        var a = Array.prototype.slice.call(arguments);
        for (var i = 1; i < a.length; i++) if (typeof a[i] === 'function') a[i] = wrapCb(a[i], R);
        var out = orig.apply(this, a);
        return typeof out === 'function' ? wrapLoader(out, R) : out;
      };
    });
  }

  // other plugins' TMDB lists (their own Lampa.Reguest): trending, discover, popular…
  var LIST_RE = /\/3\/(trending|discover)\/|\/3\/(movie|tv)\/(popular|top_rated|now_playing|upcoming|on_the_air|airing_today)\b|\/(recommendations|similar)\b/;
  var SEARCH_RE = /\/3\/search\//;
  function hookReguest() {
    var Orig = Lampa.Reguest;
    if (typeof Orig !== 'function' || Orig.feed_filter) return;
    var W = function () {
      var r = new (Function.prototype.bind.apply(Orig, [null].concat(Array.prototype.slice.call(arguments))))();
      ['silent', 'native'].forEach(function (m) {
        var f = r[m];
        if (typeof f !== 'function') return;
        r[m] = function (url, ok) {
          var a = Array.prototype.slice.call(arguments);
          try {
            var R = getRules();
            if (R.on && typeof url === 'string' && (LIST_RE.test(url) || (R.search && SEARCH_RE.test(url))) && typeof ok === 'function') a[1] = wrapCb(ok, R);
          } catch (e) {}
          return f.apply(this, a);
        };
      });
      return r;
    };
    W.feed_filter = true;
    W.prototype = Orig.prototype;
    Lampa.Reguest = W;
  }

  // ---------- the pack's settings folders (the same block in every plugin of the pack) ----------
  // Lampa lists a folder's items in the order plugins added them, and the pack's plugins load in any
  // order. Here each item names its group and its place in it; when Lampa draws a folder (it reads the
  // list through getParam every time) the list comes in that order, an item whose snack_show() says no
  // is left out, and a group with nothing left loses its title. «Закусь», the pack's own folder, is a
  // menu of sub-folders (Lampa components hidden from Settings' own list, opened from «Закусь» with
  // Back leading to it): items are still added to «Закусь» with a group, and the group decides the
  // sub-folder they are drawn in (copies of an older block, loaded first, keep working the same way).
  // Its last group, «О паке», lists the installed plugins' versions and resets the pack's options (not
  // the data: favourite voices, subscriptions…). The newest copy of this block serves all.
  var PACKSET_V = 4;
  function packSettings() {
    var S = window.snack_set;
    if (S && S.v >= PACKSET_V) return S;
    var api = Lampa.SettingsApi, old = S || {};
    function L(a) { var l = 'ru'; try { l = String(Lampa.Storage.get('language', 'ru') || 'ru'); } catch (e) {} return a[l === 'uk' ? 1 : l === 'ru' || l === 'be' ? 0 : 2]; }
    var TXT = {
      about: ['О паке', 'Про пак', 'About the pack'], versions: ['Версии', 'Версії', 'Versions'],
      reset: ['Сбросить настройки', 'Скинути налаштування', 'Reset settings'],
      reset_d: ['Все пункты «Закуси», кроме ваших данных (озвучки, подписки) и адреса сервера', 'Усі пункти «Закусі», крім ваших даних (озвучення, підписки) й адреси сервера', 'Every «Закусь» option, not your data (voices, subscriptions) nor the server address'],
      reset_q: ['Сбросить настройки «Закуси»?', 'Скинути налаштування «Закусі»?', 'Reset the «Закусь» settings?'],
      yes: ['Сбросить', 'Скинути', 'Reset'], no: ['Отмена', 'Скасувати', 'Cancel'],
      watch: ['Просмотр', 'Перегляд', 'Watching'],
      watch_d: ['Автопилот: запуск, озвучки, источники', 'Автопілот: запуск, озвучення, джерела', 'Autopilot: playback, voices, sources'],
      langs: ['Языки и субтитры', 'Мови й субтитри', 'Languages and subtitles'],
      langs_d: ['Порядок языков озвучки и субтитров', 'Порядок мов озвучення й субтитрів', 'The order of voice and subtitle languages'],
      cards: ['Главная и карточки', 'Головна й картки', 'Home and cards'],
      cards_d: ['Метка UA, трейлеры, фильтр ленты', 'Мітка UA, трейлери, фільтр стрічки', 'UA badge, trailers, feed filter'],
      feed: ['Фильтр ленты', 'Фільтр стрічки', 'Feed filter'],
      feed_d: ['Что прятать в лентах TMDB и CUB', 'Що ховати у стрічках TMDB і CUB', 'What to hide from the TMDB and CUB lists'],
      subs: ['Подписки', 'Підписки', 'Subscriptions'],
      subs_d: ['Новые серии в выбранной озвучке', 'Нові серії в обраному озвученні', 'New episodes in a chosen voice'],
      server: ['Сервер', 'Сервер', 'Server'],
      server_d: ['Ваш сервер с онлайн-источниками', 'Ваш сервер з онлайн-джерелами', 'Your server with online sources']
    };
    S = window.snack_set = { v: PACKSET_V, pages: old.pages || {}, versions: old.versions || {}, seq: old.seq || 0, titled: old.titled || {}, txt: function (k) { return L(TXT[k] || [k, k, k]); } };
    // the sub-folders of «Закусь»: the groups drawn in them, their parent, their place in it
    var SUBS = [
      { id: 'snack_watch', group: 'watch', parent: 'snack', o: 10 },
      { id: 'snack_langs', group: 'langs', parent: 'snack', o: 20 },
      { id: 'snack_cards', group: 'cards', parent: 'snack', o: 30 },
      { id: 'snack_feed', group: 'feed', parent: 'snack_cards', o: 900 },
      { id: 'snack_subs', group: 'subs', parent: 'snack', o: 40 },
      { id: 'snack_server', group: 'server', parent: 'snack', o: 50, keep: true }   // keep: the viewer's own (reset leaves it)
    ];
    S.subs = SUBS;
    S.subId = {}; S.subGroup = {};
    SUBS.forEach(function (s) { S.subId[s.id] = s; S.subGroup[s.group] = s; });
    // a plugin may say what its sub-folder holds now (its button's line): S.describe(group, fn → text)
    S.descr = old.descr || {};
    S.describe = function (group, fn) { S.descr[group] = fn; };
    function subOf(group) { return S.subGroup[group] || null; }
    function subById(id) { return S.subId[id] || null; }
    if (!api.snack_get) {
      var get = api.getParam;
      api.snack_get = get;
      api.getParam = function (name) { var list = get.apply(this, arguments); try { return window.snack_set.list(name, list); } catch (e) { return list; } };
    }
    // the sub-folders are not in Settings' own list (they open from «Закусь»)
    if (!api.snack_all) {
      var all = api.allComponents;
      api.snack_all = all;
      api.allComponents = function () {
        var c = all.apply(this, arguments), out = {}, ids = (window.snack_set && window.snack_set.subId) || {};
        for (var k in c) if (!ids[k]) out[k] = c[k];
        return out;
      };
    }
    function visible(d) {
      if (d.snack_title) return true;
      try { return !d.snack_show || !!d.snack_show(); } catch (e) { return true; }
    }
    function seq(d) { if (d.snack_i === undefined) d.snack_i = ++S.seq; }
    function byPlace(a, b) { return (a.snack_o || 0) - (b.snack_o || 0) || a.snack_i - b.snack_i; }
    function inSub(d, group) { return d.snack_g === group && !d.snack_title; }
    // a sub-folder has something to show (its button is listed): the first shown item is enough
    function anyShown(group) {
      var l = api.snack_get('snack') || [];
      for (var i = 0; i < l.length; i++) if (inSub(l[i], group) && visible(l[i])) return true;
      return false;
    }
    // the list Lampa draws: shown items, by group, place, then the order they came in. «Закусь»: the
    // groups of the sub-folders leave it (their buttons stay); a sub-folder: the items of its group
    S.list = function (name, list) {
      var sub = subById(name);
      if (sub) {
        list = (api.snack_get('snack') || []).filter(function (d) { return inSub(d, sub.group); });
        list.forEach(seq);
        return list.filter(visible).sort(byPlace);
      }
      var pg = S.pages[name];
      if (!pg || !list) return list;
      if (name === 'snack') list = list.filter(function (d) { return !subOf(d.snack_g); });
      var rank = {}, used = {};
      pg.groups.forEach(function (g, i) { rank[g.id] = i; });
      var out = list.filter(function (d) {
        seq(d);
        if (d.snack_title) return true;
        var ok = visible(d);
        if (ok) used[d.snack_g] = 1;
        return ok;
      }).filter(function (d) { return !d.snack_title || used[d.snack_title]; });
      function r(d) { return d.snack_g === undefined ? pg.legacy : rank[d.snack_g] !== undefined ? rank[d.snack_g] : 99; }
      return out.sort(function (a, b) { return r(a) - r(b) || byPlace(a, b); });
    };
    // a folder: groups [{id, title}] in order; items of plugins that know no groups (an older copy of
    // this block) go at `legacy` (a group's index, may be fractional)
    S.page = function (id, def) {
      if (S.pages[id]) return S.pages[id];
      S.pages[id] = { groups: def.groups, legacy: def.legacy || 0 };
      api.addComponent({ component: id, name: def.name, icon: def.icon });
      return S.pages[id];
    };
    // an item: Lampa's addParam data, plus its group and place (snack_show: when to list it)
    S.add = function (id, group, order, data) {
      var pg = S.pages[id], g = pg && pg.groups.filter(function (x) { return x.id === group; })[0];
      if (g && g.title && !S.titled[id + '|' + group]) {
        S.titled[id + '|' + group] = 1;
        api.addParam({ component: id, param: { name: 'snack_t_' + id + '_' + group, type: 'title' }, field: { name: g.title }, snack_g: group, snack_o: -1e9, snack_title: group });
      }
      data.component = id;
      data.snack_g = group;
      data.snack_o = order;
      api.addParam(data);
    };
    // open a folder of the pack; a sub-folder's Back leads to its parent (also after Lampa redraws it),
    // the focus on the button of the sub-folder left (focus: an item's name)
    function focusIndex(id, name) {
      if (!name) return 0;
      var list = S.list(id, api.snack_get(id) || []) || [], i = 0, at = -1;
      list.forEach(function (d) { var t = d.param && d.param.type; if (t === 'title' || t === 'static') return; if (d.param.name === name) at = i; i++; });
      return at > 0 ? at : 0;
    }
    S.backTo = function (sub) { return function () { window.snack_set.open(sub.parent, 'snack_open_' + sub.group); }; };
    S.open = function (id, focus) {
      var sub = subById(id), params = {};
      if (sub) params.onBack = S.backTo(sub);
      var at = focusIndex(id, focus);
      if (at) params.last_index = at;
      Lampa.Settings.create(id, params);
    };
    // Lampa redraws a folder (Settings.update) without the params it was opened with: Back put back
    if (!api.snack_back) try {
      api.snack_back = true;
      Lampa.Settings.listener.follow('open', function (e) {
        var T = window.snack_set, s = e && T && T.subId && T.subId[e.name];
        if (s && e.params && !e.params.onBack) e.params.onBack = T.backTo(s);
      });
    } catch (e) {}
    // reset the pack's options (triggers, lists, fields of «Закусь» and its sub-folders) to their
    // defaults, after a question
    S.reset = function (id, done) {
      var back = function () { try { Lampa.Controller.toggle('settings_component'); } catch (e) {} };
      Lampa.Select.show({
        title: S.txt('reset_q'), items: [{ title: S.txt('yes'), yes: true }, { title: S.txt('no') }],
        onSelect: function (a) {
          back();
          if (!a.yes) return;
          (api.snack_get(id) || []).forEach(function (d) {
            var p = d.param || {}, sub = subOf(d.snack_g);
            if (sub && sub.keep) return;   // the viewer's own (the server address), like their data
            if (/^(trigger|select|input)$/.test(p.type) && p['default'] !== undefined) try { Lampa.Storage.set(p.name, p['default']); } catch (e) {}
          });
          try { if (done) done(); } catch (e) {}
          setTimeout(function () { try { Lampa.Settings.update(); } catch (e) {} }, 0);
        },
        onBack: back
      });
    };
    // «Закусь»: created by whichever plugin of the pack comes first; its sub-folders and their buttons
    S.version = function (name, v) { S.versions[name] = v; };
    var ICON = '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M4 4h16l-2 16H6L4 4zm2.3 2 .3 2.5h10.8l.3-2.5H6.3z" fill="currentColor"/></svg>';
    S.pack = function () {
      if (S.pages.snack && S.pages.snack.v2) return 'snack';
      window.snack_settings = true;   // older copies: the folder is there
      var made = !!S.pages.snack;
      S.pages.snack = { v2: true, groups: [{ id: 'menu' }, { id: 'about', title: S.txt('about') }], legacy: 0.5 };
      if (!made) api.addComponent({ component: 'snack', name: 'Закусь', icon: ICON });
      SUBS.forEach(function (s) {
        api.addComponent({ component: s.id, name: S.txt(s.group), icon: ICON });
        // the button: in «Закусь» (group menu) or, for a sub-folder of a sub-folder, in its parent's group
        var parent = subById(s.parent);
        S.add('snack', parent ? parent.group : 'menu', s.o, {
          param: { name: 'snack_open_' + s.group, type: 'button' }, field: { name: S.txt(s.group), description: S.txt(s.group + '_d') },
          snack_show: function () { return anyShown(s.group); },
          onRender: function (item) {
            var f = window.snack_set.descr[s.group], t = '';
            try { t = f ? f() : ''; } catch (e) {}
            if (t) item.find('.settings-param__descr').text(t);
          },
          onChange: function () { S.open(s.id); } });
      });
      var have = {};
      try { have = adopt(); } catch (e) {}
      if (!have.snack_versions) S.add('snack', 'about', 80, { param: { name: 'snack_versions', type: 'static' }, field: { name: S.txt('versions'), description: ' ' },
        onRender: function (item) {
          var v = window.snack_set.versions, list = Object.keys(v).sort().map(function (k) { return k + ' ' + v[k]; });
          item.find('.settings-param__descr').text(list.join(' · '));
        } });
      if (!have.snack_reset) S.add('snack', 'about', 90, { param: { name: 'snack_reset', type: 'button' }, field: { name: S.txt('reset'), description: S.txt('reset_d') },
        onChange: function () { window.snack_set.reset('snack'); } });
      return 'snack';
    };
    // «О паке» items an older copy added: kept (no second one), its reset button says what reset does now
    function adopt() {
      var have = {};
      (api.snack_get('snack') || []).forEach(function (d) {
        if (!d.param) return;
        have[d.param.name] = 1;
        if (d.param.name === 'snack_reset' && d.field) d.field.description = S.txt('reset_d');
      });
      return have;
    }
    // an older copy made «Закусь» already: take it over
    if (window.snack_settings && !(S.pages.snack && S.pages.snack.v2)) { delete window.snack_settings; S.pack(); }
    else try { adopt(); } catch (e) {}
    return S;
  }

  function regionsText() {
    var on = regionsOn(), names = REGIONS.filter(function (r) { return on.indexOf(r.id) >= 0; }).map(function (r) { return tr('r_' + r.id).split(' (')[0]; });
    return names.length ? names.join(', ') : tr('none');
  }
  function pickRegions(item) {
    var on = regionsOn().slice();
    var back = function () { try { Lampa.Controller.toggle('settings_component'); } catch (e) {} };
    Lampa.Select.show({
      title: tr('regions'),
      items: REGIONS.map(function (r) { return { title: tr('r_' + r.id), id: r.id, checkbox: true, checked: on.indexOf(r.id) >= 0 }; }),
      onCheck: function (a) {
        var i = on.indexOf(a.id);
        if (i >= 0) on.splice(i, 1); else on.push(a.id);
        Lampa.Storage.set(K.regions, on);   // its 'change' resets the rules
        try { item.find('.settings-param__descr').text(regionsText()); } catch (e) {}
      },
      onBack: back,
      onSelect: back
    });
  }

  function settings() {
    try {
      if (!Lampa.SettingsApi || window.alc_feed_filter_settings) return;
      window.alc_feed_filter_settings = true;
      var S = packSettings(), C = S.pack();
      S.version(tr('plugin_name'), VERSION);
      var on = function () { return bool(K.on, true); };
      // the line on «Фільтр стрічки ›»: what is hidden now
      S.describe('feed', function () {
        if (!on()) return tr('off');
        var R = getRules(), list = regionsOn().length ? [regionsText()] : [];
        if (R.softcore) list.push(tr('softcore').toLowerCase());
        if (R.noposter) list.push(tr('noposter').toLowerCase());
        if (R.votes) list.push(tr('votes').toLowerCase() + ' ' + R.votes);
        return list.length ? list.join(' · ') : tr('nothing');
      });
      S.add(C, 'feed', 40, { param: { name: K.on, type: 'trigger', 'default': true }, field: { name: tr('enable'), description: tr('on_d') },
        onChange: function () { try { Lampa.Settings.update(); } catch (e) {} } });
      S.add(C, 'feed', 41, { param: { name: 'feed_filter_regions_btn', type: 'button' }, field: { name: tr('regions'), description: ' ' }, snack_show: on,
        onRender: function (item) { item.find('.settings-param__descr').text(regionsText()); },
        onChange: function () { pickRegions($('.settings-param[data-name="feed_filter_regions_btn"]')); } });
      S.add(C, 'feed', 42, { param: { name: K.softcore, type: 'trigger', 'default': false }, field: { name: tr('softcore'), description: tr('softcore_d') }, snack_show: on });
      S.add(C, 'feed', 43, { param: { name: K.noposter, type: 'trigger', 'default': false }, field: { name: tr('noposter') }, snack_show: on });
      var v = {}; v['0'] = tr('votes_0'); v['10'] = '10'; v['50'] = '50'; v['200'] = '200'; v['1000'] = '1000';
      S.add(C, 'feed', 44, { param: { name: K.votes, type: 'select', values: v, 'default': '0' }, field: { name: tr('votes'), description: tr('votes_d') }, snack_show: on });
      S.add(C, 'feed', 45, { param: { name: K.search, type: 'trigger', 'default': false }, field: { name: tr('search'), description: tr('search_d') }, snack_show: on });
    } catch (e) { console.error('FeedFilter', e && e.message); }
  }

  function start() {
    try { hookSource('tmdb'); hookSource('cub'); hookReguest(); } catch (e) { console.error('FeedFilter', e && e.message); }
    setTimeout(settings, 0);
  }
  // the sources are hooked at once: the Home screen asks them right after «app ready»
  if (window.Lampa && Lampa.Api && Lampa.Api.sources) start();
  if (window.appready) setTimeout(settings, 0);
  else Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') start(); });
})();
