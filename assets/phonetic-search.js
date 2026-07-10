
(function () {
    if (window._phoneticSearchReady) return; 

    const TG_VOWELS = {
        'అ': 'a', 'ఆ': 'aa', 'ఇ': 'i', 'ఈ': 'ii', 'ఉ': 'u', 'ఊ': 'uu',
        'ఋ': 'ru', 'ౠ': 'ruu', 'ఎ': 'e', 'ఏ': 'ee', 'ఐ': 'ai',
        'ఒ': 'o', 'ఓ': 'oo', 'ఔ': 'au'
    };

    const TG_CONSONANTS = {
        'క': 'k', 'ఖ': 'kh', 'గ': 'g', 'ఘ': 'gh', 'ఙ': 'ng',
        'చ': 'ch', 'ఛ': 'chh', 'జ': 'j', 'ఝ': 'jh', 'ఞ': 'ny',
        'ట': 't', 'ఠ': 'th', 'డ': 'd', 'ఢ': 'dh', 'ణ': 'n',
        'త': 't', 'థ': 'th', 'ద': 'd', 'ధ': 'dh', 'న': 'n',
        'ప': 'p', 'ఫ': 'ph', 'బ': 'b', 'భ': 'bh', 'మ': 'm',
        'య': 'y', 'ర': 'r', 'ల': 'l', 'వ': 'v',
        'శ': 'sh', 'ష': 'sh', 'స': 's', 'హ': 'h',
        'ళ': 'l', 'ఱ': 'r', 'క్ష': 'ksh'
    };

    const TG_MATRAS = {
        'ా': 'aa', 'ి': 'i', 'ీ': 'ii', 'ు': 'u', 'ూ': 'uu',
        'ృ': 'ru', 'ె': 'e', 'ే': 'ee', 'ై': 'ai',
        'ొ': 'o', 'ో': 'oo', 'ౌ': 'au'
    };

    const TG_VIRAMA = '్';
    const TG_ANUSVARA = 'ం';
    const TG_VISARGA = 'ః';
    const TG_CHANDRABINDU = 'ఁ';

    function transliterateTelugu(str) {
        if (!str) return '';
        let out = '';
        const chars = Array.from(str);
        for (let i = 0; i < chars.length; i++) {
            const c = chars[i];
            const next = chars[i + 1];

            if (TG_VOWELS[c]) { out += TG_VOWELS[c]; continue; }
            if (TG_CONSONANTS[c]) {
                const base = TG_CONSONANTS[c];
                if (next === TG_VIRAMA) { out += base; i++; }
                else if (next && TG_MATRAS[next]) { out += base + TG_MATRAS[next]; i++; }
                else { out += base + 'a'; }
                continue;
            }
            if (c === TG_ANUSVARA) { out += 'n'; continue; }
            if (c === TG_VISARGA) { out += 'h'; continue; }
            if (c === TG_CHANDRABINDU) { out += 'n'; continue; }
            if (c === ' ') { out += ' '; continue; }
            if (/[a-zA-Z0-9]/.test(c)) { out += c; continue; }
        }
        return out;
    }

    function normalizePhonetic(str) {
        let s = (str || '').toLowerCase().replace(/[^a-z]/g, '');
        if (!s) return '';
        s = s.replace(/w/g, 'v');
        s = s.replace(/([bcdgjkpt])h/g, '$1');
        s = s.replace(/z/g, 'j');
        s = s.replace(/ee/g, 'i').replace(/oo/g, 'u');
        s = s.replace(/aa/g, 'a');
        s = s.replace(/(.)\1+/g, '$1');
        return s;
    }

    function levenshtein(a, b) {
        if (a === b) return 0;
        const m = a.length, n = b.length;
        if (!m) return n;
        if (!n) return m;
        let prev = Array.from({ length: n + 1 }, (_, j) => j);
        for (let i = 1; i <= m; i++) {
            const cur = [i];
            for (let j = 1; j <= n; j++) {
                cur[j] = a[i - 1] === b[j - 1]
                    ? prev[j - 1]
                    : 1 + Math.min(prev[j - 1], prev[j], cur[j - 1]);
            }
            prev = cur;
        }
        return prev[n];
    }

    function wordsMatch(qWord, tWord) {
        if (!qWord || !tWord) return false;
        if (tWord.startsWith(qWord) || qWord.startsWith(tWord)) return true;
        const dist = levenshtein(qWord, tWord);
        const maxLen = Math.max(qWord.length, tWord.length);
        if (maxLen < 3) return dist === 0;
        return dist / maxLen <= 0.34;
    }

    function phraseFuzzyMatch(queryRaw, targetPhoneticWords) {
        const qWords = queryRaw.toLowerCase().split(/\s+/).filter(Boolean).map(normalizePhonetic);
        if (!qWords.length) return true;
        return qWords.every(q => targetPhoneticWords.some(t => wordsMatch(q, t)));
    }

    // ── LAZY, CACHED PHONETIC DATA PER SONG LINK ────────────────────────
    // Computed on first filter pass (not at render time), so this works
    // no matter when the script finishes loading relative to song rendering.
    function ensurePhoneticData(link) {
        if (link.dataset.phonetic !== undefined) return;
        const raw = link.textContent || '';
        const teluguPart = raw.replace(/\s*\(\d+\)\s*$/, '');
        const translit = transliterateTelugu(teluguPart);
        const words = translit.split(/\s+/).filter(Boolean).map(normalizePhonetic);
        link.dataset.phonetic = words.join('|');
    }

    // ── OVERWRITE THE GLOBAL filterSongs WITH THE FUZZY VERSION ─────────
    window.filterSongs = function filterSongs(query) {
        const q = (query || '').trim();
        const qLower = q.toLowerCase();
        const links = document.querySelectorAll('#songs .song-link');
        let count = 0;

        links.forEach(link => {
            const li = link.closest('li') || link.parentElement;
            let show = false;

            if (!q) {
                show = true;
            } else if (link.innerText.toLowerCase().includes(qLower)) {
                show = true;
            } else {
                ensurePhoneticData(link);
                const words = (link.dataset.phonetic || '').split('|').filter(Boolean);
                if (words.length) show = phraseFuzzyMatch(q, words);
            }

            li.style.display = show ? '' : 'none';
            if (show) count++;
        });

        if (typeof noSongsMessage !== 'undefined' && noSongsMessage) {
            noSongsMessage.classList.toggle('hidden', !(count === 0 && q.length > 0));
        }
    };

    window._phoneticSearchReady = true;
    if (typeof currentQuery !== 'undefined' && currentQuery) {
        window.filterSongs(currentQuery);
    }
})();
