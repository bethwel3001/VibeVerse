export const getSuperhero = (artists) => {
  const genres = artists.flatMap(a => a.genres);
  
  if (genres.some(g => g.includes('hip hop'))) {
    return "The Lyrical Titan - Your words hit harder than Thor's hammer!";
  }
  if (genres.includes('indie pop')) {
    return "The Indie Alchemist - You turn obscure sounds into gold!";
  }
  if (genres.some(g => g.includes('rock'))) {
    return "The Guitar Phoenix - Rising from the ashes of mainstream music!";
  }
  return "The Sonic Visionary - Your taste defies all categories!";
};

export const getPersonalityTraits = (artists, tracks) => {
  const traits = [];
  const genres = artists.flatMap(a => a.genres);
  const energyLevel = tracks.reduce((acc, track) => acc + track.energy, 0) / tracks.length;
  
  // Mood trait
  const avgValence = tracks.reduce((acc, track) => acc + track.valence, 0) / tracks.length;
  traits.push({
    name: avgValence > 0.6 ? 'Optimist' : avgValence > 0.4 ? 'Balanced' : 'Deep Thinker',
    description: avgValence > 0.6 
      ? 'Your playlist radiates positive energy' 
      : 'You appreciate music with emotional depth'
  });

  // Energy trait
  traits.push({
    name: energyLevel > 0.7 ? 'Energetic' : energyLevel > 0.4 ? 'Versatile' : 'Chill',
    description: energyLevel > 0.7 
      ? 'You thrive on high-energy beats' 
      : 'You prefer a more relaxed vibe'
  });

  // Diversity trait
  const uniqueGenres = new Set(genres);
  traits.push({
    name: uniqueGenres.size > 5 ? 'Eclectic' : 'Specialist',
    description: uniqueGenres.size > 5 
      ? 'Your taste spans multiple genres' 
      : 'You know what you like and stick with it'
  });

  return traits;
};

export const generatePDF = (data) => {
  // PDF generation logic
  console.log('Generating PDF for:', data.user.displayName);
  // Implement using jsPDF
};