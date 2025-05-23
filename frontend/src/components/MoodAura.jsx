import React from 'react';

const moodColors = {
  calm: 'from-blue-400 to-cyan-500',
  energetic: 'from-pink-500 to-yellow-500',
  dark: 'from-gray-800 to-black',
  happy: 'from-yellow-400 to-orange-500',
};

const MoodAura = ({ mood }) => {
  const gradient = moodColors[mood] || moodColors.calm;

  return (
    <div className={`w-full h-40 bg-gradient-to-r ${gradient} rounded-xl shadow-lg`} />
  );
};

export default MoodAura;
