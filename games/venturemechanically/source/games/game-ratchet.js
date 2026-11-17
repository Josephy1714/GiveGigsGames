/**
 * game-ratchet.js - Down-Round Ratchet Duel (Chapters 5 & 7)
 * Compares Broad-Based Weighted Average against Full Ratchet.
 * Features pay-to-play simulations and founder dilution alerts.
 */
window.VMGameRatchet = (function() {
    function init() {
        const origValInput = document.getElementById('rd-input-origval');
        const origInvInput = document.getElementById('rd-input-originv');
        const downValInput = document.getElementById('rd-input-downval');
        const downInvInput = document.getElementById('rd-input-downinv');
        const founderSharesInput = document.getElementById('rd-input-foundershares');

        if (!origValInput) return;

        function update() {
            const origVal = parseFloat(origValInput.value) || 20000000;
            const origInv = parseFloat(origInvInput.value) || 5000000;
            const downVal = parseFloat(downValInput.value) || 8000000;
            const downInv = parseFloat(downInvInput.value) || 3000000;
            const founderInitialShares = parseFloat(founderSharesInput.value) || 10000000;

            // Series A parameters
            const origPost = origVal + origInv;
            const origPrice = origVal / founderInitialShares;
            const seriesAShares = origInv / origPrice;
            const preDownTotalShares = founderInitialShares + seriesAShares;

            // Down round price per share based on pre-money down valuation
            const downPrice = downVal / preDownTotalShares;

            // 1. Broad-Based Weighted Average Formula:
            // CP2 = CP1 * (A + B) / (A + C)
            const A = preDownTotalShares;
            const B = downInv / origPrice;
            const C = downInv / downPrice;
            const bbwaPrice = origPrice * ((A + B) / (A + C));
            const bbwaNewSeriesAShares = origInv / bbwaPrice;

            // 2. Full Ratchet: CP2 = downPrice
            const fullRatchetPrice = downPrice;
            const fullRatchetSeriesAShares = origInv / fullRatchetPrice;

            // Post-down round new shares
            const newInvestorShares = downInv / downPrice;

            // Cap table outcomes under BBWA
            const totalBBWAShares = founderInitialShares + bbwaNewSeriesAShares + newInvestorShares;
            const founderBBWAPct = (founderInitialShares / totalBBWAShares) * 100;
            const seriesABBAPct = (bbwaNewSeriesAShares / totalBBWAShares) * 100;

            // Cap table outcomes under Full Ratchet
            const totalFullRatchetShares = founderInitialShares + fullRatchetSeriesAShares + newInvestorShares;
            const founderFullRatchetPct = (founderInitialShares / totalFullRatchetShares) * 100;
            const seriesAFullRatchetPct = (fullRatchetSeriesAShares / totalFullRatchetShares) * 100;

            const founderWipeoutDelta = founderBBWAPct - founderFullRatchetPct;

            // Update DOM displays
            document.getElementById('rd-disp-origval').textContent = '$' + (origVal / 1e6).toFixed(1) + 'M';
            document.getElementById('rd-disp-originv').textContent = '$' + (origInv / 1e6).toFixed(1) + 'M';
            document.getElementById('rd-disp-downval').textContent = '$' + (downVal / 1e6).toFixed(1) + 'M';
            document.getElementById('rd-disp-downinv').textContent = '$' + (downInv / 1e6).toFixed(1) + 'M';
            document.getElementById('rd-disp-origprice').textContent = '$' + origPrice.toFixed(2);
            document.getElementById('rd-disp-downprice').textContent = '$' + downPrice.toFixed(2);

            document.getElementById('rd-disp-bbwa-price').textContent = '$' + bbwaPrice.toFixed(2);
            document.getElementById('rd-disp-bbwa-shares').textContent = Math.round(bbwaNewSeriesAShares).toLocaleString();
            document.getElementById('rd-disp-bbwa-founder-pct').textContent = founderBBWAPct.toFixed(1) + '%';
            document.getElementById('rd-disp-bbwa-investor-pct').textContent = seriesABBAPct.toFixed(1) + '%';

            document.getElementById('rd-disp-fr-price').textContent = '$' + fullRatchetPrice.toFixed(2);
            document.getElementById('rd-disp-fr-shares').textContent = Math.round(fullRatchetSeriesAShares).toLocaleString();
            document.getElementById('rd-disp-fr-founder-pct').textContent = founderFullRatchetPct.toFixed(1) + '%';
            document.getElementById('rd-disp-fr-investor-pct').textContent = seriesAFullRatchetPct.toFixed(1) + '%';

            const wipeoutEl = document.getElementById('rd-disp-wipeout-delta');
            if (wipeoutEl) {
                wipeoutEl.textContent = '-' + founderWipeoutDelta.toFixed(1) + '%';
            }
        }

        [origValInput, origInvInput, downValInput, downInvInput, founderSharesInput].forEach(inp => {
            inp.addEventListener('input', () => {
                update();
                if (window.VMAudio) window.VMAudio.playTone(280, 'sine', 0.05, 0.07);
            });
        });

        update();
    }

    return { init };
})();
