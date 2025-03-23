




//--------------------Switching between Login and Register Modals----------------------//

document.addEventListener('DOMContentLoaded', () => {
    // Get the modals
    const loginModal = document.getElementById('login');
    const registerModal = document.getElementById('register');
    
    // Get all interactive elements
    const registerLink = document.querySelector('.register-link');
    const loginLink = document.querySelector('.login-link');
    const loginButton = document.querySelector('[data-bs-target="#login"]');
    const registerButton = document.querySelector('[data-bs-target="#register"]');
    
    // Initialize Bootstrap modals
    const loginBsModal = new bootstrap.Modal(loginModal);
    const registerBsModal = new bootstrap.Modal(registerModal);
    
    // Function to handle modal switching
    function switchModals(fromModal, toModal) {
        fromModal.hide();
        setTimeout(() => {
            toModal.show();
        }, 200);
    }
    
    // Switch to Register
    registerLink.addEventListener('click', (e) => {
        e.preventDefault();
        switchModals(loginBsModal, registerBsModal);
    });
    
    // Switch to Login
    loginLink.addEventListener('click', (e) => {
        e.preventDefault();
        switchModals(registerBsModal, loginBsModal);
    });

    // Handle modal close events
    loginModal.addEventListener('hidden.bs.modal', () => {
        loginModal.querySelector('form').reset();
        // Remove backdrop manually if it exists
        const backdrop = document.querySelector('.modal-backdrop');
        if (backdrop) {
            backdrop.remove();
        }
        // Remove modal-open class from body
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
    });

    registerModal.addEventListener('hidden.bs.modal', () => {
        registerModal.querySelector('form').reset();
        // Remove backdrop manually if it exists
        const backdrop = document.querySelector('.modal-backdrop');
        if (backdrop) {
            backdrop.remove();
        }
        // Remove modal-open class from body
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
    });

    // Handle button clicks
    loginButton.addEventListener('click', (e) => {
        e.preventDefault();
        if (registerModal.classList.contains('show')) {
            registerBsModal.hide();
        }
        setTimeout(() => {
            loginBsModal.show();
        }, 200);
    });

    registerButton.addEventListener('click', (e) => {
        e.preventDefault();
        if (loginModal.classList.contains('show')) {
            loginBsModal.hide();
        }
        setTimeout(() => {
            registerBsModal.show();
        }, 200);
    });

    // Clean up modal-related classes and elements when clicking outside
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            const backdrop = document.querySelector('.modal-backdrop');
            if (backdrop) {
                backdrop.remove();
            }
            document.body.classList.remove('modal-open');
            document.body.style.overflow = '';
            document.body.style.paddingRight = '';
        }
    });
});

//--------------------Switching between Login and Register Modals close----------------------//



//--------------------Login Validation----------------------//

// Add to your login success handler
const handleLoginSuccess = () => {
    localStorage.setItem('isLoggedIn', 'true');
    // Get map instance and update markers
    const map = window.streetlightMap; // Assuming you've stored your map instance globally
    if (map) {
        map.updateMarkersVisibility();
    }
};

// Add to your logout handler
const handleLogout = () => {
    localStorage.setItem('isLoggedIn', 'false');
    // Get map instance and update markers
    const map = window.streetlightMap;
    if (map) {
        map.updateMarkersVisibility();
    }
};

// Add to your DOMContentLoaded event
document.addEventListener('DOMContentLoaded', () => {
    // Initialize login state if not set
    if (!localStorage.getItem('isLoggedIn')) {
        localStorage.setItem('isLoggedIn', 'false');
    }
    
    // Update markers visibility based on initial login state
    const map = window.streetlightMap;
    if (map) {
        map.updateMarkersVisibility();
    }
});















