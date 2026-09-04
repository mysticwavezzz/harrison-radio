import React from 'react';
import { ExternalLink } from 'lucide-react';

export function Header({ station, onOpenMiniPlayer, onOpenAdmin }) {
  return (
    <header className="studioHeader">
      <div className="stationIdentity">
        <div className="callsignBlock">
          <div className="callsignText">
            {station?.callsign || 'HARRISON RADIO'}
          </div>
        </div>
      </div>

      <div className="headerControls">
        {false && (
          <button onClick={onOpenAdmin} className="popoutLink adminStudioBtn" title="Host Studio Controls">
            <span>Studio</span>
          </button>
        )}

        <button onClick={onOpenMiniPlayer} className="popoutLink">
          <span>Mini Player</span>
          <ExternalLink size={12} />
        </button>
      </div>
    </header>
  );
}
