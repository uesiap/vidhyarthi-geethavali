(async function cacheBurst() {

    try {

        console.log("[CACHE BURST] Starting...");

        // ------------------------------------------------
        // Delete Cache Storage ONLY
        // ------------------------------------------------
        if ("caches" in window) {

            const cacheNames =
                await caches.keys();

            await Promise.all(
                cacheNames.map(name =>
                    caches.delete(name)
                )
            );

            console.log(
                "[CACHE BURST] Cache API cleared"
            );
        }

        // ------------------------------------------------
        // DO NOT REMOVE SERVICE WORKERS
        // ------------------------------------------------

        // ------------------------------------------------
        // Delete IndexedDB
        // ------------------------------------------------
        if (
            window.indexedDB &&
            indexedDB.databases
        ) {

            const dbs =
                await indexedDB.databases();

            await Promise.all(

                dbs.map(db => {

                    return new Promise(resolve => {

                        if (!db.name) {
                            resolve();
                            return;
                        }

                        const req =
                            indexedDB.deleteDatabase(db.name);

                        req.onsuccess = () =>
                            resolve();

                        req.onerror = () =>
                            resolve();

                        req.onblocked = () =>
                            resolve();
                    });
                })
            );

            console.log(
                "[CACHE BURST] IndexedDB cleared"
            );
        }

        // ------------------------------------------------
        // Clear local/session storage
        // ------------------------------------------------
        localStorage.clear();
        sessionStorage.clear();

        console.log(
            "[CACHE BURST] Web storage cleared"
        );

        // ------------------------------------------------
        // Clear Cookies
        // ------------------------------------------------
        const cookies =
            document.cookie.split(";");

        const hostname =
            location.hostname;

        const domains = [
            hostname,
            "." + hostname
        ];

        for (const cookie of cookies) {

            const eqPos =
                cookie.indexOf("=");

            const name =
                eqPos > -1
                    ? cookie.substr(0, eqPos).trim()
                    : cookie.trim();

            for (const domain of domains) {

                document.cookie =
                    `${name}=; ` +
                    `expires=Thu, 01 Jan 1970 00:00:00 GMT; ` +
                    `path=/; ` +
                    `domain=${domain};`;

                document.cookie =
                    `${name}=; ` +
                    `Max-Age=0; ` +
                    `path=/;`;
            }
        }

        console.log(
            "[CACHE BURST] Cookies cleared"
        );

        console.log(
            "[CACHE BURST] Complete"
        );

    } catch (err) {

        console.error(
            "[CACHE BURST ERROR]",
            err
        );
    }

})();
