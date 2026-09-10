import { useState, useEffect, useMemo } from 'react'; 
import { db } from '../../../firebase';
import { ref, update, runTransaction, onValue, remove } from 'firebase/database';
import ReactionOverlay from '../../core/ReactionOverlay';
import Winner from '../../core/Winner';

// HELPER: Winning indices
const getWinningLines = (currentMarked) => {
    const wins = [
        [0, 1, 2, 3, 4], [5, 6, 7, 8, 9], [10, 11, 12, 13, 14], [15, 16, 17, 18, 19], [20, 21, 22, 23, 24],
        [0, 5, 10, 15, 20], [1, 6, 11, 16, 21], [2, 7, 12, 17, 22], [3, 8, 13, 18, 23], [4, 9, 14, 19, 24],
        [0, 6, 12, 18, 24], [4, 8, 12, 16, 20]
    ];
    return wins.reduce((acc, line, index) => {
        if (line.every(i => currentMarked.includes(i))) acc.push(index);
        return acc;
    }, []);
};

export default function Game({ user, roomId, hostId, board, marked, setMarked, addToast, onBack }) {
    // 1. STATE DEFINITIONS
    const [turnMsg, setTurnMsg] = useState("Waiting...");
    const [isMyTurn, setIsMyTurn] = useState(false);
    const [turnTimeLeft, setTurnTimeLeft] = useState(15); // VISUAL ONLY
    const [winnersList, setWinnersList] = useState([]); 
    const [roomData, setRoomData] = useState(null);
    const [myRank, setMyRank] = useState(null); 

    const TURN_DURATION = 15000; // 15 Seconds

    // 2. MEMOIZED LOGIC
    const completedLines = useMemo(() => getWinningLines(marked), [marked]);
    const winCount = completedLines.length;
    const isHost = user.id === hostId;

    // --- 1. Victory Claim Logic ---
    useEffect(() => {
        if (winCount >= 5 && myRank === null) {
            claimVictory();
        }
    }, [winCount, myRank]);

    // --- 2. Main Game Loop ---
    useEffect(() => {
        if (!roomId) return; 

        const roomRef = ref(db, `rooms/${roomId}`);
        return onValue(roomRef, (snap) => {
            const data = snap.val();
            if (!data) return;
            setRoomData(data); 

            // Update Winners List
            const currentWinners = data.winners || [];
            setWinnersList(currentWinners);
            
            // Check if I am in the winners list
            const myEntry = currentWinners.find(w => w.playerId === user.id);
            if (myEntry) setMyRank(myEntry.rank);

            // Update Marked Numbers
            if (data.lastCalled) {
                const idx = board.indexOf(data.lastCalled);
                if (idx !== -1 && !marked.includes(idx)) {
                    setMarked(prev => [...prev, idx]);
                }
            }

            // Update Turn Logic & Message
            if (data.turnOrder && data.players) {
                const currentId = data.turnOrder[data.currentTurnIndex];
                const currentPlayer = data.players[currentId];
                
                if (currentId === user.id) {
                    setIsMyTurn(true);
                    setTurnMsg("CHAL TERI BAARI 🫵");
                } else {
                    setIsMyTurn(false);
                    setTurnMsg(`Ruk, ${currentPlayer?.name || 'Woh'} Soch Raha Hai...`);
                }
            }
        });
    }, [roomId, board, marked, user.id]); 

    // --- 3. AUTO-PASS Logic (Client Side Check) ---
    // If I'm active but I've already won, pass immediately
    useEffect(() => {
        if (isMyTurn && myRank !== null && roomData) {
            passTurn();
        }
    }, [isMyTurn, myRank, roomData]);

    // --- 4. TIMER LOGIC (HOST ENFORCED 🛡️) ---
    // The Host acts as the "Server" referee.
    useEffect(() => {
        if (!isHost || !roomData || !roomData.turnOrder) return;

        const timer = setInterval(() => {
            const now = Date.now();
            const lastMove = roomData.lastMoveTime || now;
            const elapsed = now - lastMove;

            // If time exceeded 15s, FORCE PASS
            if (elapsed > TURN_DURATION) {
                const nextIdx = findNextActivePlayer(roomData);
                if (nextIdx !== -1) {
                    update(ref(db, `rooms/${roomId}`), { 
                        currentTurnIndex: nextIdx,
                        lastMoveTime: Date.now() 
                    });
                }
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [isHost, roomData, roomId]);

    // --- 5. VISUAL TIMER (For Display Only) ---
    useEffect(() => {
        if (!roomData?.lastMoveTime) return;
        
        const interval = setInterval(() => {
            const now = Date.now();
            const elapsed = Math.floor((now - roomData.lastMoveTime) / 1000);
            const remaining = 15 - elapsed;
            setTurnTimeLeft(remaining > 0 ? remaining : 0);
        }, 500); 

        return () => clearInterval(interval);
    }, [roomData?.lastMoveTime]);


    // --- HELPERS ---
    const passTurn = () => {
        if (roomData) {
            const nextIdx = findNextActivePlayer(roomData);
            if (nextIdx !== -1) {
                update(ref(db, `rooms/${roomId}`), { 
                    currentTurnIndex: nextIdx,
                    lastMoveTime: Date.now() // Reset Timer
                }).catch(err => console.error("Auto-pass error:", err));
            }
        }
    };

    const claimVictory = () => {
        const winnersRef = ref(db, `rooms/${roomId}/winners`);
        runTransaction(winnersRef, (currentWinners) => {
            if (currentWinners === null) return [{ playerId: user.id, name: user.name, rank: 1 }];
            if (currentWinners.some(w => w.playerId === user.id)) return; 
            return [...currentWinners, { playerId: user.id, name: user.name, rank: currentWinners.length + 1 }];
        });
    };

    const findNextActivePlayer = (data) => {
        if (!data || !data.turnOrder) return -1;
        const totalPlayers = data.turnOrder.length;
        let nextIndex = (data.currentTurnIndex + 1) % totalPlayers;
        let attempts = 0;
        
        // Find next player who hasn't won yet
        while (attempts < totalPlayers) {
            const nextPlayerId = data.turnOrder[nextIndex];
            const isWinner = (data.winners || []).some(w => w.playerId === nextPlayerId);
            if (!isWinner) return nextIndex; 
            nextIndex = (nextIndex + 1) % totalPlayers;
            attempts++;
        }
        return -1; 
    };

const handleMove = (num) => {
        // 1. Basic Turn Check (Existing)
        if (!isMyTurn) return; 
        
        // 🛑 2. NEW SAFETY CHECK: Is this number already crossed out?
        const cellIndex = board.indexOf(num);
        if (marked.includes(cellIndex)) {
            addToast("Abe ho chuka hai ye!", "error");
            return; 
        }

        // 3. YOUR ORIGINAL LOGIC (Unchanged)
        const roomRef = ref(db, `rooms/${roomId}`);
        runTransaction(roomRef, (currentData) => {
            if (currentData) {
                if (!currentData.turnOrder) return;
                const currentId = currentData.turnOrder[currentData.currentTurnIndex];
                if (currentId !== user.id) return; 

                currentData.lastCalled = num;
                currentData.lastMoveTime = Date.now();
                
                // Find next player logic inline for transaction safety
                const totalPlayers = currentData.turnOrder.length;
                let nextIndex = (currentData.currentTurnIndex + 1) % totalPlayers;
                let attempts = 0;
                while (attempts < totalPlayers) {
                    const nextPlayerId = currentData.turnOrder[nextIndex];
                    const isWinner = (currentData.winners || []).some(w => w.playerId === nextPlayerId);
                    if (!isWinner) {
                        currentData.currentTurnIndex = nextIndex;
                        break;
                    }
                    nextIndex = (nextIndex + 1) % totalPlayers;
                    attempts++;
                }
            }
            return currentData;
        });
    };

    // --- EXIT / RESET ---
    const handleExit = () => {
        if (isHost) {
            update(ref(db, `rooms/${roomId}`), {
                activeGame: null,
                status: "WAITING",
                winners: null,
                lastCalled: null
            });
        } else {
            if(confirm("Leave the room entirely?")) {
                remove(ref(db, `rooms/${roomId}/players/${user.id}`));
                onBack();
            }
        }
    };

    const handleReset = () => {
        if (user.id !== hostId) return;
        update(ref(db, `rooms/${roomId}`), {
            status: "SETUP",
            winners: null,
            lastCalled: null
        });
    };

    const renderStrikeLines = () => {
        return completedLines.map((lineIdx) => {
            let style = {};
            let className = "strike-line";
            if (lineIdx < 5) { className += " strike-row"; style.top = `${10 + (lineIdx * 20)}%`; } 
            else if (lineIdx < 10) { className += " strike-col"; style.left = `${10 + ((lineIdx - 5) * 20)}%`; } 
            else if (lineIdx === 10) { className += " strike-diag-1"; } 
            else if (lineIdx === 11) { className += " strike-diag-2"; }
            return <div key={lineIdx} className={className} style={style} />;
        });
    };

    if (!roomData) return <div className="card glass"><h2>Loading Game...</h2></div>;

    const playerCount = roomData.players ? Object.keys(roomData.players).length : 0;
    const amIHost = user.id === hostId;

    return (
        <div className="card glass">
            {/* 1. B I M G O Letters */}
            <div className="award-track">
                {['B', 'I', 'M', 'G', 'O'].map((char, i) => (
                    <div key={i} className={`award-letter ${i < winCount ? 'unlocked' : ''}`}>{char}</div>
                ))}
            </div>

            {/* 2. UNIFORM TURN INDICATOR */}
            <div className={`turn-indicator ${isMyTurn ? 'active' : ''}`}>
                {turnMsg}
                {isMyTurn && <span style={{marginLeft: 10, fontSize: '1.2rem', fontWeight: 700}}>{turnTimeLeft}s</span>}
            </div>

            {/* 3. Live Leaderboard */}
            {winnersList.length > 0 && (
                <div style={{ display:'flex', gap:8, justifyContent:'center', margin:'10px 0', flexWrap:'wrap' }}>
                    {winnersList.map((w, i) => (
                        <div key={i} style={{
                            background: 'rgba(255, 214, 10, 0.15)', 
                            border: '1px solid #FFD60A', color: '#FFD60A',
                            padding: '4px 10px', borderRadius: 12, fontSize: '0.8rem', fontWeight: 700
                        }}>
                           #{w.rank} {w.name}
                        </div>
                    ))}
                </div>
            )}

            {/* 4. Player List */}
            {roomData.players && roomData.turnOrder && (
                <div className="player-list">
                    {roomData.turnOrder.map((pid, index) => {
                        const p = roomData.players[pid];
                        if (!p) return null;
                        
                        const isWinner = winnersList.find(w => w.playerId === pid);
                        const isCurrentTurn = index === roomData.currentTurnIndex;

                        return (
                            <div key={pid} className={`player-tag ${isCurrentTurn ? 'ready' : ''}`} style={{
                                opacity: isWinner ? 0.5 : (isCurrentTurn ? 1 : 0.6),
                                textDecoration: isWinner ? 'line-through' : 'none',
                                transform: isCurrentTurn ? 'scale(1.05)' : 'scale(1)'
                            }}>
                                {isWinner ? '🏁 ' : (isCurrentTurn ? '▶ ' : '')}{p.name}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* 5. The Grid */}
            <div className={`grid-container ${!isMyTurn ? 'grid-disabled' : ''}`} style={{position:'relative'}}>
                {renderStrikeLines()}
                {board.map((num, i) => (
                    <div key={i}
                        className={`cell-play ${marked.includes(i) ? 'marked' : ''}`}
                        onClick={() => handleMove(num)}>
                        {num}
                    </div>
                ))}
            </div>

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
                        {(user.id === hostId) ? "End Game" : "Bhaagna Hai?"}
                    </button>
                </div>

            </div>

            {/* WINNER OVERLAY */}
            {myRank !== null && (
                <Winner 
                    rank={myRank} 
                    onRestart={handleReset} 
                    onExit={handleExit} 
                    isHost={amIHost}
                    playerCount={playerCount}
                />
            )}
        </div>
    );
}