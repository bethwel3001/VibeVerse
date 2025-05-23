import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { motion } from 'framer-motion';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import RedirectHandler from './pages/RedirectHandler';
import { spotifyService } from './services/spotify';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const token = spotifyService.getAccessToken();
      if (token) {
        try {
          await spotifyService.getCurrentUser();
          setIsAuthenticated(true);
        } catch (error) {
          console.error('Token validation failed:', error);
          spotifyService.removeAccessToken();
        }
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-spotify-black">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 border-4 border-spotify-green border-t-transparent rounded-full mx-auto mb-4"
          />
          <p className="text-spotify-light-gray">Loading VibeMatch...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <Router>
      <div className="App">
        <Routes>
          <Route 
            path="/" 
            element={
              isAuthenticated ? <Dashboard /> : <LoginPage />
            } 
          />
          <Route 
            path="/callback" 
            element={<RedirectHandler setIsAuthenticated={setIsAuthenticated} />} 
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;