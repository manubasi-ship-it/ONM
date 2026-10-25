import fs from 'fs';
import zlib from 'zlib';

function createPng(width, height, getPixel) {
  // Simple PNG encoder using Node standard zlib
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8); // bit depth 8
  ihdrData.writeUInt8(6, 9); // RGBA
  ihdrData.writeUInt8(0, 10); // compression
  ihdrData.writeUInt8(0, 11); // filter
  ihdrData.writeUInt8(0, 12); // interlace

  const ihdrChunk = makeChunk('IHDR', ihdrData);

  // IDAT raw scanlines (filter byte 0 per line)
  const rawData = Buffer.alloc((width * 4 + 1) * height);
  let pos = 0;
  for (let y = 0; y < height; y++) {
    rawData[pos++] = 0; // Filter None
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = getPixel(x, y, width, height);
      rawData[pos++] = r;
      rawData[pos++] = g;
      rawData[pos++] = b;
      rawData[pos++] = a;
    }
  }

  const compressed = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function makeChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(4 + 4 + len + 4);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);
  const crc = crc32(chunk.subarray(4, 8 + len));
  chunk.writeUInt32BE(crc >>> 0, 8 + len);
  return chunk;
}

// CRC32 table
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function renderMurugaVelIcon(x, y, w, h) {
  // Normalized coords
  const nx = (x - w / 2) / (w / 2);
  const ny = (y - h / 2) / (h / 2);
  const dist = Math.sqrt(nx * nx + ny * ny);

  // Background: Deep dark warm stone (#1c1917)
  let r = 28, g = 25, b = 23, a = 255;

  // Gold ring border
  if (dist > 0.82 && dist < 0.94) {
    const ringT = (dist - 0.82) / 0.12;
    r = 217; g = 119; b = 6;
  }

  // Inner subtle glow
  if (dist <= 0.82) {
    const radial = 1 - dist;
    r = Math.min(255, Math.floor(28 + radial * 40));
    g = Math.min(255, Math.floor(25 + radial * 20));
    b = 23;
  }

  // Draw Central Vel / Trishul silhouette
  // Stem: vertical line around x=0, from ny = -0.3 to +0.65
  const isStem = Math.abs(nx) < 0.045 && ny > -0.3 && ny < 0.68;
  
  // Center spear tip: triangular from ny = -0.65 down to ny = -0.25
  const spearHalfWidth = Math.max(0, (ny - -0.65) * 0.38);
  const isCenterSpear = ny >= -0.65 && ny <= -0.15 && Math.abs(nx) <= spearHalfWidth && Math.abs(nx) <= 0.18;

  // Left prong
  const leftProngDist = Math.hypot(nx - -0.22, ny - -0.22);
  const isLeftCurve = Math.abs(nx - -0.2) < 0.08 && ny >= -0.45 && ny <= 0.05 && nx < 0;

  // Right prong
  const isRightCurve = Math.abs(nx - 0.2) < 0.08 && ny >= -0.45 && ny <= 0.05 && nx > 0;

  // Cross guard
  const isCross = Math.abs(ny - 0.05) < 0.035 && Math.abs(nx) < 0.32;

  if (isCenterSpear || isStem || isLeftCurve || isRightCurve || isCross) {
    // Rich radiant gold: #f59e0b to #fbbf24
    r = 245; g = 158; b = 11;
  }

  return [r, g, b, a];
}

if (!fs.existsSync('./public')) {
  fs.mkdirSync('./public', { recursive: true });
}

fs.writeFileSync('./public/pwa-192x192.png', createPng(192, 192, renderMurugaVelIcon));
fs.writeFileSync('./public/pwa-512x512.png', createPng(512, 512, renderMurugaVelIcon));
fs.writeFileSync('./public/pwa-maskable-512x512.png', createPng(512, 512, renderMurugaVelIcon));
fs.writeFileSync('./public/apple-touch-icon.png', createPng(180, 180, renderMurugaVelIcon));

console.log('Successfully created PWA PNG icons!');
