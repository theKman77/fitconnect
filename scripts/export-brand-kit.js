/**
 * Export presentation-ready FitConnect brand PNGs from the exact app mark.
 * Run: node scripts/export-brand-kit.js
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'brand-exports');
function definitions() {
  return `
    <defs>
      <linearGradient id="brand" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#FF9B73"/>
        <stop offset="45%" stop-color="#FF5C35"/>
        <stop offset="100%" stop-color="#DF3E16"/>
      </linearGradient>
    </defs>`;
}

function mark() {
  return `
    <g fill="url(#brand)">
      <path d="M145 102H279L264 197Q262 210 274 215L295 224L265 410H103Q76 410 81 383L122 129Q126 102 145 102Z"/>
      <path d="M306 102H409Q436 102 431 129L390 383Q386 410 367 410H292L321 238Q323 225 311 220L290 211Z"/>
    </g>`;
}

function markOnlySvg() {
  return Buffer.from(`
    <svg width="4096" height="4096" viewBox="0 0 4096 4096" xmlns="http://www.w3.org/2000/svg">
      ${definitions()}
      <svg x="369" y="369" width="3358" height="3358" viewBox="0 0 512 512">${mark()}</svg>
    </svg>`);
}

function lockupSvg() {
  return Buffer.from(`
    <svg width="4096" height="1536" viewBox="0 0 4096 1536" xmlns="http://www.w3.org/2000/svg">
      ${definitions()}
      <rect width="4096" height="1536" fill="#08090B"/>
      <svg x="274" y="300" width="936" height="936" viewBox="0 0 512 512">${mark()}</svg>
      <text x="1370" y="920" fill="#FF5C35" font-family="Arial, sans-serif" font-weight="900" font-size="520" letter-spacing="-18">FIT</text>
      <text x="2225" y="914" fill="#F8F7F4" font-family="Arial, sans-serif" font-weight="700" font-size="258" letter-spacing="34">CONNECT</text>
    </svg>`);
}

async function exportPng(filename, svg) {
  await sharp(svg).png({ compressionLevel: 9, adaptiveFiltering: true }).toFile(path.join(OUT, filename));
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  await exportPng('fitconnect-mark-4096-transparent.png', markOnlySvg());
  await exportPng('fitconnect-lockup-4096.png', lockupSvg());
  console.log(`Exported high-resolution brand kit to ${OUT}`);
})();
