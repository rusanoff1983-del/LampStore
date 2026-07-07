(function () {
  'use strict';

  /* ================================================================
   * Card Zoom Effect Plugin for Lampa
   * Плавное увеличение постера внутри карточки при фокусе
   * + опция отключения белой рамки и визуальная палитра цветов
   * ================================================================ */

  function injectCSS() {
    var scale = Lampa.Storage.get('zoom_scale', '1.08');
    var duration = Lampa.Storage.get('zoom_duration', '0.3s');
    var radius = Lampa.Storage.get('zoom_radius', '8px');
    var removeBorder = Lampa.Storage.get('zoom_remove_border', false);
    var borderColor = Lampa.Storage.get('zoom_border_color', '#ffffff');

    var css = '' +
    '/* Карточка и view остаются на месте с обрезкой */\n' +
    '.card,\n' +
    '.poster,\n' +
    '.selector {\n' +
    '  border-radius: ' + radius + ' !important;\n' +
    '}\n' +
    '\n' +
    '.card__view,\n' +
    '.poster__view {\n' +
    '  overflow: visible !important;\n' +
    '  border-radius: ' + radius + ' !important;\n' +
    '  transition: transform ' + duration + ' cubic-bezier(0.2, 0.9, 0.2, 1) !important;\n' +
    '  transform-origin: center center !important;\n' +
    '}\n' +
    '\n' +
    '/* При фокусе увеличивается весь view вместе с картинкой */\n' +
    '.card.focus .card__view,\n' +
    '.poster.focus .poster__view {\n' +
    '  transform: scale(' + scale + ') !important;\n' +
    '  z-index: 10 !important;\n' +
    '}\n';

    if (removeBorder) {
      css += '' +
      '/* рамка через псевдоэлементы */\n' +
      '.card.focus .card__view::before,\n' +
      '.card.focus .card__view::after,\n' +
      '.selector.focus .card__view::before,\n' +
      '.selector.focus .card__view::after {\n' +
      '  display: none !important;\n' +
      '  content: none !important;\n' +
      '  border: 0 !important;\n' +
      '  box-shadow: none !important;\n' +
      '}\n' +
      '\n' +
      '/* на всякий — если где-то ещё border */\n' +
      '.card.focus .card__view,\n' +
      '.selector.focus .card__view {\n' +
      '  border: 0 !important;\n' +
      '  outline: 0 !important;\n' +
      '  box-shadow: none !important;\n' +
      '}\n';
    } else if (borderColor !== '#ffffff') {
      css += '' +
      '.card.focus .card__view,\n' +
      '.selector.focus .card__view,\n' +
      '.card.focus .card__view::before,\n' +
      '.card.focus .card__view::after,\n' +
      '.selector.focus .card__view::before,\n' +
      '.selector.focus .card__view::after {\n' +
      '  border-color: ' + borderColor + ' !important;\n' +
      '}\n';
    }

    var styleId = 'card-zoom-plugin-css';
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
        'zoom_title': 'Card Zoom Effect',
        'zoom_scale': 'Zoom Scale',
        'zoom_duration': 'Animation Speed',
        'zoom_radius': 'Corner Radius',
        'zoom_remove_border': 'Remove White Border',
        'zoom_border_color': 'Border Color',
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
        'none': 'None',
        'tiny': 'Tiny (1.03x)',
        'small': 'Small (1.05x)',
        'medium': 'Medium (1.08x)',
        'large': 'Large (1.12x)',
        'xlarge': 'Extra Large (1.15x)',
        'very_fast': 'Very Fast (0.15s)',
        'fast': 'Fast (0.2s)',
        'normal': 'Normal (0.3s)',
        'slow': 'Slow (0.5s)',
        'very_slow': 'Very Slow (0.8s)',
        'ultra_slow': 'Ultra Slow (1.2s)',
        'super_slow': 'Super Slow (1.5s)',
        'mega_slow': 'Mega Slow (2.0s)',
        'r_none': 'Square (0px)',
        'r_small': 'Small (4px)',
        'r_medium': 'Medium (8px)',
        'r_large': 'Large (12px)',
        'r_xlarge': 'X-Large (16px)',
        'r_xxlarge': 'XX-Large (24px)'
      },
      'ru': {
        'zoom_title': 'Увеличение Карточек',
        'zoom_scale': 'Масштаб увеличения',
        'zoom_duration': 'Скорость анимации',
        'zoom_radius': 'Закругление углов',
        'zoom_remove_border': 'Выключить обводку',
        'zoom_border_color': 'Цвет обводки',
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
        'none': 'Отключено',
        'tiny': 'Минимальное (1.03x)',
        'small': 'Малое (1.05x)',
        'medium': 'Среднее (1.08x)',
        'large': 'Большое (1.12x)',
        'xlarge': 'Очень большое (1.15x)',
        'very_fast': 'Очень быстро (0.15s)',
        'fast': 'Быстро (0.2s)',
        'normal': 'Нормально (0.3s)',
        'slow': 'Медленно (0.5s)',
        'very_slow': 'Очень медленно (0.8s)',
        'ultra_slow': 'Ультра медленно (1.2s)',
        'super_slow': 'Супер медленно (1.5s)',
        'mega_slow': 'Мега медленно (2.0s)',
        'r_none': 'Квадратные (0px)',
        'r_small': 'Малые (4px)',
        'r_medium': 'Средние (8px)',
        'r_large': 'Большие (12px)',
        'r_xlarge': 'Очень большие (16px)',
        'r_xxlarge': 'Максимальные (24px)'
      },
      'uk': {
        'zoom_title': 'Збільшення Карток',
        'zoom_scale': 'Масштаб збільшення',
        'zoom_duration': 'Швидкість анімації',
        'zoom_radius': 'Заокруглення кутів',
        'zoom_remove_border': 'Вимкнути обводку',
        'zoom_border_color': 'Колір обводки',
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
        'c_pink': 'Рожевий',
        'none': 'Вимкнено',
        'tiny': 'Мінімальне (1.03x)',
        'small': 'Мале (1.05x)',
        'medium': 'Середнє (1.08x)',
        'large': 'Велике (1.12x)',
        'xlarge': 'Дуже велике (1.15x)',
        'very_fast': 'Дуже швидко (0.15s)',
        'fast': 'Швидко (0.2s)',
        'normal': 'Нормально (0.3s)',
        'slow': 'Повільно (0.5s)',
        'very_slow': 'Дуже повільно (0.8s)',
        'ultra_slow': 'Ультра повільно (1.2s)',
        'super_slow': 'Супер повільно (1.5s)',
        'mega_slow': 'Мега повільно (2.0s)',
        'r_none': 'Квадратні (0px)',
        'r_small': 'Малі (4px)',
        'r_medium': 'Середні (8px)',
        'r_large': 'Великі (12px)',
        'r_xlarge': 'Дуже великі (16px)',
        'r_xxlarge': 'Максимальні (24px)'
      }
    };

    function t(key) {
      var dict = i18n[lang] || i18n['ru'];
      return dict[key] || i18n['en'][key] || key;
    }

    // Вспомогательная функция для генерации HTML-квадратика с цветом
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
        name: 'zoom_scale',
        type: 'select',
        default: '1.08',
        values: {
          '1.0': t('none'),
          '1.03': t('tiny'),
          '1.05': t('small'),
          '1.08': t('medium'),
          '1.12': t('large'),
          '1.15': t('xlarge')
        }
      },
      field: {
        name: t('zoom_scale')
      },
      onChange: function () {
        injectCSS();
      }
    });

    Lampa.SettingsApi.addParam({
      component: 'card_zoom_plugin',
      param: {
        name: 'zoom_duration',
        type: 'select',
        default: '0.3s',
        values: {
          '0.15s': t('very_fast'),
          '0.2s': t('fast'),
          '0.3s': t('normal'),
          '0.5s': t('slow'),
          '0.8s': t('very_slow'),
          '1.2s': t('ultra_slow'),
          '1.5s': t('super_slow'),
          '3.0s': t('mega_slow')
        }
      },
      field: {
        name: t('zoom_duration')
      },
      onChange: function () {
        injectCSS();
      }
    });

    Lampa.SettingsApi.addParam({
      component: 'card_zoom_plugin',
      param: {
        name: 'zoom_radius',
        type: 'select',
        default: '8px',
        values: {
          '0px': t('r_none'),
          '4px': t('r_small'),
          '8px': t('r_medium'),
          '12px': t('r_large'),
          '16px': t('r_xlarge'),
          '24px': t('r_xxlarge')
        }
      },
      field: {
        name: t('zoom_radius')
      },
      onChange: function () {
        injectCSS();
      }
    });

    Lampa.SettingsApi.addParam({
      component: 'card_zoom_plugin',
      param: {
        name: 'zoom_remove_border',
        type: 'trigger',
        default: false
      },
      field: {
        name: t('zoom_remove_border')
      },
      onChange: function () {
        injectCSS();
      }
    });

    // Настройка с визуальной палитрой тональностей
    Lampa.SettingsApi.addParam({
      component: 'card_zoom_plugin',
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
    if (window.__card_zoom_plugin_loaded) return;
    window.__card_zoom_plugin_loaded = true;

    initSettings();
    injectCSS();

    if (window.Lampa && Lampa.Storage && Lampa.Storage.listener) {
      Lampa.Storage.listener.follow('change', function (e) {
        if (e.name && (e.name === 'zoom_scale' || e.name === 'zoom_duration' || e.name === 'zoom_radius' || e.name === 'zoom_remove_border' || e.name === 'zoom_border_color')) {
          injectCSS();
        }
      });
    }

    console.log('[Card Zoom Plugin] v1.3 — Loaded (with visual color palette)');
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