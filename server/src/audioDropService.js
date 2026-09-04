import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DROPS_DIR = path.join(__dirname, '../audio/drops');
const SWEEPERS_DIR = path.join(__dirname, '../audio/sweepers');

export class AudioDropService {
  constructor() {
    this.songCounter = 0;
    this.sweeperInterval = 3; // Play a universal sweeper every 3 songs if no specific drop
    this.recentSweeperHistory = [];

    this.ensureDirs();
  }

  ensureDirs() {
    if (!fs.existsSync(DROPS_DIR)) fs.mkdirSync(DROPS_DIR, { recursive: true });
    if (!fs.existsSync(SWEEPERS_DIR)) fs.mkdirSync(SWEEPERS_DIR, { recursive: true });
  }

  getDropsList() {
    if (!fs.existsSync(DROPS_DIR)) return [];
    return fs.readdirSync(DROPS_DIR).filter((f) => f.toLowerCase().endsWith('.mp3') || f.toLowerCase().endsWith('.wav'));
  }

  getSweepersList() {
    if (!fs.existsSync(SWEEPERS_DIR)) return [];
    return fs.readdirSync(SWEEPERS_DIR).filter((f) => f.toLowerCase().endsWith('.mp3') || f.toLowerCase().endsWith('.wav'));
  }

  // Normalize string for fuzzy matching (strip extension and non-alphanumerics)
  normalize(str) {
    if (!str) return '';
    return str.toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  /**
   * Find a song-specific intro drop for a given track
   */
  findSongSpecificDrop(track) {
    if (!track || !track.title) return null;
    const drops = this.getDropsList();
    if (drops.length === 0) return null;

    const trackIdNorm = this.normalize(track.id);
    const titleNorm = this.normalize(track.title);

    // 1. Exact ID match (must be a real Spotify ID >= 10 chars)
    if (trackIdNorm && trackIdNorm.length >= 10) {
      const idMatch = drops.find((f) => {
        const base = this.normalize(path.parse(f).name);
        return base.includes(trackIdNorm);
      });
      if (idMatch) return `/api/audio/drops/${encodeURIComponent(idMatch)}`;
    }

    // 2. Exact Title slug match
    const titleMatch = drops.find((f) => {
      const base = this.normalize(path.parse(f).name);
      return base.length >= 4 && (base === titleNorm || titleNorm.includes(base) || base.includes(titleNorm));
    });
    if (titleMatch) return `/api/audio/drops/${encodeURIComponent(titleMatch)}`;

    // 3. Significant title keywords (>= 4 chars, excluding common stop words)
    const stopWords = new Set(['feat', 'remaster', 'remastered', 'with', 'from', 'this', 'that', 'song', 'track', 'radio', 'harrison']);
    const titleWords = track.title
      .toLowerCase()
      .split(/[\s\-_(),.]+/)
      .filter((w) => w.length >= 4 && !stopWords.has(w));

    for (const word of titleWords) {
      const wordMatch = drops.find((f) => {
        const base = path.parse(f).name.toLowerCase();
        return base.includes(word);
      });
      if (wordMatch) {
        return `/api/audio/drops/${encodeURIComponent(wordMatch)}`;
      }
    }

    return null;
  }

  /**
   * Get an audio drop for a track (either song-specific intro, or scheduled universal sweeper)
   */
  getDropForTrack(track) {
    this.songCounter++;

    // 1. Check for a song-specific drop first!
    const specificDrop = this.findSongSpecificDrop(track);
    if (specificDrop) {
      console.log(`[AudioDropService] Found song-specific drop for "${track.title}": ${specificDrop}`);
      return specificDrop;
    }

    // 2. If no song-specific drop, check if it's time for a universal sweeper
    const sweepers = this.getSweepersList();
    if (sweepers.length > 0 && this.songCounter % this.sweeperInterval === 0) {
      // Pick a sweeper not recently used
      const available = sweepers.filter((s) => !this.recentSweeperHistory.includes(s));
      const pool = available.length > 0 ? available : sweepers;
      const selected = pool[Math.floor(Math.random() * pool.length)];

      this.recentSweeperHistory.push(selected);
      if (this.recentSweeperHistory.length > Math.max(1, sweepers.length - 1)) {
        this.recentSweeperHistory.shift();
      }

      console.log(`[AudioDropService] Scheduled universal sweeper for "${track.title}": ${selected}`);
      return `/api/audio/sweepers/${encodeURIComponent(selected)}`;
    }

    return null;
  }
}
