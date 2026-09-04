import React from 'react';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';

export function MiniPlayer({
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
  return (
    <div className="miniContainer">
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: 'var(--studio-red)', fontFamily: 'var(--font-mono)', fontWeight: 700, letterSpacing: '1px' }}>
        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--studio-red)' }} />
        <span>{station?.callsign || 'HARRISON RADIO'} // ON AIR</span>
      </div>

      <img
        src={currentTrack?.coverArt || '/default-album-art.svg'}
        alt={currentTrack?.title || 'Album Art'}
        className="miniArt"
      />

      <div style={{ textAlign: 'center', width: '100%' }}>
        <div className="miniTitle">
          {currentTrack?.title || 'Connecting...'}
        </div>
        <div className="miniArtist">
          {currentTrack?.artist || 'Harrison Radio'}
        </div>
      </div>

      {/* Play Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', width: '100%', maxWidth: '240px' }}>
        <button
          onClick={onTogglePlay}
          className="masterPlayButton"
          style={{ width: '48px', height: '48px' }}
        >
          {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" style={{ marginLeft: '2px' }} />}
        </button>

        <div className="volumeControl" style={{ width: '100%' }}>
          <button onClick={onToggleMute} className="volumeToggle">
            {isMuted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={isMuted ? 0 : volume}
            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
            className="volumeRange"
          />
        </div>
      </div>

      {isBuffering && (
        <div style={{ fontSize: '0.72rem', color: 'var(--spotify-green)', fontFamily: 'var(--font-mono)' }}>
          Buffering stream...
        </div>
      )}
    </div>
  );
}
