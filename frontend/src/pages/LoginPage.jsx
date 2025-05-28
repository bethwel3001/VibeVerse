import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Music, Sparkles, TrendingUp, Heart } from 'lucide-react';
import AuthButton from '../components/AuthButton';
import { getTimeBasedGreeting } from '../utils/themeUtils';

const LoginPage = () => {
  useEffect(() => {
    // Preload some assets or setup analytics
    document.title = 'vibematch - your music personality unlocked.';
  }, []);

  const features = [
    {
      icon: <Music className="w-8 h-8" />,
      title: "Analyze Your Taste",
      description: "Deep dive into your Spotify listening habits and discover patterns you never knew existed."
    },
    {
      icon: <TrendingUp className="w-8 h-8" />,
      title: "Mood Insights",
      description: "Get detailed breakdowns of your music's energy, happiness, and danceability levels."
    },
    {
      icon: <Heart className="w-8 h-8" />,
      title: "Get Roasted",
      description: "Let our AI humorously roast your music taste (don't worry, it's all in good fun!)."
    },
    {
      icon: <Sparkles className="w-8 h-8" />,
      title: "Share Your Vibe",
      description: "Create beautiful vibe cards to share your music personality on social media."
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-spotify-black via-spotify-dark-gray to-spotify-black overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-72 h-72 bg-spotify-green/10 rounded-full blur-3xl animate-pulse-slow"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-neon-pink/10 rounded-full blur-3xl animate-pulse-slow delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-neon-blue/5 rounded-full blur-3xl animate-spin-slow"></div>
      </div>

      <div className="relative z-10 container mx-auto px-6 py-12">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 4, repeat: Infinity }}
            className="text-8xl mb-8"
          >
            🎵
          </motion.div>
          
          <h1 className="text-6xl md:text-7xl font-black mb-6">
            <span className="text-white">{getTimeBasedGreeting()}, </span>
            <span className="gradient-text">music lover</span>
          </h1>
          
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-xl md:text-2xl text-spotify-light-gray mb-8 max-w-3xl mx-auto leading-relaxed"
          >
            Ready to discover what your Spotify history says about you? 
            <br />
            <span className="text-spotify-green font-semibold">VibeMatch</span> analyzes your music taste, 
            reveals your personality, and roasts you (lovingly) for it.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6 }}
          >
            <AuthButton />
          </motion.div>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.8 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16"
        >
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 + index * 0.1 }}
              whileHover={{ scale: 1.05, y: -5 }}
              className="glass rounded-2xl p-6 text-center group hover:shadow-neon transition-all duration-300"
            >
              <div className="text-spotify-green mb-4 group-hover:scale-110 transition-transform">
                {feature.icon}
              </div>
              <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
              <p className="text-spotify-light-gray text-sm leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </motion.div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="text-center"
        >
          <p className="text-spotify-light-gray mb-4">
            Join thousands of music lovers who've discovered their vibe
          </p>
          <div className="flex justify-center items-center space-x-4 text-sm text-spotify-light-gray">
            <span>🔒 Secure</span>
            <span>⚡ Fast</span>
            <span>🎯 Accurate</span>
            <span>😂 Fun</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default LoginPage;
