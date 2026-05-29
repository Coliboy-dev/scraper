import path from 'path';
import fs from 'fs/promises';
import { createReadStream, createWriteStream } from 'fs';
import zlib from 'zlib';
import { logger } from '../utils/logger.js';

export async function createZip({ outDir, domain }) {
  const analysisDir = path.join(outDir, 'analysis');
  const zipPath = path.join(path.dirname(outDir), `${domain}-analysis.tar.gz`);

  try {
    const files = await getAllFiles(analysisDir);
    await buildTarGz(files, analysisDir, zipPath);
    logger.done(`Package ZIP prêt : ${zipPath}`);
    return zipPath;
  } catch (err) {
    logger.warn(`Création ZIP échouée : ${err.message}`);
    return null;
  }
}

async function getAllFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await getAllFiles(full));
    else files.push(full);
  }
  return files;
}

async function buildTarGz(files, baseDir, outputPath) {
  return new Promise((resolve, reject) => {
    const out  = createWriteStream(outputPath);
    const gzip = zlib.createGzip();
    gzip.pipe(out);
    out.on('close', resolve);
    gzip.on('error', reject);

    writeEntries(gzip, files, baseDir)
      .then(() => {
        // End-of-archive: two 512-byte zero blocks
        gzip.write(Buffer.alloc(1024));
        gzip.end();
      })
      .catch(reject);
  });
}

async function writeEntries(stream, files, baseDir) {
  for (const file of files) {
    const relPath = path.relative(baseDir, file).replace(/\\/g, '/');
    const stat    = await fs.stat(file);
    stream.write(makeTarHeader(relPath, stat.size));

    await new Promise((res, rej) => {
      const read = createReadStream(file);
      read.on('data', chunk => stream.write(chunk));
      read.on('end', () => {
        const pad = (512 - (stat.size % 512)) % 512;
        if (pad) stream.write(Buffer.alloc(pad));
        res();
      });
      read.on('error', rej);
    });
  }
}

function makeTarHeader(name, size) {
  const buf = Buffer.alloc(512);
  const w   = (val, off, len) => buf.write(String(val).slice(0, len), off, len, 'ascii');

  w(name,                                           0, 100);
  w('0000755',                                    100,   8);
  w('0001750',                                    108,   8);
  w('0001750',                                    116,   8);
  w(size.toString(8).padStart(11, '0') + ' ',     124,  12);
  w((Math.floor(Date.now() / 1000)).toString(8).padStart(11, '0') + ' ', 136, 12);
  w('        ',                                   148,   8); // checksum placeholder
  buf[156] = 0x30;                                           // type: regular file
  w('ustar',                                      257,   6);

  // Compute checksum
  let sum = 0;
  for (let i = 0; i < 512; i++) sum += buf[i];
  w(sum.toString(8).padStart(6, '0') + '\0 ',     148,   8);

  return buf;
}
