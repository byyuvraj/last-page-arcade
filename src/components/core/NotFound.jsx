import React from 'react';

export default function NotFound({ onBack }) {
    return (
        <div className="paper-card" style={{textAlign: 'center', padding: '50px 20px', maxWidth: 400, margin: '0 auto'}}>
            
            {/* 1. The "Caught" Emoji */}
            <div style={{fontSize: '5rem', marginBottom: 10, animation: 'shake 0.5s infinite'}}>
                👀
            </div>

            {/* 2. Big 404 Error */}
            <h1 style={{
                fontSize: '4rem', 
                fontWeight: 900, 
                color: '#FF453A', // System Red
                margin: 0,
                textShadow: '0 0 30px rgba(255, 69, 58, 0.4)'
            }}>
                404
            </h1>

            {/* 3. The "Backbench" Flavor Text */}
            <h2 style={{marginTop: 10, fontSize: '1.4rem', fontWeight: 700}}>
                Wrong Room?
            </h2>
            
            <p style={{color: 'var(--text-sec)', marginTop: 15, lineHeight: 1.6}}>
                This page doesn't exist bro. <br/>
                Get out before the teacher catches you.
            </p>

            {/* 4. Go Back Button */}
            <button 
                className="btn primary" 
                onClick={onBack} 
                style={{marginTop: 30}}
            >
                Back to Lobby 🏃‍♂️
            </button>

            {/* Simple Shake Animation */}
            <style>{`
                @keyframes shake {
                    0% { transform: rotate(0deg); }
                    25% { transform: rotate(5deg); }
                    75% { transform: rotate(-5deg); }
                    100% { transform: rotate(0deg); }
                }
            `}</style>
        </div>
    );
}