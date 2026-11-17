
    
    function initVisualizer() {
        canvas = document.getElementById('visualizer-canvas');
        ctx = canvas.getContext('2d');
        
        // Adjust for Retina displays
        const dpr = window.devicePixelRatio || 1;
        canvas.width = canvas.parentElement.clientWidth * dpr;
        canvas.height = canvas.parentElement.clientHeight * dpr;
        ctx.scale(dpr, dpr);
        
        window.addEventListener('resize', () => {
            if (!canvas) return;
            const rWidth = canvas.parentElement.clientWidth;
            const rHeight = canvas.parentElement.clientHeight;
            canvas.width = rWidth * dpr;
            canvas.height = rHeight * dpr;
            ctx.scale(dpr, dpr);
        });

        // Run rendering cycle
        requestAnimationFrame(drawVisuals);
    }

function drawVisuals() {
        requestAnimationFrame(drawVisuals);
        
        const w = canvas.width / (window.devicePixelRatio || 1);
        const h = canvas.height / (window.devicePixelRatio || 1);

        // Fade background slightly to create trail effect
        ctx.fillStyle = 'rgba(8, 9, 14, 0.2)';
        ctx.fillRect(0, 0, w, h);

        if (!audioCtx || !masterAnalyser) {
            // Draw dummy static line if not initialized
            ctx.strokeStyle = 'rgba(139, 92, 246, 0.2)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(0, h / 2);
            ctx.lineTo(w, h / 2);
            ctx.stroke();
            return;
        }

        const bufferLength = masterAnalyser.frequencyBinCount;
        
        // Data buffers
        const dataArray = new Uint8Array(bufferLength);
        const timeArray = new Uint8Array(bufferLength);
        
        masterAnalyser.getByteFrequencyData(dataArray);
        masterAnalyser.getByteTimeDomainData(timeArray);

        // 1. Draw FFT Spectrogram Bars at background
        ctx.fillStyle = 'rgba(139, 92, 246, 0.04)';
        const barWidth = (w / bufferLength) * 2.5;
        let barHeight;
        let x = 0;
        
        for (let i = 0; i < bufferLength; i++) {
            barHeight = dataArray[i] * 0.45;
            
            // Neon gradient spectrum fill
            ctx.fillStyle = `rgba(139, 92, 246, ${dataArray[i] / 512})`;
            ctx.fillRect(x, h - barHeight, barWidth - 2, barHeight);
            
            x += barWidth + 1;
        }

        // 2. Draw Oscilloscope Waveform line
        ctx.lineWidth = 3;
        ctx.strokeStyle = state.isPlaying ? '#00f0ff' : 'rgba(0, 240, 255, 0.4)';
        ctx.shadowBlur = state.isPlaying ? 8 : 0;
        ctx.shadowColor = '#00f0ff';
        
        ctx.beginPath();
        const sliceWidth = w / bufferLength;
        let xCoord = 0;
        
        for (let i = 0; i < bufferLength; i++) {
            const v = timeArray[i] / 128.0;
            const yCoord = (v * h) / 2;
            
            if (i === 0) {
                ctx.moveTo(xCoord, yCoord);
            } else {
                ctx.lineTo(xCoord, yCoord);
            }
            xCoord += sliceWidth;
        }
        
        ctx.lineTo(w, h / 2);
        ctx.stroke();
        
        // Reset shadow for next cycles
        ctx.shadowBlur = 0;
    }
