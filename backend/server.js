const express = require('express');
const axios = require('axios');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');
const qs = require('querystring');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();

// Enhanced production settings
app.set('trust proxy', 1);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const {
  SESSION_SECRET,
  SPOTIFY_CLIENT_ID,
  SPOTIFY_CLIENT_SECRET,
  SPOTIFY_REDIRECT_URI,
  FRONTEND_URI,
  PORT = 5000,
  NODE_ENV = 'production'
} = process.env;

// Validate required environment variables
if (!SESSION_SECRET || !SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET || !SPOTIFY_REDIRECT_URI || !FRONTEND_URI) {
  console.error('Missing required environment variables:', {
    SESSION_SECRET: !!SESSION_SECRET,
    SPOTIFY_CLIENT_ID: !!SPOTIFY_CLIENT_ID,
    SPOTIFY_CLIENT_SECRET: !!SPOTIFY_CLIENT_SECRET,
    SPOTIFY_REDIRECT_URI: !!SPOTIFY_REDIRECT_URI,
    FRONTEND_URI: !!FRONTEND_URI
  });
  process.exit(1);
}

console.log('Environment loaded:', {
  NODE_ENV,
  SPOTIFY_REDIRECT_URI,
  FRONTEND_URI
});

// Enhanced CORS configuration for frontend-backend communication
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      FRONTEND_URI,
      'http://localhost:3000',
      'http://localhost:3001',
      'https://vibeify-frontend.onrender.com',
      'https://vibeify-q112.onrender.com'
    ];
    
    if (allowedOrigins.includes(origin) || origin.endsWith('.onrender.com')) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['Set-Cookie']
}));

// Handle preflight requests
app.options('*', cors());

// Secure cookie parser
app.use(cookieParser(SESSION_SECRET, {
  secure: NODE_ENV === 'production',
  sameSite: NODE_ENV === 'production' ? 'none' : 'lax'
}));

// Session store with automatic cleanup
const sessions = new Map();
const SESSION_EXPIRY = 7 * 24 * 60 * 60 * 1000;

// Session cleanup every hour
setInterval(() => {
  const now = Date.now();
  for (const [id, session] of sessions) {
    if (session.expires_at && session.expires_at < now) {
      sessions.delete(id);
    }
  }
}, 60 * 60 * 1000);

// Utility functions
const randomString = (len = 16) => crypto.randomBytes(len).toString('hex');

const spotifyApi = axios.create({
  baseURL: 'https://api.spotify.com/v1/',
  timeout: 15000,
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
        'Authorization': `Basic ${authHeader}`,
        'Accept': 'application/json'
      },
      timeout: 10000
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
        'Authorization': `Basic ${authHeader}`,
        'Accept': 'application/json'
      },
      timeout: 10000
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
      throw new Error('Token refresh failed: ' + err.message);
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
  try {
    const state = randomString(32);
    res.cookie('oauth_state', state, {
      httpOnly: true,
      secure: NODE_ENV === 'production',
      sameSite: NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 600000,
      signed: true
    });
    
    const authUrl = buildAuthUrl(state);
    console.log('Redirecting to Spotify auth:', authUrl);
    res.redirect(authUrl);
  } catch (error) {
    console.error('Auth initiation error:', error);
    res.status(500).json({ error: 'Failed to initiate authentication' });
  }
});

app.get('/auth/spotify/callback', async (req, res) => {
  try {
    const { code, state, error } = req.query;
    const storedState = req.signedCookies.oauth_state;

    console.log('Auth callback received:', { hasCode: !!code, hasState: !!state, hasStoredState: !!storedState });

    if (error) {
      throw new Error(`Spotify auth error: ${error}`);
    }
    if (!state || !storedState || state !== storedState) {
      throw new Error('Invalid state parameter');
    }
    if (!code) {
      throw new Error('No authorization code received');
    }

    const tokens = await exchangeCodeForTokens(code);
    const sessionId = randomString(32);
    
    sessions.set(sessionId, {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: Date.now() + (tokens.expires_in * 1000),
      created_at: Date.now()
    });

    res.cookie('vibeify_session', sessionId, {
      httpOnly: true,
      secure: NODE_ENV === 'production',
      sameSite: NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: SESSION_EXPIRY,
      signed: true
    });

    res.clearCookie('oauth_state');
    
    console.log('Auth successful, redirecting to:', FRONTEND_URI + '/dashboard');
    res.redirect(FRONTEND_URI + '/dashboard');
  } catch (error) {
    console.error('Auth callback error:', error.message);
    const redirectUrl = FRONTEND_URI + `/?error=${encodeURIComponent(error.message)}`;
    res.redirect(redirectUrl);
  }
});

// API routes middleware
const requireSession = (req, res, next) => {
  const sessionId = req.signedCookies.vibeify_session;
  if (!sessionId || !sessions.has(sessionId)) {
    return res.status(401).json({ error: 'Unauthorized - Please login again' });
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
    console.error('Profile fetch error:', error.message);
    res.status(error.status || 500).json({ error: error.message });
  }
});

app.get('/api/top/:type', requireSession, async (req, res) => {
  try {
    const { type } = req.params;
    const { limit = 10, time_range = 'medium_term' } = req.query;
    
    if (!['artists', 'tracks'].includes(type)) {
      return res.status(400).json({ error: 'Invalid type. Use "artists" or "tracks"' });
    }

    const data = await spotifyRequest(
      req.sessionId, 
      'GET', 
      `me/top/${type}`, 
      { limit: parseInt(limit), time_range }
    );
    res.json(data);
  } catch (error) {
    console.error('Top items fetch error:', error.message);
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
      { limit: parseInt(limit) }
    );
    res.json(data);
  } catch (error) {
    console.error('Recently played fetch error:', error.message);
    res.status(error.status || 500).json({ error: error.message });
  }
});

app.get('/api/playlists', requireSession, async (req, res) => {
  try {
    const { limit = 20, offset = 0 } = req.query;
    const data = await spotifyRequest(
      req.sessionId, 
      'GET', 
      'me/playlists', 
      { limit: parseInt(limit), offset: parseInt(offset) }
    );
    res.json(data);
  } catch (error) {
    console.error('Playlists fetch error:', error.message);
    res.status(error.status || 500).json({ error: error.message });
  }
});

app.get('/api/now-playing', requireSession, async (req, res) => {
  try {
    const data = await spotifyRequest(req.sessionId, 'GET', 'me/player');
    res.json(data || {});
  } catch (error) {
    console.error('Now playing fetch error:', error.message);
    res.json({});
  }
});

app.get('/api/audio-features', requireSession, async (req, res) => {
  try {
    const ids = (req.query.ids || '').split(',').filter(Boolean);
    if (ids.length === 0) {
      return res.json({ audio_features: [] });
    }
    
    const data = await spotifyRequest(
      req.sessionId, 
      'GET', 
      'audio-features', 
      { ids: ids.join(',') }
    );
    res.json(data);
  } catch (error) {
    console.error('Audio features fetch error:', error.message);
    res.status(error.status || 500).json({ error: error.message });
  }
});

// Comprehensive analysis endpoint
app.get('/api/vibe-summary', requireSession, async (req, res) => {
  try {
    const [profile, topArtists, topTracks, recentlyPlayed, playlists] = await Promise.allSettled([
      spotifyRequest(req.sessionId, 'GET', 'me'),
      spotifyRequest(req.sessionId, 'GET', 'me/top/artists', { limit: 10, time_range: 'medium_term' }),
      spotifyRequest(req.sessionId, 'GET', 'me/top/tracks', { limit: 10, time_range: 'medium_term' }),
      spotifyRequest(req.sessionId, 'GET', 'me/player/recently-played', { limit: 50 }),
      spotifyRequest(req.sessionId, 'GET', 'me/playlists', { limit: 20 })
    ]);

    // Process results
    const result = {
      profile: profile.status === 'fulfilled' ? profile.value : null,
      topArtists: topArtists.status === 'fulfilled' ? topArtists.value.items : [],
      topTracks: topTracks.status === 'fulfilled' ? topTracks.value.items : [],
      recentlyPlayed: recentlyPlayed.status === 'fulfilled' ? recentlyPlayed.value.items : [],
      playlists: playlists.status === 'fulfilled' ? playlists.value.items : [],
      errors: {}
    };

    if (profile.status === 'rejected') result.errors.profile = profile.reason.message;
    if (topArtists.status === 'rejected') result.errors.topArtists = topArtists.reason.message;
    if (topTracks.status === 'rejected') result.errors.topTracks = topTracks.reason.message;
    if (recentlyPlayed.status === 'rejected') result.errors.recentlyPlayed = recentlyPlayed.reason.message;
    if (playlists.status === 'rejected') result.errors.playlists = playlists.reason.message;

    // Get audio features if we have tracks
    if (result.topTracks.length > 0) {
      try {
        const trackIds = result.topTracks.map(track => track.id).filter(Boolean);
        const audioFeatures = await spotifyRequest(
          req.sessionId, 
          'GET', 
          'audio-features', 
          { ids: trackIds.slice(0, 100).join(',') }
        );
        result.audioFeatures = calculateAudioFeatures(
          result.topTracks.map(track => ({
            ...track,
            audio_features: audioFeatures.audio_features?.find(f => f?.id === track.id)
          }))
        );
      } catch (error) {
        result.errors.audioFeatures = error.message;
      }
    }

    // Generate insights
    result.topGenres = analyzeTopGenres(result.topArtists);
    result.insights = {
      primaryGenre: result.topGenres[0]?.genre || 'Unknown',
      topArtist: result.topArtists[0]?.name || 'None',
      topTrack: result.topTracks[0]?.name || 'None'
    };

    res.json(result);
  } catch (error) {
    console.error('Vibe summary error:', error.message);
    res.status(error.status || 500).json({ error: error.message });
  }
});

// Session management
app.post('/api/refresh-token', requireSession, async (req, res) => {
  try {
    const session = sessions.get(req.sessionId);
    if (!session?.refresh_token) {
      return res.status(400).json({ error: 'No refresh token available' });
    }

    const newTokens = await refreshTokens(session.refresh_token);
    session.access_token = newTokens.access_token;
    session.expires_at = Date.now() + (newTokens.expires_in * 1000);
    if (newTokens.refresh_token) {
      session.refresh_token = newTokens.refresh_token;
    }

    res.json({ success: true, expires_at: session.expires_at });
  } catch (error) {
    console.error('Token refresh error:', error.message);
    res.status(error.status || 500).json({ error: error.message });
  }
});

app.post('/api/logout', requireSession, (req, res) => {
  sessions.delete(req.sessionId);
  res.clearCookie('vibeify_session');
  res.json({ success: true });
});

// Debug endpoints
app.get('/api/debug/sessions', (req, res) => {
  if (NODE_ENV !== 'production') {
    res.json({
      sessionCount: sessions.size,
      sessions: Array.from(sessions.entries()).map(([id, session]) => ({
        id,
        hasToken: !!session.access_token,
        expires_at: session.expires_at,
        created_at: session.created_at
      }))
    });
  } else {
    res.status(404).end();
  }
});

app.get('/api/debug/env', (req, res) => {
  if (NODE_ENV !== 'production') {
    res.json({
      NODE_ENV,
      SPOTIFY_REDIRECT_URI,
      FRONTEND_URI,
      hasClientId: !!SPOTIFY_CLIENT_ID,
      hasClientSecret: !!SPOTIFY_CLIENT_SECRET,
      hasSessionSecret: !!SESSION_SECRET
    });
  } else {
    res.status(404).end();
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
    sessionCount: sessions.size,
    version: '1.0.0'
  });
});

// Redirect root to frontend
app.get('/', (req, res) => {
  res.redirect(FRONTEND_URI);
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.stack);
  res.status(500).json({ 
    error: 'Internal server error',
    message: NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`
🚀 Server running in ${NODE_ENV} mode
📍 Port: ${PORT}
🔗 Frontend: ${FRONTEND_URI}
🎵 Spotify Redirect: ${SPOTIFY_REDIRECT_URI}
  `);
});