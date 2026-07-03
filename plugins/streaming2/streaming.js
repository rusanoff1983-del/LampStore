(function () {
    'use strict';

    if (window.surs_streamings_plugin_ready) return;
    window.surs_streamings_plugin_ready = true;

    var SETTINGS_COMPONENT = 'surs_streamings_settings';
    var COMPONENT = 'surs_streamings';
    var MODE_HOME = 'home';
    var MODE_MENU = 'menu';
    var STREAM_PIC_BASE = 'https://raw.githubusercontent.com/rusanoff1983-del/stream-pic/main/stream-picture/';
    var BASE_PARAMS = '&without_keywords=346488,158718,41278,196034,272265,13141,345822,315535,290667,323477,290609';
    var THREE_YEARS_AGO = new Date();
    THREE_YEARS_AGO.setFullYear(THREE_YEARS_AGO.getFullYear() - 3);
    var DATE_FILTER = '&first_air_date.gte=' + THREE_YEARS_AGO.toISOString().split('T')[0];

    var globalStreaming = [
        { id: 213, title: 'Netflix', img: 'netflix.png' },
        { id: 2739, title: 'Disney+', img: 'disneyplus.jpg' },
        { id: 2552, title: 'Apple TV+', img: 'apple.png' },
        { id: 1024, title: 'Amazon Prime Video', img: 'prime.png' },
        { id: 3186, title: 'Max', img: 'HBO max.png' },
        { id: 4330, title: 'Paramount+', img: 'paramount.png' },
        { id: 3353, title: 'Peacock', img: 'peackock.png' },
        { id: 453, title: 'Hulu', img: 'hulu.png' },
        { id: 49, title: 'HBO', img: 'HBO.png' },
        { id: 318, title: 'Starz', img: 'starz.png' },
        { id: 2, title: 'ABC', img: 'abc.png' },
        { id: 6, title: 'NBC', img: 'nbc.png' },
        { id: 19, title: 'FOX', img: 'fox.png' },
        { id: 67, title: 'Showtime', img: 'showtime.png' },
        { id: 88, title: 'FX', img: 'fx.png' },
        { id: 174, title: 'AMC', img: 'amc.png' },
        { id: 77, title: 'Syfy', img: 'syfy.png' }
    ];

    var russianStreaming = [
        { id: 3827, title: 'Кинопоиск HD', img: 'rus stream2/kinopoisk.png' },
        { id: 2493, title: 'Start', img: 'rus stream2/start.png' },
        { id: 3923, title: 'ИВИ', img: 'rus stream2/ivi.png' },
        { id: 3871, title: 'Okko', img: 'rus stream2/okko.png' },
        { id: 4085, title: 'KION', img: 'rus stream2/kion.png' },
        { id: 2859, title: 'Premier', img: 'rus stream2/Premier.png' },
        { id: 5806, title: 'Wink', img: 'rus stream2/wink.png' },
        { id: 3882, title: 'More.TV', img: 'rus stream2/moretv.png' },
        { id: 412, title: 'Россия 1', img: 'rus stream2/rossia1.png' },
        { id: 558, title: 'Первый канал', img: 'rus stream2/1kanal.png' },
        { id: 806, title: 'СТС', img: 'rus stream2/sts.png' },
        { id: 1191, title: 'ТНТ', img: 'rus stream2/tnt.png' },
        { id: 3031, title: 'Пятница!', img: 'rus stream2/patnica.png' }
    ];

    var menuItem;

    function storageBool(name, fallback) {
        var value = Lampa.Storage.get(name, fallback ? 'true' : 'false');
        return value === true || value === 'true';
    }

    function displayMode() {
        return Lampa.Storage.get('surs_streamings_display_mode', MODE_HOME);
    }

    function showGlobal() {
        return storageBool('surs_streamings_global_enabled', true);
    }

    function showRussian() {
        return true;
    }

    function addLocalization() {
        Lampa.Lang.add({
            surs_streamings_menu: {
                ru: 'Стриминги',
                en: 'Streamings',
                uk: 'Стрімінги'
            },
            surs_streamings_global_title: {
                ru: 'Иностранные стриминги',
                en: 'Foreign Streaming',
                uk: 'Іноземні стрімінги'
            },
            surs_streamings_russian_title: {
                ru: 'Русские стриминги',
                en: 'Russian Streaming',
                uk: 'Російські стрімінги'
            },
            surs_streamings_new: {
                ru: 'Новинки',
                en: 'New',
                uk: 'Новинки'
            },
            surs_streamings_top_rated: {
                ru: 'Высокий рейтинг',
                en: 'Top Rated',
                uk: 'Високий рейтинг'
            },
            surs_streamings_popular: {
                ru: 'Популярные',
                en: 'Popular',
                uk: 'Популярні'
            },
            surs_streamings_most_voted: {
                ru: 'Много голосов',
                en: 'Most Voted',
                uk: 'Багато голосів'
            },
            surs_streamings_setting_russian: {
                ru: 'Включить русские стриминги',
                en: 'Enable Russian streaming',
                uk: 'Увімкнути російські стрімінги'
            },
            surs_streamings_setting_global: {
                ru: 'Включить иностранные стриминги',
                en: 'Enable foreign streaming',
                uk: 'Увімкнути іноземні стрімінги'
            },
            surs_streamings_setting_place: {
                ru: 'Где показывать',
                en: 'Where to show',
                uk: 'Де показувати'
            },
            surs_streamings_place_home: {
                ru: 'На главной',
                en: 'On home',
                uk: 'На головній'
            },
            surs_streamings_place_menu: {
                ru: 'Отдельным меню',
                en: 'Separate menu',
                uk: 'Окремим меню'
            },
            surs_streamings_refresh_notice: {
                ru: 'Обновите главную или перезапустите Lampa',
                en: 'Refresh home or restart Lampa',
                uk: 'Оновіть головну або перезапустіть Lampa'
            }
        });
    }

    function getLogoUrl(networkId, callback) {
        var apiUrl = Lampa.TMDB.api('network/' + networkId + '?api_key=' + Lampa.TMDB.key());
        Lampa.Network.silent(apiUrl, function (data) {
            callback(data && data.logo_path ? Lampa.TMDB.image('t/p/w154' + data.logo_path) : '');
        }, function () {
            callback('');
        }, false, { cache: { life: 60 * 24 * 7 } });
    }

    function getPictureUrl(service) {
        return service.img ? STREAM_PIC_BASE + encodePath(service.img) : '';
    }

    function encodePath(path) {
        return path.split('/').map(encodeURIComponent).join('/');
    }

    function setImageSource(image, src) {
        var element = image && image.jquery ? image[0] : image;
        if (element) element.setAttribute('src', src);
    }

    function replaceCardImage(image, src, title) {
        var element = image && image.jquery ? image[0] : image;
        if (!element || !element.parentNode) return;

        var newImage = document.createElement('img');
        newImage.className = element.className || 'card__img';
        newImage.src = src || './img/img_broken.svg';
        newImage.alt = title || '';
        newImage.style.objectFit = 'cover';

        element.parentNode.replaceChild(newImage, element);
    }

    function applyServiceImage(card, image, service, isGlobal) {
        var picture = getPictureUrl(service);

        if (picture) {
            replaceCardImage(image, picture, service.title);
        } else if (isGlobal) {
            getLogoUrl(service.id, function (logo) {
                replaceCardImage(image, logo, service.title);
            });
        }
    }

    function createCard(data, type) {
        return Lampa.Maker.make(type, data, function (module) {
            return module.only('Card', 'Callback');
        });
    }

    function StreamingCard(data) {
        var self = this;

        function remove(elem) {
            if (elem) elem.remove();
        }

        self.build = function () {
            self.card = $(Lampa.Template.js('card'));
            self.card.find('.card__title').text(data.title);
            self.card.find('.card__age').remove();

            var imgElement = self.card.find('.card__img');
            applyServiceImage(self.card, imgElement, data.streaming, data.streaming_global);
        };

        self.create = function () {
            self.build();

            self.card.on('hover:enter', function () {
                openStreamingService(data.streaming, data.streaming_global);
            });

            self.card.on('hover:focus', function () {
                if (self.onFocus) self.onFocus(self.card, data);
            });

            self.card.on('hover:hover', function () {
                if (self.onHover) self.onHover(self.card, data);
            });
        };

        self.destroy = function () {
            remove(self.card);
            self.card = null;
        };

        self.render = function (js) {
            return js ? self.card[0] : self.card;
        };
    }

    function openStreamingService(service, isGlobal) {
        var sorts = [
            {
                title: Lampa.Lang.translate('surs_streamings_new'),
                sort: 'first_air_date.desc',
                params: BASE_PARAMS + DATE_FILTER + (isGlobal ? '&vote_count.gte=10' : '')
            },
            {
                title: Lampa.Lang.translate('surs_streamings_top_rated'),
                sort: 'vote_average.desc',
                params: BASE_PARAMS + '&vote_count.gte=10'
            },
            {
                title: Lampa.Lang.translate('surs_streamings_popular'),
                sort: 'popularity.desc',
                params: BASE_PARAMS + '&vote_count.gte=10'
            },
            {
                title: Lampa.Lang.translate('surs_streamings_most_voted'),
                sort: 'vote_count.desc',
                params: BASE_PARAMS + '&vote_count.gte=30'
            }
        ];

        Lampa.Select.show({
            title: service.title,
            items: sorts.map(function (item) {
                return {
                    title: item.title,
                    action: function () {
                        Lampa.Activity.push({
                            url: 'discover/tv?with_networks=' + service.id + item.params,
                            title: service.title + ' - ' + item.title,
                            component: 'category_full',
                            card_type: 'true',
                            sort_by: item.sort,
                            page: 1
                        });
                    }
                };
            }),
            onSelect: function (item) {
                item.action();
            },
            onBack: function () {
                Lampa.Controller.toggle('content');
            }
        });
    }

    function serviceToCard(service, isGlobal) {
        return {
            source: 'custom',
            title: service.title,
            name: service.title,
            id: 'streaming_' + service.id,
            release_year: '',
            img: getPictureUrl(service),
            streaming: service,
            streaming_global: isGlobal,
            params: {
                createInstance: function () {
                    return createCard(this, 'Card');
                },
                emit: {
                    onCreate: function () {
                        this.html.addClass('streaming-card--poster');

                        var imgElement = this.html.find('.card__img');
                        applyServiceImage(this.html, imgElement, service, isGlobal);
                    },
                    onlyEnter: function () {
                        openStreamingService(service, isGlobal);
                    }
                }
            }
        };
    }

    function makeRow(titleKey, services, isGlobal) {
        return {
            results: services.map(function (service) {
                return serviceToCard(service, isGlobal);
            }),
            title: Lampa.Lang.translate(titleKey),
            cardClass: function (elem) {
                return new StreamingCard(elem);
            },
            params: {
                items: {
                    view: 20,
                    mapping: 'line'
                }
            }
        };
    }

    function getRows() {
        var rows = [];
        if (showGlobal()) rows.push(makeRow('surs_streamings_global_title', globalStreaming, true));
        if (showRussian()) rows.push(makeRow('surs_streamings_russian_title', russianStreaming, false));
        return rows;
    }

    function addStyles() {
        Lampa.Template.add('surs_streamings_style', '<style>\
            .streaming-card--poster .card__age{display:none!important}\
            .streaming-card__svg-icon{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:45%!important;height:45%!important;display:flex;align-items:center;justify-content:center}\
            .streaming-card__svg-icon img,.streaming-card__svg-icon div{width:100%;height:100%;object-fit:contain}\
        </style>');

        $('body').append(Lampa.Template.get('surs_streamings_style', {}, true));
    }

    function addSettings() {
        Lampa.Template.add('settings_' + SETTINGS_COMPONENT, '<div></div>');

        Lampa.SettingsApi.addComponent({
            component: SETTINGS_COMPONENT,
            name: Lampa.Lang.translate('surs_streamings_menu'),
            icon: streamingIcon()
        });

        Lampa.SettingsApi.addParam({
            component: SETTINGS_COMPONENT,
            param: {
                name: 'surs_streamings_russian_enabled',
                type: 'trigger',
                default: showRussian()
            },
            field: {
                name: Lampa.Lang.translate('surs_streamings_setting_russian')
            },
            onChange: function () {
                Lampa.Noty.show(Lampa.Lang.translate('surs_streamings_refresh_notice'));
            }
        });

        Lampa.SettingsApi.addParam({
            component: SETTINGS_COMPONENT,
            param: {
                name: 'surs_streamings_global_enabled',
                type: 'trigger',
                default: showGlobal()
            },
            field: {
                name: Lampa.Lang.translate('surs_streamings_setting_global')
            },
            onChange: function () {
                Lampa.Noty.show(Lampa.Lang.translate('surs_streamings_refresh_notice'));
            }
        });

        Lampa.SettingsApi.addParam({
            component: SETTINGS_COMPONENT,
            param: {
                name: 'surs_streamings_display_mode',
                type: 'select',
                values: {
                    home: Lampa.Lang.translate('surs_streamings_place_home'),
                    menu: Lampa.Lang.translate('surs_streamings_place_menu')
                },
                default: displayMode()
            },
            field: {
                name: Lampa.Lang.translate('surs_streamings_setting_place')
            },
            onChange: function () {
                updateMenuVisibility();
                Lampa.Noty.show(Lampa.Lang.translate('surs_streamings_refresh_notice'));
            }
        });
    }

    function addHomeRows() {
        Lampa.ContentRows.add({
            index: 3,
            name: 'surs_streaming_global',
            title: Lampa.Lang.translate('surs_streamings_global_title'),
            screen: ['main'],
            call: function () {
                return function (callback) {
                    if (displayMode() === MODE_HOME && showGlobal()) {
                        callback(makeRow('surs_streamings_global_title', globalStreaming, true));
                    } else {
                        callback({ results: [], title: '', nomore: true });
                    }
                };
            }
        });

        Lampa.ContentRows.add({
            index: 7,
            name: 'surs_streaming_russian',
            title: Lampa.Lang.translate('surs_streamings_russian_title'),
            screen: ['main'],
            call: function () {
                return function (callback) {
                    if (displayMode() === MODE_HOME && showRussian()) {
                        callback(makeRow('surs_streamings_russian_title', russianStreaming, false));
                    } else {
                        callback({ results: [], title: '', nomore: true });
                    }
                };
            }
        });
    }

    function StreamingComponent(object) {
        var comp = new Lampa.InteractionMain(object);

        comp.create = function () {
            var rows = getRows();
            if (rows.length) this.build(rows);
            else this.empty();
            return this.render();
        };

        return comp;
    }

    function streamingIcon() {
        return '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">\
            <path d="M7 4h10a4 4 0 0 1 4 4v7a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8a4 4 0 0 1 4-4Z" stroke="currentColor" stroke-width="1.7"/>\
            <path d="m10 9 5 3-5 3V9Z" fill="currentColor"/>\
        </svg>';
    }

    function addMenuItem() {
        menuItem = $('<li data-action="' + COMPONENT + '" class="menu__item selector"><div class="menu__ico">' + streamingIcon() + '</div><div class="menu__text">' + Lampa.Lang.translate('surs_streamings_menu') + '</div></li>');

        menuItem.on('hover:enter', function () {
            Lampa.Activity.push({
                url: '',
                title: Lampa.Lang.translate('surs_streamings_menu'),
                component: COMPONENT,
                page: 1
            });
        });

        $('.menu .menu__list').eq(0).append(menuItem);
        updateMenuVisibility();
    }

    function updateMenuVisibility() {
        if (!menuItem) return;
        menuItem.toggle(displayMode() === MODE_MENU);
    }

    function startPlugin() {
        if (Lampa.Manifest.app_digital < 300) {
            console.log('SURS streamings require Lampa v3.');
            return;
        }

        addLocalization();
        addStyles();
        addSettings();
        addHomeRows();

        Lampa.Component.add(COMPONENT, StreamingComponent);
        addMenuItem();
    }

    if (window.appready) {
        startPlugin();
    } else {
        Lampa.Listener.follow('app', function (event) {
            if (event.type === 'ready') startPlugin();
        });
    }
})();
