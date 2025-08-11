import { jsPDF } from 'jspdf';

// Personality analysis
export const analyzePersonality = (artists, tracks) => {
  const genres = artists.flatMap(a => a.genres);
  const features = tracks?.flatMap(t => t.audio_features) || [];
  
  // Genre analysis
  const genreCounts = genres.reduce((acc, genre) => {
    acc[genre] = (acc[genre] || 0) + 1;
    return acc;
  }, {});
  
  const topGenre = Object.entries(genreCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'eclectic';
  
  // Superhero based on top artist
  const superheroMap = {
    'rock': 'Rock Hero',
    'pop': 'Pop Star',
    'hip hop': 'Rap Legend',
    'jazz': 'Smooth Operator',
    'electronic': 'Digital Wizard'
  };
  
  const superhero = superheroMap[topGenre] || 'Musical Chameleon';
  
  // Energy analysis
  const avgEnergy = features.reduce((sum, f) => sum + (f?.energy || 0), 0) / features.length;
  
  return {
    vibe: getVibe(artists),
    roast: getRoast(artists),
    superhero,
    superheroImage: getSuperheroImage(superhero),
    traits: getTraits(artists, features),
    funFact: getFunFact(artists, tracks),
    topGenre
  };
};

// ... (keep previous helper functions and add new ones)

export const generatePDF = (data) => {
  // Enhanced PDF generation with all new data
  const doc = new jsPDF();
  
  // Add more sections for the new data points
  // ...
  
  doc.save('vibeify-report.pdf');
};