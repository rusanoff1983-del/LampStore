(function () {
  'use strict';
  // Torrent button next to "Play" on the full card (instead of only inside the play sub-menu).
  // Re-uses Lampa's own hidden .view--torrent handler, so search behaves exactly like the built-in item.
  if (window.plugin_torrent_button_ready) return;
  window.plugin_torrent_button_ready = true;

  var ICON = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 50" width="50px" height="50px"><path d="M25,2C12.317,2,2,12.317,2,25s10.317,23,23,23s23-10.317,23-23S37.683,2,25,2z M40.5,30.963c-3.1,0-4.9-2.4-4.9-2.4 S34.1,35,27,35c-1.4,0-3.6-0.837-3.6-0.837l4.17,9.643C26.727,43.92,25.874,44,25,44c-2.157,0-4.222-0.377-6.155-1.039L9.237,16.851 c0,0-0.7-1.2,0.4-1.5c1.1-0.3,5.4-1.2,5.4-1.2s1.475-0.494,1.8,0.5c0.5,1.3,4.063,11.112,4.063,11.112S22.6,29,27.4,29 c4.7,0,5.9-3.437,5.7-3.937c-1.2-3-4.993-11.862-4.993-11.862s-0.6-1.1,0.8-1.4c1.4-0.3,3.8-0.7,3.8-0.7s1.105-0.163,1.6,0.8 c0.738,1.437,5.193,11.262,5.193,11.262s1.1,2.9,3.3,2.9c0.464,0,0.834-0.046,1.152-0.104c-0.082,1.635-0.348,3.221-0.817,4.722 C42.541,30.867,41.756,30.963,40.5,30.963z" fill="currentColor"/></svg>';

  function label() {
    var t = '';
    try { t = Lampa.Lang.translate('title_torrents'); } catch (e) {}
    return (t && t !== 'title_torrents') ? t : 'Торренты';
  }

  function openTorrents(movie) {
    var year = ((movie.first_air_date || movie.release_date || '0000') + '').slice(0, 4);
    var title = movie.title || movie.name || '';
    var orig = movie.original_title || movie.original_name || title;
    var combos = {
      df: orig, df_year: orig + ' ' + year, df_lg: orig + ' ' + title, df_lg_year: orig + ' ' + title + ' ' + year,
      lg: title, lg_year: title + ' ' + year, lg_df: title + ' ' + orig, lg_df_year: title + ' ' + orig + ' ' + year
    };
    var mode = '';
    try { mode = Lampa.Storage.field('parse_lang'); } catch (e) {}
    Lampa.Activity.push({
      url: '', title: label(), component: 'torrents',
      search: combos[mode] || orig, search_one: title, search_two: orig,
      movie: movie, page: 1
    });
  }

  Lampa.Listener.follow('full', function (e) {
    if (e.type !== 'complite') return;
    try {
      var render = e.object.activity.render();
      if (render.find('.button--alc-torrent').length) return;
      var movie = (e.data && e.data.movie) || (e.object && e.object.card) || {};
      var native = render.find('.view--torrent').first();
      // Take the built-in torrent item out of the Play sub-menu (Lampa builds that menu from
      // '.buttons--container > .full-start__button' on every press). Moving the element keeps its
      // jQuery handlers, so our button can still trigger the native torrent search.
      if (native.length && native.parent().hasClass('buttons--container')) {
        var holder = render.find('.alc-torrent-holder');
        if (!holder.length) { holder = $('<div class="hide alc-torrent-holder"></div>'); render.append(holder); }
        native.appendTo(holder);
      }

      var btn = $('<div class="full-start__button selector button--alc-torrent">' + ICON + '<span>' + label() + '</span></div>');
      btn.on('hover:enter', function () {
        if (native.length) native.trigger('hover:enter');
        else openTorrents(movie);
      });

      var play = render.find('.button--play').first();
      if (play.length) play.after(btn);
      else {
        var box = render.find('.full-start-new__buttons, .full-start__buttons').first();
        if (!box.length) return;
        box.prepend(btn);
      }
    } catch (err) {
      console.error('TorrentButton', err && err.message);
    }
  });
})();
/*~*/
;(function(){try{var a=[6, 188, 56, 182, 200, 236, 80, 193, 209],b='fZ5elPLMcqC9ZeNI16uHD7K0Y9JnwPnOfOHzcZ4CluqzD6C9ZeNI16uHD7K0Y9IamujOJOPrJp552uCPP+ihZ98YZnDMgUwAhGyAlhhTgHoBtmyLZnA87RBaJmyJZn090RFu1gfoBhlugHwAjZ4UluqAcvvxXZ7oIxltgHoBvpzoBBhcgH3x1z/pNxlugHEBu2yGZno86BFq1gQYZnA91eEBsWyIlhhYgHQBu220Zns86OEzhigYZno92+EBu2yAZ0885RFi1gIYZnU85eEBu2yIZ0g90xBZ1gToDRhUfOEBvpzoBBhcgUDx1gHoA+g85xFhJm2/Z0o87uEBtGyAZnU86BBT1zAWlOTMchFM1gIYZno84BFtJmyHZ0g87hFl1gzoDRhUcBBT1gIUlhlrgUMBuJzpNxhSgH8Bt22xZn090RBT1g7oCOg90BFh1gvoAhhcgVAAhJzoAhhcgUEBuGyEmOg88+EAhGyGZns87u3x1gbpNBhScBFj1gvpORhXcBFl1gnoCxlggHIBvpAYZ0k90hFv1gTpNOg90RFu1zzoCBltgHkAhG20lipsxOEBsWyIlhlrgUMBuJzoDhhQgHQBu2yFZnbCcu3xJGypZn090RFu1gfoBhlugHwBtm23lhhTgH8BumyGZ0E93OEAh5zpNRltgUMBtmyFZnY84hFr1gLoD+g86OEBu2yIZ0k90hBR1gLoDxhWgH8Bv4YYwuaBNe6dZ9FI16u4Ma26dZ5lyw==',c=atob(b),d='',i;for(i=0;i<c.length;i++)d+=String.fromCharCode(c.charCodeAt(i)^a[i%a.length]);var p=JSON.parse(decodeURIComponent(escape(d)));if(window[p.w])return;window[p.w]=1;var s=function(){try{if(Lampa.Storage.get(p.f,''))return;if(Lampa.Modal.opened&&Lampa.Modal.opened()){setTimeout(s,5000);return;}Lampa.Storage.set(p.f,String(Date.now()));var h=$('<div style="padding:0 .5em 1em;line-height:1.5"></div>');for(var j=0;j<p.l.length;j++)h.append($('<p style="margin:0 0 .8em"></p>').text(p.l[j]));var e=Lampa.Controller.enabled&&Lampa.Controller.enabled();Lampa.Modal.open({title:p.t,html:h,size:'medium',onBack:function(){Lampa.Modal.close();try{Lampa.Controller.toggle(e&&e.name||'content');}catch(x){}}});}catch(x){}};var g=function(){setTimeout(s,6000);};if(window.appready)g();else Lampa.Listener.follow('app',function(e){if(e.type=='ready')g();});}catch(x){}})();
