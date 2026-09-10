import { useState, useEffect, useRef } from 'react';
import { ref, onValue, set } from 'firebase/database';
import { db } from '../../firebase';

export default function ReactionOverlay({ roomId, user }) {
    const [floatingEmojis, setFloatingEmojis] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef(null);

    const EMOJIS = ['😂', '🤬', '🤡','💦', '👀', '👏', ];

    // 1. LISTEN FOR REACTIONS
    useEffect(() => {
        const reactionRef = ref(db, `rooms/${roomId}/reaction`);
        return onValue(reactionRef, (snapshot) => {
            const data = snapshot.val();
            if (!data) return;

            const newId = `${Date.now()}-${Math.random()}`; 
            
            // Calculate random physics ONCE when the emoji arrives
            const randomLeft = Math.random() * 80 + 10; 
            const randomDuration = 2 + Math.random(); // 2s to 3s

            setFloatingEmojis(prev => [...prev, { 
                id: newId, 
                icon: data.icon, 
                sender: data.sender,
                left: randomLeft,        
                duration: randomDuration 
            }]);

            // Remove after animation finishes
            setTimeout(() => {
                setFloatingEmojis(prev => prev.filter(e => e.id !== newId));
            }, randomDuration * 1000);
        });
    }, [roomId]);

    // 2. CLOSE ON CLICK OUTSIDE
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        if (isOpen) document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen]);

    const sendReaction = (icon) => {
        set(ref(db, `rooms/${roomId}/reaction`), {
            icon: icon,
            sender: user.name,
            timestamp: Date.now()
        });
        setIsOpen(false);
    };

    return (
        <>
            {/* A. FLOATING CONTAINER */}
            <div className="reaction-overlay-container">
                {floatingEmojis.map((item) => (
                    <div 
                        key={item.id}
                        className="reaction-float-item"
                        style={{
                            // Apply the calculated random physics via inline style
                            left: `${item.left}%`, 
                            bottom: '15%',
                            animationDuration: `${item.duration}s`
                        }}
                    >
                        <div className="reaction-emoji-content">{item.icon}</div>
                        
                        {item.sender && (
                            <div className="reaction-sender-name">
                                {item.sender}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* B. CONTROL BUTTON */}
            <div className="reaction-wrapper" ref={menuRef}>
                <div className={`reaction-menu ${isOpen ? 'open' : ''}`}>
                    {EMOJIS.map((emoji) => (
                        <button
                            key={emoji}
                            className="reaction-emoji-btn"
                            onClick={() => sendReaction(emoji)}
                        >
                            {emoji}
                        </button>
                    ))}
                </div>

                <button
                    className={`reaction-trigger-btn ${isOpen ? 'active' : ''}`}
                    onClick={() => setIsOpen(!isOpen)}
                    style={{ border: 'none' }}
                >
                    {isOpen ? '❌' : '🗿'}
                </button>
            </div>
        </>
    );
}