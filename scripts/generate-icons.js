/**
 * Generates FitConnect app icons + splash from a vector dumbbell mark.
 * Run: node scripts/generate-icons.js
 */
const sharp = require('sharp');
const path = require('path');

const OUT = path.join(__dirname, '..', 'assets', 'images');
const BG = '#0B0B0D';

/** Dumbbell mark, centered in a 512x512 viewBox. `fill` overrides the gradient. */
function mark(fill) {
  const paint = fill ?? 'url(#g)';
  return `
    <defs>
      <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#FF5A1F"/>
        <stop offset="100%" stop-color="#FF9A5F"/>
      </linearGradient>
    </defs>
    <g fill="${paint}">
      <rect x="140" y="240" width="232" height="32" rx="16"/>
      <rect x="106" y="176" width="48"  height="160" rx="22"/>
      <rect x="358" y="176" width="48"  height="160" rx="22"/>
      <rect x="58"  y="206" width="34"  height="100" rx="16"/>
      <rect x="420" y="206" width="34"  height="100" rx="16"/>
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
  await write('icon.png', svg({ size: 1024, bg: BG, markScale: 1.3 }));
  // Splash: transparent, shown on the dark splash background.
  await write('splash-icon.png', svg({ size: 600, markScale: 1.0 }));
  // Android adaptive: content must sit inside the middle ~60% safe zone.
  await write('android-icon-foreground.png', svg({ size: 1024, markScale: 1.0 }));
  await write('android-icon-monochrome.png', svg({ size: 1024, markScale: 1.0, fill: '#FFFFFF' }));
  await write('favicon.png', svg({ size: 96, bg: BG, markScale: 0.16 }));
  console.log('done');
})();
