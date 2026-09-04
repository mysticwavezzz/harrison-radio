import { SpotifyIngestor } from './spotifyIngestor.js';
import { RotationEngine } from './rotationEngine.js';
import { AudioResolver } from './audioResolver.js';
import { AudioDropService } from './audioDropService.js';
import { stationConfig } from './stationConfig.js';

export class BroadcastEngine {
  constructor(io) {
    this.io = io;
    this.ingestor = new SpotifyIngestor();
    this.rotation = new RotationEngine();
    this.resolver = new AudioResolver();
    this.audioDrops = new AudioDropService();

    this.currentPlaylist = null;
    this.currentTrack = null;
    this.currentAudio = null;
    this.currentVoiceDropUrl = null;
    this.startedAt = 0; // ms
    this.timer = null;
    this.connectedListeners = 0;
    this.preloadedNextAudio = null;
    this.upNextTrack = null;

    // Admin controls
    this.isPaused = false;
    this.pausedAtElapsed = 0;
    this.serverVolume = 1.0; // 0.0 to 1.0
    this.upcomingEvent = null; // { title: string, time: string, description?: string }
    this.activeVoiceBroadcast = null; // { active: boolean, startedAt: number }
  }

  async initialize(playlistUrl = stationConfig.defaultPlaylistUrl) {
    console.log(`[BroadcastEngine] Initializing station with playlist: ${playlistUrl}`);
    try {
      this.currentPlaylist = await this.ingestor.fetchPlaylist(playlistUrl);
      this.rotation.setTracks(this.currentPlaylist.tracks);

      // Start the live broadcast
      await this.startNextSong();

      // Station heartbeat ticker (checks every 1 second)
      if (this.timer) clearInterval(this.timer);
      this.timer = setInterval(() => this.tick(), 1000);

      console.log(`[BroadcastEngine] Station is ON AIR! Broadcasting track: "${this.currentTrack?.title}"`);
    } catch (err) {
      console.error('[BroadcastEngine] Initialization error:', err.message);
    }
  }

  async loadNewPlaylist(playlistUrl) {
    console.log(`[BroadcastEngine] Loading new playlist: ${playlistUrl}`);
    const playlist = await this.ingestor.fetchPlaylist(playlistUrl);
    this.currentPlaylist = playlist;
    this.rotation.setTracks(playlist.tracks);
    // Smoothly cue next song from new playlist
    await this.prepareUpcoming();
    this.broadcastState();
    return playlist;
  }

  async startNextSong() {
    const nextTrack = this.rotation.getNextTrack();
    if (!nextTrack) {
      console.warn('[BroadcastEngine] No tracks available in rotation.');
      return;
    }

    // Resolve audio stream (use pre-resolved if matching, otherwise resolve)
    let audio = null;
    if (this.upNextTrack && this.upNextTrack.id === nextTrack.id && this.preloadedNextAudio) {
      audio = this.preloadedNextAudio;
    } else {
      audio = await this.resolver.resolveTrack(nextTrack);
    }

    this.currentTrack = nextTrack;
    this.currentAudio = audio;
    this.currentVoiceDropUrl = this.audioDrops.getDropForTrack(nextTrack);
    this.startedAt = Date.now();
    this.pausedAtElapsed = 0;
    this.rotation.recordPlayback(nextTrack);

    // Clear preloaded
    this.preloadedNextAudio = null;
    this.upNextTrack = null;

    console.log(`[BroadcastEngine] Now playing: "${nextTrack.title}" by ${nextTrack.artist} (Duration: ${nextTrack.duration}s, Voice Drop: ${this.currentVoiceDropUrl || 'None'})`);

    // Broadcast track change to all connected clients
    this.broadcastTrackChange();

    // Prepare upcoming track in background
    setTimeout(() => {
      this.prepareUpcoming().catch((e) => console.error('Failed to prepare upcoming:', e.message));
    }, 2000);
  }

  async prepareUpcoming() {
    const upcoming = this.rotation.peekUpcoming(1);
    this.upNextTrack = upcoming && upcoming.length > 0 ? upcoming[0] : null;
    if (this.upNextTrack) {
      this.preloadedNextAudio = await this.resolver.resolveTrack(this.upNextTrack);
      console.log(`[BroadcastEngine] Up next cued: "${this.upNextTrack.title}" by ${this.upNextTrack.artist}`);
    }
  }

  tick() {
    if (!this.currentTrack || this.isPaused) return;

    const durationMs = (this.currentTrack.duration || 180) * 1000;
    const elapsedMs = Date.now() - this.startedAt;

    // Check if song has finished
    if (elapsedMs >= durationMs) {
      this.startNextSong().catch((err) => console.error('[BroadcastEngine] Error changing song:', err));
    }
  }

  getElapsedSeconds() {
    if (!this.startedAt) return 0;
    if (this.isPaused) return this.pausedAtElapsed;
    return Math.floor((Date.now() - this.startedAt) / 1000);
  }

  // --- Admin Methods ---

  setPause(paused) {
    if (this.isPaused === paused) return;
    this.isPaused = paused;
    if (paused) {
      this.pausedAtElapsed = Math.floor((Date.now() - this.startedAt) / 1000);
    } else {
      // Resume from paused offset
      this.startedAt = Date.now() - (this.pausedAtElapsed * 1000);
    }
    this.broadcastState();
  }

  setVolume(vol) {
    this.serverVolume = Math.min(1.0, Math.max(0.0, vol));
    if (this.io) {
      this.io.emit('volume-change', { volume: this.serverVolume });
    }
    this.broadcastState();
  }

  setUpcomingEvent(eventData) {
    // eventData: { title, time, description } or null
    if (eventData && eventData.title) {
      this.upcomingEvent = {
        title: eventData.title,
        time: eventData.time || 'Soon',
        description: eventData.description || ''
      };
    } else {
      this.upcomingEvent = null;
    }
    this.broadcastState();
  }

  getState() {
    const elapsed = this.getElapsedSeconds();
    const duration = this.currentTrack?.duration || 180;
    const remaining = Math.max(0, duration - elapsed);

    return {
      station: {
        name: stationConfig.stationName,
        callsign: stationConfig.callsign,
        tagline: stationConfig.tagline,
        genre: stationConfig.genre,
        accentColor: stationConfig.accentColor,
        secondaryColor: stationConfig.secondaryColor,
        bgColor: stationConfig.bgColor,
        panelBg: stationConfig.panelBg,
        borderColor: stationConfig.borderColor,
      },
      currentTrack: this.currentTrack
        ? {
            ...this.currentTrack,
            audio: this.currentAudio,
            voiceDropUrl: this.currentVoiceDropUrl,
            startedAt: this.startedAt,
            elapsedSeconds: elapsed,
            duration,
            remainingSeconds: remaining,
          }
        : null,
      serverTime: Date.now(),
      listeners: Math.max(1, this.connectedListeners),
      history: this.rotation.history.slice(1, 11), // 10 most recent played before current
      upNext: this.rotation.peekUpcoming(5),
      playlist: this.currentPlaylist
        ? {
            id: this.currentPlaylist.id,
            name: this.currentPlaylist.name,
            totalTracks: this.currentPlaylist.totalTracks,
            coverArt: this.currentPlaylist.coverArt,
          }
        : null,
      admin: {
        isPaused: this.isPaused,
        serverVolume: this.serverVolume,
        upcomingEvent: this.upcomingEvent,
        activeVoiceBroadcast: this.activeVoiceBroadcast
      },
      schedule: {
        currentShow: {
          name: 'Harrison Auto DJ',
          tag: 'Live Broadcast',
          start: '00:00',
          end: '23:59',
        },
        upcomingEvent: this.upcomingEvent || null,
        metrics: {
          tracksInRotation: this.currentPlaylist?.totalTracks || 0,
          broadcastType: 'Weighted Popularity Shuffle',
          audioStreamQuality: 'High Fidelity Web Stream',
        },
      },
    };
  }

  broadcastTrackChange() {
    if (this.io) {
      this.io.emit('track-change', this.getState());
    }
  }

  broadcastState() {
    if (this.io) {
      this.io.emit('station-state', this.getState());
    }
  }

  addClient() {
    this.connectedListeners++;
    if (this.io) {
      this.io.emit('listeners-update', { listeners: this.connectedListeners });
    }
  }

  removeClient() {
    this.connectedListeners = Math.max(0, this.connectedListeners - 1);
    if (this.io) {
      this.io.emit('listeners-update', { listeners: Math.max(1, this.connectedListeners) });
    }
  }
}
