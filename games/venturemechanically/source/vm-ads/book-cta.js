/**
 * book-cta.js - Floating Advisory Card & Case Study Drawer
 * Highlights Ron Wiener's book chapters and direct consultations at Venture Mechanics.
 */
window.VMBookCTA = (function() {
    function injectDrawerHTML() {
        if (document.getElementById('vm-floating-advisory-widget')) return;

        const widget = document.createElement('div');
        widget.id = 'vm-floating-advisory-widget';
        widget.className = 'vm-floating-widget';
        widget.innerHTML = `
            <button type="button" class="vm-floating-toggle" id="vm-advisory-toggle" aria-label="Toggle Venture Mechanics Advisory Hub">
                <span class="vm-toggle-icon">🛡️</span>
                <span class="vm-toggle-text">Venture Mechanics Hub</span>
                <span class="vm-toggle-badge">Wiener Advisory</span>
            </button>
            <div class="vm-floating-drawer" id="vm-advisory-drawer">
                <div class="vm-drawer-header">
                    <div class="vm-drawer-title-group">
                        <span class="vm-drawer-kicker">RON WIENER'S VENTURE MECHANICS</span>
                        <h4 class="vm-drawer-heading">Founder Defense & Architecture</h4>
                    </div>
                    <button type="button" class="vm-drawer-close" id="vm-drawer-close-btn" aria-label="Close Advisory Drawer">✕</button>
                </div>
                <div class="vm-drawer-body">
                    <p class="vm-drawer-desc">
                        Before signing term sheets, explore alternatives to predatory venture structures. Venture Mechanics helps founders architect <strong>Free Flow LLCs</strong>, negotiate <strong>clean equity stacks</strong>, and protect board control.
                    </p>
                    <div class="vm-drawer-quote" id="vm-drawer-quote-box">
                        <blockquote id="vm-dynamic-quote-text">"The best way to get a good deal from a VC is to not need one."</blockquote>
                        <cite id="vm-dynamic-quote-cite">— Ron Wiener, Venture Mechanics</cite>
                    </div>
                    <div class="vm-drawer-links">
                        <a href="https://www.venturemechanics.com" target="_blank" rel="noopener" class="vm-drawer-link-card">
                            <div class="vm-dlc-icon">🌐</div>
                            <div class="vm-dlc-body">
                                <strong>VentureMechanics.com</strong>
                                <span>Incubator, venture studio & founder advisory.</span>
                            </div>
                            <div class="vm-dlc-arrow">→</div>
                        </a>
                        <a href="https://www.venturemechanics.com/blog/sold-for-a-fortune-took-home-nothing-what-founders-learn-too-late-about-startup-exits" target="_blank" rel="noopener" class="vm-drawer-link-card">
                            <div class="vm-dlc-icon">📑</div>
                            <div class="vm-dlc-body">
                                <strong>The \$30M Exit Nightmare</strong>
                                <span>Detailed breakdown of how liquidation preference wiped out founders.</span>
                            </div>
                            <div class="vm-dlc-arrow">→</div>
                        </a>
                        <a href="https://www.linkedin.com/in/ronwiener/" target="_blank" rel="noopener" class="vm-drawer-link-card">
                            <div class="vm-dlc-icon">💼</div>
                            <div class="vm-dlc-body">
                                <strong>Ron Wiener's Profile</strong>
                                <span>Serial entrepreneur, author, and CEO of Venture Mechanics.</span>
                            </div>
                            <div class="vm-dlc-arrow">→</div>
                        </a>
                    </div>
                </div>
                <div class="vm-drawer-footer">
                    <button type="button" class="vm-refresh-quote-btn" id="vm-refresh-quote-btn">
                        <span>🔄 New Founder Tip</span>
                    </button>
                    <a href="https://www.venturemechanics.com" target="_blank" rel="noopener" class="vm-footer-btn-primary">
                        Visit Venture Mechanics
                    </a>
                </div>
            </div>
        `;
        document.body.appendChild(widget);

        // Bind events
        const toggleBtn = document.getElementById('vm-advisory-toggle');
        const drawer = document.getElementById('vm-advisory-drawer');
        const closeBtn = document.getElementById('vm-drawer-close-btn');
        const quoteBtn = document.getElementById('vm-refresh-quote-btn');
        const quoteText = document.getElementById('vm-dynamic-quote-text');
        const quoteCite = document.getElementById('vm-dynamic-quote-cite');

        toggleBtn.addEventListener('click', () => {
            drawer.classList.toggle('open');
            if (window.VMAudio) window.VMAudio.playTone(520, 'sine', 0.1);
        });

        closeBtn.addEventListener('click', () => {
            drawer.classList.remove('open');
        });

        if (quoteBtn && window.getRandomVMQuote) {
            quoteBtn.addEventListener('click', () => {
                const q = window.getRandomVMQuote();
                quoteText.textContent = `"${q.quote}"`;
                quoteCite.textContent = `— ${q.source} (${q.chapter})`;
                if (window.VMAudio) window.VMAudio.playPreset('click');
            });
        }
    }

    return {
        init: injectDrawerHTML
    };
})();
