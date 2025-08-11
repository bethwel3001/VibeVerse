import { FaMusic, FaUser, FaStar, FaLaughSquint, FaBrain, FaRandom } from 'react-icons/fa';

const iconMap = {
  artist: <FaUser className="text-spotify-green" />,
  track: <FaMusic className="text-spotify-green" />,
  roast: <FaLaughSquint className="text-red-500" />,
  traits: <FaBrain className="text-blue-500" />,
  funfact: <FaRandom className="text-purple-500" />,
  superhero: <FaStar className="text-yellow-500" />
};

const superheroImages = {
  'Rock Hero': 'https://example.com/rock-hero.jpg',
  'Pop Star': 'https://example.com/pop-star.jpg',
  // Add more mappings
};

export default function VibeCard({ title, items, content, type, image }) {
  return (
    <div className={`bg-white dark:bg-spotify-black rounded-xl shadow-md overflow-hidden transition-transform hover:scale-[1.02] ${
      type === 'roast' ? 'border-l-4 border-red-500' : ''
    }`}>
      <div className="p-5">
        <div className="flex items-center gap-3 mb-4">
          {iconMap[type] || iconMap.default}
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h3>
        </div>
        
        {type === 'artist' || type === 'track' ? (
          <ul className="space-y-3">
            {items.map((item, index) => (
              <li key={item.id} className="flex items-center gap-3">
                <span className="text-gray-500 dark:text-gray-400 w-6 text-right">{index + 1}.</span>
                <img 
                  src={type === 'artist' ? item.images[2]?.url : item.album.images[2]?.url} 
                  className="w-10 h-10 rounded-full"
                  alt={item.name}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{item.name}</p>
                  {type === 'track' && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {item.artists.map(a => a.name).join(', ')}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : type === 'superhero' ? (
          <div className="text-center">
            <img 
              src={image || superheroImages[content] || 'https://via.placeholder.com/150'} 
              className="w-24 h-24 mx-auto rounded-full mb-3"
              alt={content}
            />
            <p className="text-xl font-bold text-spotify-green">{content}</p>
          </div>
        ) : (
          <div className="prose dark:prose-invert">
            <p className="text-gray-700 dark:text-gray-300">{content}</p>
          </div>
        )}
      </div>
    </div>
  );
}