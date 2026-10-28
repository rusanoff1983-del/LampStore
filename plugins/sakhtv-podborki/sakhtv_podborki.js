/*
 * Подборки SakhTV для Lampa
 * Источник данных: https://api.sakh.tv/v2 (аккаунт PRO)
 * Карточки: родные контракты Lampa (Lampa.InteractionMain / Lampa.InteractionCategory),
 * клик по фильму открывает родную карточку full, где подключаются балансеры Lampac.
 */
(function () {
    'use strict';

    if (window.__sakhtv_podborki) return;
    window.__sakhtv_podborki = true;

    /* ======================================================================
     * 0. КОНФИГУРАЦИЯ
     * ==================================================================== */

    var SAKH_API = 'https://api.sakh.tv/v2';

    // Токен аккаунта SakhTV. Обновляется вручную (или сборщиком) — пароль в плагин не кладём.
    var SAKH_TOKEN_DEFAULT = '2b9cf93f-06f1-44fc-a46b-f4f000c05edb';

    function token() {
        return Lampa.Storage.get('sakhtv_token', '') || SAKH_TOKEN_DEFAULT;
    }

    var network = new Lampa.Reguest();
    var tmdbCache = {};

    /* Кэш на диск (localStorage), а не только в памяти: карточки и подборки
       должны открываться мгновенно при повторном заходе. */
    var STORE_KEY = 'sakhtv_cache_v1';
    var store = { tmdb: {}, cols: null };
    try {
        var saved = Lampa.Storage.get(STORE_KEY, '');
        if (saved) store = JSON.parse(saved);
        if (!store.tmdb) store.tmdb = {};
    } catch (e) { store = { tmdb: {}, cols: null }; }

    var saveTimer = null;
    function persist() {
        if (saveTimer) return;
        saveTimer = setTimeout(function () {
            saveTimer = null;
            try { Lampa.Storage.set(STORE_KEY, JSON.stringify(store)); } catch (e) {}
        }, 1500);
    }

    /* ======================================================================
     * 1. API SAKHTV
     * ==================================================================== */

    function sakhGet(path, onSuccess, onError) {
        network.silent(SAKH_API + path, onSuccess, onError, false, {
            headers: {
                // Внимание: api.sakh.tv ждёт СЫРОЙ токен, без префикса Bearer.
                Authorization: token()
            }
        });
    }

    function poster(data, kind) {
        var c = data && data[kind || 'covers'];
        if (!c) return '';
        return c['1x'] || c.orig || c['0.1x'] || '';
    }

    var SakhApi = {
        // Подборки: страница целиком
        collections: function (page, onSuccess, onError) {
            sakhGet('/collections?collections_amount=10&items_amount=4&page=' + (page || 0),
                function (data) {
                    if (!data || !data.collections) return onError();
                    var list = data.collections.map(function (c) {
                        var first = (c.items && c.items[0] && c.items[0].data) || {};
                        return {
                            id: c.id,
                            title: c.title,
                            movies: c.movies,
                            serials: c.serials,
                            items_total: c.items_total,
                            items_count: c.items_total,
                            update: c.update_datetime,
                            poster: poster(first, 'backdrops') || poster(first, 'covers'),
                            previews: (c.items || []).slice(0, 4).map(mapItem).filter(function (m) { return m && m.name; }),
                            first: mapItem((c.items && c.items[0]) || null),
                            raw: c
                        };
                    });
                    onSuccess({ page: data.page, pages_total: data.pages_total, collections: list });
                }, onError);
        },

        // Все подборки: первая страница сразу, остальные — параллельно.
        // Свежий список из кэша (10 минут) отдаётся мгновенно, без сети.
        all: function (onSuccess, onError) {
            var c = store.cols;
            if (c && c.ts && (Date.now() - c.ts) < 10 * 60 * 1000 && c.list && c.list.length) {
                return onSuccess(c.list);
            }
            SakhApi.collections(0, function (first) {
                var pages = Math.max((first.pages_total || 1) - 1, 0);
                if (!pages) return onSuccess(first.collections);
                var all = first.collections.slice();
                var left = pages;
                function finish() {
                    // В кэш — только нужные поля: raw с полными обложками раздувает
                    // localStorage до мегабайта, а нужны лишь id, счётчики и превью.
                    store.cols = {
                        ts: Date.now(),
                        list: all.map(function (c) {
                            return {
                                id: c.id, title: c.title, movies: c.movies, serials: c.serials,
                                items_total: c.items_total, update: c.update,
                                previews: c.previews, first: c.first
                            };
                        })
                    };
                    persist();
                    onSuccess(all);
                }
                for (var p = 1; p <= pages; p++) {
                    (function (page) {
                        SakhApi.collections(page, function (part) {
                            all = all.concat(part.collections);
                            if (--left === 0) finish();
                        }, function () {
                            if (--left === 0) finish();
                        });
                    })(p);
                }
            }, onError);
        },

        // Состав подборки
        collection: function (id, page, onSuccess, onError) {
            sakhGet('/collection/' + id + '?items_amount=20&page=' + (page || 0), function (data) {
                if (!data || !data.items) return onError();
                var items = data.items.map(mapItem).filter(function (m) { return m && m.name; });
                onSuccess({
                    page: data.page || 0,
                    pages_total: data.pages_total || 1,
                    title: data.title,
                    results: items
                });
            }, onError);
        }
    };

    function mapItem(entry) {
        var d = entry && entry.data;
        if (!d) return null;
        var isSerial = entry.type === 'serial';
        return {
            sakhtv_id: entry.id || d.id,
            name: d.name || d.ru_title || '',
            original_name: d.ename || d.origin_title || '',
            title: d.name || d.ru_title || '',
            year: d.year || '',
            release_date: d.year ? String(d.year) : '',
            first_air_date: isSerial && d.year ? String(d.year) : '',
            poster_path: poster(d, 'covers'),
            backdrop_path: poster(d, 'backdrops'),
            vote_average: d.kp_rating || d.imdb_rating || 0,
            imdb_id: d.imdb_id || '',
            kinopoisk_id: d.kp_id || '',
            kp_id: d.kp_id || '',
            method: isSerial ? 'tv' : 'movie',
            is_serial: isSerial
        };
    }

    /* ======================================================================
     * 2. РЕЗОЛВ TMDB-ID (нужен родной карточке Lampa)
     * ==================================================================== */

    function tmdbUrl(path) {
        // Всегда через локальный прокси Lampac: при proxy_tmdb=false Lampa.TMDB.api
        // ведёт на api.themoviedb.org напрямую, и он недоступен.
        var host = window.location.protocol + '//' + window.location.host;
        var url = host + '/tmdb/api/3/' + path;
        try {
            var key = Lampa.TMDB.key && Lampa.TMDB.key();
            if (key && url.indexOf('api_key=') === -1) url = Lampa.Utils.addUrlComponent(url, 'api_key=' + key);
        } catch (e) {}
        // Язык тот же, что в Lampa: иначе названия и постеры приходят английские
        try {
            var lang = Lampa.Storage.get('tmdb_lang', '') || Lampa.Storage.get('language', 'ru') || 'ru';
            if (url.indexOf('language=') === -1) url = Lampa.Utils.addUrlComponent(url, 'language=' + lang);
        } catch (e) {}
        return url;
    }

    function resolveTmdb(item, callback) {
        if (!item || !item.name) return callback(null);
        var cacheKey = item.imdb_id || ('s' + item.sakhtv_id);
        if (tmdbCache[cacheKey]) return callback(tmdbCache[cacheKey]);
        if (store.tmdb[cacheKey]) {
            tmdbCache[cacheKey] = store.tmdb[cacheKey];
            return callback(store.tmdb[cacheKey]);
        }
        if (!item.imdb_id) return resolveBySearch(item, callback);

        network.silent(tmdbUrl('find/' + item.imdb_id + '?external_source=imdb_id'), function (d) {
            var hit = (d && ((d.movie_results && d.movie_results[0]) || (d.tv_results && d.tv_results[0]))) || null;
            if (hit) {
                tmdbCache[cacheKey] = hit;
                store.tmdb[cacheKey] = hit;
                persist();
                callback(hit);
            } else {
                resolveBySearch(item, callback);
            }
        }, function () {
            resolveBySearch(item, callback);
        }, false);
    }

    function resolveBySearch(item, callback) {
        var type = item.method === 'tv' ? 'tv' : 'movie';
        var path = 'search/' + type + '?query=' + encodeURIComponent(item.name) +
            (item.year ? '&year=' + item.year : '');
        network.silent(tmdbUrl(path), function (d) {
            var hit = (d && d.results && d.results[0]) || null;
            if (hit) {
                var k = item.imdb_id || ('s' + item.sakhtv_id);
                tmdbCache[k] = hit; store.tmdb[k] = hit; persist();
            }
            callback(hit);
        }, function () {
            callback(null);
        }, false);
    }

    /* Постеры SakhTV (stvcdn.org) отдают 404 — снимок кэша у них протух.
       Картинки берём у TMDB, но всегда через TMDB-прокси Lampac на этом же хосте:
       при proxy_tmdb=false Lampa.TMDB.image отдаёт image.tmdb.org напрямую, а он
       недоступен — и постеры остаются пустыми. */
    function tmdbImage(size, path) {
        if (!path) return '';
        if (path.indexOf('http') === 0) return path;
        var host = window.location.protocol + '//' + window.location.host;
        return host + '/tmdb/img/t/p/' + size + path;
    }

    // Резолв пачки: сначала tmdb по imdb_id, параллельно, не больше limit сразу
    function resolveMany(items, callback, limit) {
        limit = limit || 6;
        var out = items.slice();
        var pos = 0, active = 0;

        function next() {
            while (active < limit && pos < items.length) {
                (function (i) {
                    pos++; active++;
                    resolveTmdb(items[i], function (hit) {
                        out[i].tmdb = hit || null;
                        active--;
                        if (hit) {
                            out[i].poster_tmdb = tmdbImage('w300', hit.poster_path);
                            out[i].backdrop_tmdb = tmdbImage('w780', hit.backdrop_path);
                        }
                        if (pos >= items.length && active === 0) callback(out);
                        else next();
                    });
                })(pos);
            }
        }

        if (!items.length) return callback(out);
        next();
    }

    // Полная карточка TMDB: родной компонент full ждёт готовый объект,
    // а не один id — иначе экран открывается пустым.
    function fetchDetail(id, method, callback) {
        var path = (method === 'tv' ? 'tv/' : 'movie/') + id;
        var base = Lampa.TMDB.api(path);
        var lang = 'ru';
        try { lang = Lampa.Storage.get('language', 'ru') || 'ru'; } catch (e) {}
        var url = base + (base.indexOf('?') >= 0 ? '&' : '?') + 'language=' + lang;
        try {
            var key = Lampa.TMDB.key && Lampa.TMDB.key();
            if (key) url = Lampa.Utils.addUrlComponent(url, 'api_key=' + key);
        } catch (e) {}
        try {
            fetch(url).then(function (r) { return r.json(); })
                .then(function (d) { callback(d && d.id ? d : null); })
                .catch(function () { callback(null); });
        } catch (e) {
            callback(null);
        }
    }

    function openFull(item) {
        function done(movie) {
            movie.method = item.method || 'movie';
            if (item.imdb_id) movie.imdb_id = item.imdb_id;
            if (item.kinopoisk_id) movie.kinopoisk_id = item.kinopoisk_id;
            if (!movie.name && !movie.title) { movie.name = item.name; movie.title = item.name; }
            // Родной контракт Lampa: id и method лежат в самом объекте активности,
            // card — готовый объект TMDB.
            Lampa.Activity.push({
                url: '',
                component: 'full',
                id: movie.id,
                method: movie.method,
                card: movie
            });
        }

        function fallback() {
            done({
                id: item.sakhtv_id,
                name: item.name,
                title: item.name,
                original_name: item.original_name,
                poster_path: item.poster_path,
                release_date: item.release_date,
                first_air_date: item.first_air_date
            });
        }

        resolveTmdb(item, function (hit) {
            if (!hit || !hit.id) return fallback();
            fetchDetail(hit.id, item.method, function (full) {
                done(full || hit);
            });
        });
    }

    /* ======================================================================
     * 3. КАРТОЧКИ
     * ==================================================================== */

    var cssStyles = '<style id="sakhtv_podborki_styles">' +
        '.sakh-card__badge{position:absolute;top:.4em;right:.4em;background:rgba(0,0,0,.55);' +
            'color:#fff;border-radius:.3em;padding:.1em .4em;font-size:.85em;z-index:2}' +
        '.sakh-card__sub{opacity:.6;font-size:.85em}' +
        '.sakh-col-card{position:relative}' +
        '.sakh-col-card .card__view{position:relative!important;height:0!important;padding-bottom:56.25%!important;' +
            'overflow:hidden;border-radius:.3em}' +
        '.sakh-col-card .sakh-mosaic{position:absolute!important;top:0;left:0;right:0;bottom:0;' +
            'display:grid!important;grid-template-columns:50% 50%;grid-template-rows:50% 50%;' +
            'gap:1px;background:#111}' +
        '.sakh-col-card .sakh-mosaic__cell{position:relative;overflow:hidden;height:100%;width:100%}' +
        '.sakh-col-card .sakh-mosaic__img{position:absolute!important;top:0!important;left:0!important;' +
            'width:100%!important;height:100%!important;object-fit:cover!important;' +
            'max-width:none!important;max-height:none!important;display:block}' +
        '.sakh-col-card .sakh-mosaic__shade{position:absolute!important;top:0;left:0;right:0;bottom:0;' +
            'pointer-events:none;z-index:2;' +
            'background:linear-gradient(to top,rgba(0,0,0,.92) 0%,rgba(0,0,0,.35) 40%,rgba(0,0,0,0) 72%)}' +
        '.sakh-col-card .sakh-col-card__count{position:absolute!important;bottom:.55em;left:.65em;' +
            'color:#fff;font-size:.9em;opacity:.9;z-index:3;white-space:nowrap}' +
        '</style>';

    // Карточка фильма/сериала внутри подборки
    function MovieCard(data) {
        this.data = data;

        this.build = function () {
            var img = data.poster_tmdb || data.poster_path || './img/img_broken.svg';
            var $item = $('<div class="card selector layer--visible layer--render">' +
                '<div class="card__view">' +
                    '<img class="card__img" src="' + img + '">' +
                    (data.vote_average ? '<div class="sakh-card__badge">' +
                        String(data.vote_average).substr(0, 4) + '</div>' : '') +
                '</div>' +
                '<div class="card__title">' + (data.name || '') + '</div>' +
            '</div>');
            this.item = $item[0];
            this.img = $item.find('.card__img')[0];
        };

        this.create = function () {
            var _this = this;
            this.build();
            this.item.addEventListener('hover:focus', function () {
                if (_this.onFocus) _this.onFocus(_this.item, data);
            });
            function enter(e) {
                // Гасим обработчик Lampa по умолчанию: он ждёт .data('card') и открывает
                // пустую родную карточку. Наш клик должен открыть резолв по imdb_id.
                if (e && e.stopImmediatePropagation) { e.stopImmediatePropagation(); e.stopPropagation(); }
                if (e && e.preventDefault) e.preventDefault();
                openFull(data);
            }
            this.item.addEventListener('hover:enter', enter);
            // Мышь и тач в web-клиенте приходят как click, а не hover:enter
            this.item.addEventListener('click', enter);
            this.img.onload = function () { _this.item.classList.add('card--loaded'); };
            this.img.onerror = function () { _this.img.src = './img/img_broken.svg'; };
        };

        this.visible = function () {};
        this.destroy = function () {
            if (this.img) { this.img.onload = this.img.onerror = null; this.img.src = ''; }
            if (this.item) this.item.remove();
            this.item = null;
            this.img = null;
        };
        this.render = function (js) { return js ? this.item : $(this.item); };
    }

    // Карточка подборки — мозаика 2×2, как на сайте SakhTV
    function CollectionCard(data) {
        this.data = data;

        function countLabel(c) {
            var m = c.movies || 0, s = c.serials || 0;
            if (m && s) return m + ' ' + plural(m, 'фильм', 'фильма', 'фильмов') +
                ' и ' + s + ' ' + plural(s, 'сериал', 'сериала', 'сериалов');
            if (s) return s + ' ' + plural(s, 'сериал', 'сериала', 'сериалов');
            if (m) return m + ' ' + plural(m, 'фильм', 'фильма', 'фильмов');
            return '';
        }

        this.build = function () {
            var tiles = '';
            for (var i = 0; i < 4; i++) {
                tiles += '<div class="sakh-mosaic__cell">' +
                    '<img class="card__img sakh-mosaic__img" src="./img/img_broken.svg">' +
                '</div>';
            }
            var $item = $('<div class="card selector layer--visible layer--render sakh-col-card">' +
                '<div class="card__view">' +
                    '<div class="sakh-mosaic">' + tiles + '</div>' +
                    '<div class="sakh-mosaic__shade"></div>' +
                    '<div class="sakh-col-card__count">' + countLabel(data) + '</div>' +
                '</div>' +
                '<div class="card__title">' + (data.title || '') + '</div>' +
            '</div>');
            this.item = $item[0];
            this.imgs = $item.find('.sakh-mosaic__img');
        };

        function fill(self) {
            var prev = (data.previews || []).slice(0, 4);
            if (!prev.length) return;
            prev.forEach(function (item, i) {
                var img = self.imgs[i];
                if (!img) return;
                resolveTmdb(item, function (hit) {
                    if (!self.imgs || !self.imgs[i]) return;
                    var src = hit ? tmdbImage('w300', hit.poster_path) : '';
                    if (!src && i === 0) src = data.poster_tmdb || '';
                    if (src) self.imgs[i].src = src;
                });
            });
        }

        this.create = function () {
            var _this = this;
            this.build();
            this.item.addEventListener('hover:focus', function () {
                if (_this.onFocus) _this.onFocus(_this.item, data);
            });
            function enter(e) {
                if (e && e.stopImmediatePropagation) { e.stopImmediatePropagation(); e.stopPropagation(); }
                Lampa.Activity.push({
                    url: data.id,
                    title: data.title,
                    collection: data,
                    component: 'sakhtv_podborki_view',
                    page: 1
                });
            }
            this.item.addEventListener('hover:enter', enter);
            this.item.addEventListener('click', enter);
            fill(this);
        };

        this.visible = function () {};
        this.destroy = function () {
            if (this.item) this.item.remove();
            this.item = null;
            this.imgs = null;
        };
        this.render = function (js) { return js ? this.item : $(this.item); };
    }

    function plural(n, one, few, many) {
        n = Math.abs(n) % 100;
        var n1 = n % 10;
        if (n > 10 && n < 20) return many;
        if (n1 > 1 && n1 < 5) return few;
        if (n1 === 1) return one;
        return many;
    }

    /* ======================================================================
     * 4. ЭКРАНЫ
     * ==================================================================== */

    function errorScreen(comp, text) {
        comp.empty();
        try {
            Lampa.Noty.show(text);
        } catch (e) {}
    }

    // 4.1 Главный экран — одна сетка всех подборок, как на сайте SakhTV
    function MainComponent(object) {
        var comp = new Lampa.InteractionCategory(object);
        var cache = null;
        var PER = 30;

        function payload(list, page) {
            var start = (page - 1) * PER;
            return {
                title: 'Подборки',
                page: page,
                total_pages: Math.max(Math.ceil(list.length / PER), 1),
                results: list.slice(start, start + PER),
                cardClass: function (elem) { return new CollectionCard(elem); }
            };
        }

        comp.create = function () {
            var _this = this;
            this.activity.loader(true);
            SakhApi.all(function (list) {
                cache = list;
                _this.activity.loader(false);
                if (!list.length) return errorScreen(comp, 'SakhTV: подборок нет');
                _this.build(payload(list, 1));
                comp.render().find('.category-full').addClass('mapping--grid cols--4');
            }, function () {
                _this.activity.loader(false);
                errorScreen(comp, 'SakhTV: нет ответа api.sakh.tv или истёк токен');
            });
            return this.render();
        };

        comp.nextPageReuest = function (obj, resolve, reject) {
            if (!cache) return reject();
            resolve(payload(cache, obj.page || 1));
        };

        return comp;
    }

    // 4.2 Экран подборки — сетка карточек
    function ViewComponent(object) {
        var comp = new Lampa.InteractionCategory(object);

        // Карточки — родные Lampa: одинаковая вёрстка с остальным каталогом
        // (рейтинг, метки качества от плагинов, genres/year) и родной клик.
        function payload(data) {
            var results = data.results.filter(function (r) { return r.tmdb && r.tmdb.id; })
                .map(function (r) {
                    var m = {};
                    for (var k in r.tmdb) m[k] = r.tmdb[k];
                    m.method = r.method;
                    m.source = 'tmdb';
                    if (r.imdb_id) m.imdb_id = r.imdb_id;
                    if (r.kinopoisk_id) m.kinopoisk_id = r.kinopoisk_id;
                    return m;
                });
            return {
                title: data.title,
                page: (data.page || 0) + 1,
                total_pages: data.pages_total || 1,
                results: results
            };
        }

        comp.create = function () {
            var _this = this;
            this.activity.loader(true);
            SakhApi.collection(object.url, 0, function (data) {
                if (!data.results.length) {
                    _this.activity.loader(false);
                    return errorScreen(comp, 'SakhTV: подборка пуста');
                }
                // Постеры и id берём у TMDB — как в самой Lampa
                resolveMany(data.results, function (resolved) {
                    _this.activity.loader(false);
                    _this.build(payload({ results: resolved, title: data.title,
                                          page: data.page, pages_total: data.pages_total }));
                    comp.render().find('.category-full').addClass('mapping--grid cols--6');
                }, 6);
            }, function () {
                _this.activity.loader(false);
                errorScreen(comp, 'SakhTV: не удалось загрузить подборку');
            });
            return this.render();
        };

        comp.nextPageReuest = function (obj, resolve, reject) {
            var page = Math.max((obj.page || 1) - 1, 0);
            SakhApi.collection(object.url, page, function (data) {
                resolveMany(data.results, function (resolved) {
                    resolve(payload({ results: resolved, title: data.title,
                                      page: data.page, pages_total: data.pages_total }));
                }, 6);
            }, reject);
        };

        return comp;
    }

    /* ======================================================================
     * 5. ЗАПУСК
     * ==================================================================== */

    function addStyles() {
        if (!$('#sakhtv_podborki_styles').length) $('body').append(cssStyles);
    }

    function startPlugin() {
        addStyles();

        Lampa.Component.add('sakhtv_podborki_main', MainComponent);
        Lampa.Component.add('sakhtv_podborki_view', ViewComponent);

        function addMenu() {
            if ($('.menu__item[data-action="sakhtv_podborki"]').length) return;

            var button = $('<li class="menu__item selector" data-action="sakhtv_podborki">' +
                '<div class="menu__ico">' +
                    '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">' +
                        '<rect x="3" y="4" width="7" height="7" rx="1.5" fill="currentColor"/>' +
                        '<rect x="14" y="4" width="7" height="7" rx="1.5" fill="currentColor" opacity="0.7"/>' +
                        '<rect x="3" y="14" width="7" height="7" rx="1.5" fill="currentColor" opacity="0.7"/>' +
                        '<rect x="14" y="14" width="7" height="7" rx="1.5" fill="currentColor" opacity="0.45"/>' +
                    '</svg>' +
                '</div>' +
                '<div class="menu__text">Подборки</div>' +
            '</li>');

            button.on('hover:enter', function () {
                Lampa.Activity.push({
                    url: '',
                    title: 'Подборки',
                    component: 'sakhtv_podborki_main',
                    page: 1
                });
            });

            $('.menu .menu__list').eq(0).append(button);
        }

        if (window.appready) addMenu();
        else Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') addMenu(); });

        Lampa.Listener.follow('menu', function (e) { if (e.type === 'start') addMenu(); });
    }

    if (window.Lampa && window.Lampa.Listener) {
        if (window.appready) startPlugin();
        else Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') startPlugin(); });
    }

})();
