(function () {
  'use strict';

  const CARD_SEL = '.card';
  const VIEW_SEL = '.card__view';

  const css = `
  :root{
    --pl-dur: .55s;
    --pl-ease: cubic-bezier(.2,.9,.2,1);

    /* “дымка” */
    --smoke-a: rgba(0,0,0,.10);
    --smoke-b: rgba(0,0,0,.32);
    --smoke-c: rgba(0,0,0,.55);

    /* play */
    --pl-play-ring: rgba(255,255,255,.14);
    --pl-play-tri: rgba(255,255,255,.95);
  }

  ${CARD_SEL} ${VIEW_SEL}{
    position: relative !important;
  }

  /* МЯГКАЯ ДЫМКА (без полос и без панели) */
  ${CARD_SEL} ${VIEW_SEL} .pl-smoke{
    position:absolute;
    inset:0;
    opacity:0;
    transition: opacity var(--pl-dur) var(--pl-ease);
    pointer-events:none;
    z-index: 2;

    /* 2 слоя дымки: снизу сильнее, в центре мягче, сверху почти нет */
    background:
      radial-gradient(ellipse at 50% 75%, var(--smoke-c) 0%, rgba(0,0,0,0) 62%),
      radial-gradient(ellipse at 50% 40%, var(--smoke-b) 0%, rgba(0,0,0,0) 70%),
      linear-gradient(to top, var(--smoke-b), var(--smoke-a));
  }

  /* PLAY по центру */
  ${CARD_SEL} ${VIEW_SEL} .pl-play{
    position:absolute;
    left:50%; top:50%;
    width:86px; height:86px;
    transform: translate(-50%,-50%) scale(.92);
    border-radius:999px;
    background: var(--pl-play-ring);
    backdrop-filter: blur(8px);
    opacity:0;
    transition: opacity var(--pl-dur) var(--pl-ease), transform var(--pl-dur) var(--pl-ease);
    pointer-events:none;
    z-index: 3;
  }
  ${CARD_SEL} ${VIEW_SEL} .pl-play::after{
    content:"";
    position:absolute;
    left:50%; top:50%;
    width:0; height:0;
    transform: translate(-42%,-50%);
    border-style: solid;
    border-width: 14px 0 14px 22px;
    border-color: transparent transparent transparent var(--pl-play-tri);
  }

  /* ТРИГГЕР */
  ${CARD_SEL}:hover ${VIEW_SEL} .pl-smoke,
  ${CARD_SEL}.focus ${VIEW_SEL} .pl-smoke{
    opacity:1;
  }
  ${CARD_SEL}:hover ${VIEW_SEL} .pl-play,
  ${CARD_SEL}.focus ${VIEW_SEL} .pl-play{
    opacity:1;
    transform: translate(-50%,-50%) scale(1);
  }
  `;

  function injectCSS() {
    const id = 'pl-smoke-css';
    const old = document.getElementById(id);
    if (old) old.remove();
    const style = document.createElement('style');
    style.id = id;
    style.textContent = css;
    document.head.appendChild(style);
  }

  function ensureUI() {
    document.querySelectorAll(`${CARD_SEL} ${VIEW_SEL}`).forEach(view => {
      if (!view.querySelector('.pl-smoke')) {
        const smoke = document.createElement('div');
        smoke.className = 'pl-smoke';
        view.appendChild(smoke);
      }
      if (!view.querySelector('.pl-play')) {
        const play = document.createElement('div');
        play.className = 'pl-play';
        view.appendChild(play);
      }
    });
  }

  function start() {
    injectCSS();
    ensureUI();
    const mo = new MutationObserver(ensureUI);
    mo.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }

})();