import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function SpotifyAuth() {
  const navigate = useNavigate();

  useEffect(() => {
    // This component just handles the redirect from Spotify
    navigate('/dashboard');
  }, [navigate]);

  return null;
}