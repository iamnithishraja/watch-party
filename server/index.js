import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import express from 'express';
import { Server } from 'socket.io';
import roomRoutes from './routes/roomRoutes.js';
import { registerSocketHandlers } from './socket/index.js';

const PORT = process.env.PORT || 4000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.resolve(__dirname, '..', 'dist');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: CLIENT_ORIGIN,
    methods: ['GET', 'POST'],
  },
});

app.set('io', io);
app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/rooms', roomRoutes);

app.use(express.static(distPath));

app.use((_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

registerSocketHandlers(io);

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Watch Party server listening on port ${PORT}`);
});
