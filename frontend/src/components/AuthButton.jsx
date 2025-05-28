import React, { useState, useEffect } from 'react';
import spotifyService from '../services/spotify';
import { motion } from 'framer-motion';
import { Music } from 'lucide-react';
const AuthButton = ({ onAuthStateChange }, { size = 'large' }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

const buttonClasses = size === 'large'
    ? 'px-8 py-4 text-lg'
    : 'px-6 py-3 text-base';

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      setIsLoading(true);
      const authenticated = spotifyService.isAuthenticated();
      setIsAuthenticated(authenticated);
      
      if (authenticated) {
        try {
          const profile = await spotifyService.getUserProfile();
          setUserProfile(profile);
        } catch (error) {
          console.error('Error fetching user profile:', error);
          // If profile fetch fails, user might not be properly authenticated
          setIsAuthenticated(false);
          spotifyService.clearTokens();
        }
      }
      
      // Notify parent component of auth state
      if (onAuthStateChange) {
        onAuthStateChange(authenticated);
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = () => {
    window.location.href = spotifyService.getLoginUrl();
  };

  const handleLogout = () => {
    spotifyService.logout();
    setIsAuthenticated(false);
    setUserProfile(null);
    
    if (onAuthStateChange) {
      onAuthStateChange(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (isAuthenticated && userProfile) {
    return (
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-3">
          {userProfile.images && userProfile.images.length > 0 && (
            <img
              src={userProfile.images[0].url}
              alt={userProfile.display_name}
              className="w-10 h-10 rounded-full object-cover"
            />
          )}
          <div className="text-left">
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {userProfile.display_name || 'Spotify User'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {userProfile.followers?.total || 0} followers
            </p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
        >
          Logout
        </button>
      </div>
    );
  }

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