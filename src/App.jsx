import { useState, useEffect } from 'react';
import { db, auth } from './firebase'; // <--- Import auth
import { ref, onValue, update } from 'firebase/database';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth'; // <--- Import Auth methods
import './App.css';
import NotFound from './components/core/NotFound';

// --- CORE COMPONENTS ---
import Lobby from './components/core/Lobby';
import GameSelector from './components/core/GameSelector';
import ToastContainer, { useToast } from './components/core/Toast';

// --- GAME MODULES ---
import BimgoSetup from './components/games/bimgo/BimgoSetup';
import BimgoGame from './components/games/bimgo/BimgoGame';
import BloxGame from './components/games/blox/BloxGame';
import TicTacToeGame from './components/games/tictactoe/TicTacToeGame';

export default function App() {
  const { toasts, addToast, removeToast } = useToast();

  // 1. SMART LOADER
  const loadState = () => {
    try {
      const saved = sessionStorage.getItem("backbench_state");
      return saved ? JSON.parse(saved) : null;
    } catch (e) { return null; }
  };
  const savedState = loadState();

  // 2. STATE INITIALIZATION
  // Note: We do NOT generate a random ID here anymore. We wait for Auth.
  const [user, setUser] = useState({ 
      name: savedState?.user?.name || "", 
      id: savedState?.user?.id || null 
  });
  
  const [room, setRoom] = useState({ id: savedState?.roomId || "", data: null });

  // 🆕 FIXED VIEW LOGIC (Merged URL check + Save check)
  const isWrongURL = window.location.pathname !== "/" && window.location.pathname !== "/index.html";
  
  const [view, setView] = useState(() => {
      // Priority 1: Did they type a garbage URL? -> Show 404
      if (isWrongURL) return "404_ERROR"; 
      
      // Priority 2: Do they have a saved game? -> Restore it
      return savedState?.roomId ? "restoring" : "lobby";
  });

  const [bimgoBoard, setBimgoBoard] = useState(savedState?.bimgoBoard || Array(25).fill(null));
  const [bimgoMarked, setBimgoMarked] = useState(savedState?.bimgoMarked || []);
  const [isAuthReady, setIsAuthReady] = useState(false);


  // --- 3. SECURITY: SILENT LOGIN ---
  useEffect(() => {
    // Check if we are already logged in from a previous session
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        if (currentUser) {
            // User is signed in. Use their REAL secure ID.
            setUser(prev => ({ ...prev, id: currentUser.uid }));
            setIsAuthReady(true);
        } else {
            // No user? Sign them in anonymously.
            signInAnonymously(auth).catch((error) => {
                console.error("Auth Failed", error);
                addToast("Login failed. Check internet.", "error");
            });
        }
    });
    return () => unsubscribe();
  }, []);

  // --- 4. PERSISTENCE ---
  useEffect(() => {
    if (user.id) {
        sessionStorage.setItem("backbench_state", JSON.stringify({
            user, roomId: room.id, bimgoBoard, bimgoMarked
        }));
    }
  }, [user, room.id, bimgoBoard, bimgoMarked]);

  // --- 5. ROOM LISTENER (With Host Migration) ---
  useEffect(() => {
    if (!room.id) {
        if (view === "restoring") setView("lobby");
        return;
    }
    const roomRef = ref(db, `rooms/${room.id}`);
    const unsubscribe = onValue(roomRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setRoom(prev => ({ ...prev, data }));

        // --- 🚨 HOST MIGRATION LOGIC (The Fix) ---
        // Check: Is there a Host ID, but that Player is missing from the list?
        if (data.hostId && data.players && !data.players[data.hostId]) {
            const remainingIds = Object.keys(data.players);
            if (remainingIds.length > 0) {
                // The King is dead. Long live the King.
                // We pick the first available player as the new Host.
                const newHostId = remainingIds[0];
                
                // CRITICAL: Only the *new* host writes to the DB (prevents conflicts)
                if (user.id === newHostId) {
                    update(ref(db, `rooms/${room.id}`), { hostId: newHostId })
                        .then(() => addToast("You are now the Host!", "success"));
                }
            }
        }
        // ------------------------------------------

        if (!data.activeGame) setView("selector"); 
        else if (data.activeGame === "BIMGO") {
            if (data.status === "SETUP") setView("bimgo-setup");
            else if (data.status === "PLAYING") setView("bimgo-game");
        }
        else if (data.activeGame === "BLOX") {
            setView("blox-game");
        }
        else if (data.activeGame === "TTT") { setView("ttt-game"); }
      }
        else {
        if (view === "restoring" || view !== "lobby") {
            addToast("Room expired or deleted", "error");
            handleBackToLobby();
        }
      }
    });
    return () => unsubscribe();
  }, [room.id, user.id]); 


  const handleBackToLobby = () => {
    setRoom({ id: "", data: null });
    setBimgoBoard(Array(25).fill(null)); 
    setBimgoMarked([]);
    setView("lobby");
  };

  // Prevent app from loading until Auth is ready
  if (!isAuthReady) return <div className="app-container"><h2 style={{marginTop:100, textAlign:'center'}}>Loading Secure ID...</h2></div>;

  return (
    <div className="app-container">
      <div className="background-blob"></div>
      <header>
        <div className="logo">
           {view.includes('bimgo') ? 'Bimgo' : 'Last Page Arcade'}
        </div>
      </header>

      <main className="main-content">
          {view === "restoring" && (
              <div className="card glass" style={{textAlign:'center', padding: 40}}>
                  <h2>Reconnecting...</h2><p>Hold tight, finding your Adda.</p>
              </div>
          )}

          {view === "lobby" && (
            <Lobby user={user} setUser={setUser} setRoom={setRoom} setView={setView} addToast={addToast} />
          )}

          {view === "selector" && room.data && (
            <GameSelector 
                user={user}
                roomId={room.id}
                hostId={room.data.hostId}
                players={
                    room.data.players 
                    ? Object.entries(room.data.players).map(([key, val]) => ({ id: key, ...val })) 
                    : []
                }
                onBack={handleBackToLobby}
                addToast={addToast}
            />
          )}

          {view === "bimgo-setup" && (
            <BimgoSetup
              user={user} roomId={room.id} board={bimgoBoard} setBoard={setBimgoBoard}
              onBack={handleBackToLobby} addToast={addToast}
            />
          )}

          {view === "bimgo-game" && (
            <BimgoGame
              user={user}
              roomId={room.id}
              hostId={room.data.hostId} 
              board={bimgoBoard}
              marked={bimgoMarked}
              setMarked={setBimgoMarked}
              addToast={addToast}
              onBack={handleBackToLobby}
            />
          )}
  
          {view === "blox-game" && (
              <BloxGame
                  user={user}
                  roomId={room.id}
                  hostId={room.data.hostId}
                  onBack={handleBackToLobby}
                  addToast={addToast}
              />
          )}
          {view === "ttt-game" && (
            <TicTacToeGame
                user={user}
                roomId={room.id}
                hostId={room.data.hostId}
                onBack={handleBackToLobby}
                addToast={addToast}
            />
          )}
          {/* 🆕 404 CATCH-ALL */}
          {![
              "restoring", "lobby", "selector", 
              "bimgo-setup", "bimgo-game", 
              "blox-game", "ttt-game"
          ].includes(view) && (
              <NotFound onBack={() => {
                  // Clean the URL bar without reloading
                  window.history.pushState({}, "", "/"); 
                  handleBackToLobby();
              }} />
          )}
      </main>

      {view === "lobby" && (
        <footer className="glass-footer">
          {/* LEFT SIDE: Credits */}
          <div style={{display: 'flex', alignItems: 'center', gap: 6}}>
            <span>Made by </span>
            <a 
              href="https://yuvrajs.me" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="footer-link"
            >
              Yuvraj
            </a>
          </div>

          {/* RIGHT SIDE: Actions */}
          <div style={{display: 'flex', alignItems: 'center', gap: 15}}>
            
            {/* 1. GITHUB LINK */}
            <a 
              href="https://github.com/yuvraj-sisodia" // Update this with your actual repo
              target="_blank" 
              rel="noopener noreferrer" 
              className="footer-icon"
              title="See the Code"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/>
              </svg>
            </a>

            {/* 2. BUG REPORT (GitHub Issues) */}
            <a 
              /* 👇 CHANGE THIS LINK to your actual repo URL */
              href="https://github.com/yuvraj-sisodia/YOUR-REPO-NAME/issues/new?title=Bug%20Report&body=Describe%20the%20bug%20here..."
              target="_blank"
              rel="noopener noreferrer"
              className="footer-icon"
              title="Report a Bug on GitHub"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="8" height="14" x="8" y="6" rx="4"/>
                <path d="m19 19-3-3"/>
                <path d="m5 19 3-3"/>
                <path d="m19 12-3 0"/>
                <path d="m5 12 3 0"/>
                <path d="m19 5-3 3"/>
                <path d="m5 5 3 3"/>
                <path d="m12 6V4"/>
              </svg>
            </a>

          </div>
        </footer>
      )}
      
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}