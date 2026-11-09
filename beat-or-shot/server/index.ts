import express from 'express';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';
import { Server } from 'socket.io';
import { createApp } from './app';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.env.PORT ?? 3000);

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: true }, pingInterval: 10_000, pingTimeout: 8_000 });

const game = createApp({
  io,
  dataDir: process.env.DATA_DIR ?? path.join(ROOT, 'data'),
  cardSecret: process.env.CARD_SECRET ?? 'beat-or-shot-dev-secret',
  adminKey: process.env.ADMIN_KEY ?? 'admin',
  // Render define RENDER_EXTERNAL_URL automáticamente (https://tu-app.onrender.com).
  publicUrl: process.env.PUBLIC_URL ?? process.env.RENDER_EXTERNAL_URL ?? null
});

if (!process.env.CARD_SECRET) console.warn('[beat-or-shot] CARD_SECRET no definido: se usa el secreto de desarrollo.');
if (!process.env.ADMIN_KEY) console.warn('[beat-or-shot] ADMIN_KEY no definido: la clave admin es "admin".');

app.use(express.json({ limit: '200kb' }));
app.use('/api', game.router);

// Archivos de audio con licencia almacenados localmente (data/audio).
game.setFileStreamer(async (url, res) => {
  if (url.startsWith('local:')) {
    const file = path.join(game.dataDir, 'audio', path.basename(url.slice(6)));
    if (!fs.existsSync(file)) return res.status(404).end();
    return res.sendFile(file);
  }
  const upstream = await fetch(url);
  if (!upstream.ok || !upstream.body) return res.status(502).end();
  res.setHeader('Content-Type', upstream.headers.get('content-type') ?? 'audio/mpeg');
  res.setHeader('Cache-Control', 'no-store');
  Readable.fromWeb(upstream.body as never).pipe(res);
});

const dist = path.join(ROOT, 'dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist, { index: false, maxAge: '1h' }));
  app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
} else {
  app.get('/', (_req, res) => res.send('BEAT OR SHOT API. Ejecuta "npm run dev" y abre http://localhost:5173'));
}

server.listen(PORT, () => {
  console.log(`🎛️  BEAT OR SHOT escuchando en http://localhost:${PORT}`);
});
