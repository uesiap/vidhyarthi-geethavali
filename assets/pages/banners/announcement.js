fetch("/vidhyarthi-geethavali/assets/pages/banners/announcement.html")
    .then(res => res.text())
    .then(html => {
        document.getElementById("announcement-placeholder").innerHTML = html;
        initAnnouncement();
    })
    .catch(err => console.error("Failed to load announcement:", err));

function initAnnouncement() {
    const announcement = document.getElementById("announcement");
    const announcementArrow = document.getElementById("announcementArrow");

    function updateAnnouncementArrow() {
        announcementArrow.textContent = announcement.classList.contains("open") ? "expand_less" : "expand_more";
    }
    function openAnnouncement() {
        announcement.classList.add("open");
        updateAnnouncementArrow();
    }
    function closeAnnouncement() {
        announcement.classList.remove("open");
        updateAnnouncementArrow();
    }

    // Expose toggle globally since it's called via inline onclick in the fetched HTML
    window.toggleAnnouncement = function () {
        announcement.classList.toggle("open");
        updateAnnouncementArrow();
    };

    openAnnouncement();
    setTimeout(closeAnnouncement, 2000);
}
