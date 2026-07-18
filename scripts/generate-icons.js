/**
 * Generates FitConnect app icons + splash from the FitConnect handoff mark.
 * Run: node scripts/generate-icons.js
 */
const sharp = require('sharp');
const path = require('path');

const OUT = path.join(__dirname, '..', 'assets', 'images');
const BG = '#08090B';

/**
 * The Handoff.
 *
 * Two precisely fitted parts complete one forward-leaning form. The negative
 * seam is the moment a trainer transfers structure and momentum to a client.
 * It stays intentionally abstract: no dating-app hearts, chain links,
 * dumbbells, initials or medical symbolism.
 */
function mark(fill) {
  const paint = fill ?? 'url(#brand)';
  return `
    <defs>
      <linearGradient id="brand" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#FF9B73"/>
        <stop offset="45%" stop-color="#FF5C35"/>
        <stop offset="100%" stop-color="#DF3E16"/>
      </linearGradient>
    </defs>
    <g fill="${paint}">
      <path d="M145 102H279L264 197Q262 210 274 215L295 224L265 410H103Q76 410 81 383L122 129Q126 102 145 102Z"/>
      <path d="M306 102H409Q436 102 431 129L390 383Q386 410 367 410H292L321 238Q323 225 311 220L290 211Z"/>
    </g>`;
}

function svg({ size, bg, markScale = 1, fill }) {
  const s = 512 * markScale;
  const off = (size - s) / 2;
  return Buffer.from(`
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      ${bg ? `<rect width="${size}" height="${size}" fill="${bg}"/>` : ''}
      <svg x="${off}" y="${off}" width="${s}" height="${s}" viewBox="0 0 512 512">${mark(fill)}</svg>
    </svg>`);
}

async function write(name, buffer) {
  await sharp(buffer).png().toFile(path.join(OUT, name));
  console.log('wrote', name);
}

(async () => {
  // App icon: dark bg, generous margin (iOS rounds corners itself).
  await write('icon.png', svg({ size: 1024, bg: BG, markScale: 1.12 }));
  // Splash: transparent, shown on the dark splash background.
  await write('splash-icon.png', svg({ size: 600, markScale: 0.82 }));
  await write('brand-mark.png', svg({ size: 512, markScale: 0.82 }));
  // Android adaptive: content must sit inside the middle ~60% safe zone.
  await write('android-icon-foreground.png', svg({ size: 1024, markScale: 1.0 }));
  await write('android-icon-monochrome.png', svg({ size: 1024, markScale: 1.0, fill: '#FFFFFF' }));
  await write('favicon.png', svg({ size: 96, bg: BG, markScale: 0.16 }));
  console.log('done');
})();
