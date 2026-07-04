document.getElementById("current-yr").textContent = new Date().getFullYear();
const menuBtn = document.getElementById('menuBtn');
const drawer = document.getElementById('drawer');
const overlay = document.getElementById('overlay');
const submenuItems = document.querySelectorAll('.drawer-item.has-submenu');
const submenuLinks = document.querySelectorAll('.submenu-item');

// Search Functionality Elements
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
    item.addEventListener('click', (e) => {
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

    item.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            item.click();
        }
    });
});

document.addEventListener('keydown', (e) => {
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

// --- Search Functionality (New/Modified) ---

searchToggle.addEventListener('click', () => {
    const isVisible = !searchBox.classList.contains('hidden');
    searchBox.classList.toggle('hidden', isVisible); // Toggle visibility
    if (!isVisible) {
        searchInput.focus(); // Focus input when it appears
        updatePlaceholder(); // Ensure placeholder is correct on open
        filterSongs(currentQuery); // Apply existing filter if any
        searchIcon.classList.add('hidden'); // Hide search icon
        closeIcon.classList.remove('hidden'); // Show close icon
    } else {
        searchInput.innerText = ''; // Clear input on close
        currentQuery = ''; // Reset query
        updatePlaceholder(); // Update placeholder
        filterSongs(''); // Show all songs
        searchIcon.classList.remove('hidden'); // Show search icon
        closeIcon.classList.add('hidden'); // Hide close icon
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

function updatePlaceholder() {
    const hasText = searchInput.innerText.trim().length > 0;
    searchInput.classList.toggle('placeholder', !hasText);
    clearSearch.style.display = hasText ? 'block' : 'none';
}

function filterSongs(query) {
    const teluguSongsContainer = document.getElementById('teluguSongs');
    const englishSongsContainer = document.getElementById('englishSongs');

    const activeContainer = teluguSongsContainer.classList.contains('hidden') ? englishSongsContainer : teluguSongsContainer;
    const allSongsInActiveContainer = activeContainer.querySelectorAll('.go-to');

    let matchCount = 0;
    allSongsInActiveContainer.forEach(songElement => {
        const songName = songElement.querySelector('a').innerText.toLowerCase();
        const matches = songName.includes(query);
        songElement.style.display = matches ? 'block' : 'none';
        if (matches) matchCount++;
    });

    if (matchCount === 0 && query.length > 0) {
        noSongsMessage.classList.remove('hidden');
    } else {
        noSongsMessage.classList.add('hidden');
    }
}

function showSongs(language, event) {
    const telugu = document.getElementById("teluguSongs");
    const english = document.getElementById("englishSongs");
    const hindiSongs = document.getElementById("hindiSongs");

    // Toggle visibility using class
    if (language === 'telugu') {
        telugu.classList.remove("hidden");
        english.classList.add("hidden");
        hindiSongs.classList.add("hidden");
    } else if (language === 'english') {
        telugu.classList.add("hidden");
        english.classList.remove("hidden");
        hindiSongs.classList.add("hidden");
    } else if (language === 'hindi') {
        telugu.classList.add("hidden");
        english.classList.add("hidden");
        hindiSongs.classList.remove("hidden");
    }

    // Update tab button states
    const buttons = document.querySelectorAll('.tab-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');

    // Re-apply search filter when tabs are switched
    filterSongs(currentQuery);
}

// Initial setup for placeholder and filter on load
document.addEventListener('DOMContentLoaded', () => {
    updatePlaceholder();
    filterSongs(currentQuery);
});