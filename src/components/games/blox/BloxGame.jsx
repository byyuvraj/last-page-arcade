import { useState, useEffect } from 'react';
import { db } from '../../../firebase';
import { ref, onValue, runTransaction, update, remove } from 'firebase/database';
import { checkForCompletedBoxes, BOX_COUNT, DOTS_COUNT } from './gamelogic';
import BloxBoard from './BloxBoard';
import ReactionOverlay from '../../core/ReactionOverlay';
import Winner from '../../core/Winner';

export default function BloxGame({ user, roomId, hostId, onBack, addToast }) {
    // --- STATE DECLARATIONS ---
    const [gameState, setGameState] = useState(null);
    const [p1, setP1] = useState(null);
    const [p2, setP2] = useState(null);
    const [myRole, setMyRole] = useState(null); 
    const [selectedLine, setSelectedLine] = useState(null);
    
    // 🆕 Visual Countdown State (Declared ONLY ONCE here)
    const [timeLeft, setTimeLeft] = useState(20);
    const TURN_DURATION = 20000; 

    // ✅ FIXED: Safety Check. If gameState is null, score is 0.
    const totalScore = gameState ? (gameState.scores?.p1 || 0) + (gameState.scores?.p2 || 0) : 0;
    const gameOver = totalScore >= (BOX_COUNT * BOX_COUNT);

    // --- 1. INITIALIZE GAME ---
    useEffect(() => {
        if (user.id !== hostId) return; 

        const gameRef = ref(db, `rooms/${roomId}/bloxState`);
        runTransaction(gameRef, (currentData) => {
            if (currentData === null) {
                return {
                    lines: {}, 
                    boxes: {}, 
                    scores: { p1: 0, p2: 0 },
                    turn: 'p1', 
                    p1Uid: user.id, 
                    p2Uid: null    
                };
            }
            return; 
        });
    }, [roomId, hostId, user.id]);

    // --- 2. LISTEN TO GAME STATE ---
    useEffect(() => {
        const roomRef = ref(db, `rooms/${roomId}`);
        const unsub = onValue(roomRef, (snapshot) => {
            const data = snapshot.val();
            if (!data || !data.bloxState) return;

            const state = data.bloxState;
            setGameState(state);

            const playerList = data.players || {};
            const p1Data = playerList[state.p1Uid];
            setP1(p1Data ? { ...p1Data, id: state.p1Uid } : null);

            if (!state.p2Uid) {
                const potentialP2 = Object.keys(playerList).find(uid => uid !== state.p1Uid);
                if (potentialP2 && user.id === hostId) {
                    update(ref(db, `rooms/${roomId}/bloxState`), { p2Uid: potentialP2 });
                }
            } else {
                if (!playerList[state.p2Uid]) {
                      if (user.id === hostId) {
                          update(ref(db, `rooms/${roomId}/bloxState`), { p2Uid: null });
                      }
                }
                const p2Data = playerList[state.p2Uid];
                setP2(p2Data ? { ...p2Data, id: state.p2Uid } : null);
            }

            if (user.id === state.p1Uid) setMyRole('p1');
            else if (user.id === state.p2Uid) setMyRole('p2');
            else setMyRole('spectator');
        });
        return () => unsub();
    }, [roomId, user.id, hostId]);

    // --- 🆕 TIMER LOGIC (Panic Move: Auto-Play Random Line) ---
    useEffect(() => {
        if (!gameState || gameOver || !p2) return;
        if (myRole !== 'p1') return; // Only Host enforces rules

        const timer = setInterval(() => {
            const now = Date.now();
            const lastMove = gameState.lastMoveTime || now;
            const elapsed = now - lastMove;

            if (elapsed > TURN_DURATION) {
                // 🛑 TIME'S UP! FORCE A RANDOM MOVE.
                const gameRef = ref(db, `rooms/${roomId}/bloxState`);
                runTransaction(gameRef, (current) => {
                    if (!current) return;
                    
                    // 1. Calculate Available Lines
                    const takenLines = current.lines || {};
                    const allLines = getAllPossibleLines(); // Helper function below
                    const availableLines = allLines.filter(id => !takenLines[id]);

                    // 2. If board is full (rare edge case), stop
                    if (availableLines.length === 0) return;

                    // 3. Pick Random Line
                    const randomLineId = availableLines[Math.floor(Math.random() * availableLines.length)];

                    // 4. Execute Move (Same logic as handleLineClick)
                    if (!current.lines) current.lines = {};
                    current.lines[randomLineId] = current.turn; // Assign to current player

                    const takenList = Object.keys(current.lines);
                    const newBoxes = checkForCompletedBoxes(randomLineId, takenList);

                    // 5. Handle Scoring
                    if (newBoxes.length > 0) {
                        if (!current.boxes) current.boxes = {};
                        if (!current.scores) current.scores = { p1: 0, p2: 0 };
                        
                        newBoxes.forEach(boxCoord => {
                            current.boxes[boxCoord] = current.turn;
                            current.scores[current.turn] += 1;
                        });
                        // Turn STAYS with player, timer resets
                    } else {
                        // No score -> Switch Turn
                        current.turn = (current.turn === 'p1') ? 'p2' : 'p1';
                    }

                    // 6. ALWAYS Reset Timer & Clear Selection
                    current.lastMoveTime = Date.now();
                    return current;
                });
                
                // Clear local selection if they were holding a line
                setSelectedLine(null);
            }
        }, 1000); 

        return () => clearInterval(timer);
    }, [gameState, gameOver, p2, myRole, roomId]);

    // --- 🆕 VISUAL COUNTDOWN ---
    useEffect(() => {
        if (!gameState?.lastMoveTime) return;
        
        const interval = setInterval(() => {
            const now = Date.now();
            const elapsed = Math.floor((now - gameState.lastMoveTime) / 1000);
            const remaining = 20 - elapsed;
            setTimeLeft(remaining > 0 ? remaining : 0);
        }, 500); 

        return () => clearInterval(interval);
    }, [gameState?.lastMoveTime]);


    // --- 3. HANDLE MOVE ---
    const handleLineClick = (lineId) => {
        if (!gameState || !myRole || myRole === 'spectator') return;
        if (gameState.turn !== myRole) {
            addToast("Wait for your turn!", "error");
            return;
        }

        // 1. If line taken, ignore
        if (gameState.lines && gameState.lines[lineId]) return;

        // 2. CHECK: Double Tap Logic
        if (selectedLine !== lineId) {
            setSelectedLine(lineId); // First tap -> Select (Yellow)
            return; 
        }

        // 3. Second Tap -> Commit Move
        setSelectedLine(null);

        const gameRef = ref(db, `rooms/${roomId}/bloxState`);
        runTransaction(gameRef, (current) => {
            if (!current) return; 
            if (current.lines && current.lines[lineId]) return; 
            if (current.turn !== myRole) return; 

            if (!current.lines) current.lines = {};
            current.lines[lineId] = myRole;

            const takenList = Object.keys(current.lines);
            const newBoxes = checkForCompletedBoxes(lineId, takenList);

            if (newBoxes.length > 0) {
                if (!current.boxes) current.boxes = {};
                if (!current.scores) current.scores = { p1: 0, p2: 0 };
                
                // Keep turn, but RESET TIMER
                current.lastMoveTime = Date.now();

                newBoxes.forEach(boxCoord => {
                    current.boxes[boxCoord] = myRole;
                    current.scores[myRole] += 1;
                });
            } else {
                // Switch turn and RESET TIMER
                current.turn = (current.turn === 'p1') ? 'p2' : 'p1';
                current.lastMoveTime = Date.now();
            }

            return current;
        });
    };

    // --- 4. EXIT / RESET ---
    const handleExit = () => {
        if (user.id === hostId) {
            update(ref(db, `rooms/${roomId}`), { activeGame: null, bloxState: null, status: "WAITING" });
        } else {
            remove(ref(db, `rooms/${roomId}/players/${user.id}`));
            onBack();
        }
    };
    const handleReset = () => {
        if (user.id !== hostId) return;
        update(ref(db, `rooms/${roomId}/bloxState`), {
            lines: {}, 
            boxes: {}, 
            scores: { p1: 0, p2: 0 },
            turn: 'p1' 
        });
    };

    if (!gameState || !p1) return <div className="card glass"><h2>Loading Blox...</h2></div>;

    // --- 5. RENDER HELPERS ---
    let myRank = null;
    if(gameOver && myRole !== 'spectator') {
        const myScore = gameState.scores[myRole];
        const oppScore = gameState.scores[myRole === 'p1' ? 'p2' : 'p1'];
        if(myScore > oppScore) myRank = 1;
        else if(myScore < oppScore) myRank = 2;
        else myRank = 2; 
    }

    // 🆕 TURN MESSAGE LOGIC (Cleaned for Bingo Style)
    const isMyTurn = gameState.turn === myRole;
    const opponentName = myRole === 'p1' ? (p2?.name || "Player 2") : (p1?.name || "Player 1");
    
    let turnMsg = "Waiting for Player 2...";
    
    if (p2) {
        if (gameOver) {
            turnMsg = "GAME OVER";
        } 
        else if (isMyTurn) {
            if (selectedLine) {
                turnMsg = "TAP AGAIN TO LOCK 🔒";
            } else {
                turnMsg = "Your turn! 🫵";
            }
        } 
        else {
            turnMsg = `Wait, ${opponentName} is thinking...`;
        }
    }

    return (
        <div className="card glass" style={{maxWidth: 500, margin:'0 auto'}}>
            {/* HEADERS */}
            <h2 style={{textAlign:'center', marginBottom: 5, letterSpacing: 3, fontWeight:800}}>BLOX</h2>

            {/* 🆕 UNIFORM TURN INDICATOR (Bingo Style) */}
            <div className={`turn-indicator ${isMyTurn && !gameOver && p2 ? 'active' : ''}`}>
                {turnMsg}
                {/* The Timer is now a separate, bold element just like Bingo */}
                {isMyTurn && !gameOver && !selectedLine && (
                    <span style={{marginLeft: 10, fontSize: '1.2rem', fontWeight: 700}}>
                        {timeLeft}s
                    </span>
                )}
            </div>

            {/* SCOREBOARD */}
            <div style={{display:'flex', justifyContent:'space-between', marginBottom: 20, marginTop: 20, gap: 10}}>
                <div className={`player-badge ${gameState.turn === 'p1' ? 'active' : ''}`} style={{borderColor: '#FF3B30'}}>
                    <div style={{fontSize:'0.75rem', color:'#FF3B30', fontWeight:700, letterSpacing:1}}>PLAYER 1</div>
                    <div style={{fontSize:'1.8rem', fontWeight:800, color:'#fff'}}>{gameState.scores?.p1 || 0}</div>
                    <div style={{fontWeight:'bold', fontSize:'0.8rem'}}>{p1?.name || "Waiting..."} {myRole === 'p1' && '(YOU)'}</div>
                </div>

                <div className={`player-badge ${gameState.turn === 'p2' ? 'active' : ''}`} style={{borderColor: '#007AFF'}}>
                    <div style={{fontSize:'0.75rem', color:'#007AFF', fontWeight:700, letterSpacing:1}}>PLAYER 2</div>
                    <div style={{fontSize:'1.8rem', fontWeight:800, color:'#fff'}}>{gameState.scores?.p2 || 0}</div>
                    <div style={{fontWeight:'bold', fontSize:'0.8rem'}}>{p2?.name || "Waiting..."} {myRole === 'p2' && '(YOU)'}</div>
                </div>
            </div>

            {/* THE BOARD */}
            <BloxBoard 
                lines={gameState.lines || {}} 
                boxes={gameState.boxes || {}} 
                onLineClick={handleLineClick}
                isMyTurn={gameState.turn === myRole && !gameOver && p2}
                selectedLine={selectedLine}
            />

            {/* UNIFORM FOOTER */}
            <div className="game-footer" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                
                {/* 1. LEFT: Room ID */}
                <div style={{flex: 1, textAlign: 'left'}}>
                    <span style={{color: 'rgba(255,255,255,0.4)', fontSize:'0.85rem'}}>
                        Room: <b style={{color:'white'}}>{roomId}</b>
                    </span>
                </div>

                {/* 2. CENTER: Reaction Button */}
                <div style={{flex: 1, display: 'flex', justifyContent: 'center'}}>
                    <ReactionOverlay roomId={roomId} user={user} />
                </div>

                {/* 3. RIGHT: Exit Button */}
                <div style={{flex: 1, display: 'flex', justifyContent: 'flex-end'}}>
                    <button 
                        className="btn-xs" 
                        style={{
                            width:'auto', 
                            background:'rgba(255, 69, 58, 0.1)', 
                            color:'#FF453A',
                            border: 'none',
                            whiteSpace: 'nowrap'
                        }}
                        onClick={handleExit}
                    >
                        {(user.id === hostId) ? "End Game" : "Leave Game"}
                    </button>
                </div>

            </div>

            {/* WINNER OVERLAY */}
            {gameOver && myRank && (
                <Winner 
                    rank={myRank} 
                    onRestart={handleReset} 
                    onExit={handleExit} 
                    isHost={user.id === hostId} 
                    playerCount={2}
                />
            )}
        </div>
    );
}

// --- HELPER: Generate all grid lines to find empty ones ---
const getAllPossibleLines = () => {
    const lines = [];
    // Horizontal Lines: DOTS_COUNT rows * BOX_COUNT cols
    for (let r = 0; r < DOTS_COUNT; r++) {
        for (let c = 0; c < BOX_COUNT; c++) lines.push(`h-${r}-${c}`);
    }
    // Vertical Lines: BOX_COUNT rows * DOTS_COUNT cols
    for (let r = 0; r < BOX_COUNT; r++) {
        for (let c = 0; c < DOTS_COUNT; c++) lines.push(`v-${r}-${c}`);
    }
    return lines;
};