import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import {
  getVibeSummary,
  getTopArtists,
  getTopTracks,
  getMe,
  getNowPlaying,
  logout
} from '../api/spotify';
import { exportElementAsPNG, exportElementAsPDF } from '../utils/exportUtils';

import {
  FaShareAlt, FaFilePdf, FaSignOutAlt, FaRedoAlt, FaSpotify,
  FaPlay, FaPause, FaDownload, FaSyncAlt, FaMusic, FaImage
} from 'react-icons/fa';

import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, CartesianGrid
} from 'recharts';

// Disable Sentry in development to prevent refresh loops
if (process.env.NODE_ENV === 'development') {
  // Prevent Sentry from causing infinite re-renders
  if (window.__SENTRY__) {
    window.__SENTRY__.logger = {
      enable: () => {},
      disable: () => {}
    };
  }
  // Block Sentry initialization
  window.Sentry = {
    init: () => {},
    captureException: () => {}
  };
}

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [nowPlaying, setNowPlaying] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fatalError, setFatalError] = useState(null);
  const [tab, setTab] = useState('short_term');
  const [shareToast, setShareToast] = useState('');
  const [isLocalPlaying, setIsLocalPlaying] = useState(false);

  const dashboardRef = useRef(null);
  const audioRef = useRef(null);
  const pollIntervalRef = useRef(null);
  const navigate = useNavigate();

  // Debug mount/unmount
  useEffect(() => {
    console.log('Dashboard MOUNTED');
    return () => {
      console.log('Dashboard UNMOUNTED');
    };
  }, []);

  // theme / chart colors
  const GREEN = '#1DB954';
  const PIE_COLORS = [GREEN, '#7C3AED', '#22D3EE', '#F472B6', '#F59E0B', '#60A5FA'];

  // motion (load only, no whileInView to avoid re-triggers)
  const cardMotion = {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    transition: { type: 'spring', stiffness: 140, damping: 18, duration: 0.35 }
  };
  const microTap = { whileTap: { scale: 0.985 } };

  // ---------------- STABLE DATA FETCHING (No more loops) ----------------
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setFatalError(null);

      const data = await getVibeSummary();
      
      // Simple client-side fallback without modifying original data
      const processedData = { ...data };
      if ((processedData?.topTracks?.length || 0) === 0 && (processedData?.recentlyPlayed?.length || 0) > 0) {
        const mapped = (processedData.recentlyPlayed || []).map(r => r.track).filter(Boolean);
        processedData.topTracks = mapped.slice(0, 8);
      }
      
      setSummary(processedData);
    } catch (error) {
      console.error('Dashboard fetch error', error);
      try {
        const [me, artists, tracks] = await Promise.all([
          getMe().catch(() => null),
          getTopArtists(8, 'short_term').catch(() => ({ items: [] })),
          getTopTracks(8, 'short_term').catch(() => ({ items: [] }))
        ]);
        
        const fallbackData = {
          profile: me,
          topArtists: artists.items || [],
          topTracks: tracks.items || [],
          top: { 
            artists: { short_term: artists.items || [] }, 
            tracks: { short_term: tracks.items || [] } 
          },
          recentlyPlayed: [],
          activityByHour: Array.from({ length: 24 }, (_, h) => ({ hour: h, plays: 0 })),
          topGenres: [],
          audioFeaturesAvg: null,
          roast: null,
          vibe: null,
          playlists: [],
          nowPlaying: {},
          _errors: { fallback: true }
        };
        
        setSummary(fallbackData);
      } catch (fallbackError) {
        console.error('Fallback fetch failed', fallbackError);
        setFatalError('⚠ Failed to load Spotify data. Please log out and reconnect to Spotify, making sure to grant all required scopes.');
      }
    } finally {
      setLoading(false);
    }
  }, []); 
  const pollNowPlaying = useCallback(async () => {
    try {
      const np = await getNowPlaying();
      setNowPlaying(prev => {
        // Deep comparison to prevent unnecessary re-renders
        if (!np || JSON.stringify(np) === JSON.stringify(prev)) return prev;
        return np;
      });
    } catch (error) {
      // Silent fail for polling
      console.debug('Now playing poll failed:', error.message);
    }
  }, []);
  useEffect(() => {
    let mounted = true;
    
    const initializeDashboard = async () => {
      if (mounted) {
        await fetchData();
        await pollNowPlaying();
        
        // Start polling only after initial load
        pollIntervalRef.current = setInterval(pollNowPlaying, 15000); // Reduced to 15s
      }
    };

    initializeDashboard();

    return () => {
      mounted = false;
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
        setIsLocalPlaying(false);
      }
    };
  }, []); // EMPTY dependencies - run only once

  const lineData = useMemo(() => {
    if (!summary?.recentlyPlayed) return [];
    
    const recent = summary.recentlyPlayed;
    const playCounts = {};
    const now = new Date();
    
    // Initialize last 30 days
    for (let i = 0; i < 30; i++) {
      const date = new Date(now);
      date.setDate(now.getDate() - i);
      const key = date.toISOString().slice(0, 10);
      playCounts[key] = 0;
    }
    
    // Count plays
    for (const item of recent) {
      const timestamp = item.played_at || item.timestamp;
      if (!timestamp) continue;
      const dateKey = new Date(timestamp).toISOString().slice(0, 10);
      if (playCounts[dateKey] !== undefined) {
        playCounts[dateKey] += 1;
      }
    }
    
    return Object.keys(playCounts)
      .sort()
      .map(date => ({ 
        date: date.slice(5), // MM-DD format
        plays: playCounts[date] 
      }));
  }, [summary?.recentlyPlayed]); // Only depend on recentlyPlayed

  const pieData = useMemo(() => {
    return (summary?.topGenres || []).map((genre, index) => ({
      name: genre.genre,
      value: genre.count,
      fill: PIE_COLORS[index % PIE_COLORS.length]
    }));
  }, [summary?.topGenres]); // Only depend on topGenres

  // Optimized artist derivation
  const derivedTopArtists = useMemo(() => {
    const artistMap = new Map();
    
    const addArtistToMap = (artist, sampleTrack = null) => {
      if (!artist?.id) return;
      
      const existing = artistMap.get(artist.id) || { 
        id: artist.id, 
        name: artist.name, 
        hits: 0, 
        image: null, 
        genres: [] 
      };
      
      existing.hits += 1;
      
      // Try to find better image from top artists data
      if (!existing.image) {
        const artistPools = [
          ...(summary?.top?.artists?.short_term || []),
          ...(summary?.top?.artists?.medium_term || []),
          ...(summary?.top?.artists?.long_term || [])
        ];
        
        const foundArtist = artistPools.find(a => a.id === artist.id);
        if (foundArtist?.images?.[0]?.url) {
          existing.image = foundArtist.images[0].url;
        } else if (sampleTrack?.album?.images?.[0]?.url) {
          existing.image = sampleTrack.album.images[0].url;
        }
      }
      
      // Get genres from found artist
      if (existing.genres.length === 0) {
        const artistPools = [
          ...(summary?.top?.artists?.short_term || []),
          ...(summary?.top?.artists?.medium_term || []),
          ...(summary?.top?.artists?.long_term || [])
        ];
        const foundArtist = artistPools.find(a => a.id === artist.id);
        if (foundArtist?.genres?.length) {
          existing.genres = foundArtist.genres;
        }
      }
      
      artistMap.set(artist.id, existing);
    };

    // Process top tracks artists
    (summary?.topTracks || []).forEach(track => {
      (track?.artists || []).forEach(artist => addArtistToMap(artist, track));
    });

    // Fallback to recently played if needed
    if (artistMap.size < 6) {
      (summary?.recentlyPlayed || []).slice(0, 30).forEach(recent => {
        (recent?.track?.artists || []).forEach(artist => addArtistToMap(artist, recent.track));
      });
    }

    return Array.from(artistMap.values())
      .sort((a, b) => b.hits - a.hits)
      .slice(0, 12);
  }, [summary?.topTracks, summary?.recentlyPlayed, summary?.top?.artists]); // Specific dependencies

  const simpleRoast = useCallback(() => {
    const artists = derivedTopArtists || [];
    const tracks = summary?.topTracks || [];
    
    if (!artists.length && !tracks.length) {
      return "Your listening history is as mysterious as a demo playlist. Time to press play!";
    }
    
    const topArtist = artists[0]?.name;
    const topTrack = tracks[0]?.name;
    
    if (topArtist && topTrack) {
      return `You loop ${topArtist} religiously and call ${topTrack} 'musical variety'. Bold move.`;
    }
    if (topArtist) {
      return `Your vibe is basically ${topArtist} on repeat with occasional identity crises.`;
    }
    if (topTrack) {
      return `You play '${topTrack}' so much, it's basically your personality now.`;
    }
    
    return "Chaotic neutral energy detected. We respect the randomness.";
  }, [derivedTopArtists, summary?.topTracks]);

  useEffect(() => {
    const currentTrackId = nowPlaying?.item?.id;
    const previewUrl = nowPlaying?.item?.preview_url;
    
    // Clean up previous audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setIsLocalPlaying(false);
    }
    
    // Setup new audio if available
    if (previewUrl) {
      const audio = new Audio(previewUrl);
      audio.crossOrigin = 'anonymous';
      audio.preload = 'none';
      
      audio.onended = () => setIsLocalPlaying(false);
      audio.onerror = () => {
        console.debug('Audio playback error');
        setIsLocalPlaying(false);
      };
      audio.onloadstart = () => console.debug('Audio loading started');
      
      audioRef.current = audio;
    }
  }, [nowPlaying?.item?.id, nowPlaying?.item?.preview_url]);

  const toggleLocalPlay = async () => {
    try {
      const previewUrl = nowPlaying?.item?.preview_url;
      
      // Handle preview audio playback
      if (previewUrl && audioRef.current) {
        if (!isLocalPlaying) {
          await audioRef.current.play();
          setIsLocalPlaying(true);
        } else {
          audioRef.current.pause();
          setIsLocalPlaying(false);
        }
        return;
      }
      
      // Fallback to Spotify player control
      try {
        const response = await fetch(
          `${process.env.REACT_APP_SERVER_URL || 'http://127.0.0.1:5000'}/api/player/toggle`,
          {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );
        
        if (response.ok) {
          await pollNowPlaying();
        } else {
          throw new Error('Player control failed');
        }
      } catch (playerError) {
        // Final fallback - open in Spotify
        const trackId = nowPlaying?.item?.id;
        if (trackId) {
          const spotifyUri = `spotify:track:${trackId}`;
          const spotifyWebUrl = `https://open.spotify.com/track/${trackId}`;
          
          // Try URI first, then web URL
          const opened = window.open(spotifyUri, '_blank');
          if (!opened || opened.closed || typeof opened.closed === 'undefined') {
            window.open(spotifyWebUrl, '_blank');
          }
        }
      }
    } catch (error) {
      console.error('Playback control error:', error);
      setShareToast('Playback not available in this browser');
      setTimeout(() => setShareToast(''), 2000);
    }
  };

  const handleExportPNG = async () => {
    if (!dashboardRef.current) {
      setShareToast('Export failed: No content');
      setTimeout(() => setShareToast(''), 2000);
      return;
    }
    
    try {
      await exportElementAsPNG(dashboardRef.current, 'vibeify-dashboard.png');
      setShareToast('Exported as PNG!');
      setTimeout(() => setShareToast(''), 2000);
    } catch (error) {
      console.error('PNG export error:', error);
      setShareToast('Export failed');
      setTimeout(() => setShareToast(''), 2000);
    }
  };

  const handleExportPDF = async () => {
    if (!dashboardRef.current) {
      setShareToast('Export failed: No content');
      setTimeout(() => setShareToast(''), 2000);
      return;
    }
    
    try {
      await exportElementAsPDF(dashboardRef.current, 'vibeify-dashboard.pdf');
      setShareToast('Exported as PDF!');
      setTimeout(() => setShareToast(''), 2000);
    } catch (error) {
      console.error('PDF export error:', error);
      setShareToast('Export failed');
      setTimeout(() => setShareToast(''), 2000);
    }
  };

  const handleShareRoast = async () => {
    const roastText = summary?.roast || simpleRoast();
    
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'My Vibeify Roast',
          text: roastText,
        });
        setShareToast('Shared!');
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(roastText);
        setShareToast('Copied to clipboard!');
      } else {
        setShareToast('Sharing not supported');
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        setShareToast('Share failed');
      }
    }
    
    setTimeout(() => setShareToast(''), 2000);
  };

  const handleShareVibe = async () => {
    const vibeText = summary?.vibe || 'Check out my music vibe on Vibeify!';
    
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'My Music Vibe',
          text: vibeText,
        });
        setShareToast('Shared!');
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(vibeText);
        setShareToast('Copied to clipboard!');
      } else {
        setShareToast('Sharing not supported');
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        setShareToast('Share failed');
      }
    }
    
    setTimeout(() => setShareToast(''), 2000);
  };

  const handleManualRefresh = async () => {
    setLoading(true);
    await fetchData();
    await pollNowPlaying();
    setShareToast('Data refreshed!');
    setTimeout(() => setShareToast(''), 2000);
  };

  // ---------------- RENDER STATES ----------------
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-black via-gray-900 to-black text-green-500">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
          <div className="text-lg font-semibold">Loading your musical vibe...</div>
          <p className="text-sm text-gray-400 mt-2">This may take a moment</p>
        </div>
      </div>
    );
  }

  if (fatalError) {
    return (
      <div className="min-h-screen bg-black text-white">
        <Navbar />
        <main className="max-w-3xl mx-auto px-4 pt-28 text-center">
          <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-6 mb-6">
            <p className="text-red-400 font-bold italic text-lg mb-3">{fatalError}</p>
            <p className="text-sm text-gray-400 mb-4">
              Way forward: Log out completely, then reconnect to Spotify. Make sure you approve all the scopes we request.
            </p>
          </div>
          <button 
            onClick={fetchData} 
            className="px-6 py-3 bg-green-500 hover:bg-green-600 text-black rounded-lg inline-flex items-center gap-2 transition-colors"
          >
            <FaRedoAlt /> Retry Loading
          </button>
        </main>
      </div>
    );
  }

  const profile = summary?.profile || {};
  const effectiveRoast = summary?.roast || simpleRoast();
  const currentTabTracks = summary?.top?.tracks?.[tab] || [];
  const hasTopArtists = derivedTopArtists.length > 0;
  const hasTopTracks = currentTabTracks.length > 0;
  const hasRecentPlays = summary?.recentlyPlayed?.length > 0;
  const hasPlaylists = summary?.playlists?.length > 0;
  const hasChartData = lineData.length > 0;
  const hasGenreData = pieData.length > 0;

  // Card Component
  const Card = ({ children, className = '' }) => (
    <motion.div 
      {...cardMotion} 
      className={`relative rounded-2xl p-4 shadow-lg bg-gradient-to-br from-[#061116] to-[#07121a] border border-white/6 backdrop-blur-sm ${className}`}
    >
      {children}
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black text-gray-100">
      <Navbar />
      
      <main className="max-w-6xl mx-auto px-4 pt-24 pb-16" ref={dashboardRef}>
        {/* Header Section */}
        <header className="flex flex-col md:flex-row items-start md:items-center gap-6 mb-8">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            {profile?.images?.[0]?.url ? (
              <img 
                src={profile.images[0].url} 
                className="w-20 h-20 rounded-full border-3 border-green-500 shadow-lg" 
                alt="Profile" 
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gray-800 flex items-center justify-center border-3 border-green-500 text-2xl">
                🎧
              </div>
            )}
            <div className="space-y-1 min-w-0 flex-1">
              <h1 className="text-3xl font-bold text-green-400 truncate">
                Hello {profile?.display_name || 'Music Lover'} <span className="ml-2">👋</span>
              </h1>
              <p className="text-blue-300/90 text-sm md:text-base">
                Your personal music analytics dashboard
              </p>
              <p className="text-blue-300/90 text-sm md:text-base">
                with roasts
              </p>
              <p className="text-xs text-gray-400">
                Account type: <span className="text-blue-300 font-medium">
                  {profile?.product ? profile.product.toUpperCase() : '—'}
                </span>
              </p>
            </div>
          </div>

          {/* Action Controls */}
          <div className="flex items-center gap-3 flex-wrap justify-end">
            <motion.button 
              {...microTap}
              onClick={handleManualRefresh}
              className="px-4 py-2.5 border border-blue-500 text-blue-300 rounded-xl hover:bg-blue-500 hover:text-white transition-all duration-200 inline-flex items-center gap-2 text-sm font-medium"
            >
              <FaSyncAlt /> Refresh Data
            </motion.button>
            <motion.button 
              {...microTap}
              onClick={handleExportPNG}
              className="px-4 py-2.5 border border-green-500 rounded-xl hover:bg-green-500 hover:text-black transition-all duration-200 inline-flex items-center gap-2 text-sm font-medium"
            >
              <FaImage /> Export PNG
            </motion.button>
            <motion.button 
              {...microTap}
              onClick={handleExportPDF}
              className="px-4 py-2.5 border border-green-500 rounded-xl hover:bg-green-500 hover:text-black transition-all duration-200 inline-flex items-center gap-2 text-sm font-medium"
            >
              <FaFilePdf /> Export PDF
            </motion.button>
            <motion.button 
              {...microTap}
              onClick={async () => { 
                await logout(); 
                navigate('/'); 
              }}
              className="px-4 py-2.5 border border-red-500 text-red-400 rounded-xl hover:bg-red-500 hover:text-black transition-all duration-200 inline-flex items-center gap-2 text-sm font-medium"
            >
              <FaSignOutAlt /> Sign Out
            </motion.button>
          </div>
        </header>

        {/* Now Playing Card */}
        <section className="mb-8">
          <Card className="p-4">
            <div className="flex flex-col lg:flex-row lg:items-center gap-4">
              {/* Track Info */}
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="w-16 h-16 rounded-xl overflow-hidden ring-2 ring-white/10 shadow-lg flex-shrink-0">
                  {nowPlaying?.item?.album?.images?.[0]?.url ? (
                    <img 
                      src={nowPlaying.item.album.images[0].url} 
                      alt="Album cover" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                      <FaMusic className="text-gray-400 text-xl" />
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <FaSpotify className="text-green-500 text-lg flex-shrink-0" />
                    <span className="text-lg font-semibold truncate">
                      {nowPlaying?.item?.name || 'No track playing'}
                    </span>
                    {nowPlaying?.is_playing && (
                      <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-medium">
                        LIVE
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-300 truncate">
                    {(nowPlaying?.item?.artists || []).map(artist => artist.name).join(', ') || '—'}
                  </div>
                  {nowPlaying?.item?.album?.name && (
                    <div className="text-xs text-gray-400 truncate">
                      Album: {nowPlaying.item.album.name}
                    </div>
                  )}
                </div>
              </div>

              {/* Playback Controls */}
              <div className="flex items-center gap-3 flex-wrap">
                <motion.button 
                  {...microTap}
                  onClick={pollNowPlaying}
                  className="px-4 py-2 rounded-xl border border-white/10 hover:border-green-500/40 hover:bg-white/5 transition-all duration-200 inline-flex items-center gap-2 text-sm"
                >
                  <FaSyncAlt /> Refresh
                </motion.button>

                {nowPlaying?.item?.id && (
                  <motion.button 
                    {...microTap}
                    onClick={toggleLocalPlay}
                    className="px-4 py-2 rounded-xl bg-green-500 hover:bg-green-600 text-black font-medium transition-all duration-200 inline-flex items-center gap-2 text-sm"
                  >
                    {isLocalPlaying ? <><FaPause /> Pause</> : <><FaPlay /> Play Preview</>}
                  </motion.button>
                )}

                {nowPlaying?.item?.id && (
                  <a 
                    href={`https://open.spotify.com/track/${nowPlaying.item.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 rounded-xl border border-white/10 hover:border-green-500/40 hover:bg-white/5 transition-all duration-200 inline-flex items-center gap-2 text-sm"
                  >
                    Open in Spotify
                  </a>
                )}
              </div>
            </div>

            {/* Spotify Embed */}
            {nowPlaying?.item?.id && (
              <div className="mt-4">
                <iframe
                  title="spotify-track-embed"
                  className="w-full h-24 rounded-xl border border-white/10 shadow-lg"
                  src={`https://open.spotify.com/embed/track/${nowPlaying.item.id}`}
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  loading="lazy"
                />
              </div>
            )}
          </Card>
        </section>

        {/* Time Range Tabs & Top Content */}
        <section className="mb-8">
          <div className="flex gap-3 flex-wrap mb-6">
            {[
              { key: 'short_term', label: '4 Weeks' },
              { key: 'medium_term', label: '6 Months' },
              { key: 'long_term', label: 'All Time' }
            ].map((range) => (
              <motion.button 
                key={range.key}
                whileTap={{ scale: 0.95 }}
                onClick={() => setTab(range.key)}
                className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  tab === range.key 
                    ? 'bg-green-500 text-black shadow-lg' 
                    : 'border border-green-500/40 text-green-300 hover:border-green-500/70 hover:bg-green-500/10'
                }`}
              >
                {range.label}
              </motion.button>
            ))}
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Top Artists */}
            <Card>
              <h3 className="text-green-400 font-bold text-lg mb-4 flex items-center gap-2">
                <span></span> Top Artists
              </h3>

              {hasTopArtists ? (
                <div className="space-y-4">
                  {derivedTopArtists.map((artist, index) => (
                    <motion.div 
                      key={artist.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center gap-4 bg-gray-900/50 p-3 rounded-xl border border-green-500/10 hover:border-green-500/30 transition-all duration-200"
                    >
                      <div className="w-14 h-14 rounded-lg overflow-hidden bg-gray-800 flex-shrink-0 shadow-md">
                        {artist.image ? (
                          <img 
                            src={artist.image} 
                            alt={artist.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <FaMusic />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-100 truncate">
                          {artist.name}
                        </div>
                        <div className="text-sm text-gray-400 truncate">
                          {artist.genres[0] || 'Various genres'}
                        </div>
                        <div className="text-xs text-green-400 mt-1">
                          {artist.hits} plays
                        </div>
                      </div>

                      <div className="text-lg font-bold text-green-400 w-8 text-center">
                        {index + 1}
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-yellow-400 text-4xl mb-3"></div>
                  <p className="text-yellow-400 font-semibold mb-2">
                    Not enough artist data yet
                  </p>
                  <p className="text-sm text-gray-400">
                    Keep listening to build your artist history
                  </p>
                </div>
              )}
            </Card>

            {/* Top Tracks */}
            <Card>
              <h3 className="text-green-400 font-bold text-lg mb-4 flex items-center gap-2">
                <span></span> Top Tracks
              </h3>

              {hasTopTracks ? (
                <div className="space-y-4">
                  {currentTabTracks.slice(0, 12).map((track, index) => (
                    <motion.div 
                      key={track.id || `${track.name}-${index}`}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center gap-4 bg-gray-900/50 p-3 rounded-xl border border-green-500/10 hover:border-green-500/30 transition-all duration-200"
                    >
                      <div className="w-14 h-14 rounded-lg overflow-hidden bg-gray-800 flex-shrink-0 shadow-md">
                        <img 
                          src={track.album?.images?.[0]?.url || ''} 
                          alt={track.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-100 truncate">
                          {track.name}
                        </div>
                        <div className="text-sm text-gray-400 truncate">
                          {(track.artists || []).map(artist => artist.name).join(', ')}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {track.album?.name}
                        </div>
                      </div>

                      <div className="text-lg font-bold text-green-400 w-8 text-center">
                        {index + 1}
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-yellow-400 text-4xl mb-3"></div>
                  <p className="text-yellow-400 font-semibold mb-2">
                    No top tracks for this period
                  </p>
                  <p className="text-sm text-gray-400">
                    Your listening history will appear here over time
                  </p>
                </div>
              )}
            </Card>
          </div>
        </section>

        {/* Charts Section */}
        <section className="mb-8">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Listening Activity Chart */}
            <Card>
              <h3 className="text-green-400 font-bold text-lg mb-4">
                Listening Activity (30 Days)
              </h3>
              
              {hasChartData ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={lineData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#0b1220" />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 11, fill: '#9CA3AF' }}
                        interval="preserveStartEnd"
                      />
                      <YAxis 
                        tick={{ fontSize: 11, fill: '#9CA3AF' }} 
                        allowDecimals={false}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#071018', 
                          borderRadius: 8,
                          border: '1px solid #1DB954'
                        }} 
                        itemStyle={{ color: '#fff' }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="plays" 
                        stroke={GREEN}
                        strokeWidth={3}
                        dot={{ r: 3, fill: GREEN }}
                        activeDot={{ r: 6, fill: '#fff', stroke: GREEN, strokeWidth: 2 }}
                        isAnimationActive={true}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-yellow-400 text-4xl mb-3"></div>
                    <p className="text-yellow-400 font-semibold mb-2">
                      Not enough recent activity
                    </p>
                    <p className="text-sm text-gray-400">
                      Your 30-day chart will appear here
                    </p>
                  </div>
                </div>
              )}
            </Card>

            {/* Genre Distribution */}
            <Card>
              <h3 className="text-green-400 font-bold text-lg mb-4">
               Genre Distribution
              </h3>
              
              {hasGenreData ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={50}
                        outerRadius={90}
                        paddingAngle={2}
                        label={({ name, percent }) => 
                          `${name} (${(percent * 100).toFixed(0)}%)`
                        }
                        labelLine={false}
                        isAnimationActive={true}
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value, name) => [value, name]}
                        contentStyle={{ 
                          backgroundColor: '#071018',
                          borderRadius: 8,
                          border: '1px solid #1DB954'
                        }}
                      />
                      <Legend 
                        verticalAlign="bottom" 
                        height={36}
                        iconType="circle"
                        formatter={(value) => <span style={{ color: '#fff', fontSize: '12px' }}>{value}</span>}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-yellow-400 text-4xl mb-3"></div>
                    <p className="text-yellow-400 font-semibold mb-2">
                      No genre data available
                    </p>
                    <p className="text-sm text-gray-400">
                      Genres will appear as you listen to more artists
                    </p>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </section>

        {/* Recently Played & Playlists */}
        <section className="mb-8">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Recently Played */}
            <Card>
              <h3 className="text-green-400 font-bold text-lg mb-4">
                Recently Played
              </h3>

              {hasRecentPlays ? (
                <div className="grid gap-4 max-h-96 overflow-y-auto pr-2">
                  {summary.recentlyPlayed.map((recent, index) => (
                    <motion.div 
                      key={recent.played_at || index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center gap-3 bg-gray-900/50 p-3 rounded-xl border border-green-500/10 hover:border-green-500/30 transition-all duration-200"
                    >
                      <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                        <img 
                          src={recent.track?.album?.images?.[0]?.url || ''} 
                          alt="Track cover"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-100 truncate text-sm">
                          {recent.track?.name}
                        </div>
                        <div className="text-xs text-gray-400 truncate">
                          {(recent.track?.artists || []).map(artist => artist.name).join(', ')}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {new Date(recent.played_at).toLocaleDateString()} • {new Date(recent.played_at).toLocaleTimeString()}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-yellow-400 text-4xl mb-3"></div>
                  <p className="text-yellow-400 font-semibold mb-2">
                    No recent plays found
                  </p>
                  <p className="text-sm text-gray-400">
                    Play some music to see your recent activity here
                  </p>
                </div>
              )}
            </Card>

            {/* Playlists */}
            <Card>
              <h3 className="text-green-400 font-bold text-lg mb-4">
              Your Playlists
              </h3>

              {hasPlaylists ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-96 overflow-y-auto pr-2">
                  {summary.playlists.slice(0, 12).map((playlist, index) => (
                    <motion.div 
                      key={playlist.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.1 }}
                      className="bg-gray-900/50 p-3 rounded-xl border border-green-500/10 hover:border-green-500/30 transition-all duration-200"
                    >
                      <div className="aspect-square rounded-lg overflow-hidden mb-2 shadow-md">
                        <img 
                          src={playlist.images?.[0]?.url || ''} 
                          alt={playlist.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      
                      <div className="space-y-1">
                        <div className="font-semibold text-gray-100 text-sm line-clamp-2 leading-tight">
                          {playlist.name}
                        </div>
                        <div className="text-xs text-gray-400">
                          {playlist.tracks?.total || 0} tracks
                        </div>
                        {playlist.description && (
                          <div className="text-xs text-gray-500 line-clamp-2">
                            {playlist.description}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-yellow-400 text-4xl mb-3"></div>
                  <p className="text-yellow-400 font-semibold mb-2">
                    No playlists found
                  </p>
                  <p className="text-sm text-gray-400">
                    Create or follow playlists to see them here
                  </p>
                </div>
              )}
            </Card>
          </div>
        </section>

        {/* Roast & Vibe Section */}
        <section className="mb-8">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Roast Card */}
            <Card>
              <h3 className="text-green-400 font-bold text-lg mb-4 flex items-center gap-2">
                <span></span> Personalized Roast
              </h3>
              
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-green-500/10 to-purple-500/10 p-4 rounded-xl border border-green-500/20">
                  <p className="text-green-300 italic text-sm leading-relaxed">
                    {effectiveRoast}
                  </p>
                </div>
                
                <div className="flex gap-3 flex-wrap">
                  <motion.button 
                    {...microTap}
                    onClick={handleShareRoast}
                    className="px-4 py-2.5 rounded-xl bg-green-500 hover:bg-green-600 text-black font-medium transition-all duration-200 inline-flex items-center gap-2 text-sm"
                  >
                    <FaShareAlt /> Share Roast
                  </motion.button>
                  
                  <motion.button 
                    {...microTap}
                    onClick={handleManualRefresh}
                    className="px-4 py-2.5 rounded-xl border border-green-500/40 text-green-300 hover:border-green-500/70 hover:bg-green-500/10 transition-all duration-200 inline-flex items-center gap-2 text-sm"
                  >
                    <FaRedoAlt /> New Roast
                  </motion.button>
                </div>
              </div>
            </Card>

            {/* Vibe Card */}
            <Card>
              <h3 className="text-green-400 font-bold text-lg mb-4 flex items-center gap-2">
                <span></span> Your Music Vibe
              </h3>
              
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 p-4 rounded-xl border border-purple-500/20">
                  <p className="text-purple-300 text-sm leading-relaxed">
                    {summary?.vibe || 'Your unique music vibe is being analyzed. Keep listening to unlock personalized insights about your musical personality and preferences.'}
                  </p>
                </div>
                
                <div className="flex gap-3 flex-wrap">
                  <motion.button 
                    {...microTap}
                    onClick={handleShareVibe}
                    className="px-4 py-2.5 rounded-xl bg-purple-500 hover:bg-purple-600 text-white font-medium transition-all duration-200 inline-flex items-center gap-2 text-sm"
                  >
                    <FaShareAlt /> Share Vibe
                  </motion.button>
                  
                  <motion.button 
                    {...microTap}
                    onClick={handleExportPNG}
                    className="px-4 py-2.5 rounded-xl border border-purple-500/40 text-purple-300 hover:border-purple-500/70 hover:bg-purple-500/10 transition-all duration-200 inline-flex items-center gap-2 text-sm"
                  >
                    <FaDownload /> Export Vibe
                  </motion.button>
                </div>
              </div>
            </Card>
          </div>
        </section>

        {/* Footer */}
        <Footer />
      </main>

      {/* Toast Notification */}
      {shareToast && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 rounded-xl border border-green-200 bg-green-600 text-black font-semibold shadow-lg"
        >
          {shareToast}
        </motion.div>
      )}

      {/* Custom Styles */}
      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}