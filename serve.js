/**
 * Production server for remote-app (Analytics MFE).
 *
 * Serves only the pre-built dist/ folder — no source code, no Vite.
 * The shell proxies /remote/* here, so CORS is set permissively.
 */

import express from 'express';
import path    from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app  = express();
const PORT = process.env.PORT || 5001;

// ── CORS — allow shell to load remoteEntry.js across origins ────────────────
app.use((_req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  next();
});

// ── Serve built assets from dist/ ───────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'dist')));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Remote-app serving dist/ on http://localhost:${PORT}`);
});
