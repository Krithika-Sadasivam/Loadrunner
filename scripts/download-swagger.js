#!/usr/bin/env node
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

function fetchAndSave(url, outPath) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(url, (res) => {
      // follow redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const redirectUrl = res.headers.location.startsWith('http') ? res.headers.location : new URL(res.headers.location, url).toString();
        res.resume();
        return resolve(fetchAndSave(redirectUrl, outPath));
      }

      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`Request failed. Status Code: ${res.statusCode}`));
      }

      try {
        fs.mkdirSync(path.dirname(outPath), { recursive: true });
      } catch (err) {
        return reject(err);
      }

      const file = fs.createWriteStream(outPath);
      res.pipe(file);
      file.on('finish', () => file.close(() => resolve(outPath)));
      file.on('error', (err) => {
        fs.unlink(outPath, () => reject(err));
      });
    });

    req.on('error', (err) => reject(err));
  });
}

async function main() {
  const defaultUrl = 'https://petstore.swagger.io/v2/swagger.json';
  const argvUrl = process.argv[2];
  const argvOut = process.argv[3];
  const url = argvUrl || defaultUrl;
  const outPath = path.resolve(process.cwd(), argvOut || 'test/petstore.swagger.json');

  try {
    const saved = await fetchAndSave(url, outPath);
    console.log(`Saved: ${saved}`);
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message || err);
    process.exit(2);
  }
}

if (require.main === module) main();
