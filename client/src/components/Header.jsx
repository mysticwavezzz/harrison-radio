import React from 'react';
import { ExternalLink, Sliders } from 'lucide-react';

export function Header({ station, onOpenMiniPlayer, onOpenAdmin }) {
  return (
    <header className="studioHeader">
      <div className="stationIdentity">
        <div className="callsignBlock">
          <div className="callsignText">
            {station?.callsign || 'HARRISON RADIO'}
          </div>
          <div className="broadcastGenre">
            {station?.genre || '24/7 Live Web Broadcast'}
          </div>
        </div>
      </div>

      <div className="headerControls">
        <div className="onAirBadge">
          <div className="onAirDot" />
          <span>ON AIR</span>
        </div>

        <button onClick={onOpenAdmin} className="popoutLink adminStudioBtn" title="Host Studio Controls">
          <Sliders size={13} />
          <span>Studio</span>
        </button>

        <button onClick={onOpenMiniPlayer} className="popoutLink">
          <span>Mini Player</span>
          <ExternalLink size={12} />
        </button>
      </div>
    </header>
  );
}
