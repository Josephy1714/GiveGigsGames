/**
 * game-boardroom.js - Boardroom Coup Defense Simulator (Chapter 8)
 * Simulates 2-2-1 Board dynamics, Independent Director lobbying,
 * and King (CEO retention) vs Rich (Permanent Board Steward) playbooks.
 */
window.VMGameBoardroom = (function() {
    function init() {
        const founderVotes = [1, 1]; // Founder 1, Founder 2
        const vcVotes = [-1, -1];    // VC 1, VC 2
        let independentVote = 0;     // 0 = swing/uncommitted, 1 = founder, -1 = VC
        let currentPlaybook = 'king'; // 'king' vs 'rich'

        const indepSeatBtn = document.getElementById('seat-independent');
        const votesDisplay = document.getElementById('board-votes-display');
        const verdictDisplay = document.getElementById('board-coup-verdict');
        const playbookKingBtn = document.getElementById('btn-playbook-king');
        const playbookRichBtn = document.getElementById('btn-playbook-rich');
        const playbookExpl = document.getElementById('board-playbook-explanation');

        if (!indepSeatBtn) return;

        function updateBoard() {
            // Count votes: > 0 supports founder CEO, < 0 votes to replace CEO
            let supportVotes = 2; // Founder seats always support founder
            let replaceVotes = 2; // VC seats vote for replacement

            if (independentVote === 1) {
                supportVotes += 1;
            } else if (independentVote === -1) {
                replaceVotes += 1;
            }

            if (votesDisplay) {
                votesDisplay.textContent = `${supportVotes} Support Founder vs ${replaceVotes} Support VC Replacement`;
            }

            if (indepSeatBtn) {
                indepSeatBtn.classList.remove('allied-founder', 'allied-vc', 'uncommitted');
                if (independentVote === 1) {
                    indepSeatBtn.classList.add('allied-founder');
                    indepSeatBtn.querySelector('.seat-status').textContent = 'Allied: Pro-Founder (3-2 Defends CEO)';
                } else if (independentVote === -1) {
                    indepSeatBtn.classList.add('allied-vc');
                    indepSeatBtn.querySelector('.seat-status').textContent = 'Allied: Pro-VC (3-2 Coup Ousts CEO)';
                } else {
                    indepSeatBtn.classList.add('uncommitted');
                    indepSeatBtn.querySelector('.seat-status').textContent = 'Swing Vote: Click to Lobby';
                }
            }

            if (verdictDisplay) {
                if (independentVote === 1) {
                    verdictDisplay.className = 'board-verdict success';
                    verdictDisplay.innerHTML = `
                        <strong>🛡️ CEO RETAINED (3-2 Vote)</strong>
                        <p>By securing the Independent Director through governance alignment and mutual consent, the founder retains executive authority.</p>
                    `;
                } else if (independentVote === -1) {
                    if (currentPlaybook === 'rich') {
                        verdictDisplay.className = 'board-verdict warning';
                        verdictDisplay.innerHTML = `
                            <strong>👑 STRATEGIC REPOSITIONING (Sandy Lerner Playbook)</strong>
                            <p>CEO transitions to Chairman & Chief Technologist with permanent voting seat. Founder retains governance veto and equity upside without operational firing liability.</p>
                        `;
                    } else {
                        verdictDisplay.className = 'board-verdict danger';
                        verdictDisplay.innerHTML = `
                            <strong>🚨 FOUNDER OUSTED (3-2 Coup)</strong>
                            <p>The VC coalition recruited the Independent Director (frequently an ex-VC or fellow portfolio member) and voted to replace the founder CEO with an external 'operator'.</p>
                        `;
                    }
                } else {
                    verdictDisplay.className = 'board-verdict neutral';
                    verdictDisplay.innerHTML = `
                        <strong>⚖️ DEADLOCKED (2-2 + 1 Swing)</strong>
                        <p>The fate of company control rests entirely in the hands of the single independent seat. Click the seat above to lobby them!</p>
                    `;
                }
            }
        }

        indepSeatBtn.addEventListener('click', () => {
            if (independentVote === 0) {
                independentVote = 1;
                if (window.VMAudio) window.VMAudio.playPreset('success');
            } else if (independentVote === 1) {
                independentVote = -1;
                if (window.VMAudio) window.VMAudio.playPreset('danger');
            } else {
                independentVote = 0;
                if (window.VMAudio) window.VMAudio.playPreset('click');
            }
            updateBoard();
        });

        if (playbookKingBtn && playbookRichBtn) {
            playbookKingBtn.addEventListener('click', () => {
                currentPlaybook = 'king';
                playbookKingBtn.classList.add('active');
                playbookRichBtn.classList.remove('active');
                if (playbookExpl) {
                    playbookExpl.innerHTML = `
                        <strong>King Strategy:</strong> You prioritize retaining the CEO seat at all costs. If you lose the 3-2 board vote, you are terminated from operations and your unvested shares may be forfeited under adverse departure clauses.
                    `;
                }
                if (window.VMAudio) window.VMAudio.playPreset('click');
                updateBoard();
            });

            playbookRichBtn.addEventListener('click', () => {
                currentPlaybook = 'rich';
                playbookRichBtn.classList.add('active');
                playbookKingBtn.classList.remove('active');
                if (playbookExpl) {
                    playbookExpl.innerHTML = `
                        <strong>Rich Strategy (Wiener / Cisco Playbook):</strong> You negotiate an irrevocable Founder Board Seat and transition willingly to Executive Chairman/Chief Architect when growth demands enterprise scale. You cannot be locked out of company destiny.
                    `;
                }
                if (window.VMAudio) window.VMAudio.playPreset('success');
                updateBoard();
            });
        }

        updateBoard();
    }

    return { init };
})();
