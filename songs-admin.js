// Songs admin functionality for voice pages

// Get video elements
const videos = document.querySelectorAll('video source');

// Load saved video sources on page load
window.addEventListener('load', function() {
    loadVideoSources();
});

// Override admin form submit to include videos
if (adminForm) {
    adminForm.onsubmit = function(e) {
        e.preventDefault();
        saveVideoSources();
        panelModal.style.display = 'none';
        loadVideoSources();
        alert('Changes saved!');
    };
}

// Override showAdminPanel to load video values
const originalShowPanel = showAdminPanel;
showAdminPanel = function() {
    // Load video sources into form
    videos.forEach((source, index) => {
        const inputId = `video-${index}`;
        let input = document.getElementById(inputId);
        if (!input) {
            // Create input if not exists
            input = document.createElement('input');
            input.type = 'text';
            input.id = inputId;
            const label = document.createElement('label');
            label.htmlFor = inputId;
            label.textContent = `Video ${index + 1} URL:`;
            adminForm.insertBefore(label, adminForm.lastElementChild);
            adminForm.insertBefore(input, adminForm.lastElementChild);
        }
        input.value = source.src;
    });
    if (originalShowPanel) originalShowPanel();
    else if (panelModal) panelModal.style.display = 'block';
};

function saveVideoSources() {
    const data = {};
    videos.forEach((source, index) => {
        const input = document.getElementById(`video-${index}`);
        if (input) data[`video-${index}`] = input.value;
    });
    localStorage.setItem(`${window.location.pathname}-videos`, JSON.stringify(data));
}

function loadVideoSources() {
    const data = JSON.parse(localStorage.getItem(`${window.location.pathname}-videos`));
    if (data) {
        videos.forEach((source, index) => {
            if (data[`video-${index}`]) {
                source.src = data[`video-${index}`];
                source.parentElement.load(); // Reload video
            }
        });
    }
}