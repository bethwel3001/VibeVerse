import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import Navbar from '../components/Navbar';
import { Bar, Pie, Line } from 'react-chartjs-2';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

export default function MoreStats() {
  const [data, setData] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data } = await apiClient.get('/api/me/stats');
        setData(data);
      } catch (err) {
        navigate('/dashboard');
      }
    };
    fetchData();
  }, [navigate]);

  if (!data) return <div>Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-spotify-dark pt-16">
      <Navbar showQuit={true} />
      
      <main className="container mx-auto p-4 md:p-6">
        <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Your Musical Journey</h1>
        
        <div className="grid gap-8">
          {/* Genre Distribution */}
          <div className="bg-white dark:bg-spotify-black p-6 rounded-xl shadow">
            <h2 className="text-xl font-bold mb-4">Genre Distribution</h2>
            <div className="h-64">
              <Pie data={genreChartData(data)} />
            </div>
          </div>
          
          {/* Monthly Listening */}
          <div className="bg-white dark:bg-spotify-black p-6 rounded-xl shadow">
            <h2 className="text-xl font-bold mb-4">Monthly Activity</h2>
            <div className="h-64">
              <Line data={monthlyActivityData(data)} />
            </div>
          </div>
          
          {/* Audio Features */}
          <div className="bg-white dark:bg-spotify-black p-6 rounded-xl shadow">
            <h2 className="text-xl font-bold mb-4">Your Audio Profile</h2>
            <div className="h-64">
              <Bar data={audioFeaturesData(data)} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// Chart data helpers
const genreChartData = (data) => ({
  labels: data.genreDistribution.labels,
  datasets: [{
    data: data.genreDistribution.values,
    backgroundColor: [
      '#1DB954', '#191414', '#535353', '#B3B3B3', '#FFFFFF'
    ]
  }]
});
