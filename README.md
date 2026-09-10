# Last Page Arcade - Project Documentation

**Last Page Arcade** is a real-time, multiplayer gaming platform built for low-latency browser play. It is designed as a modular "arcade" system where a single lobby can host multiple distinct game modules. The platform uses a serverless architecture powered by Firebase, ensuring instant state synchronization across all connected clients.

The current production version features **Bimgo**, a multiplayer Bingo variant with real-time turn management, win detection, and host controls.

## Table of Contents

1. [Technical Stack](https://www.google.com/search?q=%23technical-stack)
2. [Architecture Overview](https://www.google.com/search?q=%23architecture-overview)
3. [Project Structure](https://www.google.com/search?q=%23project-structure)
4. [Installation & Setup](https://www.google.com/search?q=%23installation--setup)
5. [Configuration](https://www.google.com/search?q=%23configuration)
6. [Core Systems](https://www.google.com/search?q=%23core-systems)
* Authentication
* Room Management & Persistence
* Host Migration Protocol


7. [Game Module Development](https://www.google.com/search?q=%23game-module-development)
8. [Database Security](https://www.google.com/search?q=%23database-security)
9. [Deployment](https://www.google.com/search?q=%23deployment)

---

## Technical Stack

* **Frontend Framework:** React 18 (Vite)
* **Language:** JavaScript (ES6+)
* **Styling:** CSS3 (Custom "Apple Dark" Design System, Glassmorphism)
* **Backend / Database:** Firebase Realtime Database
* **Authentication:** Firebase Anonymous Authentication
* **Hosting:** Firebase Hosting
* **State Management:** React Hooks + Session Storage + Firebase Listeners

---

## Architecture Overview

The application follows a **Single Page Application (SPA)** model but routes views manually based on the Realtime Database state rather than URL routing. This ensures all players in a room see the exact same screen at the same time.

### The "Router" (App.jsx)

`App.jsx` acts as the central state manager. It subscribes to the `rooms/{roomId}` node in Firebase.

* **Lobby State:** If no room ID is present locally, it shows the Lobby.
* **Selector State:** If connected but `activeGame` is null, it shows the Game Selector.
* **Game State:** If `activeGame` is set (e.g., "BIMGO"), it dynamically loads that specific component.

### Data Flow

1. **User Actions** (Clicking a cell, joining a room) trigger a **Write** to Firebase.
2. **Firebase** updates the data on the server.
3. **Listeners** (onValue) in all connected clients trigger a re-render with the new data.
4. **Latency Compensation:** Critical moves (like claiming a win) use Firebase Transactions to prevent race conditions.

---

## Project Structure

```text
/src
├── assets/                # Static images and icons
├── components/
│   ├── core/              # System-level components
│   │   ├── GameSelector.jsx  # Menu to pick games
│   │   ├── Lobby.jsx         # Entry point (Create/Join Room)
│   │   ├── Toast.jsx         # Notification system
│   │   └── Winner.jsx        # Victory overlay (Confetti & Results)
│   │   
│   └── games/             # Pluggable Game Modules
│       └── bimgo/
│           ├── BimgoSetup.jsx  # Phase 1: Grid Filling
│           └── BimgoGame.jsx   # Phase 2: Main Gameplay
│
├── App.jsx                # Main Router & State Manager
├── App.css                # Global Theme & CSS Variables
├── firebase.js            # Firebase Initialization
└── main.jsx               # React DOM Entry

```

---

## Installation & Setup

### Prerequisites

* Node.js (v16 or higher)
* npm or yarn
* A Google Firebase account

### Steps

1. **Clone the Repository**
```bash
git clone <repository-url>
cd last-page-arcade

```


2. **Install Dependencies**
```bash
npm install

```


3. **Environment Variables**
Create a file named `.env` in the root directory. Add your Firebase credentials (obtained from Project Settings in Firebase Console):
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://your_project_id.firebaseio.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

```


4. **Start Local Server**
```bash
npm run dev

```



---

## Configuration

### Firebase Console Setup

Before running the app, you must configure the Firebase Console:

1. **Authentication:**
* Go to **Build > Authentication > Sign-in method**.
* Enable **Anonymous** provider.
* (This creates secure, invisible User IDs without requiring login screens).


2. **Realtime Database:**
* Create a database in **locked mode** initially.
* Apply the security rules listed in the [Database Security](https://www.google.com/search?q=%23database-security) section below.



---

## Core Systems

### 1. Host Migration Protocol

To prevent games from breaking if the Host disconnects, `App.jsx` implements a passive check:

* **Trigger:** Every time the room data updates.
* **Check:** Does `room.hostId` exist in `room.players`?
* **Action:** If the Host ID is missing from the player list, the client identifies the remaining players. The player with the first alphabetical ID automatically promotes themselves to Host via a database update.

### 2. Zombie Room Cleanup

To prevent database bloat, a client-side cleanup routine runs whenever a new room is created.

* **Logic:** It queries for rooms where `createdAt` is older than 12 hours.
* **Action:** If found, it issues a `null` update to those nodes, effectively deleting them.

### 3. Persistence (Session Recovery)

The app uses `sessionStorage` to back up the User ID, Room ID, and Game Board state.

* On page refresh, `App.jsx` reads this storage.
* It initializes the app in a "Restoring" state.
* It silently reconnects to the Firebase room using the saved ID, preventing the user from being kicked to the lobby.

---

## Game Module Development

The architecture allows for adding new games (e.g., Blox, TicTacToe) without rewriting the core logic. To add a new game:

1. **Create the Folder:** Create `src/components/games/newgame`.
2. **Required Props:** Your main game component must accept:
* `user`: Current user object (id, name).
* `roomId`: The active room string.
* `hostId`: To determine permissions.
* `onBack`: Function to call when exiting to Lobby.


3. **Register in GameSelector:** Add the game to the `games` array in `GameSelector.jsx` with its ID (e.g., "NEWGAME").
4. **Register in App.jsx:** Add a conditional render block:
```javascript
{view === "newgame-playing" && (
  <NewGameComponent ...props />
)}

```



### Rules for Game Modules

* **No Local State for Game Logic:** All game state (turns, scores, board moves) must be written to Firebase.
* **Host Authority:** Only the Host should be able to advance game phases (e.g., "Start Game", "End Game").
* **Transactions:** Use `runTransaction` for any move that modifies shared counters or shared arrays to prevent overwrite conflicts.

---

## Database Security

The following JSON rules must be applied in the Firebase Realtime Database **Rules** tab. These rules prevent "Test Mode" vulnerabilities by ensuring users can only modify their own data and only Hosts can modify game settings.

```json
{
  "rules": {
    "rooms": {
      "$roomId": {
        ".read": true,
        ".write": "!data.exists() || data.child('players').hasChild(auth.uid) || data.child('hostId').val() === auth.uid",
        
        "activeGame": {
          ".write": "root.child('rooms/'+$roomId+'/hostId').val() === auth.uid"
        },

        "players": {
          "$playerId": {
            ".write": "$playerId === auth.uid",
            "ready": { ".validate": "newData.isBoolean()" },
            "name": { ".validate": "newData.isString() && newData.val().length < 20" }
          }
        },
        
        "turnOrder": { ".write": "root.child('rooms/'+$roomId+'/hostId').val() === auth.uid" },
        "winners": { ".write": true } 
      }
    }
  }
}

```

---

## Deployment

### Building for Production

This compiles the React code into optimized HTML/CSS/JS in the `dist` folder.

```bash
npm run build

```

### Deploying to Firebase Hosting

1. **Install CLI:** `npm install -g firebase-tools`
2. **Login:** `firebase login`
3. **Initialize:** `firebase init hosting`
* Public directory: `dist`
* Rewrite to index.html: `Yes`
* Overwrite index.html: `No`


4. **Deploy:**
```bash
firebase deploy

```



### Post-Deployment Requirement

After deployment, you must whitelist your new domain to allow Authentication to work.

1. Go to Firebase Console > Authentication > Settings > Authorized Domains.
2. Add your hosting domain (e.g., `your-project.web.app` or `play.yourdomain.com`).

---

**Last Page Arcade**
*Developed by Yuvraj Singh Sisodia*