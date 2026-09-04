import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Play,
  Pause,
  SkipForward,
  Volume2,
  VolumeX,
  Calendar,
  X,
  Radio,
  Sliders,
  Check
} from 'lucide-react';

export function AdminModal({
  isOpen,
  onClose,
  stationState,
  socket,
  onSkip,
  onTogglePause,
  onSetVolume,
  onSetEvent
}) {
  if (!isOpen) return null;

  const currentTrack = stationState?.currentTrack;
  const isPaused = stationState?.admin?.isPaused || false;
  const serverVolume = typeof stationState?.admin?.serverVolume === 'number' ? stationState.admin.serverVolume : 1.0;
  const currentEvent = stationState?.schedule?.upcomingEvent;

  // Local state for event form
  const [eventTitle, setEventTitle] = useState(currentEvent?.title || '');
  const [eventTime, setEventTime] = useState(currentEvent?.time || '');
  const [eventDesc, setEventDesc] = useState(currentEvent?.description || '');
  const [eventSaved, setEventSaved] = useState(false);

  // Live microphone broadcast state
  const [isMicLive, setIsMicLive] = useState(false);
  const [micError, setMicError] = useState(null);
  const mediaRecorderRef = useRef(null);
  const micStreamRef = useRef(null);

  // Volume slider
  const [sliderVol, setSliderVol] = useState(serverVolume);

  useEffect(() => {
    setSliderVol(serverVolume);
  }, [serverVolume]);

  useEffect(() => {
    if (currentEvent) {
      setEventTitle(currentEvent.title || '');
      setEventTime(currentEvent.time || '');
      setEventDesc(currentEvent.description || '');
    }
  }, [currentEvent]);

  // Clean up mic when modal unmounts
  useEffect(() => {
    return () => {
      stopLiveMic();
    };
  }, []);

  const handleSaveEvent = (e) => {
    e.preventDefault();
    if (!eventTitle.trim()) {
      onSetEvent(null);
    } else {
      onSetEvent({
        title: eventTitle.trim(),
        time: eventTime.trim() || 'Upcoming',
        description: eventDesc.trim()
      });
    }
    setEventSaved(true);
    setTimeout(() => setEventSaved(false), 2000);
  };

  const handleClearEvent = () => {
    setEventTitle('');
    setEventTime('');
    setEventDesc('');
    onSetEvent(null);
  };

  // Start live microphone streaming
  const startLiveMic = async () => {
    setMicError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });
      micStreamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0 && socket) {
          const reader = new FileReader();
          reader.onloadend = () => {
            socket.emit('admin-voice-chunk', reader.result);
          };
          reader.readAsArrayBuffer(e.data);
        }
      };

      if (socket) {
        socket.emit('admin-voice-start');
      }

      mediaRecorder.start(250); // 250ms chunks for low-latency live streaming
      setIsMicLive(true);
    } catch (err) {
      console.error('Microphone error:', err);
      setMicError('Could not access microphone: ' + (err.message || 'Permission denied'));
      setIsMicLive(false);
    }
  };

  // Stop live microphone streaming
  const stopLiveMic = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }
    if (socket && isMicLive) {
      socket.emit('admin-voice-end');
    }
    setIsMicLive(false);
  };

  return (
    <div className="modalOverlay" onClick={onClose}>
      <div className="modalCard adminModal" onClick={(e) => e.stopPropagation()}>
        <div className="modalHeader">
          <div className="modalTitleBox">
            <Radio size={18} className="modalIcon" />
            <h2>Station Studio Console</h2>
            <span className="adminBadge">HOST ONLY</span>
          </div>
          <button onClick={onClose} className="modalCloseBtn" aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="modalBody">
          {/* Section 1: Live Microphone Broadcaster */}
          <div className="adminSection liveMicSection">
            <div className="sectionHead">
              <span className="sectionTitle">LIVE ON-AIR MICROPHONE</span>
              {isMicLive && <span className="livePillPulse">BROADCASTING TO LISTENERS</span>}
            </div>
            <p className="sectionDesc">
              Click Speak Live to talk directly over the airwaves. When active, background music ducks and listeners hear you live in real time.
            </p>

            <div className="micControlRow">
              {!isMicLive ? (
                <button onClick={startLiveMic} className="btnMicLiveStart">
                  <Mic size={20} />
                  <span>Speak Live to Station</span>
                </button>
              ) : (
                <button onClick={stopLiveMic} className="btnMicLiveStop">
                  <MicOff size={20} />
                  <span>Mute Microphone (Stop Live)</span>
                </button>
              )}
            </div>
            {micError && <div className="micErrorNotice">{micError}</div>}
          </div>

          {/* Section 2: Playback & Volume Control */}
          <div className="adminSection">
            <div className="sectionHead">
              <span className="sectionTitle">BROADCAST PLAYBACK & VOLUME</span>
            </div>
            <p className="sectionDesc">
              Remotely pause the broadcast, change to the next song, or adjust master volume across all listeners.
            </p>

            <div className="broadcastControlBar">
              <button
                onClick={() => onTogglePause(!isPaused)}
                className={`btnAdminControl ${isPaused ? 'btnPaused' : ''}`}
              >
                {isPaused ? <Play size={18} /> : <Pause size={18} />}
                <span>{isPaused ? 'Resume Station' : 'Pause Station'}</span>
              </button>

              <button onClick={onSkip} className="btnAdminControl btnSkip">
                <SkipForward size={18} />
                <span>Next Track (Skip)</span>
              </button>
            </div>

            <div className="serverVolumeBox">
              <div className="volumeLabelRow">
                <span>Master Broadcast Level</span>
                <span className="volPercent">{Math.round(sliderVol * 100)}%</span>
              </div>
              <div className="sliderRow">
                <Volume2 size={16} className="volIcon" />
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={sliderVol}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setSliderVol(val);
                    onSetVolume(val);
                  }}
                  className="serverVolumeSlider"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Upcoming Event Manager */}
          <div className="adminSection">
            <div className="sectionHead">
              <span className="sectionTitle">EVENT SCHEDULE MANAGER</span>
            </div>
            <p className="sectionDesc">
              Set an upcoming event (e.g. guest mix, live premiere). If no event is set, the station automatically displays "Auto DJ".
            </p>

            <form onSubmit={handleSaveEvent} className="eventForm">
              <div className="formGroup">
                <label>Event Name</label>
                <input
                  type="text"
                  placeholder="e.g. Harrison Midnight Special Guest Mix"
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  className="formInput"
                />
              </div>

              <div className="formRow">
                <div className="formGroup" style={{ flex: 1 }}>
                  <label>Scheduled Time</label>
                  <input
                    type="text"
                    placeholder="e.g. Tonight 10:00 PM EST / Saturday"
                    value={eventTime}
                    onChange={(e) => setEventTime(e.target.value)}
                    className="formInput"
                  />
                </div>
              </div>

              <div className="formGroup">
                <label>Short Description (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Live takeover with exclusive unreleased tracks"
                  value={eventDesc}
                  onChange={(e) => setEventDesc(e.target.value)}
                  className="formInput"
                />
              </div>

              <div className="formActions">
                <button type="submit" className="btnSaveEvent">
                  {eventSaved ? <Check size={16} /> : <Calendar size={16} />}
                  <span>{eventSaved ? 'Event Saved!' : 'Publish Event'}</span>
                </button>
                {currentEvent && (
                  <button type="button" onClick={handleClearEvent} className="btnClearEvent">
                    Clear Event (Revert to Auto DJ)
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
