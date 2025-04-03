document.addEventListener('DOMContentLoaded', function () {
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
    const joinWhatsAppBtn = document.getElementById('joinWhatsAppBtn');

    // Get profile ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const profileId = urlParams.get('id');

    if (!profileId) {
        showError();
        return;
    }

    // Load profile data
    loadProfileData(profileId);

    // Set up WhatsApp join button
    if (joinWhatsAppBtn) {
        joinWhatsAppBtn.addEventListener('click', function (e) {
            e.preventDefault();
            window.open('https://chat.whatsapp.com/yourgroup', '_blank');
        });
    }

    // Show error when profile not found
    function showError() {
        profileLoading.style.display = 'none';
        profileError.style.display = 'flex';
    }

    // Load profile data from Firestore
    async function loadProfileData(shareId) {
        try {
            // Get profile by share ID
            const profileData = await userProfile.getByShareId(shareId);

            if (!profileData) {
                showError();
                return;
            }

            // Update profile info
            updateProfileUI(profileData);

        } catch (error) {
            console.error('Error loading profile:', error);
            showError();
        }
    }

    // Update profile UI with data
    function updateProfileUI(profile) {
        // Hide loading, show profile
        profileLoading.style.display = 'none';
        publicProfile.style.display = 'block';

        // Debug output to see what we're getting from Firestore
        console.log("Profile data:", profile);

        // Set profile image with better error handling
        const avatarImg = document.getElementById('publicAvatar');
        if (avatarImg) {
            // Add loading attribute
            avatarImg.loading = "eager";

            // Set default first to ensure something shows
            avatarImg.src = 'assets/images/default-avatar.png';

            // Then try to set the user's actual photo if available
            if (profile.photoURL) {
                // Create a new image object to test if the URL is valid
                const testImg = new Image();
                testImg.onload = function () {
                    avatarImg.src = profile.photoURL;
                };
                testImg.onerror = function () {
                    console.error("Failed to load profile image:", profile.photoURL);
                    // Keep the default image
                };
                testImg.src = profile.photoURL;
            }
        }

        // Set name
        const fullName = `${profile.firstName || ''} ${profile.lastName || ''}`.trim();
        publicName.textContent = fullName || 'TechTitans User';

        // Set bio
        publicBio.textContent = profile.bio || 'No bio available';

        // Set first name in join message
        if (firstName) {
            firstName.textContent = profile.firstName || 'this user';
        }

        // Set social links
        if (profile.socialLinks) {
            // LinkedIn
            if (profile.socialLinks.linkedin) {
                publicLinkedIn.href = profile.socialLinks.linkedin;
                publicLinkedIn.classList.remove('hidden');
            } else {
                publicLinkedIn.classList.add('hidden');
            }

            // GitHub
            if (profile.socialLinks.github) {
                publicGitHub.href = profile.socialLinks.github;
                publicGitHub.classList.remove('hidden');
            } else {
                publicGitHub.classList.add('hidden');
            }
        }
    }
}