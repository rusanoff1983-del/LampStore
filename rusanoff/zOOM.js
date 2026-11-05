(function () {
  'use strict';

  /* ================================================================
   * Card Zoom & Style Plugin for Lampa (Uiverse Edition)
   * Автор: rusanoff
   * ================================================================ */

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
    '/* Базовый стиль постера: ровные скруглённые углы и мягкая тень */\n' +
    '.card__view,\n' +
    '.poster__view {\n' +
    '  border-radius: ' + radius + ' !important;\n' +
    '  overflow: hidden !important;\n' +
    '  box-shadow: 0px 0px 10px 4px rgba(0, 0, 0, 0.6) !important;\n' +
    '  transition: transform ' + duration + ' cubic-bezier(0.2, 0.9, 0.2, 1), box-shadow ' + duration + ' ease !important;\n' +
    '  transform-origin: center center !important;\n' +
    '}\n\n' +
    '/* Картинка внутри постера строго наследует радиус */\n' +
    '.card__img,\n' +
    '.card__view img,\n' +
    '.poster__img,\n' +
    '.poster__view img {\n' +
    '  border-radius: inherit !important;\n' +
    '  overflow: hidden !important;\n' +
    '}\n\n' +
    '/* Скрываем старую прямоугольную рамку Lampa */\n' +
    '.card.focus .card__view::before,\n' +
    '.card.focus .card__view::after,\n' +
    '.selector.focus .card__view::before,\n' +
    '.selector.focus .card__view::after {\n' +
    '  display: none !important;\n' +
    '  content: none !important;\n' +
    '  border: 0 !important;\n' +
    '}\n\n' +
    '/* Эффект Uiverse в фокусе: чистый зум + равномерный контур фокуса */\n' +
    '.card.focus .card__view,\n' +
    '.poster.focus .poster__view {\n' +
    '  transform: scale(' + scale + ') !important;\n' +
    '  box-shadow: 0px 0px 14px 6px rgba(0, 0, 0, 0.85)' + focusBorder + ' !important;\n' +
    '  z-index: 10 !important;\n' +
    '}\n';

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
    if (window.__card_zoom_settings_added) return;
    window.__card_zoom_settings_added = true;

    var lang = Lampa.Storage.get('language', 'ru');

    var i18n = {
      'en': {
        'zoom_title': 'Uiverse Cards (Zoom & Quality)',
        'zoom_poster_quality': 'Poster Resolution (TMDB)',
        'q_def': 'Default Lampa',
        'q_w500': 'High (w500)',
        'q_w780': 'Full HD (w780)',
        'q_orig': 'Original 4K (Ultra)',
        'zoom_scale': 'Zoom Scale',
        'zoom_duration': 'Animation Speed',
        'zoom_radius': 'Corner Radius',
        'zoom_remove_border': 'Remove Border',
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
        'zoom_title': 'Карточки Uiverse (Зум и Качество)',
        'zoom_poster_quality': 'Качество постеров (TMDB)',
        'q_def': 'Штатное Lampa',
        'q_w500': 'Высокое (w500)',
        'q_w780': 'Full HD (w780)',
        'q_orig': 'Оригинал 4K (Ultra)',
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
      },
      'uk': {
        'zoom_title': 'Картки Uiverse (Зум та Якість)',
        'zoom_poster_quality': 'Якість постерів (TMDB)',
        'q_def': 'Штатне Lampa',
        'q_w500': 'Висока (w500)',
        'q_w780': 'Full HD (w780)',
        'q_orig': 'Оригінал 4K (Ultra)',
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
        'none': 'Вимкнено (1.0x)',
        'tiny': 'Мінімальне (1.03x)',
        'small': 'Мале (1.05x)',
        'medium': 'Середнє (1.08x)',
        'large': 'Велике (1.12x)',
        'xlarge': 'Дуже велике (1.15x)',
        'uiverse': 'Uiverse (1.20x)',
        'max': 'Максимальне (1.25x)',
        'very_fast': 'Дуже швидко (0.15s)',
        'fast': 'Швидко (0.2s)',
        'normal': 'Нормально (0.3s)',
        'smooth': 'Плавно (0.4s)',
        'slow': 'Повільно (0.5s)',
        'very_slow': 'Дуже повільно (0.8s)',
        'r_none': 'Квадратні (0)',
        'r_small': 'Малі (0.3em)',
        'r_medium': 'Середні (0.6em)',
        'r_large': 'Великі (0.9em)',
        'r_xlarge': 'Сильні (1.3em)',
        'r_round': 'Круглі (1.8em)'
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

    // 1. Качество постеров TMDB
    Lampa.SettingsApi.addParam({
      component: 'card_zoom_plugin',
      param: {
        name: 'zoom_poster_quality',
        type: 'select',
        default: 'default',
        values: {
          'default': t('q_def'),
          'w500': t('q_w500'),
          'w780': t('q_w780'),
          'original': t('q_orig')
        }
      },
      field: {
        name: t('zoom_poster_quality')
      },
      onChange: function () {
        applyPosterQuality();
      }
    });

    // 2. Масштаб увеличения
    Lampa.SettingsApi.addParam({
      component: 'card_zoom_plugin',
      param: {
        name: 'zoom_scale',
        type: 'select',
        default: '1.15',
        values: {
          '1.0': t('none'),
          '1.03': t('tiny'),
          '1.05': t('small'),
          '1.08': t('medium'),
          '1.12': t('large'),
          '1.15': t('xlarge'),
          '1.20': t('uiverse'),
          '1.25': t('max')
        }
      },
      field: {
        name: t('zoom_scale')
      },
      onChange: function () {
        injectCSS();
      }
    });

    // 3. Скорость анимации
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
          '0.4s': t('smooth'),
          '0.5s': t('slow'),
          '0.8s': t('very_slow')
        }
      },
      field: {
        name: t('zoom_duration')
      },
      onChange: function () {
        injectCSS();
      }
    });

    // 4. Закругление углов
    Lampa.SettingsApi.addParam({
      component: 'card_zoom_plugin',
      param: {
        name: 'zoom_radius',
        type: 'select',
        default: '0.6em',
        values: {
          '0': t('r_none'),
          '0.3em': t('r_small'),
          '0.6em': t('r_medium'),
          '0.9em': t('r_large'),
          '1.3em': t('r_xlarge'),
          '1.8em': t('r_round')
        }
      },
      field: {
        name: t('zoom_radius')
      },
      onChange: function () {
        injectCSS();
      }
    });

    // 5. Выключить обводку
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

    // 6. Цвет обводки
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
    applyPosterQuality();

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

    console.log('[Card Style Plugin] Uiverse Clean Ready');
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
