import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CACHE_DIR = path.join(__dirname, '../cache');

if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

export class SpotifyIngestor {
  constructor(clientId = process.env.SPOTIFY_CLIENT_ID, clientSecret = process.env.SPOTIFY_CLIENT_SECRET) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.accessToken = null;
    this.tokenExpiresAt = 0;
  }

  extractPlaylistId(input) {
    if (!input) return null;
    const match = input.match(/playlist\/([a-zA-Z0-9]+)/);
    if (match) return match[1];
    if (/^[a-zA-Z0-9]+$/.test(input.trim())) return input.trim();
    return null;
  }

  async getSpotifyApiToken() {
    if (!this.clientId || !this.clientSecret) return null;
    if (this.accessToken && Date.now() < this.tokenExpiresAt - 60000) {
      return this.accessToken;
    }

    try {
      const authHeader = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
      const res = await axios.post(
        'https://accounts.spotify.com/api/token',
        'grant_type=client_credentials',
        {
          headers: {
            Authorization: `Basic ${authHeader}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );
      this.accessToken = res.data.access_token;
      this.tokenExpiresAt = Date.now() + res.data.expires_in * 1000;
      return this.accessToken;
    } catch (err) {
      console.warn('Spotify API token fetch failed, falling back to public ingest:', err.message);
      return null;
    }
  }

  async fetchPlaylist(playlistUrlOrId) {
    const playlistId = this.extractPlaylistId(playlistUrlOrId);
    if (!playlistId) throw new Error('Invalid Spotify playlist URL or ID');

    const cacheFile = path.join(CACHE_DIR, `playlist_${playlistId}.json`);
    if (fs.existsSync(cacheFile)) {
      try {
        // If cached with tracks, load immediately to prevent startup delay
        if (cached.tracks?.length > 0) {
          console.log(`[SpotifyIngestor] Loaded ${cached.tracks.length} tracks from cache for playlist ${playlistId}`);
          return cached;
        }
      } catch (e) {
        // Continue to fresh fetch
      }
    }

    // Try Spotify Web API first if credentials exist
    const token = await this.getSpotifyApiToken();
    if (token) {
      try {
        const result = await this.fetchViaWebApi(playlistId, token);
        fs.writeFileSync(cacheFile, JSON.stringify(result, null, 2));
        return result;
      } catch (err) {
        console.warn('Spotify Web API failed, trying public embed parser:', err.message);
      }
    }

    // Fallback to high-speed public embed scraper
    const result = await this.fetchViaEmbed(playlistId);
    fs.writeFileSync(cacheFile, JSON.stringify(result, null, 2));
    return result;
  }

  async fetchViaWebApi(playlistId, token) {
    const res = await axios.get(`https://api.spotify.com/v1/playlists/${playlistId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const playlist = res.data;
    const tracks = playlist.tracks.items
      .filter((item) => item && item.track && item.track.id)
      .map((item, index) => {
        const t = item.track;
        const coverArt = t.album?.images?.[0]?.url || playlist.images?.[0]?.url;
        const coverArtThumb = t.album?.images?.[1]?.url || coverArt;
        return {
          id: t.id,
          title: t.name,
          artist: t.artists.map((a) => a.name).join(', '),
          primaryArtist: t.artists[0]?.name || 'Unknown Artist',
          album: t.album?.name || 'Single',
          releaseDate: t.album?.release_date || '',
          duration: Math.round(t.duration_ms / 1000),
          popularity: t.popularity ?? Math.max(20, 100 - index * 2), // 0-100 score
          coverArt,
          coverArtThumb,
          spotifyUrl: t.external_urls?.spotify || `https://open.spotify.com/track/${t.id}`,
        };
      });

    return {
      id: playlistId,
      name: playlist.name,
      description: playlist.description,
      owner: playlist.owner?.display_name || 'Spotify User',
      coverArt: playlist.images?.[0]?.url,
      totalTracks: tracks.length,
      tracks,
      timestamp: Date.now(),
    };
  }

  async fetchViaEmbed(playlistId) {
    const embedUrl = `https://open.spotify.com/embed/playlist/${playlistId}`;
    const res = await axios.get(embedUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    const html = res.data;
    const idx = html.indexOf('__NEXT_DATA__');
    if (idx === -1) throw new Error('Could not parse Spotify embed data');

    const start = html.indexOf('>', idx) + 1;
    const end = html.indexOf('</script>', start);
    const parsed = JSON.parse(html.slice(start, end));
    const entity = parsed.props?.pageProps?.state?.data?.entity;

    if (!entity || !entity.trackList) {
      throw new Error('No tracks found in playlist');
    }

    const playlistCover =
      entity.coverArt?.sources?.find((s) => s.width >= 300)?.url ||
      entity.coverArt?.sources?.[0]?.url ||
      '';

    const rawTracks = entity.trackList || [];

    // Parallel resolution for individual track cover arts and details
    const tracks = await Promise.all(
      rawTracks.map(async (t, index) => {
        const trackId = t.uri ? t.uri.replace('spotify:track:', '') : `t_${index}`;
        const primaryArtist = (t.subtitle || 'Unknown').split(',')[0].trim();

        // Calculate a realistic popularity score if not directly in embed:
        // Songs near the top of curated playlists generally have higher rotation weights
        const simulatedPopularity = Math.max(30, 95 - Math.floor(index * 2.1));

        let trackCover = playlistCover;
        let trackThumb = playlistCover;

        // Try to fetch individual high-res track art via oembed
        try {
          const oRes = await axios.get(
            `https://open.spotify.com/oembed?url=https://open.spotify.com/track/${trackId}`,
            { timeout: 3000 }
          );
          if (oRes.data?.thumbnail_url) {
            trackThumb = oRes.data.thumbnail_url;
            // Upgrade 1e02 (300x300) to b273 (640x640) for gorgeous album art
            trackCover = oRes.data.thumbnail_url.replace('1e02', 'b273');
          }
        } catch (e) {
          // Fallback to playlist cover
        }

        return {
          id: trackId,
          title: t.title,
          artist: t.subtitle,
          primaryArtist,
          album: entity.name,
          duration: Math.round((t.duration || 180000) / 1000),
          popularity: simulatedPopularity,
          coverArt: trackCover,
          coverArtThumb: trackThumb,
          previewUrl: t.audioPreview?.url || null,
          spotifyUrl: `https://open.spotify.com/track/${trackId}`,
        };
      })
    );

    return {
      id: playlistId,
      name: entity.name || 'Spotify Playlist',
      description: entity.subtitle || '',
      coverArt: playlistCover,
      totalTracks: tracks.length,
      tracks,
      timestamp: Date.now(),
    };
  }
}
