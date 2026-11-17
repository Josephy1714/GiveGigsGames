/**
 * math-helpers.js - Financial, Cap Table, and Tax Computations
 */
window.VMMath = {
    formatMoney: function(num) {
        if (num === null || num === undefined || isNaN(num)) return '$0';
        if (Math.abs(num) >= 1e9) {
            return '$' + (num / 1e9).toFixed(2) + 'B';
        }
        if (Math.abs(num) >= 1e6) {
            return '$' + (num / 1e6).toFixed(2) + 'M';
        }
        if (Math.abs(num) >= 1e3) {
            return '$' + (num / 1e3).toFixed(0) + 'K';
        }
        return '$' + Math.round(num).toLocaleString();
    },

    formatPercent: function(num, decimals = 1) {
        if (num === null || num === undefined || isNaN(num)) return '0%';
        return (num * 100).toFixed(decimals) + '%';
    },

    clamp: function(val, min, max) {
        return Math.max(min, Math.min(max, val));
    },

    // Delaware Franchise Tax: Assumed Par Value Capital Method vs Authorized Shares
    computeDelawareFranchiseTax: function(authorizedShares, grossAssets = 1000000, issuedShares = 10000000) {
        // Authorized shares method
        let authTax = 175;
        if (authorizedShares > 5000 && authorizedShares <= 10000) {
            authTax = 250;
        } else if (authorizedShares > 10000) {
            const extraBlocks = Math.ceil((authorizedShares - 10000) / 10000);
            authTax = 250 + (extraBlocks * 85);
        }

        // Assumed Par Value method
        const assumedPar = (grossAssets > 0 && issuedShares > 0) ? (grossAssets / issuedShares) : 1;
        const assumedCapital = authorizedShares * assumedPar;
        const apvBlocks = Math.ceil(assumedCapital / 1000000);
        let apvTax = Math.max(400, apvBlocks * 400);

        return {
            authorizedMethodTax: Math.min(200000, authTax),
            assumedParMethodTax: Math.min(200000, apvTax),
            effectiveTax: Math.min(Math.min(200000, authTax), Math.min(200000, apvTax))
        };
    },

    // Broad-Based Weighted Average Anti-Dilution Formula
    // CP2 = CP1 * (A + B) / (A + C)
    // A = Total outstanding Common immediately prior to down round (or common equivalents)
    // B = Total consideration received / Prior Conversion Price
    // C = Number of new shares issued in down round
    computeBroadBasedWeightedAverage: function(priorPrice, priorCommonEquivalents, newCapitalRaised, newDownPrice) {
        if (newDownPrice >= priorPrice) {
            return {
                adjustedConversionPrice: priorPrice,
                newSharesPerOldShare: 1.0,
                type: 'no-down-round'
            };
        }

        const A = priorCommonEquivalents;
        const B = newCapitalRaised / priorPrice;
        const C = newCapitalRaised / newDownPrice;

        const adjustedPrice = priorPrice * ((A + B) / (A + C));
        const conversionRatio = priorPrice / adjustedPrice;

        return {
            adjustedConversionPrice: adjustedPrice,
            priorPrice: priorPrice,
            newDownPrice: newDownPrice,
            conversionRatio: conversionRatio,
            dilutionMitigationFactor: (adjustedPrice - newDownPrice) / (priorPrice - newDownPrice)
        };
    },

    // Full Ratchet Conversion: CP2 = New Price directly
    computeFullRatchet: function(priorPrice, newDownPrice) {
        if (newDownPrice >= priorPrice) {
            return {
                adjustedConversionPrice: priorPrice,
                conversionRatio: 1.0
            };
        }
        return {
            adjustedConversionPrice: newDownPrice,
            conversionRatio: priorPrice / newDownPrice
        };
    },

    // SAFE Conversion: calculates conversion shares based on cap vs discount
    computeSafeConversion: function(investmentAmount, valuationCap, discountRate, seriesAPreMoney, seriesASharePrice) {
        // Cap price
        const capPrice = valuationCap ? (valuationCap / (seriesAPreMoney / seriesASharePrice)) : Infinity;
        // Discount price
        const discountPrice = seriesASharePrice * (1 - (discountRate || 0));

        const effectivePrice = Math.min(capPrice, discountPrice, seriesASharePrice);
        const sharesIssued = investmentAmount / effectivePrice;

        return {
            effectivePrice,
            sharesIssued,
            usedCap: effectivePrice === capPrice,
            usedDiscount: effectivePrice === discountPrice && effectivePrice < seriesASharePrice,
            effectiveDiscount: (seriesASharePrice - effectivePrice) / seriesASharePrice
        };
    }
};
