document.addEventListener('DOMContentLoaded', function () {
    console.log("Profile page loaded");
    initProfilePage();
    initializeTabs();
});

function initProfilePage() {
    // DOM Elements
    const authMessage = document.getElementById('authMessage');
    const profileContainer = document.getElementById('profileContainer');
    const profileSignInBtn = document.getElementById('profileSignInBtn');
    const signOutBtn = document.getElementById('signOutBtn');
    const shareProfileBtn = document.getElementById('shareProfileBtn');
    const profileForm = document.getElementById('profileForm');
    const tabButtons = document.querySelectorAll('.profile-nav-item');
    const tabContents = document.querySelectorAll('.profile-tab');
    const shareModal = document.getElementById('shareModal');
    const modalClose = document.querySelector('.modal-close');
    const shareLink = document.getElementById('shareLink');
    const copyShareLinkBtn = document.getElementById('copyShareLinkBtn');

    // State variables
    let currentUser = null;
    let userProfile = null;
    let isProfileLoaded = false;
    let bookmarksLoaded = false;
    let isProfileUpdating = false;

    // Performance: Load only what's needed first, defer the rest
    const pageSequence = {
        initial: true,     // Initial page load
        profile: false,    // User profile data loaded
        bookmarks: false   // Bookmarks data loaded
    };

    // Show page loading indicator with short timeout
    const pageLoadingIndicator = document.createElement('div');
    pageLoadingIndicator.className = 'page-loading-indicator';
    pageLoadingIndicator.innerHTML = '<div class="loading-spinner"></div>';
    document.body.appendChild(pageLoadingIndicator);

    // Load user data and remove loading indicator after short delay
    setTimeout(() => {
        pageLoadingIndicator.classList.add('fade-out');
        setTimeout(() => {
            pageLoadingIndicator.remove();
        }, 300);
    }, 300);

    // Firebase access
    if (!window.firebase) {
        console.error("Firebase is not initialized!");
        return;
    }
    const db = firebase.firestore();

    // Check for cached user in localStorage for instant UI update
    const cachedUserString = localStorage.getItem('user');
    if (cachedUserString) {
        try {
            const cachedUser = JSON.parse(cachedUserString);
            if (cachedUser && Date.now() - cachedUser.timestamp < 86400000) { // 24 hours
                // Show profile container immediately
                if (authMessage) authMessage.style.display = 'none';
                if (profileContainer) {
                    profileContainer.style.display = 'grid';
                    setTimeout(() => profileContainer.classList.add('visible'), 50);
                }

                // Update basic profile info from cache
                updateUserBasicInfo({
                    displayName: cachedUser.displayName,
                    photoURL: cachedUser.photoURL,
                    email: cachedUser.email
                });
            }
        } catch (e) {
            console.error("Error parsing cached user:", e);
        }
    }

    // Check Firebase auth state
    firebase.auth().onAuthStateChanged(function (user) {
        if (user) {
            console.log("User is signed in:", user.displayName);
            currentUser = user;

            if (authMessage) authMessage.style.display = 'none';
            if (profileContainer) {
                profileContainer.style.display = 'grid';

                // Animate profile container
                setTimeout(() => {
                    profileContainer.classList.add('visible');
                }, 50);
            }

            // Fetch user profile data with a small delay to improve initial page load
            setTimeout(() => {
                fetchUserProfile(user.uid);
            }, 100);

        } else {
            console.log("No user is signed in");
            if (authMessage) authMessage.style.display = 'flex';
            if (profileContainer) {
                profileContainer.style.display = 'none';
                profileContainer.classList.remove('visible');
            }
        }
    });

    // Sign in button in auth message
    if (profileSignInBtn) {
        profileSignInBtn.addEventListener('click', function () {
            signInWithGoogle();
        });
    }

    // Sign out button
    if (signOutBtn) {
        signOutBtn.addEventListener('click', function () {
            signOut();
        });
    }

    // Tab switching - with lazy loading for bookmarks
    tabButtons.forEach(button => {
        button.addEventListener('click', function () {
            const tabId = this.getAttribute('data-tab');

            // Update active button
            tabButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');

            // Update active tab content
            tabContents.forEach(tab => {
                tab.style.display = 'none';
                if (tab.id === tabId) {
                    tab.style.display = 'block';

                    // Lazy load bookmarks when bookmarks tab is selected
                    if (tabId === 'bookmarks' && !bookmarksLoaded && currentUser) {
                        fetchBookmarks(currentUser.uid);
                        bookmarksLoaded = true;
                    }
                }
            });
        });
    });

    // Make first tab visible by default - MOVED OUTSIDE THE CLICK HANDLER
    if (tabContents && tabContents.length > 0) {
        tabContents[0].style.display = 'block';

        if (tabButtons && tabButtons.length > 0) {
            tabButtons[0].classList.add('active');
        }
    }

    // Share profile button
    if (shareProfileBtn) {
        shareProfileBtn.addEventListener('click', function () {
            openShareModal();
        });
    }

    // Modal close button
    if (modalClose) {
        modalClose.addEventListener('click', function () {
            closeShareModal();
        });
    }

    // Close modal when clicking outside
    window.addEventListener('click', function (e) {
        if (e.target === shareModal) {
            closeShareModal();
        }
    });

    // Copy share link button
    if (copyShareLinkBtn) {
        copyShareLinkBtn.addEventListener('click', function () {
            copyToClipboard(shareLink.value);
            showNotification('success', 'Link copied to clipboard!', 2000);
            // Close modal after copying
            closeShareModal();
        });
    }

    // Profile form setup with debounced saving
    if (profileForm) {
        // Use debounce function from helpers if available, or create one
        const debouncedSave = window.dbModules?.helpers?.debounce
            ? window.dbModules.helpers.debounce(autoSaveProfile, 1000)
            : createDebounceFunction(autoSaveProfile, 1000);

        // Regular form submission
        profileForm.addEventListener('submit', function (e) {
            e.preventDefault();
            saveUserProfile();
        });
    }

    // Create a debounce function if not available from helpers
    function createDebounceFunction(func, wait) {
        let timeout;
        return function (...args) {
            const context = this;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), wait);
        };
    }

    // Auto-save profile changes - optimized to only update changed field
    function autoSaveProfile(e) {
        if (isProfileUpdating || !currentUser) return;

        // Only save the changed field
        const field = e.target;
        const fieldName = field.id;
        const value = field.value.trim();

        // Track if this is a social link field
        const isSocialLink = fieldName === 'linkedinUrl' || fieldName === 'githubUrl';
        const platform = fieldName === 'linkedinUrl' ? 'linkedin' : 'github';

        // Prevent multiple concurrent saves
        isProfileUpdating = true;

        // Optimized Firestore update - use dot notation for nested fields
        const updateData = isSocialLink
            ? { [`socialLinks.${platform}`]: value }  // Update just the specific social link
            : { [fieldName]: value };                // Update regular field

        // Add timestamp
        updateData.lastUpdated = firebase.firestore.FieldValue.serverTimestamp();

        // Execute update
        db.collection('users').doc(currentUser.uid).update(updateData)
            .then(() => {
                // Update local profile data
                if (userProfile) {
                    if (isSocialLink) {
                        if (!userProfile.socialLinks) userProfile.socialLinks = {};
                        userProfile.socialLinks[platform] = value;
                    } else {
                        userProfile[fieldName] = value;
                    }
                }
            })
            .catch(error => {
                // Handle errors
                console.error('Error auto-saving profile:', error);
                saveIndicator.textContent = 'Error saving';
                saveIndicator.classList.add('error');

                // Show error notification
                showNotification('error', 'Failed to save changes');
            })
            .finally(() => {
                isProfileUpdating = false;
            });
    }

    // Fetch user profile data from Firestore with optimized caching
    async function fetchUserProfile(userId) {
        if (!userId) return;

        try {
            console.log("Fetching user profile for:", userId);

            // Show loading indicator
            const loading = document.createElement('div');
            loading.className = 'profile-loading-indicator';
            loading.innerHTML = '<div class="spinner"></div><span>Loading profile...</span>';
            document.querySelector('.profile-content').appendChild(loading);

            // Update basic info from Firebase Auth immediately for better UX
            updateUserBasicInfo(currentUser);

            // Get profile data - first try from cache via the dbModules
            let profileData;

            if (window.dbModules && window.dbModules.userProfile) {
                try {
                    profileData = await window.dbModules.userProfile.get(userId);
                    console.log("Profile loaded from cache");
                } catch (e) {
                    console.error("Error using dbModules cache:", e);
                }
            }

            // If not found in cache, get directly from Firestore
            if (!profileData) {
                console.log("Cache miss, fetching from Firestore");
                const profileDoc = await db.collection('users').doc(userId).get();

                if (profileDoc.exists) {
                    profileData = profileDoc.data();
                }
            }

            if (profileData) {
                userProfile = profileData;

                // Check if photoURL exists, if not, update it
                if (!userProfile.photoURL && currentUser.photoURL) {
                    await db.collection('users').doc(userId).update({
                        photoURL: currentUser.photoURL
                    });
                    userProfile.photoURL = currentUser.photoURL;

                    // Clear cache if using dbModules
                    if (window.dbModules?.cacheStore) {
                        window.dbModules.cacheStore.clearItem('profiles', userId);
                    }
                }

                // Populate form with user data
                populateProfileForm(userProfile);

                // Update share link
                if (userProfile.profileShareId) {
                    updateShareLinks(userProfile.profileShareId);
                }
            } else {
                console.log('No profile document found, creating new one');

                // Generate unique ID for sharing
                const shareId = window.dbModules?.userProfile?.generateShareId?.() ||
                    Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

                // Create default profile
                const newProfile = {
                    firstName: currentUser.displayName?.split(' ')[0] || '',
                    lastName: currentUser.displayName?.split(' ').slice(1).join(' ') || '',
                    photoURL: currentUser.photoURL || '',
                    email: currentUser.email || '',
                    bio: '',
                    socialLinks: {
                        linkedin: '',
                        github: ''
                    },
                    profileShareId: shareId,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                };

                await db.collection('users').doc(userId).set(newProfile);
                userProfile = newProfile;
                populateProfileForm(userProfile);
                updateShareLinks(userProfile.profileShareId);

                // Clear cache if using dbModules
                if (window.dbModules?.cacheStore) {
                    window.dbModules.cacheStore.clearItem('profiles', userId);
                }
            }

            // Mark profile as loaded
            isProfileLoaded = true;
            pageSequence.profile = true;

            // Remove loading indicator
            loading.remove();

        } catch (error) {
            console.error('Error fetching user profile:', error);
            showNotification('error', 'Failed to load profile data');
        }
    }

    // Update user's basic information from Firebase Auth
    function updateUserBasicInfo(user) {
        if (!user) return;

        const userAvatar = document.getElementById('userAvatar');
        const userName = document.getElementById('userName');
        const userEmail = document.getElementById('userEmail');

        if (userAvatar && user.photoURL) {
            // Add loading attribute for better performance
            userAvatar.loading = "lazy";

            // Set default image first
            if (userAvatar.src !== user.photoURL) {
                userAvatar.src = 'assets/images/default-avatar.png';

                // Then load the actual photo
                const img = new Image();
                img.onload = function () {
                    userAvatar.src = user.photoURL;
                };
                img.onerror = function () {
                    userAvatar.src = 'assets/images/default-avatar.png';
                };
                img.src = user.photoURL;
            }
        } else if (userAvatar) {
            userAvatar.src = 'assets/images/default-avatar.png';
        }

        if (userName) {
            userName.textContent = user.displayName || 'TechTitan User';
        }

        if (userEmail) {
            userEmail.textContent = user.email || 'No email available';
        }
    }

    // Populate form with user profile data
    function populateProfileForm(profile) {
        if (!profile) return;

        const firstNameInput = document.getElementById('firstName');
        const lastNameInput = document.getElementById('lastName');
        const bioInput = document.getElementById('bio');
        const linkedinInput = document.getElementById('linkedinUrl');
        const githubInput = document.getElementById('githubUrl');

        if (firstNameInput) firstNameInput.value = profile.firstName || '';
        if (lastNameInput) lastNameInput.value = profile.lastName || '';
        if (bioInput) bioInput.value = profile.bio || '';

        if (linkedinInput && profile.socialLinks) {
            linkedinInput.value = profile.socialLinks.linkedin || '';
        }

        if (githubInput && profile.socialLinks) {
            githubInput.value = profile.socialLinks.github || '';
        }
    }

    // Save user profile - full save
    async function saveUserProfile() {
        if (!currentUser) return;

        const firstName = document.getElementById('firstName').value.trim();
        const lastName = document.getElementById('lastName').value.trim();
        const bio = document.getElementById('bio').value.trim();
        const linkedinUrl = document.getElementById('linkedinUrl').value.trim();
        const githubUrl = document.getElementById('githubUrl').value.trim();

        // Validate social media URLs
        if (linkedinUrl && !isValidUrl(linkedinUrl)) {
            showNotification('error', 'Please enter a valid LinkedIn URL');
            return;
        }

        if (githubUrl && !isValidUrl(githubUrl)) {
            showNotification('error', 'Please enter a valid GitHub URL');
            return;
        }

        // Show save progress
        const saveBtn = document.getElementById('saveProfileBtn');
        const originalBtnText = saveBtn.innerHTML;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        saveBtn.disabled = true;

        try {
            // Get current user document to ensure we're not overwriting any fields
            const userDoc = await db.collection('users').doc(currentUser.uid).get();
            let userData = userDoc.exists ? userDoc.data() : {};

            // Create update object that preserves existing data
            const profileUpdate = {
                firstName: firstName,
                lastName: lastName,
                bio: bio,
                'socialLinks.linkedin': linkedinUrl,
                'socialLinks.github': githubUrl,
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
            };

            console.log("Saving profile with data:", profileUpdate);

            // Update the document
            await db.collection('users').doc(currentUser.uid).update(profileUpdate);

            // Clear all caches to ensure fresh data is loaded next time
            if (window.dbModules?.cacheStore) {
                window.dbModules.cacheStore.clearItem('profiles', currentUser.uid);
            }

            // Also clear localStorage cache
            localStorage.removeItem(`profile_${currentUser.uid}`);

            // Update local userProfile object for the current session
            if (userProfile) {
                userProfile.firstName = firstName;
                userProfile.lastName = lastName;
                userProfile.bio = bio;
                if (!userProfile.socialLinks) userProfile.socialLinks = {};
                userProfile.socialLinks.linkedin = linkedinUrl;
                userProfile.socialLinks.github = githubUrl;
            }

            // Directly update form fields to ensure they reflect saved values
            populateProfileForm({
                firstName,
                lastName,
                bio,
                socialLinks: {
                    linkedin: linkedinUrl,
                    github: githubUrl
                }
            });

            // Success notification
            showNotification('success', 'Profile updated successfully');

        } catch (error) {
            console.error('Error updating profile:', error);
            showNotification('error', `Failed to update profile: ${error.message}`);
        } finally {
            // Restore button text and enable it
            saveBtn.innerHTML = originalBtnText;
            saveBtn.disabled = false;
        }
    }

    // Update share links
    function updateShareLinks(profileShareId) {
        if (!profileShareId) return;

        let shareUrl;

        // Add timestamp to force fresh load every time the link is opened
        const timestamp = Date.now();

        // Check if we're in a local environment
        if (window.location.protocol === 'file:') {
            // Local file system - use relative paths
            shareUrl = `profile-view.html?id=${profileShareId}&t=${timestamp}`;
        } else {
            // Web server - include origin
            const path = window.location.pathname.split('/');
            path.pop(); // Remove the current file name
            const basePath = path.join('/');
            shareUrl = `${window.location.origin}${basePath}/profile-view.html?id=${profileShareId}&t=${timestamp}`;
        }

        console.log("Generated share URL with timestamp:", shareUrl);

        // Update the share link input
        if (shareLink) {
            shareLink.value = shareUrl;
        }
    }

    // Open the share modal
    function openShareModal() {
        if (shareModal) {
            shareModal.style.display = 'flex';

            // Animate modal
            setTimeout(() => {
                shareModal.querySelector('.modal-content').style.transform = 'translateY(0)';
                shareModal.querySelector('.modal-content').style.opacity = '1';
            }, 10);
        }
    }

    // Close the share modal
    function closeShareModal() {
        if (shareModal) {
            const modalContent = shareModal.querySelector('.modal-content');
            modalContent.style.transform = 'translateY(20px)';
            modalContent.style.opacity = '0';

            setTimeout(() => {
                shareModal.style.display = 'none';
            }, 300);
        }
    }

    // Copy text to clipboard with modern API
    function copyToClipboard(text) {
        // Check if the Clipboard API is available
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text)
                .then(() => {
                    console.log('Text copied to clipboard');
                })
                .catch(err => {
                    console.error('Could not copy text: ', err);
                    fallbackCopyToClipboard(text); // Use fallback if modern API fails
                });
        } else {
            // Use fallback for older browsers
            fallbackCopyToClipboard(text);
        }
    }

    // Fallback clipboard method
    function fallbackCopyToClipboard(text) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);

        try {
            document.execCommand('copy');
            console.log('Fallback: Copied to clipboard!');
        } catch (err) {
            console.error('Fallback: Could not copy text: ', err);
        }

        document.body.removeChild(textarea);
    }

    // Function to fetch bookmarks from Firestore
    async function fetchBookmarks(userId) {
        const bookmarksList = document.getElementById('bookmarksList');
        if (!bookmarksList) {
            console.error("bookmarksList element not found");
            return;
        }

        // Show loading state
        bookmarksList.innerHTML = '<div class="bookmarks-loading"><div class="spinner"></div><p>Loading your bookmarks...</p></div>';

        try {
            console.log("Fetching fresh bookmarks for user:", userId);

            // IMPORTANT: Add cache-busting by using a timestamp in the query
            // This ensures we always get the latest data from Firestore
            const timestamp = new Date().getTime();

            // Get bookmarks from Firestore with no caching
            const snapshot = await firebase.firestore()
                .collection('users')
                .doc(userId)
                .collection('bookmarks')
                .orderBy('bookmarkedAt', 'desc')
                // Force refresh from server, not cache
                .get({ source: 'server' });

            console.log("Bookmarks fetch completed, found:", snapshot.size, "bookmarks");

            if (snapshot.empty) {
                // Show empty state
                bookmarksList.innerHTML = `
                <div class="bookmark-empty-state">
                    <i class="fas fa-bookmark"></i>
                    <p>You haven't bookmarked any resources yet</p>
                    <a href="resources.html" class="btn btn-secondary">Browse Resources</a>
                </div>
            `;
                return;
            }

            // Clear loading state
            bookmarksList.innerHTML = '';

            // Create and append bookmark items
            snapshot.docs.forEach(doc => {
                const data = doc.data();
                console.log("Processing bookmark:", doc.id, data);
                const bookmarkItem = createBookmarkElement(doc.id, data);
                bookmarksList.appendChild(bookmarkItem);
            });

        } catch (error) {
            console.error('Error fetching bookmarks:', error);
            // Error handling code remains the same...
        }
    }

    // Create a bookmark item element
    function createBookmarkElement(id, data) {
        const bookmark = document.createElement('div');
        bookmark.className = 'bookmark-item';
        bookmark.dataset.id = id;

        // Get proper category class
        const categoryClass = getCategoryClass(data.category);

        bookmark.innerHTML = `
        <div class="bookmark-content">
            <div class="bookmark-header">
                <span class="bookmark-category ${getCategoryClass(data.category)}">${capitalizeFirstLetter(data.category || 'general')}</span>
                <button class="bookmark-remove" aria-label="Remove bookmark">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <h3 class="bookmark-title">${data.title || 'Unnamed Resource'}</h3>
            <div class="bookmark-meta">
                <span class="bookmark-date">
                    <i class="far fa-clock"></i>
                    ${formatDate(data.bookmarkedAt?.toDate?.() || new Date())}
                </span>
            </div>
            <a href="${data.link || '#'}" class="bookmark-link" target="_blank" rel="noopener noreferrer">
                View Resource <i class="fas fa-external-link-alt"></i>
            </a>
        </div>
    `;

        // Add remove bookmark functionality
        const removeBtn = bookmark.querySelector('.bookmark-remove');
        if (removeBtn) {
            removeBtn.addEventListener('click', async () => {
                try {
                    // Optimistic UI update
                    bookmark.style.opacity = '0.5';

                    // Remove from Firestore
                    await firebase.firestore()
                        .collection('users')
                        .doc(currentUser.uid)
                        .collection('bookmarks')
                        .doc(id)
                        .delete();

                    // Animate removal
                    bookmark.style.height = bookmark.offsetHeight + 'px';
                    setTimeout(() => {
                        bookmark.style.height = '0';
                        bookmark.style.padding = '0';
                        bookmark.style.margin = '0';
                        bookmark.style.opacity = '0';

                        setTimeout(() => {
                            bookmark.remove();

                            // Check if we need to show empty state
                            if (bookmarksList.children.length === 0) {
                                bookmarksList.innerHTML = `
                                <div class="bookmark-empty-state">
                                    <i class="fas fa-bookmark"></i>
                                    <p>You haven't bookmarked any resources yet</p>
                                    <a href="resources.html" class="btn btn-secondary">Browse Resources</a>
                                </div>
                            `;
                            }
                        }, 300);
                    }, 50);

                    showNotification('success', 'Bookmark removed successfully');
                } catch (error) {
                    console.error('Error removing bookmark:', error);
                    bookmark.style.opacity = '1';
                    showNotification('error', 'Failed to remove bookmark');
                }
            });
        }

        return bookmark;
    }

    // Capitalize first letter of string
    function capitalizeFirstLetter(string) {
        if (!string) return '';
        return string.charAt(0).toUpperCase() + string.slice(1);
    }

    // Helper function to get category class
    function getCategoryClass(category) {
        if (!category) return '';

        const categoryMap = {
            'web-dev': 'web-dev',
            'mobile-dev': 'mobile-dev',
            'ai-ml': 'ai-ml',
            'database': 'database',
            'devops': 'devops',
            'cybersecurity': 'cybersecurity',
            'blockchain': 'blockchain',
            'cloud': 'cloud',
            'ui-ux': 'ui-ux',
            'programming': 'programming',
            'data-science': 'data-science'
        };

        return categoryMap[category] || '';
    }

    // Format date helper
    function formatDate(date) {
        // Check if date is valid
        if (!(date instanceof Date) || isNaN(date)) {
            return 'Unknown date';
        }

        // Check if it's today
        const today = new Date();
        const isToday = date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear();

        if (isToday) {
            return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        }

        // Check if it's yesterday
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);

        const isYesterday = date.getDate() === yesterday.getDate() &&
            date.getMonth() === yesterday.getMonth() &&
            date.getFullYear() === yesterday.getFullYear();

        if (isYesterday) {
            return `Yesterday at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        }

        // Otherwise use formatted date
        return date.toLocaleDateString([], {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    // URL validation
    function isValidUrl(url) {
        try {
            new URL(url);
            return true;
        } catch (e) {
            return false;
        }
    }

    // Generate share ID if needed
    function generateShareId() {
        return window.dbModules?.userProfile?.generateShareId?.() ||
            Math.random().toString(36).substring(2, 15) +
            Math.random().toString(36).substring(2, 15);
    }
}

function initializeTabs() {
    // Make first tab visible by default
    if (tabContents && tabContents.length > 0) {
        // Hide all tabs first
        tabContents.forEach(tab => {
            tab.style.display = 'none';
        });

        // Show first tab
        tabContents[0].style.display = 'block';

        // Set first tab button as active
        if (tabButtons && tabButtons.length > 0) {
            tabButtons[0].classList.add('active');
        }
    }
}