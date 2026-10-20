(function () {
    'use strict';
    window.lampa_plugin_obsidra = {name:'ObsiView',version:'2.11'};
    function renamePlugin() {
        if (!window.Lampa || !Lampa.Storage) return;
        var plugins=Lampa.Storage.get('plugins',[]), changed=false;
        if(Array.isArray(plugins)) {
            plugins.forEach(function(plugin){if(plugin && typeof plugin==='object' && /\/(card_style|obsidra|obsidra-card|obsiview)\.js(?:[?#]|$)/.test(plugin.url || plugin.link || '') && plugin.name!=='ObsiView'){plugin.name='ObsiView';changed=true;}});
            if(changed) Lampa.Storage.set('plugins',plugins);
        }
        if(Lampa.Plugins && Lampa.Plugins.get) Lampa.Plugins.get().forEach(function(plugin){if(/\/(card_style|obsidra|obsidra-card|obsiview)\.js(?:[?#]|$)/.test(plugin.url || '')) plugin.name='ObsiView';});
    }
    if(window.appready) renamePlugin();
    else if(window.Lampa) Lampa.Listener.follow('app',function(event){if(event.type==='ready') renamePlugin();});


    // ObsiView 2.11 — интеграция с Apple TV (stv_titles / stv-titles).
    // Данные расположены под постером; исходный plugin.js менять не требуется.

    // Защита от двойной загрузки плагина (иначе дублируются слушатели и запросы)
    if (window.__ott_card_style_loaded) return;
    window.__ott_card_style_loaded = true;

    var STAR_ICON_SVG = '<svg class="ott-star-icon" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 2.5 L14.9 8.9 L22 9.7 L16.8 14.6 L18.2 21.5 L12 17.9 L5.8 21.5 L7.2 14.6 L2 9.7 L9.1 8.9 Z"></path></svg>';
    var QUALITY_ICON_SVG = '<svg class="ott-quality-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M3.34 19a10 10 0 1 1 17.32 0"></path><path class="ott-quality-needle" d="M 12 6.2 L 13.48 11.61 A 2.4 2.4 0 1 1 10.52 11.61 Z" fill="currentColor" stroke="none"></path></svg>';

    // ───────────────────────── Настройки ─────────────────────────
    var QUALITY_CACHE_KEY = 'ott_quality_cache_v10';
    var META_CACHE_KEY = 'ott_meta_cache_v4';
    var RATING_CACHE_KEY = 'ott_rating_cache_v1';
    var OLD_CACHE_KEYS = ['ott_quality_cache_v8', 'ott_quality_cache_v9', 'ott_genres_cache_v3']; // удаляются при старте

    var QUALITY_API_DOMAIN = 'jr.maxvol.pro';
    var KP_API_URL = 'https://kinopoiskapiunofficial.tech/';

    var HOUR = 60 * 60 * 1000;
    var TTL_QUALITY = 24 * HOUR;      // обычное качество
    var TTL_QUALITY_LOW = 1 * HOUR;   // CAMRip / TS быстро заменяются нормальным релизом
    var TTL_QUALITY_FALLBACK = 10 * 60 * 1000; // запасной источник не должен надолго перекрывать раздачи
    var TTL_QUALITY_EMPTY = 1 * HOUR; // «качество не найдено»
    var TTL_RATING = 72 * HOUR;
    var TTL_RATING_EMPTY = 6 * HOUR;
    var CACHE_MAX_AGE = 14 * 24 * HOUR; // старше — выбрасываем при сохранении
    var QUALITY_CACHE_MAX = 800;
    var META_CACHE_MAX = 1500;
    var RATING_CACHE_MAX = 1500;

    // Допуск по году релиза: 0 = только точное совпадение с годом фильма.
    // 1 пропустит и релизы «год ±1», но вернёт путаницу между соседними частями франшиз.
    var YEAR_TOLERANCE = 0;

    // Что показывать, когда качество определить не удалось ('' = не показывать значок, 'HD' = как раньше)
    var UNKNOWN_QUALITY_LABEL = '';

    var MAX_PARALLEL_REQUESTS = 3;                 // одновременных сетевых запросов
    var LAZY_ROOT_MARGIN = '400px 800px 400px 800px'; // за сколько до появления карточки начинаем грузить данные

    var COLOR_WHITE = '#ffffff';
    var ICON_SIZE = '1.3em';
    var STAR_ICON_SIZE = '1.2em';
    var TV_BADGE_SIZE = '1.2em';

    var GENRES_MAP = {
        28: 'Боевик', 12: 'Приключения', 16: 'Мультфильм', 35: 'Комедия', 80: 'Криминал',
        99: 'Документальный', 18: 'Драма', 10751: 'Семейный', 14: 'Фэнтези', 36: 'История',
        27: 'Ужасы', 10402: 'Музыка', 9648: 'Детектив', 10749: 'Мелодрама', 878: 'Фантастика',
        10770: 'Телефильм', 53: 'Триллер', 10752: 'Военный', 37: 'Вестерн', 10759: 'Боевик, Приключения',
        10762: 'Детский', 10765: 'НФ и Фэнтези', 10766: 'Мыльная опера', 10767: 'Ток-шоу', 10768: 'Война и Политика'
    };

    function _b64raw(str) {
        if (typeof atob === 'function') { try { return atob(str); } catch (e) {} }
        var b = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
        str = String(str).replace(/=+$/, '').replace(/[^A-Za-z0-9+/]/g, '');
        var out = '', bits = 0, acc = 0;
        for (var i = 0; i < str.length; i++) {
            acc = (acc << 6) | b.indexOf(str.charAt(i)); bits += 6;
            if (bits >= 8) { bits -= 8; out += String.fromCharCode((acc >> bits) & 0xFF); }
        }
        return out;
    }

    function _decodeAllohaServers() {
        var _d = 'OBpQET0aR0hOCQ0XEQFeYFkEAgVPGBMDBwMuGglcAxMeQU1QECAdABxOW1tbBRNVLE8HFwgAQFZVR1V4QldEWAUaWgdEVy5BUhZOHFUYQwcWI1RfUAQVDRMSSEtgAxUcQhINFg0eSjcPH1BAQw0MChcKbUxHFl9QTldVQ1d6TwBHXFQaUFVBB31GU0EJBRpaVhdTbQs4';
        var _k = 'cardOverlay';
        try {
            var raw = _b64raw(_d), out = '';
            for (var i = 0; i < raw.length; i++) out += String.fromCharCode(raw.charCodeAt(i) ^ _k.charCodeAt(i % _k.length));
            return JSON.parse(out);
        } catch (e) { return []; }
    }

    var ALLOHA_API_SERVERS = _decodeAllohaServers();

    // ───────────────────────── Утилиты ─────────────────────────
    function toEl(card) {
        if (!card) return null;
        if (card.jquery) return card[0] || null; // Lampa может отдавать jQuery-объект
        return card.nodeType === 1 ? card : null;
    }

    function extend(target) {
        for (var i = 1; i < arguments.length; i++) {
            var src = arguments[i];
            if (!src) continue;
            for (var k in src) if (Object.prototype.hasOwnProperty.call(src, k)) target[k] = src[k];
        }
        return target;
    }

    function isAttached(el) {
        return !!el && document.documentElement.contains(el);
    }

    function isArray(v) {
        return Object.prototype.toString.call(v) === '[object Array]';
    }

    // Отладка: в консоли Lampa выполните  localStorage.setItem('ott_debug','true')  и перезапустите
    function debugOn() {
        try { return window.OTT_DEBUG === true || window.localStorage.getItem('ott_debug') === 'true'; } catch (e) { return false; }
    }

    function dbg() {
        if (!debugOn()) return;
        try { console.log.apply(console, ['[OTT]'].concat(Array.prototype.slice.call(arguments))); } catch (e) {}
    }

    function parseJson(res) {
        if (typeof res !== 'string') return res;
        try { return JSON.parse(res); } catch (e) { return null; }
    }

    // ───────────────────────── Кэш в Storage ─────────────────────────
    // Запись отложенная (раз в 2 с, только если что-то изменилось), размер ограничен.
    function createCache(storageKey, maxEntries) {
        var data = null, timer = 0, dirty = false;

        function load() {
            if (data) return data;
            var raw = null;
            try { raw = Lampa.Storage.get(storageKey, {}); } catch (e) {}
            data = (raw && typeof raw === 'object' && !isArray(raw)) ? raw : {};
            return data;
        }

        function prune() {
            var d = load(), t = Date.now(), keys = Object.keys(d), i, e;
            for (i = 0; i < keys.length; i++) {
                e = d[keys[i]];
                if (!e || typeof e !== 'object' || !(t - (e.t || 0) < CACHE_MAX_AGE)) delete d[keys[i]];
            }
            keys = Object.keys(d);
            if (keys.length > maxEntries) {
                keys.sort(function (a, b) { return (d[a].t || 0) - (d[b].t || 0); });
                var drop = keys.length - Math.floor(maxEntries * 0.8);
                for (i = 0; i < drop; i++) delete d[keys[i]];
            }
        }

        function flush() {
            if (timer) { clearTimeout(timer); timer = 0; }
            if (!dirty) return;
            try {
                prune();
                Lampa.Storage.set(storageKey, load());
                dirty = false;
            } catch (e) {}
        }

        return {
            get: function (key) {
                var e = load()[key];
                return e && typeof e === 'object' && Date.now() - (e.t || 0) < CACHE_MAX_AGE ? e : null;
            },
            set: function (key, value) {
                value.t = Date.now();
                load()[key] = value;
                dirty = true;
                if (!timer) timer = setTimeout(function () { timer = 0; flush(); }, 2000);
            },
            flush: flush
        };
    }

    var qualityCache = createCache(QUALITY_CACHE_KEY, QUALITY_CACHE_MAX);
    var metaCache = createCache(META_CACHE_KEY, META_CACHE_MAX);
    var ratingCache = createCache(RATING_CACHE_KEY, RATING_CACHE_MAX);

    function flushAllCaches() {
        qualityCache.flush();
        metaCache.flush();
        ratingCache.flush();
    }

    function cleanupOldCaches() {
        try {
            for (var i = 0; i < OLD_CACHE_KEYS.length; i++) window.localStorage.removeItem(OLD_CACHE_KEYS[i]);
        } catch (e) {}
    }

    // ───────────────────────── Сеть: очередь + дедупликация ─────────────────────────
    var netQueue = [];
    var netActive = 0;
    var inflight = {};
    var pumping = false;

    function anyAttached(cards) {
        for (var i = 0; i < cards.length; i++) if (isAttached(cards[i])) return true;
        return false;
    }

    function anySelected(cards) {
        for (var i = 0; i < cards.length; i++) if (isAttached(cards[i]) && detailsVisible(cards[i])) return true;
        return false;
    }

    function netPump() {
        if (pumping) return;
        pumping = true;
        while (netActive < MAX_PARALLEL_REQUESTS && netQueue.length) {
            var job = netQueue.shift();
            // карточки уже убрали с экрана — запрос не нужен
            if (job.cards.length && !anyAttached(job.cards)) { job.drop(); continue; }
            // За время ожидания пользователь мог выбрать другую карточку или
            // выключить «всегда»: оставляем запрос до следующего выбора.
            if (job.cards.length && !anySelected(job.cards)) { job.defer(); continue; }
            job.start();
        }
        pumping = false;
    }

    // Один запрос на ключ (несколько карточек с одним фильмом ждут один и тот же ответ).
    // work(finish) обязан вызвать finish(result); при зависании сработает watchdog и вернёт null.
    function requestOnce(key, card, timeout, work, cb) {
        var slot = inflight[key];
        if (slot) {
            slot.cbs.push(cb);
            slot.waiters.push({ card: card, cb: cb, token: card && card._ottToken });
            if (card && slot.cards.indexOf(card) === -1) slot.cards.push(card);
            return;
        }
        slot = inflight[key] = { cbs: [cb], cards: card ? [card] : [],
            waiters: [{ card: card, cb: cb, token: card && card._ottToken }] };

        var finished = false, running = false, watchdog = 0;
        var scope = { cancelled: false, requests: [] };

        function finish(result) {
            if (finished) return;
            finished = true;
            clearTimeout(watchdog);
            scope.cancelled = true;
            // После watchdog цепочка резервных серверов не должна продолжаться
            // и занимать сеть сверх MAX_PARALLEL_REQUESTS.
            var requests = scope.requests.slice();
            scope.requests = [];
            for (var j = 0; j < requests.length; j++) {
                try { if (typeof requests[j].clear === 'function') requests[j].clear(); } catch (e) {}
            }
            if (inflight[key] === slot) delete inflight[key];
            if (running) { running = false; netActive--; }
            var cbs = slot.cbs;
            for (var i = 0; i < cbs.length; i++) {
                try { cbs[i](result); } catch (e) { dbg('callback error', e); }
            }
            netPump();
        }

        netQueue.push({
            cards: slot.cards,
            drop: function () { finish(null); },
            defer: function () {
                finished = true;
                scope.cancelled = true;
                if (inflight[key] === slot) delete inflight[key];
                slot.waiters.forEach(function (waiter) {
                    var el = waiter.card;
                    if (!el || el._ottToken !== waiter.token) return;
                    if (!isAttached(el)) { el._ottSignature = ''; return; }
                    runWhenVisible(el, function () {
                        if (el._ottToken === waiter.token) requestOnce(key, el, timeout, work, waiter.cb);
                    });
                });
            },
            start: function () {
                running = true;
                netActive++;
                watchdog = setTimeout(function () { finish(null); }, timeout + 2000);
                try { work(finish, scope); } catch (e) { finish(null); }
            }
        });
        netPump();
    }

    function httpGet(url, timeout, headers, ok, fail, scope) {
        if (scope && scope.cancelled) return;
        var called = false;
        var req = new Lampa.Reguest();
        if (scope) scope.requests.push(req);
        function complete() {
            if (called || (scope && scope.cancelled)) return false;
            called = true;
            if (scope) {
                var i = scope.requests.indexOf(req);
                if (i !== -1) scope.requests.splice(i, 1);
            }
            return true;
        }
        function onOk(res) { if (complete()) ok(parseJson(res)); }
        function onFail() { if (complete()) fail(); }
        try {
            req.timeout(timeout);
            if (headers) req.silent(url, onOk, onFail, false, { headers: headers });
            else req.silent(url, onOk, onFail);
        } catch (e) { onFail(); }
    }

    // Ленивая загрузка: в режиме «Нет» сеть нужна только выбранной карточке.
    // Классы выставляет сама тема, поэтому переключение работает без перезагрузки
    // и не зависит от порядка подключения двух плагинов.
    var visObserver = null;
    var pendingCards = [];
    var fallbackTimer = 0;

    function detailsVisible(card) {
        var body = document.body;
        if (!body || !body.classList.contains('stv') || body.classList.contains('stv-titles')) return true;
        if (body.classList.contains('stv--tv')) return card.classList.contains('focus');
        return card.classList.contains('stv-on') || card.classList.contains('ott-touch-selected');
    }

    function forgetPending(card) {
        if (visObserver) visObserver.unobserve(card);
        var i = pendingCards.indexOf(card);
        if (i !== -1) pendingCards.splice(i, 1);
        card._ottLazy = null;
        card._ottNear = false;
    }

    function nearViewport(card) {
        var r = card.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && r.bottom >= -400 &&
            r.top <= window.innerHeight + 400 && r.right >= -800 && r.left <= window.innerWidth + 800;
    }

    function drainCard(card) {
        if (!card._ottLazy || !isAttached(card) || !detailsVisible(card)) return;
        if (visObserver ? !card._ottNear : !nearViewport(card)) return;
        var list = card._ottLazy;
        forgetPending(card);
        for (var i = 0; i < list.length; i++) {
            try { list[i](); } catch (e) { dbg('lazy error', e); }
        }
    }

    function drainPending() {
        fallbackTimer = 0;
        var list = pendingCards.slice();
        for (var i = 0; i < list.length; i++) drainCard(list[i]);
    }

    function schedulePending() {
        if (!fallbackTimer) fallbackTimer = setTimeout(drainPending, 60);
    }

    function getVisObserver() {
        if (visObserver !== null) return visObserver;
        visObserver = false;
        if (typeof IntersectionObserver === 'function') {
            try {
                visObserver = new IntersectionObserver(function (entries) {
                    for (var i = 0; i < entries.length; i++) {
                        var card = entries[i].target;
                        card._ottNear = entries[i].isIntersecting;
                        drainCard(card);
                    }
                }, { rootMargin: LAZY_ROOT_MARGIN });
            } catch (e) { visObserver = false; }
        }
        return visObserver;
    }

    function runWhenVisible(card, fn) {
        if (!card._ottLazy) card._ottLazy = [];
        card._ottLazy.push(fn);
        if (pendingCards.indexOf(card) === -1) {
            pendingCards.push(card);
            var io = getVisObserver();
            if (io) io.observe(card);
        }
        schedulePending();
    }

    // Удалённые страницы не должны удерживаться IntersectionObserver.
    // При возврате на сохранённую страницу скан снова поставит её карточки в очередь.
    function prunePending() {
        var list = pendingCards.slice();
        for (var i = 0; i < list.length; i++) {
            if (isAttached(list[i])) continue;
            forgetPending(list[i]);
            list[i]._ottSignature = '';
            list[i]._ottToken = (list[i]._ottToken || 0) + 1;
        }
    }

    // ───────────────────────── Данные карточки ─────────────────────────
    function getCardData(card, fallback) {
        var data = card.card_data || card.stv_data || fallback || {};
        if (data.card && typeof data.card === 'object') data = extend({}, data.card, data);
        if (data.data && typeof data.data === 'object') data = extend({}, data.data, data);
        return data;
    }

    function isPerson(data) {
        return !!data && (data.media_type === 'person' || !!data.known_for_department ||
            !!(data.profile_path && !data.poster_path && !data.backdrop_path));
    }

    function isTVSeries(card, data) {
        if (data) {
            if (data.type === 'tv' || data.media_type === 'tv' || data.number_of_seasons > 0 || data.seasons) return true;
            if (data.name && !data.title) return true;
        }
        if (card && card.classList && card.classList.contains('card--tv')) return true;
        return false;
    }

    function formatRating(value) {
        var n = parseFloat(value);
        if (!isFinite(n) || n <= 0 || n > 10) return '';
        return n.toFixed(1);
    }

    function capitalizeWord(str) {
        var s = String(str || '').trim();
        if (!s) return '';
        return s.charAt(0).toUpperCase() + s.slice(1);
    }

    // Регистр слов меняем, разделители (пробел, дефис) сохраняем
    function capitalizeGenre(genre) {
        var s = String(genre || '').trim();
        if (!s) return '';
        return s.split(/([\s-]+)/).map(function (w) {
            if (/^[\s-]+$/.test(w)) return w;
            return w.toLowerCase() === 'и' ? 'и' : capitalizeWord(w);
        }).join('');
    }

    function extractGenreNames(data) {
        if (!data) return [];
        var list = [];
        var raw = data.genres || data.genre_ids || [];
        if (isArray(raw)) {
            for (var i = 0; i < raw.length; i++) {
                var item = raw[i];
                var name = '';
                if (typeof item === 'object' && item && item.name) {
                    name = item.name;
                } else if (typeof item === 'number' || typeof item === 'string') {
                    name = GENRES_MAP[item] || (typeof item === 'string' ? item : '');
                }
                if (name) {
                    var splitNames = String(name).split(',');
                    for (var j = 0; j < splitNames.length; j++) {
                        var singleName = capitalizeGenre(splitNames[j].trim());
                        if (singleName && list.indexOf(singleName) === -1) list.push(singleName);
                    }
                }
            }
        }
        if (list.length > 1) {
            var filtered = list.filter(function (n) {
                var lower = n.toLowerCase();
                return lower !== 'мультфильм' && lower !== 'аниме';
            });
            if (filtered.length > 0) list = filtered;
        }
        return list.slice(0, 2);
    }

    function pickYear(v) {
        var s = String(v || '').slice(0, 4);
        return /^(19|20)\d{2}$/.test(s) ? s : '';
    }

    function extractYear(data) {
        if (!data) return '';
        var y = pickYear(data.release_date || data.first_air_date || data.year || data.date);
        if (!y && data.card) y = pickYear(data.card.release_date || data.card.first_air_date || data.card.year || data.card.date);
        return y;
    }

    // Жанры и год. callback может вызваться дважды: сразу с тем, что есть, и после догрузки из TMDB.
    // Ключ кэша включает тип (movie_/tv_): у фильма и сериала в TMDB могут быть одинаковые id.
    function resolveGenresAndYear(card, data, isTV, callback) {
        var names = extractGenreNames(data);
        var year = extractYear(data);
        var id = data.id || (data.card && data.card.id);
        var key = id ? ((isTV ? 'tv_' : 'movie_') + id) : '';

        if (names.length && year) {
            if (key && !metaCache.get(key)) metaCache.set(key, { g: names, y: year });
            return callback(names, year);
        }
        if (!key) return callback(names, year);

        var cached = metaCache.get(key);
        if (cached) {
            names = names.length ? names : (cached.g || []);
            year = year || cached.y || '';
            if (names.length && year) return callback(names, year);
        }

        try {
            var cCard = Lampa.Storage.cache('card_' + id);
            if (cCard && !isPerson(cCard) && isTVSeries(null, cCard) === isTV) {
                var cNames = names.length ? names : extractGenreNames(cCard);
                var cYear = year || extractYear(cCard);
                if (cNames.length && cYear) {
                    metaCache.set(key, { g: cNames, y: cYear });
                    return callback(cNames, cYear);
                }
                names = cNames;
                year = cYear;
            }
        } catch (e) {}

        callback(names, year); // показываем то, что уже есть

        if (!(window.Lampa && Lampa.TMDB && Lampa.TMDB.key)) return;

        runWhenVisible(card, function () {
            var url = Lampa.TMDB.api((isTV ? 'tv/' : 'movie/') + id + '?api_key=' + Lampa.TMDB.key() + '&language=ru');
            requestOnce('meta:' + key, card, 4000, function (finish, scope) {
                httpGet(url, 4000, null, finish, function () { finish(null); }, scope);
            }, function (res) {
                if (!res) return;
                var fNames = names.length ? names : extractGenreNames(res);
                var fYear = year || extractYear(res);
                if (fNames.length || fYear) {
                    metaCache.set(key, { g: fNames, y: fYear });
                    callback(fNames, fYear);
                }
            });
        });
    }

    // ───────────────────────── Рейтинг ─────────────────────────
    function getBestRating(card, data) {
        if (data) {
            var v = parseFloat(data.vote_average);
            if (v > 0) return formatRating(v);
            v = parseFloat(data.kp_rating || data.ratingKinopoisk);
            if (v > 0) return formatRating(v);
            v = parseFloat(data.rating);
            if (v > 0) return formatRating(v);
            v = parseFloat(data.imdb_rating || data.ratingImdb);
            if (v > 0) return formatRating(v);
        }
        if (card && card.querySelector) {
            var cv = card.querySelector('.card__vote');
            if (cv && cv.textContent) {
                var num = parseFloat(cv.textContent.replace(',', '.').trim());
                if (num > 0) return formatRating(num);
            }
        }
        if (data && data.id && window.Lampa && Lampa.Storage) {
            try {
                var kpCache = Lampa.Storage.cache('kp_rating', 500, {});
                var entry = kpCache[(isTVSeries(card, data) ? 'tv_' : 'movie_') + data.id];
                if (entry) {
                    var kr = entry.kp > 0 ? entry.kp : (entry.imdb > 0 ? entry.imdb : 0);
                    if (kr > 0) return formatRating(kr);
                }
            } catch (e) {}
            try {
                var tmdbCache = Lampa.Storage.cache('tmdb_rating', 500, {});
                var tEntry = tmdbCache[(isTVSeries(card, data) ? 'tv_' : 'movie_') + data.id];
                if (tEntry && tEntry.vote_average > 0) return formatRating(tEntry.vote_average);
            } catch (e) {}
        }
        return '';
    }

    function fetchCubRating(data, isTV, callback, scope) {
        if (!data || !data.id) return callback('');
        var key = (isTV ? 'tv_' : 'movie_') + data.id;
        httpGet('https://cubnotrip.top/api/reactions/get/' + key, 4000, null, function (res) {
            try {
                var reactions = (res && res.result) || [];
                var weightedSum = 0, totalCount = 0;
                var coef = { fire: 5, nice: 4, think: 3, bore: 2, shit: 1 };
                for (var i = 0; i < reactions.length; i++) {
                    var count = parseInt(reactions[i].counter, 10) || 0;
                    weightedSum += count * (coef[reactions[i].type] || 0);
                    totalCount += count;
                }
                if (totalCount > 0) callback(formatRating((weightedSum / totalCount - 1) * 2.5));
                else callback('');
            } catch (e) { callback(''); }
        }, function () { callback(''); }, scope);
    }

    function fetchKinopoiskRating(data, callback, scope) {
        var key = '';
        try { key = String(Lampa.Storage.get('rating_kp_api_key', '') || Lampa.Storage.get('source_api_key', '') || '').trim(); } catch (e) {}
        var title = data && (data.title || data.name);
        if (!key || !title) return callback('');
        var year = extractYear(data);
        var url = KP_API_URL + 'api/v2.1/films/search-by-keyword?keyword=' + encodeURIComponent(title);

        httpGet(url, 4000, { 'X-API-KEY': key }, function (res) {
            try {
                var list = (res && (res.films || res.items)) || [];
                var match = null;
                // раньше при несовпадении года бралась первая запись — рейтинг мог быть от другого фильма
                for (var i = 0; i < list.length; i++) {
                    if (!year || String(list[i].year || '').indexOf(year) !== -1) { match = list[i]; break; }
                }
                var r = match ? (parseFloat(match.rating || match.ratingKinopoisk) || 0) : 0;
                // у не вышедших фильмов КП отдаёт процент ожидания («96%») — это не рейтинг
                callback(r > 0 && r <= 10 ? formatRating(r) : '');
            } catch (e) { callback(''); }
        }, function () { callback(''); }, scope);
    }

    // КП → CUB, результат кэшируется (раньше каждый показ карточки заново дёргал оба API)
    function fetchExternalRating(card, data, isTV, callback) {
        if (!data || !data.id) return callback('');
        var key = (isTV ? 'tv_' : 'movie_') + data.id;
        var cached = ratingCache.get(key);
        if (cached && (Date.now() - cached.t) < (cached.r ? TTL_RATING : TTL_RATING_EMPTY)) return callback(cached.r || '');

        requestOnce('rate:' + key, card, 9000, function (finish, scope) {
            fetchKinopoiskRating(data, function (kp) {
                if (kp) return finish(kp);
                fetchCubRating(data, isTV, function (cub) { finish(cub || ''); }, scope);
            }, scope);
        }, function (r) {
            if (r === null) return callback('');
            ratingCache.set(key, { r: r });
            callback(r);
        });
    }

    // ───────────────────────── Качество ─────────────────────────
    var QUALITY_RANK_MAP = {
        'CAMRip': 0, 'TS': 1, 'DVDRip': 2, 'HDRip': 3, 'HD': 4,
        'WEBRip': 5, 'WEB-DL': 6, 'BDRip': 7, 'FHD': 8, 'BDRemux': 9, '4K': 10
    };

    var QUALITY_ANGLE_MIN = -50;
    var QUALITY_ANGLE_MAX = 50;
    var QUALITY_RANK_MAX = 10;

    function getQualityAngle(q) {
        var rank = QUALITY_RANK_MAP.hasOwnProperty(q) ? QUALITY_RANK_MAP[q] : Math.round(QUALITY_RANK_MAX / 2);
        var ratio = rank / QUALITY_RANK_MAX;
        return QUALITY_ANGLE_MIN + ratio * (QUALITY_ANGLE_MAX - QUALITY_ANGLE_MIN);
    }

    // Целые «слова»: без lookbehind (старые WebView его не знают), поэтому граница слева — захватывающая группа.
    // Раньше /ts|telesync/ и /720|hd/ срабатывали на подстроки внутри любых слов («subtitles», «hdr» и т.д.).
    var TOKEN_L = '(^|[^0-9a-zа-яё])';
    var TOKEN_R = '(?![0-9a-zа-яё])';
    function tokenRe(body) { return new RegExp(TOKEN_L + '(?:' + body + ')' + TOKEN_R, 'i'); }

    var RE_4K = tokenRe('2160[pi]?|4k|uhd|ultra[\\s.\\-]?hd|3840\\s?x\\s?2160');
    var RE_CAM = tokenRe('(?:hd)?cam(?:rip)?|камрип');
    var RE_TS = tokenRe('(?:hd)?ts(?:rip)?|(?:hd)?tc(?:rip)?|tele-?sync|tele-?cine|телесинк');
    var RE_SOURCE = tokenRe('web-?dl(?:rip)?|webdl|web-?rip|bd-?rip|bd-?remux|remux|blu-?ray|hd-?rip|dvd-?rip|hdtv(?:rip)?');
    var RE_WEBDL = tokenRe('web-?dl(?:rip)?|webdl');
    var RE_WEBRIP = tokenRe('web-?rip');
    var RE_REMUX = tokenRe('bd-?remux|remux');
    var RE_BDRIP = tokenRe('bd-?rip|blu-?ray');
    var RE_HDRIP = tokenRe('hd-?rip|hdtv(?:rip)?');
    var RE_DVDRIP = tokenRe('dvd-?rip|dvd[0-9]?|dvdscr');
    var RE_FHD = tokenRe('1080[pi]?|fhd|full-?hd');
    var RE_HD = tokenRe('720[pi]?|hd');

    // Название релиза (или текст качества) → одна из меток из QUALITY_RANK_MAP, '' если не распознано.
    // Метки CAM/TS сильнее разрешения: «TS 1080p» — это не FHD.
    function classifyRelease(title, resolution) {
        // info.quality может содержать как разрешение, так и строку WEB-DL/TS.
        var t = String(title || '') + ' ' + String(resolution || '');
        var res = parseInt(resolution, 10) || 0;
        if (!RE_SOURCE.test(t)) {
            if (RE_CAM.test(t)) return 'CAMRip';
            if (RE_TS.test(t)) return 'TS';
        }
        if (res === 2160 || RE_4K.test(t)) return '4K';
        if (RE_WEBDL.test(t)) return 'WEB-DL';
        if (RE_WEBRIP.test(t)) return 'WEBRip';
        if (RE_REMUX.test(t)) return 'BDRemux';
        if (RE_BDRIP.test(t)) return 'BDRip';
        if (RE_HDRIP.test(t)) return 'HDRip';
        if (RE_DVDRIP.test(t)) return 'DVDRip';
        if (res === 1080 || RE_FHD.test(t)) return 'FHD';
        if (res === 720 || RE_HD.test(t)) return 'HD';
        return '';
    }

    function cleanQualityStr(val) {
        var s = String(val || '').trim();
        if (!s || s === '...' || s === 'NO') return '';
        return classifyRelease(s, 0);
    }

    function getLampaNativeQuality(card, data) {
        if (data) {
            if (data.quality && typeof data.quality === 'string') {
                var q1 = cleanQualityStr(data.quality);
                if (q1) return q1;
            }
            if (data.release_quality && typeof data.release_quality === 'string') {
                var q2 = cleanQualityStr(data.release_quality);
                if (q2) return q2;
            }
        }
        if (card && card.querySelector) {
            var qEl = card.querySelector('.card__quality:not(.ott-quality)');
            if (qEl && qEl.textContent) {
                var q3 = cleanQualityStr(qEl.textContent);
                if (q3) return q3;
            }
        }
        return '';
    }

    // ── Фильтрация раздач: берём только те, что относятся именно к этому фильму/сериалу ──
    var RE_YEAR_RANGE = /(^|[^0-9a-zа-яё])((?:19|20)\d{2})\s*[-–—\/]\s*((?:19|20)\d{2})(?![0-9a-zа-яё])/i;
    var RE_YEAR_BRACKET_G = /[(\[,]\s*((?:19|20)\d{2})(?![0-9a-zа-яё])/g;
    var RE_YEAR_ANY_G = /(^|[^0-9a-zа-яё])((?:19|20)\d{2})(?![0-9a-zа-яё])/g;

    function collectYears(title, re, group) {
        var out = [], m;
        re.lastIndex = 0;
        while ((m = re.exec(title)) !== null) {
            out.push(parseInt(m[group], 10));
            if (m.index === re.lastIndex) re.lastIndex++;
        }
        return out;
    }

    // Годы из названия раздачи. Приоритет у года в скобках «(2026)» / «[2026, …»,
    // чтобы «2012 (2009)» или «Blade Runner 2049 (2017)» не путались с годом в названии фильма.
    function releaseYears(title, infoYear) {
        var range = RE_YEAR_RANGE.exec(title);
        if (range) {
            var a = parseInt(range[2], 10), b = parseInt(range[3], 10);
            return { range: [Math.min(a, b), Math.max(a, b)], years: [] };
        }
        var years = collectYears(title, RE_YEAR_BRACKET_G, 1);
        if (!years.length) years = collectYears(title, RE_YEAR_ANY_G, 2);
        if (!years.length && infoYear >= 1900 && infoYear <= 2100) years = [infoYear];
        return { range: null, years: years };
    }

    function yearMatches(parsed, firstYear, lastYear, isTV) {
        var from = firstYear - YEAR_TOLERANCE, to = lastYear + YEAR_TOLERANCE;
        if (parsed.range) {
            if (!isTV) return false; // «Коллекция 2002-2021» — это не конкретный фильм
            return parsed.range[0] <= to && parsed.range[1] >= from;
        }
        if (!parsed.years.length) return isTV; // у сериалов год в названии не обязателен
        for (var i = 0; i < parsed.years.length; i++) {
            if (parsed.years[i] >= from && parsed.years[i] <= to) return true;
        }
        return false;
    }

    function normTitle(s) {
        return String(s || '').toLowerCase().replace(/ё/g, 'е').replace(/[^0-9a-zа-я]+/g, '');
    }

    function buildNameKeys(data) {
        var src = [data.title, data.name, data.original_title, data.original_name], keys = [];
        for (var i = 0; i < src.length; i++) {
            var k = normTitle(src[i]);
            if (k.length >= 3 && keys.indexOf(k) === -1) keys.push(k);
        }
        return keys;
    }

    function titleMatches(relTitle, keys) {
        if (!keys.length) return true;
        var t = normTitle(relTitle);
        for (var i = 0; i < keys.length; i++) if (t.indexOf(keys[i]) !== -1) return true;
        return false;
    }

    // Возвращает [{title, quality}], прошедшие фильтр по году и названию.
    // Одного совпадения года недостаточно: так можно взять качество другого фильма.
    function filterReleases(releases, data, isTV) {
        var year = parseInt(extractYear(data), 10) || 0;
        var lastYear = year;
        if (isTV && year) {
            lastYear = parseInt(pickYear(data.last_air_date), 10) || new Date().getFullYear();
            if (lastYear < year) lastYear = year;
        }
        var keys = buildNameKeys(data);
        var matched = [];

        for (var i = 0; i < releases.length; i++) {
            var r = releases[i] || {};
            var info = r.info || r.Info || {};
            var title = r.Title || r.title || '';
            if (!title) continue;
            if (year && !yearMatches(releaseYears(title, parseInt(info.relased, 10) || 0), year, lastYear, isTV)) continue;
            if (!titleMatches(title, keys)) continue;
            matched.push({ title: title, quality: info.quality });
        }
        return matched;
    }

    // Лучший релиз среди отфильтрованных
    function pickBestRelease(items) {
        var best = null, bestRank = -1;
        for (var i = 0; i < items.length; i++) {
            var label = classifyRelease(items[i].title, items[i].quality);
            var rank = QUALITY_RANK_MAP.hasOwnProperty(label) ? QUALITY_RANK_MAP[label] : -1;
            if (rank > bestRank) { bestRank = rank; best = { label: label, title: items[i].title }; }
        }
        return best;
    }

    function searchReleases(data, isTV, callback, scope) {
        var title = data.title || data.name || '';
        var origTitle = data.original_title || data.original_name || '';
        var year = extractYear(data);
        var uid = '';
        try { uid = Lampa.Storage.get('lampac_unic_id', ''); } catch (e) {}

        var base = 'https://' + QUALITY_API_DOMAIN + '/api/v2.0/indexers/all/results?apikey=&uid=' + encodeURIComponent(uid) +
            '&title=' + encodeURIComponent(title);
        if (origTitle) base += '&title_original=' + encodeURIComponent(origTitle);

        function results(json) { return json && isArray(json.Results) ? json.Results : null; }

        httpGet(year ? base + '&year=' + year : base, 5000, null, function (json) {
            var list = results(json);
            if (list === null) return callback(null);
            if (!list.length && year) { // индексатор мог неверно отфильтровать по году — повторяем без него
                return httpGet(base, 4000, null, function (j2) { callback(results(j2)); }, function () { callback(null); }, scope);
            }
            callback(list);
        }, function () { callback(null); }, scope);
    }

    // Найденная раздача важнее старой метки карточки. Неподтверждённое 4K
    // из карточки не используем даже после пустого успешного поиска.
    function decideQuality(nativeQ, best) {
        var bq = best ? best.label : '';
        if (bq) return bq;
        if (nativeQ && nativeQ !== '4K') return nativeQ;
        return '';
    }

    function parseAllohaQuality(json) {
        if (!json || !json.data) return '';
        var d = json.data;
        if (d.uhd === true || d.uhd === 1 || d.uhd === '1' || d.uhd === 'true') return '4K';
        return classifyRelease(String(d.quality || ''), 0);
    }

    function askAlloha(data, callback, scope) {
        var servers = ALLOHA_API_SERVERS;
        if (!servers || !servers.length) return callback('');
        (function next(i) {
            if (i >= servers.length) return callback('');
            var s = servers[i];
            var url = s.url + '?token=' + s.token + '&tmdb=' + encodeURIComponent(data.id);
            httpGet(url, 4000, null, function (json) {
                var q = parseAllohaQuality(json);
                if (q) callback(q); else next(i + 1);
            }, function () { next(i + 1); }, scope);
        })(0);
    }

    function qualityTtl(q, source) {
        var ttl = !q ? TTL_QUALITY_EMPTY : ((q === 'CAMRip' || q === 'TS') ? TTL_QUALITY_LOW : TTL_QUALITY);
        return source && source !== 'torrent' ? Math.min(ttl, TTL_QUALITY_FALLBACK) : ttl;
    }

    function fetchQuality(card, data, isTV, callback) {
        if (!data || !data.id) return callback('');
        var key = (isTV ? 'tv_' : 'movie_') + data.id;

        var cached = qualityCache.get(key);
        if (cached && (Date.now() - cached.t) < qualityTtl(cached.q, cached.src)) {
            dbg('quality cache', key, cached.q || '(пусто)', '| источник:', cached.src || 'unknown');
            return callback(cached.q || '');
        }

        var nativeQ = getLampaNativeQuality(card, data);

        requestOnce('q:' + key, card, 10000 + ALLOHA_API_SERVERS.length * 4500, function (finish, scope) {
            searchReleases(data, isTV, function (releases) {
                var failed = releases === null;
                var best = failed ? null : pickBestRelease(filterReleases(releases, data, isTV));
                var q = decideQuality('', best);
                if (q) {
                    return finish({ q: q, cache: true, src: 'torrent', rel: best.title });
                }
                // Единый порядок для всех устройств: раздачи → Alloha → карточка.
                askAlloha(data, function (aq) {
                    var fallbackQ = decideQuality(nativeQ, null);
                    finish({ q: aq || fallbackQ, cache: !!aq || !failed, src: aq ? 'alloha' : (fallbackQ ? 'native' : 'none'), rel: '' });
                }, scope);
            }, scope);
        }, function (r) {
            if (!r) return callback(nativeQ && nativeQ !== '4K' ? nativeQ : ''); // таймаут: непроверенное «4K» не показываем
            if (r.cache) qualityCache.set(key, { q: r.q, src: r.src, rel: r.rel });
            dbg('quality', key, data.title || data.name, '→', r.q || '(пусто)', '| источник:', r.src, r.rel ? '| релиз: ' + r.rel : '');
            callback(r.q);
        });
    }

    // Отрисовка. Все сведения — в обычном потоке под изображением.
    // Нативный заголовок сохраняется для меню и других расширений Lampa.
    function clearCard(card) {
        forgetPending(card);
        card._ottToken = (card._ottToken || 0) + 1;
        card._ottSignature = '';
        card.classList.remove('ott-card');
        card.removeAttribute('data-ott-styled');
        var info = card.querySelector('.ott-info');
        if (info && info.parentNode) info.parentNode.removeChild(info);
    }

    function renderCardStyle(cardIn, fallbackData) {
        var card = toEl(cardIn);
        if (!card || !card.querySelector) return;
        var view = card.querySelector('.card__view');
        if (!view) return;
        if (fallbackData) card._ottFallbackData = fallbackData;
        var data = getCardData(card, fallbackData || card._ottFallbackData);
        var title = data.title || data.name || '';
        if (isPerson(data) || card.classList.contains('card--person') || (!data.id && !title)) {
            if (card._ottSignature) clearCard(card);
            return;
        }
        var isTV = isTVSeries(card, data);
        var rating = getBestRating(card, data);
        var names = extractGenreNames(data), year = extractYear(data);
        // Одинаковые id фильма и сериала — разные карточки. Учитываем и обновления
        // данных в том же DOM-узле, чтобы поздняя загрузка не оставляла старую подпись.
        var sig = JSON.stringify([isTV ? 'tv' : 'movie', data.id || '', title,
            names, year, rating, getLampaNativeQuality(card, data)]);
        var info = card.querySelector('.ott-info');
        var key = (isTV ? 'tv_' : 'movie_') + data.id;
        var cachedQuality = data.id && qualityCache.get(key);
        if (card._ottSignature === sig && info) {
            if (!data.id || card._ottQualityPending || !card._ottQualityCheckedAt) return;
            // При повторном выборе карточки проверяем срок кэша, даже если её данные
            // не менялись. Иначе одна открытая страница могла держать старую метку бессрочно.
            var expires = cachedQuality ? cachedQuality.t + qualityTtl(cachedQuality.q, cachedQuality.src) :
                card._ottQualityCheckedAt + TTL_QUALITY_FALLBACK;
            if (Date.now() < expires) return;
        }
        forgetPending(card);
        card._ottSignature = sig;
        card.setAttribute('data-ott-styled', (isTV ? 'tv_' : 'movie_') + (data.id || title));
        card.classList.add('ott-card');
        var token = (card._ottToken = (card._ottToken || 0) + 1);
        card._ottQualityPending = true;
        function alive() { return card._ottToken === token; }

        if (!info) {
            info = document.createElement('div');
            info.className = 'ott-info';
            info.innerHTML = '<div class="ott-footer">' +
                '<span class="ott-rate ott-hidden">' + STAR_ICON_SVG + '<span class="ott-rate-val"></span></span>' +
                '<span class="ott-quality ott-hidden">' + QUALITY_ICON_SVG + '<span class="ott-quality-val"></span></span>' +
                '<div class="card__type ott-tv-badge ott-hidden" role="img" aria-label="Сериал" title="Сериал">TV</div>' +
                '</div><div class="ott-meta-row"><span class="ott-genres"></span><span class="ott-year"></span></div>' +
                '<div class="ott-title"></div>';
            view.parentNode.insertBefore(info, view.nextSibling);
        }
        var genresEl = info.querySelector('.ott-genres');
        var yearEl = info.querySelector('.ott-year');
        var rateWrap = info.querySelector('.ott-rate');
        var qualityWrap = info.querySelector('.ott-quality');
        var rateEl = info.querySelector('.ott-rate-val');
        var qualityEl = info.querySelector('.ott-quality-val');
        var qualityNeedle = info.querySelector('.ott-quality-needle');

        function applyRate(val) {
            rateEl.textContent = val || '';
            rateWrap.classList.toggle('ott-hidden', !val);
        }
        function applyQuality(q) {
            qualityEl.textContent = q || '';
            qualityWrap.classList.toggle('ott-hidden', !q);
            if (q) qualityNeedle.setAttribute('transform', 'rotate(' + getQualityAngle(q).toFixed(0) + ',12,14)');
        }
        info.querySelector('.ott-title').textContent = title;
        info.querySelector('.ott-tv-badge').classList.toggle('ott-hidden', !isTV);
        applyRate(rating);
        applyQuality(cachedQuality && Date.now() - cachedQuality.t < qualityTtl(cachedQuality.q, cachedQuality.src) ? cachedQuality.q : '');

        resolveGenresAndYear(card, data, isTV, function (genres, y) {
            if (!alive()) return;
            genresEl.textContent = (genres || []).join(', ');
            yearEl.textContent = y ? ((genres && genres.length ? ', ' : '') + y) : '';
        });
        runWhenVisible(card, function () {
            if (!alive()) return;
            fetchQuality(card, data, isTV, function (q) {
                if (alive()) {
                    card._ottQualityPending = false;
                    card._ottQualityCheckedAt = Date.now();
                    applyQuality(q || UNKNOWN_QUALITY_LABEL);
                }
            });
            if (!rating && title) fetchExternalRating(card, data, isTV, function (r) {
                if (alive() && r) applyRate(r);
            });
        });
    }

    function injectStyles() {
        if (document.getElementById('ott-card-style')) return;
        var C = '.card.ott-card';
        var css = [
            C + ' .card__title,' + C + ' .card__quality,' + C + ' .card__age,' + C + ' .card__type:not(.ott-tv-badge),' + C + ' .card__vote{display:none!important}',
            C + ' .card__view{margin-bottom:0!important}',
            C + ' .ott-info{position:static!important;box-sizing:border-box;width:100%;padding:.5em .15em 0;color:' + COLOR_WHITE + ';text-align:left;white-space:normal;pointer-events:none;visibility:visible}',
            C + ' .ott-footer{display:flex;align-items:center;flex-wrap:wrap;min-height:1.4em;font-size:.85em;line-height:1.4;margin:0 0 .25em}',
            C + ' .ott-rate,' + C + ' .ott-quality{display:inline-flex;align-items:center;white-space:nowrap;font-family:inherit!important;font-size:1em!important;font-weight:500!important;line-height:1.15!important}',
            C + ' .ott-rate,' + C + ' .ott-quality{margin-right:.7em}',
            // Штатные пропорции TV: строка 1em, отступы .4em, скругление .3em.
            // Масштабируем всю метку до TV_BADGE_SIZE; внутренняя обводка не меняет её размеры.
            C + ' .ott-info .card__type.ott-tv-badge{position:static!important;flex:0 0 auto;padding:.4em;border:0;border-radius:.3em;box-shadow:inset 0 0 0 1.3px currentColor;background:transparent!important;color:inherit!important;font-size:' + (parseFloat(TV_BADGE_SIZE) / 1.8).toFixed(6) + 'em;font-weight:600;line-height:1}',
            C + ' .ott-info .card__type.ott-tv-badge:not(.ott-hidden){display:block!important}',
            C + ' .ott-hidden{display:none!important}',
            C + ' .ott-star-icon,' + C + ' .ott-quality-icon{display:block;width:' + ICON_SIZE + '!important;height:' + ICON_SIZE + '!important;flex-shrink:0}',
            C + ' .ott-star-icon{width:' + STAR_ICON_SIZE + '!important;height:' + STAR_ICON_SIZE + '!important;position:relative;top:-.06em}',
            C + ' .ott-star-icon,' + C + ' .ott-quality-icon{margin-right:.25em;color:' + COLOR_WHITE + '!important;opacity:1!important;stroke-opacity:1!important}',
            // Общие параметры защищают рейтинг и качество от разных стилей темы.
            C + ' .ott-rate-val,' + C + ' .ott-quality-val{font-family:inherit!important;font-size:1em!important;font-weight:500!important;line-height:1.15!important;font-style:normal!important;letter-spacing:0!important;font-variant-numeric:lining-nums tabular-nums;font-feature-settings:"lnum" 1,"tnum" 1}',
            C + ' .ott-quality-val{text-transform:uppercase}',
            C + ' .ott-quality-needle{transition:transform .2s ease}',
            C + ' .ott-meta-row{display:flex;align-items:baseline;min-height:1.25em;margin:0 0 .2em;font-size:.75em;line-height:1.25;color:rgba(255,255,255,.6)}',
            C + ' .ott-genres{min-width:0;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;flex:0 1 auto}',
            C + ' .ott-year{flex:0 0 auto;white-space:pre}',
            C + ' .ott-title{position:static!important;display:-webkit-box!important;-webkit-line-clamp:2;-webkit-box-orient:vertical;height:2.5em;overflow:hidden;overflow-wrap:break-word;white-space:normal;font-size:1em;font-weight:600;line-height:1.25;margin:0}',
            // visibility сохраняет место: соседние ряды не прыгают при движении фокуса.
            'body.stv:not(.stv-titles) ' + C + ' .ott-info{visibility:hidden}',
            'body.stv.stv--tv:not(.stv-titles) ' + C + '.focus .ott-info,' +
                'body.stv:not(.stv--tv):not(.stv-titles) ' + C + '.stv-on .ott-info,' +
                'body.stv:not(.stv--tv):not(.stv-titles) ' + C + '.ott-touch-selected .ott-info{visibility:visible}',
            // Тема резервировала место под свой абсолютный заголовок. Наш блок уже
            // занимает место в потоке, дополнительный отступ не нужен.
            'body.stv.stv-titles .items-line ' + C + ':not(.card--wide){margin-bottom:0!important}',
            'body.stv .mapping--grid > ' + C + ':not(.card--wide),body.stv .category-full ' + C + ':not(.card--wide){padding-bottom:1.4em!important}'
        ];
        var style = document.createElement('style');
        style.id = 'ott-card-style';
        style.textContent = css.join('\n');
        document.head.appendChild(style);
    }

    // Сканируем только добавленные ветки, а не весь документ на каждую карточку.
    var scanTimer = 0, scanRoots = [], fullScan = false;
    function closestCard(node) {
        while (node && node !== document.body) {
            if (node.nodeType === 1 && node.classList.contains('card')) return node;
            node = node.parentNode;
        }
        return null;
    }
    function tryRender(card, data) {
        try { renderCardStyle(card, data); } catch (e) { dbg('render error', e); }
    }
    function scanCards() {
        scanTimer = 0;
        var roots = fullScan ? [document.body] : scanRoots;
        fullScan = false;
        scanRoots = [];
        for (var i = 0; i < roots.length; i++) {
            var root = roots[i];
            if (!root || !isAttached(root)) continue;
            if (root.classList && root.classList.contains('card')) tryRender(root);
            var cards = root.querySelectorAll('.card');
            for (var j = 0; j < cards.length; j++) tryRender(cards[j]);
        }
        prunePending();
        schedulePending();
    }
    function scheduleScan(root) {
        if (!root) fullScan = true;
        else if (!fullScan && scanRoots.indexOf(root) === -1) scanRoots.push(root);
        if (!scanTimer) scanTimer = setTimeout(scanCards, 60);
    }
    function startObserver() {
        if (typeof MutationObserver !== 'function') return;
        new MutationObserver(function (mutations) {
            var removed = false;
            for (var i = 0; i < mutations.length; i++) {
                var m = mutations[i], target = m.target;
                if (m.type === 'attributes') {
                    if (target === document.body) schedulePending();
                    else if (target.classList.contains('card')) {
                        // Фокус также позволяет обнаружить переиспользование DOM.
                        if (target.classList.contains('focus') || target.classList.contains('stv-on')) tryRender(target);
                        drainCard(target);
                    }
                    continue;
                }
                if (m.removedNodes.length) removed = true;
                for (var j = 0; j < m.addedNodes.length; j++) {
                    var node = m.addedNodes[j];
                    if (node.nodeType !== 1) continue;
                    // Собственный блок не запускает повторный скан и сетевые запросы.
                    if (node.classList.contains('ott-info') || closestInfo(target)) continue;
                    if (node.classList.contains('card') || node.querySelector('.card')) scheduleScan(node);
                    else {
                        var card = closestCard(target);
                        if (card) scheduleScan(card);
                    }
                }
            }
            if (removed) prunePending();
        }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    }
    function closestInfo(node) {
        while (node && node !== document.body) {
            if (node.nodeType === 1 && node.classList.contains('ott-info')) return true;
            node = node.parentNode;
        }
        return false;
    }

    var initialized = false;
    function init() {
        if (initialized || !document.body) return;
        initialized = true;
        cleanupOldCaches();
        injectStyles();
        Lampa.Listener.follow('card', function (event) {
            if (!event || !event.object) return;
            if (event.type === 'build' || event.type === 'visible' || event.type === 'focus') {
                tryRender(event.object.card || event.object.html, event.object.data);
            }
        });
        Lampa.Listener.follow('activity', function (event) {
            if (event && (event.type === 'start' || event.type === 'activity' || event.type === 'destroy')) scheduleScan();
        });
        Lampa.Listener.follow('line', function (event) {
            if (event && (event.type === 'append' || event.type === 'visible')) scheduleScan();
        });
        startObserver();
        // В теме касание отмечает только постеры. Дополняем его для широких
        // карточек «Продолжить просмотр», не вмешиваясь в обработку открытия.
        document.addEventListener('touchstart', function (event) {
            if (!document.body.classList.contains('stv')) return;
            var card = closestCard(event.target);
            if (!card) return;
            var old = document.querySelectorAll('.ott-touch-selected');
            for (var i = 0; i < old.length; i++) if (old[i] !== card) old[i].classList.remove('ott-touch-selected');
            // Убираем прежний выбор постера также при касании широкой карточки.
            old = document.querySelectorAll('.card.stv-on');
            for (var j = 0; j < old.length; j++) if (old[j] !== card) old[j].classList.remove('stv-on');
            card.classList.add('ott-touch-selected');
            drainCard(card);
        }, true);
        if (!getVisObserver()) {
            document.addEventListener('scroll', schedulePending, true);
            window.addEventListener('resize', schedulePending);
        }
        window.addEventListener('beforeunload', flushAllCaches);
        document.addEventListener('visibilitychange', function () { if (document.hidden) flushAllCaches(); });
        scheduleScan();
    }

    if (window.Lampa) {
        if (window.appready) init();
        else Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') init(); });
    } else {
        var bootTries = 0;
        var bootTimer = setInterval(function () {
            if (window.Lampa && Lampa.Listener) {
                clearInterval(bootTimer);
                if (window.appready) init();
                else Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') init(); });
            } else if (++bootTries >= 120) clearInterval(bootTimer);
        }, 500);
    }
})();
