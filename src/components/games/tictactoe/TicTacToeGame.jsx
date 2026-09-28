import { useState, useEffect } from 'react';
import { db } from '../../../firebase';
import { ref, onValue, runTransaction, update, remove } from 'firebase/database';
import ReactionOverlay from '../../core/ReactionOverlay';
import Winner from '../../core/Winner';

export default function TicTacToeGame({ user, roomId, hostId, onBack, addToast }) {
    const [gameState, setGameState] = useState(null);
    const [p1, setP1] = useState(null);
    const [p2, setP2] = useState(null);
    const [myRole, setMyRole] = useState(null);

    // 🆕 1. TIMER STATE
    const [timeLeft, setTimeLeft] = useState(15);
    const TURN_DURATION = 15000;

    // --- HELPER: SANITIZE BOARD ---
    const sanitizeBoard = (data) => {
        const fullBoard = Array(9).fill(null);
        if (!data) return fullBoard;
        Object.keys(data).forEach(key => { if (key >= 0 && key < 9) fullBoard[key] = data[key]; });
        return fullBoard;
    };
    
    // --- HELPER: WIN LOGIC (INTERNAL) ---
    // ✅ MOVED INSIDE: No more import errors. Safe & Stable.
    const checkWinner = (board) => {
        const WIN_PATTERNS = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
            [0, 3, 6], [1, 4, 7], [2, 5, 8], // Cols
            [0, 4, 8], [2, 4, 6]             // Diagonals
        ];
        for (let pattern of WIN_PATTERNS) {
            const [a, b, c] = pattern;
            if (board[a] && board[a] === board[b] && board[a] === board[c]) {
                return { winner: board[a], line: pattern };
            }
        }
        return null;
    };

    // --- HELPER: STRIKE STYLE ---
    const getStrikeStyle = (line) => {
        if (!line || line.length === 0) return null;
        const s = line.join('');
        const base = { position: 'absolute', transformOrigin: 'left center' };
        if (s === '012') return { ...base, top: '16.66%', left: '0', width: '100%', transform: 'rotate(0deg)' };
        if (s === '345') return { ...base, top: '50%',    left: '0', width: '100%', transform: 'rotate(0deg)' };
        if (s === '678') return { ...base, top: '83.33%', left: '0', width: '100%', transform: 'rotate(0deg)' };
        if (s === '036') return { ...base, top: '0', left: '16.66%', width: '100%', transform: 'rotate(90deg)' };
        if (s === '147') return { ...base, top: '0', left: '50%',    width: '100%', transform: 'rotate(90deg)' };
        if (s === '258') return { ...base, top: '0', left: '83.33%', width: '100%', transform: 'rotate(90deg)' };
        if (s === '048') return { ...base, top: '0', left: '0', width: '141.4%', transform: 'rotate(45deg)' };
        if (s === '246') return { ...base, top: '0', right: '0', width: '141.4%', transform: 'rotate(135deg)', transformOrigin: 'left center', left: 'auto' };
        return null;
    };

    // ✅ FIXED: Calculate Winner EARLY
    const board = gameState?.board ? sanitizeBoard(gameState.board) : Array(9).fill(null);
    const winData = checkWinner(board);
    const winner = winData?.winner || null;
    const winningLine = winData?.line || []; 
    const isDraw = !winner && board.every((cell) => cell !== null);
    const gameOver = !!winner || isDraw;

    // --- INIT ---
    useEffect(() => {
        if (user.id !== hostId) return;
        runTransaction(ref(db, `rooms/${roomId}/tictactoeState`), (curr) => {
            if (curr === null) return { board: Array(9).fill(null), turn: 'p1', p1Uid: user.id, p2Uid: null, winner: null, winningLine: [] };
        });
    }, [roomId, hostId, user.id]);

    // --- LISTEN ---
    useEffect(() => {
        return onValue(ref(db, `rooms/${roomId}`), (snap) => {
            const data = snap.val();
            if (!data || !data.tictactoeState) return;
            const state = data.tictactoeState;
            setGameState(state);
            const players = data.players || {};
            setP1(players[state.p1Uid] ? { ...players[state.p1Uid], id: state.p1Uid } : null);
            if (!state.p2Uid && user.id === hostId) {
                const nextGuest = Object.keys(players).find(uid => uid !== state.p1Uid);
                if (nextGuest) update(ref(db, `rooms/${roomId}/tictactoeState`), { p2Uid: nextGuest });
            } else if (state.p2Uid && !players[state.p2Uid] && user.id === hostId) {
                update(ref(db, `rooms/${roomId}/tictactoeState`), { p2Uid: null });
            }
            setP2(players[state.p2Uid] ? { ...players[state.p2Uid], id: state.p2Uid } : null);
            if (user.id === state.p1Uid) setMyRole('p1');
            else if (user.id === state.p2Uid) setMyRole('p2');
            else setMyRole('spectator');
        });
    }, [roomId, user.id, hostId]);

    // 🆕 2. TIMER WATCHDOG (Auto-Skip Logic)
    useEffect(() => {
        if (!gameState || gameOver || !p2) return;
        if (myRole !== 'p1') return; // Only Host enforces rules

        const timer = setInterval(() => {
            const now = Date.now();
            const lastMove = gameState.lastMoveTime || now;
            const elapsed = now - lastMove;

            if (elapsed > TURN_DURATION) {
                // TIME UP! Skip turn.
                runTransaction(ref(db, `rooms/${roomId}/tictactoeState`), (current) => {
                    if (!current) return;
                    current.turn = (current.turn === 'p1') ? 'p2' : 'p1';
                    current.lastMoveTime = Date.now(); // Reset timer
                    return current;
                });
            }
        }, 1000); 

        return () => clearInterval(timer);
    }, [gameState, gameOver, p2, myRole, roomId]);

    // 🆕 3. VISUAL COUNTDOWN
    useEffect(() => {
        if (!gameState?.lastMoveTime) return;
        const interval = setInterval(() => {
            const now = Date.now();
            const elapsed = Math.floor((now - gameState.lastMoveTime) / 1000);
            const remaining = 15 - elapsed;
            setTimeLeft(remaining > 0 ? remaining : 0);
        }, 500); 
        return () => clearInterval(interval);
    }, [gameState?.lastMoveTime]);


    // --- HANDLE MOVE ---
    const handleCellClick = (index) => {
        if (!gameState || myRole === 'spectator' || gameOver || gameState.turn !== myRole) return;
        
        runTransaction(ref(db, `rooms/${roomId}/tictactoeState`), (curr) => {
            if (!curr) return;
            let board = sanitizeBoard(curr.board);
            if (board[index] !== null) return;
            
            board[index] = myRole;
            curr.board = board;
            const win = checkWinner(board);
            
            if (win) { 
                curr.winner = myRole; 
                curr.winningLine = win.line; 
            } else { 
                curr.winner = board.every(c => c!==null) ? 'draw' : null; 
                curr.turn = (curr.turn === 'p1' ? 'p2' : 'p1'); 
            }

            // 🆕 4. RESET TIMER ON MOVE
            curr.lastMoveTime = Date.now(); 

            return curr;
        });
    };

    const handleExit = () => {
        if (user.id === hostId) update(ref(db, `rooms/${roomId}`), { activeGame: null, tictactoeState: null, status: "WAITING" });
        else { remove(ref(db, `rooms/${roomId}/players/${user.id}`)); onBack(); }
    };
    const handleReset = () => {
        if (user.id !== hostId) return;
        update(ref(db, `rooms/${roomId}/tictactoeState`), { board: Array(9).fill(null), turn: gameState.winner === 'p1' ? 'p2' : 'p1', winner: null, winningLine: [] });
    };

    if (!gameState || !p1) return <div className="card glass"><h2>Loading...</h2></div>;

    const hasWinner = !!winner;
    let myRank = null;
    if (gameOver) {
       if (winner === myRole) myRank = 1;
       else if (winner) myRank = 2; // Lost
       else myRank = "DRAW"; // Draw
    }

    // 🆕 5. TURN MESSAGE (Bingo Style)
    const isMyTurn = gameState.turn === myRole;
    const opponentName = myRole === 'p1' ? (p2?.name || "Player 2") : (p1?.name || "Player 1");
    
    let turnMsg = "Waiting...";
    if (gameOver) {
        turnMsg = winner ? "GAME OVER" : "DRAW! 🤝";
    } else if (isMyTurn) {
        turnMsg = "Your turn! 🫵";
    } else {
        turnMsg = `Wait, ${opponentName} is thinking...`;
    }

    return (
        <div className="card glass" style={{maxWidth: 400, margin:'0 auto'}}>
            <h2 style={{textAlign:'center', marginBottom:5, letterSpacing:2, fontWeight:800}}>TIC TAC TOE</h2>

            {/* UNIFORM TURN INDICATOR (Bingo Style) */}
            <div className={`turn-indicator ${isMyTurn && !gameOver ? 'active' : ''}`}>
                {turnMsg}
                {/* Timer: Bold and Separate */}
                {isMyTurn && !gameOver && p2 && (
                    <span style={{marginLeft: 10, fontSize: '1.2rem', fontWeight: 700}}>
                        {timeLeft}s
                    </span>
                )}
            </div>

            {/* SCOREBOARD */}
            <div style={{display:'flex', justifyContent:'space-between', marginBottom:20, marginTop: 20, gap:10}}>
                 <div className={`player-badge ${gameState.turn === 'p1' ? 'active' : ''}`} style={{borderColor: '#FF3B30'}}>
                    <div style={{fontSize:'0.75rem', color:'#FF3B30', fontWeight:700}}>PLAYER 1</div>
                    <div style={{fontWeight:'bold'}}>{p1.name} {myRole==='p1' && '(YOU)'}</div>
                </div>
                <div className={`player-badge ${gameState.turn === 'p2' ? 'active' : ''}`} style={{borderColor: '#007AFF'}}>
                    <div style={{fontSize:'0.75rem', color:'#007AFF', fontWeight:700}}>PLAYER 2</div>
                    <div style={{fontWeight:'bold'}}>{p2?.name || "Waiting..."} {myRole==='p2' && '(YOU)'}</div>
                </div>
            </div>

            {/* THE GRID */}
            <div className="ttt-grid">
                {board.map((cell, i) => (
                    <div key={i} className={`ttt-cell ${cell ? 'taken' : ''}`} onClick={() => handleCellClick(i)} style={{ color: cell === 'p1' ? '#FF3B30' : '#007AFF' }}>
                        {cell === 'p1' && "X"}
                        {cell === 'p2' && "O"}
                    </div>
                ))}
                {hasWinner && (() => {
                    const style = getStrikeStyle(winningLine);
                    return style ? <div className="strike-wrapper" style={style}><div className="strike-line-inner" /></div> : null;
                })()}
            </div>

            {/* UNIFORM FOOTER */}
            <div className="game-footer" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                
                {/* 1. LEFT: Room ID */}
                <div style={{flex: 1, textAlign: 'left'}}>
                    <span style={{color: 'var(--text-sec)', fontSize:'0.85rem'}}>
                        Room: <b style={{color:'var(--primary)'}}>{roomId}</b>
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
                            background:'white', 
                            color:'#FF453A',
                            border: '2px solid #FF453A',
                            whiteSpace: 'nowrap'
                        }}
                        onClick={handleExit}
                    >
                        {(user.id === hostId) ? "End Game" : "Leave Game"}
                    </button>
                </div>

            </div>

            {gameOver && <Winner rank={myRank} onRestart={handleReset} onExit={handleExit} isHost={user.id === hostId} />}

        </div>
    );
}