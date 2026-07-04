function initNavbar() {
    const menuBtn = document.getElementById('menuBtn');
    const drawer = document.getElementById('drawer');
    const overlay = document.getElementById('overlay');
    const submenuItems = document.querySelectorAll('.drawer-item.has-submenu');
    const submenuLinks = document.querySelectorAll('.submenu-item');

    // Search Elements
    const searchToggle = document.getElementById('searchToggle');
    const searchBox = document.getElementById('searchBox');
    const searchInput = document.getElementById('songSearchInput');
    const clearSearch = document.getElementById('clearSearch');
    const searchIcon = document.getElementById('searchIcon');
    const closeIcon = document.getElementById('closeIcon');
    const noSongsMessage = document.getElementById('noSongsMessage');

    let currentQuery = '';

    function toggleDrawer() {
        const isOpen = drawer.classList.toggle('open');
        overlay.classList.toggle('show');
        menuBtn.setAttribute('aria-expanded', isOpen);
        menuBtn.querySelector('.menu-toggle').classList.toggle('open', isOpen);
    }

    menuBtn.addEventListener('click', toggleDrawer);

    overlay.addEventListener('click', () => {
        drawer.classList.remove('open');
        overlay.classList.remove('show');
        menuBtn.setAttribute('aria-expanded', 'false');
        menuBtn.querySelector('.menu-toggle').classList.remove('open');

        submenuItems.forEach(item => {
            item.classList.remove('open');
            const submenu = item.nextElementSibling;
            if (submenu) submenu.classList.remove('open');
        });
    });

    submenuLinks.forEach(link => {
        link.addEventListener('click', () => {
            drawer.classList.remove('open');
            overlay.classList.remove('show');
            menuBtn.setAttribute('aria-expanded', 'false');
            menuBtn.querySelector('.menu-toggle').classList.remove('open');

            submenuItems.forEach(item => item.classList.remove('open'));
            document.querySelectorAll('.submenu').forEach(submenu => submenu.classList.remove('open'));
        });
    });

    submenuItems.forEach(item => {
        item.addEventListener('click', e => {
            e.stopPropagation();

            submenuItems.forEach(otherItem => {
                if (otherItem !== item) {
                    otherItem.classList.remove('open');
                    const otherSubmenu = otherItem.nextElementSibling;
                    if (otherSubmenu) otherSubmenu.classList.remove('open');
                }
            });

            item.classList.toggle('open');

            const submenu = item.nextElementSibling;
            if (submenu) submenu.classList.toggle('open');
        });

        item.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                item.click();
            }
        });
    });

    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && drawer.classList.contains('open')) {
            drawer.classList.remove('open');
            overlay.classList.remove('show');
            menuBtn.setAttribute('aria-expanded', 'false');
            menuBtn.querySelector('.menu-toggle').classList.remove('open');
        }

        if (e.ctrlKey && e.key === 'm') {
            e.preventDefault();
            toggleDrawer();
        }
    });

    // =========================
    // SEARCH
    // =========================

    function updatePlaceholder() {
        const hasText = searchInput.innerText.trim().length > 0;
        searchInput.classList.toggle('placeholder', !hasText);
        clearSearch.style.display = hasText ? 'block' : 'none';
    }

    function filterSongs(query) {
        const teluguSongsContainer = document.getElementById('teluguSongs');
        const englishSongsContainer = document.getElementById('englishSongs');
        const hindiSongsContainer = document.getElementById('hindiSongs');

        let activeContainer = teluguSongsContainer;

        if (!englishSongsContainer.classList.contains('hidden'))
            activeContainer = englishSongsContainer;

        if (hindiSongsContainer && !hindiSongsContainer.classList.contains('hidden'))
            activeContainer = hindiSongsContainer;

        const songs = activeContainer.querySelectorAll('.go-to');

        let matches = 0;

        songs.forEach(song => {
            const name = song.querySelector('a').innerText.toLowerCase();
            const show = name.includes(query);

            song.style.display = show ? 'block' : 'none';

            if (show) matches++;
        });

        if (query.length && matches === 0)
            noSongsMessage.classList.remove('hidden');
        else
            noSongsMessage.classList.add('hidden');
    }

    searchToggle.addEventListener('click', () => {
        const visible = !searchBox.classList.contains('hidden');

        searchBox.classList.toggle('hidden', visible);

        if (!visible) {
            searchInput.focus();
            updatePlaceholder();
            filterSongs(currentQuery);

            searchIcon.classList.add('hidden');
            closeIcon.classList.remove('hidden');
        } else {
            searchInput.innerText = '';
            currentQuery = '';

            updatePlaceholder();
            filterSongs('');

            searchIcon.classList.remove('hidden');
            closeIcon.classList.add('hidden');
        }
    });

    searchInput.addEventListener('input', () => {
        currentQuery = searchInput.innerText.toLowerCase().trim();

        updatePlaceholder();
        filterSongs(currentQuery);
    });

    clearSearch.addEventListener('click', () => {
        searchInput.innerText = '';
        currentQuery = '';

        updatePlaceholder();
        filterSongs('');

        searchInput.focus();
    });

    updatePlaceholder();
    filterSongs('');

    // Make available globally
    window.filterSongs = filterSongs;
}

function showSongs(language, event) {

    const telugu = document.getElementById("teluguSongs");
    const english = document.getElementById("englishSongs");
    const hindi = document.getElementById("hindiSongs");

    telugu.classList.add("hidden");
    english.classList.add("hidden");

    if (hindi) {
        hindi.classList.add("hidden");
    }

    if (language === "telugu")
        telugu.classList.remove("hidden");

    if (language === "english")
        english.classList.remove("hidden");

    if (language === "hindi" && hindi)
        hindi.classList.remove("hidden");

    document.querySelectorAll(".tab-btn")
        .forEach(btn => btn.classList.remove("active"));

    event.target.classList.add("active");

    if (window.filterSongs) {
        const query = document
            .getElementById("songSearchInput")
            ?.innerText.toLowerCase().trim() || "";

        window.filterSongs(query);
    }
}
