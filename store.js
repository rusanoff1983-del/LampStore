(function () {
  'use strict';

  if (window.__HUNDRED_STORE_READY__) return;
  window.__HUNDRED_STORE_READY__ = true;

  /*
    100 мелочей — GitHub-магазин для Lampa

    Как работает:
    - пользователь ставит только этот store.js;
    - магазин смотрит папки на GitHub в CONFIG.pluginsPath;
    - каждая папка = один плагин;
    - в каждой папке достаточно plugin.js;
    - описание берётся из text.txt;
    - скриншот берётся из screenshot.png/jpg/webp;
    - иконка берётся из icon.png/jpg/webp;
    - добавил новую папку на GitHub — она появилась у всех в магазине.
  */

  var CONFIG = {
    owner: 'rusanoff1983-del',
    repo: 'LampStore',
    branch: 'main',
    pluginsPath: 'plugins',
    title: '100 мелочей'
  };

  var STORE_KEY = 'hundred_store_installed';
  var STORE_NAME = CONFIG.title;
  var ICON = '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c1.8 2.8 1.3 4.9.2 6.5-.8 1.2-1.9 2.2-2.7 3.5-.9 1.5-.6 3.5 1.2 4.2-.2-1.4.5-2.5 1.5-3.5.6 2 2.7 2.7 2.7 5.1 0 1.6-1.3 3-3 3-3.6 0-6.4-2.7-6.4-6.3 0-3.1 2.1-5.2 4.1-7.2C11.1 5.8 12.2 4.3 12 2Zm4.2 6.2c2.1 1.7 3.3 4.1 3.3 6.9 0 3.8-2.8 6.9-6.4 7.5 2.6-.6 4.6-2.8 4.6-5.6 0-2.2-1.1-3.8-2.3-5.1.5-1.1.8-2.3.8-3.7Z"/></svg>';

  function scriptBase() {
    var scripts = document.getElementsByTagName('script');
    var current = document.currentScript;

    if (!current && scripts.length) current = scripts[scripts.length - 1];

    var src = current && current.src ? current.src : '';
    return src ? src.replace(/\/[^\/]*$/, '/') : './';
  }

  var BASE = scriptBase();
  var GITHUB_API = 'https://api.github.com/repos/' + CONFIG.owner + '/' + CONFIG.repo + '/contents/';
  var RAW_BASE = 'https://cdn.jsdelivr.net/gh/' + CONFIG.owner + '/' + CONFIG.repo + '@' + CONFIG.branch + '/';

  function notice(text) {
    if (window.Lampa && Lampa.Noty && Lampa.Noty.show) return Lampa.Noty.show(text);
    if (window.Lampa && Lampa.Bell && Lampa.Bell.push) return Lampa.Bell.push({ text: text, icon: ICON });
    console.log('[100 мелочей]', text);
  }

  function storageGet(key, fallback) {
    try {
      if (window.Lampa && Lampa.Storage && Lampa.Storage.get) return Lampa.Storage.get(key, fallback);
    } catch (e) {}

    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function storageSet(key, value) {
    try {
      if (window.Lampa && Lampa.Storage && Lampa.Storage.set) return Lampa.Storage.set(key, value);
    } catch (e) {}

    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {}
  }

  function normalizeInstalled(value) {
    if (!value) return {};
    if (Array.isArray(value)) {
      var map = {};
      value.forEach(function (id) { map[id] = true; });
      return map;
    }
    return value;
  }

  function installedMap() {
    return normalizeInstalled(storageGet(STORE_KEY, {}));
  }

  function saveInstalled(map) {
    storageSet(STORE_KEY, map || {});
  }

  function isInstalled(id) {
    return !!installedMap()[id];
  }

  function resolveUrl(url) {
    if (!url) return '';
    if (/^https?:\/\//i.test(url)) return url;
    try {
      return new URL(url, BASE).toString();
    } catch (e) {
      return BASE + url.replace(/^\.\//, '');
    }
  }

  function loadScript(url, done) {
    url = resolveUrl(url);
    if (!url) return done && done(false);

    if (window.Lampa && Lampa.Utils && Lampa.Utils.putScriptAsync) {
      return Lampa.Utils.putScriptAsync([url], function () {
        if (done) done(true);
      }, function () {
        if (done) done(false);
      });
    }

    var script = document.createElement('script');
    script.src = url;
    script.onload = function () { if (done) done(true); };
    script.onerror = function () { if (done) done(false); };
    document.head.appendChild(script);
  }

  function requestJson(url, done, fail) {
    if (window.$ && $.ajax) {
      return $.ajax({
        url: url,
        dataType: 'json',
        cache: false,
        success: function (data) { done(data); },
        error: function () { if (fail) fail(); }
      });
    }

    fetch(url).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    }).then(done).catch(function () {
      if (fail) fail();
    });
  }

  function requestText(url, done, fail) {
    if (window.$ && $.ajax) {
      return $.ajax({
        url: url,
        dataType: 'text',
        cache: false,
        success: function (data) { done(data || ''); },
        error: function () { if (fail) fail(); }
      });
    }

    fetch(url).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.text();
    }).then(done).catch(function () {
      if (fail) fail();
    });
  }

  function rawUrl(path) {
    return RAW_BASE + String(path || '').replace(/^\/+/, '');
  }

  function folderApiUrl(path) {
    return GITHUB_API + encodeURIComponent(path).replace(/%2F/g, '/') + '?ref=' + encodeURIComponent(CONFIG.branch) + '&t=' + Date.now();
  }

  function prettyName(name) {
    return String(name || '')
      .replace(/[-_]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\b\w/g, function (s) { return s.toUpperCase(); });
  }

  function defaultPlugin(folder) {
    return {
      id: folder.name,
      name: prettyName(folder.name),
      version: '1.0.0',
      author: '',
      category: 'Плагины',
      description: '',
      icon: '',
      screenshots: [],
      file: 'plugin.js',
      folder: folder.path,
      url: rawUrl(folder.path + '/plugin.js')
    };
  }

  function pickFile(files, names) {
    var lower = {};
    (files || []).forEach(function (file) {
      lower[String(file.name || '').toLowerCase()] = file;
    });

    for (var i = 0; i < names.length; i++) {
      var found = lower[String(names[i]).toLowerCase()];
      if (found) return found;
    }

    return null;
  }

  function extractTitleAndDescription(text, fallbackName) {
    text = String(text || '').replace(/\r/g, '').trim();

    if (!text) {
      return {
        name: fallbackName,
        description: ''
      };
    }

    var lines = text.split('\n').map(function (line) {
      return line.trim();
    }).filter(Boolean);

    if (!lines.length) {
      return {
        name: fallbackName,
        description: ''
      };
    }

    return {
      name: lines[0].replace(/^#\s*/, '') || fallbackName,
      description: lines.slice(1).join('\n').trim() || lines[0]
    };
  }

  function loadPluginFolder(folder, done) {
    requestJson(folderApiUrl(folder.path), function (files) {
      files = files || [];

      var pluginFile = pickFile(files, ['plugin.js', 'index.js', 'main.js']);
      var textFile = pickFile(files, ['text.txt', 'description.txt', 'readme.txt', 'README.md', 'readme.md']);
      var iconFile = pickFile(files, ['icon.png', 'icon.jpg', 'icon.jpeg', 'icon.webp']);
      var screenFile = pickFile(files, [
        'screenshot.png',
        'screenshot.jpg',
        'screenshot.jpeg',
        'screenshot.webp',
        'screen.png',
        'screen.jpg',
        'preview.png',
        'preview.jpg'
      ]);

      if (!pluginFile) return done(null);

      var plugin = defaultPlugin(folder);
      plugin.file = pluginFile.name;
      plugin.url = rawUrl(folder.path + '/' + pluginFile.name);

      if (iconFile) plugin.icon = rawUrl(folder.path + '/' + iconFile.name);
      if (screenFile) plugin.screenshots = [rawUrl(folder.path + '/' + screenFile.name)];

      if (!textFile) return done(plugin);

      requestText(rawUrl(folder.path + '/' + textFile.name) + '?t=' + Date.now(), function (text) {
        var parsed = extractTitleAndDescription(text, plugin.name);
        plugin.name = parsed.name;
        plugin.description = parsed.description;
        done(plugin);
      }, function () {
        done(plugin);
      });
    }, function () {
      done(null);
    });
  }

  function loadCatalog(done) {
    if (CONFIG.owner === 'YOUR_GITHUB_LOGIN' || CONFIG.repo === 'YOUR_REPO_NAME') {
      done({
          name: STORE_NAME,
          plugins: [
          Object.assign(defaultPlugin({ name: 'hello', path: 'plugins/hello' }), {
            name: 'Проверка магазина',
            description: 'Локальный пример. Замени CONFIG.owner и CONFIG.repo в store.js на свой GitHub.',
            category: 'Тест',
            url: BASE + 'plugins/hello/plugin.js'
          }),
          Object.assign(defaultPlugin({ name: 'soft-panel', path: 'plugins/soft-panel' }), {
            name: 'Мягкая панель',
            description: 'Локальный пример CSS-плагина.',
            category: 'Интерфейс',
            url: BASE + 'plugins/soft-panel/plugin.js'
          }),
          Object.assign(defaultPlugin({ name: 'quick-bell', path: 'plugins/quick-bell' }), {
            name: 'Быстрый колокольчик',
            description: 'Локальный пример пункта меню.',
            category: 'Инструменты',
            url: BASE + 'plugins/quick-bell/plugin.js'
          })
        ]
      });
      return;
    }

    requestJson(folderApiUrl(CONFIG.pluginsPath), function (items) {
      var folders = (items || []).filter(function (item) {
        return item.type === 'dir';
      });

      var plugins = [];
      var left = folders.length;

      if (!left) return done({ name: STORE_NAME, plugins: [] });

      folders.forEach(function (folder) {
        loadPluginFolder(folder, function (plugin) {
          if (plugin) plugins.push(plugin);
          left--;

          if (left === 0) {
            plugins.sort(function (a, b) {
              return String(a.name).localeCompare(String(b.name));
            });

            done({ name: STORE_NAME, plugins: plugins });
          }
        });
      });
    }, function () {
      done({ name: STORE_NAME, plugins: [] });
    });
  }

  function install(plugin, silent) {
    var map = installedMap();
    map[plugin.id] = true;
    saveInstalled(map);

    loadScript(plugin.url, function (ok) {
      if (!silent) notice(ok ? 'Установлено: ' + plugin.name : 'Не загрузилось: ' + plugin.name);
    });
  }

  function remove(plugin) {
    var map = installedMap();
    delete map[plugin.id];
    saveInstalled(map);
    notice('Удалено из автозагрузки: ' + plugin.name + '. Полностью исчезнет после перезапуска Lampa.');
  }

  function showPlugin(plugin) {
    var installed = isInstalled(plugin.id);
    var items = [
      {
        title: installed ? 'Переустановить / обновить' : 'Установить',
        subtitle: plugin.url,
        action: 'install'
      },
      {
        title: installed ? 'Удалить из автозагрузки' : 'Не установлено',
        subtitle: installed ? 'После перезапуска Lampa плагин не загрузится' : 'Сначала установи плагин',
        action: 'remove',
        disabled: !installed
      },
      {
        title: 'Описание',
        subtitle: plugin.description || 'Без описания',
        action: 'info'
      },
      {
        title: 'Ссылка на JS',
        subtitle: plugin.url,
        action: 'url'
      }
    ];

    Lampa.Select.show({
      title: plugin.name + ' v' + (plugin.version || '1.0'),
      items: items,
      onSelect: function (selected) {
        var item = selected.item || selected;
        if (item.disabled) return;
        if (item.action === 'install') return install(plugin);
        if (item.action === 'remove') return remove(plugin);
        if (item.action === 'info') return notice(plugin.description || 'Без описания');
        if (item.action === 'url') return notice(plugin.url || 'Ссылки нет');
      },
      onBack: function () {
        openStore();
      }
    });
  }

  function openStore() {
    loadCatalog(function (catalog) {
      var plugins = catalog.plugins || [];

      if (!plugins.length) {
        notice('Каталог пустой или не загрузился');
        return;
      }

      var items = plugins.map(function (plugin) {
        var mark = isInstalled(plugin.id) ? '✓ ' : '';
        return {
          title: mark + plugin.name,
          subtitle: (plugin.category || 'Плагин') + ' · ' + (plugin.description || plugin.url || ''),
          plugin: plugin
        };
      });

      Lampa.Select.show({
        title: (catalog.name || STORE_NAME) + ' · магазин',
        items: items,
        onSelect: function (selected) {
          showPlugin((selected.item || selected).plugin);
        },
        onBack: function () {
          if (Lampa.Controller && Lampa.Controller.toggle) Lampa.Controller.toggle('content');
        }
      });
    });
  }

  function autoload() {
    loadCatalog(function (catalog) {
      var map = installedMap();
      (catalog.plugins || []).forEach(function (plugin) {
        if (map[plugin.id]) install(plugin, true);
      });
    });
  }

  function addMenu() {
    if (!window.Lampa || !document || !document.querySelector) return false;

    var menu = document.querySelector('.menu__list');
    if (!menu) return false;
    if (document.querySelector('.menu__item[data-hundred-store="1"]')) return true;

    try {
      var item = document.createElement('li');
      item.className = 'menu__item selector';
      item.setAttribute('data-hundred-store', '1');
      item.innerHTML = '<div class="menu__ico">' + ICON + '</div><div class="menu__text">' + STORE_NAME + '</div>';

      item.addEventListener('hover:enter', function () {
        openStore();
      });

      item.addEventListener('click', function () {
        openStore();
      });

      menu.appendChild(item);
    } catch (e) {
      return false;
    }

    return true;
  }

  function init() {
    var timer = setInterval(function () {
      if (addMenu()) {
        clearInterval(timer);
        autoload();
        notice(STORE_NAME + ': магазин подключен');
      }
    }, 500);

    setTimeout(function () {
      clearInterval(timer);
    }, 30000);
  }

  init();
})();
