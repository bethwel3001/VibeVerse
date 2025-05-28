import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, RefreshCw, Download, Share2 } from 'lucide-react';
import spotifyService from '../services/spotify';
import { openaiService } from '../services/openai';
import { calculateMoodProfile, getPersonalityType, generateMoodInsights } from '../utils/moodUtils';
import { getTimeBasedGreeting } from '../utils/themeUtils';
import MoodAura from '../components/MoodAura';
import ChartPanel from '../components/ChartPanel';
import TopTracks from '../components/TopTracks';
import TopArtists from '../components/TopArtists';
import RoastMe from '../components/RoastMe';
import CardExporter from '../components/CardExporter';

const Dashboard = () => {
  const [userData, setUserData] = useState(null);
  const [moodProfile, setMoodProfile] = useState(null);
  const [personality, setPersonality] = useState(null);
  const [roast, setRoast] = useState('');
  const [insights, setInsights] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadUserData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const data = await spotifyService.getComprehensiveUserData();
      setUserData(data);
      
      // Calculate mood profile
      const mood = calculateMoodProfile(data.audioFeatures);
      setMoodProfile(mood);
      
      // Generate personality
      const topGenres = data.topArtists.items.flatMap(artist => artist.genres || []);
      const personalityType = getPersonalityType(mood, topGenres);
      setPersonality(personalityType);
      
      // Generate insights
      const moodInsights = generateMoodInsights(mood);
      setInsights(moodInsights);
      
      // Generate AI roast (optional, fallback if API fails)
      try {
        const aiRoast = await openaiService.generateRoast(data);
        setRoast(aiRoast);
      } catch (aiError) {
        console.warn('AI roast generation failed, using fallback:', aiError);
        setRoast(generateFallbackRoast(personalityType, mood));
      }
      
    } catch (err) {
      console.error('Error loading user data:', err);
      setError('Failed to load your music data. Please try refreshing.');
    } finally {
      setIsLoading(false);
    }
  };

  const generateFallbackRoast = (personality, mood) => {
    const roasts = [
      `${personality.name}? More like someone who thinks they're the main character of a music documentary that nobody asked for! 🎬`,
      `Your music taste is so unique, it's like a snowflake... if snowflakes were made of pure auditory confusion! ❄️`,
      `I see you listen to music like you're composing the soundtrack to your own indie film. Very artistic, very dramatic! 🎭`,
      `Your playlist is more unpredictable than the weather forecast. Keeps everyone on their toes! 🌦️`
    ];
    
    return roasts[Math.floor(Math.random() * roasts.length)];
  };

  const handleLogout = () => {
    spotifyService.removeAccessToken();
    window.location.reload();
  };

  useEffect(() => {
    loadUserData();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-spotify-black via-spotify-dark-gray to-spotify-black flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <motion.div
            animate={{ rotate: 360, scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-6xl mb-6"
          >
            🎵
          </motion.div>
          <h2 className="text-3xl font-bold text-white mb-4">
            Analyzing Your Musical Soul...
          </h2>
          <p className="text-spotify-light-gray mb-6">
            We're diving deep into your Spotify data to create your personalized vibe profile
          </p>
          <div className="w-64 bg-spotify-medium-gray rounded-full h-2 mx-auto">
            <motion.div
              className="bg-gradient-to-r from-spotify-green to-neon-blue h-2 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: '100%' }}
              transition={{ duration: 3, repeat: Infinity }}
            />
          </div>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-spotify-black via-spotify-dark-gray to-spotify-black flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md"
        >
          <div className="text-6xl mb-6">😵</div>
          <h2 className="text-2xl font-bold text-white mb-4">Oops! Something went wrong</h2>
          <p className="text-spotify-light-gray mb-6">{error}</p>
          <div className="space-x-4">
            <button
              onClick={loadUserData}
              className="bg-spotify-green hover:bg-spotify-green-dark px-6 py-3 rounded-full text-white font-semibold transition-colors inline-flex items-center gap-2"
            >
              <RefreshCw size={20} />
              Try Again
            </button>
            <button
              onClick={handleLogout}
              className="bg-spotify-medium-gray hover:bg-gray-600 px-6 py-3 rounded-full text-white font-semibold transition-colors inline-flex items-center gap-2"
            >
              <LogOut size={20} />
              Logout
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-spotify-black via-spotify-dark-gray to-spotify-black">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-50 glass-dark border-b border-white/10"
      >
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white">
              <span className="gradient-text">VibeMatch</span>
            </h1>
            <p className="text-spotify-light-gray text-sm">
              {getTimeBasedGreeting()}, {userData?.user?.display_name}!
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            <button
              onClick={loadUserData}
              className="p-2 rounded-full bg-spotify-medium-gray hover:bg-gray-600 transition-colors"
              title="Refresh Data"
            >
              <RefreshCw size={20} className="text-white" />
            </button>
            <button
              onClick={handleLogout}
              className="p-2 rounded-full bg-red-500/20 hover:bg-red-500/30 transition-colors"
              title="Logout"
            >
              <LogOut size={20} className="text-red-400" />
            </button>
          </div>
        </div>
      </motion.header>

      <div className="container mx-auto px-6 py-12">
        {/* Hero Section with Mood Aura */}
        <motion.section
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center mb-16"
        >
          <MoodAura moodProfile={moodProfile} personality={personality} />
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-8"
          >
            <h2 className="text-4xl font-bold text-white mb-4">
              You are <span className="gradient-text">{personality?.name}</span>
            </h2>
            <p className="text-xl text-spotify-light-gray mb-6 max-w-2xl mx-auto">
              {personality?.description}
            </p>
            
            {insights.length > 0 && (
              <div className="space-y-2">
                {insights.map((insight, index) => (
                  <motion.p
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + index * 0.1 }}
                    className="text-spotify-light-gray"
                  >
                    {insight}
                  </motion.p>
                ))}
              </div>
            )}
          </motion.div>
        </motion.section>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          {/* Left Column */}
          <div className="lg:col-span-1 space-y-8">
            <ChartPanel moodProfile={moodProfile} />
            <TopArtists artists={userData?.topArtists?.items || []} />
          </div>

          {/* Middle Column */}
          <div className="lg:col-span-1 space-y-8">
            <TopTracks tracks={userData?.topTracks?.items || []} />
          </div>

          {/* Right Column */}
          <div className="lg:col-span-1 space-y-8">
            <RoastMe roast={roast} personality={personality} />
            <CardExporter 
              userData={userData} 
              moodProfile={moodProfile} 
              personality={personality} 
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;