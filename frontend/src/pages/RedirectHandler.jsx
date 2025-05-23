import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { spotifyService } from '../services/spotify';

const RedirectHandler = ({ setIsAuthenticated }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('Processing authentication...');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const code = searchParams.get('code');
        if (!code) {
          throw new Error('No authorization code found');
        }

        setStatus('Exchanging code for token...');
        await spotifyService.exchangeCodeForToken(code);

        setStatus('Verifying with Spotify...');
        await spotifyService.getCurrentUser();

        setStatus('Welcome to VibeMatch! 🎉');
        setIsAuthenticated(true);

        // Clean up URL params
        window.history.replaceState({}, document.title, '/');

        setTimeout(() => navigate('/'), 1000);
      } catch (error) {
        console.error('Authentication failed:', error);
        setStatus('Authentication failed. Redirecting...');
        setTimeout(() => navigate('/'), 2000);
      }
    };

    handleCallback();
  }, [navigate, searchParams, setIsAuthenticated]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-spotify-black via-spotify-dark-gray to-spotify-black flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center"
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="w-16 h-16 border-4 border-spotify-green border-t-transparent rounded-full mx-auto mb-6"
        />
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-bold text-white mb-4"
        >
          {status}
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-spotify-light-gray"
        >
          Hang tight while we set up your personalized experience
        </motion.p>
      </motion.div>
    </div>
  );
};

export default RedirectHandler;
