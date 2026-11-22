const LINES = {
    follow: ['On your six.', 'Moving with you.'],
    hold: ['Holding this position.', 'Setting a perimeter.'],
    upgrade: ['Systems upgraded.', 'Combat package online.'],
    hurt: ['Taking fire. Moving to cover.', 'Armor hit. Falling back.'],
    ranged: ['Target acquired.', 'Firing solution locked.'],
    melee: ['Closing in.', 'Within striking range.']
};

export function createBotComms() {
    const speech = globalThis.speechSynthesis;
    let active = null;
    let lastSpoken = -Infinity;
    return {
        say(event, team) {
            const now = performance.now();
            if (!speech || now - lastSpoken < 2200 || speech.speaking) return;
            const lines = LINES[event];
            const utterance = new SpeechSynthesisUtterance(lines[Math.floor(Math.random() * lines.length)]);
            utterance.pitch = team === 'enemy' ? .58 : 1.07;
            utterance.rate = team === 'enemy' ? .92 : 1.14;
            utterance.volume = .56;
            utterance.lang = 'en-US';
            lastSpoken = now;
            active = utterance;
            speech.speak(utterance);
        },
        reset() {
            if (active && (speech.speaking || speech.pending)) speech.cancel();
            active = null;
            lastSpoken = -Infinity;
        }
    };
}
