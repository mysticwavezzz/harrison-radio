import yts from 'yt-search';
import fs from 'fs';
import path from 'path';

const playlist = JSON.parse(fs.readFileSync('cache/playlist_expanded.json', 'utf8'));
const audioCache = JSON.parse(fs.readFileSync('cache/audio_cache.json', 'utf8'));

function cleanSearchQuery(title, artist) {
  const cleanTitle = title
    .replace(/\s*-\s*Remaster(ed)?\s*\d*/gi, '')
    .replace(/\s*\([^)]*remaster[^)]*\)/gi, '')
    .replace(/\s*\(feat\.[^)]*\)/gi, '')
    .trim();
  return `${artist} ${cleanTitle}`.replace(/[^a-zA-Z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function searchAsync(query) {
  return new Promise((resolve) => {
    yts({ query }, (err, r) => {
      if (err || !r || !r.videos || r.videos.length === 0) {
        resolve(null);
      } else {
        resolve(r.videos);
      }
    });
  });
}

function delay(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

async function run() {
  console.log('Resolving audio with gentle rate-pacing for 211 tracks...');
  let resolvedCount = 0;
  let cachedCount = 0;

  for (let i = 0; i < playlist.tracks.length; i++) {
    const track = playlist.tracks[i];
    const cacheKey = `${track.artist}___${track.title}`.toLowerCase();
    const altKey = `${track.primaryArtist}___${track.title}`.toLowerCase();

    if (audioCache[cacheKey] && audioCache[cacheKey].youtubeId !== 'gTMWO7ovAXk') {
      cachedCount++;
      track.audio = audioCache[cacheKey];
      track.duration = audioCache[cacheKey].duration || track.duration;
      continue;
    }
    if (audioCache[altKey] && audioCache[altKey].youtubeId !== 'gTMWO7ovAXk') {
      cachedCount++;
      track.audio = audioCache[altKey];
      track.duration = audioCache[altKey].duration || track.duration;
      continue;
    }

    const q = cleanSearchQuery(track.title, track.artist);
    let videos = await searchAsync(`${q} audio`);
    if (!videos) {
      videos = await searchAsync(q);
    }

    if (videos && videos.length > 0) {
      const targetDuration = track.duration || 180;
      const best = videos.find((v) => Math.abs(v.seconds - targetDuration) < 35) || videos[0];
      const audioInfo = {
        source: 'youtube',
        youtubeId: best.videoId,
        title: best.title,
        author: best.author?.name || track.artist,
        duration: best.seconds || track.duration || 180,
        url: `https://www.youtube.com/watch?v=${best.videoId}`,
      };
      audioCache[cacheKey] = audioInfo;
      track.audio = audioInfo;
      track.duration = audioInfo.duration;
      resolvedCount++;
      console.log(`[${i + 1}/${playlist.tracks.length}] Resolved: ${track.title} -> ${best.videoId} (${best.title})`);
    } else {
      console.warn(`[${i + 1}/${playlist.tracks.length}] No video found for: ${track.title}`);
    }

    // Gentle 350ms delay between searches to prevent YouTube connection resets
    await delay(350);
  }

  fs.writeFileSync('cache/audio_cache.json', JSON.stringify(audioCache, null, 2));
  fs.writeFileSync('cache/playlist_expanded.json', JSON.stringify(playlist, null, 2));
  console.log(`Finished! Cached: ${cachedCount}, Newly Resolved: ${resolvedCount}`);
}

run();
