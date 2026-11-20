(() => {
    'use strict';

    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    const palettes = {
        prime: '#54daef', echo: '#b88aff', dream: '#ff9cdb',
        void: '#fc716a', bloom: '#85efab', static: '#b7c9e5'
    };
    const stars = Array.from({ length: 72 }, (_, i) => ({
        x: ((i * 83) % 157) / 157,
        y: ((i * 109) % 181) / 181,
        size: i % 11 === 0 ? 2 : 1
    }));

    function clock() {
        return reducedMotion.matches ? 0 : performance.now() / 1000;
    }

    function atmosphere(ctx, width, height, horizon, color, offset = 0) {
        const time = clock();
        ctx.save();
        const sky = ctx.createLinearGradient(0, 0, 0, height);
        sky.addColorStop(0, '#080715');
        sky.addColorStop(0.52, '#211632');
        sky.addColorStop(1, '#080611');
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, width, height);
        const haloX = width * 0.74;
        const haloY = horizon * 0.44;
        const halo = ctx.createRadialGradient(haloX, haloY, 8, haloX, haloY, height * 0.53);
        halo.addColorStop(0, color + '82');
        halo.addColorStop(0.36, color + '28');
        halo.addColorStop(1, color + '00');
        ctx.fillStyle = halo;
        ctx.fillRect(0, 0, width, height);

        ctx.fillStyle = '#eee5ff';
        stars.forEach((star, i) => {
            ctx.globalAlpha = 0.43 + 0.24 * Math.sin(i + time * 1.4);
            ctx.fillRect(star.x * width, star.y * horizon * 0.86, star.size, star.size);
        });

        ctx.globalAlpha = 1;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(haloX, haloY, height * 0.071, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#211632';
        ctx.beginPath();
        ctx.arc(haloX + height * 0.027, haloY - height * 0.02, height * 0.066, 0, Math.PI * 2);
        ctx.fill();

        for (let plane = 0; plane < 3; plane++) {
            const span = 32 + plane * 18;
            const shift = offset * (0.08 + plane * 0.09);
            ctx.fillStyle = ['#262039', '#19162c', '#100e20'][plane];
            ctx.beginPath();
            ctx.moveTo(-span, horizon);
            for (let x = -span; x < width + span * 2; x += span) {
                const index = Math.floor((x + shift) / span);
                const rise = 18 + (1 + Math.sin(index * 2.18 + plane)) * (36 - plane * 6);
                ctx.lineTo(x - shift % span, horizon - rise);
            }
            ctx.lineTo(width + span, height);
            ctx.lineTo(-span, height);
            ctx.fill();
        }

        const floor = ctx.createLinearGradient(0, horizon, 0, height);
        floor.addColorStop(0, '#24182f');
        floor.addColorStop(1, '#080611');
        ctx.fillStyle = floor;
        ctx.fillRect(0, horizon, width, height - horizon);
        ctx.strokeStyle = color + '32';
        ctx.beginPath();
        for (let i = -8; i <= 8; i++) {
            ctx.moveTo(width / 2 + i * width * 0.025, horizon);
            ctx.lineTo(width / 2 + i * width * 0.14, height);
        }
        for (let i = 0; i < 7; i++) {
            const y = horizon + (height - horizon) * (i / 6) ** 2;
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
        }
        ctx.stroke();
        ctx.restore();
    }

    function portal(ctx, x, y, color, radius, time) {
        ctx.save();
        ctx.translate(x, y);
        ctx.strokeStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 18;
        ctx.lineWidth = 2;
        for (let ring = 0; ring < 3; ring++) {
            ctx.globalAlpha = 0.9 - ring * 0.2;
            ctx.beginPath();
            ctx.ellipse(0, 0, radius * (0.58 + ring * 0.13), radius + ring * 5,
                Math.sin(time + ring) * 0.24, time + ring, time + ring + Math.PI * 1.7);
            ctx.stroke();
        }
        ctx.restore();
    }

    function actor(ctx, x, y, color, enemy, size) {
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(size, size);
        ctx.fillStyle = '#080614';
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-31, 0); ctx.lineTo(-20, -36); ctx.lineTo(-9, -48);
        ctx.lineTo(-7, -58); ctx.lineTo(0, -64); ctx.lineTo(9, -58);
        ctx.lineTo(12, -47); ctx.lineTo(23, -37); ctx.lineTo(31, 0);
        ctx.quadraticCurveTo(4, -10, -31, 0);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 10;
        ctx.fillRect(-5, -54, 3, 3);
        ctx.fillRect(3, -54, 3, 3);
        if (!enemy) {
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(15, -20);
            ctx.lineTo(43, -49);
            ctx.stroke();
        }
        ctx.restore();
    }

    const motion = new WeakMap();
    const impacts = new WeakMap();

    function combatFeedback(state, events) {
        if (reducedMotion.matches) return;
        if (events.some(event => event.t === 'swing')) impacts.set(state, clock());
    }

    function multiverse(ctx, state, width, height, combat, par) {
        const horizon = height * 0.73;
        const time = clock();
        const color = palettes[state?.universe] || palettes.prime;
        atmosphere(ctx, width, height, horizon, color, 0);
        const goal = width * 0.87;
        portal(ctx, goal, horizon - 70, color, 65, time);
        if (!state) {
            Object.values(palettes).forEach((tone, i) => portal(
                ctx, width * (0.12 + i * 0.116), horizon - 42, tone, 29, time + i
            ));
            return;
        }

        if (combat) {
            const foes = (state.foes || []).filter(foe => foe?.hp > 0);
            const elapsed = time - (impacts.get(state) ?? -1);
            const swing = Math.max(0, 1 - elapsed / 0.38);
            const heroX = width * 0.13 + Math.sin(swing * Math.PI) * 44;
            actor(ctx, heroX, horizon, '#ffe0a3', false, 1.38);
            if (swing > 0 && !reducedMotion.matches) {
                ctx.save();
                ctx.globalAlpha = swing;
                ctx.strokeStyle = '#ffe0a3';
                ctx.shadowColor = color;
                ctx.shadowBlur = 20;
                ctx.lineWidth = 5 * swing + 1;
                ctx.beginPath();
                ctx.ellipse(heroX + 38, horizon - 48, 70, 43, -0.4, -1.15, 0.9);
                ctx.stroke();
                for (let i = 0; i < 9; i++) {
                    const x = heroX + 54 + elapsed * (90 + i * 11);
                    const y = horizon - 45 + Math.sin(i * 2) * elapsed * 150;
                    ctx.fillStyle = i % 3 === 0 ? color : '#ffe0a3';
                    ctx.fillRect(x, y, 2 + swing * 3, 2);
                }
                ctx.restore();
            }
            foes.forEach((foe, i) => {
                const x = width * (0.34 + i * 0.45 / Math.max(1, foes.length - 1));
                const y = horizon - 8 - Math.sin(time * 2.5 + i) * 5;
                actor(ctx, x, y, color, true, 1.1);
                ctx.fillStyle = '#0b0818';
                ctx.fillRect(x - 29, y - 86, 58, 6);
                ctx.fillStyle = '#ff9b97';
                ctx.fillRect(x - 29, y - 86, 58 * Math.min(1, foe.hp / (foe.maxHp || foe.hp)), 6);
            });
        } else {
            const start = width * 0.11;
            const target = start + (goal - start) * Math.min(1, (state.travel ?? state.strokes) / Math.max(1, par));
            let ball = motion.get(state);
            if (!ball) {
                ball = { from: target, target, started: time, hole: state.hole };
                motion.set(state, ball);
            }
            let amount = reducedMotion.matches ? 1 : Math.min(1, (time - ball.started) / 0.34);
            let x = ball.from + (ball.target - ball.from) * amount;
            if (target !== ball.target || state.hole !== ball.hole) {
                Object.assign(ball, {
                    from: state.hole === ball.hole ? x : start,
                    target, started: time, hole: state.hole
                });
                amount = reducedMotion.matches ? 1 : 0;
                x = reducedMotion.matches ? target : ball.from;
            }
            const y = horizon - 15 - Math.sin(amount * Math.PI) * 65;
            ctx.save();
            ctx.fillStyle = '#fff4d7';
            ctx.shadowColor = color;
            ctx.shadowBlur = 25;
            ctx.beginPath();
            ctx.arc(x, y, 11, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    window.GraveGainWorldArt = { atmosphere, multiverse, combatFeedback };
})();
