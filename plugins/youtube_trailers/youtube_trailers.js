(function () {
    "use strict";

    function startPlugin() {
        window.plugin_youtube_trailers_live = true;

        Lampa.Listener.follow("full", function (event) {
            if (event.type === "complite") {
                var movie = event.data.movie;
                var render = event.object.activity.render();
                var btn = render.find(".view--trailer");

                if (!btn.length) return;

                btn.off("hover:enter click").on("hover:enter click", function () {
                    var title = movie.title || movie.name || movie.original_title || movie.original_name || "";
                    var year = (movie.release_date || movie.first_air_date || "").substring(0, 4);

                    if (!title) {
                        Lampa.Noty.show("Название фильма не указано");
                        return;
                    }

                    Lampa.Noty.show("Ищем трейлеры на YouTube...");

                    var url = "http://192.168.7.106:9118/lite/yttrailers?title=" + encodeURIComponent(title) + "&year=" + (year || 0);

                    fetch(url)
                        .then(function (r) { return r.json(); })
                        .then(function (results) {
                            if (results && results.length) {
                                var items = results.map(function (elem) {
                                    return {
                                        title: elem.title,
                                        subtitle: elem.subtitle || "YouTube",
                                        id: elem.id,
                                        url: "https://www.youtube.com/watch?v=" + elem.id,
                                        youtube: true
                                    };
                                });

                                Lampa.Select.show({
                                    title: "YouTube - Трейлеры",
                                    items: items,
                                    onSelect: function (a) {
                                        if (Lampa.Platform.is("android")) {
                                            Lampa.Android.openYoutube(a.id);
                                        } else if (Lampa.YouTube && Lampa.YouTube.play) {
                                            Lampa.YouTube.play(a.id);
                                        } else if (Lampa.Player && Lampa.Player.play) {
                                            Lampa.Player.play(a);
                                        }
                                    },
                                    onBack: function () {
                                        Lampa.Controller.toggle("full_start");
                                    }
                                });
                            } else {
                                Lampa.Noty.show("Трейлеры на YouTube не найдены");
                            }
                        })
                        ["catch"](function (e) {
                            console.error("[YT Trailers]", e);
                            Lampa.Noty.show("Ошибка поиска трейлеров");
                        });
                });
            }
        });
    }

    if (!window.plugin_youtube_trailers_live) startPlugin();
})();
