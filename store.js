(function () {
  'use strict';

  if (window.__HUNDRED_STORE_READY__) return;
  window.__HUNDRED_STORE_READY__ = true;

  var CONFIG = {
    owner: 'rusanoff1983-del',
    repo: 'LampStore',
    branch: 'main',
    pluginsPath: 'plugins',
    linksPath: 'links',
    title: 'LampStore'
  };

  var STORE_KEY = 'hundred_store_installed_v2';
  var SETTINGS_COMPONENT = 'hundred_store_settings';
  var STORE_NAME = CONFIG.title;
  var RAW_BASE = 'https://cdn.jsdelivr.net/gh/' + CONFIG.owner + '/' + CONFIG.repo + '@' + CONFIG.branch + '/';
  var GITHUB_RAW_BASE = 'https://raw.githubusercontent.com/' + CONFIG.owner + '/' + CONFIG.repo + '/' + CONFIG.branch + '/';
  var GITHUB_API = 'https://api.github.com/repos/' + CONFIG.owner + '/' + CONFIG.repo + '/contents/';
  var ICON = '<svg width="38" height="38" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c1.8 2.8 1.3 4.9.2 6.5-.8 1.2-1.9 2.2-2.7 3.5-.9 1.5-.6 3.5 1.2 4.2-.2-1.4.5-2.5 1.5-3.5.6 2 2.7 2.7 2.7 5.1 0 1.6-1.3 3-3 3-3.6 0-6.4-2.7-6.4-6.3 0-3.1 2.1-5.2 4.1-7.2C11.1 5.8 12.2 4.3 12 2Zm4.2 6.2c2.1 1.7 3.3 4.1 3.3 6.9 0 3.8-2.8 6.9-6.4 7.5 2.6-.6 4.6-2.8 4.6-5.6 0-2.2-1.1-3.8-2.3-5.1.5-1.1.8-2.3.8-3.7Z"/></svg>';

  function notify(text) {
    if (window.Lampa && Lampa.Noty && Lampa.Noty.show) return Lampa.Noty.show(text);
    console.log('[LampStore]', text);
  }

  function rawUrl(path) {
    return RAW_BASE + String(path || '').replace(/^\/+/, '');
  }

  function rawUrlNoCache(path) {
    return rawUrl(path) + '?t=' + Date.now();
  }

  function githubRawUrlNoCache(path) {
    return GITHUB_RAW_BASE + String(path || '').replace(/^\/+/, '') + '?t=' + Date.now();
  }

  function githubApiUrl(path) {
    return GITHUB_API + encodeURIComponent(String(path || '').replace(/^\/+/, '')).replace(/%2F/g, '/') + '?ref=' + encodeURIComponent(CONFIG.branch) + '&t=' + Date.now();
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

  function installedMap() {
    var value = storageGet(STORE_KEY, {});
    if (!value) return {};

    if (Array.isArray(value)) {
      var map = {};
      value.forEach(function (id) { map[id] = true; });
      return map;
    }

    return value;
  }

  function saveInstalled(map) {
    storageSet(STORE_KEY, map || {});
  }

  function isInstalled(plugin) {
    var map = installedMap();
    if (map[plugin.id]) return true;

    try {
      if (window.Lampa && Lampa.Plugins && Lampa.Plugins.get) {
        return Lampa.Plugins.get().some(function (item) {
          return item && (item.url === plugin.url || item.link === plugin.url);
        });
      }
    } catch (e) {}

    return false;
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

    fetch(url).then(function (response) {
      if (!response.ok) throw new Error('HTTP ' + response.status);
      return response.json();
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

    fetch(url).then(function (response) {
      if (!response.ok) throw new Error('HTTP ' + response.status);
      return response.text();
    }).then(done).catch(function () {
      if (fail) fail();
    });
  }

  function loadScript(url, done) {
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

  function normalizePlugin(plugin) {
    plugin = plugin || {};

    var folder = plugin.folder || (CONFIG.pluginsPath + '/' + plugin.id);
    var item = {
      id: plugin.id || String(folder).split('/').pop(),
      name: plugin.name || plugin.title || String(folder).split('/').pop(),
      author: plugin.author || '@100melochey',
      description: plugin.description || plugin.descr || '',
      folder: folder,
      file: plugin.file || 'plugin.js',
      version: plugin.version || '1.0.0',
      category: plugin.category || 'Плагины',
      icon: plugin.icon || '',
      screenshots: plugin.screenshots || []
    };

    item.url = plugin.url || rawUrl(item.folder + '/' + item.file);

    if (item.icon && !/^https?:\/\//i.test(item.icon)) item.icon = rawUrl(item.folder + '/' + item.icon);

    item.screenshots = item.screenshots.map(function (screen) {
      return /^https?:\/\//i.test(screen) ? screen : rawUrl(item.folder + '/' + screen);
    });

    item.image = item.screenshots[0] || item.icon || '';

    return item;
  }

  function prettyName(name) {
    return String(name || '')
      .replace(/[-_]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\b\w/g, function (letter) { return letter.toUpperCase(); });
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

  function firstJs(files) {
    return (files || []).filter(function (file) {
      return file.type === 'file' && /\.js$/i.test(file.name || '');
    }).sort(function (a, b) {
      return String(a.name).localeCompare(String(b.name));
    })[0] || null;
  }

  function fileBaseName(url) {
    var clean = String(url || '').split('?')[0].split('#')[0];
    var name = clean.split('/').pop() || clean;
    return name.replace(/\.[^.]+$/, '');
  }

  function parseText(text, fallbackName) {
    var lines = String(text || '').replace(/\r/g, '').split('\n').map(function (line) {
      return line.trim();
    }).filter(Boolean);

    return {
      name: (lines[0] || fallbackName).replace(/^#\s*/, ''),
      description: lines.length > 1 ? lines.slice(1).join('\n') : ''
    };
  }

  function pluginFromFolder(folder, done) {
    requestJson(githubApiUrl(folder.path), function (files) {
      files = files || [];

      var js = pickFile(files, ['plugin.js', 'index.js', 'main.js']) || firstJs(files);
      var urlFile = pickFile(files, ['url.txt', 'link.txt']);

      if (!js && !urlFile) return done(null);

      var text = pickFile(files, ['title.txt', 'text.txt', 'description.txt', 'readme.txt', 'readme.md', 'README.md']);
      var icon = pickFile(files, ['icon.png', 'icon.jpg', 'icon.jpeg', 'icon.webp']);
      var screen = pickFile(files, [
        'screenshot.webp',
        'screenshot.png',
        'screenshot.jpg',
        'screenshot.jpeg',
        'screen.webp',
        'screen.png',
        'screen.jpg',
        'preview.webp',
        'preview.png',
        'preview.jpg'
      ]);

      var base = {
        id: folder.name,
        name: prettyName(folder.name),
        author: '@100melochey',
        description: '',
        folder: folder.path,
        file: js ? js.name : '',
        url: '',
        version: '1.0.0',
        category: 'Плагины',
        icon: icon ? icon.name : '',
        screenshots: screen ? [screen.name] : []
      };

      function finish() {
        if (!text) return done(normalizePlugin(base));

        requestText(githubRawUrlNoCache(text.path), function (content) {
          var parsed = parseText(content, base.name);
          base.name = parsed.name;
          base.description = parsed.description;
          done(normalizePlugin(base));
        }, function () {
          done(normalizePlugin(base));
        });
      }

      if (urlFile) {
        requestText(githubRawUrlNoCache(urlFile.path), function (content) {
          var url = String(content || '').split(/\r?\n/).map(function (line) {
            return line.trim();
          }).filter(Boolean)[0] || '';

          if (url) base.url = url;
          finish();
        }, function () {
          if (js) finish();
          else done(null);
        });

        return;
      }

      finish();
    }, function () {
      done(null);
    });
  }

  function imageBySlug(files, slug) {
    var names = [
      slug + '.webp',
      slug + '.png',
      slug + '.jpg',
      slug + '.jpeg'
    ];

    return pickFile(files, names);
  }

  function parseLinksText(text, files) {
    files = files || [];

    return String(text || '').replace(/\r/g, '').split('\n').map(function (line) {
      return line.trim();
    }).filter(function (line) {
      return line && line.indexOf('#') !== 0;
    }).map(function (line, index) {
      var parts = line.split('|').map(function (part) {
        return part.trim();
      });

      var name = parts[0] || '';
      var url = parts[1] || '';
      var description = parts[2] || '';
      var image = parts[3] || '';

      if (!/^https?:\/\//i.test(url) && /^https?:\/\//i.test(name)) {
        url = name;
        name = '';
      }

      if (!url) return null;

      var slug = fileBaseName(url);
      if (!name) name = prettyName(slug);

      if (!image) {
        var imageFile = imageBySlug(files, slug);
        if (imageFile) image = imageFile.name;
      }

      return normalizePlugin({
        id: 'link-' + slug + '-' + index,
        name: name,
        author: '@external',
        description: description,
        folder: CONFIG.linksPath,
        url: url,
        file: '',
        version: 'link',
        category: 'Ссылки',
        screenshots: image ? [image] : []
      });
    }).filter(Boolean);
  }

  function loadLinks(done) {
    requestText(githubRawUrlNoCache(CONFIG.linksPath + '/links.txt'), function (text) {
      requestJson(githubApiUrl(CONFIG.linksPath), function (files) {
        done(parseLinksText(text, files || []));
      }, function () {
        done(parseLinksText(text, []));
      });
    }, function () {
      requestJson(githubApiUrl(CONFIG.linksPath), function (files) {
      files = files || [];

      var list = pickFile(files, ['links.txt']);
      if (!list) return done([]);

      requestText(githubRawUrlNoCache(list.path), function (text) {
        done(parseLinksText(text, files));
      }, function () {
        done([]);
      });
    }, function () {
      done([]);
    });
    });
  }

  function loadCatalog(done) {
    function loadFolders(call) {
      requestJson(githubApiUrl(CONFIG.pluginsPath), function (items) {
      var folders = (items || []).filter(function (item) {
        return item.type === 'dir';
      });

      if (!folders.length) return call([]);

      var plugins = [];
      var left = folders.length;

      folders.forEach(function (folder) {
        pluginFromFolder(folder, function (plugin) {
          if (plugin) plugins.push(plugin);
          left--;

          if (left === 0) {
            plugins.sort(function (a, b) {
              return String(a.name).localeCompare(String(b.name));
            });

            call(plugins);
          }
        });
      });
    }, function () {
      call([]);
    });
    }

    loadFolders(function (folderPlugins) {
      loadLinks(function (linkPlugins) {
        var plugins = folderPlugins.concat(linkPlugins);

        plugins.sort(function (a, b) {
          return String(a.name).localeCompare(String(b.name));
        });

        done({
          name: STORE_NAME,
          plugins: plugins
        });
      });
    });
  }

  function install(plugin, silent) {
    try {
      if (window.Lampa && Lampa.Plugins && Lampa.Plugins.add) {
        var already = false;

        try {
          already = Lampa.Plugins.get && Lampa.Plugins.get().some(function (item) {
            return item && (item.url === plugin.url || item.link === plugin.url);
          });
        } catch (e) {}

        if (!already) {
          Lampa.Plugins.add({
            url: plugin.url,
            status: 1,
            name: plugin.name,
            author: plugin.author
          });
        } else {
          loadScript(plugin.url);
        }

        var map = installedMap();
        map[plugin.id] = true;
        saveInstalled(map);

        if (!silent) notify((already ? 'Обновлено: ' : 'Установлено: ') + plugin.name);
        updateCardsState();
        return;
      }
    } catch (e) {
      console.log('[100 мелочей] install through Lampa.Plugins failed', e);
    }

    loadScript(plugin.url, function (ok) {
      if (ok) {
        var map = installedMap();
        map[plugin.id] = true;
        saveInstalled(map);
      }

      if (!silent) notify(ok ? 'Установлено: ' + plugin.name : 'Не удалось загрузить: ' + plugin.name);
      updateCardsState();
    });
  }

  function remove(plugin) {
    var map = installedMap();
    delete map[plugin.id];
    saveInstalled(map);

    try {
      if (window.Lampa && Lampa.Plugins && Lampa.Plugins.remove) {
        var items = Lampa.Plugins.get ? Lampa.Plugins.get() : [];
        items.filter(function (item) {
          return item && (item.url === plugin.url || item.link === plugin.url);
        }).forEach(function (item) {
          Lampa.Plugins.remove(item);
        });
      }
    } catch (e) {}

    notify('Удалено из автозагрузки. Если плагин уже запущен — исчезнет после перезапуска Lampa.');
    updateCardsState();
  }

  function ensureStyle() {
    if (document.getElementById('hundred-store-style')) return;

    var css = '' +
      '.hundred-store{position:fixed;inset:0;z-index:9999;background:linear-gradient(135deg,#111 0%,#1b1f23 55%,#291d11 100%);color:#fff;font-family:inherit;}' +
      '.hundred-store *{box-sizing:border-box;}' +
      '.hundred-store__head{height:6.5em;display:flex;align-items:center;gap:1.2em;padding:1.4em 2.4em 1em;}' +
      '.hundred-store__logo{width:3.4em;height:3.4em;border-radius:1em;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.12);color:#ffbf42;}' +
      '.hundred-store__title{font-size:2.2em;font-weight:700;line-height:1;}' +
      '.hundred-store__sub{font-size:1.02em;color:rgba(255,255,255,.58);margin-top:.35em;}' +
      '.hundred-store__refresh,.hundred-store__close{padding:.75em 1em;border-radius:.7em;background:rgba(255,255,255,.1);color:rgba(255,255,255,.8);}' +
      '.hundred-store__refresh{margin-left:auto;}' +
      '.hundred-store__refresh.focus,.hundred-store__close.focus{background:#00d7ff;color:#001216;}' +
      '.hundred-store__body{height:calc(100% - 6.5em);overflow:auto;padding:0 2.4em 2.4em;}' +
      '.hundred-store__grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(24em,1fr));grid-auto-rows:14em;gap:1.25em;align-items:start;}' +
      '.hundred-card{position:relative;height:14em;min-height:0;border-radius:1.15em;overflow:hidden;background:#202020;box-shadow:0 1em 2.8em rgba(0,0,0,.32);transform:translateZ(0);}' +
      '.hundred-card.focus{outline:.22em solid #00d7ff;box-shadow:0 0 0 .35em rgba(0,215,255,.22),0 1em 3em rgba(0,0,0,.42);}' +
      '.hundred-card__image{height:100%;background:linear-gradient(135deg,#353535,#191919);background-size:cover;background-position:center;}' +
      '.hundred-card__image.empty{display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,.18);font-size:4em;}' +
      '.hundred-card__shade{position:absolute;left:0;right:0;bottom:0;height:7.6em;background:linear-gradient(0deg,rgba(0,0,0,.92),rgba(0,0,0,.58) 62%,rgba(0,0,0,0));}' +
      '.hundred-card__body{position:absolute;left:0;right:0;bottom:0;padding:1em;}' +
      '.hundred-card__name{font-size:1.22em;font-weight:700;line-height:1.15;text-shadow:0 .12em .2em rgba(0,0,0,.5);}' +
      '.hundred-card__meta{display:flex;gap:.5em;align-items:center;margin-top:.55em;color:rgba(255,255,255,.72);font-size:.9em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}' +
      '.hundred-card__actions{display:flex;gap:.55em;margin-top:.8em;align-items:center;}' +
      '.hundred-card__action,.hundred-card__remove{display:inline-flex;padding:.45em .75em;border-radius:.55em;background:rgba(255,255,255,.16);font-size:.92em;font-weight:700;color:#fff;}' +
      '.hundred-card.focus .hundred-card__action{background:#00d7ff;color:#001216;}' +
      '.hundred-card.installed .hundred-card__action{background:rgba(0,190,120,.92);color:#fff;}' +
      '.hundred-card__remove{display:none;background:rgba(255,75,75,.86);}' +
      '.hundred-card.installed .hundred-card__remove{display:inline-flex;}' +
      '.hundred-card__badge{position:absolute;top:.75em;right:.75em;padding:.35em .6em;border-radius:.55em;background:rgba(0,190,120,.92);font-weight:700;font-size:.82em;display:none;}' +
      '.hundred-card.installed .hundred-card__badge{display:block;}' +
      '.hundred-store__empty{padding:3em;font-size:1.4em;color:rgba(255,255,255,.65);}' +
      '.hundred-modal{padding:.3em 0;}' +
      '.hundred-modal__hero{height:15em;background-size:cover;background-position:center;border-radius:.8em;margin-bottom:1em;background-color:#222;}' +
      '.hundred-modal__descr{color:rgba(255,255,255,.75);font-size:1.05em;line-height:1.45;margin-bottom:1em;}' +
      '.hundred-modal__url{font-size:.78em;color:rgba(255,255,255,.42);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}';

    var style = document.createElement('style');
    style.id = 'hundred-store-style';
    style.textContent = css;
    document.head.appendChild(style);
  }

  var activeStore = null;

  function updateCardsState() {
    if (!activeStore) return;

    activeStore.plugins.forEach(function (plugin) {
      var card = activeStore.root.querySelector('[data-plugin-id="' + plugin.id + '"]');
      if (card) {
        var installed = isInstalled(plugin);
        card.classList.toggle('installed', installed);

        var action = card.querySelector('.hundred-card__action');
        if (action) action.innerText = installed ? 'Обновить' : 'Установить';
      }
    });
  }

  function closeStore() {
    if (!activeStore) return;

    try {
      if (window.Lampa && Lampa.Controller) Lampa.Controller.toggle(activeStore.backController || 'content');
    } catch (e) {}

    activeStore.root.remove();
    activeStore = null;
  }

  function refreshStore() {
    if (activeStore) {
      activeStore.root.remove();
      activeStore = null;
    }

    openStore();
  }

  function openPlugin(plugin) {
    install(plugin);
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function cardHtml(plugin) {
    var image = plugin.image ? ' style="background-image:url(' + plugin.image + ')"' : '';
    var empty = plugin.image ? '' : ' empty';
    var letter = escapeHtml((plugin.name || '?').charAt(0).toUpperCase());

    return '' +
      '<div class="hundred-card selector" data-plugin-id="' + escapeHtml(plugin.id) + '">' +
        '<div class="hundred-card__image' + empty + '"' + image + '>' + (plugin.image ? '' : letter) + '</div>' +
        '<div class="hundred-card__shade"></div>' +
        '<div class="hundred-card__badge">✓</div>' +
        '<div class="hundred-card__body">' +
          '<div class="hundred-card__name">' + escapeHtml(plugin.name) + '</div>' +
          '<div class="hundred-card__meta"><span>' + escapeHtml(plugin.category || 'Плагин') + '</span><span>•</span><span>' + escapeHtml(plugin.version || '1.0.0') + '</span></div>' +
          '<div class="hundred-card__actions">' +
            '<div class="hundred-card__action">Установить</div>' +
            '<div class="hundred-card__remove">Удалить</div>' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  function openStore() {
    ensureStyle();

    loadCatalog(function (catalog) {
      var plugins = catalog.plugins || [];

      if (!plugins.length) {
        notify('Каталог пустой или не загрузился');
        return;
      }

      if (activeStore) closeStore();

      var backController = 'content';
      try {
        if (window.Lampa && Lampa.Controller && Lampa.Controller.enabled) backController = Lampa.Controller.enabled().name || backController;
      } catch (e) {}

      var root = document.createElement('div');
      root.className = 'hundred-store layer--width layer--height';
      root.innerHTML = '' +
        '<div class="hundred-store__head">' +
          '<div class="hundred-store__logo">' + ICON + '</div>' +
          '<div><div class="hundred-store__title">' + escapeHtml(catalog.name || STORE_NAME) + '</div><div class="hundred-store__sub">Плагины из GitHub-папок · Enter — установить · Back — назад</div></div>' +
          '<div class="hundred-store__refresh selector">Обновить</div>' +
          '<div class="hundred-store__close selector">Закрыть</div>' +
        '</div>' +
        '<div class="hundred-store__body"><div class="hundred-store__grid">' + plugins.map(cardHtml).join('') + '</div></div>';

      document.body.appendChild(root);

      activeStore = {
        root: root,
        plugins: plugins,
        backController: backController
      };

      plugins.forEach(function (plugin) {
        var card = root.querySelector('[data-plugin-id="' + plugin.id + '"]');
        if (!card) return;

        card.classList.toggle('installed', isInstalled(plugin));
        var action = card.querySelector('.hundred-card__action');
        if (action) action.innerText = isInstalled(plugin) ? 'Обновить' : 'Установить';
        card.addEventListener('hover:enter', function () { openPlugin(plugin); });
        card.addEventListener('click', function () { openPlugin(plugin); });

        var removeButton = card.querySelector('.hundred-card__remove');
        if (removeButton) {
          removeButton.addEventListener('hover:enter', function (event) {
            event.stopPropagation();
            remove(plugin);
          });

          removeButton.addEventListener('click', function (event) {
            event.stopPropagation();
            remove(plugin);
          });
        }
      });

      var close = root.querySelector('.hundred-store__close');
      close.addEventListener('hover:enter', closeStore);
      close.addEventListener('click', closeStore);

      var refresh = root.querySelector('.hundred-store__refresh');
      refresh.addEventListener('hover:enter', refreshStore);
      refresh.addEventListener('click', refreshStore);

      try {
        if (window.Lampa && Lampa.Layer && Lampa.Layer.visible) Lampa.Layer.visible(root);
      } catch (e) {}

      try {
        if (window.Lampa && Lampa.Controller) {
          Lampa.Controller.add('hundred_store', {
            toggle: function () {
              var where = window.$ ? $(root) : root;
              Lampa.Controller.collectionSet(where);
              var first = root.querySelector('.hundred-card') || close;
              Lampa.Controller.collectionFocus(first, where);
            },
            right: function () { if (window.Lampa.Navigator) Lampa.Navigator.move('right'); },
            left: function () { if (window.Lampa.Navigator) Lampa.Navigator.move('left'); },
            up: function () { if (window.Lampa.Navigator) Lampa.Navigator.move('up'); },
            down: function () { if (window.Lampa.Navigator) Lampa.Navigator.move('down'); },
            back: closeStore
          });

          Lampa.Controller.toggle('hundred_store');
        }
      } catch (e) {}
    });
  }

  function autoload() {
    loadCatalog(function (catalog) {
      var map = installedMap();
      (catalog.plugins || []).forEach(function (plugin) {
        if (map[plugin.id]) loadScript(plugin.url);
      });
    });
  }

  function addSettings() {
    if (!window.Lampa || !Lampa.SettingsApi || !Lampa.SettingsApi.addComponent || !Lampa.SettingsApi.addParam) return false;
    if (window.__HUNDRED_STORE_SETTINGS_READY__) return true;

    window.__HUNDRED_STORE_SETTINGS_READY__ = true;

    try {
      Lampa.SettingsApi.addComponent({
        component: SETTINGS_COMPONENT,
        name: STORE_NAME,
        icon: ICON
      });

      Lampa.SettingsApi.addParam({
        component: SETTINGS_COMPONENT,
        param: {
          name: 'hundred_store_open',
          type: 'button',
          default: ''
        },
        field: {
          name: 'Открыть витрину',
          description: 'Карточки плагинов с картинками'
        },
        onChange: function () {
          setTimeout(openStore, 50);
        }
      });
    } catch (e) {
      window.__HUNDRED_STORE_SETTINGS_READY__ = false;
      return false;
    }

    return true;
  }

  function init() {
    var timer = setInterval(function () {
      if (addSettings()) {
        clearInterval(timer);
        autoload();
        notify(STORE_NAME + ': подключен');
      }
    }, 500);

    setTimeout(function () {
      clearInterval(timer);
    }, 30000);
  }

  init();
})();
