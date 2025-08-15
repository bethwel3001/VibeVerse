const express = require('express');
const axios = require('axios');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');
const qs = require('querystring');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());

// Use cookie-parser with SESSION_SECRET to enable signed cookies
const {
  SESSION_SECRET = 'super_secret_key',
  SPOTIFY_CLIENT_ID,
  SPOTIFY_CLIENT_SECRET,
  SPOTIFY_REDIRECT_URI = 'http://127.0.0.1:5000/auth/spotify/callback',
  FRONTEND_URI = 'http://127.0.0.1:3000',
  PORT = 5000,
  NODE_ENV = 'development',
} = process.env;

app.use(cookieParser(SESSION_SECRET));

// Enable CORS for frontend and allow credentials (cookies)
app.use(
  cors({
    origin: FRONTEND_URI,
    credentials: true,
  })
);

// In-memory session store (for demo only)
const sessions = {};

// Helper: random hex string
function randomString(length = 16) {
  return crypto.randomBytes(length).toString('hex');
}

function spotifyAuthorizeURL(state) {
  const scope = [
    'user-read-private',
    'user-read-email',
    'user-top-read',
    'user-read-recently-played',
  ].join(' ');

  const params = {
    response_type: 'code',
    client_id: SPOTIFY_CLIENT_ID,
    scope,
    redirect_uri: SPOTIFY_REDIRECT_URI,
    state,
    // force consent screen in dev so scopes are definitely granted
    show_dialog: NODE_ENV === 'development',
  };

  return `https://accounts.spotify.com/authorize?${qs.stringify(params)}`;
}

/**
 * Exchange code for token (server-side)
 */
async function exchangeCodeForToken(code) {
  const tokenUrl = 'https://accounts.spotify.com/api/token';
  const data = {
    grant_type: 'authorization_code',
    code,
    redirect_uri: SPOTIFY_REDIRECT_URI,
  };

  const headers = {
    'Content-Type': 'application/x-www-form-urlencoded',
    Authorization:
      'Basic ' + Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64'),
  };

  const resp = await axios.post(tokenUrl, qs.stringify(data), { headers });
  return resp.data;
}

/**
 * Refresh token
 */
async function refreshAccessToken(refresh_token) {
  const tokenUrl = 'https://accounts.spotify.com/api/token';
  const data = {
    grant_type: 'refresh_token',
    refresh_token,
  };
  const headers = {
    'Content-Type': 'application/x-www-form-urlencoded',
    Authorization:
      'Basic ' + Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64'),
  };

  const resp = await axios.post(tokenUrl, qs.stringify(data), { headers });
  return resp.data;
}

/**
 * Proxy GET to Spotify Web API using stored session tokens.
 * Automatically refreshes if token expired (simple check).
 */
async function spotifyGet(sessionId, path, params = {}) {
  const session = sessions[sessionId];
  if (!session) throw new Error('No session');

  try {
    // refresh if expired (expires_at stored as ms timestamp)
    const now = Date.now();
    if (session.expires_at && session.expires_at <= now) {
      console.log('Access token expired — refreshing...');
      const newTokens = await refreshAccessToken(session.refresh_token);
      session.access_token = newTokens.access_token;
      if (newTokens.expires_in) {
        session.expires_at = Date.now() + newTokens.expires_in * 1000;
      }
      if (newTokens.refresh_token) session.refresh_token = newTokens.refresh_token;
    }

    const headers = { Authorization: `Bearer ${session.access_token}` };
    const url = `https://api.spotify.com/v1/${path}`;
    const resp = await axios.get(url, { headers, params });
    return resp.data;
  } catch (e) {
    console.error('spotifyGet ERROR ->', {
      path,
      status: e.response?.status,
      data: e.response?.data,
      message: e.message,
    });
    const message = e.response?.data?.error || e.response?.data || e.message;
    const err = new Error('Spotify API error: ' + JSON.stringify(message));
    err.status = e.response?.status || 500;
    throw err;
  }
}

/** ---------- Small helpers for the vibe summary ---------- **/

function pickTopGenres(artists = [], max = 3) {
  const counts = {};
  for (const a of artists) {
    (a.genres || []).forEach(g => {
      counts[g] = (counts[g] || 0) + 1;
    });
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([g]) => g);
}

function firstDefinedImage(obj) {
  if (!obj) return null;
  const imgs = obj.images || obj.album?.images || [];
  return imgs?.[0]?.url || null;
}

function buildRoast(artists = [], tracks = []) {
  if (artists.length === 0 && tracks.length === 0) {
    return "Your listening is as mysterious as a demo playlist. Go hit play!";
  }
  const a = artists[0]?.name;
  const t = tracks[0]?.name;
  if (a && t) return `You loop ${a} and call ${t} “variety.”`;
  if (a) return `You vibe like you put ${a} on loop and call it “research.”`;
  if (t) return `You replay ${t} like it's a thesis topic.`;
  return "Chaotic neutral energy. Respect.";
}

function buildVibe(topGenres = [], tracks = []) {
  if (topGenres.length && tracks.length) {
    return `You’re a ${topGenres[0]} listener with a soft spot for ${tracks[0].name}.`;
  }
  if (topGenres.length) return `Mostly ${topGenres[0]} with curious detours.`;
  if (tracks.length) return `Undefined genre, but you’re loyal to ${tracks[0].name}.`;
  return "A musical ghost — build your vibe with a few spins.";
}

/**
 * Try multiple time ranges for "top" endpoints, then fall back to recently played.
 */
async function getTopWithFallback(sessionId, type = 'artists', limit = 10) {
  const ranges = ['medium_term', 'short_term', 'long_term']; // many users only have short_term
  let items = [];
  for (const time_range of ranges) {
    try {
      const res = await spotifyGet(sessionId, `me/top/${type}`, { limit, time_range });
      if (Array.isArray(res?.items) && res.items.length > 0) {
        return { items: res.items, used: { type, source: 'top', time_range } };
      }
    } catch (_) {
      // ignore here; will try next
    }
  }
  // fallback to recently played (for tracks only)
  if (type === 'tracks') {
    try {
      const recent = await spotifyGet(sessionId, 'me/player/recently-played', { limit: Math.max(20, limit) });
      const trackItems = (recent?.items || [])
        .map(i => i.track)
        .filter(Boolean)
        .slice(0, limit);
      if (trackItems.length > 0) {
        return { items: trackItems, used: { type, source: 'recently_played' } };
      }
    } catch (_) {}
  }
  return { items, used: { type, source: 'none' } };
}

/**
 * ROUTES
 */

// 1) /auth/spotify -> start the OAuth flow (redirect to Spotify)
app.get('/auth/spotify', (req, res) => {
  const state = randomString(8);
  res.cookie('oauth_state', state, {
    signed: true,
    httpOnly: true,
    maxAge: 10 * 60 * 1000, // 10 minutes
    sameSite: 'lax',
    secure: false, // dev
  });

  const authUrl = spotifyAuthorizeURL(state);
  console.log('Redirecting user to Spotify Authorization URL');
  return res.redirect(authUrl);
});

/**
 * Callback endpoint (Spotify will redirect here)
 * This must match SPOTIFY_REDIRECT_URI configured in Spotify Developer Dashboard.
 */
app.get('/auth/spotify/callback', async (req, res) => {
  const { code, state, error } = req.query;
  const signedState = req.signedCookies['oauth_state'];

  if (error) {
    // user denied or other error
    return res.redirect(`${FRONTEND_URI}/?error=${encodeURIComponent(error)}`);
  }

  if (!state || !signedState || state !== signedState) {
    console.error('State mismatch', { state, signedState });
    return res.status(400).send('State mismatch or missing. Authentication failed.');
  }

  try {
    const tokenData = await exchangeCodeForToken(code);
    console.log('TOKEN DATA (scope):', tokenData.scope);

    // create session id and store tokens in memory
    const sessionId = randomString(12);
    const now = Date.now();
    sessions[sessionId] = {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: tokenData.expires_in ? now + tokenData.expires_in * 1000 : null,
    };

    console.log('Created session:', sessionId, {
      hasAccessToken: !!sessions[sessionId].access_token,
      hasRefreshToken: !!sessions[sessionId].refresh_token,
      expires_at: sessions[sessionId].expires_at,
    });

    // set signed session cookie so frontend requests include it
    res.cookie('vibeify_session', sessionId, {
      signed: true,
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      sameSite: 'lax',
      secure: false, // dev
    });

    // clear oauth_state cookie
    res.clearCookie('oauth_state');

    // redirect to frontend dashboard
    return res.redirect(`${FRONTEND_URI}/dashboard`);
  } catch (e) {
    console.error('Token exchange error:', e.response ? e.response.data : e.message);
    return res.redirect(`${FRONTEND_URI}/?error=token_exchange_failed`);
  }
});

// Middleware to require signed session cookie
function requireSession(req, res, next) {
  const sessionId = req.signedCookies['vibeify_session'];
  if (!sessionId || !sessions[sessionId]) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  req.sessionId = sessionId;
  next();
}

// Dev helper
app.get('/api/debug-session', requireSession, (req, res) => {
  if (NODE_ENV !== 'development') return res.status(404).end();
  const s = sessions[req.sessionId];
  return res.json({
    hasAccessToken: !!s.access_token,
    hasRefreshToken: !!s.refresh_token,
    expires_at: s.expires_at,
  });
});

// API routes (proxy to Spotify)
app.get('/api/me', requireSession, async (req, res) => {
  try {
    const data = await spotifyGet(req.sessionId, 'me');
    res.json(data);
  } catch (e) {
    console.error('/api/me error', e.message || e);
    res.status(e.status || 500).json({ error: 'Failed to fetch profile' });
  }
});

app.get('/api/top-artists', requireSession, async (req, res) => {
  const limit = req.query.limit || 10;
  const time_range = req.query.time_range || 'medium_term';
  try {
    const data = await spotifyGet(req.sessionId, 'me/top/artists', { limit, time_range });
    res.json(data);
  } catch (e) {
    console.error('/api/top-artists error', e.message || e);
    res.status(e.status || 500).json({ error: 'Failed to fetch top artists' });
  }
});

app.get('/api/top-tracks', requireSession, async (req, res) => {
  const limit = req.query.limit || 10;
  const time_range = req.query.time_range || 'medium_term';
  try {
    const data = await spotifyGet(req.sessionId, 'me/top/tracks', { limit, time_range });
    res.json(data);
  } catch (e) {
    console.error('/api/top-tracks error', e.message || e);
    res.status(e.status || 500).json({ error: 'Failed to fetch top tracks' });
  }
});

app.get('/api/recently-played', requireSession, async (req, res) => {
  try {
    const data = await spotifyGet(req.sessionId, 'me/player/recently-played', { limit: 20 });
    res.json(data);
  } catch (e) {
    console.error('/api/recently-played error', e.message || e);
    res.status(e.status || 500).json({ error: 'Failed to fetch recently played' });
  }
});

/**
 * NEW: aggregated summary with strong fallbacks.
 * Returns: { profile, topArtists, topTracks, mostListenedArtist, topGenres, roast, vibe, sources }
 */
app.get('/api/vibe-summary', requireSession, async (req, res) => {
  try {
    // profile
    const me = await spotifyGet(req.sessionId, 'me');

    // top artists/tracks with fallbacks (short_term, long_term, then recently played for tracks)
    const artistsRes = await getTopWithFallback(req.sessionId, 'artists', 8);
    const tracksRes  = await getTopWithFallback(req.sessionId, 'tracks', 6);

    const topArtists = artistsRes.items || [];
    const topTracks  = tracksRes.items || [];

    // derive most listened artist (prefer topArtists[0], otherwise from tracks' first artist)
    let mostListenedArtist = topArtists[0] || null;
    if (!mostListenedArtist && topTracks[0]?.artists?.length) {
      mostListenedArtist = topTracks[0].artists[0];
    }

    // genres from artists
    const topGenres = pickTopGenres(topArtists, 3);

    const roast = buildRoast(topArtists, topTracks);
    const vibe  = buildVibe(topGenres, topTracks);

    res.json({
      profile: me,
      topArtists,
      topTracks,
      mostListenedArtist,
      topGenres,
      roast,
      vibe,
      sources: {
        artists: artistsRes.used,
        tracks: tracksRes.used,
      },
    });
  } catch (e) {
    console.error('/api/vibe-summary error', e.message || e);
    res.status(e.status || 500).json({ error: 'Failed to build vibe summary' });
  }
});

// Refresh endpoint (optional)
app.get('/api/refresh', requireSession, async (req, res) => {
  try {
    const session = sessions[req.sessionId];
    if (!session || !session.refresh_token) return res.status(400).json({ error: 'No refresh token' });
    const newTokens = await refreshAccessToken(session.refresh_token);
    session.access_token = newTokens.access_token;
    if (newTokens.expires_in) session.expires_at = Date.now() + newTokens.expires_in * 1000;
    if (newTokens.refresh_token) session.refresh_token = newTokens.refresh_token;
    res.json({ ok: true });
  } catch (e) {
    console.error('/api/refresh error', e.message || e);
    res.status(e.status || 500).json({ error: 'Failed to refresh token' });
  }
});

// Logout
app.get('/logout', (req, res) => {
  const sessionId = req.signedCookies['vibeify_session'];
  if (sessionId) {
    delete sessions[sessionId];
  }
  res.clearCookie('vibeify_session');
  return res.redirect(FRONTEND_URI);
});

// Health
app.get('/health', (req, res) => res.json({ ok: true }));

// Start server
app.listen(PORT, () => {
  console.log(`Vibeify backend running in ${NODE_ENV} on http://127.0.0.1:${PORT}`);
});
