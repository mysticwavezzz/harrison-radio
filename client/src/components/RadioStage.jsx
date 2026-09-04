import React from 'react';
import { Play, Pause, Volume2, VolumeX, ArrowUpRight } from 'lucide-react';

export function RadioStage({
  station,
  currentTrack,
  isPlaying,
  isBuffering,
  volume,
  isMuted,
  onTogglePlay,
  onVolumeChange,
  onToggleMute,
}) {
  const formatTime = (secs) => {
    if (!secs || isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const elapsed = currentTrack?.elapsedSeconds || 0;
  const duration = currentTrack?.duration || 180;
  const progressPercent = Math.min(100, Math.max(0, (elapsed / duration) * 100));

  const coverImage = currentTrack?.coverArt || '/default-album-art.svg';

  return (
    <section className="studioDeck">
      {/* Left: Album Jacket Presentation */}
      <div className="jacketContainer">
        <div className="vinylJacket">
          <img
            src={coverImage}
            alt={currentTrack?.title || 'Current Track'}
            className="jacketArt"
            key={currentTrack?.id || 'jacket'}
          />
        </div>
      </div>

      {/* Right: Broadcast Console & Metadata */}
      <div className="consoleInfo">
        <div className="streamTag">
          LIVE TRANSMISSION // HARRISON ROTATION
        </div>

        <h1 className="songName">
          {currentTrack?.title || 'Connecting to Broadcast...'}
        </h1>

        <div className="artistRow">
          {currentTrack?.artist || 'Harrison Radio Station'}
        </div>

        <div className="metaRow">
          {currentTrack?.spotifyUrl && (
            <a
              href={currentTrack.spotifyUrl}
              target="_blank"
              rel="noreferrer"
              className="spotifyButton"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
              </svg>
              <span>Spotify</span>
              <ArrowUpRight size={13} />
            </a>
          )}

          {currentTrack?.album && (
            <span className="albumLabel">Album: {currentTrack.album}</span>
          )}
        </div>

        {/* Live Broadcast Progress Timeline */}
        <div className="timelineWrapper">
          <div className="timelineTrack">
            <div
              className="timelineFill"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="timelineTime">
            <span>{formatTime(elapsed)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Playback Controls */}
        <div className="deckControls">
          <div className="playbackGroup">
            <button
              onClick={onTogglePlay}
              className="masterPlayButton"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause size={24} fill="currentColor" />
              ) : (
                <Play size={24} fill="currentColor" style={{ marginLeft: '2px' }} />
              )}
            </button>

            {isBuffering && (
              <span className="bufferingLabel">Buffering...</span>
            )}
          </div>

          <div className="volumeControl">
            <button onClick={onToggleMute} className="volumeToggle" aria-label="Toggle mute">
              {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={isMuted ? 0 : volume}
              onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
              className="volumeRange"
              aria-label="Volume"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
