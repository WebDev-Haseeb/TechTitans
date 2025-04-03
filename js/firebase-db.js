// Initialize Firestore
const db = firebase.firestore();

const networkStatus = {
  isOnline: navigator.onLine,
  lastChecked: Date.now()
};

// Listen for online/offline events
window.addEventListener('online', () => {
  console.log("App is online");
  networkStatus.isOnline = true;
  networkStatus.lastChecked = Date.now();
});

window.addEventListener('offline', () => {
  console.log("App is offline");
  networkStatus.isOnline = false;
  networkStatus.lastChecked = Date.now();
});

// Set up caching to improve performance
const CACHE_DURATION = 300000; // 5 minutes in milliseconds
const memoryCache = {
  profiles: new Map(),
  bookmarks: new Map(),

  // Get item from cache
  getItem(collection, key) {
    if (!this[collection]) return null;

    const cachedItem = this[collection].get(key);
    if (!cachedItem) return null;

    // Check if cache has expired
    if ((Date.now() - cachedItem.timestamp) > CACHE_DURATION) {
      this[collection].delete(key);
      return null;
    }

    return cachedItem.data;
  },

  // Set item in cache
  setItem(collection, key, data) {
    if (!this[collection]) return;

    this[collection].set(key, {
      data,
      timestamp: Date.now()
    });
  },

  // Clear cache for a specific item or collection
  clearItem(collection, key) {
    if (key && this[collection]) {
      this[collection].delete(key);
    } else if (this[collection]) {
      this[collection].clear();
    }
  }
};

// User profile functions
const userProfile = {
  // Get current user profile from Firestore with caching
  async get(userId) {
    try {
      // Try cache first
      const cachedProfile = memoryCache.getItem('profiles', userId);
      if (cachedProfile) {
        console.log("Using cached profile data");
        return cachedProfile;
      }

      // Try from localStorage next (localStorage persists across page loads)
      const storedProfile = localStorage.getItem(`profile_${userId}`);
      if (storedProfile) {
        const parsedProfile = JSON.parse(storedProfile);
        const cacheAge = Date.now() - parsedProfile.timestamp;

        // Use stored profile if it's not too old
        if (cacheAge < CACHE_DURATION) {
          console.log("Using stored profile data");

          // Also update memory cache
          memoryCache.setItem('profiles', userId, parsedProfile.data);

          return parsedProfile.data;
        }
      }

      // Get from Firestore if not in cache
      console.log("Fetching profile from Firestore");
      const doc = await db.collection('users').doc(userId).get();

      if (doc.exists) {
        const data = doc.data();

        // Cache the result in memory
        memoryCache.setItem('profiles', userId, data);

        // Also cache in localStorage
        localStorage.setItem(`profile_${userId}`, JSON.stringify({
          data,
          timestamp: Date.now()
        }));

        return data;
      }

      return null;
    } catch (error) {
      console.error('Error getting user profile:', error);
      return null;
    }
  },

  // Create or update user profile
  async update(userId, profileData) {
    try {
      await db.collection('users').doc(userId).set(profileData, { merge: true });

      // Clear cache to ensure fresh data on next request
      memoryCache.clearItem('profiles', userId);
      localStorage.removeItem(`profile_${userId}`);

      return true;
    } catch (error) {
      console.error('Error updating profile:', error);
      return false;
    }
  },

  // Create unique share ID for profile sharing
  generateShareId() {
    return Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15);
  },

  // Get public profile by share ID with optimized query
  async getByShareId(shareId) {
    try {
      // Check cache first
      const cacheKey = `share_${shareId}`;
      const cachedProfile = memoryCache.getItem('profiles', cacheKey);
      if (cachedProfile) {
        console.log("Using cached shared profile data");
        return cachedProfile;
      }

      // Try from localStorage next
      const storedProfile = localStorage.getItem(`profile_shared_${shareId}`);
      if (storedProfile) {
        const parsedProfile = JSON.parse(storedProfile);
        const cacheAge = Date.now() - parsedProfile.timestamp;

        // Use stored profile if it's not too old
        if (cacheAge < CACHE_DURATION) {
          console.log("Using stored shared profile data");

          // Also update memory cache
          memoryCache.setItem('profiles', cacheKey, parsedProfile.data);

          return parsedProfile.data;
        }
      }

      // Query Firestore with optimized field selection
      console.log("Fetching shared profile from Firestore");
      const snapshot = await db.collection('users')
        .where('profileShareId', '==', shareId)
        .select('firstName', 'lastName', 'bio', 'photoURL', 'socialLinks', 'profileShareId')
        .limit(1)
        .get();

      if (snapshot.empty) return null;

      const data = snapshot.docs[0].data();

      // Cache results
      memoryCache.setItem('profiles', cacheKey, data);

      localStorage.setItem(`profile_shared_${shareId}`, JSON.stringify({
        data,
        timestamp: Date.now()
      }));

      return data;
    } catch (error) {
      console.error('Error getting shared profile:', error);
      return null;
    }
  }
};

// Bookmarks functions
const bookmarks = {
  // Get user's bookmarks with caching
  async getAll(userId) {
    try {
      // Try cache first
      const cachedBookmarks = memoryCache.getItem('bookmarks', userId);
      if (cachedBookmarks) {
        console.log("Using cached bookmarks");
        return cachedBookmarks;
      }

      // Fetch from Firestore
      console.log("Fetching bookmarks from Firestore");
      const snapshot = await db.collection('users').doc(userId)
        .collection('bookmarks')
        .orderBy('bookmarkedAt', 'desc')
        .get();

      const bookmarks = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Cache results
      memoryCache.setItem('bookmarks', userId, bookmarks);

      return bookmarks;
    } catch (error) {
      console.error('Error getting bookmarks:', error);
      return [];
    }
  },

  // Add a bookmark
  async add(userId, resourceData) {
    try {
      // Save to Firestore
      const docRef = await db.collection('users').doc(userId)
        .collection('bookmarks').add({
          resourceId: resourceData.id,
          title: resourceData.title,
          category: resourceData.category,
          bookmarkedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

      // Clear cache to ensure fresh data next time
      memoryCache.clearItem('bookmarks', userId);

      return true;
    } catch (error) {
      console.error('Error adding bookmark:', error);
      return false;
    }
  },

  // Remove a bookmark with optimistic UI update
  async remove(userId, bookmarkId) {
    try {
      // Delete from Firestore
      await db.collection('users').doc(userId)
        .collection('bookmarks').doc(bookmarkId).delete();

      // Clear cache
      memoryCache.clearItem('bookmarks', userId);

      return true;
    } catch (error) {
      console.error('Error removing bookmark:', error);
      return false;
    }
  }
};

// Helper functions
const helpers = {
  // Debounce function to limit frequency of operations
  debounce(func, wait) {
    let timeout;
    return function (...args) {
      const context = this;
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(context, args), wait);
    };
  },

  // Clear caches
  clearAllCaches() {
    memoryCache.clearItem('profiles');
    memoryCache.clearItem('bookmarks');

    // Clear relevant localStorage entries
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('profile_') || key.startsWith('userCheck_')) {
        localStorage.removeItem(key);
      }
    });
  }
};

// Make modules available globally for other scripts
window.dbModules = {
  userProfile,
  bookmarks,
  helpers,
  cacheStore: memoryCache
};