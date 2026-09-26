import React from 'react';

export default function Privacy() {
    return (
        <div className="card glass" style={{ maxWidth: 800, margin: '40px auto', padding: 40, textAlign: 'left' }}>
            <h1 style={{ textAlign: 'center', marginBottom: 30 }}>Privacy Policy</h1>
            
            <p><strong>Last Updated: {new Date().toLocaleDateString()}</strong></p>

            <h3>1. Information We Collect</h3>
            <p>
                When you use Last Page Arcade via Discord, we receive your Discord User ID, Username, and Avatar through the Discord Embedded App SDK. We do NOT collect or store your email address, passwords, or any sensitive personal information.
            </p>

            <h3>2. How We Use Information</h3>
            <p>
                Your Discord information is used solely to identify you during multiplayer gameplay (e.g., displaying your username on the scoreboard or avatar in the game room).
            </p>

            <h3>3. Data Storage and Retention</h3>
            <p>
                Active game state is stored temporarily in Firebase Realtime Database. Once a room is closed or all players leave, the room data is automatically deleted. We do not persist long-term user profiles.
            </p>

            <h3>4. Third-Party Services</h3>
            <p>
                The App relies on Discord's API for authentication and Firebase for real-time syncing. We encourage you to review their respective privacy policies.
            </p>

            <div style={{ textAlign: 'center', marginTop: 40 }}>
                <button 
                    className="btn secondary" 
                    onClick={() => window.location.href = '/'}
                >
                    Back to App
                </button>
            </div>
        </div>
    );
}
