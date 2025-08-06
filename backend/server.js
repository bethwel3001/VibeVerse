require('dotenv').config();
const express = require('express');
const passport = require('passport');
const SpotifyStrategy = require('passport-spotify').Strategy;
const cors = require('cors');
const axios = require('axios');
const session = require('express-session');

const app = express();

// Enhanced configuration logging
console.log('Starting server with configuration:');
console.log('FRONTEND_URI:', process.env.FRONTEND_URI);
console.log('SPOTIFY_REDIRECT_URI:', process.env.SPOTIFY_REDIRECT_URI);
console.log('PORT:', process.env.PORT || 5000);

// Enhanced CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URI,
  credentials: true,
  exposedHeaders: ['set-cookie'],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Secure session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your_strong_secret_here',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000, // 1 day
    httpOnly: true,
    secure: false, // Set to true in production with HTTPS
    sameSite: 'lax',
    domain: '127.0.0.1'
  }
}));

// Initialize passport
app.use(passport.initialize());
app.use(passport.session());

// Spotify OAuth Strategy
passport.use(new SpotifyStrategy({
  clientID: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  callbackURL: process.env.SPOTIFY_REDIRECT_URI
}, 
(accessToken, refreshToken, expires_in, profile, done) => {
  profile.accessToken = accessToken;
  profile.refreshToken = refreshToken;
  return done(null, profile);
}));

// Serialization
passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((obj, done) => {
  done(null, obj);
});

// Routes
app.get('/auth/spotify', (req, res, next) => {
  console.log('Initiating Spotify auth flow');
  passport.authenticate('spotify', {
    scope: ['user-read-private', 'user-top-read', 'user-read-email'],
    showDialog: true
  })(req, res, next);
});

app.get('/auth/spotify/callback', 
  passport.authenticate('spotify', { 
    failureRedirect: `${process.env.FRONTEND_URI}/login`,
    session: true
  }),
  (req, res) => {
    console.log('Successful Spotify authentication for user:', req.user.id);
    res.redirect(`${process.env.FRONTEND_URI}/dashboard`);
  }
);

// User data endpoint with enhanced error handling
app.get('/api/me', async (req, res) => {
  if (!req.user?.accessToken) {
    console.log('Unauthorized - No user session');
    return res.status(401).clearCookie('connect.sid').json({ 
      error: 'Unauthorized - Please login again' 
    });
  }

  try {
    const [{ data: topArtists }, { data: profile }] = await Promise.all([
      axios.get('https://api.spotify.com/v1/me/top/artists?time_range=short_term&limit=5', {
        headers: { 'Authorization': `Bearer ${req.user.accessToken}` }
      }),
      axios.get('https://api.spotify.com/v1/me', {
        headers: { 'Authorization': `Bearer ${req.user.accessToken}` }
      })
    ]);

    res.json({
      user: {
        displayName: profile.display_name,
        email: profile.email,
        images: profile.images,
        id: profile.id
      },
      topArtists,
      personality: {
        vibe: getVibe(topArtists.items),
        roast: getRoast(topArtists.items)
      }
    });
  } catch (err) {
    console.error('Spotify API error:', err.response?.data || err.message);
    res.status(500).json({ 
      error: 'Failed to fetch Spotify data',
      details: err.response?.data || err.message
    });
  }
});

// Helper functions
const getVibe = (artists) => {
  const genres = artists.flatMap(a => a.genres);
  if (genres.includes('indie pop')) return 'Eclectic Dreamer';
  if (genres.some(g => g.includes('hip hop'))) return 'Urban Explorer';
  return 'Sonic Adventurer';
};

const getRoast = (artists) => {
  const names = artists.map(a => a.name.toLowerCase());
  if (names.includes('taylor swift')) return "Swiftie detected! 🐍";
  if (names.some(n => n.includes('beatles'))) return "Time traveler from the 60s?";
  return "Your taste is mysteriously... unique";
};

// Start server
const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(`CORS configured for: ${process.env.FRONTEND_URI}`);
  console.log(`Spotify callback: ${process.env.SPOTIFY_REDIRECT_URI}`);
});