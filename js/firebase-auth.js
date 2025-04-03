// Firebase configuration and authentication setup
const firebaseConfig = {
    apiKey: "AIzaSyD_Z-NJzLb6T02fEXnzvmFbCQX4xzBvnVU",
    authDomain: "techtitans-e32f4.firebaseapp.com",
    projectId: "techtitans-e32f4",
    storageBucket: "techtitans-e32f4.firebasestorage.app",
    messagingSenderId: "226500400403",
    appId: "1:226500400403:web:19b64fdc1178979a5036e6"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Set up auth provider
const auth = firebase.auth();
const provider = new firebase.auth.GoogleAuthProvider();
provider.setCustomParameters({
    prompt: 'select_account' // Always prompt users to select an account
});

// Function to handle Google Sign In
function signInWithGoogle() {
    auth.signInWithPopup(provider)
        .then((result) => {
            // User signed in successfully
            const user = result.user;
            console.log("User signed in:", user);
            updateUIAfterSignIn(user, true); // Pass true to show notification
        })
        .catch((error) => {
            // Handle errors
            console.error("Sign-in error:", error);
            const errorMessage = error.message;

            // Show error notification
            showNotification('error', `Sign in failed: ${errorMessage}`);
        });
}

// Function to handle sign out
function signOut() {
    auth.signOut()
        .then(() => {
            console.log("User signed out");
            updateUIAfterSignOut(true); // Pass true to show notification
        })
        .catch((error) => {
            console.error("Sign out error:", error);
        });
}

// Function to update UI after sign in
function updateUIAfterSignIn(user, showNotificationFlag = false) {
    // Update the login button
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
        loginBtn.innerHTML = `
            <img src="${user.photoURL || 'assets/images/default-avatar.png'}" alt="Profile" class="user-avatar-small">
            <span class="user-name-small">${user.displayName}</span>
        `;
        loginBtn.setAttribute('href', '#');

        // Remove any existing event listeners by cloning the node
        const newLoginBtn = loginBtn.cloneNode(true);
        loginBtn.parentNode.replaceChild(newLoginBtn, loginBtn);

        // Add dropdown functionality
        newLoginBtn.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation(); // Prevent the click from propagating

            // Toggle dropdown menu
            let dropdown = document.getElementById('userDropdown');

            // If dropdown exists, toggle it, otherwise create it
            if (dropdown) {
                dropdown.remove(); // Remove existing dropdown
            } else {
                // Create the dropdown
                dropdown = document.createElement('div');
                dropdown.id = 'userDropdown';
                dropdown.className = 'user-dropdown';

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

                // Position the dropdown properly
                const buttonRect = this.getBoundingClientRect();
                dropdown.style.position = 'absolute';
                dropdown.style.top = (buttonRect.bottom + 5) + 'px';
                dropdown.style.right = (window.innerWidth - buttonRect.right) + 'px';

                // Add the dropdown to the document
                document.body.appendChild(dropdown);

                // Add sign out event listener
                document.getElementById('signOutDropdownBtn').addEventListener('click', function () {
                    signOut();
                });

                // Close dropdown when clicking outside
                setTimeout(() => {
                    document.addEventListener('click', function closeDropdown(e) {
                        if (!dropdown.contains(e.target) && e.target !== newLoginBtn) {
                            dropdown.remove();
                            document.removeEventListener('click', closeDropdown);
                        }
                    });
                }, 10);
            }
        });
    }

    // Check if user exists in Firestore, if not create default profile
    db.collection('users').doc(user.uid).get()
        .then(doc => {
            if (!doc.exists) {
                // Create default user profile but missing photoURL
                const newUser = {
                    firstName: user.displayName.split(' ')[0] || '',
                    lastName: user.displayName.split(' ').slice(1).join(' ') || '',
                    photoURL: user.photoURL,
                    bio: '',
                    socialLinks: {
                        linkedin: '',
                        github: ''
                    },
                    profileShareId: userProfile.generateShareId(),
                    email: user.email
                };

                return db.collection('users').doc(user.uid).set(newUser);
            }
        })
        .catch(error => {
            console.error('Error checking/creating user in Firestore:', error);
        });

    // Show notification only if explicitly requested (not on page reload)
    if (showNotificationFlag) {
        showNotification('success', `Successfully signed in as ${user.displayName}`);
    }

    // Store user information in localStorage
    localStorage.setItem('user', JSON.stringify({
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
        uid: user.uid
    }));
}

// Function to update UI after sign out
function updateUIAfterSignOut(showNotificationFlag = false) {
    // Update the login button
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
        loginBtn.innerHTML = '<i class="fas fa-user"></i> Sign In';

        // Remove any existing event listeners
        const newLoginBtn = loginBtn.cloneNode(true);
        loginBtn.parentNode.replaceChild(newLoginBtn, loginBtn);

        // Add new event listener
        newLoginBtn.addEventListener('click', function (e) {
            e.preventDefault();
            signInWithGoogle();
        });
    }

    // Remove any dropdown that might exist
    const dropdown = document.getElementById('userDropdown');
    if (dropdown) dropdown.remove();

    // Show notification only if explicitly requested (not on page reload)
    if (showNotificationFlag) {
        showNotification('info', 'You have been signed out');
    }

    // Remove user information from localStorage
    localStorage.removeItem('user');
}

// Create user dropdown menu
function createUserDropdown(buttonElement, user) {
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
    dropdown.style.top = buttonRect.bottom + 'px';
    dropdown.style.right = (window.innerWidth - buttonRect.right) + 'px';

    // Add to document
    document.body.appendChild(dropdown);

    // Add sign out event listener
    document.getElementById('signOutDropdownBtn').addEventListener('click', function () {
        signOut();
        dropdown.remove();
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', function closeDropdown(e) {
        if (!dropdown.contains(e.target) && e.target !== buttonElement) {
            dropdown.remove();
            document.removeEventListener('click', closeDropdown);
        }
    });
}

// Consolidated function to show notifications
function showNotification(type, message) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;

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

    // Remove notification after 5 seconds
    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => notification.remove(), 500);
    }, 5000);

    // Close button functionality
    const closeBtn = notification.querySelector('.close-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            notification.remove();
        });
    }
}

// Check if user is already signed in
auth.onAuthStateChanged((user) => {
    if (user) {
        // User is signed in - update UI but don't show notification
        updateUIAfterSignIn(user, false);
    } else {
        // User is signed out - update UI but don't show notification
        const loginBtn = document.getElementById('loginBtn');
        if (loginBtn) {
            loginBtn.innerHTML = '<i class="fas fa-user"></i> Sign In';

            // Remove any existing event listeners
            const newLoginBtn = loginBtn.cloneNode(true);
            loginBtn.parentNode.replaceChild(newLoginBtn, loginBtn);

            // Add new event listener
            newLoginBtn.addEventListener('click', function (e) {
                e.preventDefault();
                signInWithGoogle();
            });
        }
    }
});




// Create dropdown menu for logged-in users
function createUserDropdown(user) {
    const dropdownHTML = `
        <div class="user-dropdown-container">
            <div class="user-dropdown-header">
                <img src="${user.photoURL || 'assets/images/default-avatar.png'}" alt="Profile" class="user-avatar-small">
                <span class="user-name-small">${user.displayName}</span>
                <i class="fas fa-chevron-down"></i>
            </div>
            <div class="user-dropdown-menu">
                <a href="profile.html" class="dropdown-item">
                    <i class="fas fa-user"></i> My Profile
                </a>
                <a href="#" class="dropdown-item dropdown-signout">
                    <i class="fas fa-sign-out-alt"></i> Sign Out
                </a>
            </div>
        </div>
    `;

    const dropdownWrapper = document.createElement('div');
    dropdownWrapper.className = 'user-dropdown';
    dropdownWrapper.innerHTML = dropdownHTML;

    // Add event listener to toggle dropdown
    const dropdownHeader = dropdownWrapper.querySelector('.user-dropdown-header');
    const dropdownMenu = dropdownWrapper.querySelector('.user-dropdown-menu');

    dropdownHeader.addEventListener('click', function (e) {
        e.preventDefault();
        dropdownMenu.classList.toggle('active');
    });

    // Add event listener for sign out button
    const signOutBtn = dropdownWrapper.querySelector('.dropdown-signout');
    signOutBtn.addEventListener('click', function (e) {
        e.preventDefault();
        signOut();
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', function (e) {
        if (!dropdownWrapper.contains(e.target)) {
            dropdownMenu.classList.remove('active');
        }
    });

    return dropdownWrapper;
}