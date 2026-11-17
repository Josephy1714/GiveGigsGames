(function (root) {
    'use strict';

    function hashString(str) {
        var h = 2166136261 >>> 0;
        var s = String(str || '');
        for (var i = 0; i < s.length; i++) {
            h ^= s.charCodeAt(i);
            h = Math.imul(h, 16777619) >>> 0;
        }
        return h >>> 0;
    }

    function SeededRNG(seed) {
        this._seed = (seed === undefined || seed === null ? 1337 : Number(seed)) >>> 0;
        if (this._seed === 0) this._seed = 1337;
        this._state = this._seed;
    }

    SeededRNG.prototype.getSeed = function () {
        return this._seed;
    };

    SeededRNG.prototype.setSeed = function (seed) {
        this._seed = (seed === undefined || seed === null ? 1337 : Number(seed)) >>> 0;
        if (this._seed === 0) this._seed = 1337;
        this._state = this._seed;
    };

    SeededRNG.prototype.next = function () {
        var t = (this._state = (this._state + 0x6D2B79F5) >>> 0);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };

    SeededRNG.prototype.range = function (min, max) {
        return min + (max - min) * this.next();
    };

    SeededRNG.prototype.int = function (min, maxInclusive) {
        if (maxInclusive <= min) return min | 0;
        return Math.floor(min + this.next() * (maxInclusive - min + 1));
    };

    SeededRNG.prototype.pick = function (arr) {
        if (!arr || !arr.length) return undefined;
        return arr[Math.floor(this.next() * arr.length)];
    };

    SeededRNG.prototype.chance = function (prob) {
        return this.next() < prob;
    };

    SeededRNG.prototype.fork = function (label) {
        var combined = (this._seed ^ hashString(label) ^ (this._state >>> 1)) >>> 0;
        return new SeededRNG(combined || 1337);
    };

    function EventBus() {
        this._listeners = Object.create(null);
        this.listenerErrors = 0;
        this.errorLog = [];
    }

    EventBus.prototype.on = function (event, fn, opts) {
        if (typeof fn !== 'function') return function () {};
        if (!this._listeners[event]) this._listeners[event] = [];
        var entry = {
            fn: fn,
            once: !!(opts && opts.once),
            priority: opts && typeof opts.priority === 'number' ? opts.priority : 0
        };
        this._listeners[event].push(entry);
        this._listeners[event].sort(function (a, b) { return b.priority - a.priority; });
        var self = this;
        return function unsubscribe() {
            self.off(event, fn);
        };
    };

    EventBus.prototype.once = function (event, fn, priority) {
        return this.on(event, fn, { once: true, priority: priority || 0 });
    };

    EventBus.prototype.off = function (event, fn) {
        var list = this._listeners[event];
        if (!list) return;
        this._listeners[event] = list.filter(function (item) { return item.fn !== fn; });
    };

    EventBus.prototype.emit = function (event, payload) {
        var list = this._listeners[event];
        if (!list || !list.length) return 0;
        var snapshot = list.slice();
        var delivered = 0;
        for (var i = 0; i < snapshot.length; i++) {
            var item = snapshot[i];
            if (item.once) this.off(event, item.fn);
            try {
                item.fn(payload);
                delivered++;
            } catch (err) {
                this.listenerErrors++;
                if (this.errorLog.length >= 50) this.errorLog.shift();
                this.errorLog.push({
                    event: event,
                    message: err && err.message ? err.message : String(err)
                });
            }
        }
        return delivered;
    };

    EventBus.prototype.clear = function (event) {
        if (event) delete this._listeners[event];
        else this._listeners = Object.create(null);
    };

    function SubsystemRegistry(bus) {
        this._bus = bus || new EventBus();
        this._subsystems = [];
        this._byId = Object.create(null);
        this._ctx = null;
    }

    SubsystemRegistry.prototype.registerSubsystem = function (sub) {
        if (!sub || typeof sub.id !== 'string' || !sub.id) {
            throw new Error('Subsystem must provide a non-empty string id');
        }
        if (this._byId[sub.id]) {
            this._subsystems = this._subsystems.filter(function (s) { return s.id !== sub.id; });
        }
        this._byId[sub.id] = sub;
        this._subsystems.push(sub);
        if (this._ctx && typeof sub.init === 'function') {
            try {
                sub.init(this._ctx);
            } catch (err) {
                this._bus.emit('subsystem:error', { id: sub.id, phase: 'init', error: err });
            }
        }
        return sub;
    };

    SubsystemRegistry.prototype.getSubsystem = function (id) {
        return this._byId[id] || null;
    };

    SubsystemRegistry.prototype.listSubsystems = function () {
        return this._subsystems.map(function (s) { return s.id; });
    };

    SubsystemRegistry.prototype.initAll = function (ctx) {
        this._ctx = ctx;
        for (var i = 0; i < this._subsystems.length; i++) {
            var sub = this._subsystems[i];
            if (typeof sub.init === 'function') {
                try {
                    sub.init(ctx);
                } catch (err) {
                    this._bus.emit('subsystem:error', { id: sub.id, phase: 'init', error: err });
                }
            }
        }
    };

    SubsystemRegistry.prototype.resetAll = function (missionConfig) {
        for (var i = 0; i < this._subsystems.length; i++) {
            var sub = this._subsystems[i];
            if (typeof sub.resetRun === 'function') {
                try {
                    sub.resetRun(missionConfig);
                } catch (err) {
                    this._bus.emit('subsystem:error', { id: sub.id, phase: 'resetRun', error: err });
                }
            }
        }
    };

    SubsystemRegistry.prototype.updateAll = function (dt, state) {
        for (var i = 0; i < this._subsystems.length; i++) {
            var sub = this._subsystems[i];
            if (typeof sub.update === 'function') {
                try {
                    sub.update(dt, state);
                } catch (err) {
                    this._bus.emit('subsystem:error', { id: sub.id, phase: 'update', error: err });
                }
            }
        }
    };

    SubsystemRegistry.prototype.pipeBeforeDamage = function (hit) {
        var current = hit;
        for (var i = 0; i < this._subsystems.length; i++) {
            var sub = this._subsystems[i];
            if (typeof sub.onBeforeDamage === 'function') {
                try {
                    var res = sub.onBeforeDamage(current);
                    if (res) current = res;
                    if (current && current.cancelled) break;
                } catch (err) {
                    this._bus.emit('subsystem:error', { id: sub.id, phase: 'onBeforeDamage', error: err });
                }
            }
        }
        return current;
    };

    SubsystemRegistry.prototype.notifyAfterDamage = function (hit) {
        for (var i = 0; i < this._subsystems.length; i++) {
            var sub = this._subsystems[i];
            if (typeof sub.onAfterDamage === 'function') {
                try {
                    sub.onAfterDamage(hit);
                } catch (err) {
                    this._bus.emit('subsystem:error', { id: sub.id, phase: 'onAfterDamage', error: err });
                }
            }
        }
    };

    SubsystemRegistry.prototype.notifyEntityKilled = function (kill) {
        for (var i = 0; i < this._subsystems.length; i++) {
            var sub = this._subsystems[i];
            if (typeof sub.onEntityKilled === 'function') {
                try {
                    sub.onEntityKilled(kill);
                } catch (err) {
                    this._bus.emit('subsystem:error', { id: sub.id, phase: 'onEntityKilled', error: err });
                }
            }
        }
    };

    SubsystemRegistry.prototype.serializeAll = function () {
        var out = {};
        for (var i = 0; i < this._subsystems.length; i++) {
            var sub = this._subsystems[i];
            if (typeof sub.serialize === 'function') {
                try {
                    out[sub.id] = sub.serialize();
                } catch (err) {
                    this._bus.emit('subsystem:error', { id: sub.id, phase: 'serialize', error: err });
                }
            }
        }
        return out;
    };

    SubsystemRegistry.prototype.deserializeAll = function (data) {
        if (!data || typeof data !== 'object') return;
        for (var i = 0; i < this._subsystems.length; i++) {
            var sub = this._subsystems[i];
            if (typeof sub.deserialize === 'function' && data[sub.id] !== undefined) {
                try {
                    sub.deserialize(data[sub.id]);
                } catch (err) {
                    this._bus.emit('subsystem:error', { id: sub.id, phase: 'deserialize', error: err });
                }
            }
        }
    };

    function createTestHarness(engine) {
        return {
            isReady: function () {
                return !!(engine && typeof engine.getState === 'function');
            },
            getDiagnostics: function () {
                return engine.getDiagnostics();
            },
            getTerrainSummary: function () {
                var t = engine.getTerrain();
                return t ? t.getSummary() : null;
            },
            getCell: function (gx, gz) {
                var t = engine.getTerrain();
                return t ? t.getCell(gx, gz) : null;
            },
            getPlayerState: function () {
                var s = engine.getState();
                return s ? s.player : null;
            },
            getEnemies: function () {
                var s = engine.getState();
                return s ? s.enemies : [];
            },
            getProps: function () {
                var t = engine.getTerrain();
                return t ? t.props : [];
            },
            getProjectiles: function () {
                var s = engine.getState();
                return s ? s.projectiles : [];
            },
            step: function (stepsOrDt, fixedDt) {
                var fdt = typeof fixedDt === 'number' && fixedDt > 0 ? fixedDt : 1 / 60;
                if (typeof stepsOrDt === 'number' && stepsOrDt >= 1 && Math.floor(stepsOrDt) === stepsOrDt) {
                    for (var i = 0; i < stepsOrDt; i++) {
                        engine.step(fdt, { force: true });
                    }
                } else {
                    var dt = typeof stepsOrDt === 'number' && stepsOrDt > 0 ? stepsOrDt : fdt;
                    engine.step(dt, { force: true });
                }
                return engine.getState();
            },
            setSeed: function (seed) {
                engine.setSeed(seed);
            },
            startMission: function (config) {
                return engine.startMission(config || {});
            },
            teleportPlayer: function (x, y, z) {
                return engine.teleportPlayer(x, y, z);
            },
            raycast: function (origin, dir, maxDist) {
                var t = engine.getTerrain();
                return t ? t.raycast3D(origin, dir, maxDist) : { hit: false };
            },
            hasLoS: function (aPos, bPos) {
                var t = engine.getTerrain();
                return t ? t.hasLineOfSight(aPos, bPos) : false;
            },
            damageCell: function (gx, gz, dmg, damageType) {
                var t = engine.getTerrain();
                return t ? t.damageCell(gx, gz, dmg, damageType) : null;
            },
            openDoor: function (gx, gz) {
                var t = engine.getTerrain();
                return t ? t.openDoor(gx, gz, true) : false;
            },
            closeDoor: function (gx, gz) {
                var t = engine.getTerrain();
                return t ? t.closeDoor(gx, gz) : false;
            },
            setDoorLocked: function (gx, gz, locked) {
                var t = engine.getTerrain();
                return t ? t.setDoorLocked(gx, gz, locked) : false;
            },
            getHighGroundBonus: function (attackerPos, targetPos) {
                var t = engine.getTerrain();
                return t ? t.getHighGroundBonus(attackerPos, targetPos) : null;
            },
            getCoverBetween: function (defenderPos, attackerPos) {
                var t = engine.getTerrain();
                return t ? t.getCoverBetween(defenderPos, attackerPos) : null;
            },
            applyKnockback: function (targetIdOrPlayer, forceVec3) {
                return engine.applyKnockbackTo(targetIdOrPlayer, forceVec3);
            },
            pushProp: function (propId, dirVec3, impulse) {
                var t = engine.getTerrain();
                return t ? t.pushProp(propId, dirVec3, impulse) : false;
            },
            damageProp: function (propId, dmg) {
                var t = engine.getTerrain();
                return t ? t.damageProp(propId, dmg) : null;
            },
            fireProjectile: function (origin, dir, opts) {
                return engine.fireProjectile(origin, dir, opts);
            },
            setCameraTilt: function (pitch, yaw) {
                return engine.setCameraAngles(pitch, yaw);
            },
            setCameraZoom: function (zoom) {
                return engine.setCameraZoom(zoom);
            },
            getInteriorZoneAt: function (wx, wz) {
                var t = engine.getTerrain();
                return t ? t.getInteriorZoneAt(wx, wz) : null;
            },
            getWeatherInfo: function () {
                var s = engine.getState();
                return s ? s.weather : null;
            },
            getDebrisCount: function () {
                var t = engine.getTerrain();
                return t ? t.debris.length : 0;
            },
            setTemporalMode: function (mode) {
                return engine.setTemporalMode(mode);
            },
            setGameSpeed: function (speed) {
                return engine.setGameSpeed(speed);
            },
            setPaused: function (paused, mode) {
                return engine.setPaused(paused, mode);
            },
            interactNearest: function () {
                return engine.interactNearest();
            },
            shoveKnockback: function (origin, dir, range, force) {
                return engine.shoveKnockback(origin, dir, range, force);
            }
        };
    }

    var GraveGainBus = {
        SeededRNG: SeededRNG,
        EventBus: EventBus,
        SubsystemRegistry: SubsystemRegistry,
        createTestHarness: createTestHarness,
        hashString: hashString
    };

    root.GraveGainBus = GraveGainBus;
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = GraveGainBus;
    }
})(typeof globalThis !== 'undefined' ? globalThis : window);
