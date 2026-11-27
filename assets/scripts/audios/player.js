(function () {
    'use strict';

    const cfg = window.PLAYER_CONFIG || {};
    const DATA_PATH = (cfg.dataPath || '').replace(/\/+$/, '');
    const CHUNK_SIZES = Array.isArray(cfg.chunkSizes) && cfg.chunkSizes.length ? cfg.chunkSizes : [50];

    if (!DATA_PATH) {
        console.error('[audio-player] window.PLAYER_CONFIG.dataPath is missing.');
        return;
    }

    const $ = (id) => document.getElementById(id);
    const PRIMARY_BG = 'linear-gradient(to right, var(--primary-color) 0%, var(--primary-color) calc(var(--progress)), #ccc calc(var(--progress)), #ccc 100%)';
    const RESET_BG = 'linear-gradient(to right, var(--primary-color) 0%, var(--primary-color) 0%, #ccc 0%, #ccc 100%)';

    const songsQueue = [];

    const songsList = $('songsList');
    const audio = $('audioPlayer');
    const player = $('player');
    const dragToggle = $('dragToggle');
    const seekSlider = $('seekSlider');
    const minPlayPause = $('minPlayPause');
    const minIcon = $('minIcon');
    const mainPlayPause = $('mainPlayPause');
    const mainIcon = $('mainIcon');
    const repeatBtn = $('repeatBtn');
    const repeatIcon = $('repeatIcon');
    const shuffleBtn = $('shuffleBtn');
    const shuffleIcon = $('shuffleIcon');
    const prevBtn = $('prevBtn');
    const nextBtn = $('nextBtn');
    const prevBtnExpanded = $('prevBtnExpanded');
    const nextBtnExpanded = $('nextBtnExpanded');
    const trackTitle = document.querySelector('.track-title .scroll-text');
    const minimizedTrackTitle = document.querySelector('.minimized-track .scroll-text');
    const currentTimeEl = document.querySelector('.current-time');
    const totalDurationEl = document.querySelector('.total-duration');

    const menuBtn = $('menuBtn');
    const drawer = $('drawer');
    const overlay = $('overlay');
    const submenuItems = document.querySelectorAll('.drawer-item.has-submenu');
    const submenuLinks = document.querySelectorAll('.submenu-item');

    const searchToggle = $('searchToggle');
    const searchBox = $('searchBox');
    const searchInput = $('songSearchInput');
    const clearSearch = $('clearSearch');
    const noSongsMessage = $('noSongsMessage');
    const searchIcon = $('searchIcon');
    const closeIcon = $('closeIcon');

    let currentPlayingIndex = null;
    let isShuffling = false;
    let repeatState = 'order';
    let currentQuery = '';

    function closeSubmenus() {
        submenuItems.forEach((item) => {
            item.classList.remove('open');
            const submenu = item.nextElementSibling;
            if (submenu) submenu.classList.remove('open');
        });
    }

    function closeDrawer() {
        if (!drawer) return;
        drawer.classList.remove('open');
        overlay?.classList.remove('show');
        menuBtn?.setAttribute('aria-expanded', 'false');
        menuBtn?.querySelector('.menu-toggle')?.classList.remove('open');
    }

    function toggleDrawer() {
        if (!drawer) return;
        const isOpen = drawer.classList.toggle('open');
        overlay?.classList.toggle('show');
        menuBtn?.setAttribute('aria-expanded', isOpen);
        menuBtn?.querySelector('.menu-toggle')?.classList.toggle('open', isOpen);
    }

    menuBtn?.addEventListener('click', toggleDrawer);

    overlay?.addEventListener('click', () => {
        closeDrawer();
        closeSubmenus();
    });

    submenuLinks.forEach((link) => {
        link.addEventListener('click', () => {
            closeDrawer();
            closeSubmenus();
        });
    });

    submenuItems.forEach((item) => {
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            submenuItems.forEach((other) => {
                if (other !== item) {
                    other.classList.remove('open');
                    other.nextElementSibling?.classList.remove('open');
                }
            });
            item.classList.toggle('open');
            item.nextElementSibling?.classList.toggle('open');
        });

        item.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                item.click();
            }
        });
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && drawer?.classList.contains('open')) closeDrawer();
        if (e.ctrlKey && e.key === 'm') {
            e.preventDefault();
            toggleDrawer();
        }
    });

    function updatePlaceholder() {
        if (!searchInput) return;
        const hasText = searchInput.innerText.trim().length > 0;
        searchInput.classList.toggle('placeholder', !hasText);
        if (clearSearch) clearSearch.style.display = hasText ? 'block' : 'none';
    }

    function filterSongs(query) {
        if (!songsList) return;
        let matchCount = 0;
        Array.from(songsList.children).forEach((li) => {
            const name = li.querySelector('.song-name')?.innerText.toLowerCase() || '';
            const matches = name.includes(query);
            li.classList.toggle('hidden', !matches);
            if (matches) matchCount++;
        });
        noSongsMessage?.classList.toggle('hidden', matchCount !== 0);
    }

    function resetSearch() {
        if (searchInput) searchInput.innerText = '';
        currentQuery = '';
        updatePlaceholder();
        filterSongs('');
    }

    searchToggle?.addEventListener('click', () => {
        if (!searchBox) return;
        const isVisible = !searchBox.classList.contains('hidden');
        searchBox.classList.toggle('hidden', isVisible);
        if (!isVisible) {
            searchInput?.focus();
            updatePlaceholder();
            filterSongs(currentQuery);
            searchIcon?.classList.add('hidden');
            closeIcon?.classList.remove('hidden');
        } else {
            resetSearch();
            searchIcon?.classList.remove('hidden');
            closeIcon?.classList.add('hidden');
        }
    });

    searchInput?.addEventListener('input', () => {
        currentQuery = searchInput.innerText.toLowerCase().trim();
        updatePlaceholder();
        filterSongs(currentQuery);
    });

    clearSearch?.addEventListener('click', () => {
        resetSearch();
        searchInput?.focus();
    });

    updatePlaceholder();

    async function loadChunk(size) {
        const url = `${DATA_PATH}/${size}/list.json`;
        try {
            const res = await fetch(url);
            if (!res.ok) {
                console.warn(`[audio-player] ${url} returned ${res.status}`);
                return;
            }
            const data = await res.json();
            const startIndex = songsQueue.length;

            Object.keys(data)
                .sort((a, b) => Number(a) - Number(b))
                .forEach((key) => {
                    const song = data[key];
                    if (song && !song.audioLink) {
                        console.warn(`[audio-player] Song ${key} ("${song.title}") has no audioLink`);
                    }
                    if (song && song.title) {
                        songsQueue.push({
                            name: `${song.title} (${key})`,
                            url: song.audioLink,
                            lyrics: song.lyrics || ''
                        });
                    }
                });

            appendSongsToDOM(startIndex);
        } catch (err) {
            console.warn(`[audio-player] Failed to load ${url}:`, err);
        }
    }

    function appendSongsToDOM(startIndex) {
        const fragment = document.createDocumentFragment();
        for (let i = startIndex; i < songsQueue.length; i++) {
            const li = document.createElement('li');

            const details = document.createElement('div');
            details.className = 'song-details';

            const nameEl = document.createElement('div');
            nameEl.className = 'song-name';
            nameEl.dataset.index = i;

            const img = document.createElement('img');
            img.src = '/vidhyarthi-geethavali/assets/Icons/apple-icon.png';
            img.width = 45;
            img.height = 45;
            img.style.borderRadius = '0';
            img.alt = 'UESI Vidhyarthi Geethavali';

            nameEl.append(img, document.createTextNode(' ' + songsQueue[i].name));
            details.appendChild(nameEl);
            li.appendChild(details);
            fragment.appendChild(li);
        }
        songsList.appendChild(fragment);

        // Keep a new chunk consistent with an active search
        if (currentQuery) filterSongs(currentQuery);
    }

    function setLoader(visible) {
        const loader = $('songsLoader');
        if (loader) loader.style.display = visible ? 'block' : 'none';
    }

    async function loadSongsProgressively() {
        await loadChunk(CHUNK_SIZES[0]);

        if (songsQueue.length > 0) selectSong(0, false);

        const desktop = window.innerWidth >= 1024;
        player.classList.toggle('expanded', desktop);
        player.classList.toggle('collapsed', !desktop);

        if (CHUNK_SIZES.length > 1) {
            setLoader(true);
            for (let i = 1; i < CHUNK_SIZES.length; i++) {
                await loadChunk(CHUNK_SIZES[i]);
            }
        }
        setLoader(false);
    }

    function getSongEl(index) {
        return songsList.querySelector(`.song-name[data-index="${index}"]`);
    }

    function setPlayIcons(playing) {
        const icon = playing ? 'pause' : 'play_arrow';
        if (mainIcon) mainIcon.textContent = icon;
        if (minIcon) minIcon.textContent = icon;
    }

    function selectSong(index, autoplay) {
        const song = songsQueue[index];
        if (!song) return;
        if (!song.url) {
            console.warn('[audio-player] No audio URL for:', song.name);
            return;
        }

        if (currentPlayingIndex !== null) getSongEl(currentPlayingIndex)?.classList.remove('playing');

        currentPlayingIndex = index;
        audio.src = song.url;
        getSongEl(index)?.classList.add('playing');

        if (trackTitle) trackTitle.textContent = song.name;
        if (minimizedTrackTitle) minimizedTrackTitle.textContent = song.name;

        player.style.borderColor = 'var(--primary-color)';
        seekSlider.style.background = PRIMARY_BG;
        seekSlider.style.setProperty('--knob-color', 'var(--primary-color)');

        if (autoplay) {
            audio.play().catch((err) => console.warn('[audio-player] play() blocked:', err));
        }
    }

    function togglePlayPause(index) {
        if (currentPlayingIndex === index) {
            if (audio.paused) {
                audio.play().catch((err) => console.warn('[audio-player] play() blocked:', err));
            } else {
                audio.pause();
            }
            getSongEl(index)?.classList.add('playing');
            return;
        }
        selectSong(index, true);
    }

    function togglePlayCurrent() {
        if (currentPlayingIndex !== null) togglePlayPause(currentPlayingIndex);
    }

    function playNext() {
        const nextIndex = isShuffling
            ? Math.floor(Math.random() * songsQueue.length)
            : (currentPlayingIndex ?? -1) + 1;

        if (nextIndex < songsQueue.length) {
            selectSong(nextIndex, true);
        } else {
            getSongEl(currentPlayingIndex)?.classList.remove('playing');
            currentPlayingIndex = null;
            setPlayIcons(false);
            seekSlider.style.background = RESET_BG;
        }
    }

    function playPrevious() {
        const prevIndex = (currentPlayingIndex ?? 0) - 1;
        if (prevIndex >= 0) selectSong(prevIndex, true);
    }

    function formatTime(seconds) {
        if (!isFinite(seconds)) return '0:00';
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    }

    function togglePlayer() {
        player.classList.toggle('expanded');
        player.classList.toggle('collapsed');
        songsList.style.marginBottom = player.classList.contains('expanded') ? '500px' : '130px';
    }

    function cycleRepeatState() {
        repeatState = repeatState === 'order' ? 'repeat_one' : 'order';
        audio.loop = repeatState === 'repeat_one';
        repeatIcon.classList.toggle('active', audio.loop);
        repeatIcon.textContent = audio.loop ? 'repeat_one' : 'text_rotation_none';
    }

    function toggleShuffle() {
        isShuffling = !isShuffling;
        shuffleIcon.textContent = isShuffling ? 'shuffle_on' : 'shuffle';
        shuffleIcon.classList.toggle('active', isShuffling);
    }

    songsList.addEventListener('click', (e) => {
        const nameEl = e.target.closest('.song-name');
        if (nameEl) togglePlayPause(Number(nameEl.dataset.index));
    });

    audio.addEventListener('play', () => {
      setPlayIcons(true);
      const song = songsQueue[currentPlayingIndex];
      if (song) document.title = `${song.name} - Audio | Music Player`;
    });
    audio.addEventListener('pause', () => setPlayIcons(false));
    audio.addEventListener('timeupdate', () => {
        if (!isFinite(audio.duration)) return;
        seekSlider.max = audio.duration;
        seekSlider.value = audio.currentTime;
        if (currentTimeEl) currentTimeEl.textContent = formatTime(audio.currentTime);
        seekSlider.style.setProperty('--progress', `${(audio.currentTime / audio.duration) * 100}%`);
    });
    audio.addEventListener('loadedmetadata', () => {
        if (totalDurationEl) totalDurationEl.textContent = formatTime(audio.duration);
        seekSlider.style.setProperty('--progress', '0%');
    });
    audio.addEventListener('ended', () => {
        if (repeatState !== 'repeat_one') playNext();
    });

    audio.addEventListener('error', () => {
        const song = songsQueue[currentPlayingIndex];
        console.warn('[audio-player] Could not load:', song?.name, '->', audio.currentSrc || audio.src, '(error code ' + audio.error?.code + ')');
    });

    dragToggle?.addEventListener('click', togglePlayer);
    repeatBtn?.addEventListener('click', cycleRepeatState);
    shuffleBtn?.addEventListener('click', toggleShuffle);
    mainPlayPause?.addEventListener('click', togglePlayCurrent);
    minPlayPause?.addEventListener('click', togglePlayCurrent);
    prevBtn?.addEventListener('click', playPrevious);
    nextBtn?.addEventListener('click', playNext);
    prevBtnExpanded?.addEventListener('click', playPrevious);
    nextBtnExpanded?.addEventListener('click', playNext);
    seekSlider?.addEventListener('input', () => { audio.currentTime = seekSlider.value; });

    let startY = 0;
    player.addEventListener('touchstart', (e) => { startY = e.touches[0].clientY; }, { passive: true });
    player.addEventListener('touchend', (e) => {
        const deltaY = e.changedTouches[0].clientY - startY;
        if (Math.abs(deltaY) > 50) {
            if (deltaY < 0 && !player.classList.contains('expanded')) togglePlayer();
            else if (deltaY > 0 && !player.classList.contains('collapsed')) togglePlayer();
        }
    });

    window.addEventListener('load', () => {
        setTimeout(() => {
            const preloader = $('preloader');
            if (!preloader) return;
            preloader.style.opacity = '0';
            preloader.style.transition = 'opacity 1s ease';
            setTimeout(() => {
                preloader.querySelector('img')?.remove();
                preloader.remove();
            }, 500);
        }, 1000);
    });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadSongsProgressively);
    } else {
        loadSongsProgressively();
    }
})();