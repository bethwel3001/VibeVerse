import React, { useState } from 'react';
import ThemeToggle from './ThemeToggle';
import { Link } from 'react-router-dom';
import { FaGithub, FaSpotify, FaChevronUp, FaGooglePlay } from 'react-icons/fa';

export default function Navbar({ simple = false }) {
  const [open, setOpen] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);

  const handlePlayClick = (e) => {
    e.preventDefault();
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2000);
  };

  return (
    <nav className="w-full z-40 relative">
      {/* Glassmorphism background */}
      <div className="absolute w-full h-full backdrop-blur-lg bg-white/30 dark:bg-black/30 border-b border-white/20 dark:border-black/20"></div>

      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between relative">
        {/* Brand */}
        <Link
          to="/"
          className="flex items-center gap-2 group"
          onClick={() => setOpen(false)}
        >
          <FaSpotify className="text-2xl text-spotify-green transition-transform group-hover:scale-110" />
          <span className="font-bold text-xl bg-gradient-to-r from-spotify-green to-blue-500 bg-clip-text text-transparent">
            Vibeify
          </span>
        </Link>

        {/* Desktop navigation */}
        <div className="hidden md:flex items-center gap-5">
          <ThemeToggle />
          <button
            onClick={handlePlayClick}
            className="flex items-center gap-2 bg-gradient-to-r from-spotify-green to-blue-500 text-white px-4 py-2 rounded-full shadow-lg hover:scale-105 transition-all"
          >
            <FaGooglePlay size={16} /> <span>Get App</span>
          </button>
        </div>

        {/* Mobile menu button */}
        <div className="md:hidden flex items-center gap-2">
          <button
            onClick={() => setOpen(!open)}
            className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Open menu"
          >
            <svg width="22" height="22" viewBox="0 0 24 24">
              <path fill="currentColor" d="M3 6h18v2H3zM3 11h18v2H3zM3 16h18v2H3z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile glass menu */}
      {open && (
        <div
          className="fixed inset-0 backdrop-blur-lg bg-white/30 dark:bg-black/40 flex flex-col items-center justify-center p-6 gap-6"
          style={{ zIndex: 50 }}
        >
          <button
            className="absolute top-6 right-6 p-2 rounded-full bg-white/30 dark:bg-black/30 hover:scale-110 transition-transform"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
          >
            ✕
          </button>

          {/* Equal-sized animated icons */}
          <div className="flex flex-col items-center gap-5">
            <button
              onClick={handlePlayClick}
              className="w-12 h-12 flex items-center justify-center rounded-full bg-gradient-to-r from-spotify-green to-blue-500 text-white shadow-lg hover:scale-110 transition-all"
            >
              <FaGooglePlay size={18} />
            </button>

            <ThemeToggle />

            <Link
              to="/"
              onClick={() => setOpen(false)}
              className="w-12 h-12 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 dark:bg-black/20 dark:hover:bg-black/30 transition-all text-spotify-green"
            >
              <FaChevronUp />
            </Link>
          </div>
        </div>
      )}

      {/* Toast notification */}
      {toastVisible && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-4 py-2 rounded-lg border border-green-300 shadow-lg animate-fadeInOut">
          Coming soon!
        </div>
      )}
    </nav>
  );
}
