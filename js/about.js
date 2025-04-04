document.addEventListener('DOMContentLoaded', () => {
    // Lazy loading for images
    const lazyImages = document.querySelectorAll('.lazy-load img');
    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                const src = img.getAttribute('data-src');
                if (src) {
                    img.src = src;
                    img.removeAttribute('data-src');
                }
                observer.unobserve(img);
            }
        });
    });

    lazyImages.forEach(img => observer.observe(img));

    // Reveal animations
    const revealElements = document.querySelectorAll('.reveal-element');
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                revealObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.2 });

    revealElements.forEach(el => revealObserver.observe(el));

    // FAQ toggle functionality
    const faqItems = document.querySelectorAll('.faq-item');
    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        question.addEventListener('click', () => {
            item.classList.toggle('active');
        });
    });

    // Contact form validation and submission with Firestore integration
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const name = document.getElementById('name').value.trim();
            const email = document.getElementById('email').value.trim();
            const subject = document.getElementById('subject').value.trim() || 'General Inquiry';
            const message = document.getElementById('message').value.trim();
            
            // Validate fields
            if (!name || !email || !message) {
                showNotification('error', 'Please fill in all required fields.');
                return;
            }

            if (!isValidEmail(email)) {
                showNotification('error', 'Please enter a valid email address.');
                return;
            }

            // Disable submit button and show loading state
            const submitBtn = contactForm.querySelector('.submit-btn');
            const originalBtnText = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';

            try {
                // Create message object
                const messageData = {
                    name,
                    email,
                    subject,
                    message,
                    read: false,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                };
                
                // Store message in Firestore
                await firebase.firestore().collection('messages').add(messageData);
                
                // Show success notification
                showNotification('success', 'Your message has been sent successfully!');
                
                // Reset form
                contactForm.reset();
            } catch (error) {
                console.error('Error sending message:', error);
                showNotification('error', 'Failed to send your message. Please try again later.');
            } finally {
                // Restore button state
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnText;
            }
        });
    }

    // Helper function to validate email
    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Enhanced notification system (compatible with existing notifications)
    function showNotification(type, message) {
        // Use existing notification system if available
        if (window.showNotification) {
            return window.showNotification(type, message);
        }
        
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        // Add icon based on notification type
        let icon;
        switch (type) {
            case 'success': icon = 'fa-check-circle'; break;
            case 'error': icon = 'fa-exclamation-circle'; break;
            case 'info':
            default: icon = 'fa-info-circle';
        }
        
        notification.innerHTML = `
            <i class="fas ${icon}"></i>
            <span>${message}</span>
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.classList.add('visible');
        }, 100);

        setTimeout(() => {
            notification.classList.remove('visible');
            setTimeout(() => notification.remove(), 300);
        }, 4000);
    }
    
    // Setup Join Community button behavior
    const joinCommunityBtnCTA = document.getElementById('joinCommunityBtnCTA');
    if (joinCommunityBtnCTA) {
        joinCommunityBtnCTA.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Check if user is signed in
            if (firebase.auth().currentUser) {
                // User is signed in, redirect to profile page
                window.location.href = 'profile.html';
            } else {
                // User is not signed in, trigger Google sign-in
                signInWithGoogle().then(() => {
                    // After successful sign-in, redirect to profile page
                    if (firebase.auth().currentUser) {
                        window.location.href = 'profile.html';
                    }
                }).catch(error => {
                    console.error("Sign-in failed:", error);
                    showNotification('error', 'Sign-in failed. Please try again.');
                });
            }
        });
    }
});