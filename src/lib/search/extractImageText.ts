/**
 * Server-only OCR helper using Tesseract.js (no paid AI API keys).
 * The worker path is absolute so Next does not rewrite __dirname to F:\ROOT.
 * English trained data is downloaded once into the OS temp directory. The
 * worker's own CDN fetch returns "fetch failed" in this Node setup.
 */
import fs from 'fs';
import https from 'https';
import os from 'os';
import path from 'path';
import tls from 'tls';

const LANG_DIR = path.join(os.tmpdir(), 'adwiise-tesseract');
const LANG_FILE = path.join(LANG_DIR, 'eng.traineddata.gz');
const LANG_URL =
  'https://cdn.jsdelivr.net/npm/@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz';

async function ensureEnglishTrainedData(): Promise<string> {
  await fs.promises.mkdir(LANG_DIR, { recursive: true });
  try {
    const stat = await fs.promises.stat(LANG_FILE);
    if (stat.size > 100_000) return LANG_DIR;
  } catch {
    // Download below.
  }
  const data = await downloadLanguageData(LANG_URL);
  await fs.promises.writeFile(LANG_FILE, data);
  return LANG_DIR;
}

function downloadLanguageData(url: string): Promise<Buffer> {
  const systemCas = typeof tls.getCACertificates === 'function' ? tls.getCACertificates('system') : undefined;
  return new Promise((resolve, reject) => {
    const request = https.get(url, { ca: systemCas }, (response) => {
      const status = response.statusCode || 0;
      if (status >= 300 && status < 400 && response.headers.location) {
        response.resume();
        downloadLanguageData(response.headers.location).then(resolve, reject);
        return;
      }
      if (status < 200 || status >= 300) {
        response.resume();
        reject(new Error(`Failed to download OCR language data: HTTP ${status}`));
        return;
      }
      const chunks: Buffer[] = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => resolve(Buffer.concat(chunks)));
      response.on('error', reject);
    });
    request.on('error', reject);
  });
}

export async function extractTextFromImageBytes(
  bytes: Buffer | Uint8Array,
  label = 'image',
): Promise<string> {
  const { createWorker } = await import('tesseract.js');
  const langPath = await ensureEnglishTrainedData();
  const workerPath = path.join(
    process.cwd(),
    'node_modules',
    'tesseract.js',
    'src',
    'worker-script',
    'node',
    'index.js',
  );
  const worker = await createWorker('eng', 1, {
    workerPath,
    langPath,
    cachePath: langPath,
    gzip: true,
    errorHandler: (error) => {
      console.error(`[OCR] Worker error while reading ${label}:`, error);
    },
  });
  try {
    const { data } = await worker.recognize(bytes);
    const text = (data?.text || '').replace(/\s+/g, ' ').trim();
    console.log(`[OCR] Extracted ${text.length} chars from ${label}`);
    return text;
  } finally {
    await worker.terminate();
  }
}

export async function extractTextFromFile(file: File, label?: string): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const bytes = Buffer.from(arrayBuffer);
  return extractTextFromImageBytes(bytes, label || file.name || 'upload');
}
