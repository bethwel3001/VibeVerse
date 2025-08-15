import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import FeatureCard from '../components/FeatureCard';
import { greetingByTime, getLoginHref } from '../utils/spotifyAuth';
import { FaHeart, FaChartBar, FaFilePdf, FaGithub } from 'react-icons/fa';
import { FaArrowRight } from 'react-icons/fa';

export default function Home() {
  const greeting = greetingByTime();

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-100 dark:from-black dark:to-gray-900 text-gray-900 dark:text-gray-100">
      <div id="top">
        <Navbar />
        
{/* Hero Section (Full Screen) */}
<section className="min-h-screen flex flex-col justify-center items-center px-4 py-16">
  <div className="max-w-3xl mx-auto text-center px-4">
    <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6">
      {greeting}, Music Lover 👋
    </h1>
    <p className="text-lg sm:text-xl md:text-2xl opacity-80 mb-8 sm:mb-10">
      Discover your music personality — playful roasts, clean charts, and shareable PDF cards.
    </p>

    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
      <a
        href={getLoginHref()}
        className="bg-spotify-green text-white px-5 py-3 sm:px-6 sm:py-3 rounded-lg font-medium shadow flex items-center justify-center gap-2 text-base sm:text-lg hover:scale-[1.02] transition-transform active:scale-100"
      >
        Continue
        <FaArrowRight className="text-sm sm:text-base" />
      </a>

      <a
        href="https://github.com/bethwel3001/VibeVerse"
        target="_blank"
        rel="noreferrer"
        className="border px-4 py-2 sm:px-5 sm:py-2.5 rounded-lg flex items-center justify-center gap-2 text-base sm:text-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        <FaGithub className="text-sm sm:text-base" />
        <span>Contribute</span>
      </a>
    </div>
  </div>
</section>

        {/* Features Section (Full Screen) */}
        <section className="min-h-screen flex flex-col justify-center items-center px-4 py-16 bg-gray-50 dark:bg-gray-900/50">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-bold mb-12 text-center">Features</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FeatureCard
                title="Top Artists & Charts"
                desc="See which artists shaped your year — clean visual charts, mobile-friendly."
                icon={<FaChartBar />}
              />
              <FeatureCard
                title="Vibe Roast"
                desc="A playful AI-generated roast based on your listening patterns."
                icon={<FaHeart />}
              />
              <FeatureCard
                title="PDF & Social Export"
                desc="Export a slick PDF or share directly to X & Instagram."
                icon={<FaFilePdf />}
              />
              <FeatureCard
                title="Open Source"
                desc="Contribute on GitHub or fork to customize your own vibes."
                icon={<FaGithub />}
              />
            </div>
          </div>
        </section>

        {/* About Section (Full Screen) */}
        <section className="min-h-screen flex flex-col justify-center items-center px-4 py-16">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-bold mb-8 text-center">Why Vibeify?</h2>
            <p className="text-xl sm:text-2xl opacity-80 text-center leading-relaxed">
              Vibeify gives you a snapshot of your musical personality — shareable, fun, and light on data. 
              We keep things simple: no profile DB, just your session tokens while you use the app.
            </p>
          </div>
        </section>

        <Footer />
      </div>
    </div>
  );
}