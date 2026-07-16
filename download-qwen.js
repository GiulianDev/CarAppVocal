// download-qwen.js
import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'https://modelscope.cn/api/v1/models/onnx-community/Qwen2.5-0.5B-Instruct/repo?Revision=master&FilePath=';

const FILES = [
  'config.json',
  'generation_config.json',
  'tokenizer.json',
  'tokenizer_config.json',
  'vocab.json',
  'merges.txt',
  'onnx/model_quantized.onnx' 
];

const targetFolder = path.join(__dirname, 'public', 'models', 'qwen2.5-0.5b');

function ensureDirectoryExistence(filePath) {
  const dirname = path.dirname(filePath);
  if (fs.existsSync(dirname)) return true;
  ensureDirectoryExistence(dirname);
  fs.mkdirSync(dirname);
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    ensureDirectoryExistence(dest);
    const file = fs.createWriteStream(dest);
    
    // Configuriamo le intestazioni per simulare un browser reale ed evitare il 403 della CDN
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://modelscope.cn/'
      }
    };

    https.get(url, options, (response) => {
      // Gestione dei redirect
      if ([301, 302, 307, 308].includes(response.statusCode)) {
        file.close();
        fs.unlink(dest, () => {
          downloadFile(response.headers.location, dest).then(resolve).catch(reject);
        });
        return;
      }

      if (response.statusCode !== 200) {
        reject(new Error(`Codice di risposta ${response.statusCode} per ${url}`));
        return;
      }

      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function start() {
  console.log("📥 Ripristino download di Qwen 2.5 0.5B...");
  
  for (const file of FILES) {
    const destPath = path.join(targetFolder, file);
    
    // Controllo se il file esiste già ed è valido (> 0 byte), nel caso lo saltiamo
    if (fs.existsSync(destPath) && fs.statSync(destPath).size > 0) {
      console.log(`⏭️ Già presente (saltato): ${file}`);
      continue;
    }

    const fileUrl = `${BASE_URL}${file}`;
    console.log(`⏳ Scaricando: ${file}... (il file ONNX richiederà un attimo)`);
    try {
      await downloadFile(fileUrl, destPath);
      console.log(`✅ Completato: ${file}\n`);
    } catch (err) {
      console.error(`❌ Errore durante il download di ${file}:`, err.message);
      process.exit(1);
    }
  }

  console.log("🎉 Spettacolo! Tutti i file sono pronti offline.");
}

start();