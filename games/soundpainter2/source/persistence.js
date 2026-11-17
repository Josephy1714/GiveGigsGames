function serializeState() {
    return encodeSong(state);
}

function deserializeState(encoded) {
    try {
        const song = decodeSong(encoded, state);
        state.bpm = song.bpm;
        state.settings = song.settings;
        state.grids = song.grids;
        state.vel = song.vel;
        return true;
    } catch {
        return false;
    }
}

function showShareStatus(message, link) {
    const banner = document.getElementById('share-banner');
    banner.replaceChildren(document.createTextNode(message));
    banner.setAttribute('role', 'status');
    banner.classList.remove('hidden');
    const dismiss = document.createElement('button');
    dismiss.type = 'button';
    dismiss.textContent = 'Dismiss';
    dismiss.className = 'studio-page-button';
    dismiss.style.marginLeft = '8px';
    dismiss.addEventListener('click', () => banner.classList.add('hidden'));
    banner.append(dismiss);
    if (link) {
        const input = document.createElement('input');
        input.type = 'text';
        input.readOnly = true;
        input.value = link;
        input.setAttribute('aria-label', 'Song sharing link');
        input.style.cssText = 'width:100%;color:#111;background:#fff;padding:6px;';
        banner.append(input);
        input.focus();
        input.select();
    }
}

function loadFromUrlParameters() {
    const data = new URLSearchParams(window.location.search).get('data');
    if (!data) return;
    if (deserializeState(data)) {
        updateSlidersAndDropdowns();
    } else {
        showShareStatus('This song link is incomplete or unsupported. Your current pattern is unchanged.');
    }
}

async function shareSong() {
    const url = new URL(window.location.href);
    url.search = '';
    url.hash = '';
    url.searchParams.set('data', serializeState());
    const link = url.toString();
    try {
        await navigator.clipboard.writeText(link);
        showShareStatus('Song link copied. Notes, dynamics, mix, and synth settings are included.');
    } catch {
        showShareStatus('Copy this song link:', link);
    }
}
