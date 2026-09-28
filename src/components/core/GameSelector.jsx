import { useState } from 'react';
import { update, ref, remove } from 'firebase/database';
import { db } from '../../firebase';

export default function GameSelector({ user, roomId, players, hostId, onBack, addToast }) {
    // FALLBACK: If room was created before this fix, guess the first player
    const finalHostId = hostId || (players[0] ? players[0].id : null);
    const isHost = user.id === finalHostId;

    // 🆕 STATE: Track which game card is expanded
    const [expandedGame, setExpandedGame] = useState(null);

    // 🆕 UPDATED GAMES DATA: Added 'instructions' and 'color'
    const games = [
        { 
            id: 'BINGO', 
            name: 'Bingo', 
            icon: '🎰', 
            tagline: 'Pure Luck. 5 in a row.', 
            color: 'rgba(255, 214, 10, 0.15)', // Yellow Tint
            instructions: [
                "Fill your 5x5 grid with numbers 1-25.",
                "Wait for the host to call numbers.",
                "Tap numbers to cross them out (Strike).",
                "Complete 5 lines (Rows, Columns, Diagonals) to WIN!"
            ]
        },
        { 
            id: 'BLOX', 
            name: 'Blox', 
            icon: '✏️', 
            tagline: 'Strategy. Close the boxes.', 
            color: 'rgba(255, 59, 48, 0.15)', // Red Tint
            instructions: [
                "Tap between dots to draw a line.",
                "Double Tap to confirm your move (Yellow = Draft).",
                "Complete a square (Box) to score a point.",
                "Closing a box gives you an extra turn!",
                "Player with the most boxes wins."
            ]
        },
        { 
            id: 'TTT', 
            name: 'Tic Tac Toe', 
            icon: '❌', 
            tagline: 'The Classic. 15s Timer.', 
            color: 'rgba(0, 122, 255, 0.15)', // Blue Tint
            instructions: [
                "Place your mark (X or O) in the grid.",
                "Get 3 in a row (Horizontal, Vertical, Diagonal).",
                "Move fast! You only have 15 seconds per turn."
            ]
        }
    ];

    const selectGame = (gameId) => {
        if (!isHost) return;
        update(ref(db, `rooms/${roomId}`), {
            activeGame: gameId,
            status: "SETUP" 
        }).catch(err => addToast("Error starting game: " + err.message, "error"));
    };

    const toggleExpand = (id) => {
        if (expandedGame === id) setExpandedGame(null); // Close if open
        else setExpandedGame(id); // Open new one
    };

    const handleCopyCode = () => {
        const fallbackCopy = () => {
            const el = document.createElement('textarea');
            el.value = roomId;
            el.setAttribute('readonly', '');
            el.style.position = 'absolute';
            el.style.left = '-9999px';
            document.body.appendChild(el);
            el.select();
            try {
                document.execCommand('copy');
                addToast("Code Copied!", "success");
            } catch (err) {
                addToast("Failed to copy", "error");
            }
            document.body.removeChild(el);
        };
        
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(roomId)
                .then(() => addToast("Code Copied!", "success"))
                .catch(fallbackCopy);
        } else {
            fallbackCopy();
        }
    };

    const handleLeave = () => {
        remove(ref(db, `rooms/${roomId}/players/${user.id}`));
        onBack(); 
    };

    return (
        <div className="paper-card" style={{maxWidth: 500, margin: '0 auto'}}>
            {/* HEADER */}
            <h2 style={{textAlign: 'center', marginBottom: 5, fontSize:'1.8rem', fontWeight:800}}>ARCADE</h2>
            <p style={{textAlign: 'center', color: 'var(--text-sec)', fontSize: '0.9rem', marginBottom: 20}}>
                Choose your battlefield
            </p>
            
            {/* ROOM CODE PILL */}
            <div 
                className="room-code-display" 
                onClick={handleCopyCode} 
                style={{cursor:'pointer', marginBottom: 25}} 
                title="Tap to copy"
            >
                Code: {roomId} <span style={{opacity:0.5, fontSize:'0.8em'}}>❐</span>
            </div>

            {/* PLAYER LIST (Mini) */}
            <div style={{marginBottom: 20, display:'flex', gap: 10, flexWrap:'wrap', justifyContent:'center'}}>
                {players.map((p) => (
                    <div key={p.id} className="player-tag" style={{fontSize:'0.8rem'}}>
                        {p.name} {p.id === finalHostId && '👑'}
                    </div>
                ))}
            </div>

            {/* 🆕 APP STORE STYLE GAME CARDS */}
            <div style={{display: 'flex', flexDirection: 'column', gap: 20}}>
                {games.map(g => {
                    const isOpen = expandedGame === g.id;
                    return (
                        <div 
                            key={g.id}
                            style={{
                                border: isOpen ? '2px solid var(--primary)' : '2px dashed rgba(0,0,0,0.2)',
                                borderRadius: 8,
                                padding: 20,
                                transition: 'all 0.3s',
                                transform: isOpen ? 'scale(1.02)' : 'scale(1)',
                                boxShadow: isOpen ? '4px 4px 0 rgba(0,0,0,0.1)' : 'none',
                                position: 'relative',
                                overflow: 'hidden',
                                background: 'white'
                            }}
                        >
                            {/* Decorative Background Tint */}
                            <div style={{
                                position: 'absolute', top:0, left:0, right:0, bottom:0,
                                background: `linear-gradient(135deg, ${g.color} 0%, transparent 100%)`,
                                opacity: 0.5, pointerEvents: 'none'
                            }} />

                            {/* CARD HEADER */}
                            <div 
                                style={{display: 'flex', alignItems: 'center', gap: 15, cursor:'pointer', position:'relative'}}
                                onClick={() => toggleExpand(g.id)}
                            >
                                <div style={{fontSize: '2.5rem'}}>{g.icon}</div>
                                <div style={{flex: 1}}>
                                    <div style={{fontWeight: 800, fontSize: '1.5rem', fontFamily: "'Kalam', cursive"}}>{g.name}</div>
                                    <div style={{fontSize: '1rem', color: 'var(--text-sec)', fontWeight: 500}}>
                                        {g.tagline}
                                    </div>
                                </div>
                                {/* Dropdown Arrow */}
                                <div style={{
                                    fontSize: '1.2rem', 
                                    opacity: 0.6, 
                                    transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                                    transition: 'transform 0.3s'
                                }}>
                                    ▼
                                </div>
                            </div>

                            {/* 🆕 EXPANDABLE SECTION (Instructions & Button) */}
                            {isOpen && (
                                <div style={{marginTop: 15, paddingTop: 15, borderTop: '2px dashed rgba(0,0,0,0.1)', position:'relative', animation: 'fadeIn 0.3s ease'}}>
                                    
                                    <div style={{fontSize: '1rem', color: 'var(--text-sec)', marginBottom: 20, lineHeight: 1.6}}>
                                        <b style={{color:'var(--primary)', display:'block', marginBottom:5}}>How to play:</b>
                                        <ul style={{paddingLeft: 20, margin: 0}}>
                                            {g.instructions.map((step, i) => (
                                                <li key={i} style={{marginBottom: 4}}>{step}</li>
                                            ))}
                                        </ul>
                                    </div>

                                    {/* START BUTTON (Host Only) */}
                                    {isHost ? (
                                        <button 
                                            className="btn accent" 
                                            style={{width: '100%', padding: '12px', fontSize: '1rem', fontWeight: 700}}
                                            onClick={(e) => {
                                                e.stopPropagation(); // Prevent toggling card when clicking button
                                                selectGame(g.id);
                                            }}
                                        >
                                            START {g.name.toUpperCase()}
                                        </button>
                                    ) : (
                                        <div style={{
                                            textAlign:'center', padding: 10, 
                                            background:'white', borderRadius: 4, border: '2px dashed rgba(0,0,0,0.2)',
                                            fontSize: '1rem', color: 'var(--text-sec)', fontFamily: "'Caveat', cursive"
                                        }}>
                                            Waiting for Host to start...
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* FOOTER */}
            <div style={{ marginTop: 30, display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%', borderTop: '2px dashed rgba(0,0,0,0.2)', paddingTop: 15 }}>
                <span style={{color: 'var(--text-sec)', fontSize:'0.9rem'}}>
                    Room: <b style={{color:'var(--primary)'}}>{roomId}</b>
                </span>
                
                <button 
                    className="btn-xs" 
                    style={{width:'auto', background:'white', border: '2px solid var(--danger)', color:'var(--danger)'}}
                    onClick={handleLeave}
                >
                    Leave Room
                </button>
            </div>

            {/* Simple Fade Animation for Dropdown */}
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(-5px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}