document.addEventListener('DOMContentLoaded', function () {
    // Initialize profile UI and functionality
    initProfilePage();
});

function initProfilePage() {
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

    let currentUser = null;
    let userProfile = null;

    // Check authentication status
    firebase.auth().onAuthStateChanged(function (user) {
        if (user) {
            currentUser = user;
            authMessage.style.display = 'none';
            profileContainer.style.display = 'grid';

            // Animate profile container
            setTimeout(() => {
                profileContainer.classList.add('visible');
            }, 100);

            // Fetch user profile data
            fetchUserProfile(user.uid);
        } else {
            authMessage.style.display = 'flex';
            profileContainer.style.display = 'none';
            profileContainer.classList.remove('visible');
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

    // Tab switching
    tabButtons.forEach(button => {
        button.addEventListener('click', function () {
            const tabId = this.getAttribute('data-tab');

            // Update active tab button
            tabButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');

            // Update active tab content
            tabContents.forEach(tab => {
                tab.classList.remove('active');
                if (tab.id === tabId) {
                    tab.classList.add('active');
                }
            });
        });
    });

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
            showNotification('success', 'Link copied to clipboard!');
            // Close the modal after copying
            closeShareModal();
        });
    }

    // Save profile form
    if (profileForm) {
        profileForm.addEventListener('submit', function (e) {
            e.preventDefault();
            saveUserProfile();
        });
    }

    // Fetch user profile data from Firestore
    async function fetchUserProfile(userId) {
        try {
            // Update basic info from Firebase Auth
            updateUserBasicInfo(currentUser);

            // Get additional profile info from Firestore
            const profileData = await db.collection('users').doc(userId).get();

            if (profileData.exists) {
                userProfile = profileData.data();

                // Check if photoURL exists, if not, update it
                if (!userProfile.photoURL && currentUser.photoURL) {
                    await db.collection('users').doc(userId).update({
                        photoURL: currentUser.photoURL
                    });
                    userProfile.photoURL = currentUser.photoURL;
                }

                populateProfileForm(userProfile);
                updateShareLinks(userProfile.profileShareId);
            } else {
                console.log('No profile document found!');
            }

            // Fetch bookmarks
            fetchBookmarks(userId);

        } catch (error) {
            console.error('Error fetching user profile:', error);
            showNotification('error', 'Failed to load profile data');
        }
    }

    // Update user's basic information from Firebase Auth
    function updateUserBasicInfo(user) {
        const userAvatar = document.getElementById('userAvatar');
        const userName = document.getElementById('userName');
        const userEmail = document.getElementById('userEmail');

        if (userAvatar && user.photoURL) {
            userAvatar.loading = "lazy"
            userAvatar.src = user.photoURL;

            userAvatar.onerror = function () {
                this.src = 'assets/images/default-avatar.png';
            };
        }

        if (userName) {
            userName.textContent = user.displayName;
        }

        if (userEmail) {
            userEmail.textContent = user.email;
        }
    }

    // Populate form with user profile data
    function populateProfileForm(profile) {
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

    // Save user profile
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

        // Create profile update object
        const profileUpdate = {
            firstName,
            lastName,
            bio,
            socialLinks: {
                linkedin: linkedinUrl,
                github: githubUrl
            }
        };

        try {
            await db.collection('users').doc(currentUser.uid).update(profileUpdate);
            showNotification('success', 'Profile updated successfully');
        } catch (error) {
            console.error('Error updating profile:', error);
            showNotification('error', 'Failed to update profile');
        }
    }

    // Fetch user bookmarks
    async function fetchBookmarks(userId) {
        try {
            const bookmarksSnapshot = await db.collection('users').doc(userId)
                .collection('bookmarks').get();

            const bookmarksList = document.getElementById('bookmarksList');

            if (bookmarksSnapshot.empty) {
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

            // Clear existing bookmarks
            bookmarksList.innerHTML = '';

            // Add each bookmark
            bookmarksSnapshot.docs.forEach(doc => {
                const bookmark = doc.data();
                const bookmarkEl = createBookmarkElement(doc.id, bookmark);
                bookmarksList.appendChild(bookmarkEl);
            });

        } catch (error) {
            console.error('Error fetching bookmarks:', error);
            showNotification('error', 'Failed to load bookmarks');
        }
    }

    // Create bookmark element
    function createBookmarkElement(id, bookmark) {
        const bookmarkEl = document.createElement('div');
        bookmarkEl.className = 'bookmark-item';
        bookmarkEl.innerHTML = `
            <div class="bookmark-content">
                <div class="bookmark-header">
                    <span class="bookmark-category">${bookmark.category || 'Resource'}</span>
                </div>
                <h3 class="bookmark-title">${bookmark.title || 'Unnamed Resource'}</h3>
                <div class="bookmark-actions">
                    <a href="resources.html#${bookmark.resourceId}" class="bookmark-link">
                        View Resource <i class="fas fa-arrow-right"></i>
                    </a>
                    <button class="bookmark-remove" data-id="${id}">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
        `;

        // Add event listener to remove button
        const removeBtn = bookmarkEl.querySelector('.bookmark-remove');
        removeBtn.addEventListener('click', function () {
            removeBookmark(id);
        });

        return bookmarkEl;
    }

    // Remove bookmark
    async function removeBookmark(bookmarkId) {
        if (!currentUser) return;

        try {
            await db.collection('users').doc(currentUser.uid)
                .collection('bookmarks').doc(bookmarkId).delete();

            showNotification('info', 'Bookmark removed');

            // Refresh bookmarks
            fetchBookmarks(currentUser.uid);
        } catch (error) {
            console.error('Error removing bookmark:', error);
            showNotification('error', 'Failed to remove bookmark');
        }
    }

    // Open share modal
    function openShareModal() {
        if (!userProfile || !userProfile.profileShareId) return;

        updateShareLinks(userProfile.profileShareId);
        shareModal.style.display = 'flex';
    }

    // Close share modal
    function closeShareModal() {
        shareModal.style.display = 'none';
    }

    // Update share links
    function updateShareLinks(profileShareId) {
        if (!profileShareId) return;

        const shareUrl = `${window.location.origin}/profile-view.html?id=${profileShareId}`;

        // Update only the share link input
        if (shareLink) {
            shareLink.value = shareUrl;
        }
    }

    // Helper function to copy text to clipboard
    function copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            console.log('Text copied to clipboard');
        }).catch(err => {
            console.error('Could not copy text: ', err);
            // Fallback for older browsers
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            document.body.appendChild(textarea);
            textarea.focus();
            textarea.select();
            try {
                document.execCommand('copy');
            } catch (err) {
                console.error('Fallback: Could not copy text: ', err);
            }
            document.body.removeChild(textarea);
        });
    }

    // Validate URL
    function isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }
}