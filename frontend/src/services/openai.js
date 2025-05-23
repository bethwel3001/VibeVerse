const OPENAI_API_KEY = process.env.REACT_APP_OPENAI_API_KEY;
const OPENAI_API_BASE = 'https://api.openai.com/v1';

class OpenAIService {
  async makeRequest(endpoint, data) {
    if (!OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    const response = await fetch(`${OPENAI_API_BASE}${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    return response.json();
  }

  async generateRoast(userData) {
    const { topTracks, topArtists, audioFeatures } = userData;
    
    // Calculate average audio features
    const avgFeatures = this.calculateAverageFeatures(audioFeatures);
    
    // Extract top genres
    const topGenres = this.extractTopGenres(topArtists);
    
    // Create prompt
    const prompt = this.createRoastPrompt(topTracks, topArtists, avgFeatures, topGenres);

    const response = await this.makeRequest('/chat/completions', {
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a witty music critic who creates hilarious but not mean-spirited roasts about people\'s music taste. Be clever, funny, and creative. Keep responses under 100 words.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 150,
      temperature: 0.9
    });

    return response.choices[0].message.content;
  }

  async generatePersonalityInsight(userData) {
    const { topTracks, topArtists, audioFeatures } = userData;
    
    const avgFeatures = this.calculateAverageFeatures(audioFeatures);
    const topGenres = this.extractTopGenres(topArtists);
    
    const prompt = this.createPersonalityPrompt(topTracks, topArtists, avgFeatures, topGenres);

    const response = await this.makeRequest('/chat/completions', {
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a music psychologist who provides insightful personality analysis based on music preferences. Be creative and specific. Provide a personality type name and description.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 200,
      temperature: 0.8
    });

    return response.choices[0].message.content;
  }

  calculateAverageFeatures(audioFeatures) {
    if (!audioFeatures || audioFeatures.length === 0) return null;

    const features = ['valence', 'energy', 'danceability', 'acousticness', 'instrumentalness', 'speechiness'];
    const averages = {};

    features.forEach(feature => {
      const sum = audioFeatures.reduce((acc, track) => {
        return acc + (track && track[feature] ? track[feature] : 0);
      }, 0);
      averages[feature] = sum / audioFeatures.length;
    });

    return averages;
  }

  extractTopGenres(topArtists) {
    if (!topArtists || !topArtists.items) return [];
    
    const genreCount = {};
    topArtists.items.forEach(artist => {
      if (artist.genres) {
        artist.genres.forEach(genre => {
          genreCount[genre] = (genreCount[genre] || 0) + 1;
        });
      }
    });

    return Object.entries(genreCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([genre]) => genre);
  }

  createRoastPrompt(topTracks, topArtists, avgFeatures, topGenres) {
    const trackNames = topTracks.items.slice(0, 5).map(track => track.name).join(', ');
    const artistNames = topArtists.items.slice(0, 5).map(artist => artist.name).join(', ');
    
    return `Roast this person's music taste based on their data:
    
Top tracks: ${trackNames}
Top artists: ${artistNames}
Top genres: ${topGenres.join(', ')}
Music personality: ${avgFeatures ? `${Math.round(avgFeatures.valence * 100)}% happy, ${Math.round(avgFeatures.energy * 100)}% energetic, ${Math.round(avgFeatures.danceability * 100)}% danceable` : 'mysterious'}

Be funny and creative, but not actually mean. Focus on stereotypes about their music taste, funny observations, or playful jabs.`;
  }

  createPersonalityPrompt(topTracks, topArtists, avgFeatures, topGenres) {
    const trackNames = topTracks.items.slice(0, 5).map(track => track.name).join(', ');
    const artistNames = topArtists.items.slice(0, 5).map(artist => artist.name).join(', ');
    
    return `Analyze this person's music personality:
    
Top tracks: ${trackNames}
Top artists: ${artistNames}
Top genres: ${topGenres.join(', ')}
Audio features: ${avgFeatures ? `${Math.round(avgFeatures.valence * 100)}% happy, ${Math.round(avgFeatures.energy * 100)}% energetic, ${Math.round(avgFeatures.danceability * 100)}% danceable, ${Math.round(avgFeatures.acousticness * 100)}% acoustic` : 'Not available'}

Provide a creative personality type name (like "The Melodic Dreamer" or "Bass-Obsessed Night Owl") and a brief description of their music personality.`;
  }
}

export const openaiService = new OpenAIService();