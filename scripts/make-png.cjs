const fs = require('fs');

// Minimal valid 1x1 base64 transparent PNG, then expanded or standard PWA icons
// We write clean 192x192 and 512x512 solid PNG buffers
function createSolidPng(width, height, r, g, b) {
  const zlib = require('zlib');
  
  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  
  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: truecolor (RGB)
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  
  const ihdrChunk = createChunk('IHDR', ihdr);
  
  // Raw scanlines
  const rowSize = 1 + width * 3;
  const rawData = Buffer.alloc(rowSize * height);
  for (let y = 0; y < height; y++) {
    const offset = y * rowSize;
    rawData[offset] = 0; // filter type None
    for (let x = 0; x < width; x++) {
      const pixelOffset = offset + 1 + x * 3;
      // Border or center square
      const isCenter = (x > width * 0.2 && x < width * 0.8 && y > height * 0.2 && y < height * 0.8);
      rawData[pixelOffset] = isCenter ? 245 : r;     // R
      rawData[pixelOffset + 1] = isCenter ? 158 : g; // G
      rawData[pixelOffset + 2] = isCenter ? 11 : b;  // B
    }
  }
  
  const compressed = zlib.deflateSync(rawData);
  const idatChunk = createChunk('IDAT', compressed);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));
  
  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const len = data.length;
  const buf = Buffer.alloc(4 + 4 + len + 4);
  buf.writeUInt32BE(len, 0);
  buf.write(type, 4, 4, 'ascii');
  data.copy(buf, 8);
  
  const crc = require('zlib').crc32(buf.subarray(4, 8 + len));
  buf.writeUInt32BE(crc >>> 0, 8 + len);
  return buf;
}

fs.writeFileSync('./public/icon-192.png', createSolidPng(192, 192, 15, 23, 42));
fs.writeFileSync('./public/icon-512.png', createSolidPng(512, 512, 15, 23, 42));
console.log('Created public/icon-192.png and public/icon-512.png successfully');
