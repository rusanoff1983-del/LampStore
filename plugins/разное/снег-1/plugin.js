(function () {
  'use strict';

  var GARLAND_ID = 'lampa_garland_newyear';
  var SNOW_ID = GARLAND_ID + '_snow';
  var MIN_DROPS_COUNT = 8;
  var MAX_DROPS_COUNT = 36;
  var DROPS_SPACING_REM = 6.6;

  var MIN_DROPS_COUNT_TV = 16;
  var MAX_DROPS_COUNT_TV = 64;
  var DROPS_SPACING_TV_REM = 4.4;
  var MIN_DROP_HEIGHT_REM = 0.55;
  var MAX_DROP_HEIGHT_REM = 1.1;
  var ANIM_DURATION_MIN = 2.3;
  var ANIM_DURATION_MAX = 3.8;

  var MIN_SNOWFLAKES = 18;
  var MAX_SNOWFLAKES = 130;
  var SNOW_AREA_PER_FLAKE_REM2 = 32;

  var MIN_SNOWFLAKES_LITE = 10;
  var MAX_SNOWFLAKES_LITE = 50;
  var SNOW_AREA_PER_FLAKE_REM2_LITE = 46;

  var MIN_SNOWFLAKES_ULTRA = 6;
  var MAX_SNOWFLAKES_ULTRA = 24;
  var SNOW_AREA_PER_FLAKE_REM2_ULTRA = 70;

  var MIN_DROPS_COUNT_ULTRA = 6;
  var MAX_DROPS_COUNT_ULTRA = 18;
  var MIN_DROPS_COUNT_TV_ULTRA = 10;
  var MAX_DROPS_COUNT_TV_ULTRA = 26;
  var DROPS_SPACING_ULTRA_REM = 8.2;
  var DROPS_SPACING_TV_ULTRA_REM = 7.0;

  var COLORS = [
    '#ff3b30',
    '#ff2d55',
    '#ff9500',
    '#ffcc00',
    '#34c759',
    '#30d158',
    '#00c7be',
    '#32ade6',
    '#007aff',
    '#5856d6',
    '#af52de',
    '#ffd1a8',
    '#ffffff'
  ];

  function injectStyles() {
    if (document.getElementById(GARLAND_ID + '_style')) return;

    var style = document.createElement('style');
    style.id = GARLAND_ID + '_style';
    style.type = 'text/css';

    style.textContent = `
      #${SNOW_ID}-container{
        position:fixed;
        left:0;
        top:0;
        width:100%;
        height:100%;
        pointer-events:none;
        overflow:hidden;
        z-index:2;
      }

      .${SNOW_ID}-flake{
        position:absolute;
        left:var(--${SNOW_ID}-x, 50%);
        top:-10vh;
        font-size:var(--${SNOW_ID}-size, 0.6rem);
        line-height:1;
        color:rgba(255,255,255,var(--${SNOW_ID}-alpha, .7));
        text-shadow:0 0 0.45rem rgba(255,255,255,0.35);
        opacity:var(--${SNOW_ID}-opacity, .85);
        animation:${SNOW_ID}-fall linear infinite;
        will-change:transform,opacity;
      }

      body[data-${GARLAND_ID}-lite="1"] .${SNOW_ID}-flake{
        text-shadow:none;
      }

      @keyframes ${SNOW_ID}-fall{
        0%{
          transform:translate3d(0,-10vh,0) rotate(0deg);
          opacity:0;
        }
        10%{opacity:var(--${SNOW_ID}-opacity, .85)}
        90%{opacity:var(--${SNOW_ID}-opacity, .85)}
        100%{
          transform:translate3d(var(--${SNOW_ID}-drift, 0rem),110vh,0) rotate(360deg);
          opacity:0;
        }
      }

      #${GARLAND_ID}-container{
        position:absolute;left:0;top:0;width:100%;height:100%;
        pointer-events:none;overflow:visible;z-index:0;
      }
      #${GARLAND_ID}-inner{position:relative;width:100%;height:100%;}
      .${GARLAND_ID}-drop{
        position:absolute;top:0;display:flex;flex-direction:column;
        align-items:center;justify-content:flex-start;
        animation:${GARLAND_ID}-swing ease-in-out infinite;
        transform-origin:top center;will-change:transform,opacity;opacity:.95;
      }
      .${GARLAND_ID}-line{
        width:0.1rem;background:rgba(255,255,255,.25);
        border-radius:999rem;flex-shrink:0;
        animation:${GARLAND_ID}-line-twinkle ease-in-out infinite;
        position:relative;overflow:hidden;
      }

      .${GARLAND_ID}-spark{
        position:absolute;
        left:50%;
        top:-0.4rem;
        width:0.2rem;
        height:0.2rem;
        border-radius:50%;
        transform:translateX(-50%);
        background:var(--${GARLAND_ID}-spark-color, #35ff4b);
        box-shadow:0 0 0.3rem var(--${GARLAND_ID}-spark-color, #35ff4b);
        opacity:0;
        animation:${GARLAND_ID}-spark-fall linear infinite;
        will-change:transform,opacity;
      }

      body[data-${GARLAND_ID}-lite="1"] .${GARLAND_ID}-spark{
        box-shadow:none;
      }
      .${GARLAND_ID}-bulb{
        width:0.75rem;height:0.75rem;border-radius:50%;
        box-shadow:0 0 0.375rem rgba(255,255,255,.65);
        margin-top:0.3rem;flex-shrink:0;
        animation:${GARLAND_ID}-twinkle ease-in-out infinite;
      }

      body[data-${GARLAND_ID}-lite="1"] .${GARLAND_ID}-bulb{
        box-shadow:none;
        animation-name:${GARLAND_ID}-twinkle-lite;
      }
      .${GARLAND_ID}-star{
        margin-top:0.3rem;width:1rem;height:1rem;position:relative;
        flex-shrink:0;opacity:.9;color:inherit;
        animation:${GARLAND_ID}-twinkle ease-in-out infinite;
      }

      body[data-${GARLAND_ID}-lite="1"] .${GARLAND_ID}-star{
        display:none;
      }
      .${GARLAND_ID}-star:before,.${GARLAND_ID}-star:after{
        content:'';position:absolute;top:0;left:0;width:100%;height:100%;
        background:currentColor;
        clip-path:polygon(50% 0%,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%);
      }
      .${GARLAND_ID}-star:after{transform:rotate(15deg);opacity:.7;}

      @keyframes ${GARLAND_ID}-swing{
        0%{transform:rotate(-3deg) translateY(0)}
        50%{transform:rotate(3deg) translateY(0.1rem)}
        100%{transform:rotate(-3deg) translateY(0)}
      }
      @keyframes ${GARLAND_ID}-twinkle{
        0%{filter:brightness(.85);opacity:.75}
        50%{filter:brightness(1.55);opacity:1}
        100%{filter:brightness(.85);opacity:.75}
      }

      @keyframes ${GARLAND_ID}-twinkle-lite{
        0%{opacity:.65}
        50%{opacity:1}
        100%{opacity:.65}
      }
      @keyframes ${GARLAND_ID}-line-twinkle{
        0%{opacity:.35}
        50%{opacity:.75}
        100%{opacity:.35}
      }

      @keyframes ${GARLAND_ID}-spark-fall{
        0%{transform:translateX(-50%) translateY(0);opacity:0}
        10%{opacity:.95}
        70%{opacity:.95}
        100%{transform:translateX(-50%) translateY(var(--${GARLAND_ID}-spark-fall, 6rem));opacity:0}
      }

      body[data-${GARLAND_ID}-lite="1"] .${GARLAND_ID}-spark{
        display:none;
      }
    `;

    document.head.appendChild(style);
  }

  function headerEl() {
    // Шапка Lampa (верхняя панель)
    return document.querySelector('.head');
  }

  function destroy() {
    var el = document.getElementById(GARLAND_ID + '-container');
    if (el && el.parentNode) el.parentNode.removeChild(el);

    var snow = document.getElementById(SNOW_ID + '-container');
    if (snow && snow.parentNode) snow.parentNode.removeChild(snow);
  }

  function destroyGarland() {
    var el = document.getElementById(GARLAND_ID + '-container');
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }

  function rootFontSize() {
    try {
      var fs = window.getComputedStyle(document.documentElement).fontSize;
      var n = parseFloat(fs);
      return n && isFinite(n) ? n : 16;
    } catch (e) {
      return 16;
    }
  }

  function toRem(value) {
    var base = rootFontSize();
    return value / base;
  }

  function effectiveViewportRem() {
    var vw = Math.max(
      (window.visualViewport && window.visualViewport.width) || 0,
      (document.documentElement && document.documentElement.clientWidth) || 0,
      window.innerWidth || 0
    );

    var vh = Math.max(
      (window.visualViewport && window.visualViewport.height) || 0,
      (document.documentElement && document.documentElement.clientHeight) || 0,
      window.innerHeight || 0
    );

    var sw = (window.screen && (screen.availWidth || screen.width)) || 0;
    var sh = (window.screen && (screen.availHeight || screen.height)) || 0;

    var screenMax = Math.max(sw, sh);
    var viewportMax = Math.max(vw, vh);
    var scale = (screenMax && viewportMax) ? (screenMax / viewportMax) : 1;
    if (!isFinite(scale) || scale < 1) scale = 1;
    if (scale > 3) scale = 3;

    return {
      wRem: toRem(vw * scale),
      hRem: toRem(vh * scale)
    };
  }

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function liteMode() {
    var mode = computeMode();
    return mode.lite;
  }

  function ultraLiteMode() {
    var mode = computeMode();
    return mode.ultra;
  }

  var _modeCache = null;

  function isMediaStationX() {
    try {
      var ua = String(navigator.userAgent || '');
      return /media\s*station\s*x/i.test(ua) || /\bmsx\b/i.test(ua);
    } catch (e) {
      return false;
    }
  }

  function computeMode() {
    if (_modeCache) return _modeCache;

    var ultra = false;
    try {
      if (isMediaStationX()) ultra = true;
    } catch (e) {}

    var reduced = false;
    try {
      if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) reduced = true;
    } catch (e) {}

    var lowHw = false;
    try {
      var mem = navigator.deviceMemory || 0;
      var cores = navigator.hardwareConcurrency || 0;
      if (mem && mem <= 2) lowHw = true;
      if (cores && cores <= 4) lowHw = true;
    } catch (e) {}

    var tv = isTv();

    var lite = ultra || reduced || lowHw || tv;

    _modeCache = { lite: !!lite, ultra: !!ultra };
    return _modeCache;
  }

  function applyLiteFlag() {
    try {
      if (!document.body) return;
      if (liteMode()) document.body.setAttribute('data-' + GARLAND_ID + '-lite', '1');
      else document.body.removeAttribute('data-' + GARLAND_ID + '-lite');
    } catch (e) {}
  }

  function isTv() {
    try {
      if (window.Lampa && Lampa.Platform && typeof Lampa.Platform.screen === 'function') {
        return Lampa.Platform.screen('tv');
      }
    } catch (e) {}

    var touch = false;
    try {
      touch = (navigator.maxTouchPoints || 0) > 0;
    } catch (e) {}

    return !touch;
  }

  function dropsCount(head) {
    var tv = isTv();
    var ultra = ultraLiteMode();

    var viewportW = Math.max(
      (window.visualViewport && window.visualViewport.width) || 0,
      (document.documentElement && document.documentElement.clientWidth) || 0,
      window.innerWidth || 0
    );

    var viewportH = Math.max(
      (window.visualViewport && window.visualViewport.height) || 0,
      (document.documentElement && document.documentElement.clientHeight) || 0,
      window.innerHeight || 0
    );

    var screenW = (window.screen && (screen.availWidth || screen.width)) || 0;
    var screenH = (window.screen && (screen.availHeight || screen.height)) || 0;
    var outerW = window.outerWidth || 0;
    var bodyW = (document.body && document.body.clientWidth) || 0;
    var app = document.getElementById('app');
    var appW = (app && app.clientWidth) || 0;

    var headW = 0;
    if (head) headW = head.clientWidth || 0;
    if (!headW && head && head.getBoundingClientRect) headW = head.getBoundingClientRect().width || 0;

    var w = Math.max(viewportW, screenW, outerW, bodyW, appW, headW);
    if (!w) w = 1280;

    // Если приложение работает в «виртуальном» разрешении (например 720) на ТВ,
    // то ширина интерфейса может быть одинаковой на разных устройствах.
    // В таком случае увеличиваем эффективную ширину через отношение screen/viewport.
    var screenMax = Math.max(screenW, screenH);
    var viewportMax = Math.max(viewportW, viewportH);
    var scale = (screenMax && viewportMax) ? (screenMax / viewportMax) : 1;
    if (!isFinite(scale) || scale < 1) scale = 1;
    if (scale > 3) scale = 3;

    var effectiveWRem = toRem(w * scale);

    // На больших экранах делаем гирлянду гуще
    var spacing = tv ? (ultra ? DROPS_SPACING_TV_ULTRA_REM : DROPS_SPACING_TV_REM) : (ultra ? DROPS_SPACING_ULTRA_REM : DROPS_SPACING_REM);

    if (!tv) {
      if (effectiveWRem >= 87.5) spacing = 6.0;
      if (effectiveWRem >= 112.5) spacing = 5.2;
      if (effectiveWRem >= 150) spacing = 4.4;
    }

    var count = Math.round(effectiveWRem / spacing);
    if (ultra) return tv ? clamp(count, MIN_DROPS_COUNT_TV_ULTRA, MAX_DROPS_COUNT_TV_ULTRA) : clamp(count, MIN_DROPS_COUNT_ULTRA, MAX_DROPS_COUNT_ULTRA);
    return tv ? clamp(count, MIN_DROPS_COUNT_TV, MAX_DROPS_COUNT_TV) : clamp(count, MIN_DROPS_COUNT, MAX_DROPS_COUNT);
  }

  function snowflakesCount() {
    var lite = liteMode();
    var ultra = ultraLiteMode();
    var vp = effectiveViewportRem();
    var area = Math.max(1, vp.wRem) * Math.max(1, vp.hRem);
    var count = Math.round(area / (ultra ? SNOW_AREA_PER_FLAKE_REM2_ULTRA : (lite ? SNOW_AREA_PER_FLAKE_REM2_LITE : SNOW_AREA_PER_FLAKE_REM2)));
    if (ultra) return clamp(count, MIN_SNOWFLAKES_ULTRA, MAX_SNOWFLAKES_ULTRA);
    return lite ? clamp(count, MIN_SNOWFLAKES_LITE, MAX_SNOWFLAKES_LITE) : clamp(count, MIN_SNOWFLAKES, MAX_SNOWFLAKES);
  }

  function buildSnow() {
    if (!document.body) return;

    applyLiteFlag();

    var container = document.getElementById(SNOW_ID + '-container');
    if (!container) {
      container = document.createElement('div');
      container.id = SNOW_ID + '-container';
      document.body.insertBefore(container, document.body.firstChild);
    }
    else if (container.parentNode === document.body && container !== document.body.lastChild) {
      document.body.appendChild(container);
    }

    var count = snowflakesCount();
    var prev = parseInt(container.getAttribute('data-count') || '0', 10);
    if (prev === count && container.children.length) return;

    container.setAttribute('data-count', String(count));
    container.textContent = '';

    var fragment = document.createDocumentFragment();

    for (var i = 0; i < count; i++) {
      var flake = document.createElement('div');
      flake.className = SNOW_ID + '-flake';

      var chars = ['❄', '❅', '✻', '✼'];
      flake.textContent = chars[Math.floor(Math.random() * chars.length)];

      var size;
      var rr = Math.random();
      if (rr < 0.10) size = 0.62 + Math.random() * 0.34;
      else if (rr < 0.35) size = 0.40 + Math.random() * 0.22;
      else size = 0.18 + Math.random() * 0.20;

      var duration = 12 + Math.random() * 18;
      var delay = -(Math.random() * duration);

      var drift = ((Math.random() * 3.2) - 1.6).toFixed(3) + 'rem';
      var alpha = (0.30 + Math.random() * 0.45).toFixed(2);
      var opacity = (0.18 + Math.random() * 0.55).toFixed(2);

      flake.style.setProperty('--' + SNOW_ID + '-x', (Math.random() * 100).toFixed(2) + '%');
      flake.style.setProperty('--' + SNOW_ID + '-size', size.toFixed(3) + 'rem');
      flake.style.setProperty('--' + SNOW_ID + '-drift', drift);
      flake.style.setProperty('--' + SNOW_ID + '-alpha', alpha);
      flake.style.setProperty('--' + SNOW_ID + '-opacity', opacity);
      flake.style.animationDuration = duration.toFixed(2) + 's';
      flake.style.animationDelay = delay.toFixed(2) + 's';

      fragment.appendChild(flake);
    }

    container.appendChild(fragment);
  }

  function createDrop(i, total, headHeight, lite, ultra) {
    var drop = document.createElement('div');
    drop.className = GARLAND_ID + '-drop';

    var percent = (i + 0.5) / total * 100;
    drop.style.left = percent + '%';

    var range = (MAX_DROP_HEIGHT_REM - MIN_DROP_HEIGHT_REM);
    var r = Math.random();
    var t;

    if (r < 0.12) t = 0.85 + Math.random() * 0.15;
    else if (r < 0.45) t = 0.45 + Math.random() * 0.40;
    else t = Math.pow(Math.random(), 1.8) * 0.55;

    var h = MIN_DROP_HEIGHT_REM + range * t;
    var duration = ANIM_DURATION_MIN + Math.random() * (ANIM_DURATION_MAX - ANIM_DURATION_MIN);

    drop.style.animationDuration = duration.toFixed(2) + 's';
    drop.style.animationDelay = (Math.random() * 1.5).toFixed(2) + 's';

    var color = COLORS[Math.floor(Math.random() * COLORS.length)];
    drop.style.setProperty('--' + GARLAND_ID + '-color', color);

    var line = document.createElement('div');
    line.className = GARLAND_ID + '-line';
    var headHeightRem = toRem(headHeight);
    var lineHeightRem = (headHeightRem * 0.08 + h);
    line.style.height = lineHeightRem + 'rem';
    line.style.animationDuration = (1.6 + Math.random() * 1.6).toFixed(2) + 's';
    line.style.animationDelay = (Math.random() * 1.4).toFixed(2) + 's';
    line.style.setProperty('--' + GARLAND_ID + '-spark-color', color);
    line.style.setProperty('--' + GARLAND_ID + '-spark-fall', (Math.max(1.875, lineHeightRem + 0.625)).toFixed(3) + 'rem');

    // Маленькие мигающие точки на линии (как на примере)
    var sparks = ultra ? 0 : (lite ? 0 : 2);
    for (var s = 0; s < sparks; s++) {
      var spark = document.createElement('div');
      spark.className = GARLAND_ID + '-spark';

      var sd = 1.1 + Math.random() * 2.2;
      spark.style.animationDuration = sd.toFixed(2) + 's';
      spark.style.animationDelay = (Math.random() * 2.5).toFixed(2) + 's';

      // чуть-чуть разъезжаемся по X, чтобы не было идеальной одинаковости
      spark.style.marginLeft = (((Math.random() * 0.125) - 0.0625)).toFixed(4) + 'rem';

      line.appendChild(spark);
    }

    var bulb = document.createElement('div');
    bulb.className = GARLAND_ID + '-bulb';
    bulb.style.background = color;
    bulb.style.animationDuration = (1.4 + Math.random() * 1.1).toFixed(2) + 's';
    bulb.style.animationDelay = (Math.random() * 1.3).toFixed(2) + 's';

    var star = null;
    if (!lite && !ultra) {
      star = document.createElement('div');
      star.className = GARLAND_ID + '-star';
      star.style.color = color;
      star.style.animationDuration = (1.8 + Math.random() * 1.4).toFixed(2) + 's';
      star.style.animationDelay = (Math.random() * 1.7).toFixed(2) + 's';
    }

    drop.appendChild(line);
    drop.appendChild(bulb);
    if (star) drop.appendChild(star);

    return drop;
  }

  function build() {
    destroyGarland();

    var head = headerEl();
    if (!head) return;

    injectStyles();

    applyLiteFlag();

    buildSnow();

    var cs = window.getComputedStyle(head);
    if (cs.position === 'static') head.style.position = 'relative';

    var container = document.createElement('div');
    container.id = GARLAND_ID + '-container';

    var inner = document.createElement('div');
    inner.id = GARLAND_ID + '-inner';

    container.appendChild(inner);
    head.insertBefore(container, head.firstChild);

    var h = head.offsetHeight || 48;
    var count = dropsCount(head);

    var lite = liteMode();
    var ultra = ultraLiteMode();
    var fragment = document.createDocumentFragment();
    for (var i = 0; i < count; i++) fragment.appendChild(createDrop(i, count, h, lite, ultra));
    inner.appendChild(fragment);
  }

  function init() {
    var buildTimer = 0;
    var lastBuildAt = 0;

    function scheduleBuild(delay) {
      if (buildTimer) clearTimeout(buildTimer);
      buildTimer = setTimeout(function () {
        buildTimer = 0;
        var now = Date.now();
        if (now - lastBuildAt < 600) return;
        lastBuildAt = now;
        build();
      }, delay || 0);
    }

    scheduleBuild(0);

    // Lampa SPA: пересоздаём после смены активностей/готовности
    if (window.Lampa && Lampa.Listener && Lampa.Listener.follow) {
      Lampa.Listener.follow('app', function (e) {
        if (e.type === 'ready' || e.type === 'activity') scheduleBuild(200);
      });
    } else {
      // fallback: несколько попыток, если DOM загрузился позже
      var t = 0, max = 20;
      var timer = setInterval(function () {
        if (headerEl()) { scheduleBuild(0); clearInterval(timer); }
        if (++t >= max) clearInterval(timer);
      }, 500);
    }

    window.addEventListener('resize', function () {
      scheduleBuild(400);
    });
  }

  // Регистрация как Lampa-плагин (если API плагинов доступно)
  if (window.Lampa && Lampa.Plugin && Lampa.Plugin.create) {
    Lampa.Plugin.create('Новогодняя гирлянда', function (plugin) {
      plugin.id = GARLAND_ID;
      plugin.create = init;
      plugin.destroy = destroy;
      plugin.create();
    });
  } else {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
  }
})();
