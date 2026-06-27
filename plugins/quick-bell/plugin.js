(function () {
  'use strict';

  if (window.__HUNDRED_PLUGIN_QUICK_BELL__) return;
  window.__HUNDRED_PLUGIN_QUICK_BELL__ = true;

  var icon = '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 22a2.5 2.5 0 0 0 2.45-2h-4.9A2.5 2.5 0 0 0 12 22Zm7-6v-5a7 7 0 0 0-14 0v5l-2 2v1h18v-1l-2-2Z"/></svg>';

  function show() {
    if (window.Lampa && Lampa.Noty && Lampa.Noty.show) Lampa.Noty.show('Быстрый колокольчик работает');
  }

  function addButton() {
    if (!window.Lampa || !Lampa.Menu || !Lampa.Menu.addButton) return false;
    if (window.$ && !$('.menu__list').length) return false;

    try {
      Lampa.Menu.addButton(icon, 'Колокольчик', show);
    } catch (e) {
      return false;
    }

    return true;
  }

  var timer = setInterval(function () {
    if (addButton()) clearInterval(timer);
  }, 500);

  setTimeout(function () {
    clearInterval(timer);
  }, 30000);
})();
