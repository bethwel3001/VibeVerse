export default function VibeCard({ title, items, content, type }) {
  return (
    <div className="bg-spotify-black p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300">
      <h3 className="text-lg font-bold mb-4 text-white">{title}</h3>
      
      {type === 'artist' && (
        <ul className="space-y-3">
          {items.map((artist, index) => (
            <li key={artist.id} className="flex items-center">
              <span className="text-spotify-green mr-2">{index + 1}.</span>
              <img 
                src={artist.images[2]?.url} 
                className="w-10 h-10 rounded-full mr-3" 
                alt={artist.name} 
              />
              <span className="text-white">{artist.name}</span>
            </li>
          ))}
        </ul>
      )}
      
      {type === 'roast' && (
        <div className="bg-spotify-dark p-4 rounded border-l-4 border-spotify-green">
          <p className="text-spotify-light italic">"{content}"</p>
        </div>
      )}
    </div>
  );
}