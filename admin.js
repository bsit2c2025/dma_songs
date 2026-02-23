// Admin functionality
const ADMIN_PASSWORD = 'admin123'; // Simple password, change as needed

// Get modal elements
const loginModal = document.getElementById('admin-login-modal');
const panelModal = document.getElementById('admin-panel-modal');
const adminLink = document.getElementById('admin-link');

// Get close buttons
const closeButtons = document.getElementsByClassName('close');

// Get forms
const loginForm = document.getElementById('login-form');
const adminForm = document.getElementById('admin-form');

// Announcement elements (only on index.html)
const announceDate = document.getElementById('announce-date');
const announceEvent = document.getElementById('announce-event');
const announceTime = document.getElementById('announce-time');
const announceWhere = document.getElementById('announce-where');
const announceDress = document.getElementById('announce-dress');
const announceSong = document.getElementById('announce-song');

// Form inputs (only on index.html)
const dateInput = document.getElementById('announce-date-input');
const eventInput = document.getElementById('announce-event-input');
const timeInput = document.getElementById('announce-time-input');
const whereInput = document.getElementById('announce-where-input');
const dressInput = document.getElementById('announce-dress-input');
const songInput = document.getElementById('announce-song-input');

// Load saved data on page load
window.onload = function() {
    if (announceDate) loadAnnouncementData();
};

// Admin link click
if (adminLink) {
    adminLink.onclick = function(e) {
        e.preventDefault();
        if (sessionStorage.getItem('adminLoggedIn') === 'true') {
            showAdminPanel();
        } else {
            showLoginModal();
        }
    };
}

// Close modals
for (let closeBtn of closeButtons) {
    if (closeBtn) {
        closeBtn.onclick = function() {
            if (loginModal) loginModal.style.display = 'none';
            if (panelModal) panelModal.style.display = 'none';
        };
    }
}

// Click outside modal to close
window.onclick = function(event) {
    if (event.target == loginModal) {
        loginModal.style.display = 'none';
    }
    if (event.target == panelModal) {
        panelModal.style.display = 'none';
    }
};

// Login form submit
if (loginForm) {
    loginForm.onsubmit = function(e) {
        e.preventDefault();
        const password = document.getElementById('password').value;
        if (password === ADMIN_PASSWORD) {
            sessionStorage.setItem('adminLoggedIn', 'true');
            loginModal.style.display = 'none';
            showAdminPanel();
        } else {
            alert('Incorrect password');
        }
    };
}

// Admin form submit (for announcement)
if (adminForm && announceDate) {
    adminForm.onsubmit = function(e) {
        e.preventDefault();
        saveAnnouncementData();
        panelModal.style.display = 'none';
        loadAnnouncementData();
        alert('Changes saved!');
    };
}

// Functions
function showLoginModal() {
    if (loginModal) loginModal.style.display = 'block';
}

function showAdminPanel() {
    if (announceDate) {
        // Load current values into form
        dateInput.value = announceDate.textContent;
        eventInput.value = announceEvent.textContent;
        timeInput.value = announceTime.textContent;
        whereInput.value = announceWhere.textContent;
        dressInput.value = announceDress.textContent;
        songInput.value = announceSong.textContent;
    }
    if (panelModal) panelModal.style.display = 'block';
}

function saveAnnouncementData() {
    const data = {
        date: dateInput.value,
        event: eventInput.value,
        time: timeInput.value,
        where: whereInput.value,
        dress: dressInput.value,
        song: songInput.value
    };
    localStorage.setItem('announcementData', JSON.stringify(data));
}

function loadAnnouncementData() {
    const data = JSON.parse(localStorage.getItem('announcementData'));
    if (data) {
        announceDate.textContent = data.date;
        announceEvent.textContent = data.event;
        announceTime.textContent = data.time;
        announceWhere.textContent = data.where;
        announceDress.textContent = data.dress;
        announceSong.textContent = data.song;
    }
}