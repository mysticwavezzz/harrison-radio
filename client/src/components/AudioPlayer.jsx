import React, { useEffect, useRef, useState } from 'react';

export function AudioPlayer({
  currentTrack,
  isPlaying,
  volume,
  isMuted,
  onBufferingChange,
  onPlayerReady,
}) {
  const playerRef = useRef(null);
  const containerRef = useRef(null);
  const [isApiReady, setIsApiReady] = useState(false);
  const currentVideoIdRef = useRef(null);
  const voiceDropAudioRef = useRef(null);
  const isDuckedRef = useRef(false);
  const fadeIntervalRef = useRef(null);

  // Initialize voice drop audio element
  useEffect(() => {
    voiceDropAudioRef.current = new Audio();
  }, []);

  // Initialize YouTube IFrame API
  useEffect(() => {
    const checkYT = () => {
      if (window.YT && window.YT.Player) {
        setIsApiReady(true);
      } else {
        setTimeout(checkYT, 200);
      }
    };
    checkYT();
  }, []);

  // Smooth volume restore after voice drop completes
  const restoreMusicVolume = () => {
    if (!playerRef.current || !isDuckedRef.current) return;
    isDuckedRef.current = false;
    if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);

    const targetVol = isMuted ? 0 : volume * 100;
    const currentVol = playerRef.current.getVolume ? playerRef.current.getVolume() : 25;
    let step = 0;
    const steps = 8;
    const diff = targetVol - currentVol;

    fadeIntervalRef.current = setInterval(() => {
      step++;
      const nextVol = Math.min(targetVol, Math.max(0, currentVol + (diff * (step / steps))));
      if (playerRef.current?.setVolume) {
        playerRef.current.setVolume(nextVol);
      }
      if (step >= steps) {
        clearInterval(fadeIntervalRef.current);
      }
    }, 75); // Smooth ~600ms swell back to 100%
  };

  // Trigger radio voice drop with audio ducking
  const triggerVoiceDrop = (dropUrl) => {
    if (!playerRef.current || !dropUrl || !isPlaying) return;

    try {
      isDuckedRef.current = true;
      // Duck music to 25% volume
      playerRef.current.setVolume(isMuted ? 0 : volume * 25);

      const audio = voiceDropAudioRef.current || new Audio();
      audio.src = dropUrl;
      audio.volume = isMuted ? 0 : Math.min(1, volume * 1.15); // Clear upfront human voice

      audio.onended = () => {
        restoreMusicVolume();
      };
      audio.onerror = () => {
        restoreMusicVolume();
      };

      audio.play().catch((err) => {
        console.warn('[AudioPlayer] Voice drop playback blocked:', err.message);
        restoreMusicVolume();
      });
    } catch (e) {
      restoreMusicVolume();
    }
  };

  // Initialize Player when API is ready
  useEffect(() => {
    if (!isApiReady || playerRef.current || !currentTrack?.audio?.youtubeId) return;

    const videoId = currentTrack.audio.youtubeId;
    currentVideoIdRef.current = videoId;

    playerRef.current = new window.YT.Player('yt-player-element', {
      height: '1',
      width: '1',
      videoId: videoId,
      playerVars: {
        autoplay: 0,
        controls: 0,
        disablekb: 1,
        enablejsapi: 1,
        fs: 0,
        playsinline: 1,
        rel: 0,
      },
      events: {
        onReady: (event) => {
          console.log('[AudioPlayer] YouTube Player Ready');
          event.target.setVolume(isMuted ? 0 : volume * 100);
          if (onPlayerReady) onPlayerReady(event.target);
          if (isPlaying) {
            const startSec = currentTrack.elapsedSeconds || 0;
            event.target.seekTo(startSec, true);
            event.target.playVideo();
          }
        },
        onStateChange: (event) => {
          if (event.data === 3) {
            if (onBufferingChange) onBufferingChange(true);
          } else {
            if (onBufferingChange) onBufferingChange(false);
          }
        },
        onError: (err) => {
          console.warn('[AudioPlayer] YouTube Player Error:', err.data);
          if (onBufferingChange) onBufferingChange(false);
        },
      },
    });
  }, [isApiReady, currentTrack?.audio?.youtubeId]);

  // Handle Song Transitions (Live Synchronization & Real Voice Drops)
  useEffect(() => {
    if (!playerRef.current || !currentTrack?.audio?.youtubeId) return;

    const newVideoId = currentTrack.audio.youtubeId;
    if (newVideoId !== currentVideoIdRef.current) {
      currentVideoIdRef.current = newVideoId;
      const startSec = currentTrack.elapsedSeconds || 0;
      console.log(`[AudioPlayer] Cueing new track: ${newVideoId} at ${startSec}s`);

      if (typeof playerRef.current.loadVideoById === 'function') {
        if (isPlaying) {
          playerRef.current.loadVideoById({
            videoId: newVideoId,
            startSeconds: startSec,
          });
          playerRef.current.playVideo();

          // If track has a voice drop and just started (< 6s), trigger radio ducking
          if (currentTrack.voiceDropUrl && startSec < 6) {
            setTimeout(() => {
              triggerVoiceDrop(currentTrack.voiceDropUrl);
            }, 600); // 600ms intro beat before voice speaks
          }
        } else {
          playerRef.current.cueVideoById({
            videoId: newVideoId,
            startSeconds: startSec,
          });
        }
      }
    }
  }, [currentTrack?.audio?.youtubeId, currentTrack?.startedAt]);

  // Handle Play/Pause
  useEffect(() => {
    if (!playerRef.current || typeof playerRef.current.playVideo !== 'function') return;

    try {
      if (isPlaying) {
        const elapsed = currentTrack?.elapsedSeconds || 0;
        const currentYTTime = playerRef.current.getCurrentTime ? playerRef.current.getCurrentTime() : 0;

        if (Math.abs(currentYTTime - elapsed) > 1.5) {
          playerRef.current.seekTo(elapsed, true);
        }
        playerRef.current.playVideo();
      } else {
        playerRef.current.pauseVideo();
        if (voiceDropAudioRef.current) {
          voiceDropAudioRef.current.pause();
        }
      }
    } catch (e) {
      console.warn('[AudioPlayer] Playback toggle error:', e.message);
    }
  }, [isPlaying]);

  // Handle Volume & Mute
  useEffect(() => {
    if (!playerRef.current || typeof playerRef.current.setVolume !== 'function') return;
    try {
      if (isMuted) {
        playerRef.current.setVolume(0);
        if (voiceDropAudioRef.current) voiceDropAudioRef.current.volume = 0;
      } else {
        if (isDuckedRef.current) {
          playerRef.current.setVolume(volume * 25);
        } else {
          playerRef.current.setVolume(volume * 100);
        }
        if (voiceDropAudioRef.current) {
          voiceDropAudioRef.current.volume = Math.min(1, volume * 1.15);
        }
      }
    } catch (e) {
      console.warn('[AudioPlayer] Volume error:', e.message);
    }
  }, [volume, isMuted]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        bottom: '-100px',
        right: '-100px',
        opacity: 0.01,
        pointerEvents: 'none',
        zIndex: -1,
      }}
    >
      <div id="yt-player-element" />
    </div>
  );
}
