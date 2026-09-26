# 🚀 Last Page Arcade

**Last Page Arcade** is a collection of real-time, multiplayer casual games built specifically for the **Discord Embedded App SDK (Discord Activities)**. Play Bingo, Tic-Tac-Toe, and Blox directly inside your Discord voice channels with your friends.

Built with **React**, **Vite**, and **Firebase Realtime Database**, this project serves as a highly modular, serverless foundation for building premium multiplayer Discord Activities.

![Last Page Arcade](public/favicon.svg)

## 🎮 Features
- **Native Discord Integration:** Connects seamlessly to voice channels using the Discord Embedded App SDK.
- **Real-Time Multiplayer:** Instant state synchronization across all connected clients via Firebase Realtime Database.
- **Multiple Game Modes:** 
  - **Bingo:** Classic 5x5 Bingo with turn management and host controls.
  - **Tic-Tac-Toe:** Classic 3x3 strategy game.
  - **Blox:** Area control and strategy game.
- **Premium Apple Dark Mode UI:** Beautiful frosted glass components, subtle gradients, and micro-animations.
- **Session Persistence:** State is saved to `sessionStorage` so you don't lose your game if you temporarily tab out or minimize Discord.

## 🛠 Tech Stack
- **Frontend Framework:** React 18 + Vite
- **Styling:** Vanilla CSS (Glassmorphism + Apple Dark Mode aesthetics)
- **Backend / Realtime Sync:** Firebase Realtime Database
- **Discord Integration:** `@discord/embedded-app-sdk`
- **Hosting:** Vercel (or Firebase Hosting)

## 🚀 Getting Started (Local Development)

### 1. Prerequisites
- Node.js (v18+)
- A Discord Developer Application (with a generated `Client ID` and `Client Secret`)
- A Firebase Project (with Realtime Database enabled)

### 2. Installation
Clone the repository and install dependencies:
```bash
git clone https://github.com/your-username/lastpage-arcade.git
cd lastpage-arcade
npm install
```

### 3. Environment Variables
Create a `.env` file in the root directory and add your credentials:
```env
# Discord Secrets
VITE_DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_CLIENT_SECRET=your_discord_client_secret

# Firebase Configuration
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://your_project.firebaseio.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### 4. Running Locally for Discord
Discord Activities require an HTTPS connection, so you must use a tunnel (like Cloudflare) to route Discord traffic to your local `localhost:5173`.

**Start the Vite server:**
```bash
npm run dev
```
**Start a Cloudflare Tunnel (in a new terminal):**
```bash
cloudflared tunnel --url http://127.0.0.1:5173
```
Take the generated `https://...trycloudflare.com` URL and paste it into the **URL Mapping** section of your Discord Developer Portal.

## 🌍 Deployment
You can deploy this project to any static hosting provider. We recommend **Vercel** because it automatically provisions serverless backend endpoints (needed for the `/api/token` route to handle secure Discord OAuth token exchange).

1. Push your code to GitHub.
2. Import the project into Vercel.
3. Add the `.env` variables to your Vercel Project Settings.
4. Deploy!
5. Update your Discord Developer Portal URL Mapping to your new live Vercel URL.

## 🤝 Contributing
Contributions, issues, and feature requests are welcome! If you build a new mini-game module, feel free to open a PR to get it added to the arcade.

## 📄 License
This project is licensed under the [MIT License](LICENSE).