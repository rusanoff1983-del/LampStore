/// *** rethinking ***

(function () {
    'use strict';

    Lampa.Lang.add({
        params_ani_on: {
            ru: 'Включить',
            en: 'Enable'
        },
        params_ani_select: {
            ru: 'Выбор анимации',
            en: 'Select loading animation'
        },
        params_ani_name: {
            ru: 'Анимация Загрузки',
            en: 'Loading animation'
        }
    });

    // Функция для получения случайного домена
    function getRandomDomain() {
        var domains = [
            'tvigl.info'
        ];
        return domains[Math.floor(Math.random() * domains.length)];
    }

    // Функция для создания ссылки с случайным доменом
    function createSvgUrl(path) {
        var domain = getRandomDomain();
        return 'https://' + domain + '/aloader/' + path;
    }

    // Базовые имена файлов SVG
    var svgFiles = [
        'dots.svg',
        'dots_x2.svg',
        '90-ring-white-36.svg',
        '90-ring-with-bg-white-36.svg',
        '180-ring-white-36.svg',
        '180-ring-with-bg-white-36.svg',
        '270-ring-white-36.svg',
        '270-ring-with-bg-white-36.svg',
        'ring-resize-white-36.svg',
        'bars-rotate-fade-white-36.svg',
        'blocks-scale-white-36.svg',
        'blocks-shuffle-2-white-36.svg',
        'blocks-shuffle-3-white-36.svg',
        'blocks-wave-white-36.svg',
        'pulse-white-36.svg',
        'pulse-2-white-36.svg',
        'pulse-3-white-36.svg',
        'pulse-multiple-white-36.svg',
        'pulse-ring-white-36.svg',
        'pulse-rings-2-white-36.svg',
        'pulse-rings-3-white-36.svg',
        'pulse-rings-multiple-white-36.svg',
        '3-dots-bounce-white-36.svg',
        '3-dots-fade-white-36.svg',
        '3-dots-scale-white-36.svg',
        'dot-revolve-white-36.svg',
        'bouncing-ball-white-36.svg',
        'gooey-balls-2-white-36.svg'
    ];

    // Создаем массив ссылок со случайными доменами
    var svg_links = [];
    for (var i = 0; i < svgFiles.length; i++) {
        svg_links.push(createSvgUrl(svgFiles[i]));
    }

    // Установка значений по умолчанию (плагин отключен по умолчанию)
    if (!Lampa.Storage.get('ani_active')) {
        Lampa.Storage.set('ani_active', 'false'); // Изменено на false
    }
    if (!Lampa.Storage.get('ani_load')) {
        Lampa.Storage.set('ani_load', 'https://tvigl.info/aloader/pulse-ring-white-36.svg');
    }

    function hexToCssFilter(hexColor, calibrate) {
        if (calibrate === undefined) calibrate = true;
        
        if (hexColor) {
            var hex = hexColor.replace('#', '');
            if (hex.length !== 6) return 'none';

            var r = parseInt(hex.substring(0, 2), 16) / 255;
            var g = parseInt(hex.substring(2, 4), 16) / 255;
            var b = parseInt(hex.substring(4, 6), 16) / 255;

            var max = Math.max(r, g, b);
            var min = Math.min(r, g, b);
            var delta = max - min;

            var hue = 0;
            if (delta !== 0) {
                if (max === r) hue = ((g - b) / delta) % 6;
                else if (max === g) hue = (b - r) / delta + 2;
                else hue = (r - g) / delta + 4;
                hue = Math.round(hue * 60);
                if (hue < 0) hue += 360;
            }

            var saturation = max === 0 ? 0 : delta / max;
            var brightness = max;

            var sepia = 1;
            var hueRotate = hue - 40;
            var saturateValue = saturation * 10;
            var brightnessValue = brightness * 0.8 + 0.2;

            if (calibrate) {
                if (hue >= 180 && hue <= 240) {
                    hueRotate += 5;
                    saturateValue *= 1.2;
                    sepia /= 2.5;
                    brightnessValue /= 1.6;
                }
                else if (hue >= 240 && hue <= 300) {
                    hueRotate += 5;
                    saturateValue *= 1.2;
                    brightnessValue *= 1.09;
                    sepia /= 2.5;
                }
                else if (hue <= 20 || hue >= 340) {
                    hueRotate -= 10;
                    brightnessValue /= 4.55;
                }
                else if (hue >= 70 && hue <= 160) {
                    hueRotate -= 15;
                    saturateValue *= 0.9;
                    brightnessValue *= 1.09;
                    sepia /= 2.5;
                }
                else if (hue >= 14 && hue <= 60) {
                    hueRotate -= 15;
                    saturateValue *= 0.9;
                    brightnessValue /= 2.45;
                    sepia /= 1.25;
                }
                else if (hue >= 300 && hue <= 360) {
                    hueRotate -= 15;
                    saturateValue *= 0.9;
                    brightnessValue /= 4.6;
                }
            }

            hueRotate = Math.max(0, Math.min(360, hueRotate));
            saturateValue = Math.max(0, Math.min(20, saturateValue));
            brightnessValue = Math.max(0, Math.min(2, brightnessValue));

            return 'brightness(' + brightnessValue.toFixed(2) + ') sepia(' + sepia + ') hue-rotate(' + Math.round(hueRotate) + 'deg) saturate(' + saturateValue.toFixed(2) + ')';
        } else {
            return undefined;
        }
    }

    Lampa.Template.add('ani_modal', '\
    <div class="ani_modal_root">\
    <div class="ani_grid">\
    {ani_svg_content}\
    </div>\
    </div>\
    ');

    function create_ani_modal() {
        var style = document.createElement('style');
        style.id = 'aniload';
        style.textContent = '\
                .ani_row {\
                            display: grid;\
                            grid-template-columns:\
                                repeat(7, 1fr);\
                            grid-auto-rows: 1fr;\
                            gap: 40px;\
                            justify-items: center;\
                            width: 100%;\
                            height: 72px;\
                            padding: 10px;\
                }\
                .ani_svg {\
                            display: flex;\
                            align-items: center;\
                            justify-content: center;\
                            width: 100%;\
                            height: 100%;\
                }\
                .ani_svg img {\
                            max-width: 100%;\
                            max-height: 100%;\
                            object-fit: contain;\
                }\
                \
                .ani_svg.focus {\
                            background-color: #353535;\
                            justify-content: center;\
                            align-items: center;\
                            border: 1px solid #9e9e9e;\
                }\
        ';
        document.head.appendChild(style);
    }

    function remove_activity_loader() {
        var styleElement = document.getElementById('aniload_activity__loader');
        if (styleElement) {
            styleElement.remove();
        }
    }

    function createSvgHtml(src) {
        return '\
            <div class="ani_svg selector" tabindex="0">\
            <picture>\
                <source srcset="' + src + '" media="(prefers-color-scheme: light),(prefers-color-scheme: dark)">\
                <img src="' + src + '" style="visibility:visible; max-width:100%; fill:#ffffff">\
            </picture>\
            </div>\
        ';
    }

    function chunkArray(arr, size) {
        var result = [];
        for (var i = 0; i < arr.length; i += size) {
            result.push(arr.slice(i, i + size));
        }
        return result;
    }

    function insert_activity_loader(url, filter) {
        $('#aniload-id').remove();

        var escapedUrl = url.replace(/'/g, "\\'");
        var newStyle_activity_loader;

        if (Boolean(filter) === false) {
            newStyle_activity_loader = '\
                .activity__loader {\
                    background: url(\'' + escapedUrl + '\') no-repeat 50% 50% !important;\
                    transform: scale(3);\
                    -webkit-transform: scale(3);\
                }\
            ';
        } else {
            newStyle_activity_loader = '\
                .activity__loader {\
                    background: url(\'' + escapedUrl + '\') no-repeat 50% 50% !important;\
                    transform: scale(3);\
                    -webkit-transform: scale(3);\
                    filter: ' + hexToCssFilter(filter) + ';\
                }\
            ';
        }

        $('<style id="aniload-id">' + newStyle_activity_loader + '</style>').appendTo('head');
    }

    function insert_activity_loader_prv(escapedUrl) {
        $('#aniload-id-prv').remove();
        var newStyle_activity_loader_prv = '\
            .activity__loader_prv {\
                position: absolute;\
                top: 0;\
                width: 145%;\
                height: 86%;\
                background: url(\'' + escapedUrl + '\') no-repeat 50% 50%;\
                z-index: 9999; \
            }\
        ';
        $('<style id="aniload-id-prv">' + newStyle_activity_loader_prv + '</style>').appendTo('head');
    }

    function aniLoad() {
        var icon_plugin = '<svg height="32" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10" stroke="white" stroke-width="2" fill="none" stroke-dasharray="15 10" stroke-linecap="round"/><circle cx="12" cy="12" r="6" stroke="white" stroke-width="1.5" fill="none" stroke-dasharray="8 12" stroke-linecap="round"/><circle cx="12" cy="12" r="2" fill="white"/></svg>';
        
        Lampa.SettingsApi.addComponent({
            component: 'ani_load_menu',
            name: Lampa.Lang.translate('params_ani_name'),
            icon: icon_plugin
        });

        Lampa.SettingsApi.addParam({
            component: 'ani_load_menu',
            param: {
                name: 'ani_active',
                type: 'trigger',
                default: false // Изменено на false
            },
            field: {
                name: Lampa.Lang.translate('params_ani_on')
            },
            onChange: function (item) {
                if (item == 'true') {
                    if (!!Lampa.Storage.get("ani_load") && !!Lampa.Storage.get("ani_active")) {
                        insert_activity_loader(Lampa.Storage.get("ani_load"), getComputedStyle(document.documentElement).getPropertyValue('--main-color'));
                    }
                } else if (item == 'false') {
                    remove_activity_loader();
                }
            }
        });

        Lampa.SettingsApi.addParam({
            component: 'ani_load_menu',
            param: {
                name: 'select_ani_mation',
                type: 'button'
            },
            field: {
                name: Lampa.Lang.translate('params_ani_select'),
                description: '<div class="activity__loader_prv"></div>'
            },
            onRender: function (item) {
                insert_activity_loader_prv(Lampa.Storage.get("ani_load"));
            },
            onChange: function (item) {
                create_ani_modal();
                
                // Обновляем ссылки при каждом открытии модального окна
                var currentSvgLinks = [];
                for (var i = 0; i < svgFiles.length; i++) {
                    currentSvgLinks.push(createSvgUrl(svgFiles[i]));
                }
                
                var groupedSvgLinks = chunkArray(currentSvgLinks, 7);
                var svg_content = '';
                
                for (var j = 0; j < groupedSvgLinks.length; j++) {
                    var groupContent = '';
                    for (var k = 0; k < groupedSvgLinks[j].length; k++) {
                        groupContent += createSvgHtml(groupedSvgLinks[j][k]);
                    }
                    svg_content += '<div class="ani_row">' + groupContent + '</div>';
                }

                var ani_templates = Lampa.Template.get('ani_modal', {
                    ani_svg_content: svg_content
                });
                
                Lampa.Modal.open({
                    title: '',
                    size: 'medium',
                    align: 'center',
                    html: ani_templates,
                    onBack: function() {
                        Lampa.Modal.close();
                        Lampa.Controller.toggle('settings_component');
                    },
                    onSelect: function onSelect(a) {
                        Lampa.Modal.close();
                        Lampa.Controller.toggle('settings_component');
                        if (a.length > 0 && a[0] instanceof HTMLElement) {
                            var element = a[0];
                            var imgElement = element.querySelector('img');
                            if (imgElement) {
                                var srcValue = imgElement.getAttribute('src');
                                Lampa.Storage.set("ani_load", srcValue);
                                if (!!Lampa.Storage.get("ani_load") && !!Lampa.Storage.get("ani_active")) {
                                    insert_activity_loader(Lampa.Storage.get("ani_load"), getComputedStyle(document.documentElement).getPropertyValue('--main-color'));
                                    insert_activity_loader_prv(Lampa.Storage.get("ani_load"));
                                }
                            }
                        }
                    }
                });
            }
        });

        // Плагин отключен по умолчанию, поэтому не активируем автоматически
        if (!!Lampa.Storage.get("ani_load") && Lampa.Storage.get("ani_active") === 'true') {
            insert_activity_loader(Lampa.Storage.get("ani_load"), getComputedStyle(document.documentElement).getPropertyValue('--main-color'));
        }
    }
    
    function byTheme() {
        if (!!Lampa.Storage.get("ani_load") && Lampa.Storage.get("ani_active") === 'true') {
            var mainColor = getComputedStyle(document.documentElement).getPropertyValue('--main-color');
            if (typeof insert_activity_loader === 'function') {
                insert_activity_loader(Lampa.Storage.get("ani_load"), mainColor);
            }
        }    
    }

    // Инициализация
    if (window.Lampa && Lampa.Storage && Lampa.Listener) {
        if (window.appready) {
            initThemeAndLoader();
            setupThemeListener();
        } else {
            var appReadyListener = function(e) {
                if (e.type === 'ready') {
                    initThemeAndLoader();
                    setupThemeListener();
                    Lampa.Listener.follow('app', appReadyListener);
                }
            };
            Lampa.Listener.follow('app', appReadyListener);
        }
    } else {
        console.error('**** Lampa core modules are not available!');
    }

    function initThemeAndLoader() {
        var main_color = getComputedStyle(document.documentElement).getPropertyValue('--main-color');
        if (main_color && typeof byTheme === 'function') byTheme();
        if (typeof aniLoad === 'function') aniLoad();
    }

    function setupThemeListener() {
        Lampa.Storage.listener.follow('change', function(e) {
            if (e) {
                var main_color = getComputedStyle(document.documentElement).getPropertyValue('--main-color');
                if (main_color && typeof byTheme === 'function') byTheme();
            }
        });
    }
})();