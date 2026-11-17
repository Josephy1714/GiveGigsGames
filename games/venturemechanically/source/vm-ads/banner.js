/**
 * banner.js - Venture Mechanics Official Advisory Banner & CTA
 * Direct links to Ron Wiener's book and Venture Mechanics advisory services.
 */
window.VMBanner = (function() {
    function createBannerHTML() {
        return `
        <div class="vm-ad-banner" id="vm-official-ad-banner">
            <div class="vm-ad-content">
                <div class="vm-ad-logo-zone">
                    <span class="vm-ad-badge">OFFICIAL ADVISORY PARTNER</span>
                    <h3 class="vm-ad-brand"><a href="https://www.venturemechanics.com" target="_blank" rel="noopener">VENTURE MECHANICS</a></h3>
                    <p class="vm-ad-tagline">"The best way to get a good deal from a VC is to not need one." — Ron Wiener</p>
                </div>
                <div class="vm-ad-features">
                    <div class="vm-feature-item">
                        <span class="vm-feature-icon">📘</span>
                        <span>Book: <em>Lawyers, Venture Capitalists & Other Useful Predators</em></span>
                    </div>
                    <div class="vm-feature-item">
                        <span class="vm-feature-icon">🛡️</span>
                        <span>Free Flow LLC & Alternative Venture Architectures</span>
                    </div>
                    <div class="vm-feature-item">
                        <span class="vm-feature-icon">💡</span>
                        <span>Cap Table Defense, QSBS Clocks & Governance Engineering</span>
                    </div>
                </div>
                <div class="vm-ad-actions">
                    <a href="https://www.venturemechanics.com" target="_blank" rel="noopener" class="vm-btn-primary">
                        <span>Visit VentureMechanics.com</span>
                        <span class="vm-btn-arrow">→</span>
                    </a>
                    <a href="https://www.venturemechanics.com/blog/sold-for-a-fortune-took-home-nothing-what-founders-learn-too-late-about-startup-exits" target="_blank" rel="noopener" class="vm-btn-secondary">
                        Read Exit Waterfall Case Study
                    </a>
                </div>
            </div>
        </div>
        `;
    }

    function init() {
        const existing = document.getElementById('vm-official-ad-banner');
        if (existing) return;

        const container = document.querySelector('.game-wrapper') || document.body;
        const bannerDiv = document.createElement('div');
        bannerDiv.innerHTML = createBannerHTML();
        if (container.firstChild) {
            container.insertBefore(bannerDiv.firstElementChild, container.firstChild);
        } else {
            container.appendChild(bannerDiv.firstElementChild);
        }
    }

    return {
        init,
        createBannerHTML
    };
})();
