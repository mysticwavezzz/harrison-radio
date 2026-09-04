import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { AudioPlayer } from './components/AudioPlayer';
import { Header } from './components/Header';
import { RadioStage } from './components/RadioStage';
import { BroadcastFeed } from './components/BroadcastFeed';
import { MiniPlayer } from './components/MiniPlayer';
import { AdminModal } from './components/AdminModal';
import { GalaxyCanvas } from './components/GalaxyCanvas';
import { getSynchronizedStationState } from './staticBroadcastEngine';

export default function App() {
  const [stationState, setStationState] = useState(() => getSynchronizedStationState());
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);

  // Check if opened as pop-out mini player or admin view
  const isMini = typeof window !== 'undefined' && window.location.search.includes('mini=true');

  const socketRef = useRef(null);

  // Sync Station State: First try live backend (if running), else smoothly use universal static broadcast sync
  useEffect(() => {
    let isMounted = true;

    // Check if backend API exists (local dev mode)
    fetch('/api/station')
      .then((res) => {
        if (!res.ok) throw new Error('No backend');
        return res.json();
      })
      .then((data) => {
        if (isMounted && data && data.currentTrack) {
          setStationState(data);
        }
      })
      .catch(() => {
        // Static GitHub Pages deployment mode: sync station state from synchronized clock
        if (isMounted) {
          const syncState = getSynchronizedStationState();
          if (syncState) setStationState(syncState);
        }
      });

    // Socket.io for live backend updates if available
    try {
      const socket = io({ autoConnect: false, timeout: 2000 });
      socketRef.current = socket;
      socket.connect();

      socket.on('station-state', (data) => {
        if (isMounted) setStationState(data);
      });

      socket.on('track-change', (data) => {
        if (isMounted) setStationState(data);
      });

      socket.on('volume-change', (data) => {
        if (isMounted && data && typeof data.volume === 'number') {
          setStationState((prev) => ({
            ...prev,
            admin: {
              ...(prev?.admin || {}),
              serverVolume: data.volume
            }
          }));
        }
      });
    } catch (e) {
      // Socket.io disabled in static mode
    }

    return () => {
      isMounted = false;
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, []);

  // Universal Broadcast Clock: Smooth 1s tick keeping song elapsed time and track transitions 100% in sync
  useEffect(() => {
    const interval = setInterval(() => {
      setStationState((prev) => {
        if (prev?.admin?.isPaused) {
          return prev; // Station paused by admin
        }

        if (!prev?.currentTrack?.startedAt) {
          return getSynchronizedStationState();
        }

        const elapsed = Math.floor((Date.now() - prev.currentTrack.startedAt) / 1000);
        const duration = prev.currentTrack.duration || 180;

        // If track has finished in static mode, automatically compute next synchronized on-air track
        if (elapsed >= duration) {
          return getSynchronizedStationState();
        }

        return {
          ...prev,
          currentTrack: {
            ...prev.currentTrack,
            elapsedSeconds: elapsed,
            remainingSeconds: Math.max(0, duration - elapsed),
          },
        };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleTogglePlay = () => {
    setIsPlaying((prev) => !prev);
  };

  const handleVolumeChange = (newVol) => {
    setVolume(newVol);
    if (newVol > 0 && isMuted) setIsMuted(false);
  };

  const handleToggleMute = () => {
    setIsMuted((prev) => !prev);
  };

  const handleOpenMiniPlayer = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('mini', 'true');
    window.open(
      url.toString(),
      'HarrisonMiniPlayer',
      'width=360,height=480,menubar=no,toolbar=no,location=no,status=no,resizable=yes'
    );
  };

  // --- Admin Actions ---
  const handleAdminSkip = async () => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('admin-skip');
    } else {
      try {
        await fetch('/api/station/skip', { method: 'POST' });
      } catch (e) {
        // In static mode, advance to next track in queue
        const nextState = getSynchronizedStationState();
        if (nextState) setStationState(nextState);
      }
    }
  };

  const handleAdminTogglePause = async (paused) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('admin-set-pause', paused);
    } else {
      try {
        await fetch('/api/admin/pause', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paused }),
        });
      } catch (e) {}
    }
    setStationState((prev) => ({
      ...prev,
      admin: {
        ...(prev?.admin || {}),
        isPaused: paused,
      },
    }));
  };

  const handleAdminSetVolume = async (vol) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('admin-set-volume', vol);
    } else {
      try {
        await fetch('/api/admin/volume', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ volume: vol }),
        });
      } catch (e) {}
    }
    setStationState((prev) => ({
      ...prev,
      admin: {
        ...(prev?.admin || {}),
        serverVolume: vol,
      },
    }));
  };

  const handleAdminSetEvent = async (eventData) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('admin-set-event', eventData);
    } else {
      try {
        await fetch('/api/admin/event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ event: eventData }),
        });
      } catch (e) {}
    }

    // Save event locally as well for static mode persistence
    if (eventData) {
      localStorage.setItem('harrison_radio_upcoming_event', JSON.stringify(eventData));
    } else {
      localStorage.removeItem('harrison_radio_upcoming_event');
    }

    setStationState((prev) => ({
      ...prev,
      schedule: {
        ...(prev?.schedule || {}),
        upcomingEvent: eventData,
      },
      admin: {
        ...(prev?.admin || {}),
        upcomingEvent: eventData,
      },
    }));
  };

  return (
    <>
      {/* Interactive Ambient Galaxy Background Canvas with Song-Specific DJ Lighting Sync */}
      <GalaxyCanvas
        isPlaying={isPlaying}
        volume={volume}
        djConfig={stationState?.currentTrack?.djConfig}
      />

      <div className="masterLayout">
      {/* Background YouTube Audio Streaming Controller */}
      <AudioPlayer
        currentTrack={stationState?.currentTrack}
        isPlaying={isPlaying}
        volume={volume}
        isMuted={isMuted}
        isStationPaused={stationState?.admin?.isPaused || false}
        serverVolume={stationState?.admin?.serverVolume ?? 1.0}
        socket={socketRef.current}
        onBufferingChange={setIsBuffering}
      />

      {isMini ? (
        <MiniPlayer
          station={stationState?.station}
          currentTrack={stationState?.currentTrack}
          isPlaying={isPlaying}
          isBuffering={isBuffering}
          volume={volume}
          isMuted={isMuted}
          onTogglePlay={handleTogglePlay}
          onVolumeChange={handleVolumeChange}
          onToggleMute={handleToggleMute}
        />
      ) : (
        <>
          <Header
            station={stationState?.station}
            onOpenMiniPlayer={handleOpenMiniPlayer}
            onOpenAdmin={() => setIsAdminOpen(true)}
          />

          <main style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            <RadioStage
              station={stationState?.station}
              currentTrack={stationState?.currentTrack}
              isPlaying={isPlaying}
              isBuffering={isBuffering}
              volume={volume}
              isMuted={isMuted}
              onTogglePlay={handleTogglePlay}
              onVolumeChange={handleVolumeChange}
              onToggleMute={handleToggleMute}
            />

            <BroadcastFeed
              upNext={stationState?.upNext}
              history={stationState?.history}
              playlist={stationState?.playlist}
              schedule={stationState?.schedule}
              currentTrack={stationState?.currentTrack}
            />
          </main>

          <AdminModal
            isOpen={isAdminOpen}
            onClose={() => setIsAdminOpen(false)}
            stationState={stationState}
            socket={socketRef.current}
            onSkip={handleAdminSkip}
            onTogglePause={handleAdminTogglePause}
            onSetVolume={handleAdminSetVolume}
            onSetEvent={handleAdminSetEvent}
          />
        </>
      )}
    </div>
    </>
  );
}
