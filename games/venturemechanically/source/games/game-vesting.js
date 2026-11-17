/**
 * game-vesting.js - Reverse Vesting & The 83(b) Tax Escape (Chapters 10, 15 & 16)
 * Simulates restricted stock with reverse vesting vs standard unexercised options,
 * the 30-day strict Section 83(b) election, and phantom income prevention.
 */
window.VMGameVesting = (function() {
    function init() {
        const grantSharesInput = document.getElementById('rv-input-grantshares');
        const parValInput = document.getElementById('rv-input-parval');
        const exitPriceInput = document.getElementById('rv-input-exitprice');
        const check83b = document.getElementById('rv-check-83b');
        const departureMonthInput = document.getElementById('rv-input-departuremonth');
        const vestingTypeSelect = document.getElementById('rv-select-type');

        if (!grantSharesInput) return;

        function update() {
            const grantShares = parseFloat(grantSharesInput.value) || 2000000;
            const parValue = parseFloat(parValInput.value) || 0.001;
            const exitSharePrice = parseFloat(exitPriceInput.value) || 15.0;
            const has83b = check83b ? check83b.checked : true;
            const departureMonth = parseInt(departureMonthInput ? departureMonthInput.value : 48) || 48;
            const vestingType = vestingTypeSelect ? vestingTypeSelect.value : 'restricted'; // 'restricted' vs 'options'

            // Standard 4-year monthly vesting with 1-year (12-month) cliff
            let vestedFraction = 0;
            if (departureMonth < 12) {
                vestedFraction = 0;
            } else if (departureMonth >= 48) {
                vestedFraction = 1.0;
            } else {
                vestedFraction = departureMonth / 48;
            }

            const vestedShares = grantShares * vestedFraction;
            const grossProceeds = vestedShares * exitSharePrice;
            const initialPurchaseCost = grantShares * parValue;

            let taxOwed = 0;
            let netTakeHome = 0;
            let taxExplanation = '';

            if (vestingType === 'restricted') {
                if (has83b) {
                    // Filed within 30 days: tax paid upfront on Day 1 on initial value (almost $0)
                    // At exit, all profit taxed as Long-Term Capital Gains (20%) or $0 if QSBS holds!
                    const capitalGain = Math.max(0, grossProceeds - (vestedShares * parValue));
                    taxOwed = capitalGain * 0.20;
                    netTakeHome = grossProceeds - taxOwed - initialPurchaseCost;
                    taxExplanation = 'Section 83(b) Election Filed on Day 1: Growth taxed at 20% Long-Term Capital Gains rate (or 0% under QSBS §1202). No phantom ordinary income!';
                } else {
                    // Missed 83(b): As shares vest each year at higher valuations, taxed as ORDINARY INCOME (up to 37%)!
                    const avgVestValuationPerShare = exitSharePrice * 0.6; // Average fair market value at vesting
                    const ordinaryTax = (vestedShares * avgVestValuationPerShare) * 0.37;
                    const capitalGainsTax = Math.max(0, grossProceeds - (vestedShares * avgVestValuationPerShare)) * 0.20;
                    taxOwed = ordinaryTax + capitalGainsTax;
                    netTakeHome = grossProceeds - taxOwed - initialPurchaseCost;
                    taxExplanation = 'WARNING: Missed 30-Day 83(b) Election! The IRS taxed unvested appreciation as 37% Ordinary Income at each vesting milestone. Devastating cash crunch.';
                }
            } else {
                // Stock Options: 90-day post-termination exercise window
                // If founder leaves before liquidity, must pay cash strike price + AMT tax, or forfeit everything!
                if (departureMonth < 48) {
                    taxOwed = grossProceeds * 0.45; // Exercise penalty + AMT + short term tax
                    netTakeHome = Math.max(0, grossProceeds - taxOwed - (vestedShares * 2.0)); // Assume $2 strike
                    taxExplanation = 'Option Golden Handcuffs: Left before exit. 90-day post-termination window required $4M+ cash to exercise and pay AMT, forcing painful forfeiture.';
                } else {
                    taxOwed = grossProceeds * 0.28;
                    netTakeHome = grossProceeds - taxOwed;
                    taxExplanation = 'Exercised stock options at exit. Higher tax than restricted stock with 83(b), and QSBS clock started years later.';
                }
            }

            // Update DOM displays
            document.getElementById('rv-disp-grantshares').textContent = grantShares.toLocaleString();
            document.getElementById('rv-disp-vestedshares').textContent = Math.round(vestedShares).toLocaleString();
            document.getElementById('rv-disp-gross').textContent = '$' + Math.round(grossProceeds).toLocaleString();
            document.getElementById('rv-disp-tax').textContent = '-$' + Math.round(taxOwed).toLocaleString();
            
            const netEl = document.getElementById('rv-disp-net-takehome');
            if (netEl) {
                netEl.textContent = '$' + Math.round(netTakeHome).toLocaleString();
                if (has83b && vestingType === 'restricted') {
                    netEl.style.color = '#10b981';
                } else {
                    netEl.style.color = '#f59e0b';
                }
            }

            const explEl = document.getElementById('rv-disp-tax-explanation');
            if (explEl) {
                explEl.textContent = taxExplanation;
            }
        }

        [grantSharesInput, parValInput, exitPriceInput, departureMonthInput].forEach(inp => {
            if (inp) {
                inp.addEventListener('input', () => {
                    update();
                    if (window.VMAudio) window.VMAudio.playTone(480, 'sine', 0.05, 0.06);
                });
            }
        });

        if (check83b) {
            check83b.addEventListener('change', () => {
                update();
                if (window.VMAudio) {
                    if (check83b.checked) {
                        window.VMAudio.playPreset('success');
                    } else {
                        window.VMAudio.playPreset('danger');
                    }
                }
            });
        }

        if (vestingTypeSelect) {
            vestingTypeSelect.addEventListener('change', () => {
                update();
                if (window.VMAudio) window.VMAudio.playPreset('click');
            });
        }

        update();
    }

    return { init };
})();
