import fs from 'fs/promises';
import path from 'path';
import axios from 'axios';

export async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

export async function writeJSON(filepath, data) {
  await ensureDir(path.dirname(filepath));
  await fs.writeFile(filepath, JSON.stringify(data, null, 2), 'utf-8');
}

export async function writeText(filepath, content) {
  await ensureDir(path.dirname(filepath));
  await fs.writeFile(filepath, content, 'utf-8');
}

export function urlToFilename(url) {
  try {
    const u = new URL(url);
    const base = u.pathname === '/' ? 'index' : u.pathname;
    return base
      .replace(/^\//, '')
      .replace(/\/$/,  '')
      .replace(/\//g, '--')
      .replace(/[^a-zA-Z0-9._-]/g, '-')
      .replace(/-+/g, '-') || 'file';
  } catch {
    return 'file';
  }
}

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export async function downloadFile(url, destPath, ua = USER_AGENT) {
  await ensureDir(path.dirname(destPath));
  const response = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 20000,
    headers: { 'User-Agent': ua },
    maxRedirects: 5,
  });
  await fs.writeFile(destPath, response.data);
}
