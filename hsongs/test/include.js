async function loadComponent(id, file) {
    const el = document.getElementById(id);
    if (!el) return;

    el.innerHTML = await (await fetch(file)).text();
}

Promise.all([
    loadComponent("navbar", "navbar.html"),
    loadComponent("footer", "footer.html")
]).then(() => {
    document.getElementById("current-yr").textContent = new Date().getFullYear();
    initNavbar();
});
