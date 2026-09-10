import React from 'react';

export default function NotFound({ onBack }) {
    return (
        <div className="card glass" style={{textAlign: 'center', padding: '50px 20px', maxWidth: 400, margin: '0 auto'}}>
            
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
                Galat Class Me Aa Gaya?
            </h2>
            
            <p style={{color: 'rgba(255,255,255,0.6)', marginTop: 15, lineHeight: 1.6}}>
                Ye page syllabus me nahi hai bro. <br/>
                Teacher aane se pehle nikal le.
            </p>

            {/* 4. Go Back Button */}
            <button 
                className="btn primary" 
                onClick={onBack} 
                style={{marginTop: 30}}
            >
                Wapis Lobby Bhaag 🏃‍♂️
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