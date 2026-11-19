// Main Entry Point - Clean and Simple
// Uses the new refactored architecture

import { SpaceGameCore } from './core.js?v=26';
import { MobileControls } from './mobile-controls.js';

class SpaceGameMain {
  constructor() {
    this.core = null;
    this.initialized = false;
  }

  async init() {
    if (this.initialized) {
      console.log('Space game already initialized');
      return true;
    }

    try {
      console.log('Initializing Space Game...');
      
      // Create and initialize core
      this.core = new SpaceGameCore();
      const success = await this.core.initialize('starfield');
      
      if (success) {
        const slider = document.getElementById('dilation-slider');
        if (slider) this.core.timeScale = Number(slider.value);

        // Start the game
        this.core.start();
        this.initialized = true;

        // Mobile scheme: "Fly-stick + turret drag + ordnance thumb cluster"
        try {
          this.mobile = new MobileControls(this.core);
          this.mobile.init();
        } catch (e) {
          console.warn('[SpaceGame] mobile controls unavailable:', e);
        }
        
        // Expose for debugging
        window.spaceGameCore = this.core;
        window.spaceGameMain = this;
        document.querySelectorAll('#btn-launch-flight, #btn-launch-academy').forEach(button => { button.disabled = false; });
        
        console.log('Space Game initialized successfully');
        return true;
      }
      
    } catch (error) {
      console.error('Space Game initialization error:', error);
    }
    this.destroy();
    const status = document.getElementById('launch-status');
    if (status) status.textContent = 'The flight deck could not load. Check that WebGL is available and reload the page.';
    document.getElementById('launch-screen')?.classList.remove('is-dismissed');
    return false;
  }

  async restart() {
    if (!this.initialized) return;
    const launched = document.getElementById('launch-screen')?.classList.contains('is-dismissed');
    const muted = this.core.soundSystem.muted;
    this.core.savePilotRecord();
    this.destroy();
    if (await this.init()) {
      if (launched) this.core.onLaunchFlight({ unmute: false });
      this.core.soundSystem.setMuted(muted);
      const soundButton = document.getElementById('btn-sound-toggle');
      if (soundButton) soundButton.textContent = muted ? '🔇' : '🔊';
    }
  }

  destroy() {
    try { this.mobile?.destroy(); } catch { /* ignore */ }
    this.mobile = null;
    if (this.core) {
      this.core.destroy();
      if (window.spaceGameCore === this.core) delete window.spaceGameCore;
      this.core = null;
    }
    document.querySelectorAll('#btn-launch-flight, #btn-launch-academy').forEach(button => { button.disabled = true; });
    this.initialized = false;
  }

  getStatus() {
    return this.core ? this.core.getStatus() : { initialized: false };
  }
}

// Auto-initialize when DOM is ready
const game = new SpaceGameMain();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => game.init());
} else {
  game.init();
}

// Expose for external use
window.SpaceGameMain = SpaceGameMain;
window.game = game;
