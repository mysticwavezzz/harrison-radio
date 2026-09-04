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
  let voiceDropUrl = null;
  const titleLower = (currentTrack.title || '').toLowerCase();
  const artistLower = (currentTrack.artist || '').toLowerCase();

  // 1. Song & Artist Specific Voice Drops
  if (titleLower.includes('kilby') && audioDrops.kilby_girl) {
    voiceDropUrl = audioDrops.kilby_girl;
  } else if ((artistLower.includes('wallows') || titleLower.includes('are you bored yet')) && audioDrops.wallows_featuring_clairo) {
    voiceDropUrl = audioDrops.wallows_featuring_clairo;
  } else if ((artistLower.includes('killers') || titleLower.includes('brightside')) && audioDrops.everybody_singing_the_killers) {
    voiceDropUrl = audioDrops.everybody_singing_the_killers;
  } else if ((artistLower.includes('royel otis') || titleLower.includes('oysters')) && audioDrops.direct_from_sydney_royel_otis) {
    voiceDropUrl = audioDrops.direct_from_sydney_royel_otis;
  } else if ((artistLower.includes('djo') || titleLower.includes('end of beginning')) && audioDrops.chicago_vibes_djo) {
    voiceDropUrl = audioDrops.chicago_vibes_djo;
  } else if (artistLower.includes('malcolm todd') && audioDrops.malcolm_todd_dont_sleep) {
    voiceDropUrl = audioDrops.malcolm_todd_dont_sleep;
  } else if ((trackIndexInCycle + cycleIndex * tracks.length) % 3 === 0) {
    // 2. Rotating Station IDs & Time-of-Day Drops (Triggered smoothly every 3 tracks)
    const currentHour = new Date(now).getHours();
    const isLateNight = currentHour >= 23 || currentHour < 5;
    const isDaytime = currentHour >= 11 && currentHour < 18;

    if (isLateNight && (trackIndexInCycle % 2 === 0) && audioDrops.cant_sleep_late_night) {
      voiceDropUrl = (trackIndexInCycle % 4 === 0 && audioDrops.its_2am_somewhere)
        ? audioDrops.its_2am_somewhere
        : audioDrops.cant_sleep_late_night;
    } else if (isDaytime && (trackIndexInCycle % 2 === 0) && audioDrops.windows_down_volume_up) {
      voiceDropUrl = audioDrops.windows_down_volume_up;
    } else {
      // Rotating universal station liners
      const genericPool = [
        audioDrops.youre_locked_into_harrison_radio,
        audioDrops.the_only_frequency_you_need,
        audioDrops.turn_the_lights_down,
        audioDrops.turn_this_one_up,
      ].filter(Boolean);

      if (genericPool.length > 0) {
        const dropIndex = (trackIndexInCycle + cycleIndex) % genericPool.length;
        voiceDropUrl = genericPool[dropIndex];
      }
    }
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

  // Check if upcoming event is stored in localStorage for static deployment
  let upcomingEvent = null;
  try {
    const saved = localStorage.getItem('harrison_radio_upcoming_event');
    if (saved) upcomingEvent = JSON.parse(saved);
  } catch (e) {}

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
    schedule: {
      currentShow: {
        name: 'Harrison Auto DJ',
        tag: 'Auto DJ',
        start: '00:00',
        end: '23:59',
      },
      upcomingEvent: upcomingEvent || null,
    },
    serverTime: now,
    listeners: Math.floor(Math.abs(Math.sin(now / 300000)) * 7) + 3 // Natural dynamic listener count (3-10)
  };
}
