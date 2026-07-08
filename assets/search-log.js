window.initSearchLog = async function () {
    if (window._searchLogReady) return;
    window._searchLogReady = true;

    const MAX_QUERY_LEN = 100;
    const DEBOUNCE_MS = 1000;

    try {
        if (!(window.firebase && firebase.apps && firebase.apps.length)) {
            await Promise.all([
                loadScript('https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js'),
                loadScript('https://www.gstatic.com/firebasejs/8.10.1/firebase-database.js')
            ]);
            firebase.initializeApp({
                apiKey: "0AzyPiDT3wSi6WAuNX7YzbyJcvUgV0nyoxMwahn0",
                authDomain: "uesi-ap-default-rtdb.firebaseio.com",
                databaseURL: "https://uesi-ap-default-rtdb.firebaseio.com",
                projectId: "uesi-ap"
            });
        }

        const searchLogsRef = firebase.database().ref('searchLogs');

        function logQuery(rawQuery) {
            if (!rawQuery) return;
            const clean = rawQuery.trim().slice(0, MAX_QUERY_LEN);
            if (clean.length < 2) return;

            searchLogsRef.push({
                query: clean,
                lang: window.currentLanguage || 'unknown',
                timestamp: firebase.database.ServerValue.TIMESTAMP,
                ua: navigator.userAgent.slice(0, 150)
            }).catch(err => console.warn('[search-log] write failed:', err));
        }

        const input = document.getElementById('songSearchInput');
        if (!input) return; 

        let timer = null;
        input.addEventListener('input', () => {
            clearTimeout(timer);
            timer = setTimeout(() => logQuery(input.innerText), DEBOUNCE_MS);
        });
    } catch (err) {
        console.warn('[search-log] init failed:', err);
    }

    function loadScript(src) {
        return new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = src;
            s.onload = resolve;
            s.onerror = () => reject(new Error('Failed to load ' + src));
            document.head.appendChild(s);
        });
    }
};
