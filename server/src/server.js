import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { BroadcastEngine } from './broadcastEngine.js';
import { stationConfig } from './stationConfig.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  maxHttpBufferSize: 1e7 // 10MB for live audio chunks
});

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

// Public & Admin Endpoints
app.get('/api/station', (req, res) => {
  res.json(broadcastEngine.getState());
});

// Admin: Skip track
app.post('/api/station/skip', async (req, res) => {
  try {
    await broadcastEngine.startNextSong();
    res.json({ success: true, currentTrack: broadcastEngine.currentTrack });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: Pause / Resume broadcast
app.post('/api/admin/pause', (req, res) => {
  const { paused } = req.body;
  broadcastEngine.setPause(!!paused);
  res.json({ success: true, isPaused: broadcastEngine.isPaused });
});

// Admin: Change broadcast volume
app.post('/api/admin/volume', (req, res) => {
  const { volume } = req.body;
  if (typeof volume === 'number') {
    broadcastEngine.setVolume(volume);
  }
  res.json({ success: true, volume: broadcastEngine.serverVolume });
});

// Admin: Set or clear upcoming event
app.post('/api/admin/event', (req, res) => {
  const { event } = req.body;
  broadcastEngine.setUpcomingEvent(event);
  res.json({ success: true, upcomingEvent: broadcastEngine.upcomingEvent });
});

// Admin: Ingest playlist
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

// Socket.io for live sync and live voice mic streaming
io.on('connection', (socket) => {
  broadcastEngine.addClient();

  // Send immediate state to newly tuned-in listener
  socket.emit('station-state', broadcastEngine.getState());

  // Handle Admin Live Voice Broadcast (Mic streaming)
  socket.on('admin-voice-start', () => {
    broadcastEngine.activeVoiceBroadcast = { active: true, startedAt: Date.now() };
    socket.broadcast.emit('voice-broadcast-start');
    broadcastEngine.broadcastState();
  });

  socket.on('admin-voice-chunk', (audioChunk) => {
    // Relay raw audio chunk to all connected listeners
    socket.broadcast.emit('voice-broadcast-chunk', audioChunk);
  });

  socket.on('admin-voice-end', () => {
    broadcastEngine.activeVoiceBroadcast = null;
    socket.broadcast.emit('voice-broadcast-end');
    broadcastEngine.broadcastState();
  });

  // Admin remote control events over socket
  socket.on('admin-skip', async () => {
    await broadcastEngine.startNextSong();
  });

  socket.on('admin-set-pause', (paused) => {
    broadcastEngine.setPause(!!paused);
  });

  socket.on('admin-set-volume', (vol) => {
    broadcastEngine.setVolume(vol);
  });

  socket.on('admin-set-event', (eventData) => {
    broadcastEngine.setUpcomingEvent(eventData);
  });

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
