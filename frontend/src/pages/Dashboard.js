import React, { useEffect, useState, useRef } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { getMe, getTopArtists, getTopTracks, getVibeSummary, logout } from '../api/spotify';
import { exportDashboardAsPDF } from '../utils/exportUtils';
import { FaShareAlt, FaFilePdf, FaSignOutAlt, FaRedoAlt } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

// For animations
import { motion } from 'framer-motion';

export default function Dashboard() {
  const [profile, setProfile] = useState(null);
  const [topArtists, setTopArtists] = useState([]);
  const [topTracks, setTopTracks] = useState([]);
  const [roast, setRoast] = useState('');
  const [vibe, setVibe] = useState('');
  const [sources, setSources] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const dashboardRef = useRef();
  const navigate = useNavigate();

  const fetchDirectFallbacks = async () => {
    const artistsResp = await getTopArtists(8, 'medium_term');
    const tracksResp = await getTopTracks(6, 'medium_term');

    return {
      artists: artistsResp?.items || [],
      tracks: tracksResp?.items || [],
    };
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const summary = await getVibeSummary();
      setProfile(summary.profile || null);
      setTopArtists(Array.isArray(summary.topArtists) ? summary.topArtists : []);
      setTopTracks(Array.isArray(summary.topTracks) ? summary.topTracks : []);
      setRoast(summary.roast || '');
      setVibe(summary.vibe || '');
      setSources(summary.sources || null);

      if ((!summary.topArtists || !summary.topArtists.length) || (!summary.topTracks || !summary.topTracks.length)) {
        const { artists, tracks } = await fetchDirectFallbacks();
        if (artists.length && (!summary.topArtists || !summary.topArtists.length)) setTopArtists(artists);
        if (tracks.length && (!summary.topTracks || !summary.topTracks.length)) setTopTracks(tracks);
      }
    } catch (e) {
      console.error('Dashboard fetch error:', e.response?.data || e.message);
      try {
        const me = await getMe();
        setProfile(me);
        const { artists, tracks } = await fetchDirectFallbacks();
        setTopArtists(artists);
        setTopTracks(tracks);
        setRoast(simpleRoastFromStats(artists, tracks));
        setVibe(vibeSentence(artists, tracks));
      } catch (e2) {
        console.error('Fallback fetch failed:', e2.response?.data || e2.message);
        setError('⚠ *Failed to load Spotify data.* Please try logging out and reconnecting with Spotify.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  function simpleRoastFromStats(artists, tracks = []) {
    if ((!artists.length) && (!tracks.length)) return "Your listening is as mysterious as a demo playlist. Go hit play!";
    const firstArtist = artists?.[0]?.name;
    const firstTrack = tracks?.[0]?.name;
    if (firstArtist && firstTrack) return `You loop ${firstArtist} and call ${firstTrack} “variety.”`;
    if (firstArtist) return `You vibe like you put ${firstArtist} on loop and call it “research.”`;
    if (firstTrack) return `You replay ${firstTrack} like it's a thesis topic.`;
    return "Chaotic neutral energy. Respect.";
  }

  function vibeSentence(artists, tracks) {
    const genres = (artists || []).flatMap(a => a.genres || []);
    const topGenre = genres[0];
    if ((!artists.length) && (!tracks.length)) return "A musical ghost — build your vibe with a few spins.";
    if (topGenre && tracks.length) return `You’re a ${topGenre} listener with a soft spot for ${tracks[0].name}.`;
    if (topGenre) return `Mostly ${topGenre} with curious detours.`;
    if (tracks.length) return `Undefined genre, but you’re loyal to ${tracks[0].name}.`;
    return "Eclectic on shuffle — we love that.";
  }

  async function handleExportPDF() {
    try {
      await exportDashboardAsPDF(dashboardRef.current, 'vibeify-your-vibe.pdf');
    } catch (e) {
      console.error(e);
      alert('Export failed: ' + e.message);
    }
  }

  async function handleLogout() {
    await logout();
    navigate('/');
  }

  async function handleShare() {
    const shareData = {
      title: "My Spotify Vibe 🎵",
      text: `${profile?.display_name || 'I'} just checked my vibe on Vibeify! My vibe: ${vibe}`,
      url: window.location.href
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        alert("Sharing is not supported on this device.");
      }
    } catch (err) {
      console.error("Share failed:", err);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-green-500 font-semibold text-lg">
        {/* Animated loading text */}
        <motion.div
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          🎵 Loading your vibe...
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white">
        <Navbar />
        <main className="max-w-3xl mx-auto px-4 pt-28 text-center">
          <p className="text-red-500 font-bold italic">{error}</p>
          <p className="text-sm mt-2 text-gray-400">Tip: Log out, then reconnect to Spotify.</p>
          <button
            onClick={fetchData}
            className="mt-4 px-4 py-2 bg-green-500 text-black rounded-lg flex items-center gap-2 mx-auto"
          >
            <FaRedoAlt /> Retry
          </button>
        </main>
      </div>
    );
  }

  const effectiveRoast = roast || simpleRoastFromStats(topArtists, topTracks);
  const effectiveVibe = vibe || vibeSentence(topArtists, topTracks);

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black text-gray-100">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 pt-28 pb-12" ref={dashboardRef}>
        {/* Header */}
        <header className="flex gap-4 items-center flex-wrap">
          {profile?.images?.[0]?.url ? (
            <img src={profile.images[0].url} alt="avatar" className="w-16 h-16 rounded-full border-2 border-green-500" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center border-2 border-green-500">🎧</div>
          )}
          <div>
            <h2 className="text-xl font-semibold text-green-400">Hey {profile?.display_name || profile?.id || 'there'} 👋</h2>
            <p className="text-sm opacity-80">Here's your Vibeify snapshot.</p>
            {sources && (
              <p className="text-xs opacity-60 mt-1">
                Data sources — Artists: {sources.artists?.source} {sources.artists?.time_range ? `(${sources.artists.time_range})` : ''} ·
                Tracks: {sources.tracks?.source} {sources.tracks?.time_range ? `(${sources.tracks.time_range})` : ''}
              </p>
            )}
          </div>

          <div className="ml-auto flex items-center gap-2 flex-wrap">
            <button onClick={handleExportPDF} className="px-3 py-2 border border-green-500 rounded-lg flex items-center gap-2 hover:bg-green-500 hover:text-black transition">
              <FaFilePdf /> Export
            </button>
            <button onClick={handleShare} className="px-3 py-2 border border-green-500 rounded-lg flex items-center gap-2 hover:bg-green-500 hover:text-black transition">
              <FaShareAlt /> Share
            </button>
            <button onClick={handleLogout} className="px-3 py-2 border border-red-500 text-red-500 rounded-lg flex items-center gap-2 hover:bg-red-500 hover:text-black transition">
              <FaSignOutAlt /> Quit
            </button>
          </div>
        </header>

        {/* Stats */}
        <section className="mt-6 grid grid-cols-1 gap-4">
          {/* Top Artists */}
          <div className="bg-black/50 border border-green-500 p-4 rounded-xl shadow-lg">
            <h3 className="font-semibold mb-2 text-green-400">Top Artists</h3>
            {topArtists.length > 0 ? (
              <div className="flex overflow-x-auto gap-3 py-2">
                {topArtists.map((a) => (
                  <div key={a.id || a.name} className="min-w-[120px] bg-gray-900 p-2 rounded-lg flex-shrink-0 border border-green-500">
                    <img src={(a.images && a.images[0]?.url) || ''} alt={a.name} className="w-full h-24 object-cover rounded-md mb-2" />
                    <div className="text-sm font-medium">{a.name}</div>
                    <div className="text-xs opacity-70">
                      {a.followers?.total ? `${a.followers.total.toLocaleString()} listeners` : '—'}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-yellow-400 italic font-semibold">! No top artists found — listen more and check back.</p>
            )}
          </div>

          {/* Top Tracks */}
          <div className="bg-black/50 border border-green-500 p-4 rounded-xl shadow-lg">
            <h3 className="font-semibold mb-2 text-green-400">Top Tracks</h3>
            {topTracks.length > 0 ? (
              <div className="grid grid-cols-1 gap-2">
                {topTracks.map((t, idx) => (
                  <div key={t.id || `${t.name}-${idx}`} className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gray-800 rounded-md overflow-hidden">
                      <img src={t.album?.images?.[0]?.url || ''} alt={t.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{t.name}</div>
                      <div className="text-xs opacity-70">{(t.artists || []).map((ar) => ar.name).join(', ')}</div>
                    </div>
                    <div className="text-sm opacity-70">{idx + 1}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-yellow-400 italic font-semibold">! No top tracks found — try again later.</p>
            )}
          </div>

          {/* Roast & Vibe sentence */}
          <motion.div
            className="bg-black/50 border border-green-500 p-4 rounded-xl shadow-lg"
            whileHover={{ scale: 1.03, rotate: 0.5 }}
            whileInView={{ opacity: [0, 1], y: [20, 0] }}
            transition={{ duration: 0.6 }}
          >
            <h3 className="font-semibold mb-2 text-green-400">Roast & Vibe</h3>
            <p className="italic mb-2 text-green-300">{effectiveRoast}</p>
            <p className="text-sm">{effectiveVibe}</p>
          </motion.div>
        </section>

        <Footer />
      </main>
    </div>
  );
}
