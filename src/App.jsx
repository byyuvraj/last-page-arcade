import { useState, useEffect } from 'react';
import { db, auth } from './firebase'; // <--- Import auth
import { ref, onValue, update } from 'firebase/database';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth'; // <--- Import Auth methods
import './App.css';
import NotFound from './components/core/NotFound';
import Terms from './components/core/Terms';
import Privacy from './components/core/Privacy';
import { useDiscord } from './components/core/DiscordProvider';

// --- CORE COMPONENTS ---
import Lobby from './components/core/Lobby';
import GameSelector from './components/core/GameSelector';
import ToastContainer, { useToast } from './components/core/Toast';

// --- GAME MODULES ---
import BingoSetup from './components/games/bingo/BingoSetup';
import BingoGame from './components/games/bingo/BingoGame';
import BloxGame from './components/games/blox/BloxGame';
import TicTacToeGame from './components/games/tictactoe/TicTacToeGame';

export default function App() {
  const { toasts, addToast, removeToast } = useToast();
  const { discordUser } = useDiscord();

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

  const path = window.location.pathname;
  const isWrongURL = path !== "/" && path !== "/index.html" && path !== "/terms" && path !== "/privacy";
  
  const [view, setView] = useState(() => {
      // Priority 1: Did they type a garbage URL? -> Show 404
      if (isWrongURL) return "404_ERROR"; 
      if (path === "/terms") return "terms";
      if (path === "/privacy") return "privacy";
      
      // Priority 2: Do they have a saved game? -> Restore it
      return savedState?.roomId ? "restoring" : "lobby";
  });

  const [bingoBoard, setBingoBoard] = useState(savedState?.bingoBoard || Array(25).fill(null));
  const [bingoMarked, setBingoMarked] = useState(savedState?.bingoMarked || []);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [authError, setAuthError] = useState(null);

  // --- 2.5 RESTORE TIMEOUT FAILSAFE ---
  // If Firebase hangs and we are stuck in 'restoring' for more than 4 seconds, abort.
  useEffect(() => {
      if (view === "restoring") {
          const timer = setTimeout(() => {
              console.warn("Restore timed out, returning to lobby");
              setRoom({ id: "", data: null });
              setView("lobby");
          }, 4000);
          return () => clearTimeout(timer);
      }
  }, [view]);

  // --- 3. IDENTITY: BYPASS FIREBASE AUTH ---
  useEffect(() => {
      // Since DiscordProvider blocks rendering until it finishes, 
      // discordUser is already finalized by the time this runs.
      if (discordUser) {
          // Use their real Discord ID and Username
          setUser(prev => ({
              ...prev,
              id: discordUser.id,
              name: discordUser.username
          }));
      } else {
          // Not in Discord (or Discord auth failed). Use local ID.
          const localId = savedState?.user?.id || 'web-' + Math.random().toString(36).substr(2, 9);
          setUser(prev => ({ ...prev, id: localId }));
      }
      setIsAuthReady(true);
  }, [discordUser]);

  // --- 4. PERSISTENCE ---
  useEffect(() => {
    if (user.id) {
        sessionStorage.setItem("backbench_state", JSON.stringify({
            user, roomId: room.id, bingoBoard, bingoMarked
        }));
    }
  }, [user, room.id, bingoBoard, bingoMarked]);

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

        if (!data.activeGame) setView("lobby"); 
        else if (data.activeGame === "BINGO") {
            if (data.status === "SETUP") setView("bingo-setup");
            else if (data.status === "PLAYING") setView("bingo-game");
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
    setBingoBoard(Array(25).fill(null)); 
    setBingoMarked([]);
    setView("lobby");
  };

  // Prevent app from loading until Auth is ready
  if (!isAuthReady) {
    return (
      <div className="app-container">
        <h2 style={{marginTop:100, textAlign:'center'}}>
          {authError ? "Firebase Error: " + authError : "Loading Secure ID..."}
        </h2>
      </div>
    );
  }

  return (
    <div className="app-container">
      <main className="main-content">
          {view === "restoring" && (
              <div className="card glass" style={{textAlign:'center', padding: 40}}>
                  <h2>Reconnecting...</h2><p>Hold tight, finding your Room.</p>
              </div>
          )}

          {view === "lobby" && (
            <Lobby user={user} setUser={setUser} setRoom={setRoom} room={room} setView={setView} addToast={addToast} />
          )}

          {view === "bingo-setup" && (
            <BingoSetup
              user={user} roomId={room.id} board={bingoBoard} setBoard={setBingoBoard}
              onBack={handleBackToLobby} addToast={addToast}
            />
          )}

          {view === "bingo-game" && (
            <BingoGame
              user={user}
              roomId={room.id}
              hostId={room.data.hostId} 
              board={bingoBoard}
              marked={bingoMarked}
              setMarked={setBingoMarked}
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

          {view === "terms" && <Terms />}
          {view === "privacy" && <Privacy />}

          {/* 🆕 404 CATCH-ALL */}
          {![
              "restoring", "lobby", "selector", 
              "bingo-setup", "bingo-game", 
              "blox-game", "ttt-game", "terms", "privacy"
          ].includes(view) && (
              <NotFound onBack={() => {
                  // Clean the URL bar without reloading
                  window.history.pushState({}, "", "/"); 
                  handleBackToLobby();
              }} />
          )}
      </main>


      
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}