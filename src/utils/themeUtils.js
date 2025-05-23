export const getTimeBasedGreeting = () => {
  const hour = new Date().getHours();
  
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 21) return "Good evening";
  return "Good night";
};

export const getSpotifyGradients = () => [
  'from-spotify-green to-green-400',
  'from-neon-pink to-pink-500',
  'from-neon-blue to-blue-500',
  'from-purple-500 to-neon-purple',
  'from-yellow-400 to-neon-yellow',
  'from-green-400 to-teal-500',
  'from-red-400 to-pink-500',
  'from-indigo-400 to-purple-500'
];

export const getRandomGradient = () => {
  const gradients = getSpotifyGradients();
  return gradients[Math.floor(Math.random() * gradients.length)];
};

export const getGenreColor = (genre) => {
  const genreColors = {
    'pop': 'bg-pink-500',
    'rock': 'bg-red-500',
    'hip-hop': 'bg-yellow-500',
    'rap': 'bg-yellow-500',
    'electronic': 'bg-neon-blue',
    'indie': 'bg-purple-500',
    'alternative': 'bg-indigo-500',
    'r&b': 'bg-green-500',
    'jazz': 'bg-blue-500',
    'classical': 'bg-gray-500',
    'country': 'bg-orange-500',
    'folk': 'bg-emerald-500',
    'metal': 'bg-gray-700',
    'punk': 'bg-red-600',
    'reggae': 'bg-green-600',
    'latin': 'bg-orange-400'
  };

  // Find matching genre (case insensitive, partial match)
  const matchingGenre = Object.keys(genreColors).find(key => 
    genre.toLowerCase().includes(key) || key.includes(genre.toLowerCase())
  );

  return genreColors[matchingGenre] || 'bg-spotify-green';
};

export const createSpotifyTheme = () => ({
  background: 'linear-gradient(135deg, #191414 0%, #1db954 100%)',
  cardBackground: 'rgba(40, 40, 40, 0.8)',
  textPrimary: '#ffffff',
  textSecondary: '#b3b3b3',
  accent: '#1db954',
  accentHover: '#1ed760'
});
