// events.js file for handling events page functionality
document.addEventListener('DOMContentLoaded', () => {
    initEventsPage();
});

function initEventsPage() {
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
                    // Add error handling for images
                    img.onerror = function() {
                        console.error("Failed to load image:", src);
                        // Keep placeholder image
                    };
                }
                observer.unobserve(img);
            }
        });
    });

    lazyImages.forEach(img => observer.observe(img));

    // Reveal animations for elements
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
    
    // Event cards visibility (staggered animation)
    const eventCards = document.querySelectorAll('.event-card, .past-event-card');
    const cardObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const card = entry.target;
                // Add staggered animation based on card position
                const cardIndex = Array.from(eventCards).indexOf(card);
                setTimeout(() => {
                    card.classList.add('visible');
                }, 100 * cardIndex);
                
                cardObserver.unobserve(card);
            }
        });
    }, { threshold: 0.15 });

    eventCards.forEach(card => cardObserver.observe(card));

    // Show "No events" message if no events are present
    checkEventsPresence();
}

// Check if there are events and show appropriate message
function checkEventsPresence() {
    // Check upcoming events
    const upcomingEventsGrid = document.getElementById('upcomingEventsGrid');
    const upcomingEvents = upcomingEventsGrid ? 
        upcomingEventsGrid.querySelectorAll('.event-card:not(.no-events-message)') : [];
    const noUpcomingEvents = document.getElementById('noUpcomingEvents');
    
    if (upcomingEventsGrid && noUpcomingEvents) {
        if (upcomingEvents.length === 0) {
            noUpcomingEvents.style.display = 'block';
        } else {
            noUpcomingEvents.style.display = 'none';
        }
    }

    // Check past events
    const pastEventsGrid = document.getElementById('pastEventsGrid');
    const pastEvents = pastEventsGrid ? 
        pastEventsGrid.querySelectorAll('.past-event-card:not(.no-events-message)') : [];
    const noPastEvents = document.getElementById('noPastEvents');
    
    if (pastEventsGrid && noPastEvents) {
        if (pastEvents.length === 0) {
            noPastEvents.style.display = 'block';
        } else {
            noPastEvents.style.display = 'none';
        }
    }
}