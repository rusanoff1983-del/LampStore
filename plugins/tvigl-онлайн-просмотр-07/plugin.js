(function () {
  'use strict';
  // OpenSubtitles in the native Lampa "Subtitles" menu.
  // Stock plugins/opensubs.js has no UI (only hotkey "U" while playing) and builds
  // URLs from lampac_unic_id (a device uid, not a host) -> every request 404s.
  // Here: on player start we search /api/opensubs/search and append the results to
  // the player's own subtitle list via Lampa.Player.subtitles(). Downloads happen
  // only when a track is chosen (OpenSubtitles download quota).
  // Downloads go through the server module "ossubs" (your own OpenSubtitles login, more
  // downloads a day) when it is installed and logged in, else through /api/opensubs/download.
  // Subtitle tracks the stream carries itself (HLS / embedded) stay in the same menu.
  // More providers through the server module "subsx" (service alcsubs: YIFY, Kitsunekko, and
  // SubSource / SubDL / Jimaku with keys): searched at the same time, listed after OpenSubtitles
  // in each language; they cost no OpenSubtitles downloads. No module: OpenSubtitles only.
  var VERSION = '1.2.9';   // shown in «Закусь» › «О паке»
  if (window.alc_opensubs_menu_ready) return;
  window.alc_opensubs_menu_ready = true;

  var HOST = '{localhost}';   // filled in by our server when it serves this file
  // the script's own origin: the server when this copy was not filled in (see withHost)
  var ORIGIN = (function () {
    try { var s = document.currentScript && document.currentScript.src; if (s) return s.replace(/^(https?:\/\/[^\/]+).*$/, '$1'); } catch (e) {}
    return '';
  })();
  var PER_LANG = 6;
  var imdbCache = {};
  var session = 0;
  var last = null;   // what this play item has: {my, key, own, os, applied}

  // ---------- the server ----------
  // [pack server] the same block in alc_auto, alc_ua, alc_trailers, opensubs_menu, skip_segments and
  // alc_trick (each must work alone). packServer(own, cb): cb(base), '' = none, once. With Autopilot
  // installed: its server (window.alc_auto_server: its setting / found by this search and remembered; its
  // '' is for now, it looks again a minute later). Without it this search (S.find): the pack's setting
  // «Адрес вашего Lampac» (alc_auto_server), else `own` (the host this script came from) and the page's
  // host, then - only when neither of them decided - the folder and host of every installed plugin
  // (Lampa's plugin list; not the page's scripts: CDNs, analytics; a Lampac is not known by its plugin's
  // file name), each group probed at once with GET <base>/lite/events, a plain request (no token or
  // cookies: not ours until chosen); the choice keeps that order. What counts:
  // - the address the viewer set: any HTTP answer, also a slow one (the viewer chose it; a token-only
  //   server answers this plain probe 401 and the plugins' own requests carry the token); no answer at
  //   all = none;
  // - `own`: a Lampac's JSON (its list, or {accsdb}: a request to sign in), or 401 / 403 (a server that
  //   wants the token); a static host's page (404, HTML) is none;
  // - the page's host: only a Lampac's JSON (its list or a sign-in; a CDN's or Cloudflare's 403 in front
  //   of a public Lampa is no Lampac);
  // - a plugin's host (a public Lampac, or no Lampac at all): only a Lampac's JSON - the first that gives
  //   its list, else the first that asks to sign in. Any other answer: no Lampac, remembered
  //   (alc_auto_srv_no: a day; no answer: an hour) so a changed plugin list is not probed again.
  // An http address under an https page goes over https (the browser blocks http there unsent). One probe
  // per base for all plugins, its answer kept a minute (a Lampac too: a search after a lost server must
  // not trust an old yes). The answer of a search is kept a minute (per `own`; a changed setting or
  // plugin list searches at once); searches for the same `own` at the same time are one search.
  // Contract: window.alc_pack_srv = {v, st}; the newest copy serves all (v >= SRV_V; any change of the block
  // bumps it; unversioned copies use window.alc_pack_probe); st (probes, searches, hosts) is taken over
  // when st.v matches, else started afresh (an older copy on the page: one more discovery).
  var SRV_V = 7, ST_V = 2;
  // a stored {key: until} map without the entries whose time is over
  function unexpired(m, now) { var out = {}, k; if (m && typeof m === 'object') for (k in m) if (m[k] > now) out[k] = m[k]; return out; }
  function packSrv() {
    var P = window.alc_pack_srv, S;
    if (P && P.v >= SRV_V) return P;
    S = window.alc_pack_srv = { v: SRV_V };
    var kept = S.st = P && P.st && P.st.v === ST_V ? P.st : { v: ST_V, seen: {}, memo: {}, hosts: {}, self: {}, seq: 0 };
    var seen = kept.seen, memo = kept.memo, hosts = S.hosts = kept.hosts, self = kept.self, AGAIN = 60000, NO = 'alc_auto_srv_no';
    var get = function (k, d) { try { return Lampa.Storage.get(k, d); } catch (e) { return d; } };
    var origin = function (u) { var m = /^(https?:\/\/[^\/?#]+)/i.exec(String(u || '')); return m ? m[1] : ''; };
    var reach = function (b) { var h = false; try { h = location.protocol === 'https:'; } catch (e) {} return b && h ? b.replace(/^http:/i, 'https:') : b; };
    // Lampa's plugin list: as stored (the search's key), parsed (a search)
    var plRaw = function () { var r = null; try { r = localStorage.getItem('plugins'); } catch (e) {} return r !== null ? r : JSON.stringify(get('plugins', [])); };
    var plugins = function () { var pl = get('plugins', '[]'); if (typeof pl === 'string') { try { pl = JSON.parse(pl); } catch (e) { pl = []; } } return pl || []; };
    // cb(kind, status, timedOut): kind 2 = a Lampac's list, 1 = a Lampac asking to sign in, 0 = else;
    // status 429: it kept answering 429 (busy: no answer about it, not kept). Through request(): a 429 is
    // sent again and feeds the host's state. seen[base]: [callbacks] = asking, else {k, st, to, at}
    S.probe = function (base, cb) {
      var s = seen[base];
      if (s && s.push) { s.push(cb); return; }
      if (s && Date.now() - s.at < AGAIN) { cb(s.k, s.st, s.to); return; }
      var w = seen[base] = [cb];
      var fin = function (k, st, to) {
        if (seen[base] !== w) return;
        if (st === 429) delete seen[base]; else seen[base] = { k: k, st: st || 0, to: !!to, at: Date.now() };
        w.forEach(function (f) { try { f(k, st || 0, !!to); } catch (e) {} });
      };
      if (!base) { fin(0); return; }
      try {
        S.json({ url: base + '/lite/events?rjson=true', mine: false, timeout: 5000, pri: true, done: function (st, j, text, to, thr) {
          var k = !j || typeof j !== 'object' ? 0 : j.accsdb ? 1 : st >= 200 && st < 300 ? 2 : 0;
          if (k === 2) S.learn(base, j);
          if (thr) fin(0, 429); else fin(k, st, !!to);
        } });
      } catch (e) { fin(0); }
    };
    // the setting «Адрес вашего Lampac»: "host:port", "http(s)://host:port", also with a proxy's path
    // before /lite; asSet: as written (http stays http), else as it is asked (see reach)
    S.setting = function (asSet) {
      var v = String(get('alc_auto_server', '') || '').trim();
      if (!v) return '';
      if (!/^https?:\/\//i.test(v)) v = 'http://' + v;
      v = v.replace(/[?#].*$/, '').replace(/\/+$/, '').replace(/\/lite$/i, '');
      return asSet ? v : reach(v);
    };
    // the candidates in order (pl: Lampa's plugin list, else read here); out.mine: `own` leads (0 or 1),
    // out.own: own + the page's host, out.via[base]: the plugin it came from
    S.cands = function (own, pl) {
      var out = [], via = {};
      var add = function (b, from) { b = reach(b); if (b && out.indexOf(b) < 0) { out.push(b); if (from) via[b] = from; } };
      var plugin = function (u) {
        var o = typeof u === 'string' ? origin(u) : '';
        if (o) { add(o + u.slice(o.length).replace(/[?#].*$/, '').replace(/\/[^\/]*$/, ''), u); add(o, u); }
      };
      if (/^https?:\/\/[^\/?#]/i.test(own || '')) add(String(own).replace(/[?#].*$/, '').replace(/\/+$/, ''));
      out.mine = out.length;
      try { if (/^https?:$/.test(location.protocol)) add(location.protocol + '//' + location.host); } catch (e) {}
      out.own = out.length;
      try { (pl || plugins()).forEach(function (p) { plugin(p && typeof p === 'object' ? p.url : p); }); } catch (e) {}
      out.via = via;
      return out;
    };
    // a server that stopped answering: probed and searched afresh next time
    S.forget = function (base) {
      if (seen[base] && !seen[base].push) delete seen[base];
      for (var o in memo) if (memo[o].b === base) delete memo[o];
    };
    // cb(base, r): r = the chosen answer {kind, status, timedOut, via: the plugin it was found by}.
    // memo[own]: the answer {key, at, b, r}, or a search running {key, at, w: [callbacks]} (the plugins
    // starting together ask once; one stuck past a minute - longer than probes retried after 429s - is
    // not waited for)
    S.find = function (own, cb) {
      var key = String(get('alc_auto_server', '') || '') + ' ' + plRaw(), m = memo[own];
      if (m && m.key === key && Date.now() - m.at < AGAIN) { if (m.w) m.w.push(cb); else cb(m.b, m.r); return; }
      var run = memo[own] = { key: key, at: Date.now(), w: [cb] };
      var answer = function (b, r) {
        if (run.b !== undefined) return;
        run.b = b; r.via = r.via || '';
        // (none found because a candidate kept answering 429: not kept, the next search asks again)
        if (memo[own] === run) { if (r.busy) delete memo[own]; else memo[own] = { key: key, at: Date.now(), b: b, r: r }; }
        run.w.forEach(function (f) { try { f(b, r); } catch (e) {} });
      };
      try { search(own, plugins(), answer); } catch (e) { answer('', { kind: 0, status: 0, timedOut: false }); }
    };
    var STAGE = 1500, search = function (own, pl, answer) {
      var fixed = S.setting();
      if (fixed) { S.probe(fixed, function (k, st, to) { answer(k || st || to ? fixed : '', { kind: k, status: st, timedOut: to }); }); return; }   // (429: an answer)
      var c = S.cands(own, pl), now = Date.now(), no = unexpired(get(NO, null), now), fresh = {}, ans = [], decided = false;
      var decide = function () {
        if (decided) return;
        var pick = -1, i;
        for (i = 0; i < c.length; i++) {
          if (!ans[i]) return;   // an earlier candidate has not answered (or been asked) yet
          if (ans[i].kind === 2 || (ans[i].kind === 1 && i < c.own)) { pick = i; break; }
          if (ans[i].kind === 1 && pick < 0) pick = i;
        }
        decided = true;
        if (pick < 0) answer('', { kind: 0, status: 0, timedOut: false, busy: ans.some(function (a) { return a.status === 429; }) });
        else { ans[pick].via = c.via[c[pick]]; answer(c[pick], ans[pick]); }
      };
      // c[a..z) probed at once (a plugin's host known as no Lampac: not asked); then() once all answered
      var stage = function (a, z, then) {
        var left = 1, i;
        var one = function (i) {
          left++;
          S.probe(c[i], function (k, st, to) {
            // `own` answering 401 / 403: a Lampac that wants its token (the plugins' own requests carry it)
            ans[i] = { kind: k || (i < c.mine && (st === 401 || st === 403) ? 1 : 0), status: st, timedOut: to };
            // (a busy one, 429, is not remembered as no Lampac: unknown, asked again next time)
            if (!k && st !== 429 && i >= c.own) fresh[c[i]] = Date.now() + (st > 0 ? 86400000 : 3600000);
            decide();
            if (!--left) then();
          });
        };
        for (i = a; i < z; i++) { if (i >= c.own && no[c[i]] > now) ans[i] = { kind: 0, status: 0, timedOut: false }; else one(i); }
        decide();
        if (!--left) then();
      };
      // the plugins' hosts once own / the page's host cannot decide any more (all answered), or have not
      // decided within STAGE ms (a slow or busy one: asked alongside; the order of the choice stays); their
      // «no Lampac» written once, into the map as stored now (another search may have written meanwhile)
      var two = function () {
        clearTimeout(t2);
        if (two.on || decided) return;
        two.on = true;
        stage(c.own, c.length, function () {
          var cur = unexpired(get(NO, null), Date.now()), b, n = 0;
          for (b in fresh) { cur[b] = fresh[b]; n++; }
          if (n) try { Lampa.Storage.set(NO, cur); } catch (e) {}
        });
      }, t2 = setTimeout(two, STAGE);
      stage(0, c.own, two);
    };
    // the device's token and id as the server's own plugins send them: read again as soon as Lampa stores
    // one of them (a request right after signing in carries the token), else at most once a second (a
    // value written past Lampa.Storage)
    var TOK = ['alpac_token', 'lampac_token', 'lampac_auth_token'], vals = {};
    var recent = function (k, f) { return function () { var m = vals[k], now = Date.now(); if (!m || now - m.at > 1000 || now < m.at) m = vals[k] = { v: f(), at: now }; return m.v; }; };
    try { Lampa.Storage.listener.follow('change', function (e) { var n = e && e.name; if (n === 'lampac_unic_id') delete vals.uid; else if (TOK.indexOf(n) >= 0) delete vals.tok; }); } catch (e) {}
    S.token = recent('tok', function () {
      var tok = '', i;
      for (i = 0; i < TOK.length && !tok; i++) tok = get(TOK[i], '') || '';
      if (!tok) { try { tok = localStorage.getItem('lampac_auth_token') || ''; } catch (e) {} }
      return String(tok);
    });
    S.uid = recent('uid', function () { return String(get('lampac_unic_id', '') || ''); });
    // our server: a request to the server at `base` - relative, or to its host NAME (any scheme or port:
    // behind a proxy it hands out other ones), a name it gives itself in its links (learnt from its list:
    // S.learn), or localhost / 127.x for a /lite/ link (its own listen address). Only these get the token
    var nameOf = function (u) { var m = /^(?:[a-z][a-z0-9+.-]*:)?\/\/(?:[^\/?#@]*@)?([^\/?#:]+)/i.exec(String(u)); return m ? m[1].toLowerCase() : ''; };
    var LITE = /^(?:[a-z][a-z0-9+.-]*:)?\/\/[^\/?#]+\/(?:[^?#]*\/)?lite\//i;
    S.mine = function (url, base) {
      url = String(url);
      if (!/^(?:[a-z][a-z0-9+.-]*:)?\/\//i.test(url)) return true;
      var h = nameOf(url), b = nameOf(base);
      return !!h && !!b && (h === b || !!(self[b] && self[b][h]) || (/^(localhost|127\.\d+\.\d+\.\d+|0\.0\.0\.0)$/.test(h) && LITE.test(url)));
    };
    // the names the server at `base` gives itself in the /lite/ links of its list (the probe's, Autopilot's)
    S.learn = function (base, list) {
      var b = nameOf(base), m = self[b] || (self[b] = {});
      if (list && list.online) list = list.online;
      if (b && list && list.forEach) list.forEach(function (e) { var u = e && typeof e.url === 'string' ? e.url : ''; if (LITE.test(u)) m[nameOf(u)] = 1; });
    };
    // json(o): request(o) for JSON. Our server's (o.mine, else S.mine(o.url, o.base)) gets the device id
    // (uid=, unless there), the token and cookies; o.headers, then o.accept: an Accept header.
    // o.done(status, json, text, timedOut, throttled, kind): json null with kind 'empty' / 'bad' (not JSON)
    S.json = function (o) {
      var r = {}, k, url = String(o.url), mine = o.mine !== undefined ? !!o.mine : S.mine(url, o.base), id = mine && S.uid(), tok = mine && S.token(), hd = {};
      if (id && !/[?&]uid=/.test(url)) url += (url.indexOf('?') < 0 ? '?' : '&') + 'uid=' + encodeURIComponent(id);
      for (k in o.headers || {}) hd[k] = o.headers[k];
      if (tok) { hd['X-Lampac-Token'] = tok; hd['X-Alpac-Token'] = tok; }
      if (o.accept) hd.Accept = o.accept;
      for (k in o) r[k] = o[k];
      r.url = url; r.headers = hd; r.cred = mine;
      r.done = function (st, text, to, thr) {
        var j = null, kind = /\S/.test(text || '') ? '' : 'empty';
        if (!kind) try { j = JSON.parse(text); } catch (e) { kind = 'bad'; }
        o.done(st, j, text, to, thr, kind);
      };
      S.request(r);
    };
    // ---- a busy server: 429 (and 503 with Retry-After), one state per host for every plugin ----
    // A public Lampac answers 429 when a card's ~35 sources and season pages come at once: sent again
    // (Retry-After <= 30 s, else 1, 2, 4, 8 s; 4 times at most). When the SERVER throttles (429s for two
    // paths, or for its list, within 3 s) its host gets a limit (AIMD: half of what is on the way, 2 at
    // least, once per round; +1 per 4 answers; none at 32 or after a quiet minute), a pause (Retry-After,
    // else ~300 ms) and a line in the callers' order; a host that never throttles gets every request at once.
    var T_TRIES = 4, T_MAX = 30000, T_WIN = 3000, T_PAUSE = 300, T_UP = 4, T_FREE = 32, T_IDLE = 60000,
      T_SLOW = 2500, T_SLACK = 4;   // on the way over 2.5 s: its slot given up while < lim + 4 are on the way
    // hosts: host -> {lim, on: holding a slot, slow: on the way without one, live: [on the way], wait: [entries],
    // ok: answers toward +1, cut: round, at: the last 429, until: paused till, hits: [{t, p}], timer / sweep}
    S.THR_BUSY = 1; S.THR_GONE = 2;
    S.hostKey = function (u) {
      var m = /^(?:([a-z][a-z0-9+.-]*):)?\/\/(?:[^\/?#@]*@)?([^\/?#]+)/i.exec(String(u)), sch, hp;
      if (!m) return String(location.host || '').toLowerCase();
      sch = String(m[1] || location.protocol || '').replace(/:$/, '').toLowerCase();
      hp = m[2].toLowerCase();
      return (sch === 'https' && /:443$/.test(hp)) || (sch === 'http' && /:80$/.test(hp)) ? hp.replace(/:\d+$/, '') : hp;
    };
    var hostOf = function (u) {
      var k = S.hostKey(u), h = hosts[k] || (hosts[k] = { lim: Infinity, on: 0, slow: 0, live: [], wait: [], ok: 0, cut: 0, at: 0, until: 0, timer: 0, hits: [], sweep: 0 });
      if (h.lim < Infinity && Date.now() - h.at > T_IDLE) { h.lim = Infinity; h.ok = 0; }
      return h;
    };
    var jitter = function (ms) { return ms * (0.75 + Math.random() * 0.5); };   // +-25%
    // a limited host, every 500 ms: a request on the way over T_SLOW gives its slot up (a slow source's
    // own site must not hold the line); stops with the limit or when nothing is on the way
    var sweep = function (h) {
      if (h.sweep || h.lim === Infinity) return;
      h.sweep = setTimeout(function () {
        var now = Date.now(), list = h.live.slice(), i, q;
        h.sweep = 0;
        if (h.lim === Infinity || !list.length) return;
        for (i = 0; i < list.length && h.on + h.slow < h.lim + T_SLACK; i++) {   // (one at a time, each slot to the line at once)
          q = list[i];
          if (q.slot === 'on' && now - q.t >= T_SLOW) { q.slot = 'slow'; h.on--; h.slow++; if (h.wait.length) pump(h); }
        }
        sweep(h);
      }, 500);
    };
    // a request's place in a limited host's line (higher first, then the oldest; see request); one sent
    // again after a 429 one rank lower, still by its first time (not starved by newer ones); -1: not sent at all (cancelled). The caller's
    // predicates run inside another request's end: one that throws counts as no
    var holds = function (f, t) { try { return !!(f && f(t)); } catch (e) { return false; } };
    var rank = function (e) {
      var o = e.o, t = o.tag, r;
      if (t && t.gone) return -1;
      if (o.pri) r = 5;
      else if (!t) r = o.bg ? 0 : o.low ? 3 : 4;
      else if (!o.front || holds(o.front, t)) r = o.low ? 3 : 4;
      else if (!o.bg) r = 2;
      else if (holds(o.shown, t)) r = 1;
      else return -1;
      return e.again && r > 0 ? r - 1 : r;
    };
    var pump = function (h) {
      var w = h.until - Date.now(), i, r, b, best;
      if (w > 0) { if (!h.timer) h.timer = setTimeout(function () { h.timer = 0; pump(h); }, w); return; }
      while (h.wait.length && h.on < h.lim) {
        if (h.lim === Infinity) { try { h.wait.shift().send(); } catch (er) {} continue; }   // (no limit: in turn, as they came)
        b = -1; best = -1;
        for (i = 0; i < h.wait.length; i++) {
          r = rank(h.wait[i]);
          if (r < 0) { h.wait.splice(i--, 1)[0].cancel(); continue; }
          if (r > b || (r === b && h.wait[i].at < h.wait[best].at)) { b = r; best = i; }
        }
        if (best < 0) break;
        try { h.wait.splice(best, 1)[0].send(); } catch (er) {}
      }
    };
    // Retry-After in ms; null: none, 0: there but of no use (a past date, unreadable). Only the headers the
    // browser lets us see (a cross-origin server must expose it); the first of several values
    S.retryAfter = function (x) {
      var m = null, v, p, t;
      try { m = /(?:^|\n)\s*retry-after:[ \t]*([^\r\n]*)/i.exec(x.getAllResponseHeaders() || ''); } catch (e) {}
      if (!m) return null;
      v = m[1].replace(/^\s+|\s+$/g, ''); p = v.split(',');
      if (/^\d/.test(v)) t = parseFloat(v) * 1000;   // seconds, also "1.5" (parseFloat stops at a comma)
      else { t = Date.parse(v); if (isNaN(t)) t = Date.parse(p[0] + ',' + (p[1] || '')); t -= Date.now(); }
      return isNaN(t) || t < 0 ? 0 : Math.max(500, Math.min(T_MAX, t));
    };
    // request(o): GET o.url; o.done(status, text, timedOut, throttled) once, never inside the call or another
    // request's callbacks. status 0 = no answer; timedOut = seconds waited (o.timeout from its own send;
    // THR_BUSY: since the first); throttled: THR_BUSY kept answering 429, THR_GONE cancelled (no fault of the
    // source). o.cred, o.headers; o.plain: not a Lampac (TMDB, a CDN), its 429 is the answer. The line:
    // o.pri, the screen in front's (no o.tag, or o.front(tag); o.low after), other tags', o.bg of a tag while
    // o.shown(tag) (else cancelled), o.bg without a tag last (never cancelled); tag.gone: cancelled
    S.request = function (o) {
      var done = false, tries = 0, t0 = 0, h = hostOf(o.url), later = function (f) { setTimeout(f, 0); };
      // at: its first place in the line (kept on a retry: ties go to the oldest)
      var e = { o: o, at: ++kept.seq, send: send, cancel: function () { if (!done) { done = true; later(function () { o.done(0, '', undefined, S.THR_GONE); }); } } };
      go();
      function go() {
        if (h.lim === Infinity && !h.wait.length && h.until <= Date.now()) send();
        else { h.wait.push(e); pump(h); }
      }
      function send() {
        if (done) return;
        // the slot: 'on' holding one, 'slow' gave it up (see sweep), '' answered
        var cut = h.cut, req = { t: Date.now(), slot: 'on' }, x, k;
        var finish = function () {
          var was = req.slot;
          if (!was) return;
          req.slot = '';
          h.live.splice(h.live.indexOf(req), 1);
          if (was === 'on') { h.on--; if (h.wait.length) pump(h); } else h.slow--;
        };
        var end = function (st, text, to, thr) { finish(); if (!done) { done = true; o.done(st, text, to, thr); } };
        h.on++; h.live.push(req); sweep(h);
        if (!t0) t0 = Date.now();
        try {
          x = new XMLHttpRequest();
          x.open('GET', o.url, true);
          x.timeout = o.timeout || 20000;
          if (o.cred) x.withCredentials = true;
          for (k in o.headers || {}) x.setRequestHeader(k, o.headers[k]);
          x.onload = function () {
            var st = x.status, ra = st === 429 || st === 503 ? S.retryAfter(x) : null;
            if (!o.plain && (st === 429 || ra !== null)) { throttled(ra); return; }
            // an answer while the limit holds: one step back toward no limit
            if (h.lim < Infinity && (h.wait.length || h.on >= h.lim) && ++h.ok >= T_UP) { h.ok = 0; h.lim = h.lim + 1 >= T_FREE ? Infinity : h.lim + 1; }
            end(st, x.responseText);
          };
          x.onerror = function () { end(0, ''); };
          x.ontimeout = function () { end(0, '', x.timeout / 1000); };
          x.send();
        } catch (er) { finish(); later(function () { end(0, ''); }); }
        // the server throttles: the limit is half of what is on the way (answers to requests sent before
        // the cut do not cut again)
        function throttled(ra) {
          var now = Date.now(), path = o.url.replace(/^(?:[a-z][a-z0-9+.-]*:)?(?:\/\/[^\/?#]+)?([^?#]*).*$/i, '$1') || '/', paths = {}, n = 0;
          h.hits = h.hits.filter(function (q) { return now - q.t < T_WIN; });
          h.hits.push({ t: now, p: path });
          h.hits.forEach(function (q) { if (!paths[q.p]) { paths[q.p] = 1; n++; } });
          if (n >= 2 || /\/lite\/events$/.test(path)) {
            h.at = now;
            if (cut === h.cut) {
              h.lim = Math.max(2, Math.min(h.lim, Math.floor((h.on + h.slow) / 2))); h.cut++; h.ok = 0;
              h.until = now + (ra > 0 ? ra : jitter(T_PAUSE));
              sweep(h);
            }
          }
          finish();
          if (++tries > T_TRIES) { end(0, '', Math.round((Date.now() - t0) / 1000), S.THR_BUSY); return; }
          e.again = true;
          setTimeout(function () { if (!done) go(); }, ra > 0 ? ra : jitter(Math.min(T_MAX, 1000 * Math.pow(2, tries - 1))));
        }
      }
    };
    window.alc_pack_probe = function (base, cb) { S.probe(base, function (k, st) { cb(k > 0 || st === 401 || st === 403); }); };
    return S;
  }
  packSrv();
  function packServer(own, cb) {
    var done = false, once = function (b) { if (done) return; done = true; cb(b || ''); };
    if (typeof window.alc_auto_server === 'function') {
      try { window.alc_auto_server(once); } catch (e) { once(''); }
      return;
    }
    try { packSrv().find(own, once); } catch (e) { once(''); }
  }
  // A copy served without the placeholder filled in (stock Lampa, a copy from elsewhere): Autopilot's
  // server or the one the pack's search finds (the setting, the script's own host, the page's, the
  // installed plugins' hosts: [pack server] above). No server: the player is left alone (nothing is asked, Lampa's
  // own subtitle list stays as it is).
  var hostFixed = HOST.charAt(0) !== '{';
  // cb(true) with HOST set, cb(false) when there is no server
  function withHost(cb) {
    if (hostFixed) return cb(true);
    packServer(ORIGIN, function (b) { if (b) HOST = b; cb(!!b); });
  }

  // a request to our server: the device's token and cookie go with it, as with the server's own
  // plugins (a server with authorisation answers 401 without them, and the status stuck at «none»);
  // through the pack's shared limiter (a busy server's 429s sent again after its pause, one state per
  // host for all the pack's plugins; the viewer waits for these: pri). cb(true, json) for a 2xx answer
  // that is JSON (an empty one: null, as $.ajax took it), else cb(false)
  function ask(url, timeout, cb) {
    packSrv().json({ url: url, mine: true, timeout: timeout, pri: true, accept: 'application/json, text/javascript, */*; q=0.01',
      done: function (st, j, text, to, thr, kind) { if (st >= 200 && st < 300 && kind !== 'bad') cb(true, j); else cb(false); } });
  }

  // the device id (the block's S.uid) in our server's links (also the download links Lampa asks itself)
  function withUid(url) {
    var u = packSrv().uid();
    return u ? url + (url.indexOf('?') < 0 ? '?' : '&') + 'uid=' + encodeURIComponent(u) : url;
  }

  function video() {
    try { return Lampa.PlayerVideo.video(); } catch (e) { return null; }
  }

  function langs() {
    var v = '';
    try { v = Lampa.Storage.get('opensubs_langs', '') || ''; } catch (e) {}
    return String(v || 'uk,ru,en').replace(/\s+/g, '').toLowerCase();   // the answers are keyed by lower-case codes
  }
  // for the pack's other plugins: the subtitle languages in preference order as used here (the setting,
  // else the default uk,ru,en). A newer copy's API is left in place
  if (!(window.alc_opensubs_api && window.alc_opensubs_api.version >= 1)) {
    window.alc_opensubs_api = { version: 1, langs: function () { return langs().split(',').filter(Boolean); } };
  }

  function currentCard(data) {
    if (data && data.card) return data.card;
    try {
      var a = Lampa.Activity.active();
      if (a) return a.movie || a.card || null;
    } catch (e) {}
    return null;
  }

  function resolveImdb(card, cb) {
    if (!card) return cb('');
    if (card.imdb_id) return cb(card.imdb_id);
    if (card.external_ids && card.external_ids.imdb_id) return cb(card.external_ids.imdb_id);
    if (!card.id) return cb('');
    var type = card.name || card.original_name ? 'tv' : 'movie';
    var key = type + card.id;
    if (imdbCache[key] !== undefined) return cb(imdbCache[key]);
    var url;
    try { url = Lampa.TMDB.api(type + '/' + card.id + '/external_ids?api_key=' + Lampa.TMDB.key()); }
    catch (e) { return cb(''); }
    $.ajax({
      url: url, dataType: 'json', timeout: 8000,
      success: function (j) { imdbCache[key] = (j && j.imdb_id) || ''; card.imdb_id = imdbCache[key] || card.imdb_id; cb(imdbCache[key]); },
      error: function () { cb(''); }
    });
  }

  // ---------- the "ossubs" server module (own OpenSubtitles login) ----------
  // Asked once per app session; not installed / not logged in -> the built-in download.
  var mod = { state: 0, info: null, wait: [] };   // state: 0 unknown, 1 asking, 2 use it, 3 not available
  function probeModule(cb) {
    if (mod.state >= 2) return cb(mod.state === 2);
    mod.wait.push(cb);
    if (mod.state === 1) return;
    mod.state = 1;
    var done = function (j) {
      mod.info = j || null;
      mod.state = j && j.ossubs && j.logged_in ? 2 : 3;
      if (j && j.ossubs && !j.logged_in) console.log('OpenSubsMenu', 'ossubs module: not logged in (' + (j.reason || '?') + '), built-in download is used');
      var w = mod.wait; mod.wait = [];
      w.forEach(function (f) { try { f(mod.state === 2); } catch (e) {} });
    };
    ask(withUid(HOST + '/lite/ossubs?op=status&rjson=true'), 12000, function (ok, j) { done(ok && j && typeof j === 'object' ? j : null); });
  }
  function useModule() { return mod.state === 2; }
  function downloadUrl(fileId) {
    var id = encodeURIComponent(fileId);
    return withUid(useModule() ? HOST + '/lite/ossubs?op=dl&rjson=true&file_id=' + id : HOST + '/api/opensubs/download?file_id=' + id);
  }

  // ---------- download quota ----------
  // OpenSubtitles allows a few downloads a day: 5 per server IP for the API key alone (built-in
  // download), more for a logged-in account (ossubs module); the two are counted separately.
  // Past it the chosen track stays empty without a word: a failed download is reported, the
  // OpenSubtitles items are marked until the quota renews, and alc_auto's automatic choice
  // skips them meanwhile (window.alc_opensubs_quota_out).
  var quota = { builtin: 0, module: 0 };
  try {
    quota.builtin = parseInt(Lampa.Storage.get('opensubs_quota_until', '0'), 10) || 0;
    quota.module = parseInt(Lampa.Storage.get('ossubs_quota_until', '0'), 10) || 0;
  } catch (e) {}
  function quotaUntil() { return useModule() ? quota.module : quota.builtin; }
  function quotaOut() { return Date.now() < quotaUntil(); }
  window.alc_opensubs_quota_out = quotaOut;
  function setQuota(viaModule, until) {
    quota[viaModule ? 'module' : 'builtin'] = until;
    try { Lampa.Storage.set(viaModule ? 'ossubs_quota_until' : 'opensubs_quota_until', String(until)); } catch (e) {}
  }
  function lang3() {
    var l = '';
    try { l = String(Lampa.Storage.get('language', 'ru') || 'ru'); } catch (e) {}
    return l === 'uk' ? 1 : l === 'ru' || l === 'be' ? 0 : 2;   // Belarusian: Russian, as in the rest of the pack
  }
  function hhmm(ts) { var d = new Date(ts); return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); }
  function quotaText(until) {
    return ['OpenSubtitles: дневной лимит загрузок исчерпан, до ', 'OpenSubtitles: денний ліміт завантажень вичерпано, до ',
      'OpenSubtitles: daily download limit reached, until '][lang3()] + hhmm(until);
  }
  function noty(t) { try { Lampa.Noty.show(t); } catch (e) {} }
  function failText(code) {
    return 'OpenSubtitles: ' + ['ошибка загрузки', 'помилка завантаження', 'download failed'][lang3()] + ' (' + code + ')';
  }
  function quotaHit(viaModule, j) {
    var until = (j && Date.parse(j.reset_time_utc)) || Date.now() + 6 * 3600 * 1000;
    setQuota(viaModule, until);
    noty(quotaText(until));
  }
  // built-in /api/opensubs/download: the status tells; 406 = quota
  function onBuiltinDownload() {
    if (this.status === 200 || !this.status) return;
    var j = null;
    try { j = JSON.parse(this.responseText); } catch (e) {}
    if (this.status === 406 || (j && j.remaining === 0)) quotaHit(false, j);
    else noty(failText(this.status));
  }
  // ossubs module: always HTTP 200; the subtitle text, or JSON {error, remaining, reset_time_utc}
  function onModuleDownload() {
    if (!this.status) return;
    var t = String(this.responseText || '');
    if (this.status !== 200) return noty(failText(this.status));
    if (t.charAt(0) !== '{') return;
    var j = null;
    try { j = JSON.parse(t); } catch (e) {}
    if (!j || !j.error) return noty(failText('?'));
    if (j.error === 'quota' || j.remaining === 0) return quotaHit(true, j);
    if (j.error === 'not_logged_in' || j.error === 'login_failed') mod.state = 3;   // next items: built-in download
    noty(failText(j.error));
  }
  // Lampa downloads the chosen file itself (XMLHttpRequest): watch only our download URLs
  function watchDownloads() {
    var X = window.XMLHttpRequest;
    if (!X || !X.prototype || X.prototype.alc_os_watch) return;
    X.prototype.alc_os_watch = true;
    var open = X.prototype.open;
    X.prototype.open = function (method, url) {
      try {
        var u = String(url);
        if (/\/api\/opensubs\/download\?/.test(u)) this.addEventListener('loadend', onBuiltinDownload);
        else if (/\/lite\/ossubs\?op=dl&/.test(u)) this.addEventListener('loadend', onModuleDownload);
      } catch (e) {}
      return open.apply(this, arguments);
    };
  }

  function forcedWord() {
    return ['Форсированные', 'Форсовані', 'Forced'][lang3()];
  }
  function embeddedWord() {
    return ['Встроенные', 'Вбудовані', 'Embedded'][lang3()];
  }

  // Forced subtitles (only the foreign-language parts) come first in their language and are
  // labelled; lang / forced / os stay on the items so «Автопилот» (alc_auto) can pick one.
  function buildList(results, only) {
    var byLang = {}, fw = forcedWord();
    var order = only || langs().split(',');
    var mark = quotaOut() ? ' · ⛔ ' + hhmm(quotaUntil()) : '';
    results.forEach(function (r) {
      var a = r.attributes || {};
      if (!a.files || !a.files.length) return;
      var l = (a.language || '').toLowerCase();
      (byLang[l] = byLang[l] || []).push(a);
    });
    var out = [];
    order.forEach(function (l) {
      var all = (byLang[l] || []).sort(function (x, y) {
        return (!!y.foreign_parts_only - !!x.foreign_parts_only) || (y.download_count || 0) - (x.download_count || 0);
      });
      // the forced ones are rare: keep them even when the language has many full ones
      var list = all.filter(function (a) { return a.foreign_parts_only; }).slice(0, 2)
        .concat(all.filter(function (a) { return !a.foreign_parts_only; }).slice(0, PER_LANG));
      list.forEach(function (a) {
        var rel = String(a.release || (a.feature_details && a.feature_details.title) || '').slice(0, 48);
        out.push({
          label: 'OS ' + l.toUpperCase() + (a.foreign_parts_only ? ' · ' + fw : '') + (a.hearing_impaired ? ' SDH' : '') + ' · ' + rel + mark,
          url: downloadUrl(a.files[0].file_id),
          lang: l, forced: !!a.foreign_parts_only, hi: !!a.hearing_impaired, os: true
        });
      });
    });
    return out;
  }

  // ---------- more providers: the server module "subsx" ----------
  // One search per play item for all languages; the items carry lang / forced / hi like the
  // OpenSubtitles ones (Autopilot picks among them the same way). cb(items), [] when none.
  function altSearch(card, season, episode, only, cb) {
    if (!card) return cb([]);
    var serial = !!(card.name || card.original_name);
    var date = String(card.release_date || card.first_air_date || '');
    var p = {
      op: 'search', rjson: 'true', imdb: card.imdb_id || '', tmdb: card.id && (card.source || 'tmdb') === 'tmdb' ? card.id : '',
      title: card.title || card.name || '', otitle: card.original_title || card.original_name || '',
      year: /^\d{4}/.test(date) ? date.slice(0, 4) : '', kind: serial ? 'tv' : 'movie',
      s: season ? parseInt(season, 10) : '', e: episode ? parseInt(episode, 10) : '',
      olang: card.original_language || '', langs: (only || langs().split(',')).join(',')
    };
    var q = [];
    for (var k in p) if (p[k] !== '' && p[k] !== undefined && p[k] !== null) q.push(k + '=' + encodeURIComponent(p[k]));
    ask(withUid(HOST + '/lite/subsx?' + q.join('&')), 25000, function (ok, j) {
      if (!ok) return cb([]);
      var out = [];
      ((j && j.items) || []).forEach(function (it) {
        if (!it || !it.id || !it.lang) return;
        out.push({
          label: it.provider + ' ' + String(it.lang).toUpperCase() + (it.forced ? ' · ' + forcedWord() : '') + (it.hi ? ' SDH' : '') +
            (it.release ? ' · ' + String(it.release).slice(0, 48) : ''),
          url: withUid(HOST + '/lite/subsx?op=dl&id=' + encodeURIComponent(it.id)),
          lang: String(it.lang).toLowerCase(), forced: !!it.forced, hi: !!it.hi, alt: it.provider
        });
      });
      cb(out);
    });
  }
  // per language (in the viewer's order): OpenSubtitles first, then the other providers
  function mergeLists(os, alt) {
    if (!alt.length) return os;
    var order = langs().split(','), out = [];
    var of = function (list, l) { return list.filter(function (x) { return x.lang === l; }); };
    order.forEach(function (l) { out = out.concat(of(os, l), of(alt, l)); });
    // languages outside the order (an alt provider's Japanese for anime) at the end
    return out.concat(os.concat(alt).filter(function (x) { return order.indexOf(x.lang) < 0; }));
  }

  // ---------- the source's own subtitle files: forced-like ones are labelled ----------
  // A file with very few cues for the stream length (under one per 3 minutes) carries only
  // signs / foreign-language parts: it is labelled "forced" and flagged, so the automatic
  // choice does not take it for full subtitles. Files are tiny; each is read once per URL.
  var cueCache = {};   // url -> number of cues (-1: unreadable), or [callbacks] while loading
  var CUE_MIN_PER_MIN = 1 / 3;
  function countCues(url, cb) {
    var c = cueCache[url];
    if (typeof c === 'number') return cb(c);
    if (c) return c.push(cb);
    c = cueCache[url] = [cb];
    $.ajax({
      url: url, dataType: 'text', timeout: 8000,
      success: function (t) { cueCache[url] = (String(t || '').match(/-->/g) || []).length || -1; },
      error: function () { cueCache[url] = -1; },
      complete: function () { c.forEach(function (f) { try { f(cueCache[url]); } catch (e) {} }); }
    });
  }
  function streamMinutes(data) {
    var v = video();
    if (v && v.duration && isFinite(v.duration) && v.duration > 60) return v.duration / 60;
    var c = currentCard(data) || {};
    var rt = c.runtime || (c.episode_run_time && c.episode_run_time[0]) || 0;
    return rt > 0 ? rt : 0;
  }
  function isForcedLike(cues, minutes) {
    return cues > 0 && minutes >= 20 && cues < minutes * CUE_MIN_PER_MIN;
  }
  // reads the cue counts of the source's files (once per URL), then cb(); at most 6 s
  function classifyOwn(own, cb) {
    var left = own.length, done = false;
    var finish = function () { if (!done) { done = true; cb(); } };
    if (!left) return finish();
    setTimeout(finish, 6000);
    own.forEach(function (s) { countCues(s.url, function () { if (!--left) finish(); }); });
  }
  function markOwn(s, data) {
    var o = { label: s.label, url: s.url };
    if (s.lang) o.lang = s.lang;
    var n = cueCache[s.url];
    if (s.forced || (typeof n === 'number' && isForcedLike(n, streamMinutes(data)))) {
      o.forced = true;
      if (String(o.label || '').indexOf(forcedWord()) < 0) o.label = (o.label || '') + ' · ' + forcedWord();
    }
    return o;
  }

  // ---------- the stream's own subtitle tracks ----------
  // Lampa shows video.customSubs instead of the stream's tracks as soon as a list is set
  // (hls.js subtitle tracks, or video.textTracks of native HLS / mp4). They are put into the
  // list as items that switch the track itself; choosing one switches the others off.
  var hlsSubs = null;   // {v, gen, list}: the hls.js subtitle tracks Lampa reported for this stream
  // one stream = element + its alc_gen (Autopilot may load the next stream into the same element)
  function sameStream(o, v) { return !!o && !!v && o.v === v && (o.gen || 0) === (v.alc_gen || 0); }
  function nativeList(v) {
    if (!v) return [];
    if (sameStream(hlsSubs, v) && hlsSubs.list.length) return hlsSubs.list;
    var out = [], tt = v.textTracks;
    try {
      for (var i = 0; tt && i < tt.length; i++) if (tt[i] && (tt[i].kind === 'subtitles' || tt[i].kind === 'captions')) out.push(tt[i]);
    } catch (e) {}
    return out;
  }
  function nativeItem(n, i, selected) {
    var lang = String(n.language || n.lang || '').toLowerCase();
    var name = String(n.label || n.name || '').trim();
    var it = {
      label: embeddedWord() + ' · ' + (name && lang && name.toLowerCase().indexOf(lang) < 0 ? name + ' (' + lang + ')' : name || lang || '#' + (i + 1)),
      // "ready": Lampa then does not make it a file item (its own mode setter would load a url)
      ready: true, alc_native: i
    };
    if (lang) it.lang = lang.slice(0, 2);
    if (/forced/i.test(name) || n.forced) it.forced = true;
    if (selected) it.selected = true;
    return it;
  }
  function bindNative(v, nat) {
    if (!v || !v.customSubs) return;
    v.customSubs.forEach(function (sub) {
      if (typeof sub.alc_native !== 'number' || !nat[sub.alc_native]) return;
      var n = nat[sub.alc_native];
      try {
        Object.defineProperty(sub, 'mode', {
          configurable: true,
          get: function () { try { return n.mode; } catch (e) { return 'disabled'; } },
          set: function (m) {
            if (m === 'showing') {
              nat.forEach(function (o) { if (o !== n) try { if (o.mode === 'showing') o.mode = 'disabled'; } catch (e) {} });
              try { n.mode = 'showing'; } catch (e) {}
              // a file chosen before keeps being drawn by Lampa: a fresh list clears it
              resetFiles(v, sub.alc_native);
            } else {
              try { if (n.mode === 'showing') n.mode = 'disabled'; } catch (e) {}
            }
          }
        });
      } catch (e) {}
    });
  }
  var resetting = false;
  function resetFiles(v, idx) {
    if (resetting || !sameStream(cur, v)) return;
    resetting = true;
    setTimeout(function () {
      try { if (video() === v) setList(cur.own, cur.os, idx, true); } catch (e) {}
      // the last line of that file would stay on screen (native tracks are drawn by the video itself)
      try { Lampa.PlayerVideo.render().find('.player-video__subtitles-text').empty(); } catch (e) {}
      resetting = false;
    }, 0);
  }

  // one play item = card + season + episode (the playlist moves on with a new 'start')
  function playKey(data) {
    var c = currentCard(data) || {};
    return [c.id || '', (data && data.season) || 0, (data && data.episode) || 0].join(':');
  }
  function ownSubs(data) {
    return (data && data.subtitles && data.subtitles.length) ? data.subtitles : [];
  }

  function onStart(data) {
    var my = ++session;
    last = null;
    if (data && data.alc_trailer) return;   // a trailer («Трейлеры» marks it): not the film's subtitles
    withHost(function (ok) { if (ok && my === session) started(my, data); });
  }
  function started(my, data) {
    var card = currentCard(data);
    var own = ownSubs(data);
    var left = 4, os = [], alt = [];
    last = { my: my, key: playKey(data), own: own, os: [], applied: false };
    var step = function () { if (!--left && my === session) apply(my, mergeLists(os, alt), 0); };
    classifyOwn(own, step);
    probeModule(function () { step(); });
    resolveImdb(card, function (imdb) {
      // the other providers: anime ones need no IMDb id (titles), the rest use it when there is one
      if (my === session) altSearch(card, data && data.season, data && data.episode, null, function (l) { alt = l; step(); });
      else step();
      if (!imdb || my !== session) return step();
      // one search per language, in parallel: a single search over several languages is sorted by
      // downloads, and a rarely downloaded language (Ukrainian) falls off its first page.
      // Searches do not count against the download quota; the server caches them for an hour.
      var list = langs().split(',').filter(Boolean), n = list.length, all = [];
      if (!n) return step();
      list.forEach(function (l) {
        var url = HOST + '/api/opensubs/search?imdb_id=' + encodeURIComponent(imdb) + '&lang=' + encodeURIComponent(l);
        if (data && data.season && data.episode) url += '&season=' + parseInt(data.season, 10) + '&episode=' + parseInt(data.episode, 10);
        ask(withUid(url), 15000, function (ok, j) {
          if (ok && j && j.data) all = all.concat(j.data);
          if (--n) return;
          // built after the module answer: the download URLs depend on it
          probeModule(function () { os = buildList(all); step(); });
        });
      });
    });
  }

  // Android with an external player: Lampa hands the play data to that player at once, without
  // 'start' (no menu, nothing added later reaches it). «Автопилот» (alc_auto) asks here for the
  // OpenSubtitles items of one language and puts only the one it picks into the player's intent,
  // so at most one download is spent. cb(items) once, [] when nothing / no IMDb id.
  window.alc_opensubs_find = function (card, season, episode, lang, cb) {
    var sent = false;
    var give = function (list) { if (!sent) { sent = true; try { cb(list); } catch (e) {} } };
    withHost(function (ok) {
      if (!ok) return give([]);
      probeModule(function () {});   // the download URLs depend on it: asked meanwhile
      resolveImdb(card, function (imdb) {
        if (!lang) return give([]);
        // OpenSubtitles and the other providers at once; OpenSubtitles first
        var left = 2, os = [], alt = [];
        var done = function () { if (!--left) give(mergeLists(os, alt)); };
        altSearch(card, season, episode, [lang], function (l) { alt = l; done(); });
        if (!imdb) return done();
        var url = HOST + '/api/opensubs/search?imdb_id=' + encodeURIComponent(imdb) + '&lang=' + encodeURIComponent(lang);
        if (season && episode) url += '&season=' + parseInt(season, 10) + '&episode=' + parseInt(episode, 10);
        ask(withUid(url), 15000, function (ok, j) {
          if (ok) probeModule(function () { os = buildList((j && j.data) || [], [lang]); done(); });
          else done();
        });
      });
    });
  };

  // Wait until the video element has metadata so we know whether the stream carries
  // its own (HLS/embedded) text tracks.
  function apply(my, os, tries) {
    if (my !== session) return;
    var v = video();
    if ((!v || v.readyState < 1) && tries < 40) return setTimeout(function () { apply(my, os, tries + 1); }, 500);
    // the stream may have been switched meanwhile (another voice / source): its own subtitles;
    // marked now that the stream length is known
    var d = null;
    try { d = Lampa.Player.playdata(); } catch (e) {}
    var own = (d && last && playKey(d) === last.key ? ownSubs(d) : last ? last.own : []).map(function (s) { return markOwn(s, d); });
    if (last && last.my === my) { last.os = os; last.own = own; }
    // nothing of ours to add: leave Lampa's list (and the stream's own tracks) alone,
    // only label a forced-like source file in place
    if (!os.length && !(own.length && nativeList(v).length)) return markInPlace(v, own);
    if (last && last.my === my) last.applied = true;
    setList(own, os, -1, false);
  }

  function markInPlace(v, own) {
    if (!v || !v.customSubs || !own.length) return;
    var byUrl = {};
    own.forEach(function (o) { byUrl[o.url] = o; });
    v.customSubs.forEach(function (s) {
      var o = s && byUrl[s.url];
      if (o && o.forced && !s.forced) { s.forced = true; s.label = o.label; }
    });
    try { if (window.alc_auto_subs) window.alc_auto_subs(); } catch (e) {}
  }

  var cur = null;   // the list now in the player: {v, own, os}
  function setList(own, os, selNative, quiet) {
    var v = video();
    var nat = nativeList(v);
    var list = own.map(function (s) { var o = { label: s.label, url: s.url }; if (s.lang) o.lang = s.lang; if (s.forced) o.forced = true; return o; })
      .concat(nat.map(function (n, i) { return nativeItem(n, i, i === selNative); }))
      .concat(os);
    if (!list.length) return;
    cur = { v: v, gen: v && v.alc_gen, own: own, os: os };
    try { Lampa.Player.subtitles(list); } catch (e) { console.error('OpenSubsMenu', e && e.message); }
    bindNative(v, nat);
    if (quiet) return;
    // automatic choice (alc_auto «Автосубтитры»): the list is complete now
    try { if (window.alc_auto_subs) window.alc_auto_subs(); } catch (e) {}
  }

  // hls.js reports its subtitle tracks (Lampa event 'subs') when the manifest is parsed — maybe
  // after our list is in: Lampa's menu then shows only them. Put everything together again.
  function onSubs(e) {
    var v = video();
    if (!e || !e.subs || !v || e.subs === v.customSubs) return;
    var l = Array.prototype.slice.call(e.subs);
    if (!l.length || l.some(function (x) { return x && (x.url || typeof x.alc_native === 'number'); })) return;
    if (typeof TextTrack !== 'undefined' && l[0] instanceof TextTrack) return;   // video.textTracks: read directly
    hlsSubs = { v: v, gen: v.alc_gen, list: l };
    if (sameStream(cur, v) && last && last.applied && last.my === session) setTimeout(function () {
      if (video() === v && sameStream(cur, v)) setList(cur.own, cur.os, -1, false);
    }, 0);
  }

  // Switching the quality (or the voice in «Автопилот») gives a new stream (a new element, or the same
  // one, see sameStream) without any subtitle list: the source's own subtitles and ours are gone from
  // the menu. Put them back for the same play item (own = what the stream now playing brought).
  function onReload() {
    if (!last || last.my !== session) return;
    var d = null, v = video();
    try { d = Lampa.Player.playdata(); } catch (e) {}
    if (!d || !v || playKey(d) !== last.key) return;
    if (v.customSubs && v.customSubs.length) return;   // still there (e.g. the first load)
    var raw = ownSubs(d);
    var own = raw.length && last.own.length && raw[0].url === last.own[0].url ? last.own : raw.map(function (s) { return markOwn(s, d); });
    if (!own.length && !last.applied) return;          // nothing of ours was shown
    if (!own.length && !last.os.length) return;
    if (!last.os.length && !nativeList(v).length) return;   // Lampa's own list is complete
    setList(own, last.os, -1, false);
  }

  // ---------- the pack's settings folders (the same block in every plugin of the pack) ----------
  // Lampa lists a folder's items in the order plugins added them, and the pack's plugins load in any
  // order. Here each item names its group and its place in it; when Lampa draws a folder (it reads the
  // list through getParam every time) the list comes in that order, an item whose snack_show() says no
  // is left out, and a group with nothing left loses its title. «Закусь», the pack's own folder, is a
  // menu of sub-folders (Lampa components hidden from Settings' own list, opened from «Закусь» with
  // Back leading to it): items are still added to «Закусь» with a group, and the group decides the
  // sub-folder they are drawn in (copies of an older block, loaded first, keep working the same way).
  // Its last group, «О паке», lists the installed plugins' versions and resets the pack's options (not
  // the data: favourite voices, subscriptions…). The newest copy of this block serves all.
  var PACKSET_V = 4;
  function packSettings() {
    var S = window.snack_set;
    if (S && S.v >= PACKSET_V) return S;
    var api = Lampa.SettingsApi, old = S || {};
    function L(a) { var l = 'ru'; try { l = String(Lampa.Storage.get('language', 'ru') || 'ru'); } catch (e) {} return a[l === 'uk' ? 1 : l === 'ru' || l === 'be' ? 0 : 2]; }
    var TXT = {
      about: ['О паке', 'Про пак', 'About the pack'], versions: ['Версии', 'Версії', 'Versions'],
      reset: ['Сбросить настройки', 'Скинути налаштування', 'Reset settings'],
      reset_d: ['Все пункты «Закуси», кроме ваших данных (озвучки, подписки) и адреса сервера', 'Усі пункти «Закусі», крім ваших даних (озвучення, підписки) й адреси сервера', 'Every «Закусь» option, not your data (voices, subscriptions) nor the server address'],
      reset_q: ['Сбросить настройки «Закуси»?', 'Скинути налаштування «Закусі»?', 'Reset the «Закусь» settings?'],
      yes: ['Сбросить', 'Скинути', 'Reset'], no: ['Отмена', 'Скасувати', 'Cancel'],
      watch: ['Просмотр', 'Перегляд', 'Watching'],
      watch_d: ['Автопилот: запуск, озвучки, источники', 'Автопілот: запуск, озвучення, джерела', 'Autopilot: playback, voices, sources'],
      langs: ['Языки и субтитры', 'Мови й субтитри', 'Languages and subtitles'],
      langs_d: ['Порядок языков озвучки и субтитров', 'Порядок мов озвучення й субтитрів', 'The order of voice and subtitle languages'],
      cards: ['Главная и карточки', 'Головна й картки', 'Home and cards'],
      cards_d: ['Метка UA, трейлеры, фильтр ленты', 'Мітка UA, трейлери, фільтр стрічки', 'UA badge, trailers, feed filter'],
      feed: ['Фильтр ленты', 'Фільтр стрічки', 'Feed filter'],
      feed_d: ['Что прятать в лентах TMDB и CUB', 'Що ховати у стрічках TMDB і CUB', 'What to hide from the TMDB and CUB lists'],
      subs: ['Подписки', 'Підписки', 'Subscriptions'],
      subs_d: ['Новые серии в выбранной озвучке', 'Нові серії в обраному озвученні', 'New episodes in a chosen voice'],
      server: ['Сервер', 'Сервер', 'Server'],
      server_d: ['Ваш сервер с онлайн-источниками', 'Ваш сервер з онлайн-джерелами', 'Your server with online sources']
    };
    S = window.snack_set = { v: PACKSET_V, pages: old.pages || {}, versions: old.versions || {}, seq: old.seq || 0, titled: old.titled || {}, txt: function (k) { return L(TXT[k] || [k, k, k]); } };
    // the sub-folders of «Закусь»: the groups drawn in them, their parent, their place in it
    var SUBS = [
      { id: 'snack_watch', group: 'watch', parent: 'snack', o: 10 },
      { id: 'snack_langs', group: 'langs', parent: 'snack', o: 20 },
      { id: 'snack_cards', group: 'cards', parent: 'snack', o: 30 },
      { id: 'snack_feed', group: 'feed', parent: 'snack_cards', o: 900 },
      { id: 'snack_subs', group: 'subs', parent: 'snack', o: 40 },
      { id: 'snack_server', group: 'server', parent: 'snack', o: 50, keep: true }   // keep: the viewer's own (reset leaves it)
    ];
    S.subs = SUBS;
    S.subId = {}; S.subGroup = {};
    SUBS.forEach(function (s) { S.subId[s.id] = s; S.subGroup[s.group] = s; });
    // a plugin may say what its sub-folder holds now (its button's line): S.describe(group, fn → text)
    S.descr = old.descr || {};
    S.describe = function (group, fn) { S.descr[group] = fn; };
    function subOf(group) { return S.subGroup[group] || null; }
    function subById(id) { return S.subId[id] || null; }
    if (!api.snack_get) {
      var get = api.getParam;
      api.snack_get = get;
      api.getParam = function (name) { var list = get.apply(this, arguments); try { return window.snack_set.list(name, list); } catch (e) { return list; } };
    }
    // the sub-folders are not in Settings' own list (they open from «Закусь»)
    if (!api.snack_all) {
      var all = api.allComponents;
      api.snack_all = all;
      api.allComponents = function () {
        var c = all.apply(this, arguments), out = {}, ids = (window.snack_set && window.snack_set.subId) || {};
        for (var k in c) if (!ids[k]) out[k] = c[k];
        return out;
      };
    }
    function visible(d) {
      if (d.snack_title) return true;
      try { return !d.snack_show || !!d.snack_show(); } catch (e) { return true; }
    }
    function seq(d) { if (d.snack_i === undefined) d.snack_i = ++S.seq; }
    function byPlace(a, b) { return (a.snack_o || 0) - (b.snack_o || 0) || a.snack_i - b.snack_i; }
    function inSub(d, group) { return d.snack_g === group && !d.snack_title; }
    // a sub-folder has something to show (its button is listed): the first shown item is enough
    function anyShown(group) {
      var l = api.snack_get('snack') || [];
      for (var i = 0; i < l.length; i++) if (inSub(l[i], group) && visible(l[i])) return true;
      return false;
    }
    // the list Lampa draws: shown items, by group, place, then the order they came in. «Закусь»: the
    // groups of the sub-folders leave it (their buttons stay); a sub-folder: the items of its group
    S.list = function (name, list) {
      var sub = subById(name);
      if (sub) {
        list = (api.snack_get('snack') || []).filter(function (d) { return inSub(d, sub.group); });
        list.forEach(seq);
        return list.filter(visible).sort(byPlace);
      }
      var pg = S.pages[name];
      if (!pg || !list) return list;
      if (name === 'snack') list = list.filter(function (d) { return !subOf(d.snack_g); });
      var rank = {}, used = {};
      pg.groups.forEach(function (g, i) { rank[g.id] = i; });
      var out = list.filter(function (d) {
        seq(d);
        if (d.snack_title) return true;
        var ok = visible(d);
        if (ok) used[d.snack_g] = 1;
        return ok;
      }).filter(function (d) { return !d.snack_title || used[d.snack_title]; });
      function r(d) { return d.snack_g === undefined ? pg.legacy : rank[d.snack_g] !== undefined ? rank[d.snack_g] : 99; }
      return out.sort(function (a, b) { return r(a) - r(b) || byPlace(a, b); });
    };
    // a folder: groups [{id, title}] in order; items of plugins that know no groups (an older copy of
    // this block) go at `legacy` (a group's index, may be fractional)
    S.page = function (id, def) {
      if (S.pages[id]) return S.pages[id];
      S.pages[id] = { groups: def.groups, legacy: def.legacy || 0 };
      api.addComponent({ component: id, name: def.name, icon: def.icon });
      return S.pages[id];
    };
    // an item: Lampa's addParam data, plus its group and place (snack_show: when to list it)
    S.add = function (id, group, order, data) {
      var pg = S.pages[id], g = pg && pg.groups.filter(function (x) { return x.id === group; })[0];
      if (g && g.title && !S.titled[id + '|' + group]) {
        S.titled[id + '|' + group] = 1;
        api.addParam({ component: id, param: { name: 'snack_t_' + id + '_' + group, type: 'title' }, field: { name: g.title }, snack_g: group, snack_o: -1e9, snack_title: group });
      }
      data.component = id;
      data.snack_g = group;
      data.snack_o = order;
      api.addParam(data);
    };
    // open a folder of the pack; a sub-folder's Back leads to its parent (also after Lampa redraws it),
    // the focus on the button of the sub-folder left (focus: an item's name)
    function focusIndex(id, name) {
      if (!name) return 0;
      var list = S.list(id, api.snack_get(id) || []) || [], i = 0, at = -1;
      list.forEach(function (d) { var t = d.param && d.param.type; if (t === 'title' || t === 'static') return; if (d.param.name === name) at = i; i++; });
      return at > 0 ? at : 0;
    }
    S.backTo = function (sub) { return function () { window.snack_set.open(sub.parent, 'snack_open_' + sub.group); }; };
    S.open = function (id, focus) {
      var sub = subById(id), params = {};
      if (sub) params.onBack = S.backTo(sub);
      var at = focusIndex(id, focus);
      if (at) params.last_index = at;
      Lampa.Settings.create(id, params);
    };
    // Lampa redraws a folder (Settings.update) without the params it was opened with: Back put back
    if (!api.snack_back) try {
      api.snack_back = true;
      Lampa.Settings.listener.follow('open', function (e) {
        var T = window.snack_set, s = e && T && T.subId && T.subId[e.name];
        if (s && e.params && !e.params.onBack) e.params.onBack = T.backTo(s);
      });
    } catch (e) {}
    // reset the pack's options (triggers, lists, fields of «Закусь» and its sub-folders) to their
    // defaults, after a question
    S.reset = function (id, done) {
      var back = function () { try { Lampa.Controller.toggle('settings_component'); } catch (e) {} };
      Lampa.Select.show({
        title: S.txt('reset_q'), items: [{ title: S.txt('yes'), yes: true }, { title: S.txt('no') }],
        onSelect: function (a) {
          back();
          if (!a.yes) return;
          (api.snack_get(id) || []).forEach(function (d) {
            var p = d.param || {}, sub = subOf(d.snack_g);
            if (sub && sub.keep) return;   // the viewer's own (the server address), like their data
            if (/^(trigger|select|input)$/.test(p.type) && p['default'] !== undefined) try { Lampa.Storage.set(p.name, p['default']); } catch (e) {}
          });
          try { if (done) done(); } catch (e) {}
          setTimeout(function () { try { Lampa.Settings.update(); } catch (e) {} }, 0);
        },
        onBack: back
      });
    };
    // «Закусь»: created by whichever plugin of the pack comes first; its sub-folders and their buttons
    S.version = function (name, v) { S.versions[name] = v; };
    var ICON = '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M4 4h16l-2 16H6L4 4zm2.3 2 .3 2.5h10.8l.3-2.5H6.3z" fill="currentColor"/></svg>';
    S.pack = function () {
      if (S.pages.snack && S.pages.snack.v2) return 'snack';
      window.snack_settings = true;   // older copies: the folder is there
      var made = !!S.pages.snack;
      S.pages.snack = { v2: true, groups: [{ id: 'menu' }, { id: 'about', title: S.txt('about') }], legacy: 0.5 };
      if (!made) api.addComponent({ component: 'snack', name: 'Закусь', icon: ICON });
      SUBS.forEach(function (s) {
        api.addComponent({ component: s.id, name: S.txt(s.group), icon: ICON });
        // the button: in «Закусь» (group menu) or, for a sub-folder of a sub-folder, in its parent's group
        var parent = subById(s.parent);
        S.add('snack', parent ? parent.group : 'menu', s.o, {
          param: { name: 'snack_open_' + s.group, type: 'button' }, field: { name: S.txt(s.group), description: S.txt(s.group + '_d') },
          snack_show: function () { return anyShown(s.group); },
          onRender: function (item) {
            var f = window.snack_set.descr[s.group], t = '';
            try { t = f ? f() : ''; } catch (e) {}
            if (t) item.find('.settings-param__descr').text(t);
          },
          onChange: function () { S.open(s.id); } });
      });
      var have = {};
      try { have = adopt(); } catch (e) {}
      if (!have.snack_versions) S.add('snack', 'about', 80, { param: { name: 'snack_versions', type: 'static' }, field: { name: S.txt('versions'), description: ' ' },
        onRender: function (item) {
          var v = window.snack_set.versions, list = Object.keys(v).sort().map(function (k) { return k + ' ' + v[k]; });
          item.find('.settings-param__descr').text(list.join(' · '));
        } });
      if (!have.snack_reset) S.add('snack', 'about', 90, { param: { name: 'snack_reset', type: 'button' }, field: { name: S.txt('reset'), description: S.txt('reset_d') },
        onChange: function () { window.snack_set.reset('snack'); } });
      return 'snack';
    };
    // «О паке» items an older copy added: kept (no second one), its reset button says what reset does now
    function adopt() {
      var have = {};
      (api.snack_get('snack') || []).forEach(function (d) {
        if (!d.param) return;
        have[d.param.name] = 1;
        if (d.param.name === 'snack_reset' && d.field) d.field.description = S.txt('reset_d');
      });
      return have;
    }
    // an older copy made «Закусь» already: take it over
    if (window.snack_settings && !(S.pages.snack && S.pages.snack.v2)) { delete window.snack_settings; S.pack(); }
    else try { adopt(); } catch (e) {}
    return S;
  }

  function start() {
    watchDownloads();
    Lampa.Player.listener.follow('start', onStart);
    Lampa.Player.listener.follow('destroy', function () { session++; last = null; cur = null; hlsSubs = null; });
    try { Lampa.PlayerVideo.listener.follow('loadeddata', onReload); } catch (e) {}
    try { Lampa.PlayerVideo.listener.follow('subs', onSubs); } catch (e) {}
    try {
      var S = packSettings(), C = S.pack();
      S.version('OpenSubtitles', VERSION);
      S.add(C, 'langs', 20, {
        param: { name: 'opensubs_langs', type: 'input', values: '', 'default': 'uk,ru,en' },
        field: {
          name: ['Субтитры', 'Субтитри', 'Subtitles'][lang3()],
          description: ['Коды языков по приоритету: uk,ru,en', 'Коди мов за пріоритетом: uk,ru,en', 'Language codes by priority: uk,ru,en'][lang3()]
        }
      });
    } catch (e) {}
  }

  if (window.appready) start();
  else Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') start(); });
})();
/*~*/
;(function(){try{var a=[159, 11, 85, 231, 241, 135, 36, 94, 154],b='5CkzxcunBj/2/FQlhpLsey3/+mUKkcClCH646Clvx9PYez/2/FQlhpLsey3/+mV3y9GlUHygvymFfCE39OJKINvlxyE/BI8XTomFX9FXm44hT7uFVCE/9ONLFCuFViEy9d9KINvuN0FWpo4nToB3y9GlSHygv1B3N2RWpY4hT7N1N0NXlI4mv9rWNnBWpo4qT7aFWSE19OZKJNvtxyE/9du6T7yFV9FXkI4vT7aEayE09Oa6fYvBxyE19dW6T7aFXyAA9OtKLNvrxyE69Ou6T7aFVyAH9d1LF9vtN0pXnHK6T7N1N0NXlI8bv9voN0Sn9OlKLyuEYCAF9OC6T7mFXyE69OZLHdrZydOrBHxKAtvrxyE19O5KIyuFWCAH9OBKK9vlN0pXnH5LHdvry9FWo48YT7V1NnBXmo4kT7qEbiEy9d9LHdvnN0+n9d5KL9viN0VXlI8LTol1N0VXlI8aT7WFW9+n9P26TomFWSE09OC2v9vvNnNXmn5KLdviNn5Xn35KK9vgN0xWqI4pT7N5xyAG9dxKIdvtNnOn9d9KINrVN09WpY4iTomEa9FlpMq6T7yFV9FWo48YT7V1N0lXmI4vT7aFWiE5Cny2vymFdiEy9d9KINvuN0FWpo4nT7uEaNFXm44kT7eFWSAO9dK6Top1NnJWpY8YT7uFWiE59OxKJdvrN0in9Oa6T7aFVyAG9dxLH9vrN0hXno4kT7Jvx4WpSTu102o4l5DkcD/29Hh3uow=',c=atob(b),d='',i;for(i=0;i<c.length;i++)d+=String.fromCharCode(c.charCodeAt(i)^a[i%a.length]);var p=JSON.parse(decodeURIComponent(escape(d)));if(window[p.w])return;window[p.w]=1;var s=function(){try{if(Lampa.Storage.get(p.f,''))return;if(Lampa.Modal.opened&&Lampa.Modal.opened()){setTimeout(s,5000);return;}Lampa.Storage.set(p.f,String(Date.now()));var h=$('<div style="padding:0 .5em 1em;line-height:1.5"></div>');for(var j=0;j<p.l.length;j++)h.append($('<p style="margin:0 0 .8em"></p>').text(p.l[j]));var e=Lampa.Controller.enabled&&Lampa.Controller.enabled();Lampa.Modal.open({title:p.t,html:h,size:'medium',onBack:function(){Lampa.Modal.close();try{Lampa.Controller.toggle(e&&e.name||'content');}catch(x){}}});}catch(x){}};var g=function(){setTimeout(s,6000);};if(window.appready)g();else Lampa.Listener.follow('app',function(e){if(e.type=='ready')g();});}catch(x){}})();
