// The 8x8 Dot Grid (7x7 Playable Boxes)
export const DOTS_COUNT = 8;
export const BOX_COUNT = 7; 

export const checkForCompletedBoxes = (lineId, takenLines) => {
    // lineId format: "h-0-0" (horizontal, row 0, col 0)
    const parts = lineId.split("-");
    const type = parts[0];
    const row = parseInt(parts[1]);
    const col = parseInt(parts[2]);

    // ⚠️ CRITICAL: Simulate the new line being present
    // takenLines is an Array of strings ["h-0-0", "v-1-2", ...]
    const linesSet = new Set([...takenLines, lineId]);
    const boxes = [];

    // Helper: Check if a box at [r, c] has all 4 walls
    const isBoxClosed = (r, c) => {
        const top = `h-${r}-${c}`;
        const bottom = `h-${r + 1}-${c}`;
        const left = `v-${r}-${c}`;
        const right = `v-${r}-${c + 1}`;

        return (
            linesSet.has(top) &&
            linesSet.has(bottom) &&
            linesSet.has(left) &&
            linesSet.has(right)
        );
    };

    if (type === "h") {
        // Horizontal Line triggers checks for Row Above & Row Below
        if (row > 0) if (isBoxClosed(row - 1, col)) boxes.push(`${row - 1},${col}`);
        if (row < BOX_COUNT) if (isBoxClosed(row, col)) boxes.push(`${row},${col}`);
    } else {
        // Vertical Line triggers checks for Col Left & Col Right
        if (col > 0) if (isBoxClosed(row, col - 1)) boxes.push(`${row},${col - 1}`);
        if (col < BOX_COUNT) if (isBoxClosed(row, col)) boxes.push(`${row},${col}`);
    }

    return boxes;
};