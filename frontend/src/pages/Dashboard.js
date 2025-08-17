import React, { useEffect, useState, useRef, useMemo } from 'react';
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
import { exportDashboardAsPDF } from '../utils/exportUtils';

import {
  FaShareAlt, FaFilePdf, FaSignOutAlt, FaRedoAlt, FaSpotify,
  FaPlay, FaPause, FaDownload, FaSyncAlt, FaMusic
} from 'react-icons/fa';

import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, CartesianGrid
} from 'recharts';

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [nowPlaying, setNowPlaying] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fatalError, setFatalError] = useState(null);
  const [tab, setTab] = useState('short_term'); 
  const [showVibeCard, setShowVibeCard] = useState(false);
  const [shareToast, setShareToast] = useState('');
  const [isLocalPlaying, setIsLocalPlaying] = useState(false);
  const dashboardRef = useRef();
  const vibeCanvasRef = useRef();
  const audioRef = useRef(null);
  const pollIntervalRef = useRef(null);
  const navigate = useNavigate();

  // theme / chart colors
  const GREEN = '#1DB954';
  const PIE_COLORS = [GREEN, '#7C3AED', '#22D3EE', '#F472B6', '#F59E0B', '#60A5FA'];

  // Professional card motion: load and hover only (no infinite loop)
  const cardMotionProps = {
    initial: { opacity: 0, y: 10 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.15 },
    whileHover: { y: -6, scale: 1.01 },
    transition: { type: 'spring', stiffness: 140, damping: 18, duration: 0.38 }
  };

  // micro tap for buttons
  const microTap = { whileTap: { scale: 0.985 } };

  // ---------------- Data Fetching ----------------
  async function fetchData() {
    try {
      setLoading(true);
      setFatalError(null);
      const data = await getVibeSummary();
      setSummary(data);

      // client-side fallback for topTracks if server didn't provide (use recently played)
      if ((data?.topTracks?.length || 0) === 0 && (data?.recentlyPlayed?.length || 0) > 0) {
        const mapped = (data.recentlyPlayed || []).map(r => r.track).filter(Boolean);
        setSummary(s => ({ ...(s || {}), topTracks: mapped.slice(0, 8) }));
      }

      // seed nowPlaying if included by server
      setNowPlaying(data?.nowPlaying || null);
    } catch (e) {
      console.error('Dashboard fetch error', e);
      // graceful fallback attempt
      try {
        const [me, artists, tracks] = await Promise.all([
          getMe().catch(() => null),
          getTopArtists(8, 'short_term').catch(() => ({ items: [] })),
          getTopTracks(8, 'short_term').catch(() => ({ items: [] }))
        ]);
        setSummary({
          profile: me,
          topArtists: artists.items || [],
          topTracks: tracks.items || [],
          top: { artists: { short_term: artists.items || [] }, tracks: { short_term: tracks.items || [] } },
          recentlyPlayed: [],
          activityByHour: Array.from({ length: 24 }, (_, h) => ({ hour: h, plays: 0 })),
          topGenres: [],
          audioFeaturesAvg: null,
          roast: null,
          vibe: null,
          playlists: [],
          nowPlaying: {},
          _errors: { fallback: true }
        });
      } catch (e2) {
        console.error('Fallback fetch failed', e2);
        setFatalError('⚠ Failed to load Spotify data. Way forward: log out, reconnect, and make sure you grant scopes (user-top-read, user-read-recently-played).');
      }
    } finally {
      setLoading(false);
    }
  }

  // ---------------- Now Playing Poll ----------------
  const pollNowPlaying = async () => {
    try {
      const np = await getNowPlaying();
      if (np && JSON.stringify(np) !== JSON.stringify(nowPlaying)) {
        setNowPlaying(np);
      }
    } catch (err) {
      // silent
    }
  };

  useEffect(() => {
    fetchData();
    pollNowPlaying();
    pollIntervalRef.current = setInterval(pollNowPlaying, 10000);
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------- derived / charts ----------------
  const lineData = useMemo(() => {
    const recent = summary?.recentlyPlayed || [];
    const map = {};
    const now = new Date();
    for (let i = 0; i < 30; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      map[key] = 0;
    }
    for (const item of recent) {
      const ts = item.played_at || item.timestamp;
      if (!ts) continue;
      const key = new Date(ts).toISOString().slice(0, 10);
      if (map[key] !== undefined) map[key] += 1;
    }
    return Object.keys(map).sort().map(k => ({ date: k.slice(5), plays: map[k] }));
  }, [summary]);

  const pieData = useMemo(() => {
    return (summary?.topGenres || []).map((g, idx) => ({ name: g.genre, value: g.count, fill: PIE_COLORS[idx % PIE_COLORS.length] }));
  }, [summary]);

  // derived artists list built from tracks & recently played (kept simple)
  const derivedTopArtists = useMemo(() => {
    const byId = new Map();
    const addArtist = (a, sampleTrack) => {
      if (!a?.id) return;
      const prev = byId.get(a.id) || { id: a.id, name: a.name, hits: 0, image: null, genres: [] };
      prev.hits += 1;
      const pool = [
        ...(summary?.top?.artists?.short_term || []),
        ...(summary?.top?.artists?.medium_term || []),
        ...(summary?.top?.artists?.long_term || [])
      ];
      const found = pool.find(p => p.id === a.id);
      if (found?.images?.[0]?.url) prev.image = found.images[0].url;
      if ((found?.genres || []).length) prev.genres = found.genres;
      if (!prev.image && sampleTrack?.album?.images?.[0]?.url) prev.image = sampleTrack.album.images[0].url;
      byId.set(a.id, prev);
    };

    (summary?.topTracks || []).forEach(t => (t?.artists || []).forEach(a => addArtist(a, t)));
    if (byId.size < 6) {
      (summary?.recentlyPlayed || []).slice(0, 50).forEach(rp => (rp?.track?.artists || []).forEach(a => addArtist(a, rp.track)));
    }
    return Array.from(byId.values()).sort((a, b) => b.hits - a.hits).slice(0, 12);
  }, [summary]);

  // ---------------- Roast fallback ----------------
  function simpleRoast() {
    const artists = derivedTopArtists || [];
    const tracks = summary?.topTracks || [];
    if (!artists.length && !tracks.length) return "Your listening is as mysterious as a demo playlist. Go hit play!";
    const a = artists[0]?.name, t = tracks[0]?.name;
    if (a && t) return `You loop ${a} and call ${t} "variety."`;
    if (a) return `You vibe like you put ${a} on loop and call it "research."`;
    if (t) return `You replay ${t} like it's a thesis topic.`;
    return "Chaotic neutral energy. Respect.";
  }

  // ---------------- Local preview playback ----------------
  useEffect(() => {
    const preview = nowPlaying?.item?.preview_url;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setIsLocalPlaying(false);
    }
    if (preview) {
      audioRef.current = new Audio(preview);
      audioRef.current.crossOrigin = 'anonymous';
      audioRef.current.onended = () => setIsLocalPlaying(false);
      audioRef.current.onerror = () => setIsLocalPlaying(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nowPlaying?.item?.id, nowPlaying?.item?.preview_url]);

  const toggleLocalPlay = async () => {
    try {
      const preview = nowPlaying?.item?.preview_url;
      if (preview && audioRef.current) {
        if (!isLocalPlaying) {
          await audioRef.current.play();
          setIsLocalPlaying(true);
        } else {
          audioRef.current.pause();
          setIsLocalPlaying(false);
        }
        return;
      }
      // fallback: try backend player control, otherwise open spotify
      try {
        await fetch((process.env.REACT_APP_SERVER_URL || 'http://127.0.0.1:5000') + '/api/player/toggle', {
          method: 'POST',
          credentials: 'include'
        });
        await pollNowPlaying();
      } catch (_) {
        const id = nowPlaying?.item?.id;
        if (id) {
          const deep = `spotify:track:${id}`;
          const opened = window.open(deep);
          if (!opened) window.open(`https://open.spotify.com/track/${id}`, '_blank');
        }
      }
    } catch (err) {
      console.error('toggleLocalPlay error', err);
      setShareToast('Playback not available in this browser.');
      setTimeout(() => setShareToast(''), 1800);
    }
  };

  // ---------------- Vibe Card canvas (unchanged, commented for quick edits) ----------------
  const drawVibeCard = async () => {
    const canvas = vibeCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = (canvas.width = 1080);
    const H = (canvas.height = 1350);

    // background gradient
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, '#071018');
    g.addColorStop(1, '#081F14');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // header
    ctx.fillStyle = '#CFFDEA';
    ctx.font = 'bold 48px Inter, system-ui, -apple-system';
    ctx.fillText('Vibeify — Snapshot', 60, 90);

    // name
    const name = summary?.profile?.display_name || 'Vibe lover';
    ctx.fillStyle = GREEN;
    ctx.font = 'bold 38px Inter, system-ui, -apple-system';
    ctx.fillText(name, 60, 150);

    // sub
    ctx.fillStyle = '#9CA3AF';
    ctx.font = '16px Inter, system-ui, -apple-system';
    ctx.fillText('Welcome — this is your snapshot. Don’t cry when we roast you.', 60, 185);

    // small content: top track & artist
    const topTrack = summary?.topTracks?.[0];
    ctx.fillStyle = '#C7D2FE';
    ctx.font = 'bold 22px Inter, system-ui, -apple-system';
    ctx.fillText('Top track', 60, 240);
    ctx.fillStyle = '#E5E7EB';
    ctx.font = '18px Inter, system-ui, -apple-system';
    ctx.fillText(topTrack ? `${topTrack.name} — ${(topTrack.artists || []).map(a => a.name).join(', ')}` : '—', 60, 270);

    const topArtist = derivedTopArtists?.[0];
    ctx.fillStyle = '#C7D2FE';
    ctx.font = 'bold 22px Inter, system-ui, -apple-system';
    ctx.fillText('Top artist', 60, 320);
    ctx.fillStyle = '#E5E7EB';
    ctx.font = '18px Inter, system-ui, -apple-system';
    ctx.fillText(topArtist ? `${topArtist.name}` : '—', 60, 350);

    // roast, vibe & sparkline (kept compact)
    const roast = summary?.roast || simpleRoast();
    const vibe = summary?.vibe || 'Your vibe will show here.';
    ctx.fillStyle = '#C7D2FE';
    ctx.font = 'bold 20px Inter, system-ui, -apple-system';
    ctx.fillText('Roast', 60, 410);
    ctx.fillStyle = '#FDE68A';
    wrapText(ctx, roast, 60, 440, W - 120, 26);

    ctx.fillStyle = '#C7D2FE';
    ctx.font = 'bold 20px Inter, system-ui, -apple-system';
    ctx.fillText('Vibe', 60, 520);
    ctx.fillStyle = '#E5E7EB';
    wrapText(ctx, vibe, 60, 550, W - 120, 26);

    // footer
    ctx.fillStyle = '#9CA3AF';
    ctx.font = '16px Inter, system-ui, -apple-system';
    ctx.fillText('Made with Vibeify', 60, H - 40);
  };

  function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = (text || '').split(' ');
    let line = '';
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && n > 0) {
        ctx.fillText(line, x, y);
        line = words[n] + ' ';
        y += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, y);
  }

  const downloadVibeCard = () => {
    const canvas = vibeCanvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = 'vibeify-card.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  useEffect(() => {
    if (showVibeCard) drawVibeCard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showVibeCard, summary, JSON.stringify(lineData)]);

  // ---------------- Sharing helpers ----------------
  const showShare = (text) => {
    if (navigator.share) {
      navigator.share({ title: 'My Vibe', text }).catch(() => {});
      setShareToast('Shared!');
      setTimeout(() => setShareToast(''), 1200);
      return;
    }
    navigator.clipboard?.writeText(text).then(() => {
      setShareToast('Copied to clipboard!');
      setTimeout(() => setShareToast(''), 1400);
    }).catch(() => {
      setShareToast('Unable to share.');
      setTimeout(() => setShareToast(''), 1400);
    });
  };

  // ---------------- UI states ----------------
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-black via-gray-900 to-black text-green-500">
        <div className="text-lg font-semibold">🎵 Loading your vibe...</div>
      </div>
    );
  }

  if (fatalError) {
    return (
      <div className="min-h-screen bg-black text-white">
        <Navbar />
        <main className="max-w-3xl mx-auto px-4 pt-28 text-center">
          <p className="text-red-400 font-bold italic">{fatalError}</p>
          <p className="text-sm mt-2 text-gray-400">Way forward: Log out, then reconnect to Spotify. Make sure you approve the scopes we ask for.</p>
          <button onClick={fetchData} className="mt-4 px-4 py-2 bg-green-500 text-black rounded-lg inline-flex items-center gap-2"><FaRedoAlt /> Retry</button>
        </main>
      </div>
    );
  }

  const profile = summary?.profile || {};
  const effectiveRoast = summary?.roast || simpleRoast();

  // A minimal Card wrapper with motion for load & hover
  const Card = ({ children, className = '' }) => (
    <motion.div {...cardMotionProps} className={`relative group rounded-2xl p-4 shadow-md bg-gradient-to-br from-[#061116] to-[#07121a] border border-white/6 ${className}`}>
      {children}
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black text-gray-100">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 pt-24 pb-16" ref={dashboardRef}>

        {/* Header */}
        <header className="flex flex-col md:flex-row items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            {profile?.images?.[0]?.url ? (
              <img src={profile.images[0].url} className="w-16 h-16 rounded-full border-2 border-green-500" alt="avatar" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center border-2 border-green-500">🎧</div>
            )}
            <div className="space-y-0.5 min-w-0">
              <h2 className="text-2xl font-semibold text-green-400 truncate">Hello {profile?.display_name || 'there'} <span>👋</span></h2>
              <p className="text-[13px] text-blue-300/90 truncate">This is your snapshot. Don’t cry when we roast you. 😈</p>
              <p className="text-xs text-gray-400">Account:: <span className="text-blue-300 font-medium">{profile?.product?.toUpperCase?.() || '—'}</span></p>
            </div>
          </div>

          {/* Controls */}
          <div className="md:ml-auto flex items-center gap-2 flex-wrap">
            <motion.button {...microTap} onClick={() => exportDashboardAsPDF(dashboardRef.current, 'vibeify.pdf')} className="px-3 py-2 border border-green-500 rounded-lg hover:bg-green-500 hover:text-black transition inline-flex items-center gap-2"><FaFilePdf /> Export</motion.button>

            <motion.button {...microTap} onClick={() => (navigator.share ? navigator.share({ title: 'My Vibe', text: `${profile.display_name || 'I'} checked their vibe on Vibeify!`, url: window.location.href }) : setShowVibeCard(true))} className="px-3 py-2 border border-green-500 rounded-lg hover:bg-green-500 hover:text-black transition inline-flex items-center gap-2"><FaShareAlt /> Share</motion.button>

            <motion.button {...microTap} onClick={() => setShowVibeCard(true)} className="px-3 py-2 border border-indigo-500 text-indigo-200 rounded-lg hover:bg-indigo-500 hover:text-black transition inline-flex items-center gap-2"><FaDownload /> Vibe Card</motion.button>

            <motion.button {...microTap} onClick={async () => { await logout(); navigate('/'); }} className="px-3 py-2 border border-red-500 text-red-400 rounded-lg hover:bg-red-500 hover:text-black transition inline-flex items-center gap-2"><FaSignOutAlt /> Quit</motion.button>
          </div>
        </header>

        {/* Now Playing (compact, no distracting animation) */}
        <div className="mt-4">
          <Card className="p-3">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-12 rounded-lg overflow-hidden ring-1 ring-white/8">
                  {nowPlaying?.item?.album?.images?.[0]?.url
                    ? <img src={nowPlaying.item.album.images[0].url} alt="cover" className="w-full h-full object-cover" />
                    : <div className="w-full h-full bg-gray-800 flex items-center justify-center"><FaMusic className="opacity-70" /></div>}
                </div>

                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate flex items-center gap-2">
                    <FaSpotify className="text-green-500 shrink-0" />
                    <span className="truncate">{nowPlaying?.item?.name || 'Nothing playing'}</span>
                    <span className="text-xs text-gray-400 ml-2">• live</span>
                  </div>
                  <div className="text-xs opacity-70 truncate">{(nowPlaying?.item?.artists || []).map(a => a.name).join(', ') || '—'}</div>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:ml-auto">
                <motion.button {...microTap} onClick={pollNowPlaying} className="px-3 py-1.5 text-xs rounded-full border border-white/10 hover:border-green-500/40 hover:bg-white/5 inline-flex items-center gap-1.5"><FaSyncAlt /> Live Sync</motion.button>

                {nowPlaying?.item?.id ? (
                  <motion.button {...microTap} onClick={toggleLocalPlay} className="px-3 py-1.5 text-xs rounded-full bg-green-500 text-black hover:brightness-95 inline-flex items-center gap-1.5">
                    {isLocalPlaying ? (<><FaPause /> Pause</>) : (<><FaPlay /> Play</>)}
                  </motion.button>
                ) : null}

                {nowPlaying?.item?.id ? (
                  <a href={`https://open.spotify.com/track/${nowPlaying.item.id}`} target="_blank" rel="noreferrer" className="px-3 py-1.5 text-xs rounded-full border border-white/10 hover:border-green-500/40 hover:bg-white/5 inline-flex items-center gap-1.5">Open in Spotify</a>
                ) : null}
              </div>
            </div>

            {/* optional embed (keeps layout stable) */}
            {nowPlaying?.item?.id ? (
              <div className="mt-3">
                <iframe
                  title="spotify-embed"
                  className="w-full h-20 rounded-lg border border-white/10"
                  src={`https://open.spotify.com/embed/track/${nowPlaying.item.id}`}
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  loading="lazy"
                />
              </div>
            ) : null}
          </Card>
        </div>

        {/* Tabs + Top Lists (Artists arranged same as tracks) */}
        <section className="mt-6">
          <div className="flex gap-2 flex-wrap">
            {['short_term','medium_term','long_term'].map(r => (
              <motion.button key={r} whileTap={{ scale: 0.98 }} onClick={() => setTab(r)}
                className={`px-3 py-1.5 rounded-full text-sm transition ${tab===r ? 'bg-green-500 text-black' : 'border border-green-500/40 text-green-300 hover:border-green-500/70'}`}>
                {r === 'short_term' ? '4 Weeks' : r === 'medium_term' ? '6 Months' : 'All Time'}
              </motion.button>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-4 mt-4">
            {/* Top Artists (now a stacked list for clarity & small screens) */}
            <Card>
              <h3 className="text-green-400 font-semibold mb-2">Top Artists</h3>

              {derivedTopArtists.length ? (
                <div className="space-y-3">
                  {derivedTopArtists.map((a, idx) => (
                    <motion.div key={a.id} whileHover={{ y: -4 }} className="flex items-center gap-3 bg-gray-900/50 p-2 rounded-lg border border-green-500/10">
                      <div className="w-12 h-12 rounded-md overflow-hidden bg-gray-800 flex-shrink-0">
                        {a.image ? <img src={a.image} alt={a.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xs opacity-70">No image</div>}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{a.name}</div>
                        <div className="text-xs opacity-70 truncate">{(a.genres || [])[0] || '—'}</div>
                      </div>

                      <div className="text-sm opacity-70">{idx + 1}</div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <p className="text-yellow-400 italic font-semibold">! Not enough data yet — play more and refresh.</p>
              )}
            </Card>

            {/* Top Tracks (stacked list) */}
            <Card>
              <h3 className="text-green-400 font-semibold mb-2">Top Tracks</h3>

              {(summary?.top?.tracks?.[tab] || []).length ? (
                <div className="space-y-3">
                  {summary.top.tracks[tab].slice(0, 12).map((t, i) => (
                    <motion.div key={t.id || `${t.name}-${i}`} whileHover={{ y: -3 }} className="flex items-center gap-3 bg-gray-900/50 p-2 rounded-lg border border-green-500/10">
                      <div className="w-12 h-12 rounded-md overflow-hidden bg-gray-800">
                        <img src={t.album?.images?.[0]?.url || ''} className="w-full h-full object-cover" alt={t.name} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{t.name}</div>
                        <div className="text-xs opacity-70 truncate">{(t.artists||[]).map(a=>a.name).join(', ')}</div>
                      </div>
                      <div className="text-sm opacity-70">{i+1}</div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <p className="text-yellow-400 italic font-semibold">! No top tracks for this range. Tip: play songs to build history.</p>
              )}
            </Card>
          </div>
        </section>

        {/* Charts row (kept minimal & clean) */}
        <section className="mt-6 grid md:grid-cols-2 gap-4">
          <Card>
            <h3 className="text-green-400 font-semibold mb-2">Listening — last 30 days</h3>
            {lineData && lineData.length ? (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={lineData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#0b1220" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9CA3AF' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} allowDecimals={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#071018', borderRadius: 8 }} itemStyle={{ color: '#fff' }} />
                    <Line type="monotone" dataKey="plays" stroke={GREEN} strokeWidth={3} dot={{ r: 2 }} activeDot={{ r: 6 }} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-yellow-400 italic font-semibold">! Not enough recent plays to build a 30-day chart.</p>
            )}
          </Card>

          <Card>
            <h3 className="text-green-400 font-semibold mb-2">Genre Mix</h3>
            {pieData && pieData.length ? (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={40} outerRadius={80} paddingAngle={4} label={(entry) => entry.name} isAnimationActive={false}>
                      {pieData.map((entry, idx) => <Cell key={`c-${idx}`} fill={entry.fill} />)}
                    </Pie>
                    <Tooltip wrapperStyle={{ background: '#071018', borderRadius: 6 }} />
                    <Legend verticalAlign="bottom" iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-yellow-400 italic font-semibold">! No genres detected yet — build your top artists.</p>
            )}
          </Card>
        </section>

        {/* Recently Played + Playlists */}
        <section className="mt-6 grid md:grid-cols-2 gap-4">
          <Card>
            <h3 className="text-green-400 font-semibold mb-2">Recently Played</h3>
            {summary?.recentlyPlayed?.length ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {summary.recentlyPlayed.map((rp, idx) => (
                  <motion.div key={rp.played_at || idx} whileHover={{ y: -3 }} className="bg-gray-900/50 p-3 rounded-lg border border-green-500/12">
                    <div className="flex gap-3 items-center">
                      <div className="w-12 h-12 rounded overflow-hidden"><img src={rp.track?.album?.images?.[0]?.url || ''} className="w-full h-full object-cover" alt="cover" /></div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{rp.track?.name}</div>
                        <div className="text-[11px] opacity-70 truncate">{(rp.track?.artists||[]).map(a=>a.name).join(', ')}</div>
                        <div className="text-[10px] opacity-60 mt-1">{new Date(rp.played_at).toLocaleString()}</div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <p className="text-yellow-400 italic font-semibold">! No recent plays. Tip: play a couple songs then refresh.</p>
            )}
          </Card>

          <Card>
            <h3 className="text-green-400 font-semibold mb-2">Playlists</h3>
            {summary?.playlists?.length ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {summary.playlists.slice(0,12).map(pl => (
                  <motion.div key={pl.id} whileHover={{ y: -3 }} className="bg-gray-900/50 p-3 rounded-lg border border-green-500/12">
                    <div className="w-full aspect-square rounded overflow-hidden mb-2">
                      <img src={pl.images?.[0]?.url || ''} alt={pl.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="text-[13px] font-medium line-clamp-2">{pl.name}</div>
                    <div className="text-[11px] opacity-70">{pl.tracks?.total || 0} tracks</div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <p className="text-yellow-400 italic font-semibold">! No playlists found. Create or follow some then refresh.</p>
            )}
          </Card>
        </section>

        {/* Roast & Vibe (two cards, slightly stronger hover) */}
        <section className="mt-6 grid md:grid-cols-2 gap-4">
          <motion.div {...cardMotionProps} whileHover={{ y: -8, scale: 1.02 }} className="relative group rounded-2xl p-4 shadow-md bg-gradient-to-br from-[#061116] to-[#07121a] border border-white/6">
            <h3 className="text-green-400 font-semibold mb-2">Roast</h3>
            <p className="italic text-green-300 text-sm mb-4">{effectiveRoast}</p>
            <div className="flex gap-2">
              <motion.button {...microTap} onClick={() => showShare(effectiveRoast)} className="px-3 py-2 rounded-lg bg-green-500 text-black hover:brightness-95 transition inline-flex items-center gap-2">
                <FaShareAlt /> Share Roast
              </motion.button>
              <motion.button {...microTap} onClick={() => exportDashboardAsPDF(dashboardRef.current, 'vibeify-roast.pdf')} className="px-3 py-2 rounded-lg border border-green-500 text-green-300 hover:bg-green-500 hover:text-black transition inline-flex items-center gap-2">
                <FaFilePdf /> Export
              </motion.button>
            </div>
          </motion.div>

          <motion.div {...cardMotionProps} whileHover={{ y: -8, scale: 1.02 }} className="relative group rounded-2xl p-4 shadow-md bg-gradient-to-br from-[#061116] to-[#07121a] border border-white/6">
            <h3 className="text-green-400 font-semibold mb-2">Vibe</h3>
            <p className="text-sm text-gray-200 mb-4">{summary?.vibe || 'Your vibe will show here as you listen more.'}</p>
            <div className="flex gap-2">
              <motion.button {...microTap} onClick={() => showShare(summary?.vibe || 'My Vibe on Vibeify')} className="px-3 py-2 rounded-lg bg-indigo-500 text-black hover:brightness-95 transition inline-flex items-center gap-2">
                <FaShareAlt /> Share Vibe
              </motion.button>

              <motion.button {...microTap} onClick={() => setShowVibeCard(true)} className="px-3 py-2 rounded-lg border border-indigo-500 text-indigo-300 hover:bg-indigo-500 hover:text-black transition inline-flex items-center gap-2">
                <FaDownload /> Create Card
              </motion.button>
            </div>
          </motion.div>
        </section>

        <Footer />
      </main>

      {/* Vibe Card Modal (subtle motion) */}
      <AnimatePresence>
        {showVibeCard && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowVibeCard(false)}>
            <motion.div initial={{ y: 20 }} animate={{ y: 0 }} exit={{ y: 20 }} className="bg-[#0B0F14] border border-white/10 rounded-2xl p-4 max-w-[92vw] max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-3">
                <div className="text-green-400 font-semibold">Vibe Card Preview</div>
                <div className="flex gap-2">
                  <motion.button {...microTap} onClick={drawVibeCard} className="px-3 py-1.5 text-xs rounded-full border border-white/10 hover:border-green-500/40 hover:bg-white/5 inline-flex items-center gap-1.5"><FaSyncAlt /> Refresh</motion.button>
                  <motion.button {...microTap} onClick={downloadVibeCard} className="px-3 py-1.5 text-xs rounded-full bg-green-500 text-black hover:brightness-95 inline-flex items-center gap-1.5"><FaDownload /> Save PNG</motion.button>
                </div>
              </div>
              <canvas ref={vibeCanvasRef} width={1080} height={1350} className="w-[min(90vw,540px)] h-auto rounded-xl border border-white/10" />
              <p className="mt-2 text-[12px] text-gray-400">Tip: If image looks low-res, click Refresh before saving.</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* share toast */}
      <AnimatePresence>
        {shareToast && (
          <motion.div className="fixed top-6 left-1/2 -translate-x-1/2 z-60 px-4 py-2 rounded-lg border border-green-200 bg-green-600 text-black font-medium" initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }}>
            {shareToast}
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        /* minimal utility: slow spin removed; keep layout stable */
        .animate-spin-slow { animation: spin 24s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
      `}</style>
    </div>
  );
}
