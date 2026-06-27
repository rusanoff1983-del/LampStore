(function () {
  'use strict';

  if (window.__HUNDRED_PLUGIN_HELLO__) return;
  window.__HUNDRED_PLUGIN_HELLO__ = true;

  function show(text) {
    if (window.Lampa && Lampa.Noty && Lampa.Noty.show) Lampa.Noty.show(text);
    else console.log(text);
  }

  show('Проверка магазина: JS-плагин загрузился');
})();
