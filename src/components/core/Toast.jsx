import { useState, useCallback } from 'react';

// 1. THE LOGIC (The Hook)
// This lets any component say addToast("Hello!")
export const useToast = () => {
    const [toasts, setToasts] = useState([]);

    const addToast = useCallback((message, type = 'info', duration = 3000) => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);

        if (duration > 0) {
            setTimeout(() => {
                setToasts(prev => prev.filter(t => t.id !== id));
            }, duration);
        }

        return id;
    }, []);

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    return { toasts, addToast, removeToast };
};

// 2. THE UI (The Container)
// This actually draws the popups on the screen
export default function ToastContainer({ toasts, removeToast }) {
    return (
        <div style={{
            position: 'fixed',
            bottom: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            maxWidth: '90%',
            width: '100%'
        }}>
            {toasts.map(toast => (
                <div
                    key={toast.id}
                    style={{
                        padding: '12px 16px',
                        borderRadius: 12,
                        fontSize: '0.95rem',
                        fontWeight: 500,
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        animation: 'slideIn 0.3s ease-out',
                        cursor: 'pointer',
                        maxWidth: 400,
                        margin: '0 auto',
                        // COLOR LOGIC:
                        ...(toast.type === 'success' && {
                            background: 'rgba(52, 199, 89, 0.2)',
                            color: '#34C759', // Green
                            borderColor: 'rgba(52, 199, 89, 0.3)'
                        }),
                        ...(toast.type === 'error' && {
                            background: 'rgba(255, 69, 58, 0.2)',
                            color: '#FF453A', // Red
                            borderColor: 'rgba(255, 69, 58, 0.3)'
                        }),
                        ...(toast.type === 'info' && {
                            background: 'rgba(0, 122, 255, 0.2)',
                            color: '#007AFF', // Blue
                            borderColor: 'rgba(0, 122, 255, 0.3)'
                        })
                    }}
                    onClick={() => removeToast(toast.id)}
                >
                    {toast.message}
                </div>
            ))}
            <style>{`
                @keyframes slideIn {
                    from { transform: translateY(100px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
            `}</style>
        </div>
    );
}