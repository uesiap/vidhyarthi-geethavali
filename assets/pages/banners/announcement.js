window.loadAnnouncement = function () {
    const placeholder = document.getElementById("announcement-placeholder");
    if (!placeholder) {
        console.warn("announcement-placeholder not found on this page — skipping announcement banner.");
        return;
    }

    fetch("/vidhyarthi-geethavali/assets/pages/banners/announcement.html")
        .then(res => res.text())
        .then(html => {
            placeholder.innerHTML = html;
            initAnnouncement();
        })
        .catch(err => console.error("Failed to load announcement:", err));
};

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

    window.toggleAnnouncement = function () {
        announcement.classList.toggle("open");
        updateAnnouncementArrow();
    };

    // Stay closed for 2s, open, stay open for 2s, then close
    setTimeout(() => {
        openAnnouncement();
        setTimeout(closeAnnouncement, 2000);
    }, 2000);
}
