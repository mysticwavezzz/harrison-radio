import yts from 'yt-search';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CACHE_FILE = path.join(__dirname, '../cache/audio_cache.json');

export class AudioResolver {
  constructor() {
    this.cache = {};
    this.loadCache();
  }

  loadCache() {
    try {
      if (fs.existsSync(CACHE_FILE)) {
        this.cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
      }
    } catch (e) {
      this.cache = {};
    }
  }

  saveCache() {
    try {
      const dir = path.dirname(CACHE_FILE);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(CACHE_FILE, JSON.stringify(this.cache, null, 2));
    } catch (e) {
      console.error('Failed to save audio cache:', e.message);
    }
  }

  cleanSearchQuery(title, artist) {
    // Strip remastered, feat., radio edit parentheses for cleaner search
    const cleanTitle = title
      .replace(/\s*-\s*Remaster(ed)?\s*\d*/gi, '')
      .replace(/\s*\([^)]*remaster[^)]*\)/gi, '')
      .replace(/\s*\(feat\.[^)]*\)/gi, '')
      .trim();
    return `${artist} - ${cleanTitle}`;
  }

  async resolveTrack(track) {
    const cacheKey = `${track.artist}___${track.title}`.toLowerCase();

    if (this.cache[cacheKey]) {
      return this.cache[cacheKey];
    }

    const searchQuery = this.cleanSearchQuery(track.title, track.artist);
    console.log(`[AudioResolver] Resolving audio for: "${searchQuery}"`);

    try {
      // 1. First attempt: search with "official audio"
      let r = await yts(`${searchQuery} audio`);
      let bestMatch = null;

      if (r && r.videos && r.videos.length > 0) {
        // Find best video close to Spotify track duration
        const targetDuration = track.duration || 180;
        bestMatch = r.videos.find((v) => Math.abs(v.seconds - targetDuration) < 30) || r.videos[0];
      }

      if (!bestMatch) {
        // 2. Second attempt: search artist + title directly
        r = await yts(searchQuery);
        if (r && r.videos && r.videos.length > 0) {
          bestMatch = r.videos[0];
        }
      }

      if (bestMatch) {
        const audioInfo = {
          source: 'youtube',
          youtubeId: bestMatch.videoId,
          title: bestMatch.title,
          author: bestMatch.author?.name || track.artist,
          duration: bestMatch.seconds || track.duration,
          url: `https://www.youtube.com/watch?v=${bestMatch.videoId}`,
        };

        this.cache[cacheKey] = audioInfo;
        this.saveCache();
        return audioInfo;
      }
    } catch (err) {
      console.error(`[AudioResolver] Error resolving ${searchQuery}:`, err.message);
    }

    // Default fallback if search fails
    const fallback = {
      source: 'youtube',
      youtubeId: 'gTMWO7ovAXk', // Will Paquin - Chandelier
      title: `${track.artist} - ${track.title}`,
      author: track.artist,
      duration: track.duration || 180,
    };
    return fallback;
  }
}
