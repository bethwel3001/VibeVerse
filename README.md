# 🎧 VibeVerse 
*A Spotify Mood & Personality Analyzer*
VibeVerse is a fullstack web app that connects to your Spotify account, analyzes your top tracks and listening habits, and reveals your musical mood, energy, and vibe. Built for the Vibe Coding Hackathon 2025.

## ⚡ Tech Stack

- **Frontend**: React + Tailwind + Framer Motion + Lucide + p5.js/D3
- **Backend**: Node.js + Express + Spotify Auth (PKCE)
- **Auth Flow**: Authorization Code Flow with PKCE
- **Features**:
  - 🎵 Login with Spotify
  - 🌈 Mood & Personality Insights
  - 📊 Visual Analytics
  - 🔥 "Roast Me" AI Fun Mode
  - 🖼 Shareable Mood Cards

---

## 🚀 Getting Started

---

## 🧪 Setup Instructions
### 1. Clone the Repo

```bash
git clone https://github.com/your-username/vibeverse.git
cd HACKATHON
```
### 2. Backend (Auth Server)
```bash
cd backend
npm install
```
### 🔐 .env Example
```bash
CLIENT_ID=your_spotify_client_id
CLIENT_SECRET=your_spotify_secret
REDIRECT_URI=http://127.0.0.1:3000/redirect
```
### Run the server
```bash 
# Enable ES module support
# In backend/package.json
{
  "type": "module"
}

# Start
node server.js
Runs on: http://localhost:5000
```
### 3. Frontend (React App)
```bash
cd ../frontend
npm install
npm start
```
### Update env
```bash
REACT_APP_SPOTIFY_CLIENT_ID=your_spotify_client_id
REACT_APP_BACKEND_URL=http://localhost:5000
Opens at: http://localhost:3000
```

## 🧙 Credits
Built with coffee, Spotify's API, and good vibes.