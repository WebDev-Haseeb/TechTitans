// Firebase configuration and authentication setup
const firebaseConfig = {
    apiKey: "AIzaSyD_Z-NJzLb6T02fEXnzvmFbCQX4xzBvnVU",
    authDomain: "techtitans-e32f4.firebaseapp.com",
    projectId: "techtitans-e32f4",
    storageBucket: "techtitans-e32f4.firebasestorage.app",
    messagingSenderId: "226500400403",
    appId: "1:226500400403:web:19b64fdc1178979a5036e6"
};

// Initialize Firebase if not already initialized
if (!firebase.apps || !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// Set up auth provider
const auth = firebase.auth();
const provider = new firebase.auth.GoogleAuthProvider();
provider.setCustomParameters({
    prompt: 'select_account' // Always prompt users to select an account
});

// Track auth operation state to prevent duplicates
const authStatus = {
    isSigningIn: false,
    isSigningOut: false
};

// Function to handle Google Sign In with improved UX
async function signInWithGoogle() {
    if (authStatus.isSigningIn) return;

    authStatus.isSigningIn = true;

    // Show immediate visual feedback
    showNotification('info', 'Connecting to Google...', 10000); // Longer timeout for sign in

    try {
        const result = await auth.signInWithPopup(provider);
        const user = result.user;
        console.log("User signed in:", user);

        // Remove the connecting notification and show success
        removeNotificationsByType('info');
        updateUIAfterSignIn(user, true);
    } catch (error) {
        console.error("Sign-in error:", error);
        removeNotificationsByType('info');
        showNotification('error', `Sign in failed: ${error.message}`);
    } finally {
        authStatus.isSigningIn = false;
    }
}

// Function to handle sign out with better UX
async function signOut() {
    if (authStatus.isSigningOut) return;

    authStatus.isSigningOut = true;

    showNotification('info', 'Signing out...', 10000);

    try {
        await auth.signOut();
        console.log("User signed out");

        // Clear local storage cache
        localStorage.removeItem('user');

        removeNotificationsByType('info');
        updateUIAfterSignOut(true);
    } catch (error) {
        console.error("Sign out error:", error);
        removeNotificationsByType('info');
        showNotification('error', 'Sign out failed');
    } finally {
        authStatus.isSigningOut = false;
    }
}

// Function to update UI after sign in with optimized Firestore check
function updateUIAfterSignIn(user, showNotificationFlag = false) {
    // Preload user avatar for smoother experience
    if (user.photoURL) {
        preloadImage(user.photoURL)
            .catch(() => console.log("Failed to preload user avatar"));
    }

    // Update the login button
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
        loginBtn.innerHTML = `
            <img src="${user.photoURL || 'assets/images/default-avatar.png'}" alt="Profile" class="user-avatar-small">
            <span class="user-name-small">${user.displayName}</span>
        `;
        loginBtn.setAttribute('href', '#');

        // Remove old event listeners with clean replacement
        const newLoginBtn = loginBtn.cloneNode(true);
        loginBtn.parentNode.replaceChild(newLoginBtn, loginBtn);

        // Add dropdown functionality
        newLoginBtn.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation(); // Prevent click from bubbling

            // Toggle dropdown menu
            let dropdown = document.getElementById('userDropdown');

            if (dropdown) {
                dropdown.remove();
            } else {
                createUserDropdown(this);
            }
        });
    }

    // Check if user exists in Firestore, if not create default profile
    const db = firebase.firestore();

    // Use a cached timestamp to avoid repeated checks on page refresh
    const userCheckKey = `userCheck_${user.uid}`;
    const lastCheck = localStorage.getItem(userCheckKey);
    const now = Date.now();

    // Only check Firestore if we haven't checked recently (last 5 minutes)
    if (!lastCheck || (now - parseInt(lastCheck)) > 300000) {
        db.collection('users').doc(user.uid).get()
            .then(doc => {
                localStorage.setItem(userCheckKey, now.toString());

                if (!doc.exists) {
                    const newUser = {
                        firstName: user.displayName.split(' ')[0] || '',
                        lastName: user.displayName.split(' ').slice(1).join(' ') || '',
                        photoURL: user.photoURL, // Important: store the photo URL
                        bio: '',
                        socialLinks: {
                            linkedin: '',
                            github: ''
                        },
                        profileShareId: generateShareId(),
                        email: user.email,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    };

                    return db.collection('users').doc(user.uid).set(newUser);
                }
            })
            .catch(error => {
                console.error('Error checking/creating user in Firestore:', error);
            });
    }

    // Show notification only if explicitly requested
    if (showNotificationFlag) {
        showNotification('success', `Successfully signed in as ${user.displayName}`);
    }

    // Store user information in localStorage for faster UI updates
    localStorage.setItem('user', JSON.stringify({
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
        uid: user.uid,
        timestamp: Date.now()
    }));
}

// Function to update UI after sign out
function updateUIAfterSignOut(showNotificationFlag = false) {
    // Update the login button
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
        loginBtn.innerHTML = '<i class="fas fa-user"></i> Sign In';
        loginBtn.setAttribute('href', '#');

        // Remove old event listeners with clean replacement
        const newLoginBtn = loginBtn.cloneNode(true);
        loginBtn.parentNode.replaceChild(newLoginBtn, loginBtn);

        // Add sign in event listener
        newLoginBtn.addEventListener('click', function (e) {
            e.preventDefault();
            signInWithGoogle();
        });
    }

    // Remove any dropdown that might exist
    const dropdown = document.getElementById('userDropdown');
    if (dropdown) dropdown.remove();

    // Show notification only if explicitly requested
    if (showNotificationFlag) {
        showNotification('info', 'You have been signed out');
    }
}

// Create user dropdown menu - highly optimized
function createUserDropdown(buttonElement) {
    // Remove any existing dropdown
    const existingDropdown = document.getElementById('userDropdown');
    if (existingDropdown) existingDropdown.remove();

    // Create dropdown
    const dropdown = document.createElement('div');
    dropdown.id = 'userDropdown';
    dropdown.className = 'user-dropdown';

    // Create dropdown content
    dropdown.innerHTML = `
        <ul class="dropdown-menu">
            <li>
                <a href="profile.html" class="dropdown-item">
                    <i class="fas fa-user-circle"></i> My Profile
                </a>
            </li>
            <li>
                <button id="signOutDropdownBtn" class="dropdown-item">
                    <i class="fas fa-sign-out-alt"></i> Sign Out
                </button>
            </li>
        </ul>
    `;

    // Position the dropdown
    const buttonRect = buttonElement.getBoundingClientRect();
    dropdown.style.position = 'absolute';
    dropdown.style.top = (buttonRect.bottom + 5) + 'px';
    dropdown.style.right = (window.innerWidth - buttonRect.right) + 'px';

    // Add to document
    document.body.appendChild(dropdown);

    // Add sign out event listener
    document.getElementById('signOutDropdownBtn').addEventListener('click', function () {
        signOut();
        dropdown.remove();
    });

    // Close dropdown when clicking outside (with small delay to prevent immediate closing)
    setTimeout(() => {
        document.addEventListener('click', function closeDropdown(e) {
            if (!dropdown.contains(e.target) && e.target !== buttonElement) {
                dropdown.remove();
                document.removeEventListener('click', closeDropdown);
            }
        });
    }, 10);
}

// Generate unique share ID - moved from userProfile to make it accessible
function generateShareId() {
    return Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15);
}

// Improved notification system with better timing
function showNotification(type, message, duration = 3000) {
    // Create unique ID for this notification
    const notificationId = 'notification-' + Date.now();

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.id = notificationId;

    // Set the icon based on notification type
    let icon;
    switch (type) {
        case 'success': icon = 'fa-check-circle'; break;
        case 'error': icon = 'fa-exclamation-circle'; break;
        case 'info':
        default: icon = 'fa-info-circle';
    }

    notification.innerHTML = `
      <i class="fas ${icon}"></i>
      <p>${message}</p>
      <button class="close-btn"><i class="fas fa-times"></i></button>
    `;
    document.body.appendChild(notification);

    // Force reflow for smooth animation
    notification.offsetHeight;

    // Add fade-in class for animation
    notification.classList.add('fade-in');

    // Remove notification after duration
    const timeoutId = setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => notification.remove(), 500);
    }, duration);

    // Store timeout ID for cancellation if needed
    notification.dataset.timeoutId = timeoutId;

    // Close button functionality
    const closeBtn = notification.querySelector('.close-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            clearTimeout(timeoutId);
            notification.classList.add('fade-out');
            setTimeout(() => notification.remove(), 500);
        });
    }

    return notificationId;
}

// Remove notifications by type
function removeNotificationsByType(type) {
    const notifications = document.querySelectorAll(`.notification.${type}`);
    notifications.forEach(notification => {
        // Clear timeout if it exists
        if (notification.dataset.timeoutId) {
            clearTimeout(parseInt(notification.dataset.timeoutId));
        }

        notification.classList.add('fade-out');
        setTimeout(() => notification.remove(), 500);
    });
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function () {
    // Check if we have a saved user in localStorage for immediate UI update
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
        try {
            const userData = JSON.parse(savedUser);
            const timestamp = userData.timestamp || 0;
            const now = Date.now();

            // Use cached user data if less than 24 hours old
            if (now - timestamp < 86400000) {
                // Update UI with cached user data, but don't show notification
                const loginBtn = document.getElementById('loginBtn');
                if (loginBtn) {
                    loginBtn.innerHTML = `
                        <img src="${userData.photoURL || 'assets/images/default-avatar.png'}" alt="Profile" class="user-avatar-small">
                        <span class="user-name-small">${userData.displayName}</span>
                    `;
                    loginBtn.setAttribute('href', '#');

                    // Add click handler
                    loginBtn.addEventListener('click', function (e) {
                        e.preventDefault();
                        e.stopPropagation();

                        // Toggle dropdown menu
                        let dropdown = document.getElementById('userDropdown');
                        if (dropdown) {
                            dropdown.remove();
                        } else {
                            createUserDropdown(this);
                        }
                    });
                }
            } else {
                // Token is old, clear it
                localStorage.removeItem('user');
            }
        } catch (e) {
            console.error('Error parsing saved user data:', e);
            localStorage.removeItem('user');
        }
    } else {
        // No cached user, setup login button
        const loginBtn = document.getElementById('loginBtn');
        if (loginBtn) {
            loginBtn.addEventListener('click', function (e) {
                e.preventDefault();
                signInWithGoogle();
            });
        }
    }

    // Setup auth state change listener
    auth.onAuthStateChanged(function (user) {
        if (user) {
            updateUIAfterSignIn(user);
        } else {
            updateUIAfterSignOut();
        }
    });
});


function preloadImage(url) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(url);
        img.onerror = () => reject();
        img.src = url;
    });
}