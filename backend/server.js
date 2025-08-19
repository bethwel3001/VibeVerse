const express = require("express");
const axios = require("axios");
const cookieParser = require("cookie-parser");
const crypto = require("crypto");
const qs = require("querystring");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(express.json());

const {
  SESSION_SECRET = "super_secret_key",
  SPOTIFY_CLIENT_ID,
  SPOTIFY_CLIENT_SECRET,
  SPOTIFY_REDIRECT_URI = "https://vibeverse-rwdl.onrender.com/auth/spotify/callback",
  FRONTEND_URI = "https://melodic-marigold-27a2f4.netlify.app",
  PORT = 5000,
  NODE_ENV = "production", // force production
} = process.env;

app.use(cookieParser(SESSION_SECRET));
app.use(
  cors({
    origin: FRONTEND_URI,
    credentials: true,
  })
);

// In-memory session store (use Redis/DB for scaling in real prod)
const sessions = {};

// helper: random string
function randomString(len = 16) {
  return crypto.randomBytes(len).toString("hex");
}

// Spotify auth URL
function spotifyAuthorizeURL(state) {
  const scope = [
    "user-read-private",
    "user-read-email",
    "user-top-read",
    "user-read-recently-played",
    "playlist-read-private",
    "user-read-playback-state",
  ].join(" ");

  const params = {
    response_type: "code",
    client_id: SPOTIFY_CLIENT_ID,
    scope,
    redirect_uri: SPOTIFY_REDIRECT_URI,
    state,
    show_dialog: NODE_ENV !== "production", // only show on dev
  };

  return `https://accounts.spotify.com/authorize?${qs.stringify(params)}`;
}

// Token exchange
async function exchangeCodeForToken(code) {
  const tokenUrl = "https://accounts.spotify.com/api/token";
  const data = qs.stringify({
    grant_type: "authorization_code",
    code,
    redirect_uri: SPOTIFY_REDIRECT_URI,
  });
  const headers = {
    "Content-Type": "application/x-www-form-urlencoded",
    Authorization:
      "Basic " +
      Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString(
        "base64"
      ),
  };
  const resp = await axios.post(tokenUrl, data, { headers });
  return resp.data;
}

async function refreshAccessToken(refresh_token) {
  const tokenUrl = "https://accounts.spotify.com/api/token";
  const data = qs.stringify({
    grant_type: "refresh_token",
    refresh_token,
  });
  const headers = {
    "Content-Type": "application/x-www-form-urlencoded",
    Authorization:
      "Basic " +
      Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString(
        "base64"
      ),
  };
  const resp = await axios.post(tokenUrl, data, { headers });
  return resp.data;
}

/** ------------ AUTH ROUTES ------------ **/

// Step 1: Redirect user to Spotify login
app.get("/auth/spotify", (req, res) => {
  const state = randomString(8);
  res.cookie("oauth_state", state, {
    signed: true,
    httpOnly: true,
    maxAge: 10 * 60 * 1000,
    sameSite: "lax",
    secure: NODE_ENV === "production",
  });
  return res.redirect(spotifyAuthorizeURL(state));
});

// Step 2: Spotify callback
app.get("/auth/spotify/callback", async (req, res) => {
  const { code, state, error } = req.query;
  const signedState = req.signedCookies["oauth_state"];

  if (error) {
    return res.redirect(
      `${FRONTEND_URI}/?error=${encodeURIComponent(error)}`
    );
  }
  if (!state || !signedState || state !== signedState) {
    return res.status(400).send("State mismatch. Auth failed.");
  }

  try {
    const tokenData = await exchangeCodeForToken(code);
    const sessionId = randomString(12);
    const now = Date.now();

    sessions[sessionId] = {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: tokenData.expires_in
        ? now + tokenData.expires_in * 1000
        : null,
    };

    res.cookie("vibeify_session", sessionId, {
      signed: true,
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: "lax",
      secure: NODE_ENV === "production",
    });

    res.clearCookie("oauth_state");
    return res.redirect(`${FRONTEND_URI}/dashboard`);
  } catch (e) {
    console.error("Token exchange error", e.response?.data || e.message);
    return res.redirect(`${FRONTEND_URI}/?error=token_exchange_failed`);
  }
});

/** ------------ SESSION UTILS ------------ **/

function requireSession(req, res, next) {
  const sessionId = req.signedCookies["vibeify_session"];
  if (!sessionId || !sessions[sessionId]) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  req.sessionId = sessionId;
  next();
}

/** ------------ API ROUTES (minimal for prod demo) ------------ **/

app.get("/api/me", requireSession, async (req, res) => {
  try {
    const { access_token } = sessions[req.sessionId];
    const resp = await axios.get("https://api.spotify.com/v1/me", {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    res.json(resp.data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

app.get("/logout", (req, res) => {
  const id = req.signedCookies["vibeify_session"];
  if (id) delete sessions[id];
  res.clearCookie("vibeify_session");
  return res.redirect(FRONTEND_URI);
});

app.get("/health", (req, res) => res.json({ ok: true }));

/** ------------ START SERVER ------------ **/
app.listen(PORT, () => {
  console.log(
    `✅ Vibeify backend running in ${NODE_ENV} mode on port ${PORT}`
  );
});
