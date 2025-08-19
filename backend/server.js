const express = require('express');
const axios = require('axios');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');
const qs = require('querystring');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// Enhanced production settings
app.set('trust proxy', 1); // Trust first proxy for secure cookies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const {
  SESSION_SECRET,
  SPOTIFY_CLIENT_ID,
  SPOTIFY_CLIENT_SECRET,
  SPOTIFY_REDIRECT_URI,
  PORT = 5000,
  NODE_ENV = 'production'
} = process.env;

if (!SESSION_SECRET || !SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
  console.error('Missing required environment variables');
  process.exit(1);
}

// Secure cookie and CORS configuration
app.use(cookieParser(SESSION_SECRET, {
  secure: NODE_ENV === 'production',
  sameSite: NODE_ENV === 'production' ? 'none' : 'lax'
}));

app.use(cors({
  origin: NODE_ENV === 'production' ? SPOTIFY_REDIRECT_URI.split('/auth')[0] : 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Serve static files in production
if (NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/build'), {
    maxAge: '1y',
    immutable: true
  }));
}

// Session store with automatic cleanup
const sessions = new Map();
const SESSION_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days

setInterval(() => {
  const now = Date.now();
  for (const [id, session] of sessions) {
    if (session.expires_at && session.expires_at < now) {
      sessions.delete(id);
    }
  }
}, 60 * 60 * 1000); // Cleanup hourly

// Utility functions
const randomString = (len = 16) => crypto.randomBytes(len).toString('hex');

const spotifyApi = axios.create({
  baseURL: 'https://api.spotify.com/v1/',
  timeout: 10000,
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  }
});

const retryRequest = async (fn, attempts = 3, delay = 300) => {
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === attempts - 1) throw err;
      await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
    }
  }
};

// Spotify OAuth helpers
const buildAuthUrl = (state) => {
  const params = {
    response_type: 'code',
    client_id: SPOTIFY_CLIENT_ID,
    scope: [
      'user-read-private',
      'user-read-email',
      'user-top-read',
      'user-read-recently-played',
      'playlist-read-private',
      'user-read-playback-state'
    ].join(' '),
    redirect_uri: SPOTIFY_REDIRECT_URI,
    state,
    show_dialog: NODE_ENV !== 'production'
  };
  return `https://accounts.spotify.com/authorize?${qs.stringify(params)}`;
};

const exchangeCodeForTokens = async (code) => {
  const tokenUrl = 'https://accounts.spotify.com/api/token';
  const authHeader = Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64');

  return retryRequest(async () => {
    const { data } = await axios.post(tokenUrl, qs.stringify({
      grant_type: 'authorization_code',
      code,
      redirect_uri: SPOTIFY_REDIRECT_URI
    }), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${authHeader}`
      }
    });
    return data;
  });
};

const refreshTokens = async (refreshToken) => {
  const tokenUrl = 'https://accounts.spotify.com/api/token';
  const authHeader = Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64');

  return retryRequest(async () => {
    const { data } = await axios.post(tokenUrl, qs.stringify({
      grant_type: 'refresh_token',
      refresh_token: refreshToken
    }), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${authHeader}`
      }
    });
    return data;
  });
};

// API request handler with automatic token refresh
const spotifyRequest = async (sessionId, method, endpoint, params = {}) => {
  const session = sessions.get(sessionId);
  if (!session) {
    const err = new Error('Invalid session');
    err.status = 401;
    throw err;
  }

  // Refresh tokens if expired
  if (session.expires_at && session.expires_at <= Date.now()) {
    try {
      const newTokens = await refreshTokens(session.refresh_token);
      session.access_token = newTokens.access_token;
      session.expires_at = Date.now() + (newTokens.expires_in * 1000);
      if (newTokens.refresh_token) {
        session.refresh_token = newTokens.refresh_token;
      }
    } catch (err) {
      sessions.delete(sessionId);
      throw err;
    }
  }

  return retryRequest(async () => {
    const response = await spotifyApi({
      method,
      url: endpoint,
      params: method === 'GET' ? params : undefined,
      data: method !== 'GET' ? params : undefined,
      headers: {
        'Authorization': `Bearer ${session.access_token}`
      }
    });
    return response.data;
  });
};

// Data processing helpers
const analyzeTopGenres = (artists = [], limit = 5) => {
  const genreCounts = {};
  artists.forEach(artist => {
    artist.genres?.forEach(genre => {
      genreCounts[genre] = (genreCounts[genre] || 0) + 1;
    });
  });
  return Object.entries(genreCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([genre, count]) => ({ genre, count }));
};

const calculateAudioFeatures = (tracks = []) => {
  const features = {
    danceability: 0,
    energy: 0,
    valence: 0,
    acousticness: 0,
    instrumentalness: 0,
    liveness: 0,
    speechiness: 0,
    tempo: 0,
    count: 0
  };

  tracks.forEach(track => {
    if (track.audio_features) {
      features.danceability += track.audio_features.danceability || 0;
      features.energy += track.audio_features.energy || 0;
      features.valence += track.audio_features.valence || 0;
      features.acousticness += track.audio_features.acousticness || 0;
      features.instrumentalness += track.audio_features.instrumentalness || 0;
      features.liveness += track.audio_features.liveness || 0;
      features.speechiness += track.audio_features.speechiness || 0;
      features.tempo += track.audio_features.tempo || 0;
      features.count++;
    }
  });

  if (features.count > 0) {
    for (const key in features) {
      if (key !== 'count') {
        features[key] = features[key] / features.count;
      }
    }
  }

  return features;
};

// Authentication routes
app.get('/auth/spotify', (req, res) => {
  const state = randomString(32);
  res.cookie('oauth_state', state, {
    httpOnly: true,
    secure: NODE_ENV === 'production',
    sameSite: NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 600000, // 10 minutes
    signed: true
  });
  res.redirect(buildAuthUrl(state));
});

app.get('/auth/spotify/callback', async (req, res) => {
  try {
    const { code, state, error } = req.query;
    const storedState = req.signedCookies.oauth_state;

    if (error) throw new Error(`Spotify auth error: ${error}`);
    if (!state || !storedState || state !== storedState) throw new Error('Invalid state');

    const tokens = await exchangeCodeForTokens(code);
    const sessionId = randomString(32);
    
    sessions.set(sessionId, {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: Date.now() + (tokens.expires_in * 1000)
    });

    res.cookie('vibeify_session', sessionId, {
      httpOnly: true,
      secure: NODE_ENV === 'production',
      sameSite: NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: SESSION_EXPIRY,
      signed: true
    });

    res.clearCookie('oauth_state');
    res.redirect(NODE_ENV === 'production' ? '/dashboard' : 'http://localhost:3000/dashboard');
  } catch (error) {
    console.error('Auth callback error:', error);
    const redirectUrl = NODE_ENV === 'production' 
      ? `/?error=${encodeURIComponent(error.message)}` 
      : `http://localhost:3000/?error=${encodeURIComponent(error.message)}`;
    res.redirect(redirectUrl);
  }
});

// API routes middleware
const requireSession = (req, res, next) => {
  const sessionId = req.signedCookies.vibeify_session;
  if (!sessionId || !sessions.has(sessionId)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  req.sessionId = sessionId;
  next();
};

// User data endpoints
app.get('/api/me', requireSession, async (req, res) => {
  try {
    const profile = await spotifyRequest(req.sessionId, 'GET', 'me');
    res.json(profile);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

app.get('/api/top/:type', requireSession, async (req, res) => {
  try {
    const { type } = req.params;
    const { limit = 10, time_range = 'medium_term' } = req.query;
    const data = await spotifyRequest(
      req.sessionId, 
      'GET', 
      `me/top/${type}`, 
      { limit, time_range }
    );
    res.json(data);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

app.get('/api/recently-played', requireSession, async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const data = await spotifyRequest(
      req.sessionId, 
      'GET', 
      'me/player/recently-played', 
      { limit }
    );
    res.json(data);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

app.get('/api/playlists', requireSession, async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const data = await spotifyRequest(
      req.sessionId, 
      'GET', 
      'me/playlists', 
      { limit }
    );
    res.json(data);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

// Comprehensive analysis endpoint
app.get('/api/vibe-summary', requireSession, async (req, res) => {
  try {
    const [profile, topArtists, topTracks, recentlyPlayed, playlists] = await Promise.all([
      spotifyRequest(req.sessionId, 'GET', 'me'),
      spotifyRequest(req.sessionId, 'GET', 'me/top/artists', { limit: 10, time_range: 'medium_term' }),
      spotifyRequest(req.sessionId, 'GET', 'me/top/tracks', { limit: 10, time_range: 'medium_term' }),
      spotifyRequest(req.sessionId, 'GET', 'me/player/recently-played', { limit: 50 }),
      spotifyRequest(req.sessionId, 'GET', 'me/playlists', { limit: 20 })
    ]);

    // Get audio features for top tracks
    const trackIds = topTracks.items.map(track => track.id).filter(Boolean);
    const audioFeatures = trackIds.length > 0 
      ? await spotifyRequest(req.sessionId, 'GET', 'audio-features', { ids: trackIds.join(',') })
      : { audio_features: [] };

    // Enhance tracks with audio features
    const enhancedTracks = topTracks.items.map(track => ({
      ...track,
      audio_features: audioFeatures.audio_features.find(f => f?.id === track.id)
    }));

    // Generate insights
    const topGenres = analyzeTopGenres(topArtists.items);
    const audioStats = calculateAudioFeatures(enhancedTracks);

    res.json({
      profile,
      topArtists: topArtists.items,
      topTracks: enhancedTracks,
      recentlyPlayed: recentlyPlayed.items,
      playlists: playlists.items,
      topGenres,
      audioFeatures: audioStats,
      insights: {
        primaryGenre: topGenres[0]?.genre || 'Unknown',
        energyLevel: audioStats.energy > 0.7 ? 'High' : audioStats.energy > 0.4 ? 'Medium' : 'Low',
        mood: audioStats.valence > 0.7 ? 'Positive' : audioStats.valence > 0.4 ? 'Neutral' : 'Mellow'
      }
    });
  } catch (error) {
    console.error('Vibe summary error:', error);
    res.status(error.status || 500).json({ error: error.message });
  }
});

// Session management
app.post('/api/refresh-token', requireSession, async (req, res) => {
  try {
    const session = sessions.get(req.sessionId);
    if (!session?.refresh_token) throw new Error('No refresh token available');

    const newTokens = await refreshTokens(session.refresh_token);
    session.access_token = newTokens.access_token;
    session.expires_at = Date.now() + (newTokens.expires_in * 1000);
    if (newTokens.refresh_token) {
      session.refresh_token = newTokens.refresh_token;
    }

    res.json({ success: true });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

app.post('/api/logout', requireSession, (req, res) => {
  sessions.delete(req.sessionId);
  res.clearCookie('vibeify_session');
  res.json({ success: true });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
    sessionCount: sessions.size
  });
});

// Serve React app in production
if (NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'));
  });
}

// Error handling
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`
  Server running in ${NODE_ENV} mode
  Listening on port ${PORT}
  Spotify callback: ${SPOTIFY_REDIRECT_URI}
  `);
});