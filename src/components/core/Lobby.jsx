import { useState } from 'react';
import { ref, set, get, query, orderByChild, endAt, update } from 'firebase/database';
import { db } from '../../firebase';

export default function Lobby({ user, setUser, setRoom, setView, addToast }) {
    const [step, setStep] = useState(user.name ? 2 : 1);
    const [inputName, setInputName] = useState(user.name || "");
    const [inputCode, setInputCode] = useState("");
    
    // 🆕 STATE: Toggle the Description
    const [showAbout, setShowAbout] = useState(false);

    const handleNameSubmit = () => {
        if (!inputName.trim()) {
            addToast("Enter your name please!", "error");
            return;
        }
        setUser({ ...user, name: inputName });
        setStep(2);
    };

    const performCleanup = () => {
        const cutoff = Date.now() - (12 * 60 * 60 * 1000);
        const roomsRef = ref(db, 'rooms');
        const oldRoomsQuery = query(roomsRef, orderByChild('createdAt'), endAt(cutoff));
        
        get(oldRoomsQuery).then((snapshot) => {
            if (snapshot.exists()) {
                const updates = {};
                snapshot.forEach((child) => {
                    updates[child.key] = null;
                });
                update(ref(db, 'rooms'), updates);
            }
        });
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
        if (!inputCode) {
            addToast("Enter the room code", "error");
            return;
        }
        if (!user.id) {
            addToast("Error: User ID missing", "error");
            return;
        }

        const code = inputCode.toUpperCase().trim();
        if (!/^[A-Z]+$/.test(code)) {
            addToast("Room codes contain only letters!", "error");
            return;
        }

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
                setView("selector"); 
            } else {
                addToast("Room not found!", "error");
            }
        }).catch(err => {
            addToast("Connection error.", "error");
        });
    };

    return (
        <div className="card glass" style={{ maxWidth: 450, margin: '0 auto', minHeight: 400, justifyContent: 'center' }}>
            
            {/* STEP 1: NAME ENTRY (The "Unlock" Screen) */}
            {step === 1 && (
                <div className="fade-in" style={{textAlign:'center'}}>
                    <div style={{fontSize: '4rem', marginBottom: 10, animation: 'wave 2s infinite'}}>👋</div>
                    <h1 style={{fontSize:'2.5rem', fontWeight:800, marginBottom:10}}>
                        Ha Bhai Fursatiye Aagaye?
                    </h1>
                    <p style={{marginBottom: 30, opacity:0.7}}>Pehchaan bata apni.</p>

                    <div className="input-group" style={{marginBottom: 25}}>
                        <input
                            placeholder="Tera Naam"
                            value={inputName}
                            onChange={e => setInputName(e.target.value)}
                            style={{
                                fontSize: '1.5rem', 
                                height: 60, 
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.2)',
                                borderRadius: 20
                            }}
                            autoFocus
                            onKeyDown={(e) => e.key === 'Enter' && handleNameSubmit()}
                        />
                    </div>
                    
                    <button 
                        className="btn primary" 
                        onClick={handleNameSubmit}
                        style={{height: 60, fontSize: '1.2rem', borderRadius: 20}}
                    >
                        Continue
                    </button>

                    {/* 🆕 NEW: The "About" Toggle */}
                    <div style={{marginTop: 25}}>
                        <button
                            onClick={() => setShowAbout(!showAbout)}
                            style={{
                                background: 'transparent', 
                                border: 'none',
                                color: 'rgba(255,255,255,0.4)', 
                                fontSize: '0.85rem',
                                cursor: 'pointer',
                                transition: 'color 0.2s',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, margin: '0 auto'
                            }}
                            onMouseEnter={e => e.target.style.color = 'white'}
                            onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.4)'}
                        >
                            {showAbout ? "Close Info" : "Yeh Hai Kya?"} 
                            <span style={{fontSize:'0.8em'}}>{showAbout ? '▲' : '▼'}</span>
                        </button>

                        {showAbout && (
                            <div className="fade-in" style={{
                                marginTop: 15, 
                                padding: 20,
                                background: 'rgba(0,0,0,0.3)', 
                                borderRadius: 20,
                                textAlign: 'left',
                                border: '1px solid rgba(255,255,255,0.1)',
                                boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.2)'
                            }}>
                                <h4 style={{marginBottom: 12, color: '#FFD60A', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: 1}}>The Backstory</h4>
                                
                                <p style={{fontSize: '0.9rem', lineHeight: '1.6', opacity: 0.85, marginBottom: 12}}>
                                    It started with a simple idea: take the games we played on the back pages of our notebooks and bring them online. Sure, I could have used an existing app, but I didn't want to pay for basic features, and honestly, <b>building it myself just felt cooler.</b>
                                </p>

                                <p style={{fontSize: '0.9rem', lineHeight: '1.6', opacity: 0.85, marginBottom: 12}}>
                                    Dedicated to the legends of the Last Page. <i>Wo notebook ke piche wale games.</i> It became the perfect break-time ritual shouting across the room and sending live bug reports.
                                </p>

                                <p style={{fontSize: '0.9rem', lineHeight: '1.6', opacity: 0.85, marginBottom: 15}}>
                                    No install. No history. <b>Bas link kholo, join karo, aur shuru ho jao.</b> Even if the servers go quiet, this arcade stays here as a permanent artifact of the fun we had.
                                </p>

                                <div style={{fontSize: '0.85rem', fontStyle: 'italic', opacity: 0.6, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 10}}>
                                    P.S. It's Vibe Coded.
                                </div>
                            </div>
                        )}
                    </div>

                    <style>{`
                        @keyframes wave { 0% { transform: rotate(0deg); } 50% { transform: rotate(15deg); } 100% { transform: rotate(0deg); } }
                    `}</style>
                </div>
            )}

            {/* STEP 2: DASHBOARD (The "Widget" Screen) */}
            {step === 2 && (
                <div className="fade-in">
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:30}}>
                        <div>
                            <div style={{fontSize:'0.9rem', color:'#8E8E93', fontWeight:600, textTransform:'uppercase', letterSpacing:1}}>WELCOME</div>
                            <div style={{fontSize:'2rem', fontWeight:800}}>{user.name}</div>
                        </div>
                        <div 
                            style={{background:'rgba(255,255,255,0.1)', padding:10, borderRadius:50, cursor:'pointer'}}
                            onClick={() => setStep(1)}
                            title="Change Name"
                        >
                            ✏️
                        </div>
                    </div>
                    
                    <div style={{display:'grid', gap:15}}>
                        {/* CREATE CARD */}
                        <div 
                            onClick={createRoom}
                            style={{
                                background: 'linear-gradient(135deg, rgba(52, 199, 89, 0.2) 0%, rgba(52, 199, 89, 0.05) 100%)',
                                border: '1px solid rgba(52, 199, 89, 0.3)',
                                borderRadius: 24,
                                padding: 25,
                                cursor: 'pointer',
                                transition: 'transform 0.2s',
                                display: 'flex', alignItems: 'center', gap: 20
                            }}
                            className="hover-card"
                        >
                            <div>
                                <div style={{fontSize:'1.4rem', fontWeight:800, marginBottom:4}}>Apna Adda Banao</div>
                                <div style={{fontSize:'0.9rem', opacity:0.7}}>Create a new room</div>
                            </div>
                        </div>

                        {/* JOIN CARD */}
                        <div 
                            onClick={() => setStep(3)}
                            style={{
                                background: 'linear-gradient(135deg, rgba(0, 122, 255, 0.2) 0%, rgba(0, 122, 255, 0.05) 100%)',
                                border: '1px solid rgba(0, 122, 255, 0.3)',
                                borderRadius: 24,
                                padding: 25,
                                cursor: 'pointer',
                                transition: 'transform 0.2s',
                                display: 'flex', alignItems: 'center', gap: 20
                            }}
                            className="hover-card"
                        >
                            <div>
                                <div style={{fontSize:'1.4rem', fontWeight:800, marginBottom:4}}>Dusre ek Adda me Jao</div>
                                <div style={{fontSize:'0.9rem', opacity:0.7}}>Join friend's room</div>
                            </div>
                        </div>
                    </div>

                    <style>{`
                        .hover-card:active { transform: scale(0.96); }
                    `}</style>
                </div>
            )}

            {/* STEP 3: JOIN CODE (The "Keypad" Screen) */}
            {step === 3 && (
                <div className="fade-in" style={{textAlign:'center'}}>
                    <h2 style={{fontSize:'1.8rem', fontWeight:800, marginBottom:10}}>Secret Code?</h2>
                    <p style={{marginBottom: 30}}>Jo tere dost ne diya hai.</p>

                    <div className="input-group" style={{marginBottom: 25}}>
                        <input
                            placeholder="ABCD"
                            value={inputCode}
                            onChange={e => setInputCode(e.target.value.toUpperCase())}
                            maxLength={4}
                            style={{
                                fontSize: '2.5rem', 
                                height: 80, 
                                textAlign: 'center',
                                letterSpacing: 10,
                                fontWeight: 800,
                                textTransform: 'uppercase',
                                background: 'rgba(0,0,0,0.3)',
                                border: '2px solid rgba(255,255,255,0.1)',
                                borderRadius: 24,
                                color: '#FFD60A' // Gold Text
                            }}
                            autoFocus
                        />
                    </div>
                    
                    <button className="btn accent" onClick={joinRoom} style={{height: 60, fontSize: '1.2rem', borderRadius: 20, marginBottom: 15}}>
                        Enter Room
                    </button>
                    
                    <button className="btn text-only" onClick={() => setStep(2)}>
                        Cancel
                    </button>
                </div>
            )}
        </div>
    );
}