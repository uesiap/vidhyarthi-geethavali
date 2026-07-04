if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/vidhyarthi-geethavali/assets/pwa/service-worker.js?v={{ site.github.build_revision }}')
        .then(reg => {
            console.log('SW registered:', reg.scope);
        })
        .catch(err => {
            console.error('SW registration failed:', err);
        });
}
