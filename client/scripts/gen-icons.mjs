// Generates CampusRide PWA icons as valid PNGs without external deps.
// Draws a coral rounded square with a white "CR" wordmark approximation
// (a simple pixel glyph grid) — enough for a crisp installable icon.
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CORAL = [234, 88, 88];
const WHITE = [255, 255, 255];

function makeIcon(size) {
  const px = (x, y, c) => {
    const i = (y * size + x) * 4;
    buf[i] = c[0];
    buf[i + 1] = c[1];
    buf[i + 2] = c[2];
    buf[i + 3] = 255;
  };
  const buf = Buffer.alloc(size * size * 4);
  const radius = Math.floor(size * 0.22);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      // rounded-rect mask
      const inX = x >= radius && x < size - radius;
      const inY = y >= radius && y < size - radius;
      let inside = inX || inY;
      if (!inside) {
        const cx = x < radius ? radius : size - radius - 1;
        const cy = y < radius ? radius : size - radius - 1;
        inside = (x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2;
      }
      px(x, y, inside ? CORAL : [15, 23, 42]);
    }
  }
  // Draw a simple white car/pin glyph: a centered white circle with a ring.
  const cx = size / 2;
  const cy = size / 2;
  const rOuter = size * 0.26;
  const rInner = size * 0.13;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const d2 = (x - cx) ** 2 + (y - cy) ** 2;
      if (d2 <= rOuter ** 2 && d2 >= rInner ** 2) px(x, y, WHITE);
    }
  }
  return encodePng(size, size, buf);
}

function encodePng(w, h, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y += 1) {
    raw[y * (w * 4 + 1)] = 0;
    rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  }
  const idat = deflateSync(raw);
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])) >>> 0, 0);
    return Buffer.concat([len, typeBuf, data, crc]);
  };
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const CRC_TABLE = (() => {
  const t = [];
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return c ^ 0xffffffff;
}

const pub = resolve(__dirname, '..', 'public');
mkdirSync(pub, { recursive: true });
writeFileSync(resolve(pub, 'pwa-192.png'), makeIcon(192));
writeFileSync(resolve(pub, 'pwa-512.png'), makeIcon(512));
// eslint-disable-next-line no-console
console.log('Generated pwa-192.png and pwa-512.png in client/public');
