import React from 'react';

const TopTracks = ({ tracks }) => {
  return (
    <div className="glass p-4 rounded-xl">
      <h3 className="text-lg font-bold mb-2">Top Tracks</h3>
      <ul className="space-y-1">
        {tracks.slice(0, 5).map((track, index) => (
          <li key={index} className="text-white">
            {index + 1}. {track.name} - {track.artists.map(a => a.name).join(', ')}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default TopTracks;