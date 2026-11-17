

    // Render function (responsive tiles)
    function render() {
        const canvasWidth = layout.cssW || canvas.width / (window.devicePixelRatio || 1);
        const canvasHeight = layout.cssH || canvas.height / (window.devicePixelRatio || 1);

        ctx.fillStyle = 'rgba(10, 10, 15, 0.8)';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        const now = performance.now();
        // Draw grid
        for (let row = 0; row < GRID_ROWS; row++) {
            for (let col = 0; col < GRID_COLS; col++) {
                const x = layout.startX + col * (layout.stepX || 60);
                const y = layout.startY + row * (layout.stepY || 60);
                const w = layout.tileW;
                const h = layout.tileH;

                // Tile background
                if (grid[row][col]) {
                    ctx.fillStyle = COLORS[row];
                    ctx.globalAlpha = 0.9;
                } else {
                    ctx.fillStyle = 'rgba(139, 92, 246, 0.2)';
                    ctx.globalAlpha = 0.5;
                }
                if (ctx.roundRect) {
                    ctx.beginPath();
                    ctx.roundRect(x, y, w, h, Math.min(10, w * 0.18));
                    ctx.fill();
                } else {
                    ctx.fillRect(x, y, w, h);
                }
                ctx.globalAlpha = 1;

                // Row flash on play (palette preview / touch feedback)
                const flashing = (rowFlash === row && now < rowFlashUntil);
                // Tile border
                ctx.strokeStyle = grid[row][col] ? COLORS[row] : 'rgba(139, 92, 246, 0.3)';
                if (flashing) ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = (grid[row][col] || flashing) ? 2.5 : 1;
                if (ctx.roundRect) {
                    ctx.beginPath();
                    ctx.roundRect(x, y, w, h, Math.min(10, w * 0.18));
                    ctx.stroke();
                } else {
                    ctx.strokeRect(x, y, w, h);
                }

                // Note label (frequency) — skip on tiny tiles
                if (col % 2 === 0 && w > 44) {
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
                    ctx.font = (w < 56 ? '9px' : '10px') + ' var(--font-body)';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(Math.round(NOTES[col]) + 'Hz', x + w / 2, y + h / 2);
                }
            }
        }

        if (painterCursor.visible) {
            const row = brushRow < 0 ? painterCursor.row : brushRow;
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 3;
            ctx.strokeRect(layout.startX + painterCursor.col * layout.stepX + 2,
                layout.startY + row * layout.stepY + 2, layout.tileW - 4, layout.tileH - 4);
        }
        // Draw instructions
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.font = '13px var(--font-body)';
        ctx.textAlign = 'left';
        const totalHeight = layout.startY + GRID_ROWS * (layout.stepY || 60);
        ctx.fillText('Drag: paint · Arrows / Enter: edit', layout.startX, totalHeight + 24);
    }

    function gameLoop(timestamp) {
        if (!state.isPlaying || state.isPaused) {
            return;
        }

        const dt = timestamp - lastTime;
        lastTime = timestamp;

        render();
        requestAnimationFrame(gameLoop);
    }
