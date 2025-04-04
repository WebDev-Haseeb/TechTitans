document.addEventListener('DOMContentLoaded', function () {
    console.log("Profile view page loaded");
    initProfileViewPage();
});

function initProfileViewPage() {
    // Elements
    const profileLoading = document.getElementById('profileLoading');
    const profileError = document.getElementById('profileError');
    const publicProfile = document.getElementById('publicProfile');
    const publicAvatar = document.getElementById('publicAvatar');
    const publicName = document.getElementById('publicName');
    const publicBio = document.getElementById('publicBio');
    const publicLinkedIn = document.getElementById('publicLinkedIn');
    const publicGitHub = document.getElementById('publicGitHub');
    const firstName = document.getElementById('firstName');

    // Performance: Set image dimensions to prevent layout shifts
    if (publicAvatar) {
        publicAvatar.width = 120;
        publicAvatar.height = 120;
    }

    // Get profile ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const profileId = urlParams.get('id');

    console.log("Profile ID from URL:", profileId);

    if (!profileId) {
        console.error("No profile ID provided in URL");
        showError();
        return;
    }

    // Load profile data immediately for better UX
    loadProfileData(profileId);

    // Show error when profile not found
    function showError() {
        if (profileLoading) profileLoading.style.display = 'none';
        if (profileError) profileError.style.display = 'flex';

        // Update the page title to reflect the error
        document.title = "Profile Not Found | TechTitans";
    }

    // Load profile data with optimized caching
    async function loadProfileData(shareId) {
        try {
            console.log("Loading profile data for ID:", shareId);

            // Always show loading indicator while fetching fresh data
            if (profileLoading) profileLoading.style.display = 'flex';

            // Add a timestamp parameter to force fresh data loading
            const timestamp = Date.now();
            console.log(`Fetching fresh data at timestamp: ${timestamp}`);

            // Skip all cache checks and go directly to Firestore
            console.log("Querying Firestore for fresh profile data");

            const snapshot = await firebase.firestore()
                .collection('users')
                .where('profileShareId', '==', shareId)
                .limit(1)
                .get();

            if (snapshot.empty) {
                console.error("Profile not found in Firestore");
                showError();
                return;
            }

            // Get the fresh profile data
            const profileData = snapshot.docs[0].data();

            // Update caches with the fresh data for future reference
            localStorage.setItem(`profile_shared_${shareId}`, JSON.stringify({
                data: profileData,
                timestamp: timestamp
            }));

            // Also update memory cache if available
            if (window.dbModules && window.dbModules.cacheStore) {
                window.dbModules.cacheStore.setItem('profiles', `share_${shareId}`, profileData);
            }

            // Update UI with the fresh data
            if (profileLoading) profileLoading.style.display = 'none';
            updateProfileUI(profileData);

        } catch (error) {
            console.error('Error loading profile:', error);
            showError();
        }
    }

    // Update profile UI with data - optimized to reduce layout shifts
    function updateProfileUI(profile) {
        console.log("Updating UI with profile data:", profile);

        // Hide loading, show profile with a slight delay for smoother transition
        if (profileLoading) profileLoading.style.display = 'none';

        // Small timeout for smoother animation
        setTimeout(() => {
            if (publicProfile) publicProfile.style.display = 'block';
        }, 50);

        // Set profile image with better error handling
        if (publicAvatar) {
            // Set default first to ensure something shows
            publicAvatar.src = 'assets/images/default-avatar.png';

            // Then try to set the user's actual photo if available
            if (profile.photoURL) {
                console.log("Setting profile photo:", profile.photoURL);

                // Create a new image object to test if the URL is valid
                const testImg = new Image();

                testImg.onload = function () {
                    // Image loaded successfully
                    publicAvatar.src = profile.photoURL;
                    publicAvatar.classList.add('fade-in');
                };

                testImg.onerror = function () {
                    console.error("Failed to load profile image:", profile.photoURL);
                    // Keep the default image
                };

                // Start loading - set src after event handlers
                testImg.src = profile.photoURL;
            }
        }

        // Set name with fallback
        if (publicName) {
            const fullName = `${profile.firstName || ''} ${profile.lastName || ''}`.trim();
            publicName.textContent = fullName || 'TechTitans User';
        }

        // Set bio with fallback
        if (publicBio) {
            publicBio.textContent = profile.bio || 'No bio available';

            // If bio is empty, add a subtle animation to draw attention to join section
            if (!profile.bio) {
                setTimeout(() => {
                    const joinCommunity = document.querySelector('.join-community');
                    if (joinCommunity) joinCommunity.classList.add('highlight-pulse');
                }, 1000);
            }
        }

        // Set first name in join message
        if (firstName) {
            firstName.textContent = profile.firstName || 'this user';
        }

        // Set social links if available
        if (profile.socialLinks) {
            // LinkedIn
            if (publicLinkedIn) {
                if (profile.socialLinks.linkedin) {
                    publicLinkedIn.href = profile.socialLinks.linkedin;
                    publicLinkedIn.classList.remove('hidden');
                } else {
                    publicLinkedIn.classList.add('hidden');
                }
            }

            // GitHub
            if (publicGitHub) {
                if (profile.socialLinks.github) {
                    publicGitHub.href = profile.socialLinks.github;
                    publicGitHub.classList.remove('hidden');
                } else {
                    publicGitHub.classList.add('hidden');
                }
            }
        } else {
            // No social links available
            if (publicLinkedIn) publicLinkedIn.classList.add('hidden');
            if (publicGitHub) publicGitHub.classList.add('hidden');
        }

        // Update page title with user's name
        if (profile.firstName || profile.lastName) {
            document.title = `${profile.firstName || ''} ${profile.lastName || ''} | TechTitans`;
        }

        // Add analytics if available
        if (window.firebase && window.firebase.analytics) {
            try {
                window.firebase.analytics().logEvent('profile_viewed', {
                    profile_id: profile.profileShareId
                });
            } catch (e) {
                console.error("Analytics error:", e);
            }
        }
    }

    // Add responsiveness optimization
    function optimizeForMobile() {
        // Add this event listener for optimal mobile experience
        window.addEventListener('resize', function () {
            if (window.innerWidth <= 576) {
                // Adjust image size for better mobile display
                if (publicAvatar) {
                    publicAvatar.width = 90;
                    publicAvatar.height = 90;
                }

                // Other mobile optimizations if needed
            } else {
                // Reset to default sizes for desktop
                if (publicAvatar) {
                    publicAvatar.width = 120;
                    publicAvatar.height = 120;
                }
            }
        });

        // Trigger once on page load
        if (window.innerWidth <= 576 && publicAvatar) {
            publicAvatar.width = 90;
            publicAvatar.height = 90;
        }
    }

    // Call mobile optimization
    optimizeForMobile();

    // Add this to profile-view.js
    const joinBtn = document.querySelector('.join-community .btn-primary');
    if (joinBtn) {
        joinBtn.addEventListener('click', function (e) {
            e.preventDefault();

            // Check if user is signed in
            if (firebase.auth().currentUser) {
                // User is signed in, redirect to profile page
                window.location.href = 'profile.html';
            } else {
                // User is not signed in, trigger Google sign-in
                signInWithGoogle().then(() => {
                    // After successful sign-in, redirect to profile page
                    window.location.href = 'profile.html';
                }).catch(error => {
                    console.error("Sign-in failed:", error);
                    showNotification('error', 'Sign-in failed. Please try again.');
                });
            }
        });
    }
}