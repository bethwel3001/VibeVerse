export const calculateMoodProfile = (audioFeatures) => {
  if (!audioFeatures || audioFeatures.length === 0) {
    return {
      happiness: 50,
      energy: 50,
      danceability: 50,
      acousticness: 50,
      instrumentalness: 50,
      speechiness: 50
    };
  }

  const validFeatures = audioFeatures.filter(feature => feature !== null);
  if (validFeatures.length === 0) {
    return {
      happiness: 50,
      energy: 50,
      danceability: 50,
      acousticness: 50,
      instrumentalness: 50,
      speechiness: 50
    };
  }

  const features = ['valence', 'energy', 'danceability', 'acousticness', 'instrumentalness', 'speechiness'];
  const profile = {};

  features.forEach(feature => {
    const sum = validFeatures.reduce((acc, track) => {
      return acc + (track[feature] || 0);
    }, 0);
    const average = sum / validFeatures.length;
    
    // Convert to percentage and give more descriptive names
    if (feature === 'valence') {
      profile.happiness = Math.round(average * 100);
    } else {
      profile[feature] = Math.round(average * 100);
    }
  });

  return profile;
};

export const getMoodColor = (value) => {
  if (value >= 80) return 'from-green-400 to-emerald-500';
  if (value >= 60) return 'from-yellow-400 to-orange-500';
  if (value >= 40) return 'from-orange-400 to-red-500';
  if (value >= 20) return 'from-red-400 to-pink-500';
  return 'from-purple-400 to-indigo-500';
};

export const getMoodEmoji = (happiness, energy) => {
  if (happiness >= 70 && energy >= 70) return '🎉';
  if (happiness >= 70 && energy < 40) return '😌';
  if (happiness < 40 && energy >= 70) return '😤';
  if (happiness < 40 && energy < 40) return '😔';
  return '🎵';
};

export const getPersonalityType = (moodProfile, topGenres = []) => {
  const { happiness, energy, danceability, acousticness } = moodProfile;
  
  // High energy, high happiness
  if (energy >= 80 && happiness >= 80) {
    return {
      name: "The Party Starter",
      description: "You're the human equivalent of confetti - everywhere you go, the energy follows!",
      icon: "🎉"
    };
  }
  
  // High danceability
  if (danceability >= 80) {
    return {
      name: "The Dance Floor Commander",
      description: "Your playlist is basically a master class in making people move their feet.",
      icon: "💃"
    };
  }
  
  // High acousticness, lower energy
  if (acousticness >= 60 && energy <= 50) {
    return {
      name: "The Acoustic Purist",
      description: "You appreciate the raw, unfiltered soul of music. Probably own a record player.",
      icon: "🎸"
    };
  }
  
  // Genre-based personalities
  if (topGenres.includes('indie') || topGenres.includes('alternative')) {
    return {
      name: "The Indie Explorer",
      description: "You discovered your favorite bands before they were cool (and you'll never let anyone forget it).",
      icon: "🔍"
    };
  }
  
  if (topGenres.includes('hip-hop') || topGenres.includes('rap')) {
    return {
      name: "The Rhythm Master",
      description: "You live life to the beat and probably know every word to songs you've heard once.",
      icon: "🎤"
    };
  }
  
  if (topGenres.includes('classical') || topGenres.includes('jazz')) {
    return {
      name: "The Sophisticated Listener",
      description: "Your music taste has more class than a royal wedding. Respectable and refined.",
      icon: "🎼"
    };
  }
  
  // Balanced/eclectic
  return {
    name: "The Musical Chameleon",
    description: "Your taste is so diverse, your playlist could soundtrack an entire film festival.",
    icon: "🦎"
  };
};

export const generateMoodInsights = (moodProfile) => {
  const { happiness, energy, danceability } = moodProfile;
  const insights = [];

  if (happiness >= 80) {
    insights.push("Your music radiates pure joy - you're basically sunshine in audio form! ☀️");
  } else if (happiness <= 30) {
    insights.push("You appreciate the beauty in melancholy - there's depth in your musical soul. 🌙");
  }

  if (energy >= 80) {
    insights.push("Your playlists could power a small city - that energy is infectious! ⚡");
  } else if (energy <= 30) {
    insights.push("You're all about those chill vibes - the perfect soundtrack for introspection. 🧘");
  }

  if (danceability >= 80) {
    insights.push("Warning: Your music may cause spontaneous dancing in public places! 💃");
  }

  return insights;
};