import { FaGithub, FaPlay, FaMoon, FaSun, FaBars, FaTimes } from 'react-icons/fa';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function Navbar({ showQuit = false }) {
  const [darkMode, setDarkMode] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <nav className={`fixed w-full z-50 transition-all duration-300 ${isScrolled ? 'bg-spotify-black/90 backdrop-blur-sm py-3 shadow-lg' : 'bg-spotify-black py-4'}`}>
      <div className="container mx-auto px-6 flex justify-between items-center">
        {/* Logo - Always visible */}
        <Link 
          to="/" 
          className="text-2xl md:text-3xl font-bold text-white hover:text-spotify-green transition-colors duration-300"
        >
          Vibeify
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-6">
          <button 
            onClick={() => setDarkMode(!darkMode)}
            className="text-spotify-light hover:text-white transition-all duration-300 transform hover:scale-110"
            aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {darkMode ? <FaSun size={24} /> : <FaMoon size={24} />}
          </button>
          
          <a 
            href="https://github.com/bethwel3001/VibeVerse" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-spotify-light hover:text-white transition-all duration-300 transform hover:scale-110"
            aria-label="View on GitHub"
          >
            <FaGithub size={24} />
          </a>
          
          <a 
            href="#" 
            className="text-spotify-light hover:text-white transition-all duration-300 transform hover:scale-110"
            aria-label="Download app"
          >
            <FaPlay size={24} />
          </a>
          
          {showQuit && (
            <Link 
              to="/" 
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 hover:shadow-lg"
            >
              Quit Session
            </Link>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button 
          className="md:hidden text-white focus:outline-none"
          onClick={toggleMobileMenu}
          aria-label="Toggle menu"
        >
          {isMobileMenuOpen ? <FaTimes size={24} /> : <FaBars size={24} />}
        </button>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden absolute top-full left-0 right-0 bg-spotify-dark shadow-xl py-4 px-6 animate-slideDown">
            <div className="flex flex-col items-center gap-6">
              <button 
                onClick={() => {
                  setDarkMode(!darkMode);
                  setIsMobileMenuOpen(false);
                }}
                className="flex items-center text-white text-lg w-full justify-center py-2 border-b border-spotify-light/20"
              >
                {darkMode ? (
                  <>
                    <FaSun className="mr-2" /> Light Mode
                  </>
                ) : (
                  <>
                    <FaMoon className="mr-2" /> Dark Mode
                  </>
                )}
              </button>
              
              <a 
                href="https://github.com/bethwel3001/VibeVerse" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center text-white text-lg w-full justify-center py-2 border-b border-spotify-light/20"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <FaGithub className="mr-2" /> GitHub
              </a>
              
              <a 
                href="#" 
                className="flex items-center text-white text-lg w-full justify-center py-2 border-b border-spotify-light/20"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <FaPlay className="mr-2" /> Download App
              </a>
              
              {showQuit && (
                <Link 
                  to="/" 
                  className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-full text-sm font-medium w-full text-center transition-all duration-300 mt-2"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Quit Session
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}