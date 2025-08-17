import axios from 'axios';

const BASE = process.env.REACT_APP_SERVER_URL || 'http://127.0.0.1:5000';

const client = axios.create({
  baseURL: BASE,
  withCredentials: true,
  timeout: 20000, 
});

async function safeGet(url, opts = {}) {
  try {
    const resp = await client.get(url, opts);
    return resp.data;
  } catch (e) {
    // rethrow so callers can handle, but include parsed message
    const msg = e.response?.data || e.message;
    throw new Error(JSON.stringify(msg));
  }
}

export async function getMe() { return safeGet('/api/me'); }
export async function getTopArtists(limit = 10, time_range = 'medium_term') { return safeGet('/api/top-artists', { params: { limit, time_range } }); }
export async function getTopTracks(limit = 10, time_range = 'medium_term') { return safeGet('/api/top-tracks', { params: { limit, time_range } }); }
export async function getRecentlyPlayed() { return safeGet('/api/recently-played'); }
export async function getVibeSummary() { return safeGet('/api/vibe-summary'); }
export async function getNowPlaying() { return safeGet('/api/now-playing'); }
export async function getPlaylists() { return safeGet('/api/playlists'); }
export async function getAudioFeatures(ids = []) { return safeGet('/api/audio-features', { params: { ids: ids.join(',') } }); }
export async function logout() { await client.get('/logout'); }
