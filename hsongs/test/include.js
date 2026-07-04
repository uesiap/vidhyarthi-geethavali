async function loadComponent(id, file) {
    const res = await fetch(file);
    document.getElementById(id).innerHTML = await res.text();

    // Footer year
    if (id === "footer") {
        document.getElementById("current-yr").textContent =
            new Date().getFullYear();
    }

    // Navbar initialization
    if (id === "navbar") {
        initNavbar();
    }
}

loadComponent("navbar", "navbar.html");
loadComponent("footer", "footer.html");