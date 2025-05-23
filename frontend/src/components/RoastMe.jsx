import React, { useState } from 'react';
import { openaiService } from '../services/openai';

const RoastMe = ({ userData }) => {
  const [roast, setRoast] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleRoast = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await openaiService.generateRoast(userData);
      setRoast(response);
    } catch (err) {
      setError('Failed to get roast. Check console for details.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass p-4 rounded-xl">
      <button
        onClick={handleRoast}
        className="bg-red-500 text-white px-4 py-2 rounded-lg mb-2 disabled:opacity-50"
        disabled={loading}
      >
        {loading ? 'Roasting...' : 'Roast Me'}
      </button>
      {roast && <p className="text-sm text-white mt-2">{roast}</p>}
      {error && <p className="text-sm text-red-400 mt-2">{error}</p>}
    </div>
  );
};

export default RoastMe;
