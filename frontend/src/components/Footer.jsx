import React, { useState } from "react";
import { FaInstagram, FaXTwitter, FaGithub, FaChevronUp, FaGooglePlay } from "react-icons/fa6";
import { Link } from "react-router-dom";

export default function Footer() {
  const [toastVisible, setToastVisible] = useState(false);

  const handlePlayClick = () => {
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2000);
  };

  return (
    <footer className="w-full mt-16 relative text-sm font-medium">
      {/* Glass background */}
      <div className="absolute inset-0 backdrop-blur-lg bg-white/20 dark:bg-black/20 border-t border-white/20 dark:border-black/20"></div>

      <div className="relative max-w-6xl mx-auto px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-8 animate-fadeIn">
        
        {/* 1 — Social Icons */}
        <div className="flex flex-col items-center gap-3 md:items-start">
          <p className="text-spotify-light">Creator’s handles</p>
          <div className="flex gap-4">
            <a
              href="https://instagram.com/creator"
              target="_blank"
              rel="noreferrer"
              className="p-3 rounded-full bg-white/10 hover:bg-white/20 dark:bg-black/20 dark:hover:bg-black/30 transition-all hover:scale-110 text-spotify-green"
            >
              <FaInstagram size={18} />
            </a>
            <a
              href="https://twitter.com/creator"
              target="_blank"
              rel="noreferrer"
              className="p-3 rounded-full bg-white/10 hover:bg-white/20 dark:bg-black/20 dark:hover:bg-black/30 transition-all hover:scale-110 text-spotify-green"
            >
              <FaXTwitter size={18} />
            </a>
            <a
              href="https://github.com/creator"
              target="_blank"
              rel="noreferrer"
              className="p-3 rounded-full bg-white/10 hover:bg-white/20 dark:bg-black/20 dark:hover:bg-black/30 transition-all hover:scale-110 text-spotify-green"
            >
              <FaGithub size={18} />
            </a>
          </div>
        </div>

        {/* 2 — Center Text */}
        <div className="text-center text-spotify-light leading-relaxed">
          <p>Built with ❤️ and 🎶 for music lovers</p>
          <p className="mt-1">© {new Date().getFullYear()} Vibeify. All rights reserved.</p>
        </div>

        {/* 3 — Actions */}
        <div className="flex flex-col items-center gap-3 md:items-end">
          <div className="flex gap-4">
            {/* Contribute */}
            <a
              href="https://github.com/creator/project"
              target="_blank"
              rel="noreferrer"
              className="flex flex-col items-center gap-1 text-center group"
            >
              <div className="p-3 rounded-full bg-white/10 hover:bg-white/20 dark:bg-black/20 dark:hover:bg-black/30 transition-all group-hover:scale-110 text-spotify-green">
                <FaGithub size={18} />
              </div>
              <span className="text-xs text-spotify-light">Contribute</span>
            </a>

            {/* Back to top */}
            <a
              href="#top"
              className="flex flex-col items-center gap-1 text-center group"
            >
              <div className="p-3 rounded-full bg-white/10 hover:bg-white/20 dark:bg-black/20 dark:hover:bg-black/30 transition-all group-hover:scale-110 text-spotify-green">
                <FaChevronUp size={18} />
              </div>
              <span className="text-xs text-spotify-light">Top</span>
            </a>

            {/* App Button */}
            <button
              onClick={handlePlayClick}
              className="flex flex-col items-center gap-1 text-center group"
            >
              <div className="p-3 rounded-full bg-gradient-to-r from-spotify-green to-blue-500 text-white shadow-lg hover:scale-110 transition-all">
                <FaGooglePlay size={18} />
              </div>
              <span className="text-xs text-spotify-light">App</span>
            </button>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toastVisible && (
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-4 py-2 rounded-lg border border-green-300 shadow-lg animate-toastIn">
          Coming soon!
        </div>
      )}
    </footer>
  );
}
