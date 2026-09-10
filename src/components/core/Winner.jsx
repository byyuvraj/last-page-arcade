import { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';

export default function Winner({ rank, onRestart, onExit, isHost, playerCount = 2 }) {
    const [minimized, setMinimized] = useState(false);

    // --- 1. MEME TEXT LOGIC ---
    const getHeaderText = () => {
        // 🆕 DRAW LOGIC
        if (rank === "DRAW") return "DRAW HO GAYA"; 

        if (rank === 1) return "BHAUKAAAL!";
        // 2 Players: Loser gets roasted
        if (playerCount === 2 && rank === 2) return "TUMSE NA HO PAYEGA BETA";
        // 3+ Players: 2nd Place is safe, Losers roasted
        if (playerCount > 2 && rank === 2) return "SHABAASH!";
        return "TUMSE NA HO PAYEGA BETA";
    };

    const getOrdinal = (n) => {
        // Safety check: If rank is "DRAW", don't try to calculate "th/st/nd"
        if (n === "DRAW") return ""; 
        const s = ["th", "st", "nd", "rd"];
        const v = n % 100;
        return n + (s[(v - 20) % 10] || s[v] || s[0]);
    };

    const headerText = getHeaderText();
    
    // 🆕 THEME COLOR UPDATE (White for Draw)
    const themeColor = rank === 1 ? '#FFD60A' : rank === "DRAW" ? '#FFFFFF' : rank === 2 ? '#C0C0C0' : '#FF453A';

    // --- 2. CONFETTI EFFECT ---
    useEffect(() => {
        if(minimized) return;

        const defaults = { zIndex: 3000 }; 
        let animationId = null;
        
        if (rank === 1) {
            const duration = 3000;
            const end = Date.now() + duration;
            const frame = () => {
                confetti({ ...defaults, particleCount: 5, angle: 60, spread: 55, origin: { x: 0 }, colors: ['#FFD60A', '#FF9F0A'] });
                confetti({ ...defaults, particleCount: 5, angle: 120, spread: 55, origin: { x: 1 }, colors: ['#FFD60A', '#FF9F0A'] });
                if (Date.now() < end && !minimized) animationId = requestAnimationFrame(frame);
            };
            animationId = requestAnimationFrame(frame);
        } else if(rank === 2 && playerCount > 2) {
             confetti({ ...defaults, particleCount: 30, spread: 60, origin: { y: 0.7 } });
        }

        return () => {
            if (animationId) cancelAnimationFrame(animationId);
        };
    }, [rank, minimized, playerCount]);

    // --- 3. MINIMIZED STATE ---
    if (minimized) {
        return (
            <div 
                className="winner-minimized" 
                onClick={() => setMinimized(false)}
                style={{ 
                    border: `1px solid ${themeColor}`,
                    boxShadow: `0 10px 30px ${themeColor}40`
                }}
            >
                <span style={{fontSize:'1.4rem'}}>{rank === 1 ? "👑" : rank === 2 ? "🥈" : "☠️"}</span>
                <span style={{color: themeColor, fontWeight: 800, letterSpacing: 0.5}}>
                    {rank === 1 ? "WINNER" : `RANK #${rank}`}
                </span>
                <span style={{color:'white', opacity: 0.5, fontSize: '0.9rem'}}>Tap to maximize</span>
            </div>
        );
    }

    // --- 4. MAXIMIZED OVERLAY ---
    return (
        <div className="winner-overlay">
            <div className="winner-card glass">
                
                {/* ICON */}
                <div className="winner-icon" style={{ textShadow: `0 0 40px ${themeColor}60` }}>
                    {rank === 1 ? "👑" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : "🏳️"}
                </div>
                
                {/* TEXT */}
                <h1 className="winner-title" style={{ color: themeColor }}>
                    {headerText}
                </h1>
                
                <p className="winner-subtitle">
                    You finished <span style={{color:'white', fontWeight:'bold'}}>{getOrdinal(rank)}</span>
                </p>

                {/* ACTION BUTTONS */}
                <div className="winner-actions">
                    
                    {/* 1. Play Again */}
                    {onRestart && (
                        <button 
                            className="btn-main"
                            onClick={onRestart}
                            disabled={!isHost}
                            style={{ 
                                background: isHost ? themeColor : 'rgba(255,255,255,0.1)', 
                                color: isHost ? '#000' : '#888'
                            }}
                        >
                            {isHost ? "Play Again ↺" : "Wait for Host..."}
                        </button>
                    )}

                    {/* 2. Back to Adda */}
                    <button className="btn-secondary-action" onClick={onExit}>
                        Back to Adda 🏠
                    </button>

                    {/* 3. Minimize */}
                    <button className="btn-text" onClick={() => setMinimized(true)}>
                        Board Dekhne De 🧐
                    </button>
                </div>
            </div>
        </div>
    );
}