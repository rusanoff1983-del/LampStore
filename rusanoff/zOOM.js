(function () {
  'use strict';

  /* ================================================================
   * Card Zoom Effect Plugin for Lampa (Uiverse.io Style Edition)
   * Автор: rusanoff
   * ================================================================ */

  function injectCSS() {
    var scale = Lampa.Storage.get('zoom_scale', '1.20');
    var duration = Lampa.Storage.get('zoom_duration', '0.4s');
    var radiusType = Lampa.Storage.get('zoom_radius', '10px');
    var removeBorder = Lampa.Storage.get('zoom_remove_border', true);
    var borderColor = Lampa.Storage.get('zoom_border_color', '#ffffff');

    var radiusIdle = '10px';
    var radiusFocus = '15px';

    if (radiusType === '0px') {
      radiusIdle = '0px';
      radiusFocus = '0px';
    } else if (radiusType === '6px') {
      radiusIdle = '6px';
      radiusFocus = '10px';
    } else if (radiusType === '10px') {
      radiusIdle = '10px';
      radiusFocus = '15px';
    } else if (radiusType === '14px') {
      radiusIdle = '14px';
      radiusFocus = '20px';
    } else {
      radiusIdle = radiusType;
      var num = parseInt(radiusType, 10);
      radiusFocus = isNaN(num) ? '15px' : (Math.round(num * 1.5) + 'px');
    }

    var borderGlow = '';
    if (!removeBorder && borderColor) {
      borderGlow = ', 0px 0px 0px 2px ' + borderColor;
    }

    var css = '' +
      '/* Сама карточка в Lampa остается прозрачной, низ и название фильма НЕ трогаем */\n' +
      '.card,\n' +
      '.poster,\n' +
      '.card--collection,\n' +
      '.card--wide,\n' +
      '.card--torrent,\n' +
      '.card-episode {\n' +
      '  background: transparent !important;\n' +
      '  box-shadow: none !important;\n' +
      '  border-radius: 0 !important;\n' +
      '  overflow: visible !important;\n' +
      '}\n\n' +
      '/* Стиль Uiverse накладывается строго на ПОСТЕР (.card__view) */\n' +
      '.card__view,\n' +
      '.poster__view {\n' +
      '  border-radius: ' + radiusIdle + ' !important;\n' +
      '  background: rgb(45, 45, 45) !important;\n' +
      '  box-shadow: 0px 0px 10px 5px rgba(0, 0, 0, 0.705) !important;\n' +
      '  overflow: hidden !important;\n' +
      '  transition: transform ' + duration + ' cubic-bezier(0.2, 0.9, 0.2, 1),\n' +
      '              border-radius ' + duration + ' ease,\n' +
      '              background-color ' + duration + ' ease,\n' +
      '              box-shadow ' + duration + ' ease !important;\n' +
      '  transform-origin: center center !important;\n' +
      '}\n\n' +
      '/* Картинка внутри постера идеально наследует скругление */\n' +
      '.card__view img,\n' +
      '.card__view .card__img,\n' +
      '.card__view > div,\n' +
      '.poster__view img,\n' +
      '.poster__view .poster__img,\n' +
      '.poster__view > div {\n' +
      '  border-radius: inherit !important;\n' +
      '  overflow: hidden !important;\n' +
      '}\n\n' +
      '/* Эффект Uiverse при фокусе с пульта ТВ или наведении мыши на ПК */\n' +
      '.card.focus .card__view,\n' +
      '.poster.focus .poster__view,\n' +
      '.card--collection.focus .card__view,\n' +
      '.card--wide.focus .card__view,\n' +
      '.card--torrent.focus .card__view,\n' +
      '.card-episode.focus .card__view,\n' +
      '.card:hover .card__view,\n' +
      '.poster:hover .poster__view,\n' +
      '.card--collection:hover .card__view,\n' +
      '.card--wide:hover .card__view,\n' +
      '.card--torrent:hover .card__view,\n' +
      '.card-episode:hover .card__view {\n' +
      '  border-radius: ' + radiusFocus + ' !important;\n' +
      '  cursor: pointer !important;\n' +
      '  transform: scale(' + scale + ') !important;\n' +
      '  box-shadow: 0px 0px 10px 5px rgba(0, 0, 0, 0.705)' + borderGlow + ' !important;\n' +
      '  background: rgb(0, 0, 0) !important;\n' +
      '  z-index: 99 !important;\n' +
      '}\n';

    if (removeBorder) {
      css += '\n/* Отключение системной белой обводки Lampa */\n' +
        '.card.focus .card__view::before,\n' +
        '.card.focus .card__view::after,\n' +
        '.poster.focus .poster__view::before,\n' +
        '.poster.focus .poster__view::after {\n' +
        '  display: none !important;\n' +
        '  content: none !important;\n' +
        '  border: 0 !important;\n' +
        '  box-shadow: none !important;\n' +
        '}\n\n' +
        '.card.focus .card__view,\n' +
        '.poster.focus .poster__view {\n' +
        '  border: 0 !important;\n' +
        '  outline: 0 !important;\n' +
        '}\n';
    }

    var styleId = 'card-zoom-uiverse-css';
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

  function initSettings() {
    var lang = Lampa.Storage.get('language', 'ru');

    var i18n = {
      'en': {
        'zoom_title': 'Uiverse Cards (Zoom & Shadow)',
        'zoom_scale': 'Card Scale (Zoom)',
        'zoom_duration': 'Animation Speed',
        'zoom_radius': 'Border Radius',
        'zoom_remove_border': 'Remove System Border',
        'zoom_border_color': 'Border Glow Color',
        's_100': 'Disabled (1.0x)',
        's_105': 'Small (1.05x)',
        's_108': 'Medium (1.08x)',
        's_112': 'Large (1.12x)',
        's_115': 'Extra Large (1.15x)',
        's_120': 'Uiverse Standard (1.20x)',
        's_125': 'Max (1.25x)',
        'd_02': 'Fast (0.2s)',
        'd_03': 'Normal (0.3s)',
        'd_04': 'Uiverse Standard (0.4s)',
        'd_05': 'Smooth (0.5s)',
        'd_08': 'Very Smooth (0.8s)',
        'r_none': 'No radius (0px)',
        'r_small': 'Small (6px -> 10px)',
        'r_std': 'Uiverse Standard (10px -> 15px)',
        'r_large': 'Large (14px -> 20px)',
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
        'c_pink': 'Pink'
      },
      'ru': {
        'zoom_title': 'Карточки Uiverse (Масштаб и Тень)',
        'zoom_scale': 'Вариация масштаба (Scale)',
        'zoom_duration': 'Скорость анимации',
        'zoom_radius': 'Скругление углов постера',
        'zoom_remove_border': 'Выключить системную обводку',
        'zoom_border_color': 'Цвет контура/свечения',
        's_100': 'Отключено (1.0x)',
        's_105': 'Малое (1.05x)',
        's_108': 'Умеренное (1.08x)',
        's_112': 'Заметное (1.12x)',
        's_115': 'Большое (1.15x)',
        's_120': 'Uiverse эталон (1.20x)',
        's_125': 'Максимальное (1.25x)',
        'd_02': 'Быстро (0.2s)',
        'd_03': 'Нормально (0.3s)',
        'd_04': 'Uiverse эталон (0.4s)',
        'd_05': 'Плавно (0.5s)',
        'd_08': 'Очень плавно (0.8s)',
        'r_none': 'Без скругления (0px)',
        'r_small': 'Малое (6px → 10px)',
        'r_std': 'Uiverse эталон (10px → 15px)',
        'r_large': 'Большое (14px → 20px)',
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
        'c_pink': 'Розовый'
      },
      'uk': {
        'zoom_title': 'Картки Uiverse (Масштаб і Тінь)',
        'zoom_scale': 'Варіація масштабу (Scale)',
        'zoom_duration': 'Швидкість анімації',
        'zoom_radius': 'Заокруглення кутів постера',
        'zoom_remove_border': 'Вимкнути системну обводку',
        'zoom_border_color': 'Колір контуру/світіння',
        's_100': 'Вимкнено (1.0x)',
        's_105': 'Мале (1.05x)',
        's_108': 'Помірне (1.08x)',
        's_112': 'Помітне (1.12x)',
        's_115': 'Велике (1.15x)',
        's_120': 'Uiverse еталон (1.20x)',
        's_125': 'Максимальне (1.25x)',
        'd_02': 'Швидко (0.2s)',
        'd_03': 'Нормально (0.3s)',
        'd_04': 'Uiverse еталон (0.4s)',
        'd_05': 'Плавно (0.5s)',
        'd_08': 'Дуже плавно (0.8s)',
        'r_none': 'Без заокруглення (0px)',
        'r_small': 'Мале (6px → 10px)',
        'r_std': 'Uiverse еталон (10px → 15px)',
        'r_large': 'Велике (14px → 20px)',
        'c_white': 'Білий',
        'c_lgrey': 'Світло-сірий',
        'c_dgrey': 'Темно-сірий',
        'c_black': 'Чорний',
        'c_lblue': 'Світло-синій',
        'c_blue': 'Синій',
        'c_dblue': 'Темно-синій',
        'c_lred': 'Світло-червоний',
        'c_red': 'Червоний',
        'c_dred': 'Темно-червоний',
        'c_lgreen': 'Світло-зелений',
        'c_green': 'Зелений',
        'c_dgreen': 'Темно-зелений',
        'c_yellow': 'Жовтий',
        'c_orange': 'Помаранчевий',
        'c_purple': 'Фіолетовий',
        'c_cyan': 'Блакитний',
        'c_pink': 'Рожевий'
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
      component: 'card_zoom_uiverse_plugin',
      name: t('zoom_title'),
      icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>'
    });

    // Вариации увеличения (Scale)
    Lampa.SettingsApi.addParam({
      component: 'card_zoom_uiverse_plugin',
      param: {
        name: 'zoom_scale',
        type: 'select',
        default: '1.20',
        values: {
          '1.00': t('s_100'),
          '1.05': t('s_105'),
          '1.08': t('s_108'),
          '1.12': t('s_112'),
          '1.15': t('s_115'),
          '1.20': t('s_120'),
          '1.25': t('s_125')
        }
      },
      field: {
        name: t('zoom_scale')
      },
      onChange: function () {
        injectCSS();
      }
    });

    // Скорость анимации
    Lampa.SettingsApi.addParam({
      component: 'card_zoom_uiverse_plugin',
      param: {
        name: 'zoom_duration',
        type: 'select',
        default: '0.4s',
        values: {
          '0.2s': t('d_02'),
          '0.3s': t('d_03'),
          '0.4s': t('d_04'),
          '0.5s': t('d_05'),
          '0.8s': t('d_08')
        }
      },
      field: {
        name: t('zoom_duration')
      },
      onChange: function () {
        injectCSS();
      }
    });

    // Скругление углов постера
    Lampa.SettingsApi.addParam({
      component: 'card_zoom_uiverse_plugin',
      param: {
        name: 'zoom_radius',
        type: 'select',
        default: '10px',
        values: {
          '0px': t('r_none'),
          '6px': t('r_small'),
          '10px': t('r_std'),
          '14px': t('r_large')
        }
      },
      field: {
        name: t('zoom_radius')
      },
      onChange: function () {
        injectCSS();
      }
    });

    // Отключение белой обводки Лампы
    Lampa.SettingsApi.addParam({
      component: 'card_zoom_uiverse_plugin',
      param: {
        name: 'zoom_remove_border',
        type: 'trigger',
        default: true
      },
      field: {
        name: t('zoom_remove_border')
      },
      onChange: function () {
        injectCSS();
      }
    });

    // Цвет контура/подсветки
    Lampa.SettingsApi.addParam({
      component: 'card_zoom_uiverse_plugin',
      param: {
        name: 'zoom_border_color',
        type: 'select',
        default: '#ffffff',
        values: {
          '#ffffff': cBox('#ffffff', 'c_white'),
          '#cccccc': cBox('#cccccc', 'c_lgrey'),
          '#666666': cBox('#666666', 'c_dgrey'),
          '#000000': cBox('#000000', 'c_black'),
          '#64b5f6': cBox('#64b5f6', 'c_lblue'),
          '#2196f3': cBox('#2196f3', 'c_blue'),
          '#0d47a1': cBox('#0d47a1', 'c_dblue'),
          '#e57373': cBox('#e57373', 'c_lred'),
          '#f44336': cBox('#f44336', 'c_red'),
          '#b71c1c': cBox('#b71c1c', 'c_dred'),
          '#81c784': cBox('#81c784', 'c_lgreen'),
          '#4caf50': cBox('#4caf50', 'c_green'),
          '#1b5e20': cBox('#1b5e20', 'c_dgreen'),
          '#ffeb3b': cBox('#ffeb3b', 'c_yellow'),
          '#ff9800': cBox('#ff9800', 'c_orange'),
          '#9c27b0': cBox('#9c27b0', 'c_purple'),
          '#00bcd4': cBox('#00bcd4', 'c_cyan'),
          '#e91e63': cBox('#e91e63', 'c_pink')
        }
      },
      field: {
        name: t('zoom_border_color')
      },
      onChange: function () {
        injectCSS();
      }
    });
  }

  function bootstrap() {
    if (window.__card_zoom_uiverse_plugin_loaded) return;
    window.__card_zoom_uiverse_plugin_loaded = true;

    initSettings();
    injectCSS();

    if (window.Lampa && Lampa.Storage && Lampa.Storage.listener) {
      Lampa.Storage.listener.follow('change', function (e) {
        if (e.name && (e.name === 'zoom_scale' || e.name === 'zoom_duration' || e.name === 'zoom_radius' || e.name === 'zoom_remove_border' || e.name === 'zoom_border_color')) {
          injectCSS();
        }
      });
    }

    console.log('[Card Zoom Uiverse Plugin] v2.1 — Loaded');
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
