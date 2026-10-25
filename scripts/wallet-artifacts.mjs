import { deflateSync, deflateRawSync } from 'node:zlib';

const crcTable = Uint32Array.from({ length: 256 }, (_, i) => {
  let value = i;
  for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});
export function crc32(bytes) {
  let result = 0xffffffff;
  for (const byte of bytes) result = crcTable[(result ^ byte) & 255] ^ (result >>> 8);
  return (result ^ 0xffffffff) >>> 0;
}

// Small, deterministic ZIP writer. Artifact contents come from an explicit
// allowlist, never a recursive archive of the project or browser downloads.
export function zipFiles(files) {
  const local = [],
    central = [];
  let offset = 0;
  for (const [path, data] of [...files].sort(([a], [b]) => a.localeCompare(b))) {
    if (!/^[a-zA-Z0-9_./-]+$/.test(path) || path.startsWith('/') || path.split('/').includes('..'))
      throw new Error(`Unsafe archive path: ${path}`);
    const name = Buffer.from(path),
      raw = Buffer.isBuffer(data) ? data : Buffer.from(data),
      compressed = deflateRawSync(raw),
      crc = crc32(raw);
    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50, 0);
    header.writeUInt16LE(20, 4);
    header.writeUInt16LE(0x800, 6);
    header.writeUInt16LE(8, 8);
    header.writeUInt16LE(33, 12);
    header.writeUInt32LE(crc, 14);
    header.writeUInt32LE(compressed.length, 18);
    header.writeUInt32LE(raw.length, 22);
    header.writeUInt16LE(name.length, 26);
    local.push(header, name, compressed);
    const item = Buffer.alloc(46);
    item.writeUInt32LE(0x02014b50, 0);
    item.writeUInt16LE(20, 4);
    item.writeUInt16LE(20, 6);
    item.writeUInt16LE(0x800, 8);
    item.writeUInt16LE(8, 10);
    item.writeUInt16LE(33, 14);
    item.writeUInt32LE(crc, 16);
    item.writeUInt32LE(compressed.length, 20);
    item.writeUInt32LE(raw.length, 24);
    item.writeUInt16LE(name.length, 28);
    item.writeUInt32LE(offset, 42);
    central.push(item, name);
    offset += header.length + name.length + compressed.length;
  }
  const directory = Buffer.concat(central),
    end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.size, 8);
  end.writeUInt16LE(files.size, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...local, directory, end]);
}

function pngChunk(name, data) {
  const type = Buffer.from(name);
  const length = Buffer.alloc(4),
    checksum = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  checksum.writeUInt32BE(crc32(Buffer.concat([type, data])));
  return Buffer.concat([length, type, data, checksum]);
}
export function walletIcon(size) {
  const pixels = Buffer.alloc(size * (size * 4 + 1));
  const rounded = (x, y, left, top, right, bottom, radius) => {
    const cx = Math.max(left + radius, Math.min(right - radius, x)),
      cy = Math.max(top + radius, Math.min(bottom - radius, y));
    return (
      x >= left &&
      x <= right &&
      y >= top &&
      y <= bottom &&
      (x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2
    );
  };
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      let r = 0,
        g = 0,
        b = 0,
        a = 0;
      for (let sy = 0; sy < 4; sy++)
        for (let sx = 0; sx < 4; sx++) {
          const xx = ((x + (sx + 0.5) / 4) / size) * 128,
            yy = ((y + (sy + 0.5) / 4) / size) * 128;
          let color = null;
          if (rounded(xx, yy, 3, 3, 125, 125, 25)) color = [237, 249, 241];
          if (rounded(xx, yy, 20, 31, 103, 96, 10)) color = [22, 158, 80];
          if (rounded(xx, yy, 72, 51, 109, 78, 5)) color = [255, 255, 255];
          if ((xx - 84) ** 2 + (yy - 64) ** 2 < 4 ** 2) color = [22, 158, 80];
          if (color) {
            r += color[0];
            g += color[1];
            b += color[2];
            a += 255;
          }
        }
      const at = y * (size * 4 + 1) + 1 + x * 4;
      pixels[at] = a ? Math.round((r * 255) / a) : 0;
      pixels[at + 1] = a ? Math.round((g * 255) / a) : 0;
      pixels[at + 2] = a ? Math.round((b * 255) / a) : 0;
      pixels[at + 3] = Math.round(a / 16);
    }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', header),
    pngChunk('IDAT', deflateSync(pixels)),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}
