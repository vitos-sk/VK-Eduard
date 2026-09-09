/**
 * Стартовые экраны для iOS.
 *
 * Safari не читает `background_color` из манифеста: без этих картинок запуск
 * с домашнего экрана встречает белым прямоугольником на пару секунд.
 * Картинка подхватывается только при точном совпадении медиавыражения
 * и точном размере файла — поэтому список устройств и генератор
 * `scripts/generate-app-icons.mjs` держим синхронными (там тот же массив).
 */
const DEVICES: ReadonlyArray<readonly [number, number, number]> = [
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

/** Готовый список для `metadata.appleWebApp.startupImage`. */
export const appleStartupImages = DEVICES.map(([w, h, dpr]) => ({
  url: `/splash/${w * dpr}x${h * dpr}.png`,
  media: `(device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${dpr}) and (orientation: portrait)`,
}));
