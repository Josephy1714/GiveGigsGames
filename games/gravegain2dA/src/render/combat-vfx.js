(function (root) {
    'use strict';

    var renderNs = root.GraveGainRender = root.GraveGainRender || {};

    function CombatVfx(opts) {
        opts = opts || {};
        this.scene = opts.scene || null;
        this.camera = opts.camera || null;
        this.bus = opts.bus || root.EngineBus || null;
        this.cameraRig = opts.cameraRig || null;
        this.getPlayer = typeof opts.getPlayer === 'function' ? opts.getPlayer : function () { return null; };

        this.particles = [];
        this.rings = [];
        this.floatingTexts = [];
        this.hitmarkerTimer = 0;
        this.hitmarkerColor = '#ffffff';
        this.hitmarkerScale = 1.0;
        this.vignetteTimer = 0;
        this.vignetteColor = '220, 38, 38';
        this.vignetteAlpha = 0;

        this._unsubs = [];
        this._canvas = null;
        this._ctx = null;
        this._boxGeo = null;
        this._ringGeo = null;

        if (typeof THREE !== 'undefined' && this.scene) {
            this._boxGeo = new THREE.BoxGeometry(0.14, 0.14, 0.14);
            this._ringGeo = new THREE.RingGeometry(0.25, 0.42, 20);
        }

        this._initOverlay();
        this._bindEvents();
    }

    CombatVfx.prototype._initOverlay = function () {
        if (typeof document === 'undefined') return;
        var existing = document.getElementById('gg-combat-vfx-overlay');
        if (existing && existing.parentNode) existing.parentNode.removeChild(existing);

        var canvas = document.createElement('canvas');
        canvas.id = 'gg-combat-vfx-overlay';
        canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:25;';
        document.body.appendChild(canvas);
        this._canvas = canvas;
        this._ctx = canvas.getContext('2d');
        this._resizeOverlay();

        var self = this;
        this._onResize = function () { self._resizeOverlay(); };
        root.addEventListener('resize', this._onResize);
    };

    CombatVfx.prototype._resizeOverlay = function () {
        if (!this._canvas) return;
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        this._canvas.width = Math.floor(window.innerWidth * dpr);
        this._canvas.height = Math.floor(window.innerHeight * dpr);
        if (this._ctx) {
            this._ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }
    };

    CombatVfx.prototype._bindEvents = function () {
        if (!this.bus || typeof this.bus.on !== 'function') return;
        var self = this;

        this._unsubs.push(this.bus.on('combat:damage', function (hit) {
            self.onDamage(hit);
        }));
        this._unsubs.push(this.bus.on('combat:kill', function (ev) {
            self.onKill(ev);
        }));
        this._unsubs.push(this.bus.on('combat:perfect-block', function (ev) {
            self.onPerfectBlock(ev);
        }));
    };

    CombatVfx.prototype._getDamageColor = function (hit) {
        if (hit.isCrit) return 0xfacc15; // gold
        switch (hit.damageType) {
            case 'fire': return 0xf97316;
            case 'cryo': return 0x38bdf8;
            case 'poison': return 0x84cc16;
            case 'warp': return 0xc084fc;
            case 'melee': return 0xef4444;
            default:
                if (hit.target && hit.target.bloodColor === 'green') return 0x4ade80;
                if (hit.target && hit.target.bloodColor === 'purple') return 0xa855f7;
                return 0xdc2626;
        }
    };

    CombatVfx.prototype.onDamage = function (hit) {
        if (!hit || !hit.target) return;
        var player = this.getPlayer();
        var isPlayerTarget = player && hit.target === player;
        var isPlayerAttacker = player && hit.attacker === player;
        var pos = hit.hitPos3D || { x: hit.target.x || 0, y: (hit.target.y || 0) + 0.8, z: hit.target.z || 0 };
        var dmg = Math.round(hit.finalDamage !== undefined ? hit.finalDamage : (hit.rawDamage || 0));

        // 1. 3D Hit Sparks / Blood Particles
        var color = this._getDamageColor(hit);
        var count = hit.isCrit ? 12 : 7;
        this.spawnBurst(pos.x, (pos.y || 0) + 0.7, pos.z, color, count, hit.isCrit ? 6.5 : 4.5);

        // 2. Floating Damage Number
        var text = String(dmg);
        var textColor = '#f8fafc';
        var scale = 1.0;
        var tag = '';
        if (isPlayerTarget) {
            textColor = '#ef4444';
            text = '-' + dmg;
            scale = 1.15;
        } else if (hit.isCrit) {
            textColor = '#facc15';
            text = dmg + '!';
            scale = 1.35;
            tag = 'CRIT';
        } else if (hit.isHighGround) {
            textColor = '#38bdf8';
            scale = 1.12;
            tag = 'HIGH';
        } else if (hit.coverMitigated) {
            textColor = '#94a3b8';
            scale = 0.88;
            tag = 'COVER';
        }

        this.floatingTexts.push({
            x: pos.x + (Math.random() - 0.5) * 0.4,
            y: (pos.y || 0) + 1.35,
            z: pos.z + (Math.random() - 0.5) * 0.4,
            vy: 1.8 + Math.random() * 0.6,
            text: text,
            tag: tag,
            color: textColor,
            scale: scale,
            life: 0.75,
            maxLife: 0.75
        });

        // 3. Hitmarker & Camera Feedback
        if (isPlayerAttacker && !isPlayerTarget) {
            this.hitmarkerTimer = 0.14;
            this.hitmarkerColor = hit.isCrit ? '#facc15' : '#ffffff';
            this.hitmarkerScale = hit.isCrit ? 1.35 : 1.0;
            if (this.cameraRig && hit.isCrit) {
                this.cameraRig.applyShake(2.0);
                this.cameraRig.triggerHitStop(0.025);
            }
        }

        if (isPlayerTarget && dmg > 0) {
            this.vignetteTimer = 0.28;
            this.vignetteColor = '220, 38, 38';
            this.vignetteAlpha = Math.min(0.55, 0.22 + dmg * 0.008);
            if (this.cameraRig) {
                this.cameraRig.applyShake(Math.min(7.5, 2.2 + dmg * 0.12));
            }
        }
    };

    CombatVfx.prototype.onKill = function (ev) {
        if (!ev || !ev.target) return;
        var t = ev.target;
        var player = this.getPlayer();
        var pos = { x: t.x || 0, y: (t.y || 0) + 0.6, z: t.z || 0 };

        // Larger particle burst + ground shockwave ring
        this.spawnBurst(pos.x, pos.y, pos.z, 0xef4444, 16, 7.0);
        this.spawnRing(pos.x, (t.y || 0) + 0.08, pos.z, 0xf97316, 2.4);

        if (player && ev.attacker === player) {
            this.hitmarkerTimer = 0.2;
            this.hitmarkerColor = '#ef4444';
            this.hitmarkerScale = 1.5;
            if (this.cameraRig) {
                this.cameraRig.applyShake(2.8);
                this.cameraRig.triggerHitStop(0.03);
            }
        }
    };

    CombatVfx.prototype.onPerfectBlock = function (ev) {
        var t = ev && ev.target;
        if (!t) return;
        this.spawnBurst(t.x || 0, (t.y || 0) + 1.0, t.z || 0, 0x38bdf8, 14, 6.0);
        this.spawnRing(t.x || 0, (t.y || 0) + 0.1, t.z || 0, 0x38bdf8, 2.8);
        this.vignetteTimer = 0.22;
        this.vignetteColor = '56, 189, 248';
        this.vignetteAlpha = 0.35;
        this.floatingTexts.push({
            x: t.x || 0,
            y: (t.y || 0) + 1.8,
            z: t.z || 0,
            vy: 1.5,
            text: 'PARRY!',
            tag: '',
            color: '#38bdf8',
            scale: 1.3,
            life: 0.85,
            maxLife: 0.85
        });
    };

    CombatVfx.prototype.spawnBurst = function (x, y, z, colorHex, count, speed) {
        if (!this.scene || !this._boxGeo || typeof THREE === 'undefined') return;
        for (var i = 0; i < count; i++) {
            var mat = new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 1.0 });
            var mesh = new THREE.Mesh(this._boxGeo, mat);
            mesh.position.set(x, y, z);
            var angle = Math.random() * Math.PI * 2;
            var spd = speed * (0.4 + Math.random() * 0.8);
            var vy = speed * (0.45 + Math.random() * 0.75);
            this.scene.add(mesh);
            this.particles.push({
                mesh: mesh,
                vx: Math.cos(angle) * spd,
                vy: vy,
                vz: Math.sin(angle) * spd,
                life: 0.35 + Math.random() * 0.25,
                maxLife: 0.6
            });
        }
    };

    CombatVfx.prototype.spawnRing = function (x, y, z, colorHex, maxScale) {
        if (!this.scene || !this._ringGeo || typeof THREE === 'undefined') return;
        var mat = new THREE.MeshBasicMaterial({
            color: colorHex,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.85
        });
        var mesh = new THREE.Mesh(this._ringGeo, mat);
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.set(x, y, z);
        this.scene.add(mesh);
        this.rings.push({
            mesh: mesh,
            life: 0.32,
            maxLife: 0.32,
            maxScale: maxScale || 2.2
        });
    };

    CombatVfx.prototype.update = function (dt) {
        dt = Math.min(0.05, Math.max(0.001, dt || 0.016));

        // Update 3D particles
        for (var i = this.particles.length - 1; i >= 0; i--) {
            var p = this.particles[i];
            p.life -= dt;
            if (p.life <= 0) {
                if (this.scene) this.scene.remove(p.mesh);
                if (p.mesh.material) p.mesh.material.dispose();
                this.particles.splice(i, 1);
                continue;
            }
            p.vy -= 16.0 * dt;
            p.mesh.position.x += p.vx * dt;
            p.mesh.position.y += p.vy * dt;
            p.mesh.position.z += p.vz * dt;
            p.mesh.rotation.x += 8 * dt;
            p.mesh.rotation.y += 6 * dt;
            var ratio = Math.max(0, p.life / p.maxLife);
            p.mesh.scale.setScalar(0.4 + ratio * 0.8);
            p.mesh.material.opacity = ratio;
        }

        // Update 3D rings
        for (var r = this.rings.length - 1; r >= 0; r--) {
            var rg = this.rings[r];
            rg.life -= dt;
            if (rg.life <= 0) {
                if (this.scene) this.scene.remove(rg.mesh);
                if (rg.mesh.material) rg.mesh.material.dispose();
                this.rings.splice(r, 1);
                continue;
            }
            var prog = 1 - (rg.life / rg.maxLife);
            rg.mesh.scale.setScalar(1 + prog * rg.maxScale);
            rg.mesh.material.opacity = (1 - prog) * 0.85;
        }

        // Update 2D overlay
        if (this.hitmarkerTimer > 0) this.hitmarkerTimer = Math.max(0, this.hitmarkerTimer - dt);
        if (this.vignetteTimer > 0) this.vignetteTimer = Math.max(0, this.vignetteTimer - dt);

        this._renderOverlay(dt);
    };

    CombatVfx.prototype._renderOverlay = function (dt) {
        if (!this._ctx || !this._canvas) return;
        var ctx = this._ctx;
        var w = window.innerWidth;
        var h = window.innerHeight;
        ctx.clearRect(0, 0, w, h);

        // 1. Damage / Parry Vignette
        if (this.vignetteTimer > 0) {
            var alpha = (this.vignetteTimer / 0.28) * this.vignetteAlpha;
            var grad = ctx.createRadialGradient(w * 0.5, h * 0.5, Math.min(w, h) * 0.3, w * 0.5, h * 0.5, Math.max(w, h) * 0.72);
            grad.addColorStop(0, 'rgba(' + this.vignetteColor + ', 0)');
            grad.addColorStop(1, 'rgba(' + this.vignetteColor + ', ' + alpha.toFixed(3) + ')');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, w, h);
        }

        // 2. Hitmarker at screen center
        if (this.hitmarkerTimer > 0) {
            var hmAlpha = Math.min(1, this.hitmarkerTimer / 0.08);
            var cx = w * 0.5;
            var cy = h * 0.5;
            var s = 8 * this.hitmarkerScale;
            var g = 4 * this.hitmarkerScale;
            ctx.save();
            ctx.globalAlpha = hmAlpha;
            ctx.strokeStyle = this.hitmarkerColor;
            ctx.lineWidth = 2.5;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(cx - s, cy - s); ctx.lineTo(cx - g, cy - g);
            ctx.moveTo(cx + s, cy - s); ctx.lineTo(cx + g, cy - g);
            ctx.moveTo(cx - s, cy + s); ctx.lineTo(cx - g, cy + g);
            ctx.moveTo(cx + s, cy + s); ctx.lineTo(cx + g, cy + g);
            ctx.stroke();
            ctx.restore();
        }

        // 3. Floating Damage Numbers
        if (this.camera && typeof THREE !== 'undefined') {
            var vec = new THREE.Vector3();
            for (var i = this.floatingTexts.length - 1; i >= 0; i--) {
                var ft = this.floatingTexts[i];
                ft.life -= dt;
                if (ft.life <= 0) {
                    this.floatingTexts.splice(i, 1);
                    continue;
                }
                ft.y += ft.vy * dt;
                ft.vy *= 0.94;

                vec.set(ft.x, ft.y, ft.z);
                vec.project(this.camera);
                if (vec.z > 1) continue;

                var sx = (vec.x * 0.5 + 0.5) * w;
                var sy = (-vec.y * 0.5 + 0.5) * h;
                var ratio = ft.life / ft.maxLife;
                var pop = ratio > 0.8 ? (1 + (1 - ratio) * 1.5) : 1.0;

                ctx.save();
                ctx.globalAlpha = Math.min(1, ratio * 1.6);
                ctx.font = '900 ' + Math.round(16 * ft.scale * pop) + 'px system-ui, sans-serif';
                ctx.textAlign = 'center';
                ctx.lineWidth = 3.5;
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.85)';
                ctx.strokeText(ft.text, sx, sy);
                ctx.fillStyle = ft.color;
                ctx.fillText(ft.text, sx, sy);

                if (ft.tag) {
                    ctx.font = '800 10px system-ui, sans-serif';
                    ctx.strokeText(ft.tag, sx, sy - 16 * ft.scale);
                    ctx.fillText(ft.tag, sx, sy - 16 * ft.scale);
                }
                ctx.restore();
            }
        }
    };

    CombatVfx.prototype.dispose = function () {
        for (var i = 0; i < this._unsubs.length; i++) {
            if (typeof this._unsubs[i] === 'function') this._unsubs[i]();
        }
        this._unsubs = [];
        if (this._onResize) root.removeEventListener('resize', this._onResize);
        if (this._canvas && this._canvas.parentNode) this._canvas.parentNode.removeChild(this._canvas);
        if (this._boxGeo) this._boxGeo.dispose();
        if (this._ringGeo) this._ringGeo.dispose();
    };

    renderNs.CombatVfx = {
        create: function (opts) {
            return new CombatVfx(opts);
        }
    };

    if (typeof module !== 'undefined' && module.exports) module.exports = renderNs.CombatVfx;
})(typeof globalThis !== 'undefined' ? globalThis : window);
