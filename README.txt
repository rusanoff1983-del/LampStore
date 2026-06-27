GitHub-магазин расширений Lampa.

Пользователь ставит только один файл:

store.js

Дальше магазин открывается в настройках Lampa и читает plugins/index.json.
Каждая папка внутри plugins — это отдельный плагин.
Добавил новую папку на GitHub — GitHub Actions сам обновляет index.json, и плагин появляется у всех пользователей магазина.

Структура репозитория:

store.js
plugins/
  index.json
  hello/
    plugin.js
    text.txt
    screenshot.png
  soft-panel/
    plugin.js
    text.txt
  quick-bell/
    plugin.js
    text.txt

В начале store.js надо заменить:

owner: 'YOUR_GITHUB_LOGIN'
repo: 'YOUR_REPO_NAME'
branch: 'main'

На свои данные GitHub.

Ссылка для установки будет:

https://raw.githubusercontent.com/USER/REPO/main/store.js

Минимум для нового плагина:

plugins/имя-папки/plugin.js

Можно не называть файл plugin.js. Если в папке один JS, магазин сам возьмёт его.

Желательно:

plugins/имя-папки/text.txt

Первая строка text.txt — название плагина.
Остальной текст — описание.

Скриншот можно положить одним из имён:

screenshot.png
screenshot.jpg
screenshot.webp
screen.png
preview.png

Иконку можно положить одним из имён:

icon.png
icon.jpg
icon.webp

Если магазин нужен на всех твоих устройствах через Lampac Web, добавь в:

/opt/lampac/plugins/override/lampainit.js

после clearInterval(timer);

Lampa.Utils.putScriptAsync([
  "https://raw.githubusercontent.com/USER/REPO/main/store.js"
], function () {});

Потом перезапусти Lampac:

systemctl restart lampac
