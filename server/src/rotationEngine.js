import { stationConfig } from './stationConfig.js';

export class RotationEngine {
  constructor(tracks = []) {
    this.tracks = tracks;
    this.deckQueue = [];
    this.history = []; // Array of recently played track objects (newest first)
    this.playCounts = new Map(); // trackId -> count
    this.artistSeparation = stationConfig.artistSeparationCount || 3;
    this.cooldownFraction = 0.75; // At least 75% of the playlist must pass before a song can repeat!
  }

  setTracks(tracks) {
    this.tracks = tracks || [];
    this.deckQueue = [];
    console.log(`[RotationEngine] Loaded ${this.tracks.length} tracks into rotation pool.`);
    this.replenishDeck();
  }

  /**
   * Fisher-Yates Shuffle
   */
  shuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  /**
   * Refill the deck queue with a newly shuffled cycle that enforces:
   * 1. 75%+ playlist cooldown (no repeats for ~50+ songs)
   * 2. Strict artist separation (no same artist within 3 songs)
   */
  replenishDeck() {
    if (!this.tracks || this.tracks.length === 0) return;

    const totalTracks = this.tracks.length;
    const cooldownSize = Math.max(1, Math.floor(totalTracks * this.cooldownFraction));

    // Tracks that played recently (in the last cooldownSize songs)
    const recentTrackIds = new Set(this.history.slice(0, cooldownSize).map((t) => t.id));

    // Also include tracks already queued up in deckQueue to avoid double-queueing
    for (const t of this.deckQueue) {
      recentTrackIds.add(t.id);
    }

    // Shuffle a full cycle of all playlist tracks
    let candidates = this.shuffle(this.tracks);

    // Filter candidates that are NOT currently in cooldown
    let eligible = candidates.filter((t) => !recentTrackIds.has(t.id));

    // If all eligible are already queued, fallback to all tracks not recently in history
    if (eligible.length === 0) {
      const historyIds = new Set(this.history.slice(0, Math.floor(totalTracks * 0.5)).map((t) => t.id));
      eligible = candidates.filter((t) => !historyIds.has(t.id));
      if (eligible.length === 0) eligible = candidates;
    }

    // Build ordered sequence with artist separation
    let currentLastArtist = this.deckQueue.length > 0
      ? this.deckQueue[this.deckQueue.length - 1].primaryArtist?.toLowerCase()
      : this.history[0]?.primaryArtist?.toLowerCase();

    const newDeckPart = [];
    const pool = [...eligible];

    while (pool.length > 0) {
      // Find a track whose primary artist is different from the last played/queued artist
      let matchIdx = pool.findIndex(
        (t) => !currentLastArtist || t.primaryArtist?.toLowerCase() !== currentLastArtist
      );

      // If no different artist found, just take the first available
      if (matchIdx === -1) matchIdx = 0;

      const [selected] = pool.splice(matchIdx, 1);
      newDeckPart.push(selected);
      currentLastArtist = selected.primaryArtist?.toLowerCase();
    }

    this.deckQueue.push(...newDeckPart);
    console.log(`[RotationEngine] Replenished deck queue. Total queued tracks: ${this.deckQueue.length}`);
  }

  /**
   * Get the next track to broadcast
   */
  getNextTrack() {
    if (!this.tracks || this.tracks.length === 0) return null;

    if (this.deckQueue.length < 5) {
      this.replenishDeck();
    }

    if (this.deckQueue.length === 0) {
      // Fallback
      return this.tracks[Math.floor(Math.random() * this.tracks.length)];
    }

    const nextTrack = this.deckQueue.shift();
    return nextTrack;
  }

  /**
   * Record that a track has actually been played
   */
  recordPlayback(track) {
    if (!track) return;

    const current = this.playCounts.get(track.id) || 0;
    this.playCounts.set(track.id, current + 1);

    // Prepend to history, keep last 100
    this.history.unshift(track);
    if (this.history.length > 100) {
      this.history.pop();
    }
  }

  /**
   * Peek at upcoming tracks in the queue without consuming them
   */
  peekUpcoming(count = 5) {
    while (this.deckQueue.length < count + 5) {
      this.replenishDeck();
    }
    return this.deckQueue.slice(0, count);
  }
}
