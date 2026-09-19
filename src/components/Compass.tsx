import React from 'react';

interface CompassProps {
  bearing: number; // degrees (0 = North)
  onResetNorth: () => void;
}

export const Compass: React.FC<CompassProps> = ({ bearing, onResetNorth }) => {
  return (
    <button
      onClick={onResetNorth}
      title="Click to reset North"
      className="compass-button group"
    >
      {/* Outer Dial Ring */}
      <div
        className="compass-dial"
        style={{ transform: `rotate(${-bearing}deg)` }}
      >
        {/* North Arrow Red */}
        <div className="compass-needle-north" />
        {/* South Arrow White */}
        <div className="compass-needle-south" />
        {/* Cardinal Markers */}
        <span className="compass-cardinal compass-n">N</span>
        <span className="compass-cardinal compass-e">E</span>
        <span className="compass-cardinal compass-s">S</span>
        <span className="compass-cardinal compass-w">W</span>
      </div>
      <div className="compass-center-dot" />
    </button>
  );
};
