(function () {
  'use strict';

  if (window.__HUNDRED_PLUGIN_SOFT_PANEL__) return;
  window.__HUNDRED_PLUGIN_SOFT_PANEL__ = true;

  var css = ''
    + '.menu__list .selector.focus,'
    + '.selectbox-item.focus,'
    + '.settings-param.focus{'
    + 'box-shadow:0 0 0 2px rgba(0,210,255,.55)!important;'
    + 'border-radius:12px!important;'
    + '}';

  var style = document.createElement('style');
  style.id = 'hundred-plugin-soft-panel-style';
  style.textContent = css;
  document.head.appendChild(style);

  if (window.Lampa && Lampa.Noty && Lampa.Noty.show) Lampa.Noty.show('Мягкая панель: стиль включен');
})();
