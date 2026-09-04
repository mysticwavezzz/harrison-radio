import stationData from './stationData.json';

// Epoch seed anchor for universal synchronized broadcast: Jan 1, 2026 00:00:00 UTC
const SYNC_EPOCH = 1767225600000;

// Deterministic pseudo-random number generator (Mulberry32)
function mulberry32(seed) {
  return function() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Deterministic Fisher-Yates shuffle with artist separation
function generateCycle(tracks, cycleIndex) {
  const rng = mulberry32(cycleIndex * 10007 + 42);
  const arr = [...tracks];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }

  // Smooth artist separation
  const separated = [];
  const pool = [...arr];
  let lastArtist = '';

  while (pool.length > 0) {
    let idx = pool.findIndex(t => !lastArtist || (t.primaryArtist || '').toLowerCase() !== lastArtist);
    if (idx === -1) idx = 0;
    const [selected] = pool.splice(idx, 1);
    separated.push(selected);
    lastArtist = (selected.primaryArtist || '').toLowerCase();
  }

  return separated;
}

/**
 * Calculates current global broadcast state based on universal synchronized time (Date.now())
 */
export function getSynchronizedStationState() {
  const { tracks, station, playlist, audioDrops } = stationData;
  if (!tracks || tracks.length === 0) return null;

  const now = Date.now();
  const timeSinceEpochSec = Math.max(0, Math.floor((now - SYNC_EPOCH) / 1000));

  // Compute average cycle duration to estimate current cycle
  const cycleDurationSec = tracks.reduce((acc, t) => acc + (t.duration || 180), 0);
  let cycleIndex = Math.floor(timeSinceEpochSec / cycleDurationSec);

  // Calculate timelines across cycles
  let timelineSec = 0;
  for (let c = 0; c < cycleIndex; c++) {
    const cTracks = generateCycle(tracks, c);
    timelineSec += cTracks.reduce((acc, t) => acc + (t.duration || 180), 0);
  }

  let currentCycle = generateCycle(tracks, cycleIndex);
  while (timelineSec + currentCycle.reduce((acc, t) => acc + (t.duration || 180), 0) <= timeSinceEpochSec) {
    timelineSec += currentCycle.reduce((acc, t) => acc + (t.duration || 180), 0);
    cycleIndex++;
    currentCycle = generateCycle(tracks, cycleIndex);
  }

  // Find exact current track within current cycle
  let trackSec = timelineSec;
  let currentTrack = null;
  let trackIndexInCycle = 0;

  for (let i = 0; i < currentCycle.length; i++) {
    const t = currentCycle[i];
    const dur = t.duration || 180;
    if (timeSinceEpochSec >= trackSec && timeSinceEpochSec < trackSec + dur) {
      currentTrack = t;
      trackIndexInCycle = i;
      break;
    }
    trackSec += dur;
  }

  if (!currentTrack) {
    currentTrack = currentCycle[0];
    trackIndexInCycle = 0;
    trackSec = timelineSec;
  }

  const elapsedSeconds = timeSinceEpochSec - trackSec;
  const startedAt = (trackSec * 1000) + SYNC_EPOCH;
  const remainingSeconds = Math.max(0, (currentTrack.duration || 180) - elapsedSeconds);

  // Determine Voice Drop / Sweeper
  // 1. Song specific (e.g. Kilby Girl)
  let voiceDropUrl = null;
  if (currentTrack.title.toLowerCase().includes('kilby')) {
    voiceDropUrl = audioDrops.kilby_girl;
  } else if ((trackIndexInCycle + cycleIndex * tracks.length) % 3 === 0) {
    // Universal sweeper every 3 songs
    voiceDropUrl = audioDrops.turn_this_one_up;
  }

  // Build Up Next queue (next 5 tracks across current & next cycle)
  const upNext = [];
  const nextCycle = generateCycle(tracks, cycleIndex + 1);
  const combinedFuture = [...currentCycle.slice(trackIndexInCycle + 1), ...nextCycle];
  for (let i = 0; i < Math.min(5, combinedFuture.length); i++) {
    upNext.push(combinedFuture[i]);
  }

  // Build recent history (past 4 tracks)
  const history = [];
  const prevCycle = cycleIndex > 0 ? generateCycle(tracks, cycleIndex - 1) : [];
  const combinedPast = [...prevCycle, ...currentCycle.slice(0, trackIndexInCycle)];
  for (let i = combinedPast.length - 1; i >= Math.max(0, combinedPast.length - 4); i--) {
    if (combinedPast[i]) history.push(combinedPast[i]);
  }

  return {
    station,
    playlist,
    currentTrack: {
      ...currentTrack,
      elapsedSeconds,
      startedAt,
      remainingSeconds,
      voiceDropUrl
    },
    upNext,
    history,
    serverTime: now,
    listeners: Math.floor(Math.abs(Math.sin(now / 300000)) * 7) + 3 // Natural dynamic listener count (3-10)
  };
}
