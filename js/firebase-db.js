// Initialize Firestore
const db = firebase.firestore();

// User profile functions
const userProfile = {
  // Get current user profile from Firestore
  async get(userId) {
    try {
      const doc = await db.collection('users').doc(userId).get();
      return doc.exists ? doc.data() : null;
    } catch (error) {
      console.error('Error getting user profile:', error);
      return null;
    }
  },

  // Create or update user profile
  async update(userId, profileData) {
    try {
      await db.collection('users').doc(userId).set(profileData, { merge: true });
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

  // Get public profile by share ID
  async getByShareId(shareId) {
    try {
      const snapshot = await db.collection('users')
        .where('profileShareId', '==', shareId)
        .limit(1)
        .get();
      
      if (snapshot.empty) return null;
      
      return snapshot.docs[0].data();
    } catch (error) {
      console.error('Error getting shared profile:', error);
      return null;
    }
  }
};

// Bookmarks functions
const bookmarks = {
  // Get user's bookmarks
  async getAll(userId) {
    try {
      const snapshot = await db.collection('users').doc(userId)
        .collection('bookmarks').get();
        
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting bookmarks:', error);
      return [];
    }
  },

  // Add a bookmark
  async add(userId, resourceData) {
    try {
      await db.collection('users').doc(userId)
        .collection('bookmarks').add({
          resourceId: resourceData.id,
          title: resourceData.title,
          category: resourceData.category,
          bookmarkedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      return true;
    } catch (error) {
      console.error('Error adding bookmark:', error);
      return false;
    }
  },

  // Remove a bookmark
  async remove(userId, bookmarkId) {
    try {
      await db.collection('users').doc(userId)
        .collection('bookmarks').doc(bookmarkId).delete();
      return true;
    } catch (error) {
      console.error('Error removing bookmark:', error);
      return false;
    }
  }
};