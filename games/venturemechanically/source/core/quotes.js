/**
 * quotes.js - Curated Wisdom from Ron Wiener's Book
 * 'Lawyers, Venture Capitalists and Other Useful Predators'
 */
window.VM_QUOTES = [
    {
        quote: "The best way to get a good deal from a VC is to not need one.",
        source: "Every founder who found out the hard way",
        chapter: "Prologue: The People Across the Table",
        tip: "Bootstrapping or building with Free Flow LLC models gives you non-coercive leverage."
    },
    {
        quote: "Preferred stock is simply the polite word for senior.",
        source: "Ron Wiener",
        chapter: "Chapter 5: The Term Sheet",
        tip: "Senior debt and preferred dividends get paid before common founders see a penny."
    },
    {
        quote: "Participating preferred is where the double-dipping begins.",
        source: "Ron Wiener",
        chapter: "Chapter 6: Liquidation Preferences",
        tip: "Always fight for 1x non-participating preferred so investors must choose between preference or common conversion."
    },
    {
        quote: "If you have an LLC, Delaware franchise tax is $300 flat. If you have an authorized-share C-Corp, you might get a $150,000 tax surprise in January.",
        source: "Ron Wiener",
        chapter: "Chapter 4: Delaware Mythology",
        tip: "Delaware authorized share calculation is a notorious pitfall. Use Assumed Par Value or an LLC."
    },
    {
        quote: "A 2-2-1 board is not neutral. That independent director is either an ex-VC, wants to be a VC, or sits on three other portfolio boards with your lead VC.",
        source: "Ron Wiener",
        chapter: "Chapter 8: Board Seats",
        tip: "Founders must require mutual consent for the Independent Director and preserve an observer seat."
    },
    {
        quote: "Convertible notes freeze your Section 1202 QSBS clock until priced equity conversion. A SAFE starts ticking immediately on Day 1.",
        source: "Ron Wiener",
        chapter: "Chapter 12: SAFEs vs Notes",
        tip: "A 3-year holding period can save millions in capital gains tax under federal Section 1202."
    },
    {
        quote: "Miss your Section 83(b) election by Day 31, and you will owe ordinary income taxes every year on paper valuation increases you cannot spend.",
        source: "Ron Wiener",
        chapter: "Chapter 10: Founder Wealth Trap",
        tip: "Always file your 83(b) within 30 days of stock grant and send it via certified USPS return receipt."
    },
    {
        quote: "Full ratchet anti-dilution is a weapon of financial destruction in a down round. Insist on Broad-Based Weighted Average.",
        source: "Ron Wiener",
        chapter: "Chapter 7: Anti-Dilution Provisions",
        tip: "Full ratchet reprices all investor shares as if they invested at the bargain basement price, severely diluting common founders."
    }
];

window.getRandomVMQuote = function() {
    const list = window.VM_QUOTES;
    return list[Math.floor(Math.random() * list.length)];
};
