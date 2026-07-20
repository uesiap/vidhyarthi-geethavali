window.initSearchLog = function () {
    if (window._searchLogReady) return;
    window._searchLogReady = true;

    const MAX_QUERY_LEN = 100;
    const DEBOUNCE_MS = 1000; // Wait 1 second after typing stops

    let timer = null;
    let lastLogged = "";

    function logQuery(rawQuery) {
        if (!rawQuery) return;

        const clean = rawQuery.trim().slice(0, MAX_QUERY_LEN);

        if (clean.length < 2) return;

        // Don't log duplicate consecutive searches
        if (clean === lastLogged) return;

        lastLogged = clean;

        // Matomo Site Search Tracking
        if (window._paq) {
            _paq.push([
                'trackSiteSearch',
                clean,
                window.currentLanguage || 'unknown'
            ]);
        }
    }

    const input = document.getElementById("songSearchInput");

    if (!input) return;

    input.addEventListener("input", () => {
        clearTimeout(timer);

        timer = setTimeout(() => {
            const query =
                input.value !== undefined
                    ? input.value
                    : input.innerText;

            logQuery(query);
        }, DEBOUNCE_MS);
    });
};
