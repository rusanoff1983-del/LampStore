const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OWNER = 'rusanoff1983-del';
const REPO = 'LampStore';
const BRANCH = 'main';
const CDN = `https://cdn.jsdelivr.net/gh/${OWNER}/${REPO}@${BRANCH}/`;

const PLUGINS_DIR = path.join(ROOT, 'plugins');
const LINKS_DIR = path.join(ROOT, 'links');
const OUT = path.join(ROOT, 'extensions.json');

const IMAGE_NAMES = [
  'screenshot.webp',
  'screenshot.png',
  'screenshot.jpg',
  'screenshot.jpeg',
  'screen.webp',
  'screen.png',
  'screen.jpg',
  'preview.webp',
  'preview.png',
  'preview.jpg',
  'icon.webp',
  'icon.png',
  'icon.jpg',
  'icon.jpeg'
];

function exists(file) {
  try {
    return fs.existsSync(file);
  } catch {
    return false;
  }
}

function readText(file) {
  try {
    return fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
  } catch {
    return '';
  }
}

function prettyName(name) {
  return String(name || '')
    .replace(/\.[^.]+$/, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (s) => s.toUpperCase());
}

function cdnUrl(...parts) {
  return CDN + parts.map((p) => encodeURIComponent(String(p)).replace(/%2F/g, '/')).join('/');
}

function firstExisting(dir, names) {
  for (const name of names) {
    if (exists(path.join(dir, name))) return name;
  }
  return '';
}

function firstJs(dir) {
  try {
    const files = fs.readdirSync(dir, { withFileTypes: true })
      .filter((x) => x.isFile() && /\.js$/i.test(x.name))
      .map((x) => x.name)
      .sort((a, b) => a.localeCompare(b));

    return files.find((x) => /^plugin\.js$/i.test(x)) ||
      files.find((x) => /^index\.js$/i.test(x)) ||
      files.find((x) => /^main\.js$/i.test(x)) ||
      files[0] ||
      '';
  } catch {
    return '';
  }
}

function parseDescription(file, fallbackName) {
  const text = readText(file).replace(/\r/g, '').trim();
  if (!text) return { name: fallbackName, descr: '' };

  const lines = text.split('\n').map((x) => x.trim()).filter(Boolean);
  const name = (lines.shift() || fallbackName).replace(/^#\s*/, '').trim() || fallbackName;

  return {
    name,
    descr: lines.join('\n').trim()
  };
}

function pluginFromFolder(folderName) {
  const dir = path.join(PLUGINS_DIR, folderName);
  if (!fs.statSync(dir).isDirectory()) return null;

  const urlFile = firstExisting(dir, ['url.txt', 'link.txt']);
  const js = firstJs(dir);
  if (!urlFile && !js) return null;

  const textFile = firstExisting(dir, ['text.txt', 'title.txt', 'description.txt', 'readme.txt', 'README.md', 'readme.md']);
  const imageFile = firstExisting(dir, IMAGE_NAMES);
  const parsed = parseDescription(textFile ? path.join(dir, textFile) : '', prettyName(folderName));
  const link = urlFile ? readText(path.join(dir, urlFile)).split(/\r?\n/).map((x) => x.trim()).filter(Boolean)[0] : cdnUrl('plugins', folderName, js);
  if (!link) return null;

  const image = imageFile ? cdnUrl('plugins', folderName, imageFile) : '';

  return {
    name: parsed.name,
    author: '@100melochey',
    link,
    url: link,
    descr: parsed.descr || link,
    instruction: parsed.descr || 'Нажми Enter и выбери установку.',
    image,
    screenshot: image,
    screenshots: image ? [image] : [],
    available_lampa: 1
  };
}

function linkImage(slug) {
  const names = [
    `${slug}.webp`,
    `${slug}.png`,
    `${slug}.jpg`,
    `${slug}.jpeg`
  ];

  const found = firstExisting(LINKS_DIR, names);
  return found ? cdnUrl('links', found) : '';
}

function pluginFromLinkLine(line, index) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return null;

  const parts = trimmed.split('|').map((x) => x.trim());
  let name = parts[0] || '';
  let link = parts[1] || '';
  const descr = parts[2] || '';
  let image = parts[3] || '';

  if (/^https?:\/\//i.test(name) && !link) {
    link = name;
    name = '';
  }

  if (!/^https?:\/\//i.test(link)) return null;

  const clean = link.split('?')[0].split('#')[0];
  const file = clean.split('/').pop() || `link-${index}`;
  const slug = file.replace(/\.[^.]+$/, '');

  if (!name) name = prettyName(slug);
  if (image && !/^https?:\/\//i.test(image)) image = cdnUrl('links', image);
  if (!image) image = linkImage(slug);

  return {
    name,
    author: '@external',
    link,
    url: link,
    descr: descr || link,
    instruction: descr || 'Внешний плагин. Обновляется у автора по этой ссылке.',
    image,
    screenshot: image,
    screenshots: image ? [image] : [],
    available_lampa: 1
  };
}

function build() {
  const folderPlugins = exists(PLUGINS_DIR)
    ? fs.readdirSync(PLUGINS_DIR).sort((a, b) => a.localeCompare(b)).map(pluginFromFolder).filter(Boolean)
    : [];

  const linksText = readText(path.join(LINKS_DIR, 'links.txt'));
  const linkPlugins = linksText.split(/\r?\n/).map(pluginFromLinkLine).filter(Boolean);

  const byLink = new Map();
  for (const item of [...folderPlugins, ...linkPlugins]) {
    byLink.set(item.link, item);
  }

  const all = [...byLink.values()].sort((a, b) => a.name.localeCompare(b.name));
  const withImages = all.filter((item) => item.image);
  const withoutImages = all.filter((item) => !item.image);

  const sections = [];

  if (withImages.length) {
    sections.push({
      title: 'Скриншоты',
      hpu: 'recomend',
      results: withImages
    });
  }

  if (withoutImages.length) {
    sections.push({
      title: 'Ссылки',
      results: withoutImages
    });
  }

  const catalog = {
    secuses: true,
    name: 'LampStore',
    results: sections
  };

  fs.writeFileSync(OUT, JSON.stringify(catalog, null, 2), 'utf8');
  console.log(`Wrote ${path.relative(ROOT, OUT)}: ${all.length} plugins`);
}

build();
