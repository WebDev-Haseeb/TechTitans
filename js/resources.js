// Resources Page JavaScript
document.addEventListener('DOMContentLoaded', () => {
    initResourcesPage();
});

// Main initialization function
function initResourcesPage() {
    // Check if user is signed in
    checkAuthState();

    // Setup event listeners for search and filters
    setupFilterListeners();

    // Setup auth sign in button
    const authSignInBtn = document.getElementById('authSignInBtn');
    if (authSignInBtn) {
        authSignInBtn.addEventListener('click', () => {
            showNotification('info', 'Signing in...', true);
            signInWithGoogle().then(() => {
                checkAuthState();
            }).catch(error => {
                console.error("Sign-in failed:", error);
                showNotification('error', 'Sign-in failed. Please try again.');
            });
        });
    }
}

// Check authentication state and show appropriate content
function checkAuthState() {
    firebase.auth().onAuthStateChanged(user => {
        const authRequiredMessage = document.getElementById('authRequiredMessage');
        const resourcesContent = document.getElementById('resourcesContent');

        if (user) {
            // User is signed in, hide auth message and show resources
            if (authRequiredMessage) authRequiredMessage.style.display = 'none';
            if (resourcesContent) {
                resourcesContent.style.display = 'block';
                loadResources();
            }
        } else {
            // User is not signed in, show auth message and hide resources
            if (authRequiredMessage) authRequiredMessage.style.display = 'block';
            if (resourcesContent) resourcesContent.style.display = 'none';
        }
    });
}

// Resources state variables
const resourcesState = {
    resources: [],
    filteredResources: [],
    currentPage: 1,
    itemsPerPage: 25,
    totalPages: 1,
    category: 'all',
    type: 'all',
    sort: 'newest',
    searchQuery: '',
    isLoading: false
};

// Load resources from Firestore
async function loadResources() {
    try {
        resourcesState.isLoading = true;
        showLoadingState();

        // Get resources from Firestore
        const snapshot = await firebase.firestore().collection('resources')
            .orderBy('createdAt', 'desc')
            .get();

        // Map documents to resources array
        resourcesState.resources = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                title: data.title,
                number: data.number,
                type: data.type,
                category: data.category,
                link: data.link,
                tags: data.tags || [],
                views: data.views || 0,
                isTrending: data.isTrending || false,
                isPopular: data.isPopular || false,
                createdAt: data.createdAt ? data.createdAt.toDate() : new Date()
            };
        });

        // Update resources count
        updateResourcesCount();

        // Apply initial filtering and sorting
        applyFilters();
        
    } catch (error) {
        console.error('Error loading resources:', error);
        showNotification('error', 'Failed to load resources. Please try again.');
    } finally {
        resourcesState.isLoading = false;
        hideLoadingState();
    }
}

// Show loading state
function showLoadingState() {
    const loadingElement = document.getElementById('resourcesLoading');
    if (loadingElement) {
        loadingElement.style.display = 'flex';
    }

    const resourcesGrid = document.getElementById('resourcesGrid');
    if (resourcesGrid) {
        resourcesGrid.style.display = 'none';
    }
}

// Hide loading state
function hideLoadingState() {
    const loadingElement = document.getElementById('resourcesLoading');
    if (loadingElement) {
        loadingElement.style.display = 'none';
    }

    const resourcesGrid = document.getElementById('resourcesGrid');
    if (resourcesGrid) {
        resourcesGrid.style.display = 'grid';
    }
}

// Setup event listeners for search and filters
function setupFilterListeners() {
    // Search input
    const searchInput = document.getElementById('resourceSearch');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(() => {
            resourcesState.searchQuery = searchInput.value.trim().toLowerCase();
            resourcesState.currentPage = 1;
            applyFilters();
        }, 300));
    }

    // Search button
    const searchButton = document.getElementById('searchButton');
    if (searchButton) {
        searchButton.addEventListener('click', () => {
            const searchInput = document.getElementById('resourceSearch');
            resourcesState.searchQuery = searchInput ? searchInput.value.trim().toLowerCase() : '';
            resourcesState.currentPage = 1;
            applyFilters();
        });
    }

    // Category filter
    const categoryFilter = document.getElementById('categoryFilter');
    if (categoryFilter) {
        categoryFilter.addEventListener('change', () => {
            resourcesState.category = categoryFilter.value;
            resourcesState.currentPage = 1;
            applyFilters();
        });
    }

    // Type filter
    const typeFilter = document.getElementById('typeFilter');
    if (typeFilter) {
        typeFilter.addEventListener('change', () => {
            resourcesState.type = typeFilter.value;
            resourcesState.currentPage = 1;
            applyFilters();
        });
    }

    // Sort filter
    const sortFilter = document.getElementById('sortFilter');
    if (sortFilter) {
        sortFilter.addEventListener('change', () => {
            resourcesState.sort = sortFilter.value;
            resourcesState.currentPage = 1;
            applyFilters();
        });
    }

    // Clear filters button
    const clearFiltersBtn = document.getElementById('clearFiltersBtn');
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', () => {
            resetFilters();
        });
    }

    // Pagination buttons
    const prevPageBtn = document.getElementById('prevPage');
    const nextPageBtn = document.getElementById('nextPage');
    
    if (prevPageBtn) {
        prevPageBtn.addEventListener('click', () => {
            if (resourcesState.currentPage > 1) {
                resourcesState.currentPage--;
                renderResources();
                renderPagination();
                scrollToTop();
            }
        });
    }
    
    if (nextPageBtn) {
        nextPageBtn.addEventListener('click', () => {
            if (resourcesState.currentPage < resourcesState.totalPages) {
                resourcesState.currentPage++;
                renderResources();
                renderPagination();
                scrollToTop();
            }
        });
    }
}

// Reset all filters to default
function resetFilters() {
    const searchInput = document.getElementById('resourceSearch');
    const categoryFilter = document.getElementById('categoryFilter');
    const typeFilter = document.getElementById('typeFilter');
    const sortFilter = document.getElementById('sortFilter');
    
    if (searchInput) searchInput.value = '';
    if (categoryFilter) categoryFilter.value = 'all';
    if (typeFilter) typeFilter.value = 'all';
    if (sortFilter) sortFilter.value = 'newest';
    
    resourcesState.searchQuery = '';
    resourcesState.category = 'all';
    resourcesState.type = 'all';
    resourcesState.sort = 'newest';
    resourcesState.currentPage = 1;
    
    applyFilters();
}

// Apply filters and sort to resources
function applyFilters() {
    // Start with all resources
    let filtered = [...resourcesState.resources];
    
    // Apply category filter
    if (resourcesState.category !== 'all') {
        filtered = filtered.filter(resource => resource.category === resourcesState.category);
    }
    
    // Apply type filter
    if (resourcesState.type !== 'all') {
        filtered = filtered.filter(resource => resource.type === resourcesState.type);
    }
    
    // Apply search query
    if (resourcesState.searchQuery) {
        filtered = filtered.filter(resource => {
            // Search in title
            if (resource.title.toLowerCase().includes(resourcesState.searchQuery)) {
                return true;
            }
            
            // Search in tags
            if (resource.tags && resource.tags.some(tag => 
                tag.toLowerCase().includes(resourcesState.searchQuery)
            )) {
                return true;
            }
            
            // Search in type
            if (resource.type && resource.type.toLowerCase().includes(resourcesState.searchQuery)) {
                return true;
            }
            
            // Search in number
            if (resource.number && resource.number.includes(resourcesState.searchQuery)) {
                return true;
            }
            
            return false;
        });
    }
    
    // Apply sorting - this should be applied to all resources, not just page
    filtered = sortResources(filtered, resourcesState.sort);
    
    // Update filtered resources
    resourcesState.filteredResources = filtered;
    
    // Update pagination
    updatePagination();
    
    // Render filtered resources
    renderResources();
    
    // Render active filters
    renderActiveFilters();

    // Update showing info
    updateShowingInfo();
}

// Sort resources based on selected sort option
function sortResources(resources, sortOption) {
    let sorted;
    
    switch (sortOption) {
        case 'newest':
            sorted = resources.sort((a, b) => b.createdAt - a.createdAt);
            break;
        case 'oldest':
            sorted = resources.sort((a, b) => a.createdAt - b.createdAt);
            break;
        case 'views':
            sorted = resources.sort((a, b) => b.views - a.views);
            break;
        case 'az':
            sorted = resources.sort((a, b) => a.title.localeCompare(b.title));
            break;
        case 'za':
            sorted = resources.sort((a, b) => b.title.localeCompare(a.title));
            break;
        default:
            sorted = resources.sort((a, b) => b.createdAt - a.createdAt);
    }
    
    return sorted;
}

// Update pagination based on filtered resources
function updatePagination() {
    resourcesState.totalPages = Math.max(1, Math.ceil(resourcesState.filteredResources.length / resourcesState.itemsPerPage));
    
    // Ensure current page is valid
    if (resourcesState.currentPage > resourcesState.totalPages) {
        resourcesState.currentPage = resourcesState.totalPages;
    }
    
    // Render pagination
    renderPagination();
}

// Render pagination buttons
function renderPagination() {
    const paginationNumbers = document.getElementById('paginationNumbers');
    const prevPageBtn = document.getElementById('prevPage');
    const nextPageBtn = document.getElementById('nextPage');
    
    if (paginationNumbers) {
        paginationNumbers.innerHTML = '';
        
        // Determine range of pages to show
        let startPage = Math.max(1, resourcesState.currentPage - 2);
        let endPage = Math.min(resourcesState.totalPages, startPage + 4);
        
        // Adjust start if end is maxed out
        if (endPage === resourcesState.totalPages) {
            startPage = Math.max(1, endPage - 4);
        }
        
        // Create page buttons
        for (let i = startPage; i <= endPage; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.classList.add('page-number');
            if (i === resourcesState.currentPage) {
                pageBtn.classList.add('active');
            }
            pageBtn.textContent = i;
            pageBtn.addEventListener('click', () => {
                resourcesState.currentPage = i;
                renderResources();
                renderPagination();
                scrollToTop();
            });
            paginationNumbers.appendChild(pageBtn);
        }
    }
    
    // Update prev/next buttons
    if (prevPageBtn) {
        prevPageBtn.disabled = resourcesState.currentPage === 1;
    }
    
    if (nextPageBtn) {
        nextPageBtn.disabled = resourcesState.currentPage === resourcesState.totalPages;
    }
}

// Render resources based on current page and filters
function renderResources() {
    const resourcesGrid = document.getElementById('resourcesGrid');
    const noResourcesFound = document.getElementById('noResourcesFound');
    
    if (resourcesGrid && noResourcesFound) {
        // Calculate slice indices
        const startIndex = (resourcesState.currentPage - 1) * resourcesState.itemsPerPage;
        const endIndex = startIndex + resourcesState.itemsPerPage;
        
        // Get resources for current page
        const pageResources = resourcesState.filteredResources.slice(startIndex, endIndex);
        
        // Clear grid
        resourcesGrid.innerHTML = '';
        
        // Show appropriate message if no resources
        if (pageResources.length === 0) {
            resourcesGrid.style.display = 'none';
            noResourcesFound.style.display = 'block';
        } else {
            resourcesGrid.style.display = 'grid';
            noResourcesFound.style.display = 'none';
            
            // Render each resource
            pageResources.forEach((resource, index) => {
                const card = createResourceCard(resource, index);
                resourcesGrid.appendChild(card);
                
                // Delayed reveal for staggered animation
                setTimeout(() => {
                    card.classList.add('visible');
                }, index * 100);
            });
        }
    }
}

// Create a resource card element
function createResourceCard(resource, index) {
    // Clone template
    const template = document.getElementById('resourceTemplate');
    const card = document.importNode(template.content, true).querySelector('.resource-card');
    
    // Set resource number based on sort order and current page
    const resourceNumber = card.querySelector('.resource-number');
    if (resourceNumber) {
        // For oldest first, number should increase (001, 002...)
        // For newest first, number should decrease from total (083, 082...)
        let displayNumber;
        const totalResources = resourcesState.filteredResources.length;
        const currentPageStartIndex = (resourcesState.currentPage - 1) * resourcesState.itemsPerPage;
        const positionInFilteredList = currentPageStartIndex + index;
        
        if (resourcesState.sort === 'oldest') {
            // For oldest first: start with 1 and increase
            displayNumber = positionInFilteredList + 1;
        } else if (resourcesState.sort === 'newest') {
            // For newest first: start with total and decrease
            displayNumber = totalResources - positionInFilteredList;
        } else {
            // For other sorts, use original resource number
            displayNumber = resource.number || '000';
        }
        
        // Format to ensure consistent padding (e.g., 001, 023, 083)
        if (typeof displayNumber === 'number') {
            displayNumber = String(displayNumber).padStart(3, '0');
        }
        
        resourceNumber.textContent = `#${displayNumber}`;
    }
    
    // Set bookmark button
    const bookmarkBtn = card.querySelector('.bookmark-btn');
    if (bookmarkBtn) {
        // Check if resource is bookmarked
        checkBookmarkStatus(resource.id)
            .then(isBookmarked => {
                if (isBookmarked) {
                    bookmarkBtn.classList.add('bookmarked');
                    bookmarkBtn.innerHTML = '<i class="fas fa-bookmark"></i>';
                }
                
                // Add bookmark click handler with immediate UI feedback
                bookmarkBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleBookmarkUI(bookmarkBtn);
                    toggleBookmarkInDatabase(resource, bookmarkBtn);
                });
            });
    }
    
    // Set resource title
    const titleElement = card.querySelector('.resource-title');
    if (titleElement) {
        titleElement.textContent = resource.title;
    }
    
    // Set view count
    const viewsCount = card.querySelector('.views-count');
    if (viewsCount) {
        viewsCount.textContent = resource.views || 0;
    }
    
    // Set date
    const dateElement = card.querySelector('.resource-date');
    if (dateElement) {
        dateElement.textContent = formatDate(resource.createdAt);
    }
    
    // Set resource link
    const linkElement = card.querySelector('.resource-link');
    if (linkElement) {
        linkElement.href = resource.link;
        
        // Increment view counter when link is clicked
        linkElement.addEventListener('click', () => {
            incrementViewCount(resource.id);
        });
    }
    
    // Set resource type
    const typeElement = card.querySelector('.resource-type');
    if (typeElement) {
        typeElement.textContent = resource.type ? capitalizeFirstLetter(resource.type) : 'Resource';
    }
    
    // Set resource tags
    const tagsContainer = card.querySelector('.resource-tags');
    if (tagsContainer && resource.tags && resource.tags.length > 0) {
        tagsContainer.innerHTML = '';
        resource.tags.slice(0, 3).forEach(tag => {
            const tagElement = document.createElement('span');
            tagElement.classList.add('resource-tag');
            tagElement.textContent = tag;
            tagsContainer.appendChild(tagElement);
        });
    }
    
    // Set badge (trending, popular, or new)
    const badgeElement = card.querySelector('.resource-badge');
    if (badgeElement) {
        if (resource.isTrending) {
            badgeElement.textContent = 'Trending';
            badgeElement.classList.add('trending');
        } else if (resource.isPopular) {
            badgeElement.textContent = 'Popular';
            badgeElement.classList.add('popular');
        } else {
            // Check if resource is new (less than 14 days old)
            const twoWeeksAgo = new Date();
            twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
            
            if (resource.createdAt > twoWeeksAgo) {
                badgeElement.textContent = 'New';
            } else {
                badgeElement.style.display = 'none';
            }
        }
    }
    
    return card;
}

// Format date to readable string
function formatDate(date) {
    if (!date) return '';
    
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

// Capitalize first letter of string
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

// Check if a resource is bookmarked
async function checkBookmarkStatus(resourceId) {
    try {
        const user = firebase.auth().currentUser;
        if (!user) return false;
        
        const bookmarkDoc = await firebase.firestore()
            .collection('users')
            .doc(user.uid)
            .collection('bookmarks')
            .doc(resourceId)
            .get();
        
        return bookmarkDoc.exists;
    } catch (error) {
        console.error('Error checking bookmark status:', error);
        return false;
    }
}

// Toggle bookmark UI immediately for better UX
function toggleBookmarkUI(buttonElement) {
    const isCurrentlyBookmarked = buttonElement.classList.contains('bookmarked');
    
    // Toggle UI immediately for responsive feedback
    if (isCurrentlyBookmarked) {
        buttonElement.classList.remove('bookmarked');
        buttonElement.innerHTML = '<i class="far fa-bookmark"></i>';
        showNotification('success', 'Resource removed from bookmarks');
    } else {
        buttonElement.classList.add('bookmarked');
        buttonElement.innerHTML = '<i class="fas fa-bookmark"></i>';
        showNotification('success', 'Resource added to bookmarks');
    }
}

// Toggle bookmark in database after UI update
async function toggleBookmarkInDatabase(resource, buttonElement) {
    try {
        const user = firebase.auth().currentUser;
        if (!user) {
            showNotification('error', 'You must be signed in to bookmark resources');
            return;
        }
        
        const isCurrentlyBookmarked = buttonElement.classList.contains('bookmarked');
        const bookmarkRef = firebase.firestore()
            .collection('users')
            .doc(user.uid)
            .collection('bookmarks')
            .doc(resource.id);
        
        if (isCurrentlyBookmarked) {
            // Add bookmark to database with complete resource information
            await bookmarkRef.set({
                resourceId: resource.id,
                title: resource.title,
                number: resource.number,
                type: resource.type,
                category: resource.category,
                link: resource.link,
                tags: resource.tags || [],
                views: resource.views || 0,
                bookmarkedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        } else {
            // Remove bookmark from database
            await bookmarkRef.delete();
        }
    } catch (error) {
        console.error('Error updating bookmark in database:', error);
        // Revert UI if database operation fails
        toggleBookmarkUI(buttonElement);
        showNotification('error', 'Failed to update bookmark. Please try again.');
    }
}

// Increment view count for a resource
async function incrementViewCount(resourceId) {
    try {
        const resourceRef = firebase.firestore().collection('resources').doc(resourceId);
        
        // Use Firebase transaction to safely increment counter
        await firebase.firestore().runTransaction(async transaction => {
            const doc = await transaction.get(resourceRef);
            if (!doc.exists) return;
            
            const currentViews = doc.data().views || 0;
            transaction.update(resourceRef, { views: currentViews + 1 });
        });
    } catch (error) {
        console.error('Error incrementing view count:', error);
    }
}

// Render active filters UI
function renderActiveFilters() {
    const activeFiltersContainer = document.getElementById('activeFilters');
    if (!activeFiltersContainer) return;
    
    activeFiltersContainer.innerHTML = '';
    
    // Add search query filter
    if (resourcesState.searchQuery) {
        addActiveFilterTag(activeFiltersContainer, 'Search', resourcesState.searchQuery, () => {
            resourcesState.searchQuery = '';
            const searchInput = document.getElementById('resourceSearch');
            if (searchInput) searchInput.value = '';
            applyFilters();
        });
    }
    
    // Add category filter
    if (resourcesState.category !== 'all') {
        addActiveFilterTag(activeFiltersContainer, 'Category', capitalizeFirstLetter(resourcesState.category), () => {
            resourcesState.category = 'all';
            const categoryFilter = document.getElementById('categoryFilter');
            if (categoryFilter) categoryFilter.value = 'all';
            applyFilters();
        });
    }
    
    // Add type filter
    if (resourcesState.type !== 'all') {
        addActiveFilterTag(activeFiltersContainer, 'Type', capitalizeFirstLetter(resourcesState.type), () => {
            resourcesState.type = 'all';
            const typeFilter = document.getElementById('typeFilter');
            if (typeFilter) typeFilter.value = 'all';
            applyFilters();
        });
    }
}

// Create and add an active filter tag
function addActiveFilterTag(container, type, value, removeCallback) {
    const filterTag = document.createElement('div');
    filterTag.classList.add('active-filter');
    
    filterTag.innerHTML = `
        ${type}: <strong>${value}</strong>
        <button aria-label="Remove filter"><i class="fas fa-times"></i></button>
    `;
    
    const removeButton = filterTag.querySelector('button');
    if (removeButton) {
        removeButton.addEventListener('click', removeCallback);
    }
    
    container.appendChild(filterTag);
}

// Update resources count in the hero section
function updateResourcesCount() {
    const totalResourcesElement = document.getElementById('totalResources');
    const totalResourcesCountElement = document.getElementById('totalResourcesCount');
    
    if (totalResourcesElement) {
        totalResourcesElement.textContent = resourcesState.resources.length;
    }
    
    if (totalResourcesCountElement) {
        totalResourcesCountElement.textContent = resourcesState.resources.length;
    }
}

// Update "showing X of Y resources" text
function updateShowingInfo() {
    const showingResources = document.getElementById('showingResources');
    if (!showingResources) return;
    
    const startIndex = (resourcesState.currentPage - 1) * resourcesState.itemsPerPage + 1;
    const endIndex = Math.min(startIndex + resourcesState.itemsPerPage - 1, resourcesState.filteredResources.length);
    
    if (resourcesState.filteredResources.length === 0) {
        showingResources.textContent = '0-0';
    } else {
        showingResources.textContent = `${startIndex}-${endIndex}`;
    }
}

// Utility to scroll to top of resource section
function scrollToTop() {
    const resourcesSection = document.querySelector('.resources-main');
    if (resourcesSection) {
        resourcesSection.scrollIntoView({ behavior: 'smooth' });
    }
}

// Show notification with message
function showNotification(type, message, autoClose = true) {
    // Remove existing notification if present
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    let icon = '';
    if (type === 'success') icon = '<i class="fas fa-check-circle"></i>';
    else if (type === 'error') icon = '<i class="fas fa-exclamation-circle"></i>';
    else if (type === 'info') icon = '<i class="fas fa-info-circle"></i>';
    
    notification.innerHTML = `
        ${icon}
        <p>${message}</p>
        <button class="close-btn" aria-label="Close notification">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    // Add to DOM
    document.body.appendChild(notification);
    
    // Handle close button
    const closeBtn = notification.querySelector('.close-btn');
    closeBtn.addEventListener('click', () => {
        notification.classList.add('fade-out');
        setTimeout(() => notification.remove(), 300);
    });
    
    // Auto close after 3 seconds
    if (autoClose) {
        setTimeout(() => {
            if (document.body.contains(notification)) {
                notification.classList.add('fade-out');
                setTimeout(() => {
                    if (document.body.contains(notification)) {
                        notification.remove();
                    }
                }, 300);
            }
        }, 3000);
    }
}

// Debounce function to limit how often a function is called
function debounce(func, wait) {
    let timeout;
    return function() {
        const context = this;
        const args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            func.apply(context, args);
        }, wait);
    };
}

// Add reveal animation for elements
document.addEventListener('DOMContentLoaded', function() {
    const revealElements = document.querySelectorAll('.reveal-element');
    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                setTimeout(() => {
                    entry.target.classList.add('visible');
                }, 100);
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    revealElements.forEach(element => {
        observer.observe(element);
    });
});