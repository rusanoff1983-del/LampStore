(function() {
    'use strict';
    
    console.log('PLUGIN: Loading...');
    
    if (typeof Lampa === 'undefined') {
        console.error('PLUGIN: No Lampa');
        return;
    }
    
    console.log('PLUGIN: Lampa OK');
    
    // Добавляем CSS стили для hero-баннеров
    if (!$('#hero-releases-css').length) {
        $('body').append('<style id="hero-releases-css">' +
            '.hero-banner { ' +
                'filter: brightness(1.1) contrast(1.1) saturate(1.2); ' +
                'transition: filter 0.3s ease; ' +
            '} ' +
            '.hero-banner:hover { ' +
                'filter: brightness(1.2) contrast(1.15) saturate(1.3); ' +
            '} ' +
            '.hero-banner .card-marks, .hero-banner .card__icons, .hero-banner .card__quality { ' +
                'display: none !important; ' +
            '} ' +
            '.hero-banner .card__mark { ' +
                'font-size: 1em; ' +
                'padding: 0.4em 0.6em; ' +
                'background: rgba(255,255,255,0.3) !important; ' +
                'backdrop-filter: blur(2px); ' +
            '} ' +
            '.hero-banner .hero-title { ' +
                'text-shadow: 2px 2px 4px rgba(0,0,0,0.8) !important; ' +
                'filter: drop-shadow(0 0 2px rgba(0,0,0,0.5)) !important; ' +
            '} ' +
            '.hero-banner .hero-title img { ' +
                'filter: drop-shadow(0 0 3px rgba(0,0,0,0.8)) !important; ' +
            '} ' +
            '.hero-banner .hero-meta { ' +
                'text-shadow: 1px 1px 2px rgba(0,0,0,0.7) !important; ' +
                'filter: drop-shadow(0 0 1px rgba(0,0,0,0.4)) !important; ' +
            '} ' +
            '.hero-banner .hero-desc { ' +
                'text-shadow: 1px 1px 2px rgba(0,0,0,0.6) !important; ' +
                'filter: drop-shadow(0 0 1px rgba(0,0,0,0.3)) !important; ' +
            '} ' +
            '.hero-banner .hero-trailer-btn { ' +
                'text-shadow: 1px 1px 2px rgba(0,0,0,0.5) !important; ' +
                'filter: drop-shadow(0 0 2px rgba(0,0,0,0.4)) !important; ' +
            '} ' +
            '</style>');
    }
    
    // Добавляем локализацию
    Lampa.Lang.add({
        hero_releases_title: {
            ru: 'Новинки прокату',
            uk: 'Новинки прокату',
            en: 'New Releases'
        },
        hero_releases_full: {
            ru: 'Новинки прокату',
            uk: 'Новинки прокату',
            en: 'New Releases'
        },
        movie_type: {
            ru: 'Фильм',
            uk: 'Фільм',
            en: 'Movie'
        },
        trailer_button: {
            ru: 'Трейлер',
            uk: 'Трейлер',
            en: 'Trailer'
        },
        trailer_not_found: {
            ru: 'Трейлер не найден',
            uk: 'Трейлер не знайдено',
            en: 'Trailer not found'
        },
        loading_trailer: {
            ru: 'Загрузка трейлера...',
            uk: 'Завантаження трейлера...',
            en: 'Loading trailer...'
        },
        menu_title: {
            ru: 'Выберите действие',
            uk: 'Виберіть дію',
            en: 'Choose action'
        },
        menu_details: {
            ru: 'Подробности',
            uk: 'Деталі',
            en: 'Details'
        },
        menu_trailer: {
            ru: 'Трейлер',
            uk: 'Трейлер',
            en: 'Trailer'
        }
    });
    
    var network = new Lampa.Reguest();
    
    // YouTube плеер как в studios5.js
    function playYouTubeCustom(key) {
        var overlay = $('<div class="youtube-pro-overlay" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 10000; background: #000;"></div>');
        var playerContainer = $('<div id="yt-player-custom"></div>');
        var loader = $('<div class="yt-loader" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: #fff; font-size: 1.5em; font-weight: bold; text-align: center;"><div class="broadcast__scan"></div><div>' + Lampa.Lang.translate('loading_trailer') + '</div></div>');
        
        overlay.append(loader);
        overlay.append(playerContainer);
        $('body').append(overlay);
        
        var closePlayer = function() {
            overlay.remove();
            Lampa.Controller.toggle('content'); 
        };
        
        Lampa.Controller.add('youtube_custom_controller', {
            toggle: function() {}, up: function() {}, down: function() {}, left: function() {}, right: function() {},
            enter: function() {}, back: closePlayer
        });
        Lampa.Controller.toggle('youtube_custom_controller');
        
        var initPlayer = function() {
            new YT.Player('yt-player-custom', {
                height: '100%',
                width: '100%',
                videoId: key,
                playerVars: { 'autoplay': 1, 'controls': 1, 'showinfo': 0, 'rel': 0, 'modestbranding': 1, 'iv_load_policy': 3, 'playsinline': 1, 'disablekb': 1, 'fs': 0 },
                events: {
                    'onReady': function(event) { 
                        loader.remove(); // Hide loader
                        event.target.playVideo(); 
                    },
                    'onStateChange': function(event) {
                        if (event.data === 0) { // 0 = ended
                            closePlayer();
                        }
                    },
                    'onError': function(e) { 
                        if (e.data == 150 || e.data == 153) Lampa.Noty.show('Видео ограничено владельцем (Error ' + e.data + ')');
                        else Lampa.Noty.show('Помилка YouTube: ' + e.data);
                        closePlayer();
                    }
                }
            });
        };
        
        if (typeof YT === 'undefined' || typeof YT.Player === 'undefined') {
            var tag = document.createElement('script');
            tag.src = "https://www.youtube.com/iframe_api";
            var firstScriptTag = document.getElementsByTagName('script')[0];
            firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
            var oldReady = window.onYouTubeIframeAPIReady;
            window.onYouTubeIframeAPIReady = function() { if(oldReady) oldReady(); initPlayer(); };
        } else {
            initPlayer();
        }
    }

    // Hero баннер
    function makeHeroResultItem(movie, heightEm) {
        heightEm = heightEm || 22.5;
        var pad = (heightEm / 35 * 2).toFixed(1);
        var titleEm = (heightEm / 35 * 2.5).toFixed(2);
        var descEm = (heightEm / 35 * 1.1).toFixed(2);

        var renderHeroContent = function(item, movie) {
            item.empty(); // Clear existing content
            item.append('<div class="hero-overlay" style="position: absolute; bottom: 0; left: 0; right: 0; background: linear-gradient(to top, rgba(0,0,0,0.9), transparent); padding: ' + pad + 'em; border-radius: 0 0 1em 1em;">' +
                '<div class="hero-header" style="margin-bottom: 0.3em; min-height: 3em; display: flex; align-items: flex-end;">' +
                    '<div class="hero-title" style="font-size: ' + titleEm + 'em; font-weight: bold; color: #fff; text-shadow: 2px 2px 4px rgba(0,0,0,0.7);">' + (movie.title || movie.name) + '</div>' +
                '</div>' +
                '<div class="hero-meta" style="display: flex; flex-wrap: wrap; align-items: center; gap: 0.5em; font-size: 0.9em; color: #ccc; margin-bottom: 0.5em;"></div>' +
                '<div class="hero-desc" style="font-size: ' + descEm + 'em; color: #ddd; max-width: 60%; line-height: 1.3; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; margin-bottom: 0.6em;">' + (movie.overview || '') + '</div>' +
                '<div class="hero-trailer-btn selector" style="display: inline-flex; align-items: center; background: rgba(255, 255, 255, 0.2); padding: 0.4em 0.8em; border-radius: 0.3em; cursor: pointer; transition: background 0.2s;">' +
                '<svg style="width: 1.2em; height: 1.2em; margin-right: 0.4em;" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>' +
                '<span style="font-size: 0.9em; font-weight: 600;">' + Lampa.Lang.translate('trailer_button') + '</span>' +
                '</div>' +
                '</div>');
            
            // Клик на трейлер
            item.find('.hero-trailer-btn').on('hover:enter click', function (e) {
                e.stopPropagation();
                var network = new Lampa.Reguest();
                var type = movie.name ? 'tv' : 'movie';
                var lang = Lampa.Storage.get('language', 'ru');
                
                function search(searchLang) {
                    var url = Lampa.TMDB.api(type + '/' + movie.id + '/videos?api_key=' + Lampa.TMDB.key() + '&language=' + searchLang);
                    network.silent(url, function (json) {
                        var videos = json.results || [];
                        var trailer = videos.find(function(v) { return v.type === 'Trailer' && v.site === 'YouTube'; }) || videos[0];
                        if (trailer && trailer.key) {
                            playYouTubeCustom(trailer.key);
                        } else if (searchLang !== 'en-US') {
                            search('en-US');
                        } else {
                            Lampa.Noty.show(Lampa.Lang.translate('trailer_not_found'));
                        }
                    }, function() {
                        if (searchLang !== 'en-US') search('en-US');
                        else Lampa.Noty.show(Lampa.Lang.translate('trailer_not_found'));
                    });
                }
                search(lang);
            });

            // Загрузка деталей
            var type = movie.name ? 'tv' : 'movie';
            var lang = Lampa.Storage.get('language', 'ru');
            var url = Lampa.TMDB.api(type + '/' + movie.id + '?api_key=' + Lampa.TMDB.key() + '&language=' + lang + '&append_to_response=images,release_dates,content_ratings');
            
            network.silent(url, function(details) {
                // Logo
                var logo = null;
                if (details.images && details.images.logos && details.images.logos.length) {
                    logo = details.images.logos.find(function(l) { return l.iso_639_1 === lang; }) || 
                           details.images.logos.find(function(l) { return l.iso_639_1 === 'en'; }) || 
                           details.images.logos[0];
                }
                if (logo) {
                    var logoUrl = Lampa.TMDB.image('t/p/w500' + logo.file_path);
                    item.find('.hero-title').html('<img src="' + logoUrl + '" style="height: 4em; width: auto; max-width: 80%; object-fit: contain; display: block;" />');
                    item.find('.hero-header').css('min-height', 'auto');
                }
                // Метаданные
                var metaParts = [];
                
                // Рейтинг и год
                var headMeta = '';
                var rating = details.vote_average || movie.vote_average;
                if (rating) headMeta += '<span class="card__mark card__mark--rating" style="position:static;margin:0 0.5em 0 0;padding:0.2em 0.5em;font-size:0.9em;background:rgba(255,255,255,0.2);border-radius:0.3em;">★ ' + parseFloat(rating).toFixed(1) + '</span>';
                
                var date = details.release_date || details.first_air_date || movie.release_date || movie.first_air_date;
                if (date) headMeta += parseInt(date);
                
                if (headMeta) metaParts.push(headMeta);
                
                // Тип
                var typeStr = Lampa.Lang.translate('movie_type');
                metaParts.push(typeStr);
                
                // Возрастной рейтинг
                var age = '';
                if (type === 'movie' && details.release_dates && details.release_dates.results) {
                    var rel = details.release_dates.results.find(function(r) { return r.iso_3166_1 === 'US' || r.iso_3166_1 === 'RU'; });
                    if (rel && rel.release_dates && rel.release_dates.length) age = rel.release_dates[0].certification;
                }
                if (age) {
                    var ageColor = '#fff';
                    var ageVal = parseInt(age);
                    var displayAge = age;

                    if (!isNaN(ageVal)) {
                        displayAge = ageVal + '+';
                        if (ageVal >= 18) ageColor = '#d32f2f';
                        else if (ageVal >= 16) ageColor = '#f57c00';
                        else if (ageVal >= 12) ageColor = '#fbc02d';
                        else ageColor = '#388e3c';
                    } else {
                        if (['R', 'NC-17', 'TV-MA'].indexOf(age) !== -1) {
                            ageColor = '#d32f2f';
                            displayAge = '18+';
                        } else if (['PG-13', 'TV-14'].indexOf(age) !== -1) {
                            ageColor = '#f57c00';
                            displayAge = '16+';
                        } else if (['PG', 'TV-PG', 'TV-Y7'].indexOf(age) !== -1) {
                            ageColor = '#fbc02d';
                            displayAge = '12+';
                        } else {
                            ageColor = '#388e3c';
                            displayAge = '0+';
                        }
                    }
                    metaParts.push('<span style="border:1px solid ' + ageColor + ';color:' + ageColor + ';padding:0 0.3em;border-radius:0.2em;font-size:0.9em;font-weight:bold;">' + displayAge + '</span>');
                }
                
                if (metaParts.length) {
                    item.find('.hero-meta').html('<span>' + metaParts.join('</span><span>') + '</span>');
                }
            });
        };

        return {
            title: movie.title || movie.name,
            url: movie.id,
            card_image: movie.backdrop_path ? Lampa.TMDB.image('t/p/original' + movie.backdrop_path) : '',
            params: {
                createInstance: function (element) {
                    return Lampa.Maker.make('Card', element, function (module) { 
                        return module.only('Card', 'Callback'); 
                    });
                },
                emit: {
                    onCreate: function () {
                        var img = movie.backdrop_path ? Lampa.TMDB.image('t/p/original' + movie.backdrop_path) : (movie.poster_path ? Lampa.TMDB.image('t/p/original' + movie.poster_path) : '');
                        try {
                            var item = $(this.html);
                            item.addClass('hero-banner');
                            item.css({
                                'background-image': 'url(' + img + ')',
                                'width': '100%',
                                'height': heightEm + 'em',
                                'background-size': 'cover',
                                'background-position': 'center',
                                'border-radius': '1em',
                                'position': 'relative',
                                'box-shadow': '0 0 20px rgba(0,0,0,0.5)',
                                'margin-bottom': '10px'
                            });
                            
                            renderHeroContent(item, movie);

                            item.find('.card__view').remove();
                            item.find('.card__title').remove();
                            item.find('.card__age').remove();
                            item.find('.card-marks').remove();
                            item.find('.card__icons').remove();
                            item[0].heroMovieData = movie;
                        } catch (e) { 
                            console.log('Hero onCreate error:', e); 
                        }
                    },
                    onlyEnter: function () {
                        // Функция запуска трейлера (копируем логику из кнопки)
                        var playHeroTrailer = function() {
                            var network = new Lampa.Reguest();
                            var type = movie.name ? 'tv' : 'movie';
                            var lang = Lampa.Storage.get('language', 'ru');
                            
                            function search(searchLang) {
                                var url = Lampa.TMDB.api(type + '/' + movie.id + '/videos?api_key=' + Lampa.TMDB.key() + '&language=' + searchLang);
                                network.silent(url, function (json) {
                                    var videos = json.results || [];
                                    var trailer = videos.find(function(v) { return v.type === 'Trailer' && v.site === 'YouTube'; }) || videos[0];
                                    if (trailer && trailer.key) {
                                        playYouTubeCustom(trailer.key);
                                    } else if (searchLang !== 'en-US') {
                                        search('en-US');
                                    } else {
                                        Lampa.Noty.show(Lampa.Lang.translate('trailer_not_found'));
                                    }
                                }, function() {
                                    if (searchLang !== 'en-US') search('en-US');
                                    else Lampa.Noty.show(Lampa.Lang.translate('trailer_not_found'));
                                });
                            }
                            search(lang);
                        };

                        // Меню выбора действия
                        Lampa.Select.show({
                            title: Lampa.Lang.translate('menu_title'),
                            items: [
                                { title: Lampa.Lang.translate('menu_details'), action: 'open' },
                                { title: Lampa.Lang.translate('menu_trailer'), action: 'trailer' }
                            ],
                            onSelect: function(a) {
                                if(a.action === 'trailer') {
                                    playHeroTrailer();
                                } else {
                                    Lampa.Activity.push({
                                        url: '',
                                        component: 'full',
                                        id: movie.id,
                                        method: movie.name ? 'tv' : 'movie',
                                        card: movie,
                                        source: 'tmdb'
                                    });
                                }
                            }
                        });
                    }
                }
            }
        };
    }
    
    // Добавляем ряд с новинками
    function addHeroReleasesRow() {
        if (Lampa.ContentRows) {
            Lampa.ContentRows.add({
                index: 0,
                name: 'hero_releases',
                title: Lampa.Lang.translate('hero_releases_title'),
                screen: ['main'],
                call: function (params) {
                    return function (callback) {
                        var url = Lampa.TMDB.api('movie/now_playing?api_key=' + Lampa.TMDB.key() + '&language=' + Lampa.Storage.get('language', 'ru'));
                        
                        network.silent(url, function (json) {
                            console.log('PLUGIN: API response:', json);
                            var items = (json.results || []).slice(0, 10);
                            console.log('PLUGIN: Items loaded:', items.length);
                            
                            var results = items.map(function (movie) {
                                console.log('PLUGIN: Creating hero for:', movie.title);
                                return makeHeroResultItem(movie, 22.5);
                            });
                            
                            console.log('PLUGIN: Created hero results:', results.length);
                            callback({
                                results: results,
                                title: Lampa.Lang.translate('hero_releases_full'),
                                params: {
                                    items: {
                                        mapping: 'line',
                                        view: 15
                                    }
                                }
                            });
                        }, function (error) {
                            console.error('PLUGIN: Load error:', error);
                            callback({ results: [] });
                        });
                    };
                }
            });
            
            console.log('PLUGIN: Row added');
        } else {
            console.error('PLUGIN: No ContentRows');
        }
    }
    
    // Запуск плагина
    try {
        addHeroReleasesRow();
        
        console.log('PLUGIN: All OK');
    } catch (e) {
        console.error('PLUGIN: Error:', e);
    }
    
})();
