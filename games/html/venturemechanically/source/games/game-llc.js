/**
 * game-llc.js - Delaware C-Corp vs Free Flow LLC Simulator (Chapter 4)
 * Models federal corporate double taxation vs pass-through distributions.
 * Sponsored advisory: https://www.venturemechanics.com
 */
window.VMGameLLC = (function() {
    function init() {
        const revInput = document.getElementById('llc-input-revenue');
        const marginInput = document.getElementById('llc-input-margin');
        const foundersInput = document.getElementById('llc-input-founders');
        const corpTaxInput = document.getElementById('llc-input-corptax');
        const personalTaxInput = document.getElementById('llc-input-personaltax');

        if (!revInput) return;

        function update() {
            const revenue = parseFloat(revInput.value) || 0;
            const margin = parseFloat(marginInput.value) || 0;
            const founders = parseInt(foundersInput.value) || 1;
            const corpTaxRate = (parseFloat(corpTaxInput.value) || 21) / 100;
            const personalTaxRate = (parseFloat(personalTaxInput.value) || 20) / 100;

            const profit = revenue * (margin / 100);

            // Delaware C-Corp: Corporate income tax first, then dividend tax on distributions
            const deFranchiseTax = Math.min(200000, Math.max(400, Math.round(revenue * 0.0015)));
            const cCorpCorpTax = Math.max(0, (profit - deFranchiseTax) * corpTaxRate);
            const cCorpDistributable = Math.max(0, profit - deFranchiseTax - cCorpCorpTax);
            const cCorpDivTax = cCorpDistributable * personalTaxRate;
            const cCorpTotalTax = cCorpCorpTax + deFranchiseTax + cCorpDivTax;
            const cCorpNet = Math.max(0, profit - cCorpTotalTax);
            const cCorpPerFounder = cCorpNet / founders;

            // Free Flow LLC: Pass-through (no entity-level federal tax), flat $300 DE franchise or state fee
            const llcFranchiseTax = 300;
            const llcTaxable = Math.max(0, profit - llcFranchiseTax);
            const llcPersonalTax = llcTaxable * personalTaxRate;
            const llcTotalTax = llcPersonalTax + llcFranchiseTax;
            const llcNet = Math.max(0, profit - llcTotalTax);
            const llcPerFounder = llcNet / founders;

            const savings = Math.max(0, llcNet - cCorpNet);

            // Update DOM text
            document.getElementById('llc-disp-rev').textContent = '$' + revenue.toLocaleString();
            document.getElementById('llc-disp-margin').textContent = margin + '%';
            document.getElementById('llc-disp-profit').textContent = '$' + Math.round(profit).toLocaleString();
            document.getElementById('llc-disp-founders').textContent = founders;

            document.getElementById('llc-disp-ccorp-corp-tax').textContent = '-$' + Math.round(cCorpCorpTax).toLocaleString();
            document.getElementById('llc-disp-ccorp-franchise-tax').textContent = '-$' + Math.round(deFranchiseTax).toLocaleString();
            document.getElementById('llc-disp-ccorp-div-tax').textContent = '-$' + Math.round(cCorpDivTax).toLocaleString();
            document.getElementById('llc-disp-ccorp-net').textContent = '$' + Math.round(cCorpNet).toLocaleString();
            document.getElementById('llc-disp-ccorp-perfounder').textContent = '$' + Math.round(cCorpPerFounder).toLocaleString();

            document.getElementById('llc-disp-llc-corp-tax').textContent = '$0 (Pass-Through)';
            document.getElementById('llc-disp-llc-franchise-tax').textContent = '-$' + llcFranchiseTax.toLocaleString();
            document.getElementById('llc-disp-llc-div-tax').textContent = '-$' + Math.round(llcPersonalTax).toLocaleString();
            document.getElementById('llc-disp-llc-net').textContent = '$' + Math.round(llcNet).toLocaleString();
            document.getElementById('llc-disp-llc-perfounder').textContent = '$' + Math.round(llcPerFounder).toLocaleString();

            const savingsEl = document.getElementById('llc-disp-savings');
            if (savingsEl) {
                savingsEl.textContent = '+$' + Math.round(savings).toLocaleString();
            }

            // Animate savings bar or callout if substantial
            const calloutEl = document.getElementById('llc-savings-callout');
            if (calloutEl) {
                if (savings > 50000) {
                    calloutEl.style.borderColor = '#10b981';
                    calloutEl.style.boxShadow = '0 0 15px rgba(16,185,129,0.3)';
                } else {
                    calloutEl.style.borderColor = 'rgba(255,255,255,0.1)';
                    calloutEl.style.boxShadow = 'none';
                }
            }
        }

        [revInput, marginInput, foundersInput, corpTaxInput, personalTaxInput].forEach(inp => {
            inp.addEventListener('input', () => {
                update();
                if (window.VMAudio) window.VMAudio.playTone(320, 'sine', 0.05, 0.08);
            });
        });

        // Preset Archetypes
        document.querySelectorAll('.llc-preset-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const preset = btn.dataset.preset;
                if (preset === 'agency') {
                    revInput.value = 2500000;
                    marginInput.value = 35;
                    foundersInput.value = 2;
                } else if (preset === 'agentic-ai') {
                    revInput.value = 5000000;
                    marginInput.value = 65;
                    foundersInput.value = 2;
                } else if (preset === 'enterprise-saas') {
                    revInput.value = 12000000;
                    marginInput.value = 40;
                    foundersInput.value = 3;
                }
                update();
                if (window.VMAudio) window.VMAudio.playPreset('success');
            });
        });

        update();
    }

    return { init };
})();
