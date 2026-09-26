import React from 'react';

export default function Terms() {
    return (
        <div className="card glass" style={{ maxWidth: 800, margin: '40px auto', padding: 40, textAlign: 'left' }}>
            <h1 style={{ textAlign: 'center', marginBottom: 30 }}>Terms of Service</h1>
            
            <p><strong>Last Updated: {new Date().toLocaleDateString()}</strong></p>

            <h3>1. Acceptance of Terms</h3>
            <p>
                By accessing or using Last Page Arcade ("the App"), you agree to be bound by these Terms of Service. If you do not agree, please do not use the App.
            </p>

            <h3>2. Description of Service</h3>
            <p>
                The App provides a platform for playing casual multiplayer games within Discord via the Embedded App SDK. The service is provided "as is" and we reserve the right to modify or discontinue it at any time.
            </p>

            <h3>3. User Conduct</h3>
            <p>
                You agree not to use the App for any unlawful purpose, or to harass, abuse, or harm other users. We reserve the right to ban users who violate these terms.
            </p>

            <h3>4. Limitation of Liability</h3>
            <p>
                The developers of Last Page Arcade shall not be liable for any indirect, incidental, or consequential damages resulting from your use of the App.
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
