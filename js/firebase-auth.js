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
      
      // Remove any existing event listeners
      const newLoginBtn = loginBtn.cloneNode(true);
      loginBtn.parentNode.replaceChild(newLoginBtn, loginBtn);
      
      // Add new event listener
      newLoginBtn.addEventListener('click', function(e) {
        e.preventDefault();
        // Will be expanded later to show a dropdown menu or profile page
        if (confirm('Do you want to sign out?')) {
          signOut();
        }
      });
    }
  
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
      newLoginBtn.addEventListener('click', function(e) {
        e.preventDefault();
        signInWithGoogle();
      });
    }
  
    // Show notification only if explicitly requested (not on page reload)
    if (showNotificationFlag) {
      showNotification('info', 'You have been signed out');
    }
  
    // Remove user information from localStorage
    localStorage.removeItem('user');
  }
  
  // Consolidated function to show notifications
  function showNotification(type, message) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    // Set the icon based on notification type
    let icon;
    switch(type) {
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
        newLoginBtn.addEventListener('click', function(e) {
          e.preventDefault();
          signInWithGoogle();
        });
      }
    }
  });