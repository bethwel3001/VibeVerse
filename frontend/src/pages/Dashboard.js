import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/client'; // Updated import
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import ShareModal from '../components/ShareModal';
import VibeCard from '../components/VibeCard';
import { generatePDF } from '../utils/helpers';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [showShare, setShowShare] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const { data } = await apiClient.get('/api/me'); // Using configured client
        
        // Verify we got valid data
        if (!data?.user) {
          throw new Error('Invalid user data received');
        }
        
        setData(data);
        setError(null);
      } catch (err) {
        console.error('Dashboard data fetch error:', err);
        setError(err.message || 'Failed to load data');
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  const handleShare = async () => {
    setShowShare(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-spotify-dark flex items-center justify-center">
        <div className="text-spotify-green text-2xl animate-pulse">
          Loading your vibe...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-spotify-dark flex items-center justify-center">
        <div className="text-red-500 text-xl text-center">
          {error}<br />
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 bg-spotify-green text-white px-4 py-2 rounded"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-spotify-dark">
      <Navbar showQuit={true} />
      
      <main className="flex-grow p-6 max-w-6xl mx-auto w-full">
        {/* Profile Header */}
        <div className="flex items-center mb-10 animate-slideIn">
          <img 
            src={data.user.images?.[0]?.url || 'https://i.scdn.co/image/ab6775700000ee8518a0a6f0bf6d6fa0d44a6f31'} 
            className="w-20 h-20 rounded-full mr-6 border-2 border-spotify-green"
            alt="Profile"
          />
          <div>
            <h1 className="text-3xl font-bold text-white">
              Welcome, <span className="text-spotify-green">{data.user.displayName}</span>!
            </h1>
            <p className="text-spotify-light">{data.personality.vibe}</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
          <VibeCard 
            title="Your Top Artists" 
            items={data.topArtists.items} 
            type="artist" 
          />
          <VibeCard 
            title="Your Vibe Roast" 
            content={data.personality.roast} 
            type="roast" 
          />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button 
            onClick={() => generatePDF(data)}
            className="bg-spotify-green hover:bg-green-600 text-white font-bold py-3 px-6 rounded-full transition-all duration-300 transform hover:scale-105"
          >
            Export as PDF
          </button>
          <button 
            onClick={handleShare}
            className="bg-white hover:bg-gray-200 text-spotify-black font-bold py-3 px-6 rounded-full transition-all duration-300 transform hover:scale-105"
          >
            Share Your Vibe
          </button>
        </div>
      </main>

      <Footer />
      {showShare && <ShareModal data={data} onClose={() => setShowShare(false)} />}
    </div>
  );
}