import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'http://127.0.0.1:5000',
  withCredentials: true, // This is crucial for sessions
  headers: {
    'Content-Type': 'application/json',
  }
});

export default apiClient;