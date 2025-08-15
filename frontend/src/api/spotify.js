import axios from 'axios';

const BASE = process.env.REACT_APP_SERVER_URL || 'http://127.0.0.1:5000';

const client = axios.create({
  baseURL: BASE,
  withCredentials: true, // important: send cookies (signed session cookie)
  timeout: 10000,
});

export async function getMe() {
  const resp = await client.get('/api/me');
  return resp.data;
}

export async function getTopArtists(limit = 10, time_range = 'medium_term') {
  const resp = await client.get('/api/top-artists', { params: { limit, time_range } });
  return resp.data;
}

export async function getTopTracks(limit = 10, time_range = 'medium_term') {
  const resp = await client.get('/api/top-tracks', { params: { limit, time_range } });
  return resp.data;
}

export async function getRecentlyPlayed() {
  const resp = await client.get('/api/recently-played');
  return resp.data;
}

export async function getVibeSummary() {
  const resp = await client.get('/api/vibe-summary');
  return resp.data;
}

export async function logout() {
  // logout endpoint clears session cookie and redirects; but we call it to clear server session
  await client.get('/logout');
}
