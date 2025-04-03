document.addEventListener('DOMContentLoaded', function() {
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
            
            // Track timing for performance monitoring
            const startTime = performance.now();
            
            // First try to get profile from memory to avoid flash of unloaded content
            let profileData = null;
            let loadSource = "unknown";
            
            // Try global memory cache first (fastest)
            if (window.dbModules && window.dbModules.cacheStore) {
                profileData = window.dbModules.cacheStore.getItem('profiles', `share_${shareId}`);
                if (profileData) {
                    loadSource = "memory-cache";
                }
            }
            
            // If not in memory, try localStorage (persists between page loads)
            if (!profileData) {
                const storedProfile = localStorage.getItem(`profile_shared_${shareId}`);
                if (storedProfile) {
                    try {
                        const parsedProfile = JSON.parse(storedProfile);
                        const cacheAge = Date.now() - parsedProfile.timestamp;
                        
                        // Use stored profile if less than 5 minutes old
                        if (cacheAge < 300000) { // 5 minutes
                            console.log("Using locally stored profile data");
                            profileData = parsedProfile.data;
                            loadSource = "local-storage";
                            
                            // Sync to memory cache if available
                            if (window.dbModules && window.dbModules.cacheStore) {
                                window.dbModules.cacheStore.setItem('profiles', `share_${shareId}`, profileData);
                            }
                        }
                    } catch (e) {
                        console.error("Error parsing stored profile:", e);
                    }
                }
            }
            
            // If still not found, try the userProfile module from dbModules
            if (!profileData && window.dbModules && window.dbModules.userProfile) {
                try {
                    console.log("Using userProfile module from dbModules");
                    profileData = await window.dbModules.userProfile.getByShareId(shareId);
                    if (profileData) loadSource = "db-modules";
                } catch (e) {
                    console.error("Error using dbModules:", e);
                }
            }
            
            // Last resort: direct Firestore query
            if (!profileData) {
                console.log("Querying Firestore for profile");
                loadSource = "firestore";
                
                // Optimized Firestore query - select only required fields
                const snapshot = await firebase.firestore()
                    .collection('users')
                    .where('profileShareId', '==', shareId)
                    .select('firstName', 'lastName', 'bio', 'photoURL', 'socialLinks', 'profileShareId')
                    .limit(1)
                    .get();
                
                if (snapshot.empty) {
                    showError();
                    return;
                }
                
                profileData = snapshot.docs[0].data();
                
                // Cache for future use
                if (profileData) {
                    localStorage.setItem(`profile_shared_${shareId}`, JSON.stringify({
                        data: profileData,
                        timestamp: Date.now()
                    }));
                    
                    // Also cache in memory if available
                    if (window.dbModules && window.dbModules.cacheStore) {
                        window.dbModules.cacheStore.setItem('profiles', `share_${shareId}`, profileData);
                    }
                }
            }
            
            // If we have profile data, update the UI
            if (profileData) {
                // Calculate and log performance timing
                const endTime = performance.now();
                console.log(`Profile loaded in ${Math.round(endTime - startTime)}ms (source: ${loadSource})`);
                
                updateProfileUI(profileData);
            } else {
                console.error("No profile found with that ID");
                showError();
            }
            
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
                
                testImg.onload = function() {
                    // Image loaded successfully
                    publicAvatar.src = profile.photoURL;
                    publicAvatar.classList.add('fade-in');
                };
                
                testImg.onerror = function() {
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
        window.addEventListener('resize', function() {
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
}