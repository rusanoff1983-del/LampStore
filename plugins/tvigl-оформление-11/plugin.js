/**
 * @file RatingUp.js
 * @description Плагін для Lampa, який дозволяє переміщувати рейтинг на картках у верхній правий кут та/або розфарбовувати його залежно від значення.
 * @version 2.0
 */

(function() {
    'use strict';

    /**
     * Головна функція для ініціалізації плагіна.
     * Запускається після повної готовності додатку Lampa.
     */
    function startPlugin() {
        
        // --- Блок налаштувань ---
        var settings = {
            repositionRatings: Lampa.Storage.get('uprate_reposition_enabled', true),
            useColoredRatings: Lampa.Storage.get('uprate_colored_enabled', true)
        };

        if (!settings.repositionRatings && !settings.useColoredRatings) {
            console.log('UpRate plugin: обидві функції вимкнені в налаштуваннях.');
            return; 
        }

        console.log('UpRate plugin started:', 'reposition is ' + (settings.repositionRatings ? 'ON' : 'OFF'), 'coloring is ' + (settings.useColoredRatings ? 'ON' : 'OFF'));

        // --- Блок впровадження CSS ---
        if (settings.repositionRatings) {
            var style = document.createElement('style');
            style.innerHTML = [
                '/* Стилі застосовуються тільки до карток, які не в повноекранному режимі */',
                '.card:not(.fullscreen) .card__vote {',
                '    top: 0.3em !important;',
                '    bottom: auto !important;',
                '    right: 0 !important;',
                '    left: auto !important;',
                '    border-radius: 0.4em 0 0 0.4em !important;',
                '    padding: 0.1em 0.3em !important;',
                '    background: rgba(0, 0, 0, 0.7) !important;',
                '    backdrop-filter: blur(5px) !important;',
                '}'
            ].join('\n');
            document.head.appendChild(style);
        }

        /**
         * Застосовує колір до елемента на основі його числового текстового вмісту.
         * @param {HTMLElement} element - DOM-елемент, що містить текст рейтингу.
         */
        function applyColorByRating(element) {
            if (!element) return;
            
            var voteText = element.textContent.trim();
            var match = voteText.match(/(\d+(\.\d+)?)/);

            if (!match) return;

            var vote = parseFloat(match[0]);
            
            // Застосовуємо стилі скруглення та фону для всіх рейтингів
            element.style.borderRadius = '8px 0 0 8px';
            element.style.padding = '0.1em 0.3em';
            element.style.background = 'rgba(0, 0, 0, 0.7)';
            element.style.backdropFilter = 'blur(5px)';
            
            // Застосовуємо колір тексту залежно від діапазону оцінки
            if (vote >= 8 && vote <= 10) {
                element.style.color = 'lawngreen';
            } else if (vote >= 6 && vote < 8) {
                element.style.color = 'cornflowerblue';
            } else if (vote > 3 && vote < 6) {
                element.style.color = 'orange';
            } else if (vote >= 0 && vote <= 3) {
                element.style.color = 'red';
            }
        }

        /**
         * Основна функція оновлення, яка застосовує зміни до елементів з рейтингами.
         */
        function updateRatings() {
            
            // --- Блок оновлення позиції ---
            if (settings.repositionRatings) {
                var votesToPosition = document.querySelectorAll(".card__vote");
                for (var i = 0; i < votesToPosition.length; i++) {
                    var voteElement = votesToPosition[i];
                    if (!voteElement.closest('.fullscreen')) {
                        voteElement.style.position = "absolute";
                        voteElement.style.top = "0.3em";
                        voteElement.style.bottom = "auto";
                        voteElement.style.right = "0.3em";
                        voteElement.style.left = "auto";
                        voteElement.style.borderRadius = "8px 0 0 8px";
                        voteElement.style.padding = "0.1em 0.3em";
                        voteElement.style.background = "rgba(0, 0, 0, 0.7)";
                        voteElement.style.backdropFilter = "blur(5px)";
                    }
                }
            }

            // --- Блок оновлення кольору ---
            if (settings.useColoredRatings) {
                var allRatingElements = document.querySelectorAll(
                    ".card__vote, .full-start__rate, .full-start-new__rate, .info__rate, .card__imdb-rate, .card__kinopoisk-rate"
                );
                for (var j = 0; j < allRatingElements.length; j++) {
                    applyColorByRating(allRatingElements[j]);
                }
            }
        }

        // --- Блок ініціалізації та спостереження ---

        setTimeout(updateRatings, 500);
        setTimeout(updateRatings, 1500);
        
        // Перевірка підтримки MutationObserver для старих браузерів
        if (typeof MutationObserver !== 'undefined') {
            var observer = new MutationObserver(updateRatings);
            observer.observe(document.body, { 
                childList: true,
                subtree: true
            });
        } else {
            // Фолбек для дуже старих браузерів - періодичне оновлення
            setInterval(updateRatings, 2000);
        }

        if (typeof Lampa !== 'undefined') {
            Lampa.Listener.follow('full', function (data) {
                if (data.type === 'complite') {
                    setTimeout(updateRatings, 150); 
                }
            });
        }
    }

    // --- Блок запуску плагіна ---
    if (typeof Lampa !== 'undefined') {
        if (window.appready) {
            startPlugin();
        } else {
            Lampa.Listener.follow('app', function(e) {
                if (e.type === 'ready') startPlugin();
            });
        }
    } else {
        window.addEventListener('load', startPlugin);
    }
})();