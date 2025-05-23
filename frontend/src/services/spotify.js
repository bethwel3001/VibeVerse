const CLIENT_ID = process.env.REACT_APP_SPOTIFY_CLIENT_ID;
const REDIRECT_URI = process.env.REACT_APP_SPOTIFY_REDIRECT_URI;
const BACKEND_BASE_URL = 'http://localhost:5000';
const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';

const SCOPES = [
  'user-read-private',
  'user-read-email',
  'user-top-read',
  'user-read-recently-played',
  'playlist-read-private',
  'user-library-read'
];

class SpotifyService {
  constructor() {
    this.accessToken = localStorage.getItem('spotify_access_token');
  }

  async getAuthUrl() {
    const codeVerifier = this.generateRandomString(128);
    localStorage.setItem('spotify_code_verifier', codeVerifier);

    const codeChallenge = await this.generateCodeChallenge(codeVerifier);

    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      response_type: 'code',
      redirect_uri: REDIRECT_URI,
      scope: SCOPES.join(' '),
      code_challenge_method: 'S256',
      code_challenge: codeChallenge
    });

    return `${BACKEND_BASE_URL}/login?${params.toString()}`;
  }

  async exchangeCodeForToken(code) {
    const codeVerifier = localStorage.getItem('spotify_code_verifier');

    const response = await fetch(`${BACKEND_BASE_URL}/callback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ code, code_verifier: codeVerifier, redirect_uri: REDIRECT_URI })
    });

    if (!response.ok) {
      throw new Error('Token exchange failed');
    }

    const data = await response.json();
    this.setAccessToken(data.access_token);
    return data.access_token;
  }

  setAccessToken(token) {
    this.accessToken = token;
    localStorage.setItem('spotify_access_token', token);
  }

  getAccessToken() {
    return this.accessToken || localStorage.getItem('spotify_access_token');
  }

  removeAccessToken() {
    this.accessToken = null;
    localStorage.removeItem('spotify_access_token');
  }

  async makeRequest(endpoint, options = {}) {
    const token = this.getAccessToken();
    if (!token) throw new Error('No access token available');

    const response = await fetch(`${SPOTIFY_API_BASE}${endpoint}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });

    if (!response.ok) {
      if (response.status === 401) {
        this.removeAccessToken();
        window.location.href = '/';
        throw new Error('Token expired');
      }
      throw new Error(`Spotify API error: ${response.status}`);
    }

    return response.json();
  }

  async getCurrentUser() {
    return this.makeRequest('/me');
  }

  async getTopTracks(timeRange = 'medium_term', limit = 50) {
    return this.makeRequest(`/me/top/tracks?time_range=${timeRange}&limit=${limit}`);
  }

  async getTopArtists(timeRange = 'medium_term', limit = 50) {
    return this.makeRequest(`/me/top/artists?time_range=${timeRange}&limit=${limit}`);
  }

  async getRecentlyPlayed(limit = 50) {
    return this.makeRequest(`/me/player/recently-played?limit=${limit}`);
  }

  async getAudioFeatures(trackIds) {
    const ids = Array.isArray(trackIds) ? trackIds.join(',') : trackIds;
    return this.makeRequest(`/audio-features?ids=${ids}`);
  }

  async getUserPlaylists(limit = 50) {
    return this.makeRequest(`/me/playlists?limit=${limit}`);
  }

  generateRandomString(length) {
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return result;
  }

  async generateCodeChallenge(codeVerifier) {
    const encoder = new TextEncoder();
    const data = encoder.encode(codeVerifier);
    const digest = await window.crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode(...new Uint8Array(digest)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }
}

export const spotifyService = new SpotifyService();
