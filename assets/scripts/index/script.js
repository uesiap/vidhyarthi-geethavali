const teluguLetters = ["అ","ఆ","ఇ","ఈ","ఉ","ఊ","ఎ","ఏ","ఒ","ఓ","క","గ","ఘ","చ","జ","త","ద","న","ప","భ","మ","య","ర","ల","వ","శ","స","హ"];
const englishLetters = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i)).filter(l => l !== 'Q' && l !== 'X');

const letterDiv = document.getElementById('letters');
const songList = document.getElementById('songs');
const titleEl = document.getElementById('title');
const ssl = document.getElementById('ssl');
const selLis = document.getElementById('sel-lis');
const trebo = '/vidhyarthi-geethavali/data';
const piece = 50; const buisc = 'vg-v3';
const noSongsMessage = document.getElementById('noSongsMessage');

const songIndex = { telugu: {}, english: {}, hindi: [], albums: {} };
const fetched = { telugu: new Set(), english: new Set(), hindi: new Set(), albums: {} };
const knownChunks = { telugu: null, english: null, hindi: null };
const letterMap = { telugu: {}, english: {} };
const langInited = { telugu: false, english: false, hindi: false, albums: false };
const inFlight = { telugu: {}, english: {}, hindi: {} };
let albumList = [];
const inFlightAlbums = {};

const LANG_FOLDER = { telugu: 'tsongs', english: 'esongs', hindi: 'hsongs' };
const fullyLoaded = { telugu: false, english: false, hindi: false, albums: false };
window.fullyLoaded = fullyLoaded;

let currentLanguage = 'telugu';
window.currentLanguage = currentLanguage;
let currentQuery = '';

(function injectSpinCSS() {
    if (document.getElementById('vg-spin-css')) return;
    const s = document.createElement('style');
    s.id = 'vg-spin-css';
    s.textContent = '@keyframes vg-spin{to{transform:rotate(360deg)}}';
    document.head.appendChild(s);
})();

function openSongRequestDialog() {
    const dialog = document.getElementById("songRequestDialog");
    const overlay = document.getElementById("menuOverlay");
    closeAllMenus();
    if (dialog) dialog.style.display = "block";
    if (overlay) overlay.style.display = "block";
}

function closeSongRequestDialog() {
    const dialog = document.getElementById("songRequestDialog");
    const overlay = document.getElementById("menuOverlay");
    if (dialog) dialog.style.display = "none";
    if (overlay) overlay.style.display = "none";
}

function closeAllMenus() {
    const feedbackMenu = document.getElementById("feedbackMenu");
    const songRequestDialog = document.getElementById("songRequestDialog");
    const overlay = document.getElementById("menuOverlay");
    if (feedbackMenu) feedbackMenu.style.display = "none";
    if (songRequestDialog) songRequestDialog.style.display = "none";
    if (overlay) overlay.style.display = "none";
}

const songRequestForm = document.getElementById("songRequestForm");
const songRequestSubmitBtn = document.getElementById("songRequestSubmitBtn");
const songRequestStatus = document.getElementById("songRequestStatus");

songRequestForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    songRequestSubmitBtn.disabled = true;
    songRequestSubmitBtn.textContent = "Sending...";
    songRequestStatus.style.display = "none";
    songRequestStatus.textContent = "";

    const formData = new FormData(songRequestForm);
    const json = JSON.stringify(Object.fromEntries(formData));

    try {
        const response = await fetch("https://api.web3forms.com/submit", {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: json
        });
        const result = await response.json();

        if (result.success) {
            songRequestStatus.style.display = "block";
            songRequestStatus.style.background = "rgba(18, 140, 126, 0.1)";
            songRequestStatus.style.color = "var(--primary-dark)";
            songRequestStatus.style.border = "1px solid var(--primary-color)";
            songRequestStatus.textContent = "✅ Thanks! Your request has been sent.";
            songRequestForm.reset();
            setTimeout(closeSongRequestDialog, 1800);
        } else {
            songRequestStatus.style.display = "block";
            songRequestStatus.style.background = "rgba(235, 105, 107, 0.1)";
            songRequestStatus.style.color = "#c0392b";
            songRequestStatus.style.border = "1px solid #EB696B";
            songRequestStatus.textContent = result.message || "Something went wrong. Please try again.";
        }
    } catch (error) {
        songRequestStatus.style.display = "block";
        songRequestStatus.style.background = "rgba(235, 105, 107, 0.1)";
        songRequestStatus.style.color = "#c0392b";
        songRequestStatus.style.border = "1px solid #EB696B";
        songRequestStatus.textContent = "Network error. Please check your connection and try again.";
    } finally {
        songRequestSubmitBtn.disabled = false;
        songRequestSubmitBtn.textContent = "Send Request";
    }
});

function toggleFeedbackMenu() {
    const menu = document.getElementById("feedbackMenu");
    const overlay = document.getElementById("menuOverlay");
    const isVisible = menu && menu.style.display === "block";
    closeAllMenus();
    if (!isVisible) {
        if (menu) menu.style.display = "block";
        if (overlay) overlay.style.display = "block";
    }
}

function shareLink() {
    const shareData = { title: document.title, url: window.location.href };
    if (navigator.share) {
        navigator.share(shareData).catch(err => console.log("Share cancelled or failed:", err));
    } else {
        navigator.clipboard.writeText(window.location.href).then(() => {}).catch(() => {});
    }
    closeAllMenus();
}

function showSongListLoader(label) {
    if (label) titleEl.textContent = `"${label}"`;
    songList.innerHTML = `
        <li style="list-style:none;display:flex;align-items:center;gap:10px;
                  padding:.9rem 0;color:var(--text-color,#555)">
          <div style="width:20px;height:20px;border:3px solid rgba(0,0,0,.12);
                      border-top-color:var(--primary-color,#128C7E);border-radius:50%;
                      flex-shrink:0;animation:vg-spin .7s linear infinite"></div>
          <span style="font-size:13px;font-weight:500">Loading songs…</span>
        </li>`;
}

if (window.loadAnnouncement) window.loadAnnouncement();

function ck(url) { return buisc + '|' + url; }
function ckChunks(lang) { return buisc + '|chunks|' + lang; }
function ckAlbumsManifest() { return buisc + '|albums-manifest'; }

function cacheGet(url) {
    try { const v = sessionStorage.getItem(ck(url)); return v ? JSON.parse(v) : null; }
    catch (e) { return null; }
}
function cacheSet(url, data) {
    try { sessionStorage.setItem(ck(url), JSON.stringify(data)); }
    catch (e) {
        purgeStaleCacheEntries();
        try { sessionStorage.setItem(ck(url), JSON.stringify(data)); } catch (e2) {}
    }
}
function purgeStaleCacheEntries() {
    const prefix = buisc + '|';
    const drop = [];
    for (let i = 0; i < sessionStorage.length; i++) {
        const k = sessionStorage.key(i);
        if (k && !k.startsWith(prefix)) drop.push(k);
    }
    drop.forEach(k => sessionStorage.removeItem(k));
}

const MAX_PROBE = 20;
const BATCH = 5;

async function discoverChunks(lang) {
    if (knownChunks[lang]) return knownChunks[lang];

    try {
        const cached = sessionStorage.getItem(ckChunks(lang));
        if (cached) {
            const parsed = JSON.parse(cached);
            knownChunks[lang] = parsed.chunks;
            if (parsed.letterMap) letterMap[lang] = parsed.letterMap;
            return knownChunks[lang];
        }
    } catch (e) {}

    const folder = LANG_FOLDER[lang];

    try {
        const mres = await fetch(`${trebo}/${folder}/manifest.json?v=${Date.now()}`, { cache: 'no-store' });
        if (mres.ok) {
            const md = await mres.json();
            if (Array.isArray(md.chunks) && md.chunks.length) {
                knownChunks[lang] = md.chunks;
                if (md.letterMap) letterMap[lang] = md.letterMap;
                try {
                    sessionStorage.setItem(ckChunks(lang), JSON.stringify({
                        chunks: md.chunks,
                        letterMap: md.letterMap || {}
                    }));
                } catch (e) {}
                return knownChunks[lang];
            }
        }
    } catch (e) {}

    const url = n => `${trebo}/${folder}/${n}/list.json?v=${Date.now()}`;
    const ceil = (start, count) => Array.from({ length: count }, (_, i) => (start + i + 1) * piece);
    const probe = async n => {
        try { const r = await fetch(url(n), { method: 'HEAD' }); return r.ok ? n : null; }
        catch (e) { return null; }
    };

    let found = (await Promise.all(ceil(0, MAX_PROBE).map(probe))).filter(Boolean);
    if (found.length === MAX_PROBE) {
        let next = MAX_PROBE;
        while (true) {
            const hits = (await Promise.all(ceil(next, BATCH).map(probe))).filter(Boolean);
            found = found.concat(hits);
            if (hits.length < BATCH) break;
            next += BATCH;
        }
    }
    found.sort((a, b) => a - b);
    knownChunks[lang] = found;
    try { sessionStorage.setItem(ckChunks(lang), JSON.stringify({ chunks: found, letterMap: {} })); } catch (e) {}
    return found;
}

async function discoverAlbums() {
    if (albumList.length) return albumList;
    try {
        const cached = sessionStorage.getItem(ckAlbumsManifest());
        if (cached) { albumList = JSON.parse(cached); return albumList; }
    } catch (e) {}

    try {
        const res = await fetch(`${trebo}/albums/manifest.json?v=${Date.now()}`, { cache: 'no-store' });
        if (res.ok) {
            const md = await res.json();
            if (Array.isArray(md.albums)) {
                albumList = md.albums;
                try { sessionStorage.setItem(ckAlbumsManifest(), JSON.stringify(albumList)); } catch (e) {}
            }
        }
    } catch (e) {}
    return albumList;
}

async function fetchAlbumChunk(folder, ceiling) {
    const url = `${trebo}/${folder}/${ceiling}/list.json`;
    if (inFlightAlbums[url]) return inFlightAlbums[url];

    const hit = cacheGet(url);
    if (hit) return hit;

    inFlightAlbums[url] = (async () => {
        try {
            const res = await fetch(`${url}?v=${Date.now()}`);
            if (!res.ok) return {};
            const data = await res.json();
            cacheSet(url, data);
            return data;
        } finally {
            delete inFlightAlbums[url];
        }
    })();
    return inFlightAlbums[url];
}

function ingestAlbum(albumId, raw, folder, tag) {
    if (!songIndex.albums[albumId]) songIndex.albums[albumId] = [];
    Object.entries(raw).forEach(([num, song]) => {
        if (!song.title) return;
        if (tag && song.remarks !== tag) return;
        const id = `song${num}`;
        if (!songIndex.albums[albumId].find(s => s.id === id))
            songIndex.albums[albumId].push({ id, name: `${song.title} (${num})`, tp: folder, lang: 'albums' });
    });
    songIndex.albums[albumId].sort((a, b) => numOf(a.id) - numOf(b.id));
}

async function ensureAlbumHasSongs(albumId) {
    if ((songIndex.albums[albumId] || []).length > 0) return;
    const album = albumList.find(a => a.id === albumId);
    if (!album) return;

    if (!fetched.albums[albumId]) fetched.albums[albumId] = new Set();
    const missing = (album.chunks || []).filter(c => !fetched.albums[albumId].has(c));
    for (const c of missing) {
        const raw = await fetchAlbumChunk(album.folder, c);
        ingestAlbum(albumId, raw, album.folder, album.tag);
        fetched.albums[albumId].add(c);
    }
}

async function fetchChunk(lang, ceiling) {
    const folder = LANG_FOLDER[lang];
    const url = `${trebo}/${folder}/${ceiling}/list.json`;

    if (inFlight[lang][ceiling]) return inFlight[lang][ceiling];

    const hit = cacheGet(url);
    if (hit) return hit;

    inFlight[lang][ceiling] = (async () => {
        try {
            const res = await fetch(`${url}?v=${Date.now()}`);
            if (!res.ok) return {};
            const data = await res.json();
            cacheSet(url, data);
            return data;
        } finally {
            delete inFlight[lang][ceiling];
        }
    })();

    return inFlight[lang][ceiling];
}

function numOf(id) { return parseInt((id || '').replace('song', ''), 10) || 0; }

function ingestTelugu(raw) {
    teluguLetters.forEach(l => { if (!songIndex.telugu[l]) songIndex.telugu[l] = []; });
    Object.entries(raw).forEach(([num, song]) => {
        if (!song.title) return;
        let firstLetter = song.title.charAt(0);
        if (firstLetter === "ధ") firstLetter = "ద";
        const letter = teluguLetters.find(l => l === firstLetter);
        if (!letter) return;
        const id = `song${num}`;
        if (!songIndex.telugu[letter].find(s => s.id === id))
            songIndex.telugu[letter].push({ id, name: `${song.title} (${num})`, tp: 'tsongs', lang: 'telugu' });
    });
    teluguLetters.forEach(l => songIndex.telugu[l].sort((a, b) => numOf(a.id) - numOf(b.id)));
}

function ingestEnglish(raw) {
    englishLetters.forEach(l => { if (!songIndex.english[l]) songIndex.english[l] = []; });
    Object.entries(raw).forEach(([num, song]) => {
        if (!song.title) return;
        const letter = song.title.charAt(0).toUpperCase();
        if (!songIndex.english[letter]) return;
        const id = `song${num}`;
        if (!songIndex.english[letter].find(s => s.id === id))
            songIndex.english[letter].push({ id, name: `${song.title} (${num})`, tp: 'esongs', lang: 'english' });
    });
    englishLetters.forEach(l => songIndex.english[l].sort((a, b) => numOf(a.id) - numOf(b.id)));
}

function ingestHindi(raw) {
    Object.entries(raw).forEach(([num, song]) => {
        if (!song.title) return;
        const id = `song${num}`;
        if (!songIndex.hindi.find(s => s.id === id))
            songIndex.hindi.push({ id, name: `${song.title} (${num})`, tp: 'hsongs', lang: 'hindi' });
    });
    songIndex.hindi.sort((a, b) => numOf(a.id) - numOf(b.id));
}

async function ensureLetterHasSongs(lang, letter) {
    const idx = lang === 'telugu' ? songIndex.telugu : songIndex.english;
    const ingest = lang === 'telugu' ? ingestTelugu : ingestEnglish;

    if ((idx[letter] || []).length > 0) return;

    const ceilings = letterMap[lang][letter];

    if (ceilings && ceilings.length) {
        const missing = ceilings.filter(c => !fetched[lang].has(c));
        await Promise.all(missing.map(async c => {
            const raw = await fetchChunk(lang, c);
            ingest(raw);
            fetched[lang].add(c);
        }));
    } else {
        const chunks = knownChunks[lang] || [];
        for (const c of chunks) {
            if ((idx[letter] || []).length > 0) break;
            if (fetched[lang].has(c)) continue;
            const raw = await fetchChunk(lang, c);
            ingest(raw);
            fetched[lang].add(c);
        }
    }
}

async function initTelugu() {
    if (langInited.telugu) return;
    langInited.telugu = true;

    renderLetterBoxes(teluguLetters, 'telugu');
    showSongListLoader(teluguLetters[0]);

    const chunks = await discoverChunks('telugu');
    if (chunks.length) {
        const raw = await fetchChunk('telugu', chunks[0]);
        ingestTelugu(raw);
        fetched.telugu.add(chunks[0]);
    }

    titleEl.textContent = `"${teluguLetters[0]}"`;
    renderSongItems(songIndex.telugu[teluguLetters[0]] || [], 'telugu');
}

async function initEnglish() {
    if (langInited.english) return;
    langInited.english = true;

    renderLetterBoxes(englishLetters, 'english');
    showSongListLoader(englishLetters[0]);

    const chunks = await discoverChunks('english');
    if (chunks.length) {
        const raw = await fetchChunk('english', chunks[0]);
        ingestEnglish(raw);
        fetched.english.add(chunks[0]);
    }

    titleEl.textContent = `"${englishLetters[0]}"`;
    renderSongItems(songIndex.english[englishLetters[0]] || [], 'english');
}

async function initHindi() {
    if (langInited.hindi) return;
    langInited.hindi = true;

    titleEl.textContent = '"Hindi"';
    showSongListLoader();

    const chunks = await discoverChunks('hindi');
    for (const ceiling of chunks) {
        if (fetched.hindi.has(ceiling)) continue;
        const raw = await fetchChunk('hindi', ceiling);
        ingestHindi(raw);
        fetched.hindi.add(ceiling);
    }
    renderSongItems(songIndex.hindi, 'hindi');
}

function renderLetterBoxes(letters, lang) {
    letterDiv.classList.remove('album-grid');
    letterDiv.innerHTML = '';
    songList.innerHTML = '';
    titleEl.textContent = '';
    selLis.textContent = lang.charAt(0).toUpperCase() + lang.slice(1);

    letters.forEach((letter, index) => {
        const box = document.createElement('div');
        box.className = 'box' + (index === 0 ? ' active' : '');
        box.textContent = letter;

        box.onclick = async () => {
            document.querySelectorAll('.box').forEach(b => b.classList.remove('active'));
            box.classList.add('active');

            const idx = lang === 'telugu' ? songIndex.telugu : songIndex.english;

            if (!(idx[letter] || []).length) {
                showSongListLoader(letter);
                await ensureLetterHasSongs(lang, letter);
            }

            titleEl.textContent = `"${letter}"`;
            renderSongItems(idx[letter] || [], lang);
            if (currentQuery) filterSongs(currentQuery);
            scrollToSongs();
        };

        letterDiv.appendChild(box);
    });
}

let _phoneticSearchLoading = false;
function loadPhoneticSearch() {
    if (_phoneticSearchLoading || window._phoneticSearchReady) return;
    _phoneticSearchLoading = true;

    const s = document.createElement('script');
    s.src = `/vidhyarthi-geethavali/assets/scripts/phonetic.js?v=${Date.now()}`;
    s.onerror = () => console.warn('[phonetic-search] failed to load script');
    document.head.appendChild(s);
}

function renderSongItems(songs, lang, tpOverride) {
    songList.innerHTML = '';
    noSongsMessage.classList.add('hidden');
    if (!songs || !songs.length) {
        const li = document.createElement('li');
        li.textContent = 'Songs not added yet';
        songList.appendChild(li);
        return;
    }
    const defaultTp = tpOverride || (lang === 'telugu' ? 'tsongs' : lang === 'english' ? 'esongs' : 'hsongs');
    const labels = { telugu: 'తెలుగు', english: 'English', hindi: 'Hindi', albums: 'New' };

    songs.forEach(song => {
        const sn = song.id.replace('song', '');
        const tp = song.tp || defaultTp;
        const songLang = song.lang || lang;

        const li = document.createElement('li');
        li.dataset.lang = songLang;

        const a = document.createElement('a');
        a.href = `/vidhyarthi-geethavali/song/?tp=${tp}&sn=${sn}`;
        a.className = 'song-link';
        const match = song.name.match(/^(.*?)(\s*\(\d+\))$/);
        const titleText = match ? match[1] : song.name;
        const numText = match ? match[2].trim() : '';
        const titleSpan = document.createElement('span');
        titleSpan.className = 'song-title';
        titleSpan.textContent = titleText;
        a.appendChild(titleSpan);
        if (numText) {
            const numSpan = document.createElement('span');
            numSpan.className = 'song-num';
            numSpan.textContent = numText;
            a.appendChild(numSpan);
        }
        if (lang === '__search__' && songLang !== window.currentLanguage) {
            const tag = document.createElement('span');
            tag.className = 'song-lang-tag';
            tag.textContent = labels[songLang] || songLang;
            tag.style.cssText = 'margin-left:8px;padding:1px 8px;border-radius:10px;font-size:11px;' +
                'background:rgba(18,140,126,.12);color:var(--primary-color,#128C7E);flex-shrink:0';
            a.appendChild(tag);
        }
        li.appendChild(a);
        songList.appendChild(li);
    });
}

function renderAlbumBoxes(albums) {
    letterDiv.innerHTML = '';
    letterDiv.classList.add('album-grid');
    songList.innerHTML = '';
    titleEl.textContent = '';
    selLis.textContent = 'New Album';

    albums.forEach((album, index) => {
        const box = document.createElement('div');
        box.className = 'box album-box' + (index === 0 ? ' active' : '');
        box.textContent = album.name;

        box.onclick = async () => {
            document.querySelectorAll('.box').forEach(b => b.classList.remove('active'));
            box.classList.add('active');

            if (!(songIndex.albums[album.id] || []).length) {
                showSongListLoader(album.name);
                await ensureAlbumHasSongs(album.id);
            }

            titleEl.textContent = `"${album.name}"`;
            renderSongItems(songIndex.albums[album.id] || [], 'albums', album.folder);
            if (currentQuery) filterSongs(currentQuery);
            scrollToSongs();
        };

        letterDiv.appendChild(box);
    });
}

async function initAlbums() {
    if (langInited.albums) return;
    langInited.albums = true;

    const albums = await discoverAlbums();
    renderAlbumBoxes(albums);

    if (albums.length) {
        showSongListLoader(albums[0].name);
        await ensureAlbumHasSongs(albums[0].id);
        titleEl.textContent = `"${albums[0].name}"`;
        renderSongItems(songIndex.albums[albums[0].id] || [], 'albums', albums[0].folder);
    } else {
        titleEl.textContent = '"New"';
        songList.innerHTML = '<li>No albums found yet</li>';
    }
}

function renderSearchSongs() {
    const all = [].concat(
        Object.values(songIndex.telugu).flat(),
        Object.values(songIndex.english).flat(),
        songIndex.hindi,
        Object.values(songIndex.albums).flat()
    );
    renderSongItems(all, '__search__');
}

function filterSongs(query) {
    const q = (query || '').trim();
    const qLower = q.toLowerCase();
    const links = document.querySelectorAll('#songs .song-link');
    let totalCount = 0;

    const items = [];
    links.forEach(link => {
        const li = link.closest('li') || link.parentElement;
        const isMatch = !q || link.innerText.toLowerCase().includes(qLower);
        li.style.display = isMatch ? '' : 'none';
        if (isMatch) totalCount++;
        items.push({ li, isCurrentTab: li.dataset.lang === window.currentLanguage });
    });

    songList && Array.from(songList.children)
        .sort((a, b) => (b.dataset.lang === window.currentLanguage) - (a.dataset.lang === window.currentLanguage))
        .forEach(li => songList.appendChild(li));

    noSongsMessage.classList.toggle('hidden', !(q.length > 0 && totalCount === 0));
}

let _loadingOtherTabs = false;
window.ensureAllOtherTabsLoaded = function () {
    if (_loadingOtherTabs) return;
    _loadingOtherTabs = true;
    const others = ['telugu', 'english', 'hindi', 'albums'].filter(l => l !== window.currentLanguage);
    Promise.all(others.map(lang => ensureAllChunksLoaded(lang))).finally(() => {
        _loadingOtherTabs = false;
    });
};

async function switchLanguage(lang, event) {
    currentLanguage = lang;
    window.currentLanguage = lang;
    selLis.textContent = lang.charAt(0).toUpperCase() + lang.slice(1);

    if (lang === 'telugu') {
        history.replaceState(null, '', location.pathname);
        letterDiv.classList.remove('hidden');
        ssl.style.display = 'block';
        if (!langInited.telugu) {
            await initTelugu();
        } else {
            renderLetterBoxes(teluguLetters, 'telugu');
            titleEl.textContent = `"${teluguLetters[0]}"`;
            renderSongItems(songIndex.telugu[teluguLetters[0]] || [], 'telugu');
        }
    } else if (lang === 'english') {
        history.replaceState(null, '', '#English');
        letterDiv.classList.remove('hidden');
        ssl.style.display = 'block';
        if (!langInited.english) {
            await initEnglish();
        } else {
            renderLetterBoxes(englishLetters, 'english');
            titleEl.textContent = `"${englishLetters[0]}"`;
            renderSongItems(songIndex.english[englishLetters[0]] || [], 'english');
        }
    } else if (lang === 'hindi') {
        history.replaceState(null, '', '#Hindi');
        letterDiv.innerHTML = '';
        letterDiv.classList.add('hidden');
        ssl.style.display = 'block';
        if (!langInited.hindi) {
            await initHindi();
        } else {
            titleEl.textContent = '"Hindi"';
            renderSongItems(songIndex.hindi, 'hindi');
        }
        if (currentQuery) filterSongs(currentQuery);
    } else if (lang === 'albums') {
        history.replaceState(null, '', '#New');
        letterDiv.classList.remove('hidden');
        ssl.style.display = 'block';
        if (!langInited.albums) {
            await initAlbums();
        } else {
            renderAlbumBoxes(albumList);
            if (albumList.length) {
                titleEl.textContent = `"${albumList[0].name}"`;
                renderSongItems(songIndex.albums[albumList[0].id] || [], 'albums', albumList[0].folder);
            }
        }
        if (currentQuery) filterSongs(currentQuery);
    }

    if (event && event.target) {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        event.target.classList.add('active');
    }
}

const searchToggle = document.getElementById('searchToggle');
const searchBox = document.getElementById('searchBox');
const searchInput = document.getElementById('songSearchInput');
const clearSearch = document.getElementById('clearSearch');
const searchIcon = document.getElementById('searchIcon');
const closeIcon = document.getElementById('closeIcon');

searchToggle.addEventListener('click', async () => {
    const isHidden = searchBox.classList.contains('hidden');
    if (isHidden) {
        searchBox.classList.remove('hidden');
        searchInput.focus();
        document.querySelector('#all-songs').style.display = 'none';
        document.querySelector('#songs-grid').style.display = 'none';
        searchIcon.classList.add('hide-icon');
        closeIcon.classList.remove('hide-icon');
        searchInput.innerText = '';
        currentQuery = '';
        isSearchOpen = true;
        loadPhoneticSearch();

        renderSearchSongs();
        filterSongs('');
        ['telugu', 'english', 'hindi', 'albums'].forEach(lang => ensureAllChunksLoaded(lang));
    } else {
        searchBox.classList.add('hidden');
        searchInput.innerText = '';
        currentQuery = '';
        document.querySelector('#all-songs').style.display = 'block';
        document.querySelector('#songs-grid').style.display = 'block';
        searchIcon.classList.remove('hide-icon');
        closeIcon.classList.add('hide-icon');
        if (currentLanguage === 'telugu') {
            renderLetterBoxes(teluguLetters, 'telugu');
            titleEl.textContent = `"${teluguLetters[0]}"`;
            renderSongItems(songIndex.telugu[teluguLetters[0]] || [], 'telugu');
        } else if (currentLanguage === 'english') {
            renderLetterBoxes(englishLetters, 'english');
            titleEl.textContent = `"${englishLetters[0]}"`;
            renderSongItems(songIndex.english[englishLetters[0]] || [], 'english');
        } else if (currentLanguage === 'albums') {
            renderAlbumBoxes(albumList);
            if (albumList.length) {
                titleEl.textContent = `"${albumList[0].name}"`;
                renderSongItems(songIndex.albums[albumList[0].id] || [], 'albums', albumList[0].folder);
            }
        } else {
            titleEl.textContent = '"Hindi"';
            renderSongItems(songIndex.hindi, 'hindi');
        }
    }
});

let isSearchOpen = false;

async function ensureAllChunksLoaded(lang) {
    if (lang === 'albums') {
        const albums = await discoverAlbums();
        await Promise.all(albums.map(async album => {
            if (!fetched.albums[album.id]) fetched.albums[album.id] = new Set();
            const missing = (album.chunks || []).filter(c => !fetched.albums[album.id].has(c));
            await Promise.all(missing.map(async c => {
                if (!isSearchOpen) return;
                const raw = await fetchAlbumChunk(album.folder, c);
                ingestAlbum(album.id, raw, album.folder, album.tag);
                fetched.albums[album.id].add(c);
                if (isSearchOpen) { renderSearchSongs(); filterSongs(currentQuery); }
            }));
        }));
        return;
    }
    const chunks = knownChunks[lang] || await discoverChunks(lang);
    const ingest = lang === 'telugu' ? ingestTelugu
        : lang === 'english' ? ingestEnglish
        : ingestHindi;
    const missing = chunks.filter(c => !fetched[lang].has(c));
    await Promise.all(missing.map(async ceiling => {
        if (!isSearchOpen) return;
        const raw = await fetchChunk(lang, ceiling);
        ingest(raw);
        fetched[lang].add(ceiling);
        if (isSearchOpen) { renderSearchSongs(); filterSongs(currentQuery); }
    }));
}

searchInput.addEventListener('input', () => {
    currentQuery = searchInput.innerText.toLowerCase().trim();
    clearSearch.style.display = currentQuery ? 'block' : 'none';
    filterSongs(currentQuery);
});

clearSearch.addEventListener('click', () => {
    searchInput.innerText = '';
    currentQuery = '';
    clearSearch.style.display = 'none';
    filterSongs('');
    searchInput.focus();
});

function scrollToSongs() {
    const offset = window.innerWidth <= 768 ? 85 : 100;
    window.scrollTo({ top: ssl.getBoundingClientRect().top + window.scrollY - offset, behavior: 'smooth' });
}

const scrollBtn = document.getElementById('scrollTopBtn');
window.addEventListener('scroll', () => {
    scrollBtn.style.display = window.scrollY > 300 ? 'flex' : 'none';
});
scrollBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

const menuBtn = document.getElementById('menuBtn');
const drawer = document.getElementById('drawer');
const overlay = document.getElementById('overlay');
const submenuItems = document.querySelectorAll('.drawer-item.has-submenu');

const toggleDrawer = () => {
    const isOpen = drawer.classList.toggle('open');
    overlay.classList.toggle('show');
    menuBtn.setAttribute('aria-expanded', isOpen);
    menuBtn.querySelector('.menu-toggle').classList.toggle('open', isOpen);
};
menuBtn.addEventListener('click', toggleDrawer);

overlay.addEventListener('click', () => {
    drawer.classList.remove('open');
    overlay.classList.remove('show');
    menuBtn.setAttribute('aria-expanded', 'false');
    menuBtn.querySelector('.menu-toggle').classList.remove('open');
    submenuItems.forEach(i => { i.classList.remove('open'); i.nextElementSibling?.classList.remove('open'); });
});

document.querySelectorAll('.submenu-item').forEach(link => {
    link.addEventListener('click', () => {
        drawer.classList.remove('open');
        overlay.classList.remove('show');
        menuBtn.setAttribute('aria-expanded', 'false');
        menuBtn.querySelector('.menu-toggle').classList.remove('open');
        submenuItems.forEach(i => i.classList.remove('open'));
        document.querySelectorAll('.submenu').forEach(s => s.classList.remove('open'));
    });
});

submenuItems.forEach(item => {
    item.addEventListener('click', e => {
        e.stopPropagation();
        submenuItems.forEach(o => {
            if (o !== item) { o.classList.remove('open'); o.nextElementSibling?.classList.remove('open'); }
        });
        item.classList.toggle('open');
        item.nextElementSibling?.classList.toggle('open');
    });
    item.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); item.click(); }
    });
});

document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && drawer.classList.contains('open')) {
        drawer.classList.remove('open');
        overlay.classList.remove('show');
        menuBtn.setAttribute('aria-expanded', 'false');
        menuBtn.querySelector('.menu-toggle').classList.remove('open');
    }
    if (e.ctrlKey && e.key === 'm') { e.preventDefault(); toggleDrawer(); }
});

let startX = 0, currentX = 0;
drawer.addEventListener('touchstart', e => { startX = currentX = e.touches[0].clientX; }, { passive: true });
drawer.addEventListener('touchmove', e => { currentX = e.touches[0].clientX; }, { passive: true });
drawer.addEventListener('touchend', () => {
    if (startX - currentX > 50) {
        drawer.classList.remove('open');
        overlay.classList.remove('show');
        menuBtn.setAttribute('aria-expanded', 'false');
    }
}, { passive: true });

document.getElementById('current-yr').textContent = new Date().getFullYear();
purgeStaleCacheEntries();

const _tabs = {
    telugu: document.querySelector('.tab-btn:nth-child(1)'),
    english: document.querySelector('.tab-btn:nth-child(2)'),
    hindi: document.querySelector('.tab-btn:nth-child(3)'),
    albums: document.querySelector('.tab-btn:nth-child(4)')
};
const _hash = location.hash.replace('#', '').toLowerCase();

if (_hash === 'english') switchLanguage('english', { target: _tabs.english });
else if (_hash === 'hindi') switchLanguage('hindi', { target: _tabs.hindi });
else if (_hash === 'new') switchLanguage('albums', { target: _tabs.albums });
else { _tabs.telugu.classList.add('active'); switchLanguage('telugu', { target: _tabs.telugu }); }

setTimeout(async () => {
    const landed = _hash === 'english' ? 'english' : _hash === 'hindi' ? 'hindi' : _hash === 'new' ? 'albums' : 'telugu';
    const others = ['telugu', 'english', 'hindi', 'albums'].filter(l => l !== landed);

    for (const lang of others) {
        if (lang === 'albums') {
            if (Object.keys(fetched.albums).length) continue;
            const albums = await discoverAlbums();
            if (albums.length) {
                const first = albums[0];
                if (!fetched.albums[first.id]) fetched.albums[first.id] = new Set();
                const firstChunk = (first.chunks || [])[0];
                if (firstChunk !== undefined && !fetched.albums[first.id].has(firstChunk)) {
                    const raw = await fetchAlbumChunk(first.folder, firstChunk);
                    ingestAlbum(first.id, raw, first.folder, first.tag);
                    fetched.albums[first.id].add(firstChunk);
                }
            }
        } else {
            if (fetched[lang].size) continue;
            const chunks = await discoverChunks(lang);
            if (chunks.length) {
                const raw = await fetchChunk(lang, chunks[0]);
                const ingest = lang === 'telugu' ? ingestTelugu : lang === 'english' ? ingestEnglish : ingestHindi;
                ingest(raw);
                fetched[lang].add(chunks[0]);
            }
        }
    }
}, 2000);