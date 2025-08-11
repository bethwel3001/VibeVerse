import {
  FaGithub,
  FaMoon,
  FaSun,
  FaBars,
  FaTimes,
} from 'react-icons/fa';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function Navbar({ showQuit = false, transparent = false }) {
  const [darkMode, setDarkMode] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleTheme = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle('dark');
  };

  return (
    <nav
      className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        transparent && !scrolled
          ? 'bg-transparent'
          : 'bg-white/90 dark:bg-gray-900/90 backdrop-blur-lg border-b border-gray-300 dark:border-gray-800 shadow-md'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <span className="text-2xl font-bold bg-gradient-to-r from-green-400 to-lime-500 bg-clip-text text-transparent">
              Vibeify
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-5">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition"
              aria-label="Toggle theme"
            >
              {darkMode ? (
                <FaSun className="text-yellow-400" />
              ) : (
                <FaMoon className="text-gray-800 dark:text-gray-100" />
              )}
            </button>

            <a
              href="https://github.com/bethwel3001/VibeVerse"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition"
            >
              <FaGithub className="text-gray-800 dark:text-gray-100" />
            </a>

            {showQuit && (
              <Link
                to="/"
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-sm"
              >
                Quit Session
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition"
            >
              {mobileOpen ? (
                <FaTimes className="text-xl text-gray-800 dark:text-white" />
              ) : (
                <FaBars className="text-xl text-gray-800 dark:text-white" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden bg-white dark:bg-gray-900 border-t border-gray-300 dark:border-gray-700 shadow-lg animate-slideDown">
          <div className="px-6 py-4 flex flex-col gap-3 text-gray-900 dark:text-white">
            <button
              onClick={toggleTheme}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
            >
              {darkMode ? <FaSun className="text-yellow-400" /> : <FaMoon />}
              <span>{darkMode ? 'Light Mode' : 'Dark Mode'}</span>
            </button>

            <a
              href="https://github.com/bethwel3001/VibeVerse"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
            >
              <FaGithub />
              <span>GitHub</span>
            </a>

            {showQuit && (
              <Link
                to="/"
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-3 rounded-lg text-center font-semibold shadow"
              >
                Quit Session
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
