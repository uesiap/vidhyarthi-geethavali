async function loadComponent(id, file) {
    const element = document.getElementById(id);
    if (!element) return;
    try {
        const response = await fetch(file);
        if (!response.ok) {
            throw new Error(`Failed to load ${file}`);
        }
        element.innerHTML = await response.text();
    } catch (error) {
        console.error(error);
    }
}
Promise.all([
    loadComponent("navbar", "navbar"),
    loadComponent("footer", "footer")
]).then(() => {
    // Set footer year
    const year = document.getElementById("current-yr");
    if (year) {
        year.textContent = new Date().getFullYear();
    }
    // Initialize navbar after it exists
    if (typeof initNavbar === "function") {
        initNavbar();
    }
});
