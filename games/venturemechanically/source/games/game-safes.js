/**
 * game-safes.js - SAFE Stacker & The 3-Year QSBS Clock (Chapters 12 & 13)
 * Demonstrates valuation cap dilution stacks, discount triggers, and
 * the Section 1202 holding period tax shielding benefits of SAFEs vs Notes.
 */
window.VMGameSafes = (function() {
    function init() {
        const safe1Amount = document.getElementById('safe1-amount');
        const safe1Cap = document.getElementById('safe1-cap');
        const safe2Amount = document.getElementById('safe2-amount');
        const safe2Cap = document.getElementById('safe2-cap');
        const seriesAPre = document.getElementById('safe-input-pricedval');
        const seriesARaised = document.getElementById('safe-input-seriesaraise');
        const instrumentSelect = document.getElementById('safe-instrument-type');

        if (!safe1Amount) return;

        function update() {
            const s1Amt = parseFloat(safe1Amount.value) || 500000;
            const s1Cap = parseFloat(safe1Cap.value) || 5000000;
            const s2Amt = parseFloat(safe2Amount.value) || 1000000;
            const s2Cap = parseFloat(safe2Cap.value) || 10000000;
            const preMoney = parseFloat(seriesAPre.value) || 20000000;
            const newRaise = parseFloat(seriesARaised.value) || 5000000;
            const instrument = instrumentSelect ? instrumentSelect.value : 'safe'; // 'safe' vs 'note'

            // Base shares before SAFEs (founder common = 10M shares)
            const founderShares = 10000000;
            const seriesASharePrice = preMoney / founderShares;

            // Safe 1 effective price
            const s1Price = Math.min(seriesASharePrice, s1Cap / founderShares);
            const s1Shares = s1Amt / s1Price;

            // Safe 2 effective price
            const s2Price = Math.min(seriesASharePrice, s2Cap / founderShares);
            const s2Shares = s2Amt / s2Price;

            // Series A new investor shares
            const seriesAShares = newRaise / seriesASharePrice;

            const totalPostShares = founderShares + s1Shares + s2Shares + seriesAShares;

            const founderDilutedPct = (founderShares / totalPostShares) * 100;
            const safe1Pct = (s1Shares / totalPostShares) * 100;
            const safe2Pct = (s2Shares / totalPostShares) * 100;
            const seriesAPct = (seriesAShares / totalPostShares) * 100;

            // QSBS Section 1202 Clock Math (100% federal capital gains exclusion on up to $10M)
            let qsbsDaysAccrued = 0;
            let qsbsEligible = false;
            let taxSavingsPotential = 0;

            if (instrument === 'safe' || instrument === 'vmsafe') {
                // SAFE qualifies as equity from Day 1 of investment
                qsbsDaysAccrued = 1095; // 3 years holding period satisfied
                qsbsEligible = true;
                taxSavingsPotential = Math.min(10000000, newRaise * 2) * 0.20; // 20% federal capital gains saved
            } else {
                // Convertible debt is debt until converted; clock started 0 days ago at Series A
                qsbsDaysAccrued = 0;
                qsbsEligible = false;
                taxSavingsPotential = 0;
            }

            // Update DOM displays
            document.getElementById('safe-disp-s1-amt').textContent = '$' + (s1Amt / 1e3).toFixed(0) + 'K';
            document.getElementById('safe-disp-s1-cap').textContent = '$' + (s1Cap / 1e6).toFixed(1) + 'M';
            document.getElementById('safe-disp-s2-amt').textContent = '$' + (s2Amt / 1e6).toFixed(1) + 'M';
            document.getElementById('safe-disp-s2-cap').textContent = '$' + (s2Cap / 1e6).toFixed(1) + 'M';
            document.getElementById('safe-disp-pricedval').textContent = '$' + (preMoney / 1e6).toFixed(1) + 'M';
            document.getElementById('safe-disp-seriesaraise').textContent = '$' + (newRaise / 1e6).toFixed(1) + 'M';

            document.getElementById('safe-disp-founder-pct').textContent = founderDilutedPct.toFixed(1) + '%';
            document.getElementById('safe-disp-s1-pct').textContent = safe1Pct.toFixed(1) + '%';
            document.getElementById('safe-disp-s2-pct').textContent = safe2Pct.toFixed(1) + '%';
            document.getElementById('safe-disp-seriesa-pct').textContent = seriesAPct.toFixed(1) + '%';

            const qsbsClockEl = document.getElementById('qsbs-clock-display');
            if (qsbsClockEl) {
                if (qsbsEligible) {
                    qsbsClockEl.textContent = '3 Years (Qualified: 100% Fed Tax Exclusion Under §1202)';
                    qsbsClockEl.style.color = '#10b981';
                } else {
                    qsbsClockEl.textContent = '0 Days (Debt Clock Frozen Until Conversion)';
                    qsbsClockEl.style.color = '#ef4444';
                }
            }

            const qsbsSavingsEl = document.getElementById('qsbs-tax-savings');
            if (qsbsSavingsEl) {
                qsbsSavingsEl.textContent = '+$' + Math.round(taxSavingsPotential).toLocaleString();
            }
        }

        [safe1Amount, safe1Cap, safe2Amount, safe2Cap, seriesAPre, seriesARaised].forEach(inp => {
            inp.addEventListener('input', () => {
                update();
                if (window.VMAudio) window.VMAudio.playTone(400, 'sine', 0.05, 0.08);
            });
        });

        if (instrumentSelect) {
            instrumentSelect.addEventListener('change', () => {
                update();
                if (window.VMAudio) window.VMAudio.playPreset('click');
            });
        }

        update();
    }

    return { init };
})();
