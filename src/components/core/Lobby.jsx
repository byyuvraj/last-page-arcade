import { useState } from 'react';
import { ref, set, get, query, orderByChild, endAt, update, remove } from 'firebase/database';
import { db } from '../../firebase';

export default function Lobby({ user, setUser, setRoom, room, setView, addToast }) {
    const [step, setStep] = useState(user?.name ? 2 : 1);
    const [inputName, setInputName] = useState(user.name || "");
    const [inputCode, setInputCode] = useState("");
    const [isJoining, setIsJoining] = useState(false);

    const handleNameSubmit = () => {
        if (!inputName.trim()) {
            addToast("Enter your name please!", "error");
            return;
        }
        setUser({ ...user, name: inputName });
        setStep(2);
    };

    const createRoom = () => {
        if (!user.id) {
            addToast("Error: User ID missing", "error");
            return;
        }
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        let newRoomId = "";
        for (let i = 0; i < 4; i++) newRoomId += chars.charAt(Math.floor(Math.random() * chars.length));

        setRoom({ id: newRoomId, data: null });
        set(ref(db, `rooms/${newRoomId}`), {
            activeGame: null,
            status: "WAITING",
            hostId: user.id,
            createdAt: Date.now(),
            players: { [user.id]: { name: user.name, ready: false } }
        });
    };

    const joinRoom = () => {
        if (!inputCode || inputCode.length !== 4) return;
        if (!user.id) return;

        const code = inputCode.toUpperCase().trim();
        const roomRef = ref(db, `rooms/${code}`);

        get(roomRef).then((snapshot) => {
            if (snapshot.exists()) {
                setRoom({ id: code, data: null });
                set(ref(db, `rooms/${code}/players/${user.id}`), {
                    name: user.name,
                    ready: false
                }).then(() => {
                    addToast(`Joined room ${code}!`, "success");
                }).catch(err => {
                    addToast("Failed to join room.", "error");
                });
            } else {
                addToast("Room not found!", "error");
            }
        });
    };

    const startGame = (gameId) => {
        if (!room?.id) return;
        if (room?.data?.hostId !== user.id) {
            addToast("Only the host can start the game!", "error");
            return;
        }
        update(ref(db, `rooms/${room.id}`), { activeGame: gameId });
    };

    const leaveRoom = () => {
        if (room?.id && user?.id) {
            remove(ref(db, `rooms/${room.id}/players/${user.id}`));
        }
        setRoom({ id: "", data: null });
    };

    if (step === 1) {
        return (
            <div className="paper-card" style={{
                maxWidth: 450, margin: '0 auto', minHeight: 400, justifyContent: 'center',
                padding: '40px',
                backgroundImage: "url('/assets/1 rough.png')",
                backgroundSize: '100% 100%',
                backgroundRepeat: 'no-repeat',
                border: 'none', backgroundColor: 'transparent', boxShadow: 'none'
            }}>
                <div style={{textAlign:'center', marginBottom: 30}}>
                    <img src="/assets/logo.png" alt="Last Page Arcade" style={{height: 120, objectFit: 'contain', marginBottom: 15}} />
                    <h2>Welcome to the Arcade</h2>
                    <p>What should we call you?</p>
                </div>
                <div className="input-group">
                    <input
                        placeholder="Your Name"
                        value={inputName}
                        onChange={e => setInputName(e.target.value)}
                        autoFocus
                        onKeyDown={(e) => e.key === 'Enter' && handleNameSubmit()}
                    />
                </div>
                <button className="btn primary" onClick={handleNameSubmit}>
                    Continue
                </button>
            </div>
        );
    }

    if (!room?.id) {
        return (
            <div className="dashboard-layout" style={{display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh'}}>
                <div className="paper-card" style={{
                    width: 400,
                    padding: '40px',
                    backgroundImage: "url('/assets/4 rough.png')",
                    backgroundSize: '100% 100%',
                    backgroundRepeat: 'no-repeat',
                    border: 'none', backgroundColor: 'transparent', boxShadow: 'none',
                    animation: 'fadeIn 0.3s'
                }}>
                    <div style={{textAlign:'center', marginBottom: 20}}>
                        <h2 style={{fontSize:'2.2rem'}}>⚡ Quick Play</h2>
                        <p style={{fontSize:'1.1rem'}}>Create a room or join a friend to enter the Arcade!</p>
                    </div>
                    
                    {!isJoining ? (
                        <div style={{display:'flex', flexDirection:'column', gap:15}}>
                            <button className="btn primary" onClick={createRoom}>+ Create Room</button>
                            <button className="btn secondary" onClick={() => setIsJoining(true)}># Join with Code</button>
                        </div>
                    ) : (
                        <div style={{animation: 'fadeIn 0.2s', display:'flex', flexDirection:'column', gap:15}}>
                            <input
                                placeholder="ABCD"
                                value={inputCode}
                                onChange={e => setInputCode(e.target.value.toUpperCase().slice(0,4))}
                                maxLength={4}
                                style={{fontSize: '2.5rem', height: 70, letterSpacing: 12, textAlign:'center', background: 'white'}}
                                autoFocus
                                onKeyDown={(e) => e.key === 'Enter' && joinRoom()}
                            />
                            <button className="btn primary" onClick={joinRoom} disabled={inputCode.length !== 4}>Join Room</button>
                            <button className="btn secondary" onClick={() => setIsJoining(false)}>Back</button>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="dashboard-layout">
            <style>{`
                .dashboard-layout {
                    display: grid;
                    grid-template-columns: 220px 1fr 280px;
                    gap: 20px;
                    width: 100%;
                    max-width: 1200px;
                    margin: 0 auto;
                }
                .nav-sidebar {
                    display: flex;
                    flex-direction: column;
                    gap: 15px;
                }
                .nav-item {
                    font-family: 'Kalam', cursive;
                    font-size: 1.4rem;
                    color: var(--primary);
                    text-decoration: none;
                    padding: 6px 15px;
                    border-radius: 4px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    transition: all 0.2s;
                }
                .nav-item:hover { background: rgba(0,0,0,0.05); }
                .nav-item.active { background: rgba(211, 47, 47, 0.1); color: var(--accent); }
                
                .header-banner {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;
                }
                .games-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
                    gap: 20px;
                    margin-bottom: 20px;
                }
                .game-card {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    text-align: center;
                    padding: 20px;
                    gap: 10px;
                }
                .game-icon {
                    width: 100px;
                    height: 100px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: var(--primary);
                }
                
                @media (max-width: 900px) {
                    .dashboard-layout { grid-template-columns: 1fr; }
                    .left-sidebar-container { display: none; }
                }
            `}</style>

            {/* Left Sidebar */}
            <div className="left-sidebar-container">
                <div style={{textAlign: 'center', marginBottom: 10}}>
                    <img src="/assets/logo.png" alt="Last Page Arcade" style={{width: '100%', maxWidth: 160, objectFit: 'contain'}} />
                </div>
                <div className="nav-sidebar" style={{
                    backgroundImage: "url('/assets/2 rough.png')",
                    backgroundSize: '100% 100%',
                    backgroundRepeat: 'no-repeat',
                    padding: '20px 10px',
                    minHeight: '400px'
                }}>
                    <div className="nav-item active">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{filter: 'drop-shadow(1px 1px 0 rgba(0,0,0,0.1))', transform: 'rotate(-2deg)'}}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                        Home
                    </div>

                    <div className="nav-item">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{filter: 'drop-shadow(1px 1px 0 rgba(0,0,0,0.1))', transform: 'rotate(2deg)'}}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                        Friends
                    </div>
                    <div className="nav-item">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{filter: 'drop-shadow(1px 1px 0 rgba(0,0,0,0.1))', transform: 'rotate(-2deg)'}}><line x1="9" y1="18" x2="15" y2="18"/><line x1="10" y1="22" x2="14" y2="22"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1.55.57 2.76 1.5 3.5.76.76 1.23 1.52 1.41 2.5"/></svg>
                        Suggestions
                    </div>
                    <div className="nav-item">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{filter: 'drop-shadow(1px 1px 0 rgba(0,0,0,0.1))', transform: 'rotate(1deg)'}}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                        Settings
                    </div>
                    <div className="nav-item" style={{color: 'var(--accent)', marginTop: 'auto'}} onClick={leaveRoom}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{filter: 'drop-shadow(1px 1px 0 rgba(0,0,0,0.1))', transform: 'rotate(-1deg)'}}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                        Leave Room
                    </div>
                </div>
            </div>

            {/* Center Content */}
            <div className="main-dashboard">
                <div className="paper-card header-banner" style={{
                    padding: '25px 35px',
                    backgroundImage: "url('/assets/1 rough.png')",
                    backgroundSize: '100% 100%',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center',
                    border: 'none',
                    backgroundColor: 'transparent',
                    boxShadow: 'none'
                }}>
                    <div>
                        <h2 style={{margin: 0, fontSize: '2rem'}}>Hey there, <span style={{color: 'var(--accent)'}}>{user?.name}!</span></h2>
                        <p style={{margin: 0, fontSize: '1.1rem'}}>Pick a game, challenge your friends, and relive the last page.</p>
                    </div>
                </div>

                <h2 style={{marginBottom: 10, borderBottom: '2px solid var(--accent)', display: 'inline-block', paddingBottom: 5}}>Games</h2>
                
                <div className="games-grid">
                    <div className="paper-card game-card" style={{
                        backgroundImage: "url('/assets/5 rough.png')",
                        backgroundSize: '100% 100%',
                        backgroundRepeat: 'no-repeat',
                        border: 'none', backgroundColor: 'transparent', boxShadow: 'none'
                    }}>
                        <div className="game-icon">
                            <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{filter: 'drop-shadow(1px 2px 0 rgba(0,0,0,0.1))', transform: 'rotate(-2deg)'}}><line x1="8" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="16" y2="21"/><line x1="3" y1="8" x2="21" y2="8"/><line x1="3" y1="16" x2="21" y2="16"/></svg>
                        </div>
                        <h3 style={{margin:0}}>Tic Tac Toe</h3>
                        <p style={{fontSize:'0.9rem', margin:0}}>Classic. Always hits.</p>
                        <button className="btn accent" style={{marginTop:'auto', padding: '2px 12px', fontSize: '0.9rem', height: '36px'}} onClick={() => startGame('TTT')} disabled={room.data?.hostId !== user.id}>Play</button>
                    </div>
                    <div className="paper-card game-card" style={{
                        backgroundImage: "url('/assets/5 rough.png')",
                        backgroundSize: '100% 100%',
                        backgroundRepeat: 'no-repeat',
                        border: 'none', backgroundColor: 'transparent', boxShadow: 'none'
                    }}>
                        <div className="game-icon">
                            <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{filter: 'drop-shadow(1px 2px 0 rgba(0,0,0,0.1))', transform: 'rotate(2deg)'}}><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/><path d="M9 3v18"/><path d="M15 3v18"/></svg>
                        </div>
                        <h3 style={{margin:0}}>Bingo</h3>
                        <p style={{fontSize:'0.9rem', margin:0}}>Mark. Play. Win.</p>
                        <button className="btn primary" style={{marginTop:'auto', padding: '2px 12px', fontSize: '0.9rem', height: '36px'}} onClick={() => startGame('BINGO')} disabled={room.data?.hostId !== user.id}>Play</button>
                    </div>
                    <div className="paper-card game-card" style={{
                        backgroundImage: "url('/assets/5 rough.png')",
                        backgroundSize: '100% 100%',
                        backgroundRepeat: 'no-repeat',
                        border: 'none', backgroundColor: 'transparent', boxShadow: 'none'
                    }}>
                        <div className="game-icon">
                            <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{filter: 'drop-shadow(1px 2px 0 rgba(0,0,0,0.1))', transform: 'rotate(-1deg)'}}><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/></svg>
                        </div>
                        <h3 style={{margin:0}}>Blox</h3>
                        <p style={{fontSize:'0.9rem', margin:0}}>Merge. Grow. Survive.</p>
                        <button className="btn primary" style={{marginTop:'auto', padding: '2px 12px', fontSize: '0.9rem', height: '36px'}} onClick={() => startGame('BLOX')} disabled={room.data?.hostId !== user.id}>Play</button>
                    </div>
                </div>

                <div className="paper-card" style={{
                    padding: '20px',
                    backgroundImage: "url('/assets/6 rough.png')",
                    backgroundSize: '100% 100%',
                    backgroundRepeat: 'no-repeat',
                    border: 'none', backgroundColor: 'transparent', boxShadow: 'none'
                }}>
                    <h2 style={{marginBottom: 15, borderBottom: '2px solid var(--primary)', display: 'inline-block', paddingBottom: 5}}>Your Stats</h2>
                    <div style={{display: 'flex', justifyContent: 'space-around', textAlign: 'center'}}>
                        <div>
                            <h3 style={{fontSize: '2rem', margin: 0}}>12</h3>
                            <p style={{margin: 0}}>Games Played</p>
                        </div>
                        <div>
                            <h3 style={{fontSize: '2rem', margin: 0}}>7</h3>
                            <p style={{margin: 0}}>Wins</p>
                        </div>
                        <div>
                            <h3 style={{fontSize: '2rem', margin: 0}}>3</h3>
                            <p style={{margin: 0}}>Win Streak</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Sidebar */}
            <div className="right-sidebar" style={{display: 'flex', flexDirection: 'column', gap: 20}}>
                
                {/* Profile Card */}
                <div className="paper-card" style={{
                    display: 'flex', alignItems: 'center', gap: 15, padding: '20px',
                    backgroundImage: "url('/assets/3 rough.png')",
                    backgroundSize: '100% 100%',
                    backgroundRepeat: 'no-repeat',
                    border: 'none', backgroundColor: 'transparent', boxShadow: 'none',
                    minHeight: '100px'
                }}>
                    <div style={{width: 50, height: 50, borderRadius: '50%', border: '2px solid var(--primary)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.5rem', background:'white'}}>
                        {user?.name?.charAt(0)?.toUpperCase()}
                    </div>
                    <div>
                        <h3 style={{margin: 0, fontSize: '1.2rem'}}>{user?.name}</h3>
                        <div style={{display:'flex', alignItems:'center', gap:5, fontSize:'0.9rem', color:'var(--text-sec)'}}>
                            <div style={{width:8, height:8, borderRadius:'50%', background:'var(--accent)'}}></div> Online
                        </div>
                    </div>
                </div>

                {/* Room Players */}
                <div className="paper-card" style={{
                    padding: '30px',
                    backgroundImage: "url('/assets/4 rough.png')",
                    backgroundSize: '100% 100%',
                    backgroundRepeat: 'no-repeat',
                    border: 'none', backgroundColor: 'transparent', boxShadow: 'none'
                }}>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15}}>
                        <h2 style={{margin: 0, display: 'flex', alignItems: 'center', gap: 10}}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{filter: 'drop-shadow(1px 1px 0 rgba(0,0,0,0.1))', transform: 'rotate(-2deg)'}}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                            Room
                        </h2>
                        <span style={{background: 'var(--gold)', color: 'var(--primary)', padding: '2px 8px', borderRadius: 4, fontWeight: 'bold', letterSpacing: 2}}>
                            {room.id}
                        </span>
                    </div>
                    
                    <div style={{display: 'flex', flexDirection: 'column', gap: 10}}>
                        {room.data?.players && Object.entries(room.data.players).map(([playerId, p]) => (
                            <div key={playerId} style={{display:'flex', alignItems:'center', gap:10, padding: '5px 0', borderBottom: '1px dashed rgba(0,0,0,0.1)'}}>
                                <div style={{display:'flex', alignItems:'center', justifyContent:'center', width: 24, height: 24, color: playerId === room.data.hostId ? 'var(--gold)' : 'inherit'}}>
                                    {playerId === room.data.hostId ? (
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{filter: 'drop-shadow(1px 1px 0 rgba(0,0,0,0.1))', transform: 'rotate(-5deg)'}}><polygon points="2 20 22 20 18 10 15 16 12 7 9 16 6 10 2 20"/><path d="M22 20v2H2v-2"/></svg>
                                    ) : (
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{filter: 'drop-shadow(1px 1px 0 rgba(0,0,0,0.1))', transform: 'rotate(2deg)'}}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                                    )}
                                </div>
                                <span style={{fontWeight:'bold', fontSize:'1.1rem'}}>{p?.name || 'Unknown'}</span>
                                {playerId === user.id && <span style={{fontSize: '0.8rem', color: 'var(--text-sec)', marginLeft: 'auto'}}>(You)</span>}
                            </div>
                        ))}
                    </div>
                    
                    {room.data?.hostId !== user.id && (
                        <p style={{textAlign: 'center', color: 'var(--text-sec)', fontStyle: 'italic', marginTop: 20}}>
                            Waiting for host to select a game...
                        </p>
                    )}
                </div>

                {/* Leaderboard */}
                <div className="paper-card" style={{
                    padding: '30px 20px',
                    backgroundImage: "url('/assets/7 rough.png')",
                    backgroundSize: '100% 100%',
                    backgroundRepeat: 'no-repeat',
                    border: 'none', backgroundColor: 'transparent', boxShadow: 'none'
                }}>
                    <h2 style={{marginBottom: 15, display: 'flex', alignItems: 'center', gap: 10}}>
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{filter: 'drop-shadow(1px 1px 0 rgba(0,0,0,0.1))', transform: 'rotate(-3deg)'}}><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/></svg>
                        Leaderboard
                    </h2>
                    <div style={{display: 'flex', flexDirection: 'column', gap: 10}}>
                        {['BackbenchKing', 'NotebookNinja', 'DoodleGuru', 'LastPageLegend', 'ClassroomProdigy'].map((name, i) => (
                            <div key={name} style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'5px', background: i===1 ? 'rgba(211,47,47,0.1)' : 'transparent', borderRadius: 4}}>
                                <span style={{display:'flex', gap:10}}>
                                    <span style={{width:20, fontWeight:'bold', color: i===0?'var(--gold)':'inherit'}}>{i+1}</span> 
                                    {name}
                                </span>
                                <span style={{fontWeight:'bold'}}>{42 - (i*6)}</span>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
}