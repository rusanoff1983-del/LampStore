// Данные плагинов
const plugins = [
	{
		name: "Нижнее меню",
		author: "navigatorAlex",
		version: "v1.0",
		file: "https://arst113.github.io/log/NewPhoneMenu.js",
		description: "Плагин под Мобильные телефон, добавляет пункт сериалы и фильмы в нижнее меню.",
		badge: "Оформления",
		image: "https://tvigl.github.io/plugins/img/NewPhoneMenu.jpg",
		telegramLink: "https://t.me/navigatorAlex"
	},
	{
		name: "LNUM",
		author: "Levende",
		version: "v1.0",
		file: "https://levende.github.io/lampa-plugins/lnum.js",
		description: "Плагин добавляет в меню Лампы раздел или “подборку” от LNUM. Это каталог контента (фильмов / сериалов), который становится доступным прямо в Лампе.",
		badge: "Подборки",
		image: "",
		githubLink: "https://levende.github.io/lampa-plugins/"
	},
	{
		name: "Bookmarks Sync Plugin",
		author: "Levende",
		version: "v1.0",
		file: "https://levende.github.io/lampa-plugins/bookmarks-sync.js",
		description: "Плагин синхронизации закладок",
		badge: "Разное",
		image: "",
		githubLink: "https://levende.github.io/lampa-plugins/"
	},
	{
		name: "Profiles Plugin",
		author: "Levende",
		version: "v1.0",
		file: "https://levende.github.io/lampa-plugins/profiles.js",
		description: "Плагин позволяет управлять профилем в приложении Lampa без необходимости КУБ сервис. Кроме того, он легко интегрируется с Сервис Lampac сервис синхронизации данных, обеспечивающий бесперебойный и подключенный пользовательский опыт.",
		badge: "Разное",
		image: "",
		githubLink: "https://levende.github.io/lampa-plugins/"
	},
	{
		name: "TMDB Networks",
		author: "Levende",
		version: "v2.0.3",
		file: "https://levende.github.io/lampa-plugins/tmdb-networks.js",
		description: "Плагин добавляет в карты кнопки потоковых сервисов и платформ, показывающие, где были выпущены или проданы фильмы и сериалы, что упрощает их поиск.",
		badge: "Онлайн",
		image: "",
		githubLink: "https://levende.github.io/lampa-plugins/"
	},
	{
		name: "Custom Favorites",
		author: "Levende",
		version: "v1.0",
		file: "https://levende.github.io/lampa-plugins/custom-favs.js",
		description: "Этот плагин улучшает LAMP, добавляя поддержку пользовательских типов закладок. Он позволяет создавать, редактировать и управлять различными категориями закладок в вашем приложении, обеспечивая большую гибкость в организации данных.",
		badge: "Разное",
		image: "",
		githubLink: "https://levende.github.io/lampa-plugins/"
	},
	{
		name: "Lampac Source Filter",
		author: "Levende",
		version: "v1.0",
		file: "https://levende.github.io/lampa-plugins/lampac-src-filter.js",
		description: "Фильтр источников",
		badge: "Онлайн",
		image: "",
		githubLink: "https://levende.github.io/lampa-plugins/"
	},
	{
		name: "Anti DMCA",
		author: "Levende",
		version: "v1.0",
		file: "https://levende.github.io/lampa-plugins/anti-dmca.js",
		description: "Убирает Контент заблокирован",
		badge: "Онлайн",
		image: "",
		githubLink: "https://levende.github.io/lampa-plugins/"
	},
	{
		name: "OnlineServe",
		author: "ipavlin98",
		version: "v1.0",
		file: "https://ipavlin98.github.io/lmp-plugins/oooo.js",
		description: "Берёт онлайн с лампак сервера или с BWA (по коду), ссылки можно указать в настройках.",
		badge: "Онлайн",
		image: "",
		githubLink: "https://ipavlin98.github.io/lmp-plugins/"
	},
	{
		name: "HFix",
		author: "ipavlin98",
		version: "v1.0",
		file: "https://ipavlin98.github.io/lmp-plugins/huyfix.js",
		description: "То же, что и OnlineServe, но с автоматическим поиском по всем выбранным в настройках балансерам без ручного выбора при запуске.",
		badge: "Онлайн",
		image: "",
		githubLink: "https://ipavlin98.github.io/lmp-plugins/"
	},
	{
		name: "Season Fix",
		author: "ipavlin98",
		version: "v1.0",
		file: "https://ipavlin98.github.io/lmp-plugins/season-fix.js",
		description: "Разбивает бесконечные первые сезоны аниме на нормальные части используя базу данных TVmaze.",
		badge: "Онлайн",
		image: "",
		githubLink: "https://ipavlin98.github.io/lmp-plugins/"
	},
	{
		name: "Anime Skip",
		author: "ipavlin98",
		version: "v1.0",
		file: "https://ipavlin98.github.io/lmp-plugins/anime-skip.js",
		description: "Пропуск опенингов и эндингов в аниме через базу Aniskip. Просмотреть или изменить информацию для конкретного аниме можно.",
		badge: "Онлайн",
		image: "",
		githubLink: "https://ipavlin98.github.io/lmp-plugins/"
	},
	{
		name: "Interface",
		author: "ipavlin98",
		version: "v1.0",
		file: "https://ipavlin98.github.io/lmp-plugins/int.js",
		description: "Моя версия «стильного интерфейса» с множеством разных настроек. Для того чтобы всё выглядело и работало правильно, необходимо после установки плагина включить маленький размер интерфейса (Настройки > Интерфейс > Размер интерфейса > Меньше). P.S. Недавно в плагин была добавлена настройка для полного отключения Shots.",
		badge: "Оформления",
		image: "",
		githubLink: "https://ipavlin98.github.io/lmp-plugins/"
	},
	{
		name: "Cardify Rating",
		author: "ipavlin98",
		version: "v1.0",
		file: "https://ipavlin98.github.io/lmp-plugins/cardify.js",
		description: "Немного исправленная версия Cardify с парой фиксов и отображением рейтингов.",
		badge: "Оформления",
		image: "",
		githubLink: "https://ipavlin98.github.io/lmp-plugins/"
	},
	{
		name: "Logo",
		author: "ipavlin98",
		version: "v1.0",
		file: "https://ipavlin98.github.io/lmp-plugins/logo.js",
		description: "Логотипы вместо названий. Плавная загрузка, кеширование, настройки разрешения.",
		badge: "Оформления",
		image: "",
		githubLink: "https://ipavlin98.github.io/lmp-plugins/"
	},
	{
		name: "Series Progress",
		author: "ipavlin98",
		version: "v1.0",
		file: "https://ipavlin98.github.io/lmp-plugins/series-progress-fix.js",
		description: "Исправленное и более аккуратное отображение прогресса просмотра сериалов и фильмов на карточках.",
		badge: "Онлайн",
		image: "",
		githubLink: "https://ipavlin98.github.io/lmp-plugins/"
	},
	{
		name: "Torrent Styles",
		author: "ipavlin98",
		version: "v1.0",
		file: "https://ipavlin98.github.io/lmp-plugins/torr-styles.js",
		description: "Подсветка высоких сидов зелёным, высокого битрейта красным, зелёная рамка фокуса.",
		badge: "Торренты",
		image: "",
		githubLink: "https://ipavlin98.github.io/lmp-plugins/"
	},
	{
		name: "Series Skip",
		author: "ipavlin98",
		version: "v1.0",
		file: "https://ipavlin98.github.io/lmp-series-skip-db/series-skip.js",
		description: "Пропуск интро и аутро для сериалов. Работает для большинства популярных тайтлов.",
		badge: "Онлайн",
		image: "",
		githubLink: "https://ipavlin98.github.io/lmp-plugins/"
	},
	{
		name: "PiP",
		author: "ipavlin98",
		version: "v1.0",
		file: "https://ipavlin98.github.io/lmp-plugins/pip.js",
		description: "Картинка в картинке для Tizen и других систем. Дает возможность перемещаться по лампе не выходя из плеера.",
		badge: "Онлайн",
		image: "",
		githubLink: "https://ipavlin98.github.io/lmp-plugins/"
	},
	{
		name: "RuTube Trailers",
		author: "ipavlin98",
		version: "v1.0",
		file: "https://ipavlin98.github.io/lmp-plugins/rt.js",
		description: "Исправляет воспроизведение RuTube трейлеров на многих системах (плагин самодостаточный, если у вас уже стоит плагин для RuTube трейлеров, удалите его перед установкой моего).",
		badge: "Онлайн",
		image: "",
		githubLink: "https://ipavlin98.github.io/lmp-plugins/"
	}
];
