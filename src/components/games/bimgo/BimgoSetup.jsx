import { useState, useEffect } from 'react';
import { db } from '../../../firebase';
import { ref, update, onValue, get, remove } from 'firebase/database';

export default function Setup({ user, roomId, board, setBoard, onBack, addToast }) {
    const [players, setPlayers] = useState([]);
    const [isReady, setIsReady] = useState(false);
    const isHost = players.length > 0 && players[0].id === user.id;

    // Listen for players joining
    useEffect(() => {
        if (!roomId) return;
        const playersRef = ref(db, `rooms/${roomId}/players`);
        return onValue(playersRef, (snap) => {
            const data = snap.val() || {};
            const playerList = Object.entries(data).map(([key, val]) => ({
                id: key,
                ...val
            }));
            setPlayers(playerList);
            if (data[user.id]?.ready) setIsReady(true);
        });
    }, [roomId, user.id]);

    const handleCellClick = (index) => {
        if (isReady) return; 
        const newBoard = [...board];
        const currentMax = newBoard.reduce((max, n) => (n || 0) > max ? n : max, 0);

        if (newBoard[index] === null) {
            if (currentMax < 25) {
                newBoard[index] = currentMax + 1;
                setBoard(newBoard);
            }
        } else {
            if (newBoard[index] === currentMax) {
                newBoard[index] = null;
                setBoard(newBoard);
            } else {
                addToast("Can only undo the last number!", "error");
            }
        }
    };

    const handleShuffle = () => {
        if (isReady) return;
        let nums = Array.from({ length: 25 }, (_, i) => i + 1);
        for (let i = nums.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [nums[i], nums[j]] = [nums[j], nums[i]];
        }
        setBoard(nums);
    };

    const handleReady = () => {
        if(!roomId) return;
        const filledCount = board.filter(n => n !== null).length;
        if(filledCount < 25) {
            addToast("Fill the board first!", "error");
            return;
        }
        update(ref(db, `rooms/${roomId}/players/${user.id}`), { ready: true }).catch(() => {
            addToast("Failed to mark as ready.", "error");
        });
        setIsReady(true);
    };

    const handleStartGame = () => {
        if(!roomId) return;
        const allReady = players.every(p => p.ready);
        if(!allReady) {
            addToast("Wait for everyone to be ready!", "error");
            return;
        }
        get(ref(db, `rooms/${roomId}/players`)).then(snap => {
            const data = snap.val() || {};
            let pIds = Object.keys(data);
            for (let i = pIds.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [pIds[i], pIds[j]] = [pIds[j], pIds[i]];
            }
            update(ref(db, `rooms/${roomId}`), {
                status: "PLAYING",
                turnOrder: pIds,
                currentTurnIndex: 0
            }).catch(() => addToast("Failed to start game.", "error"));
        });
    };

    const handleLeave = () => {
        if (isHost) {
            update(ref(db, `rooms/${roomId}`), { activeGame: null, status: "WAITING" });
        } else {
            if(confirm("Exit this room?")) {
                remove(ref(db, `rooms/${roomId}/players/${user.id}`));
                onBack(); 
            }
        }
    };

    const handleCopyCode = () => {
        navigator.clipboard.writeText(roomId).then(() => {
            addToast("Code Copied!", "success");
        }).catch(() => addToast("Failed to copy code", "error"));
    };

    const filledCount = board.filter(n => n !== null).length;
    const btnText = filledCount < 25 ? `Place Number ${filledCount + 1}` : "Bas Bhai, Ho Gaya";
    const everyoneReady = players.length > 0 && players.every(p => p.ready);

    return (
        <div className="card glass" style={{maxWidth: 500, margin:'0 auto'}}>
            {/* HEADERS */}
            <h2 style={{textAlign:'center', marginBottom: 5, letterSpacing: 2, fontWeight:800}}>Tikdam Bitha Le</h2>
            <p style={{textAlign: 'center', color: '#8E8E93', fontSize: '0.9rem', marginBottom: 20}}>
                Fill numbers 1-25 or Shuffle
            </p>

            {/* ROOM CODE PILL (Unified Style) */}
            <div 
                className="room-code-display" 
                onClick={handleCopyCode} 
                style={{cursor:'pointer', marginBottom: 20}} 
                title="Tap to copy"
            >
                Code: {roomId} <span style={{opacity:0.5, fontSize:'0.8em'}}>❐</span>
            </div>
            
            {/* PLAYER LIST */}
            <div style={{marginBottom: 20, display:'flex', gap: 10, flexWrap:'wrap', justifyContent:'center'}}>
                {players.map((p) => (
                    <div key={p.id} className={`player-tag ${p.ready ? 'ready' : ''}`} style={{fontSize:'0.8rem'}}>
                         {p.ready ? `${p.name}` : `${p.name}...`} {p.id===players[0].id ? '(Host)' : ''}
                         {p.ready && <span style={{marginLeft:4, opacity:0.7}}>✓</span>}
                    </div>
                ))}
            </div>

            {/* ACTION BUTTONS */}
            <div className="button-row" style={{marginBottom: 20}}>
                <button className="btn secondary" onClick={handleShuffle} disabled={isReady}>Shuffle</button>
                <button className="btn primary" onClick={handleReady} disabled={filledCount < 25 || isReady}>
                    {isReady ? "Sabka Wait Kar..." : btnText}
                </button>
            </div>

            {/* HOST CONTROLS */}
            {isHost && (
                <div style={{marginBottom: 20}}>
                    <button
                        className="btn accent"
                        style={{ width: '100%', opacity: everyoneReady ? 1 : 0.5 }}
                        onClick={handleStartGame}
                        disabled={!everyoneReady}
                    >
                        {!everyoneReady ? "Sabka Wait Kar..." : "Chalo Machayein!"}
                    </button>
                </div>
            )}

            {!isHost && isReady && (
                 <div style={{
                    textAlign:'center', padding: 12, marginBottom: 20,
                    background:'rgba(255,255,255,0.05)', borderRadius: 12,
                    fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)', fontStyle: 'italic'
                }}>
                    Host will start the game soon...
                 </div>
            )}

            {/* THE GRID */}
            <div className="grid-container" style={{marginBottom: 20}}>
                {board.map((num, i) => (
                    <div key={i}
                        className={`cell-setup ${num ? 'filled' : ''}`}
                        onClick={() => handleCellClick(i)}>
                        {num}
                    </div>
                ))}
            </div>

            {/* UNIFIED FOOTER */}
            <div className="game-footer">
                <span style={{color: 'rgba(255,255,255,0.4)', fontSize:'0.85rem'}}>
                    Room: <b style={{color:'white'}}>{roomId}</b>
                </span>
                
                <button 
                    className="btn-xs" 
                    style={{width:'auto', background:'rgba(255, 69, 58, 0.1)', color:'#FF453A'}}
                    onClick={handleLeave}
                >
                    {isHost ? "Cancel Game" : "Bhaagna Hai?"}
                </button>
            </div>
        </div>
    );
}