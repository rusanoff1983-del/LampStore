const fs = require('fs');
const path = require('path');

const root = 'plugins';
const imageNames = [
  'screenshot.png',
  'screenshot.jpg',
  'screenshot.jpeg',
  'screenshot.webp',
  'screen.png',
  'screen.jpg',
  'preview.png',
  'preview.jpg'
];
const iconNames = ['icon.png', 'icon.jpg', 'icon.jpeg', 'icon.webp'];

function prettyName(name) {
  return String(name || '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (s) => s.toUpperCase());
}

function findFirst(files, names) {
  const lower = new Map(files.map((file) => [file.toLowerCase(), file]));

  for (const name of names) {
    const found = lower.get(name.toLowerCase());
    if (found) return found;
  }

  return '';
}

function readDescription(folder, textFile, fallbackName) {
  if (!textFile) {
    return {
      name: fallbackName,
      description: ''
    };
  }

  const raw = fs.readFileSync(path.join(folder, textFile), 'utf8').replace(/\r/g, '').trim();
  const lines = raw.split('\n').map((line) => line.trim()).filter(Boolean);

  if (!lines.length) {
    return {
      name: fallbackName,
      description: ''
    };
  }

  return {
    name: lines[0].replace(/^#\s*/, '') || fallbackName,
    description: lines.length > 1 ? lines.slice(1).join('\n').trim() : ''
  };
}

const plugins = [];

if (fs.existsSync(root)) {
  for (const dir of fs.readdirSync(root).sort()) {
    const folder = path.join(root, dir);
    if (!fs.statSync(folder).isDirectory()) continue;

    const files = fs.readdirSync(folder);
    let pluginFile = findFirst(files, ['plugin.js', 'index.js', 'main.js']);
    if (!pluginFile) pluginFile = files.filter((file) => /\.js$/i.test(file)).sort()[0] || '';
    if (!pluginFile) continue;

    const textFile = findFirst(files, ['text.txt', 'description.txt', 'readme.txt', 'README.md', 'readme.md']);
    const icon = findFirst(files, iconNames);
    const screenshot = findFirst(files, imageNames);
    const meta = readDescription(folder, textFile, prettyName(dir));

    plugins.push({
      id: dir,
      name: meta.name,
      description: meta.description,
      folder: `${root}/${dir}`,
      file: pluginFile,
      category: 'Плагины',
      version: '1.0.0',
      icon,
      screenshots: screenshot ? [screenshot] : []
    });
  }
}

const index = {
  name: '100 мелочей',
  updated: new Date().toISOString(),
  plugins
};

fs.writeFileSync(path.join(root, 'index.json'), `${JSON.stringify(index, null, 2)}\n`, 'utf8');
