/* GraveGain2DE: Smash Slash Bash Mash — 5 MoonRock Arena Stages */
(function () {
  'use strict';

  const STAGES = [
    {
      id: 'compact-spire',
      name: 'Compact Spire',
      subtitle: 'MoonRock Tri-Platform Altar',
      theme: { skyTop: '#0d0924', skyBot: '#241447', accent: '#a78bfa', ground: '#334155', trim: '#c084fc', planet: '#7e22ce' },
      bounds: { left: -640, right: 640, top: -500, bottom: 440 },
      spawns: [[-170, -60], [170, -60], [-60, -190], [60, -190]],
      platforms: [
        { x: -290, y: 120, w: 580, h: 36, solid: true, ledges: true },
        { x: -245, y: 12, w: 145, h: 14, solid: false },
        { x: 100,  y: 12, w: 145, h: 14, solid: false },
        { x: -75,  y: -96, w: 150, h: 14, solid: false }
      ]
    },
    {
      id: 'luckystarship-hull',
      name: 'LuckyStarShip Hull',
      subtitle: 'Orbital Flat Deck Duel',
      theme: { skyTop: '#020617', skyBot: '#0f172a', accent: '#38bdf8', ground: '#1e293b', trim: '#38bdf8', planet: '#4338ca' },
      bounds: { left: -660, right: 660, top: -500, bottom: 430 },
      spawns: [[-200, -50], [200, -50], [-80, -50], [80, -50]],
      platforms: [
        { x: -340, y: 126, w: 680, h: 40, solid: true, ledges: true }
      ]
    },
    {
      id: 'whisper-grove',
      name: 'Whisper Grove Canopy',
      subtitle: 'Bioluminescent Mother Tree',
      theme: { skyTop: '#031510', skyBot: '#064e3b', accent: '#34d399', ground: '#134e4a', trim: '#5eead4', planet: '#0f766e' },
      bounds: { left: -650, right: 650, top: -520, bottom: 450 },
      spawns: [[-180, -70], [180, -70], [-230, -190], [230, -190]],
      platforms: [
        { x: -270, y: 125, w: 540, h: 34, solid: true, ledges: true },
        { x: -330, y: 20, w: 140, h: 14, solid: false, moveY: 28, speed: 1.2, phase: 0 },
        { x: 190,  y: 20, w: 140, h: 14, solid: false, moveY: 28, speed: 1.2, phase: Math.PI },
        { x: -85,  y: -85, w: 170, h: 14, solid: false }
      ]
    },
    {
      id: 'deep-forge',
      name: 'Deep Forge Anvil',
      subtitle: 'Sparkite Twin Ledges & Lift',
      theme: { skyTop: '#1c0a04', skyBot: '#451a03', accent: '#fbbf24', ground: '#44403c', trim: '#f59e0b', planet: '#b45309' },
      bounds: { left: -660, right: 660, top: -500, bottom: 450 },
      spawns: [[-210, -60], [210, -60], [0, -160], [0, -60]],
      platforms: [
        { x: -360, y: 122, w: 225, h: 36, solid: true, ledges: true },
        { x: 135,  y: 122, w: 225, h: 36, solid: true, ledges: true },
        { x: -85,  y: 76,  w: 170, h: 18, solid: false, moveX: 90, speed: 1.05, phase: 0 },
        { x: -75,  y: -78, w: 150, h: 14, solid: false }
      ],
      lavaY: 320
    },
    {
      id: 'necromatic-array',
      name: 'Necromatic Array',
      subtitle: 'Hades Ley-Line Spire',
      theme: { skyTop: '#16041b', skyBot: '#3b0764', accent: '#f43f5e', ground: '#27272a', trim: '#e11d48', planet: '#881337' },
      bounds: { left: -650, right: 650, top: -520, bottom: 450 },
      spawns: [[-185, -70], [185, -70], [-95, -180], [95, -180]],
      platforms: [
        { x: -305, y: 130, w: 610, h: 34, solid: true, ledges: true },
        { x: -220, y: 18, w: 130, h: 14, solid: false, moveX: 45, speed: 1.3, phase: 0 },
        { x: 90,   y: 18, w: 130, h: 14, solid: false, moveX: 45, speed: 1.3, phase: Math.PI },
        { x: -75,  y: -95, w: 150, h: 14, solid: false, moveY: 22, speed: 1.5, phase: 0.7 }
      ]
    }
  ];

  const BY_ID = Object.fromEntries(STAGES.map((s) => [s.id, s]));

  function cloneStagePlatforms(stage, time) {
    return stage.platforms.map((p) => {
      const ox = p.moveX ? Math.sin(time * (p.speed || 1) + (p.phase || 0)) * p.moveX : 0;
      const oy = p.moveY ? Math.sin(time * (p.speed || 1) + (p.phase || 0)) * p.moveY : 0;
      return {
        ...p,
        x: p.x + ox,
        y: p.y + oy,
        baseX: p.x,
        baseY: p.y
      };
    });
  }

  window.GG2DE_STAGES = {
    STAGES,
    get: (id) => BY_ID[id] || STAGES[0],
    getPlatformsAt: cloneStagePlatforms
  };
})();
