window.initSearchLog = async function () {
    if (window._searchLogReady) return;
    window._searchLogReady = true;

    const DB_URL = 'https://uesi-ap-default-rtdb.firebaseio.com';
    const MAX_QUERY_LEN = 100;
    const DEBOUNCE_MS = 1000;      // wait for a pause in typing before buffering a term
    const FLUSH_INTERVAL_MS = 20000; // flush buffer every 20s if non-empty
    const MAX_BUFFER = 50;         // safety cap per session

    const sessionId = 'S' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    const buffer = new Set();      // unique cleaned queries this session
    let flushTimer = null;
    let firebaseReady = false;

    function loadScript(src) {
        return new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = src; s.onload = resolve; s.onerror = () => reject(new Error('load fail: ' + src));
            document.head.appendChild(s);
        });
    }

    async function ensureFirebase() {
        if (window.firebase && firebase.apps && firebase.apps.length) { firebaseReady = true; return; }
        await loadScript('https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js');
        await loadScript('https://www.gstatic.com/firebasejs/8.10.1/firebase-database.js');
        firebase.initializeApp({
            apiKey: "0AzyPiDT3wSi6WAuNX7YzbyJcvUgV0nyoxMwahn0",
            authDomain: "uesi-ap-default-rtdb.firebaseio.com",
            databaseURL: DB_URL,
            projectId: "uesi-ap"
        });
        firebaseReady = true;
    }

    function addToBuffer(rawQuery) {
        if (!rawQuery) return;
        const clean = rawQuery.trim().slice(0, MAX_QUERY_LEN);
        if (clean.length < 2) return;
        if (buffer.size >= MAX_BUFFER) return; // don't grow unbounded in one session
        buffer.add(clean);
    }

    function buildPayload() {
        return {
            queries: Array.from(buffer),
            lang: window.currentLanguage || 'unknown',
            sessionId,
            count: buffer.size,
            timestamp: Date.now(),
            ua: navigator.userAgent.slice(0, 150)
        };
    }

    // Normal flush — used while the page is alive (periodic timer)
    async function flush() {
        if (!buffer.size) return;
        if (!firebaseReady) { try { await ensureFirebase(); } catch (e) { return; } }

        const payload = buildPayload();
        try {
            await firebase.database().ref('searchLogs').push({
                ...payload,
                timestamp: firebase.database.ServerValue.TIMESTAMP
            });
            buffer.clear();
        } catch (err) {
            console.warn('[search-log] flush failed:', err);
        }
    }

    // Unload flush — fires when the tab is closing/backgrounding.
    // sendBeacon is the only API guaranteed to complete after the page starts unloading.
    function flushOnExit() {
        if (!buffer.size) return;
        const payload = buildPayload();
        const url = `${DB_URL}/searchLogs.json`;
        const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
        const sent = navigator.sendBeacon ? navigator.sendBeacon(url, blob) : false;
        if (sent) buffer.clear();
    }

    function attachListener() {
        const input = document.getElementById('songSearchInput');
        if (!input) return false;

        let timer = null;
        input.addEventListener('input', () => {
            clearTimeout(timer);
            timer = setTimeout(() => addToBuffer(input.innerText), DEBOUNCE_MS);
        });
        return true;
    }

    function attachWithRetry() {
        if (attachListener()) return;
        let tries = 0;
        const retry = setInterval(() => {
            tries++;
            if (attachListener() || tries >= 20) clearInterval(retry);
        }, 300);
    }

    async function init() {
        attachWithRetry();
        await ensureFirebase();

        flushTimer = setInterval(flush, FLUSH_INTERVAL_MS);

        // Covers tab close, refresh, navigation away, app backgrounding (mobile)
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') flushOnExit();
        });
        window.addEventListener('pagehide', flushOnExit);
    }

    init().catch(err => console.warn('[search-log] init failed:', err));
};
