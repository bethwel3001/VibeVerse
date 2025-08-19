const express = require('express');
const axios = require('axios');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');
const qs = require('querystring');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());

const {
  SESSION_SECRET = 'super_secret_key',
  SPOTIFY_CLIENT_ID,
  SPOTIFY_CLIENT_SECRET,
  SPOTIFY_REDIRECT_URI = 'https://vibeverse-rwdl.onrender.com/auth/spotify/callback',
  // FRONTEND_URI = 'http://127.0.0.1:3000',
  FRONTEND_URI = 'https://lucky-mochi-6895c8.netlify.app',
  PORT = 5000,
  NODE_ENV = 'development',
} = process.env;

app.use(cookieParser(SESSION_SECRET));
app.use(cors({ origin: FRONTEND_URI, credentials: true }));

// In-memory session store (demo)
const sessions = {};

// small helper to create random session/state strings
function randomString(len = 16) {
  return crypto.randomBytes(len).toString('hex');
}

/**
 * Axios SPOTIFY instance for backend calls with timeout + retry wrapper
 */
const spotifyAxios = axios.create({
  baseURL: 'https://api.spotify.com/v1/',
  timeout: 8000, // 8s per request
});

/** Very small retry helper for transient errors */
async function retry(fn, attempts = 3, initialDelay = 300) {
  let attempt = 0;
  let delay = initialDelay;
  while (attempt < attempts) {
    try {
      return await fn();
    } catch (err) {
      attempt++;
      if (attempt >= attempts) throw err;
      await new Promise(r => setTimeout(r, delay));
      delay *= 2;
    }
  }
}

/** Spotify authorization URL builder */
function spotifyAuthorizeURL(state) {
  const scope = [
    'user-read-private',
    'user-read-email',
    'user-top-read',
    'user-read-recently-played',
    'playlist-read-private',
    'user-read-playback-state'
  ].join(' ');
  const params = {
    response_type: 'code',
    client_id: SPOTIFY_CLIENT_ID,
    scope,
    redirect_uri: SPOTIFY_REDIRECT_URI,
    state,
    show_dialog: NODE_ENV === 'development'
  };
  return `https://accounts.spotify.com/authorize?${qs.stringify(params)}`;
}

/** Exchange authorization code for tokens */
async function exchangeCodeForToken(code) {
  const tokenUrl = 'https://accounts.spotify.com/api/token';
  const data = qs.stringify({
    grant_type: 'authorization_code',
    code,
    redirect_uri: SPOTIFY_REDIRECT_URI
  });
  const headers = {
    'Content-Type': 'application/x-www-form-urlencoded',
    Authorization: 'Basic ' + Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64')
  };
  const resp = await retry(() => axios.post(tokenUrl, data, { headers }), 3, 300);
  return resp.data;
}

/** Refresh access token */
async function refreshAccessToken(refresh_token) {
  const tokenUrl = 'https://accounts.spotify.com/api/token';
  const data = qs.stringify({ grant_type: 'refresh_token', refresh_token });
  const headers = {
    'Content-Type': 'application/x-www-form-urlencoded',
    Authorization: 'Basic ' + Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64')
  };
  const resp = await retry(() => axios.post(tokenUrl, data, { headers }), 3, 300);
  return resp.data;
}

/**
 * Low-level GET to Spotify API using stored session tokens.
 * Automatically refreshes tokens if expired.
 */
async function spotifyGet(sessionId, path, params = {}) {
  const session = sessions[sessionId];
  if (!session) {
    const err = new Error('No session');
    err.status = 401;
    throw err;
  }

  // refresh if expired
  const now = Date.now();
  if (session.expires_at && session.expires_at <= now) {
    try {
      const newTokens = await refreshAccessToken(session.refresh_token);
      session.access_token = newTokens.access_token;
      if (newTokens.expires_in) session.expires_at = Date.now() + newTokens.expires_in * 1000;
      if (newTokens.refresh_token) session.refresh_token = newTokens.refresh_token;
    } catch (e) {
      const err = new Error('Failed to refresh token: ' + (e.response?.data?.error || e.message));
      err.status = e.response?.status || 500;
      throw err;
    }
  }

  const headers = { Authorization: `Bearer ${session.access_token}` };

  // Use retry wrapper around spotifyAxios.get
  try {
    const result = await retry(() => spotifyAxios.get(path, { headers, params }), 2, 250);
    return result.data;
  } catch (e) {
    const message = e.response?.data || e.message;
    const err = new Error('Spotify API error: ' + JSON.stringify(message));
    err.status = e.response?.status || 500;
    throw err;
  }
}

/** small helpers */
function pickTopGenres(artists = [], max = 6) {
  const counts = {};
  for (const a of artists) {
    (a.genres || []).forEach(g => (counts[g] = (counts[g] || 0) + 1));
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([genre, count]) => ({ genre, count }));
}

function buildRoast(artists = [], tracks = []) {
  if (!artists.length && !tracks.length) return "Your listening is as mysterious as a demo playlist. Go hit play!";
  const a = artists[0]?.name, t = tracks[0]?.name;
  if (a && t) return `You loop ${a} and call ${t} “variety.”`;
  if (a) return `You vibe like you put ${a} on loop and call it “research.”`;
  if (t) return `You replay ${t} like it's a thesis topic.`;
  return "Chaotic neutral energy. Respect.";
}

function buildVibe(genres = [], tracks = []) {
  const top = genres?.[0]?.genre;
  if (top && tracks.length) return `You’re a ${top} listener with a soft spot for ${tracks[0].name}.`;
  if (top) return `Mostly ${top} with curious detours.`;
  if (tracks.length) return `Undefined genre, but you’re loyal to ${tracks[0].name}.`;
  return "A musical ghost — build your vibe with a few spins.";
}

/** Get top (artists/tracks) with fallback to recently-played (tracks) */
async function getTopWithFallback(sessionId, type = 'artists', limit = 10) {
  const ranges = ['short_term', 'medium_term', 'long_term'];
  for (const time_range of ranges) {
    try {
      const res = await spotifyGet(sessionId, `me/top/${type}`, { limit, time_range });
      if (Array.isArray(res?.items) && res.items.length) {
        return { items: res.items, used: { type, source: 'top', time_range } };
      }
    } catch (e) {
      // ignore per-range failures and continue
    }
  }

  if (type === 'tracks') {
    try {
      const recent = await spotifyGet(sessionId, 'me/player/recently-played', { limit: Math.max(50, limit) });
      const items = (recent?.items || []).map(i => i.track).filter(Boolean).slice(0, limit);
      if (items.length) return { items, used: { type, source: 'recently_played' } };
    } catch (e) {}
  }

  return { items: [], used: { type, source: 'none' } };
}

/** Batch audio features (ids array) */
async function getAudioFeaturesBatch(sessionId, ids = []) {
  if (!ids.length) return [];
  const out = [];
  // spotify supports up to 100 ids per call
  for (let i = 0; i < ids.length; i += 100) {
    const chunk = ids.slice(i, i + 100).join(',');
    try {
      const data = await spotifyGet(sessionId, `audio-features`, { ids: chunk });
      out.push(...(data.audio_features || []));
    } catch (e) {
      // continue on partial failure
    }
  }
  return out.filter(Boolean);
}

function aggregateAudioFeatures(features = []) {
  if (!features.length) return null;
  const keys = ['danceability','energy','valence','acousticness','instrumentalness','liveness','speechiness','tempo'];
  const acc = {};
  let count = 0;
  for (const f of features) {
    if (!f) continue;
    keys.forEach(k => {
      if (typeof f[k] === 'number') acc[k] = (acc[k] || 0) + f[k];
    });
    count++;
  }
  if (!count) return null;
  const avg = {};
  keys.forEach(k => (avg[k] = (acc[k] || 0) / count));
  return avg;
}

function hourHistogram(recentItems = []) {
  const hours = Array.from({ length: 24 }, (_, i) => ({ hour: i, plays: 0 }));
  for (const item of recentItems || []) {
    const ts = item.played_at || item.timestamp;
    if (!ts) continue;
    const h = new Date(ts).getHours();
    hours[h].plays += 1;
  }
  return hours;
}

/** -------- AUTH routes -------- */
app.get('/auth/spotify', (req, res) => {
  const state = randomString(8);
  res.cookie('oauth_state', state, { signed: true, httpOnly: true, maxAge: 10*60*1000, sameSite: 'lax', secure: NODE_ENV === 'production' });
  return res.redirect(spotifyAuthorizeURL(state));
});

app.get('/auth/spotify/callback', async (req, res) => {
  const { code, state, error } = req.query;
  const signedState = req.signedCookies['oauth_state'];
  if (error) return res.redirect(`${FRONTEND_URI}/?error=${encodeURIComponent(error)}`);
  if (!state || !signedState || state !== signedState) return res.status(400).send('State mismatch. Auth failed.');
  try {
    const tokenData = await exchangeCodeForToken(code);
    const sessionId = randomString(12);
    const now = Date.now();
    sessions[sessionId] = {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: tokenData.expires_in ? now + tokenData.expires_in * 1000 : null
    };
    res.cookie('vibeify_session', sessionId, { signed: true, httpOnly: true, maxAge: 7*24*60*60*1000, sameSite: 'lax', secure: NODE_ENV === 'production' });
    res.clearCookie('oauth_state');
    return res.redirect(`${FRONTEND_URI}/dashboard`);
  } catch (e) {
    console.error('Token exchange error', e.response?.data || e.message);
    return res.redirect(`${FRONTEND_URI}/?error=token_exchange_failed`);
  }
});

/** session middleware */
function requireSession(req, res, next) {
  const sessionId = req.signedCookies['vibeify_session'];
  if (!sessionId || !sessions[sessionId]) return res.status(401).json({ error: 'Not authenticated' });
  req.sessionId = sessionId;
  next();
}

/** small debug helper */
app.get('/api/debug-session', requireSession, (req, res) => {
  if (NODE_ENV !== 'development') return res.status(404).end();
  const s = sessions[req.sessionId];
  res.json({ hasAccessToken: !!s.access_token, hasRefreshToken: !!s.refresh_token, expires_at: s.expires_at });
});

/** simple pass-through endpoints (use spotifyGet) */
app.get('/api/me', requireSession, async (req, res) => {
  try { const data = await spotifyGet(req.sessionId, 'me'); res.json(data); }
  catch (e) { res.status(e.status || 500).json({ error: 'Failed to fetch profile' }); }
});

app.get('/api/top-artists', requireSession, async (req, res) => {
  const limit = req.query.limit || 10; const time_range = req.query.time_range || 'medium_term';
  try { const data = await spotifyGet(req.sessionId, 'me/top/artists', { limit, time_range }); res.json(data); }
  catch (e) { res.status(e.status || 500).json({ error: 'Failed to fetch top artists' }); }
});

app.get('/api/top-tracks', requireSession, async (req, res) => {
  const limit = req.query.limit || 10; const time_range = req.query.time_range || 'medium_term';
  try { const data = await spotifyGet(req.sessionId, 'me/top/tracks', { limit, time_range }); res.json(data); }
  catch (e) { res.status(e.status || 500).json({ error: 'Failed to fetch top tracks' }); }
});

app.get('/api/recently-played', requireSession, async (req, res) => {
  try { const d = await spotifyGet(req.sessionId, 'me/player/recently-played', { limit: 50 }); res.json(d); }
  catch (e) { res.status(e.status || 500).json({ error: 'Failed to fetch recently played' }); }
});

app.get('/api/now-playing', requireSession, async (req, res) => {
  try { const d = await spotifyGet(req.sessionId, 'me/player'); res.json(d || {}); }
  catch (e) { res.json({}); }
});

app.get('/api/playlists', requireSession, async (req, res) => {
  try { const d = await spotifyGet(req.sessionId, 'me/playlists', { limit: 20 }); res.json(d); }
  catch (e) { res.status(e.status || 500).json({ error: 'Failed to fetch playlists' }); }
});

app.get('/api/audio-features', requireSession, async (req, res) => {
  try {
    const ids = (req.query.ids || '').split(',').filter(Boolean);
    const feats = await getAudioFeaturesBatch(req.sessionId, ids);
    res.json({ audio_features: feats });
  } catch (e) {
    res.status(e.status || 500).json({ error: 'Failed to fetch audio features' });
  }
});

/** Main robust summary endpoint (fast and tolerant) */
app.get('/api/vibe-summary', requireSession, async (req, res) => {
  const out = { _errors: {} };
  try {
    try { out.profile = await spotifyGet(req.sessionId, 'me'); } catch (e) { out._errors.profile = e.message; out.profile = null; }

    const ranges = ['short_term','medium_term','long_term'];
    const rangePromises = ranges.map(async (r) => {
      const [artists, tracks] = await Promise.allSettled([
        spotifyGet(req.sessionId, 'me/top/artists', { limit: 10, time_range: r }),
        spotifyGet(req.sessionId, 'me/top/tracks', { limit: 10, time_range: r })
      ]);
      return { range: r, artists, tracks };
    });

    const rangeResults = await Promise.all(rangePromises);
    out.top = { artists: {}, tracks: {} };
    for (const rr of rangeResults) {
      out.top.artists[rr.range] = (rr.artists.status === 'fulfilled' ? (rr.artists.value.items || []) : []);
      if (rr.artists.status === 'rejected') out._errors[`top_artists_${rr.range}`] = rr.artists.reason.message;
      out.top.tracks[rr.range] = (rr.tracks.status === 'fulfilled' ? (rr.tracks.value.items || []) : []);
      if (rr.tracks.status === 'rejected') out._errors[`top_tracks_${rr.range}`] = rr.tracks.reason.message;
    }

    const artistsRes = await getTopWithFallback(req.sessionId, 'artists', 8);
    const tracksRes = await getTopWithFallback(req.sessionId, 'tracks', 8);
    out.topArtists = artistsRes.items || [];
    out.topTracks = tracksRes.items || [];
    out.sources = { artists: artistsRes.used, tracks: tracksRes.used };

    try {
      const recent = await spotifyGet(req.sessionId, 'me/player/recently-played', { limit: 50 });
      out.recentlyPlayed = recent.items || [];
      out.activityByHour = hourHistogram(recent.items || []);
    } catch (e) {
      out._errors.recentlyPlayed = e.message;
      out.recentlyPlayed = [];
      out.activityByHour = hourHistogram([]);
    }

    try { const pls = await spotifyGet(req.sessionId, 'me/playlists', { limit: 20 }); out.playlists = pls.items || []; }
    catch (e) { out._errors.playlists = e.message; out.playlists = []; }

    try { const now = await spotifyGet(req.sessionId, 'me/player'); out.nowPlaying = now || {}; }
    catch (_) { out.nowPlaying = {}; }

    out.topGenres = pickTopGenres(out.topArtists, 8);

    try {
      const ids = (out.topTracks || []).map(t => t.id).filter(Boolean);
      if (!ids.length && out.recentlyPlayed.length) ids.push(...(out.recentlyPlayed.map(i => i.track?.id).filter(Boolean)));
      const feats = await getAudioFeaturesBatch(req.sessionId, ids.slice(0, 80));
      out.audioFeaturesAvg = aggregateAudioFeatures(feats);
    } catch (e) { out._errors.audioFeatures = e.message; out.audioFeaturesAvg = null; }

    out.roast = buildRoast(out.topArtists, out.topTracks);
    out.vibe = buildVibe(out.topGenres, out.topTracks);
  } catch (outerError) {
    console.error('/api/vibe-summary outer error', outerError);
    out._errors.global = outerError.message;
  }
  return res.json(out);
});

/** refresh & logout & health routes */
app.get('/api/refresh', requireSession, async (req, res) => {
  try {
    const s = sessions[req.sessionId];
    if (!s?.refresh_token) return res.status(400).json({ error: 'No refresh token' });
    const newTokens = await refreshAccessToken(s.refresh_token);
    s.access_token = newTokens.access_token;
    if (newTokens.expires_in) s.expires_at = Date.now() + newTokens.expires_in * 1000;
    if (newTokens.refresh_token) s.refresh_token = newTokens.refresh_token;
    res.json({ ok: true });
  } catch (e) {
    res.status(e.status || 500).json({ error: 'Failed to refresh' });
  }
});

app.get('/logout', (req, res) => {
  const id = req.signedCookies['vibeify_session'];
  if (id) delete sessions[id];
  res.clearCookie('vibeify_session');
  return res.redirect(FRONTEND_URI);
});

app.get('/health', (req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Vibeify backend running in ${NODE_ENV} on http://127.0.0.1:${PORT}`);
});
