import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { motion } from 'framer-motion';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import RedirectHandler from './pages/RedirectHandler';
import spotifyService from './services/spotify';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      setIsLoading(true);
      
      // Load tokens from storage first
      spotifyService.loadTokensFromStorage();
      
      // Check if user is authenticated
      const authenticated = spotifyService.isAuthenticated();
      
      if (authenticated) {
        try {
          // Validate authentication by fetching user profile
          await spotifyService.getUserProfile();
          setIsAuthenticated(true);
        } catch (error) {
          console.error('Token validation failed:', error);
          // Clear invalid tokens
          spotifyService.clearTokens();
          setIsAuthenticated(false);
        }
      } else {
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuthStateChange = (authenticated) => {
    setIsAuthenticated(authenticated);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-black">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full mx-auto mb-4"
          />
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="text-gray-300 text-lg font-medium"
          >
            Loading your music personality...
          </motion.p>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="text-gray-500 text-sm mt-2"
          >
            Connecting to Spotify
          </motion.p>
        </motion.div>
      </div>
    );
  }

  return (
    <Router>
      <div className="App min-h-screen bg-gray-50 dark:bg-gray-900">
        <Routes>
          <Route 
            path="/" 
            element={
              isAuthenticated ? (
                <Dashboard onAuthStateChange={handleAuthStateChange} />
              ) : (
                <LoginPage onAuthStateChange={handleAuthStateChange} />
              )
            } 
          />
          <Route 
            path="/dashboard" 
            element={
              isAuthenticated ? (
                <Dashboard onAuthStateChange={handleAuthStateChange} />
              ) : (
                <LoginPage onAuthStateChange={handleAuthStateChange} />
              )
            } 
          />
          <Route 
            path="/callback" 
            element={<RedirectHandler />} 
          />
          {/* Fallback route */}
          <Route 
            path="*" 
            element={
              <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="text-center">
                  <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                    404 - Page Not Found
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    The page you're looking for doesn't exist.
                  </p>
                  <button
                    onClick={() => window.location.href = '/'}
                    className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg transition-colors duration-200"
                  >
                    Go Home
                  </button>
                </div>
              </div>
            } 
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;