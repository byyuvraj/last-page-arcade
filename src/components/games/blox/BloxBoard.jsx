import { DOTS_COUNT, BOX_COUNT } from './gamelogic';

// 🆕 Added 'selectedLine' to props
export default function BloxBoard({ lines, boxes, onLineClick, isMyTurn, selectedLine }) {
    // 7x7 Grid Constants
    const SPACING = 44; 
    const OFFSET = 15;  
    const BOARD_SIZE = (BOX_COUNT * SPACING) + (OFFSET * 2);

    const getLineOwner = (id) => lines[id] || null; 
    const getBoxOwner = (r, c) => boxes[`${r},${c}`] || null;

    return (
        <div className="blox-board glass" style={{ width: BOARD_SIZE, height: BOARD_SIZE }}>
            
            {/* 1. FILLED BOXES */}
            {Array.from({ length: BOX_COUNT }).map((_, r) => (
                Array.from({ length: BOX_COUNT }).map((_, c) => {
                    const owner = getBoxOwner(r, c);
                    if (!owner) return null;
                    return (
                        <div
                            key={`box-${r}-${c}`}
                            className="blox-box-fill"
                            style={{
                                top: OFFSET + (r * SPACING) + 6,
                                left: OFFSET + (c * SPACING) + 6,
                                width: SPACING - 12,
                                height: SPACING - 12,
                                // Dynamic Colors based on owner
                                background: owner === 'p1' ? 'rgba(255, 59, 48, 0.15)' : 'rgba(0, 122, 255, 0.15)',
                                borderColor: owner === 'p1' ? '#FF3B30' : '#007AFF',
                                borderWidth: '2px',
                                borderStyle: 'solid',
                                color: owner === 'p1' ? '#FF3B30' : '#007AFF',
                            }}
                        >
                            {owner === 'p1' ? 'P1' : 'P2'}
                        </div>
                    );
                })
            ))}

            {/* 2. HORIZONTAL LINES */}
            {Array.from({ length: DOTS_COUNT }).map((_, r) => (
                Array.from({ length: BOX_COUNT }).map((_, c) => {
                    const id = `h-${r}-${c}`;
                    const owner = getLineOwner(id);
                    
                    // 🆕 CHECK: Is this line currently selected?
                    const isSelected = (selectedLine === id);

                    return (
                        <div
                            key={id}
                            // 🆕 Added 'selected' class if matched
                            className={`blox-line h ${owner ? 'taken' : ''} ${!owner && isMyTurn ? 'clickable' : ''} ${isSelected ? 'selected' : ''}`}
                            onClick={() => !owner && onLineClick(id)}
                            style={{
                                top: OFFSET + (r * SPACING) - 6,
                                left: OFFSET + (c * SPACING) + (SPACING / 2) - 18, 
                                width: 36, height: 12,
                                color: owner === 'p1' ? '#FF3B30' : owner === 'p2' ? '#007AFF' : 'transparent',
                                
                                // 🆕 Logic: If Owner -> Blue/Red. If Selected -> YELLOW. Else -> Transparent.
                                backgroundColor: owner ? (owner === 'p1' ? '#FF3B30' : '#007AFF') 
                                               : (isSelected ? '#FFD60A' : undefined) 
                            }}
                        />
                    );
                })
            ))}

            {/* 3. VERTICAL LINES */}
            {Array.from({ length: BOX_COUNT }).map((_, r) => (
                Array.from({ length: DOTS_COUNT }).map((_, c) => {
                    const id = `v-${r}-${c}`;
                    const owner = getLineOwner(id);
                    
                    // 🆕 CHECK: Is this line currently selected?
                    const isSelected = (selectedLine === id);

                    return (
                        <div
                            key={id}
                            // 🆕 Added 'selected' class if matched
                            className={`blox-line v ${owner ? 'taken' : ''} ${!owner && isMyTurn ? 'clickable' : ''} ${isSelected ? 'selected' : ''}`}
                            onClick={() => !owner && onLineClick(id)}
                            style={{
                                top: OFFSET + (r * SPACING) + (SPACING / 2) - 18,
                                left: OFFSET + (c * SPACING) - 6,
                                width: 12, height: 36,
                                color: owner === 'p1' ? '#FF3B30' : owner === 'p2' ? '#007AFF' : 'transparent',
                                
                                // 🆕 Logic: If Owner -> Blue/Red. If Selected -> YELLOW. Else -> Transparent.
                                backgroundColor: owner ? (owner === 'p1' ? '#FF3B30' : '#007AFF') 
                                               : (isSelected ? '#FFD60A' : undefined)
                            }}
                        />
                    );
                })
            ))}


            {/* 4. DOTS */}
            {Array.from({ length: DOTS_COUNT }).map((_, r) => (
                Array.from({ length: DOTS_COUNT }).map((_, c) => (
                    <div
                        key={`dot-${r}-${c}`}
                        className="blox-dot"
                        style={{
                            top: OFFSET + (r * SPACING) - 4,
                            left: OFFSET + (c * SPACING) - 4
                        }}
                    />
                ))
            ))}
        </div>
    );
}