/**
 * Генератор иконок и сплэшей для ярлыка на домашнем экране.
 *
 * Источник правды — знак `K` из `src/components/brand/Logo.tsx`: те же три path
 * в квадрате 100×100. Если знак меняется — правим `MARK_PATHS` и гоняем скрипт:
 *
 *     node scripts/generate-app-icons.mjs
 *
 * Почему не `ImageResponse` из `next/og`: иконки не зависят от рантайма
 * и от данных, а нужны как статические файлы — в том числе `/apple-touch-icon.png`,
 * который iOS ищет в корне сам, ещё до того как прочитает разметку.
 */
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC = path.join(ROOT, "public");

/** Цвета берём из `globals.css` — они не должны разъезжаться с темой. */
const BG = "#0d2b08";
const BRAND = "#f5c43c";
const INK = "#ffffff";

/**
 * Знак `K` в системе координат 100×100 — те же path, что в `Logo.tsx`,
 * и его bbox (низ срезан по диагонали, поэтому высота не ровно 100).
 */
const MARK_PATHS = [
  { d: "M0 0h32.6v36.9L68.4 0H100v17.1L24.6 98.4H0Z", fill: INK },
  { d: "M71.1 69.5 98.4 98.4H46Z", fill: BRAND },
];
const MARK_BOX = { x: 0, y: 0, w: 100, h: 98.4 };

/**
 * SVG со знаком по центру холста `w × h`.
 *
 * `ratio` — доля меньшей стороны холста, которую занимает знак по ширине.
 * Именно ширина, а не «вписать целиком»: знак шире, чем выше, и подгонка
 * по высоте делала бы его визуально громоздким.
 */
function markSvg({ w, h, ratio, bg = BG }) {
  const scale = (Math.min(w, h) * ratio) / MARK_BOX.w;
  const tx = (w - MARK_BOX.w * scale) / 2 - MARK_BOX.x * scale;
  const ty = (h - MARK_BOX.h * scale) / 2 - MARK_BOX.y * scale;
  const paths = MARK_PATHS.map(
    (p) => `<path d="${p.d}" fill="${p.fill}"/>`,
  ).join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" fill="${bg}"/>
  <g transform="translate(${tx} ${ty}) scale(${scale})">${paths}</g>
</svg>`;
}

async function png(svg, file) {
  const out = path.join(PUBLIC, file);
  await mkdir(path.dirname(out), { recursive: true });
  await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(out);
  return file;
}

/**
 * Иконки приложения.
 *
 * `ratio` у maskable меньше: Android режет иконку под форму лаунчера и гарантирует
 * только центральный круг в 80% холста — в него должен помещаться весь знак.
 * У apple-touch запас меньше, чем у обычной: iOS только скругляет углы,
 * ничего не обрезая, и слишком мелкий знак читается как «сайт в рамке».
 */
const ICONS = [
  { file: "icons/icon-192.png", size: 192, ratio: 0.62 },
  { file: "icons/icon-512.png", size: 512, ratio: 0.62 },
  { file: "icons/icon-1024.png", size: 1024, ratio: 0.62 },
  { file: "icons/maskable-192.png", size: 192, ratio: 0.5 },
  { file: "icons/maskable-512.png", size: 512, ratio: 0.5 },
  { file: "apple-touch-icon.png", size: 180, ratio: 0.6 },
];

/**
 * Сплэши для iOS. Без них standalone-запуск на iPhone встречает белым экраном:
 * манифест с `background_color` Safari игнорирует.
 *
 * `[cssW, cssH, dpr]` — то, что реально отдаёт устройство в медиавыражении;
 * пиксельный размер файла обязан быть ровно `cssW*dpr × cssH*dpr`,
 * иначе iOS молча откажется от картинки.
 */
const SPLASHES = [
  [320, 568, 2], // SE 1
  [375, 667, 2], // 8, SE 2/3
  [414, 736, 3], // 8 Plus
  [375, 812, 3], // X, XS, 11 Pro, 12/13 mini
  [414, 896, 2], // XR, 11
  [414, 896, 3], // XS Max, 11 Pro Max
  [390, 844, 3], // 12, 13, 14
  [428, 926, 3], // 12/13 Pro Max, 14 Plus
  [393, 852, 3], // 14 Pro, 15, 15 Pro, 16
  [430, 932, 3], // 14 Pro Max, 15 Plus, 15 Pro Max
  [402, 874, 3], // 16 Pro
  [440, 956, 3], // 16 Pro Max
];

/**
 * Иконки быстрых действий (долгое нажатие на ярлык в Android).
 * Рисуем из тех же lucide-глифов, что стоят в интерфейсе, — чтобы меню ярлыка
 * не выглядело набором чужих картинок.
 */
const SHORTCUT_ICONS = [
  { file: "icons/shortcut-hours.png", icon: "clock" },
  { file: "icons/shortcut-report.png", icon: "file-plus" },
  { file: "icons/shortcut-timer.png", icon: "timer" },
];

/** Собирает SVG 96×96 из `__iconNode` lucide: [тег, атрибуты]. */
async function lucideSvg(name, size = 96) {
  const { __iconNode: nodes } = await import(
    `lucide-react/dist/esm/icons/${name}.mjs`
  );
  const body = nodes
    .map(([tag, attrs]) => {
      const props = Object.entries(attrs)
        .filter(([key]) => key !== "key")
        .map(([key, value]) => `${key}="${value}"`)
        .join(" ");
      return `<${tag} ${props}/>`;
    })
    .join("");
  const scale = (size * 0.5) / 24;
  const offset = (size - 24 * scale) / 2;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${BG}"/>
  <g transform="translate(${offset} ${offset}) scale(${scale})" fill="none" stroke="${BRAND}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${body}</g>
</svg>`;
}

async function main() {
  const written = [];

  for (const { file, icon } of SHORTCUT_ICONS) {
    written.push(await png(await lucideSvg(icon), file));
  }

  for (const { file, size, ratio } of ICONS) {
    written.push(await png(markSvg({ w: size, h: size, ratio }), file));
  }

  for (const [cssW, cssH, dpr] of SPLASHES) {
    const w = cssW * dpr;
    const h = cssH * dpr;
    written.push(
      await png(markSvg({ w, h, ratio: 0.34 }), `splash/${w}x${h}.png`),
    );
  }

  console.log(`Готово, файлов: ${written.length}`);
  for (const file of written) console.log(`  public/${file}`);
}

await main();
