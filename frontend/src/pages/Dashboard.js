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

  // ---------------- Data Fetching (stable/no loops) ----------------
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setFatalError(null);

      const data = await getVibeSummary();
      // client-side fallback for topTracks if server didn't provide (use recently played)
      if ((data?.topTracks?.length || 0) === 0 && (data?.recentlyPlayed?.length || 0) > 0) {
        const mapped = (data.recentlyPlayed || []).map(r => r.track).filter(Boolean);
        data.topTracks = mapped.slice(0, 8);
      }
      setSummary(data);
      setNowPlaying(data?.nowPlaying || null);
    } catch (e) {
      console.error('Dashboard fetch error', e);
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
  }, []);

  const pollNowPlaying = useCallback(async () => {
    try {
      const np = await getNowPlaying();
      setNowPlaying(prev => {
        if (!np || JSON.stringify(np) === JSON.stringify(prev)) return prev;
        return np;
      });
    } catch (_) {
      // silent
    }
  }, []);

  useEffect(() => {
    // run once on mount
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
  }, [fetchData, pollNowPlaying]);

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
    return (summary?.topGenres || []).map((g, idx) => ({
      name: g.genre,
      value: g.count,
      fill: PIE_COLORS[idx % PIE_COLORS.length]
    }));
  }, [summary]);

  // derived artists from tracks & recent
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
  const simpleRoast = useCallback(() => {
    const artists = derivedTopArtists || [];
    const tracks = summary?.topTracks || [];
    if (!artists.length && !tracks.length) return "Your listening is as mysterious as a demo playlist. Go hit play!";
    const a = artists[0]?.name, t = tracks[0]?.name;
    if (a && t) return `You loop ${a} and call ${t} "variety."`;
    if (a) return `You vibe like you put ${a} on loop and call it "research."`;
    if (t) return `You replay ${t} like it's a thesis topic.`;
    return "Chaotic neutral energy. Respect.";
  }, [derivedTopArtists, summary]);

  // ---------------- Local preview playback ----------------
  useEffect(() => {
    const preview = nowPlaying?.item?.preview_url;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setIsLocalPlaying(false);
    }
    if (preview) {
      const a = new Audio(preview);
      a.crossOrigin = 'anonymous';
      a.onended = () => setIsLocalPlaying(false);
      a.onerror = () => setIsLocalPlaying(false);
      audioRef.current = a;
    }
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

  // A minimal Card
  const Card = ({ children, className = '' }) => (
    <motion.div {...cardMotion} className={`relative rounded-2xl p-4 shadow-md bg-gradient-to-br from-[#061116] to-[#07121a] border border-white/6 ${className}`}>
      {children}
    </motion.div>
  );

  // --- Export handlers (full-page screenshot feel) ---
  const handleExportPNG = async () => {
    const node = dashboardRef.current;
    if (!node) return;
    await exportElementAsPNG(node, 'vibeify-dashboard.png');
  };

  const handleExportPDF = async () => {
    const node = dashboardRef.current;
    if (!node) return;
    await exportElementAsPDF(node, 'vibeify-dashboard.pdf');
  };

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
              <p className="text-xs text-gray-400">Account: <span className="text-blue-300 font-medium">{profile?.product?.toUpperCase?.() || '—'}</span></p>
            </div>
          </div>

          {/* Controls */}
          <div className="md:ml-auto flex items-center gap-2 flex-wrap">
            <motion.button {...microTap} onClick={handleExportPNG} className="px-3 py-2 border border-green-500 rounded-lg hover:bg-green-500 hover:text-black transition inline-flex items-center gap-2"><FaImage /> Export PNG</motion.button>
            <motion.button {...microTap} onClick={handleExportPDF} className="px-3 py-2 border border-green-500 rounded-lg hover:bg-green-500 hover:text-black transition inline-flex items-center gap-2"><FaFilePdf /> Export PDF</motion.button>
            <motion.button {...microTap} onClick={async () => { await logout(); navigate('/'); }} className="px-3 py-2 border border-red-500 text-red-400 rounded-lg hover:bg-red-500 hover:text-black transition inline-flex items-center gap-2"><FaSignOutAlt /> Quit</motion.button>
          </div>
        </header>

        {/* Now Playing */}
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

        {/* Tabs + Top Lists */}
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
            {/* Top Artists */}
            <Card>
              <h3 className="text-green-400 font-semibold mb-2">Top Artists</h3>

              {derivedTopArtists.length ? (
                <div className="space-y-3">
                  {derivedTopArtists.map((a, idx) => (
                    <div key={a.id} className="flex items-center gap-3 bg-gray-900/50 p-2 rounded-lg border border-green-500/10">
                      <div className="w-12 h-12 rounded-md overflow-hidden bg-gray-800 flex-shrink-0">
                        {a.image ? <img src={a.image} alt={a.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xs opacity-70">No image</div>}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{a.name}</div>
                        <div className="text-xs opacity-70 truncate">{(a.genres || [])[0] || '—'}</div>
                      </div>

                      <div className="text-sm opacity-70">{idx + 1}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-yellow-400 italic font-semibold">! Not enough data yet — play more and refresh.</p>
              )}
            </Card>

            {/* Top Tracks */}
            <Card>
              <h3 className="text-green-400 font-semibold mb-2">Top Tracks</h3>

              {(summary?.top?.tracks?.[tab] || []).length ? (
                <div className="space-y-3">
                  {summary.top.tracks[tab].slice(0, 12).map((t, i) => (
                    <div key={t.id || `${t.name}-${i}`} className="flex items-center gap-3 bg-gray-900/50 p-2 rounded-lg border border-green-500/10">
                      <div className="w-12 h-12 rounded-md overflow-hidden bg-gray-800">
                        <img src={t.album?.images?.[0]?.url || ''} className="w-full h-full object-cover" alt={t.name} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{t.name}</div>
                        <div className="text-xs opacity-70 truncate">{(t.artists||[]).map(a=>a.name).join(', ')}</div>
                      </div>
                      <div className="text-sm opacity-70">{i+1}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-yellow-400 italic font-semibold">! No top tracks for this range. Tip: play songs to build history.</p>
              )}
            </Card>
          </div>
        </section>

        {/* Charts row */}
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
            {(pieData && pieData.length) ? (
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
                  <div key={rp.played_at || idx} className="bg-gray-900/50 p-3 rounded-lg border border-green-500/12">
                    <div className="flex gap-3 items-center">
                      <div className="w-12 h-12 rounded overflow-hidden"><img src={rp.track?.album?.images?.[0]?.url || ''} className="w-full h-full object-cover" alt="cover" /></div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{rp.track?.name}</div>
                        <div className="text-[11px] opacity-70 truncate">{(rp.track?.artists||[]).map(a=>a.name).join(', ')}</div>
                        <div className="text-[10px] opacity-60 mt-1">{new Date(rp.played_at).toLocaleString()}</div>
                      </div>
                    </div>
                  </div>
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
                  <div key={pl.id} className="bg-gray-900/50 p-3 rounded-lg border border-green-500/12">
                    <div className="w-full aspect-square rounded overflow-hidden mb-2">
                      <img src={pl.images?.[0]?.url || ''} alt={pl.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="text-[13px] font-medium line-clamp-2">{pl.name}</div>
                    <div className="text-[11px] opacity-70">{pl.tracks?.total || 0} tracks</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-yellow-400 italic font-semibold">! No playlists found. Create or follow some then refresh.</p>
            )}
          </Card>
        </section>

        {/* Roast & Vibe */}
        <section className="mt-6 grid md:grid-cols-2 gap-4">
          <Card>
            <h3 className="text-green-400 font-semibold mb-2">Roast</h3>
            <p className="italic text-green-300 text-sm mb-4">{effectiveRoast}</p>
            <div className="flex gap-2">
              <motion.button {...microTap} onClick={() => {
                const text = effectiveRoast;
                if (navigator.share) {
                  navigator.share({ title: 'My Vibe', text }).catch(() => {});
                  setShareToast('Shared!');
                } else {
                  navigator.clipboard?.writeText(text).then(() => setShareToast('Copied!'));
                }
                setTimeout(() => setShareToast(''), 1200);
              }} className="px-3 py-2 rounded-lg bg-green-500 text-black hover:brightness-95 transition inline-flex items-center gap-2">
                <FaShareAlt /> Share Roast
              </motion.button>
            </div>
          </Card>

          <Card>
            <h3 className="text-green-400 font-semibold mb-2">Vibe</h3>
            <p className="text-sm text-gray-200 mb-4">{summary?.vibe || 'Your vibe will show here as you listen more.'}</p>
            <div className="flex gap-2">
              <motion.button {...microTap} onClick={() => {
                const text = summary?.vibe || 'My Vibe on Vibeify';
                if (navigator.share) {
                  navigator.share({ title: 'My Vibe', text }).catch(() => {});
                  setShareToast('Shared!');
                } else {
                  navigator.clipboard?.writeText(text).then(() => setShareToast('Copied!'));
                }
                setTimeout(() => setShareToast(''), 1200);
              }} className="px-3 py-2 rounded-lg bg-indigo-500 text-black hover:brightness-95 transition inline-flex items-center gap-2">
                <FaShareAlt /> Share Vibe
              </motion.button>

              <motion.button {...microTap} onClick={handleExportPNG} className="px-3 py-2 rounded-lg border border-indigo-500 text-indigo-300 hover:bg-indigo-500 hover:text-black transition inline-flex items-center gap-2">
                <FaDownload /> Export PNG
              </motion.button>
            </div>
          </Card>
        </section>

        <Footer />
      </main>

      {/* share toast */}
      {shareToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-60 px-4 py-2 rounded-lg border border-green-200 bg-green-600 text-black font-medium">
          {shareToast}
        </div>
      )}

      <style>{`
        .animate-spin-slow { animation: spin 24s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
      `}</style>
    </div>
  );
}
