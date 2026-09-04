import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { BroadcastEngine } from './broadcastEngine.js';
import { stationConfig } from './stationConfig.js';

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CLIENT_DIST = path.join(__dirname, '../../client/dist');

app.use(cors());
app.use(express.json());

if (fs.existsSync(CLIENT_DIST)) {
  app.use(express.static(CLIENT_DIST));
}

// Serve user-recorded voice drops and universal station sweepers
app.use('/api/audio/drops', express.static(path.join(__dirname, '../audio/drops')));
app.use('/api/audio/sweepers', express.static(path.join(__dirname, '../audio/sweepers')));

const broadcastEngine = new BroadcastEngine(io);

// Endpoints
app.get('/api/station', (req, res) => {
  res.json(broadcastEngine.getState());
});

app.post('/api/station/skip', async (req, res) => {
  try {
    await broadcastEngine.startNextSong();
    res.json({ success: true, currentTrack: broadcastEngine.currentTrack });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/playlist/load', async (req, res) => {
  try {
    const { playlistUrl } = req.body;
    if (!playlistUrl) {
      return res.status(400).json({ error: 'playlistUrl is required' });
    }
    const result = await broadcastEngine.loadNewPlaylist(playlistUrl);
    res.json({ success: true, playlist: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Socket.io for live sync
io.on('connection', (socket) => {
  broadcastEngine.addClient();

  // Send immediate state to newly tuned-in listener
  socket.emit('station-state', broadcastEngine.getState());

  socket.on('disconnect', () => {
    broadcastEngine.removeClient();
  });
});

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) return next();
  if (fs.existsSync(path.join(CLIENT_DIST, 'index.html'))) {
    res.sendFile(path.join(CLIENT_DIST, 'index.html'));
  } else {
    next();
  }
});

const PORT = process.env.PORT || 4000;

server.listen(PORT, async () => {
  console.log(`=============================================`);
  console.log(`  📻 ${stationConfig.stationName} is starting...`);
  console.log(`  🌐 Server running on http://localhost:${PORT}`);
  console.log(`=============================================`);

  // Initialize broadcast with default playlist
  await broadcastEngine.initialize();
});
