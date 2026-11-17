/**
 * main.js - Master Orchestrator for Venture Mechanics
 * Initializes all sub-game modules, official Venture Mechanics ads, and audio hooks.
 */
document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize core audio
    if (window.VMAudio) {
        // Unlock audio on first user touch/click
        const unlockAudio = () => {
            window.VMAudio.playTone(0, 'sine', 0.001);
            window.removeEventListener('click', unlockAudio);
            window.removeEventListener('touchstart', unlockAudio);
        };
        window.addEventListener('click', unlockAudio);
        window.addEventListener('touchstart', unlockAudio);
    }

    // 2. Initialize Venture Mechanics banners & book CTAs
    if (window.VMBanner && window.VMBanner.init) {
        window.VMBanner.init();
    }
    if (window.VMBookCTA && window.VMBookCTA.init) {
        window.VMBookCTA.init();
    }

    // 3. Initialize Top Navigation
    if (window.VMNavigation && window.VMNavigation.init) {
        window.VMNavigation.init();
    }

    // 4. Initialize Sub-Games
    if (window.VMGameLLC && window.VMGameLLC.init) {
        window.VMGameLLC.init();
    }
    if (window.VMGameRatchet && window.VMGameRatchet.init) {
        window.VMGameRatchet.init();
    }
    if (window.VMGameBoardroom && window.VMGameBoardroom.init) {
        window.VMGameBoardroom.init();
    }
    if (window.VMGameSafes && window.VMGameSafes.init) {
        window.VMGameSafes.init();
    }
    if (window.VMGameVesting && window.VMGameVesting.init) {
        window.VMGameVesting.init();
    }

    console.log('Venture Mechanics Suite initialized with 6 sub-games and VentureMechanics.com integration.');
});
