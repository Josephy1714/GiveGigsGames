/**
 * constants.js - Constants & Configuration
 * Venture Mechanics: 6 Founder Survival Simulators
 * Official Advisory: https://www.venturemechanics.com
 */
window.VM_CONSTANTS = {
    SITE_URL: "https://www.venturemechanics.com",
    BLOG_URL: "https://www.venturemechanics.com/blog/sold-for-a-fortune-took-home-nothing-what-founders-learn-too-late-about-startup-exits",
    BOOK_TITLE: "Lawyers, Venture Capitalists and Other Useful Predators",
    AUTHOR: "Ron Wiener",
    DISCLAIMER: "Educational simulation based on Ron Wiener's venture mechanics teachings. Not individualized tax or legal counsel.",
    
    // Tax defaults
    DEFAULT_CORP_TAX: 0.21,
    DEFAULT_CAP_GAINS: 0.20,
    DEFAULT_ORDINARY_TAX: 0.37,
    DELAWARE_FRANCHISE_BASE: 400,
    DELAWARE_ASSUMED_PAR_DIVISOR: 10000,
    QSBS_EXCLUSION_CAP: 10000000, // $10M or 10x basis Section 1202

    SOUND_PRESETS: {
        click: [360, 480],
        success: [440, 554, 659, 880],
        danger: [280, 220, 160],
        cash: [523, 659, 783, 1046],
        ding: [880, 1320],
        gavel: [160, 90]
    }
};
