(function () {
  'use strict';

  if (window.__LAMPSTORE_READY__) return;
  window.__LAMPSTORE_READY__ = true;

  var STORE_URL = 'https://cdn.jsdelivr.net/gh/rusanoff1983-del/LampStore@main/extensions.json';
  var STORE_NAME = 'LampStore';

  var ICON = '<svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M12 2c1.8 2.8 1.3 4.9.2 6.5-.8 1.2-1.9 2.2-2.7 3.5-.9 1.5-.6 3.5 1.2 4.2-.2-1.4.5-2.5 1.5-3.5.6 2 2.7 2.7 2.7 5.1 0 1.6-1.3 3-3 3-3.6 0-6.4-2.7-6.4-6.3 0-3.1 2.1-5.2 4.1-7.2C11.1 5.8 12.2 4.3 12 2Z"/>' +
    '<path d="M16.2 8.2c2.1 1.7 3.3 4.1 3.3 6.9 0 3.8-2.8 6.9-6.4 7.5 2.6-.6 4.6-2.8 4.6-5.6 0-2.2-1.1-3.8-2.3-5.1.5-1.1.8-2.3.8-3.7Z"/>' +
    '</svg>';

  function translate() {
    try {
      if (Lampa.Lang && Lampa.Lang.add) {
        Lampa.Lang.add({
          lampstore_title: {
            ru: STORE_NAME,
            en: STORE_NAME,
            uk: STORE_NAME,
            be: STORE_NAME,
            zh: STORE_NAME,
            pt: STORE_NAME,
            bg: STORE_NAME,
            he: STORE_NAME
          }
        });
      }
    } catch (e) {}
  }

  function notify(text) {
    try {
      if (Lampa.Noty && Lampa.Noty.show) return Lampa.Noty.show(text);
    } catch (e) {}
    console.log('[LampStore]', text);
  }

  function addStoreButton() {
    try {
      if (!window.Lampa || !Lampa.Settings || !Lampa.Settings.main) return false;

      var main = Lampa.Settings.main();
      if (!main || !main.render) return false;

      var body = main.render();
      if (!body || !body.find) return false;

      if (!body.find('[data-component="lampstore"]').length) {
        var field =
          '<div class="settings-folder selector" data-component="lampstore" data-static="true">' +
            '<div class="settings-folder__icon">' + ICON + '</div>' +
            '<div class="settings-folder__name">' + STORE_NAME + '</div>' +
          '</div>';

        var more = body.find('[data-component="more"]');
        if (more.length) more.after(field);
        else body.append(field);

        if (main.update) main.update();
      }

      body.find('[data-component="lampstore"]').off('hover:enter.lampstore click.lampstore').on('hover:enter.lampstore click.lampstore', function () {
        if (Lampa.Extensions && Lampa.Extensions.show) {
          Lampa.Extensions.show({
            store: STORE_URL + '?v=' + Date.now(),
            with_installed: true
          });
        } else {
          notify('В этой Lampa нет встроенного магазина расширений');
        }
      });

      return true;
    } catch (e) {
      console.log('[LampStore] add button failed', e);
      return false;
    }
  }

  function init() {
    translate();

    try {
      if (Lampa.Settings && Lampa.Settings.listener) {
        Lampa.Settings.listener.follow('open', function (e) {
          if (e && e.name === 'main') addStoreButton();
        });
      }
    } catch (e) {}

    var timer = setInterval(function () {
      if (addStoreButton()) clearInterval(timer);
    }, 500);

    setTimeout(function () {
      clearInterval(timer);
    }, 30000);
  }

  if (window.appready) init();
  else {
    var wait = setInterval(function () {
      if (window.Lampa) {
        clearInterval(wait);
        init();
      }
    }, 300);

    setTimeout(function () {
      clearInterval(wait);
    }, 30000);
  }
})();
