import React from 'react';
import { Calendar } from 'lucide-react';

export function BroadcastFeed({ history = [], schedule }) {
  const formatTime = (secs) => {
    if (!secs || isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const upcomingEvent = schedule?.upcomingEvent;

  return (
    <>
      <div className="scheduleDeck">
        <div className="scheduleCard currentShowCard">
          <div className="scheduleCardHeader">
            <div className="scheduleBadge">
              <span>BROADCAST MODE</span>
            </div>
            <span className="scheduleTag">Auto DJ</span>
          </div>
          <div className="scheduleCardBody">
            <h3 className="scheduleTitle">Harrison Auto DJ</h3>
            <p className="scheduleDesc">
              Continuous automated live broadcast streaming from curated station catalog
            </p>
          </div>
        </div>

        <div className="scheduleCard upcomingEventCard">
          <div className="scheduleCardHeader">
            <div className="scheduleBadge eventBadge">
              <Calendar size={13} style={{ marginRight: '4px' }} />
              <span>UPCOMING EVENT</span>
            </div>
            {upcomingEvent && <span className="eventTimeTag">{upcomingEvent.time}</span>}
          </div>
          <div className="scheduleCardBody">
            {upcomingEvent ? (
              <>
                <h3 className="scheduleTitle eventTitle">{upcomingEvent.title}</h3>
                <p className="scheduleDesc">
                  {upcomingEvent.description || 'Special guest session / live broadcast scheduled'}
                </p>
              </>
            ) : (
              <div className="noEventState">
                <span className="noEventText">No upcoming events</span>
                <span className="noEventSub">Station in 24/7 Auto DJ mode</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="broadcastFeedGrid singleModuleGrid">
        <div className="feedModule">
          <div className="moduleHeader">
            <span className="moduleTitle">Recent Spins (History)</span>
            <span className="moduleBadge">{history.length} recorded</span>
          </div>

          <div className="feedStack">
            {history && history.length > 0 ? (
              history.slice(0, 6).map((track, i) => (
                <div key={track.id || i} className="feedTrackCard">
                  <img
                    src={track.coverArtThumb || track.coverArt || '/default-album-art.svg'}
                    alt=""
                    className="feedTrackImage"
                  />
                  <div className="feedTrackMeta">
                    <div className="feedTrackTitleRow">
                      <span className="feedTrackTitle">{track.title}</span>
                      {track.djConfig?.vibe && (
                        <span className="feedVibeBadge" style={{ borderColor: `${track.djConfig.primaryColor}40` }}>
                          <span className="feedVibeDot" style={{ background: track.djConfig.primaryColor }} />
                          {track.djConfig.vibe.split(' / ')[0]}
                        </span>
                      )}
                    </div>
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
    </>
  );
}
