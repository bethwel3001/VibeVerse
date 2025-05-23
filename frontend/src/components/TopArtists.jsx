import React from 'react';

const TopArtists = ({ artists }) => {
  return (
    <div className="glass p-4 rounded-xl">
      <h3 className="text-lg font-bold mb-2">Top Artists</h3>
      <ul className="space-y-1">
        {artists.slice(0, 5).map((artist, index) => (
          <li key={index} className="text-white">
            {index + 1}. {artist.name}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default TopArtists;