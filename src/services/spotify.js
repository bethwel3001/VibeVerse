const CLIENT_ID = process.env.REACT_APP_SPOTIFY_CLIENT_ID;
const REDIRECT_URI = process.env.REACT_APP_SPOTIFY_REDIRECT_URI;
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

  // Authentication
  getAuthUrl() {
    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      response_type: 'token',
      redirect_uri: REDIRECT_URI,
      scope: SCOPES.join(' '),
      show_dialog: 'true'
    });

    return `https://accounts.spotify.com/authorize?${params.toString()}`;
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

  // API Calls
  async makeRequest(endpoint, options = {}) {
    const token = this.getAccessToken();
    if (!token) {
      throw new Error('No access token available');
    }

    const response = await fetch(`${SPOTIFY_API_BASE}${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
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

  // User Data
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

  async getPlaylist(playlistId) {
    return this.makeRequest(`/playlists/${playlistId}`);
  }

  async getUserPlaylists(limit = 50) {
    return this.makeRequest(`/me/playlists?limit=${limit}`);
  }

  // Utility Methods
  extractTokenFromUrl() {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    return hashParams.get('access_token');
  }

  async getComprehensiveUserData() {
    try {
      const [user, topTracks, topArtists, recentlyPlayed] = await Promise.all([
        this.getCurrentUser(),
        this.getTopTracks('medium_term', 50),
        this.getTopArtists('medium_term', 50),
        this.getRecentlyPlayed(50)
      ]);

      // Get audio features for top tracks
      const trackIds = topTracks.items.map(track => track.id);
      const audioFeatures = await this.getAudioFeatures(trackIds);

      // Combine tracks with their audio features
      const tracksWithFeatures = topTracks.items.map((track, index) => ({
        ...track,
        audio_features: audioFeatures.audio_features[index]
      }));

      return {
        user,
        topTracks: { ...topTracks, items: tracksWithFeatures },
        topArtists,
        recentlyPlayed,
        audioFeatures: audioFeatures.audio_features
      };
    } catch (error) {
      console.error('Error fetching comprehensive user data:', error);
      throw error;
    }
  }
}

export const spotifyService = new SpotifyService();