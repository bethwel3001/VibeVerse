import React from 'react';
import { motion } from 'framer-motion';
import { Music } from 'lucide-react';
import { spotifyService } from '../services/spotify';

const AuthButton = ({ size = 'large' }) => {
  const handleLogin = () => {
    const authUrl = spotifyService.getAuthUrl();
    window.location.href = authUrl;
  };

  const buttonClasses = size === 'large' 
    ? 'px-8 py-4 text-lg' 
    : 'px-6 py-3 text-base';

  return (
    <motion.button
      whileHover={{ 
        scale: 1.05,
        boxShadow: '0 0 30px rgba(29, 185, 84, 0.5)'
      }}
      whileTap={{ scale: 0.95 }}
      onClick={handleLogin}
      className={`
        bg-gradient-to-r from-spotify-green to-spotify-green-dark 
        text-white font-bold rounded-full 
        shadow-lg hover:shadow-neon
        transition-all duration-300 
        inline-flex items-center gap-3
        ${buttonClasses}
      `}
    >
      <Music size={24} />
      Connect with Spotify
    </motion.button>
  );
};

export default AuthButton;