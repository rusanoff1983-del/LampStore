/*
 * Подборки SakhTV для Lampa (без токена)
 * Источник данных: снимок /plugins/sakhtv_collections.json — серверный слепок api.sakh.tv/v2,
 * который обновляется скриптом на сервере. Клиент в сеть к sakh.tv не ходит вообще.
 * Фильмы и постеры — родные для Lampa: TMDB через прокси Lampac.
 */
(function () {
    'use strict';

    if (window.__sakhtv_podborki) return;
    window.__sakhtv_podborki = true;

    /* ======================================================================
     * 0. КОНФИГУРАЦИЯ
     * ==================================================================== */

    var LOCAL_JSON = '/plugins/sakhtv_collections.json';
    var REMOTE_JSON = [
        'https://cdn.jsdelivr.net/gh/rusanoff1983-del/LampStore@main/plugins/sakhtv-podborki/collections.json',
        'https://raw.githubusercontent.com/rusanoff1983-del/LampStore/main/plugins/sakhtv-podborki/collections.json'
    ];
    var TMDB_BATCH = 6;
    var CACHE_MIN = 10;

    var network = new Lampa.Reguest();
    var tmdbCache = {};

    var STORE_KEY = 'sakhtv_cache_v2';
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
     * 1. ЛОКАЛЬНЫЙ СПИСОК ПОДБОРОК
     * ==================================================================== */

    function loadCollections(onSuccess, onError) {
        var c = store.cols;
        if (c && c.ts && (Date.now() - c.ts) < CACHE_MIN * 60 * 1000 && c.list && c.list.length) {
            return onSuccess(c.list);
        }

        var sources = [window.location.protocol + '//' + window.location.host + LOCAL_JSON]
            .concat(REMOTE_JSON);
        var pos = 0;

        function tryNext() {
            if (pos >= sources.length) return onError();
            var url = sources[pos++];
            network.silent(url, function (data) {
                if (!data || !data.collections || !data.collections.length) return tryNext();
                store.cols = { ts: Date.now(), list: data.collections };
                persist();
                onSuccess(data.collections);
            }, tryNext, false);
        }

        tryNext();
    }

    function mapItem(d) {
        if (!d) return null;
        var isSerial = d.type === 'serial';
        var name = d.name || '';
        return {
            sakhtv_id: d.id,
            name: name,
            original_name: d.ename || '',
            title: name,
            year: d.year || '',
            release_date: d.year ? String(d.year) : '',
            first_air_date: isSerial && d.year ? String(d.year) : '',
            imdb_id: d.imdb_id || '',
            kinopoisk_id: d.kp_id || '',
            kp_id: d.kp_id || '',
            vote_average: 0,
            method: isSerial ? 'tv' : 'movie',
            is_serial: isSerial
        };
    }

    function collectionItems(col) {
        var out = [];
        var list = (col && col.items) || [];
        for (var i = 0; i < list.length; i++) {
            var m = mapItem(list[i]);
            if (m && m.name) out.push(m);
        }
        return out;
    }

    /* ======================================================================
     * 2. РЕЗОЛВ TMDB-ID (карточки и постеры — родные для Lampa)
     * ==================================================================== */

    function tmdbUrl(path) {
        var host = window.location.protocol + '//' + window.location.host;
        var url = host + '/tmdb/api/3/' + path;
        try {
            var key = Lampa.TMDB.key && Lampa.TMDB.key();
            if (key && url.indexOf('api_key=') === -1) url = Lampa.Utils.addUrlComponent(url, 'api_key=' + key);
        } catch (e) {}
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
                store.tmdb[k] = hit;
                persist();
            }
            callback(hit);
        }, function () {
            callback(null);
        }, false);
    }

    function tmdbImage(size, path) {
        if (!path) return '';
        if (path.indexOf('http') === 0) return path;
        var host = window.location.protocol + '//' + window.location.host;
        return host + '/tmdb/img/t/p/' + size + path;
    }

    function resolveMany(items, callback, limit) {
        limit = limit || TMDB_BATCH;
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
     * 3. КАРТОЧКА ПОДБОРКИ
     * ==================================================================== */

    var cssStyles = '<style id="sakhtv_podborki_styles">' +
        '.sakh-col-card{position:relative}' +
        '.sakh-col-card .card__view{position:relative!important;height:0!important;padding-bottom:56.25%!important;' +
            'border-radius:.3em}' +
        '.sakh-col-card .sakh-mosaic{position:absolute!important;top:0;left:0;right:0;bottom:0;' +
            'display:grid!important;grid-template-columns:50% 50%;grid-template-rows:50% 50%;' +
            'gap:1px;background:#111;overflow:hidden;border-radius:.3em}' +
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

    function plural(n, one, few, many) {
        n = Math.abs(n) % 100;
        var n1 = n % 10;
        if (n > 10 && n < 20) return many;
        if (n1 > 1 && n1 < 5) return few;
        if (n1 === 1) return one;
        return many;
    }

    function countLabel(c) {
        var m = c.movies || 0, s = c.serials || 0;
        if (m && s) return m + ' ' + plural(m, 'фильм', 'фильма', 'фильмов') +
            ' и ' + s + ' ' + plural(s, 'сериал', 'сериала', 'сериалов');
        if (s) return s + ' ' + plural(s, 'сериал', 'сериала', 'сериалов');
        if (m) return m + ' ' + plural(m, 'фильм', 'фильма', 'фильмов');
        return '';
    }

    function CollectionCard(data) {
        this.data = data;

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
            var prev = collectionItems(data).slice(0, 4);
            if (!prev.length) return;
            prev.forEach(function (item, i) {
                var img = self.imgs[i];
                if (!img) return;
                resolveTmdb(item, function (hit) {
                    if (!self.imgs || !self.imgs[i]) return;
                    var src = hit ? tmdbImage('w300', hit.poster_path) : '';
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

    /* ======================================================================
     * 4. ЭКРАНЫ
     * ==================================================================== */

    function errorScreen(comp, text) {
        comp.empty();
        try { Lampa.Noty.show(text); } catch (e) {}
    }

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
            loadCollections(function (list) {
                cache = list;
                _this.activity.loader(false);
                if (!list.length) return errorScreen(comp, 'SakhTV: подборок нет');
                _this.build(payload(list, 1));
                comp.render().find('.category-full').addClass('mapping--grid cols--4');
            }, function () {
                _this.activity.loader(false);
                errorScreen(comp, 'SakhTV: нет файла подборок на сервере');
            });
            return this.render();
        };

        comp.nextPageReuest = function (obj, resolve, reject) {
            if (!cache) return reject();
            resolve(payload(cache, obj.page || 1));
        };

        return comp;
    }

    function ViewComponent(object) {
        var comp = new Lampa.InteractionCategory(object);
        var all = null;
        var PER = 40;

        function payload(items, page, title) {
            var start = (page - 1) * PER;
            var slice = items.slice(start, start + PER);
            var results = slice.filter(function (r) { return r.tmdb && r.tmdb.id; })
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
                title: title,
                page: page,
                total_pages: Math.max(Math.ceil(items.length / PER), 1),
                results: results
            };
        }

        comp.create = function () {
            var _this = this;
            var col = object.collection;
            this.activity.loader(true);

            function draw() {
                _this.activity.loader(false);
                if (!all.length) return errorScreen(comp, 'SakhTV: подборка пуста');
                _this.build(payload(all, 1, col.title));
                comp.render().find('.category-full').addClass('mapping--grid cols--6');
            }

            if (col && col.items) {
                resolveMany(collectionItems(col), function (res) { all = res; draw(); }, TMDB_BATCH);
            } else {
                loadCollections(function (list) {
                    var found = null;
                    for (var i = 0; i < list.length; i++) if (list[i].id == object.url) { found = list[i]; break; }
                    if (!found) { _this.activity.loader(false); return errorScreen(comp, 'SakhTV: подборка не найдена'); }
                    col = found;
                    resolveMany(collectionItems(found), function (res) { all = res; draw(); }, TMDB_BATCH);
                }, function () {
                    _this.activity.loader(false);
                    errorScreen(comp, 'SakhTV: нет файла подборок на сервере');
                });
            }
            return this.render();
        };

        comp.nextPageReuest = function (obj, resolve, reject) {
            if (!all) return reject();
            resolve(payload(all, obj.page || 1, object.collection ? object.collection.title : ''));
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
