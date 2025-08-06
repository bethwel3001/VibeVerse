import { TwitterShareButton, FacebookShareButton } from 'react-share';
import { useState } from 'react';

export default function ShareModal({ data, onClose }) {
  const [copied, setCopied] = useState(false);
  const shareUrl = window.location.href;
  const shareText = `My music vibe: ${data.personality.vibe}. ${data.topArtists.items[0]?.name} is my top artist! Check out Vibeify!`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50">
      <div className="bg-spotify-black rounded-lg p-6 max-w-md w-full animate-fadeIn">
        <h2 className="text-xl font-bold mb-4 text-white">Share Your Vibe</h2>
        
        <div className="flex justify-center gap-6 mb-6">
          <TwitterShareButton url={shareUrl} title={shareText}>
            <div className="bg-[#1DA1F2] hover:bg-[#1a8cd8] w-12 h-12 rounded-full flex items-center justify-center transition">
              <span className="text-white font-bold">𝕏</span>
            </div>
          </TwitterShareButton>
          
          <FacebookShareButton url={shareUrl} quote={shareText}>
            <div className="bg-[#1877F2] hover:bg-[#166fe5] w-12 h-12 rounded-full flex items-center justify-center transition">
              <span className="text-white font-bold">f</span>
            </div>
          </FacebookShareButton>
        </div>

        <div className="flex mb-4">
          <input 
            type="text" 
            value={shareUrl} 
            readOnly 
            className="flex-grow bg-spotify-dark text-white p-2 rounded-l border border-gray-600"
          />
          <button 
            onClick={copyToClipboard}
            className="bg-spotify-light hover:bg-gray-400 text-spotify-black px-4 rounded-r transition"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>

        <button 
          onClick={onClose}
          className="w-full bg-red-500 hover:bg-red-600 text-white py-2 rounded transition"
        >
          Close
        </button>
      </div>
    </div>
  );
}