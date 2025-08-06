import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function Home() {
  const navigate = useNavigate();
  const timeOfDay = () => {
    const hour = new Date().getHours();
    return hour < 12 ? 'Morning' : hour < 18 ? 'Afternoon' : 'Evening';
  };

  useEffect(() => {
    if (window.location.hash.includes('access_token')) {
      navigate('/auth');
    }
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-spotify-dark to-black">
      <Navbar />
      
      <main className="flex-grow flex items-center justify-center px-4">
        <div className="text-center max-w-2xl animate-fadeIn">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 text-white">
            Good <span className="text-spotify-green">{timeOfDay()}</span>!
          </h1>
          <p className="text-xl mb-8 text-spotify-light">
            Discover your musical personality with Vibeify
          </p>
            <a 
  href="http://127.0.0.1:5000/auth/spotify"
  className="inline-block bg-spotify-green hover:bg-green-600 text-white font-bold py-3 px-8 rounded-full text-lg transition-all duration-300 transform hover:scale-105"
>
  Continue with Spotify
</a>
        </div>
      </main>

      <Footer />
    </div>
  );
}