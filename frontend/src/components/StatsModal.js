import { Bar, Pie } from 'react-chartjs-2';
import { Chart, registerables } from 'chart.js';
import { FaTimes } from 'react-icons/fa';

Chart.register(...registerables);

export default function StatsModal({ data, onClose }) {
  const genreCounts = {};
  data.topArtists.items.forEach(artist => {
    (artist.genres || []).forEach(genre => {
      genreCounts[genre] = (genreCounts[genre] || 0) + 1;
    });
  });

  const topGenres = Object.entries(genreCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const genreData = {
    labels: topGenres.map(([genre]) => genre),
    datasets: [{
      data: topGenres.map(([_, count]) => count),
      backgroundColor: [
        '#1DB954', '#191414', '#FFFFFF', '#535353', '#B3B3B3'
      ].slice(0, topGenres.length)
    }]
  };
  const weeklyActivity = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [{
      label: 'Listening Activity',
      data: [12, 19, 8, 15, 22, 30, 18],
      backgroundColor: '#1DB954'
    }]
  };
  const totalArtists = data.topArtists.items.length;

  const topGenre = data.topArtists.items[0]?.genres?.[0] || 'Unknown';

  const avgEnergy = data.topTracks.items.length > 0
    ? Math.round(
        data.topTracks.items.reduce((sum, track) => sum + (track.energy || 0), 0) /
        data.topTracks.items.length *
        100
      )
    : 0;

  const moodScore = data.topTracks.items.length > 0
    ? Math.round(
        data.topTracks.items.reduce((sum, track) => sum + (track.valence || 0), 0) /
        data.topTracks.items.length *
        100
      )
    : 0;

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
      <div className="bg-spotify-dark rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-spotify-dark/90 backdrop-blur-sm p-4 flex justify-between items-center border-b border-spotify-light/20">
          <h2 className="text-xl font-bold text-white">Your Detailed Stats</h2>
          <button onClick={onClose} className="text-spotify-light hover:text-white">
            <FaTimes size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-8">
          {/* Genre Chart */}
          <div>
            <h3 className="text-lg font-medium text-white mb-4">Genre Distribution</h3>
            <div className="h-64">
              {topGenres.length > 0 ? (
                <Pie 
                  data={genreData} 
                  options={{ 
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'right',
                        labels: { color: 'white' }
                      }
                    }
                  }} 
                />
              ) : (
                <p className="text-white">No genre data available.</p>
              )}
            </div>
          </div>

          {/* Weekly Activity */}
          <div>
            <h3 className="text-lg font-medium text-white mb-4">Weekly Activity</h3>
            <div className="h-64">
              <Bar 
                data={weeklyActivity} 
                options={{
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      display: false
                    }
                  },
                  scales: {
                    y: {
                      ticks: { color: 'white' },
                      beginAtZero: true
                    },
                    x: {
                      ticks: { color: 'white' }
                    }
                  }
                }} 
              />
            </div>
          </div>

          {/* Stat Boxes */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatBox title="Total Artists" value={totalArtists} />
            <StatBox title="Top Genre" value={topGenre} />
            <StatBox title="Avg Energy" value={`${avgEnergy}%`} />
            <StatBox title="Mood Score" value={`${moodScore}%`} />
          </div>
        </div>
      </div>
    </div>
  );
}

// Reusable Stat Box
const StatBox = ({ title, value }) => (
  <div className="bg-spotify-black/50 p-4 rounded-lg">
    <p className="text-spotify-light text-sm">{title}</p>
    <p className="text-white font-bold text-xl">{value}</p>
  </div>
);
