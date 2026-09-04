import React from 'react';
import { ArrowUpRight } from 'lucide-react';

export function BroadcastFeed({ upNext = [], history = [], playlist }) {
  const formatTime = (secs) => {
    if (!secs || isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <>
      <div className="broadcastFeedGrid">
        {/* Module 1: Cued Next in Rotation */}
        <div className="feedModule">
          <div className="moduleHeader">
            <span className="moduleTitle">Cued Next in Rotation</span>
            <span className="moduleBadge">{upNext.length} upcoming</span>
          </div>

          <div className="feedStack">
            {upNext && upNext.length > 0 ? (
              upNext.slice(0, 3).map((track, i) => (
                <div key={track.id || i} className="feedTrackCard">
                  <img
                    src={track.coverArtThumb || track.coverArt || '/default-album-art.svg'}
                    alt=""
                    className="feedTrackImage"
                  />
                  <div className="feedTrackMeta">
                    <span className="feedTrackTitle">{track.title}</span>
                    <span className="feedTrackArtist">{track.artist}</span>
                  </div>
                  <span className="feedTrackDuration">
                    {formatTime(track.duration)}
                  </span>
                </div>
              ))
            ) : (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', padding: '12px 0' }}>
                Queueing next tracks...
              </div>
            )}
          </div>
        </div>

        {/* Module 2: Recent Spins (History) */}
        <div className="feedModule">
          <div className="moduleHeader">
            <span className="moduleTitle">Recent Spins</span>
            <span className="moduleBadge">{history.length} recorded</span>
          </div>

          <div className="feedStack">
            {history && history.length > 0 ? (
              history.slice(0, 3).map((track, i) => (
                <div key={track.id || i} className="feedTrackCard">
                  <img
                    src={track.coverArtThumb || track.coverArt || '/default-album-art.svg'}
                    alt=""
                    className="feedTrackImage"
                  />
                  <div className="feedTrackMeta">
                    <span className="feedTrackTitle">{track.title}</span>
                    <span className="feedTrackArtist">{track.artist}</span>
                  </div>
                  <span className="feedTrackDuration">
                    {formatTime(track.duration)}
                  </span>
                </div>
              ))
            ) : (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', padding: '12px 0' }}>
                Broadcast history is building...
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Station Footer Bar */}
      <footer className="stationFooter">
        <div className="footerLeft">
          <span>Source: Spotify #1 Playlist ({playlist?.totalTracks || 68} tracks in weighted rotation)</span>
        </div>
        <div className="footerRight">
          <a
            href="https://open.spotify.com/playlist/6GYZ7RuNutGzFMKAZYSzhb"
            target="_blank"
            rel="noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
          >
            <span>Spotify Playlist</span>
            <ArrowUpRight size={12} />
          </a>
        </div>
      </footer>
    </>
  );
}
