import React, { createContext, useContext, useEffect, useState } from 'react';
import { DiscordSDK } from '@discord/embedded-app-sdk';

const DiscordContext = createContext(null);

export const useDiscord = () => useContext(DiscordContext);

// Ensure you set VITE_DISCORD_CLIENT_ID in your .env file
const clientId = import.meta.env.VITE_DISCORD_CLIENT_ID || '123456789012345678';

export default function DiscordProvider({ children }) {
    const [isDiscordReady, setIsDiscordReady] = useState(false);
    const [discordSdk, setDiscordSdk] = useState(null);
    const [discordUser, setDiscordUser] = useState(null);
    const [error, setError] = useState(null);

    // Discord adds 'frame_id' to the URL when embedding an activity
    const isEmbedded = new URLSearchParams(window.location.search).get('frame_id') != null;

    useEffect(() => {
        // Fallback timeout: If Discord SDK takes longer than 5 seconds, bypass it
        const timeout = setTimeout(() => {
            if (!isDiscordReady) {
                console.warn("Discord SDK timed out. Bypassing...");
                setIsDiscordReady(true);
            }
        }, 5000);

        if (!isEmbedded) {
            setIsDiscordReady(true);
            clearTimeout(timeout);
            return;
        }

        const sdk = new DiscordSDK(clientId);
        
        sdk.ready().then(async () => {
            try {
                // 1. Authorize to get the OAuth code
                const { code } = await sdk.commands.authorize({
                    client_id: clientId,
                    response_type: "code",
                    state: "",
                    prompt: "none",
                    scope: ["identify"]
                });

                // 2. Exchange code for access_token via our local Vite middleware
                const response = await fetch('/api/token', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ code })
                });

                if (!response.ok) {
                    throw new Error(`Token exchange failed: ${await response.text()}`);
                }

                const { access_token } = await response.json();

                // 3. Authenticate and fetch the user's profile
                const auth = await sdk.commands.authenticate({ access_token });
                setDiscordUser(auth.user);
                
                setDiscordSdk(sdk);
                setIsDiscordReady(true);
                clearTimeout(timeout);
            } catch (err) {
                console.error("Failed to complete Discord Auth:", err);
                setError(err);
                setIsDiscordReady(true); 
                clearTimeout(timeout);
            }
        }).catch((err) => {
            console.error("Failed to initialize Discord SDK:", err);
            setError(err);
            setIsDiscordReady(true); 
            clearTimeout(timeout);
        });

        return () => clearTimeout(timeout);
    }, [isEmbedded]);

    if (!isDiscordReady) {
        return (
            <div style={{
                display: 'flex', justifyContent: 'center', alignItems: 'center', 
                height: '100vh', width: '100vw',
                backgroundColor: '#111', color: 'white', 
                fontFamily: 'system-ui, sans-serif'
            }}>
                <h2>Authenticating with Discord...</h2>
            </div>
        );
    }

    return (
        <DiscordContext.Provider value={{ discordSdk, isEmbedded, discordUser, error }}>
            {children}
        </DiscordContext.Provider>
    );
}
