export default function Footer() {
  return (
    <footer className="bg-spotify-black py-6 px-4 text-center text-spotify-light">
      <div className="max-w-6xl mx-auto">
        <p>© {new Date().getFullYear()} Vibeify - Discover your musical personality</p>
        <div className="flex justify-center gap-4 mt-2">
          <a href="#" className="hover:text-white transition">Privacy</a>
          <a href="#" className="hover:text-white transition">Terms</a>
          <a href="#" className="hover:text-white transition">Contact</a>
        </div>
      </div>
    </footer>
  );
}