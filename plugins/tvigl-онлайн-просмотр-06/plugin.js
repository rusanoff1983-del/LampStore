(function () {
  'use strict';
  // Intro/credits skip for Lampa's new player.
  // The player natively shows "Skip" for playdata.segments = {skip:[{start,end}]}
  // (Settings -> Player -> Segments), but no balancer fills it and nothing calls
  // lampac's /api/skip. We look segments up in /api/skip (own DB + skipdb.tv,
  // introdb.app, aniskip) and attach them before the player starts. Lampa reads
  // segments only in its own 'start' handler, so we wrap Lampa.Player.play and
  // wait at most WAIT_MS for the lookup; playlist items are prefetched in the
  // background so the next episode starts without delay.
  if (window.alc_skip_segments_ready) return;
  window.alc_skip_segments_ready = true;

  var HOST = '{localhost}';
  var ORIGIN = (function () {
    try { var s = document.currentScript && document.currentScript.src; if (s) return s.replace(/^(https?:\/\/[^\/]+).*$/, '$1'); } catch (e) {}
    return location.protocol + '//' + location.host;
  })();
  var WAIT_MS = 2500;
  var PREFETCH = 3;
  var cache = {};   // key -> {skip:[...]} | null (known empty)
  var imdbCache = {};
  var playId = 0;   // the latest Lampa.Player.play call (see wrap)

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
  // server or the one the pack's search finds ([pack server] above); none: nothing is asked (and a
  // play does not wait for it)
  var hostFixed = HOST.charAt(0) !== '{';
  function withHost(cb) {
    if (hostFixed) return cb(true);
    packServer(ORIGIN, function (b) { if (b) HOST = b; cb(!!b); });
  }

  // the card of what plays: the play data's own (Lampa's convention: data.card, as Autopilot passes it),
  // else the open screen's. A play started from the home screen (the theme's hero / rows via Autopilot)
  // has no card screen open: the screen's card alone left such plays without markers.
  function card(data) {
    if (data && data.card && data.card.id) return data.card;
    try { var a = Lampa.Activity.active(); return a ? (a.movie || a.card || null) : null; } catch (e) { return null; }
  }

  function resolveImdb(c, cb) {
    if (!c) return cb('');
    if (c.imdb_id) return cb(c.imdb_id);
    if (c.external_ids && c.external_ids.imdb_id) return cb(c.external_ids.imdb_id);
    if (!c.id) return cb('');
    var type = c.name || c.original_name ? 'tv' : 'movie';
    var k = type + c.id;
    if (imdbCache[k] !== undefined) return cb(imdbCache[k]);
    var url;
    try { url = Lampa.TMDB.api(type + '/' + c.id + '/external_ids?api_key=' + Lampa.TMDB.key()); } catch (e) { return cb(''); }
    $.ajax({
      url: url, dataType: 'json', timeout: 5000,
      success: function (j) { imdbCache[k] = (j && j.imdb_id) || ''; if (imdbCache[k]) c.imdb_id = imdbCache[k]; cb(imdbCache[k]); },
      error: function () { cb(''); }
    });
  }

  // segment names as the player shows them, in the interface language
  var NAMES = { outro: ['Титры', 'Титри', 'Credits'], recap: ['Пересказ', 'Переказ', 'Recap'], intro: ['Заставка', 'Заставка', 'Intro'] };
  function segName(type) {
    var l = 'ru', a = NAMES[type] || NAMES.intro;
    try { l = String(Lampa.Storage.get('language', 'ru') || 'ru'); } catch (e) {}
    return l === 'uk' ? a[1] : l === 'ru' || l === 'be' ? a[0] : a[2];
  }

  function keyOf(imdb, item) {
    var s = parseInt(item && item.season, 10) || 0, e = parseInt(item && item.episode, 10) || 0;
    return imdb + ':' + s + ':' + e;
  }

  // bg: a playlist item's prefetch (background), else the play waits for it
  function lookup(imdb, item, tmdb, cb, bg) {
    var k = keyOf(imdb, item);
    if (cache[k] !== undefined) return cb(cache[k]);
    withHost(function (ok) { if (ok) ask(); else cb(undefined); });
    function ask() {
    var p = k.split(':');
    var url = HOST + '/api/skip?imdb_id=' + encodeURIComponent(imdb) + '&s=' + p[1] + '&e=' + p[2];
    if (tmdb) url += '&tmdb_id=' + tmdb;
    // the device id, token and cookies (the block's S.json), through the pack's shared limiter (a busy
    // server's 429s sent again, one state per host for all the pack's plugins): a play's ahead of the
    // line, a prefetch last
    packSrv().json({ url: url, mine: true, timeout: 20000, pri: !bg, bg: !!bg,
      done: function (code, j, text, to, thr, kind) {
        var skip = [];
        if (!(code >= 200 && code < 300) || kind) { cb(undefined); return; }   // not cached: retry next time
        ((j && j.segments) || []).forEach(function (s) {
          var st = parseFloat(s.start), en = parseFloat(s.end);
          if (isNaN(st) || isNaN(en) || en - st < 3) return;
          skip.push({ start: st, end: en, name: segName(s.type) });
        });
        cache[k] = skip.length ? { skip: skip } : null;
        cb(cache[k]);
      } });
    }
  }

  function attach(item, seg) {
    if (item && seg && !item.segments) item.segments = { skip: seg.skip.slice(), ad: [] };
  }

  function prefetch(imdb, tmdb, data) {
    var list = data.playlist;
    if (!list || !list.length) return;
    var idx = -1;
    for (var i = 0; i < list.length; i++) {
      if (list[i] === data || (list[i].url && list[i].url === data.url)) { idx = i; break; }
    }
    list.slice(idx + 1, idx + 1 + PREFETCH).forEach(function (it, n) {
      if (!it || it.segments || !(it.season && it.episode)) return;
      setTimeout(function () { lookup(imdb, it, tmdb, function (seg) { attach(it, seg); }, true); }, 800 * (n + 1));
    });
  }

  // ---------- play after a tap (the same block in every plugin of the pack that starts the player late) ----------
  // Safari on iPhone / iPad starts a video with sound only from a tap (about a second after it), and
  // only in the <video> element that tap reached. A plugin that opens Lampa's player later (after asking
  // a server) calls packPrime().prime() inside the tap: a <video> is prepared there (load() + play()
  // without a source: Safari lets that element play later on), and Lampa's next player video is that
  // element. Elsewhere it is just an ordinary new <video>; TVs are left alone. The newest copy of this
  // block serves all, and Lampa's markup is read by one hook only.
  // A prepared element is replaced only by a new tap (a tap, click or key under TAP_MS ago, inside the
  // browser's user activation; a swipe does not count): the browser's
  // «user activation» lasts several seconds, Safari's play permission about one - a prime() called
  // later in the same flow (another plugin on the way to the player) must not swap the prepared
  // element for one Safari will not let play.
  var PRIME_V = 4;
  function packPrime() {
    var P = window.alc_prime;
    if (P && P.v >= PRIME_V) return P;
    P = window.alc_prime = { v: PRIME_V, el: P && P.el || null, tap: 0 };
    var TAP_MS = 800, tv = function () { try { return !!(Lampa.Platform && Lampa.Platform.tv && Lampa.Platform.tv()); } catch (e) { return false; } };
    // a tap (a touch that did not move: a swipe is no tap), a click or a key; not on TVs (no tap to wait for)
    if (!tv()) try {
      var mark = function () { window.alc_prime.tap = Date.now(); }, t0 = null, opt = { capture: true, passive: true };
      ['click', 'keydown'].forEach(function (t) { document.addEventListener(t, mark, opt); });
      document.addEventListener('touchstart', function (e) { var t = e.touches && e.touches[0]; t0 = t ? { x: t.clientX, y: t.clientY } : null; }, opt);
      document.addEventListener('touchend', function (e) {
        var t = e.changedTouches && e.changedTouches[0];
        if (t0 && t && Math.abs(t.clientX - t0.x) < 12 && Math.abs(t.clientY - t0.y) < 12) mark();
        t0 = null;
      }, opt);
    } catch (e) {}
    P.prime = function () {
      try {
        if (tv()) return null;   // TVs play without a tap
        var ua = navigator.userActivation, active = !ua || ua.isActive;
        // a new element only inside a tap: a prepared one is replaced by a new tap only (the first
        // prime() of a tap runs before these listeners ever heard a tap: then the activation decides)
        if (!active || (P.el && Date.now() - P.tap > TAP_MS)) return P.el;
        var v = document.createElement('video');
        v.setAttribute('playsinline', 'true');
        v.load();
        var p = v.play();
        if (p && p.catch) p.catch(function () {});
        v.pause();
        P.el = v;
      } catch (e) {}
      return P.el;
    };
    // Lampa's PlayerVideo makes its element with $('<video class="player-video__video" ...>'): the
    // prepared one is handed over instead, with the attributes Lampa asked for
    P.take = function (html, out) {
      var v = P.el;
      if (!v || !out || out.length !== 1 || typeof html !== 'string' || html.indexOf('<video class="player-video__video"') !== 0) return out;
      P.el = null;
      while (v.attributes.length) v.removeAttribute(v.attributes[0].name);
      for (var i = 0; i < out[0].attributes.length; i++) v.setAttribute(out[0].attributes[i].name, out[0].attributes[i].value);
      return [v];
    };
    var J = window.jQuery, orig = J && J.parseHTML;
    if (orig && !orig.alc_prime) {
      J.parseHTML = function (html) {
        var out = orig.apply(this, arguments);
        try { out = window.alc_prime.take(html, out); } catch (e) {}
        return out;
      };
      J.parseHTML.alc_prime = true;
    }
    return P;
  }

  function wrap() {
    var orig = Lampa.Player.play;
    if (!orig || orig.alc_skip_wrapped) return;
    var wrapped = function (data) {
      var self = this, args = arguments;
      if (!data || data.segments || data.iptv || data.youtube) return orig.apply(self, args);
      packPrime().prime();   // the lookup below may outlast Safari's tap window
      var c = card(data);
      var done = false, spinner = false, my = ++playId;
      // only the latest call plays (a second press while the first one waits must not open a
      // second player on top of it)
      var go = function () {
        if (done) return;
        done = true;
        clearTimeout(timer);
        if (spinner) { spinner = false; try { Lampa.Loading.stop(); } catch (e) {} }
        if (my === playId) orig.apply(self, args);
      };
      var timer = setTimeout(go, WAIT_MS);
      resolveImdb(c, function (imdb) {
        if (!imdb) return go();
        var tmdb = c && c.id ? c.id : 0;
        lookup(imdb, data, tmdb, function (seg) {
          if (!done) { attach(data, seg); go(); }
          prefetch(imdb, tmdb, data);
        });
      });
      // still waiting (nothing cached): a cancellable spinner, as for any other loading. Without it
      // the screen behind keeps the keys: Back left the screen and the player popped up over
      // another one a moment later; Enter started a second player.
      if (!done && !spinner) {
        var opened = false, ctl = '';
        try { opened = Lampa.Player.opened(); ctl = Lampa.Controller.enabled().name; } catch (e) {}
        if (!opened && ctl !== 'loading') {
          spinner = true;
          try {
            Lampa.Loading.start(function () {
              done = true; spinner = false; clearTimeout(timer);
              try { Lampa.Loading.stop(); } catch (e) {}
            });
          } catch (e) { spinner = false; }
        }
      }
    };
    wrapped.alc_skip_wrapped = true;
    Lampa.Player.play = wrapped;
  }

  if (window.appready) wrap();
  else Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') wrap(); });
})();
