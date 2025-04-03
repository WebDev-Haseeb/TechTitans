document.addEventListener('DOMContentLoaded', function () {
    // Initialize Firebase Performance if available
    if (window.firebase && firebase.performance) {
        try {
            const perf = firebase.performance();
            console.log("Performance monitoring initialized");
        } catch (e) {
            console.warn("Performance monitoring initialization failed", e);
        }
    }
    
    // Enable Firestore offline persistence for better performance
    if (window.firebase && firebase.firestore) {
        firebase.firestore().enablePersistence({synchronizeTabs: true})
            .catch(err => console.warn("Offline persistence setup failed:", err.code));
    }

    // Theme Toggle Functionality
    const themeToggle = document.getElementById('themeToggle');

    // Check for saved theme preference or use device preference
    const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');

    // Set initial theme
    if (localStorage.getItem('theme') === 'dark' ||
        (!localStorage.getItem('theme') && prefersDarkScheme.matches)) {
        document.documentElement.setAttribute('data-theme', 'dark');
    } else {
        document.documentElement.setAttribute('data-theme', 'light');
    }

    // Toggle theme when button is clicked
    themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        let newTheme;

        if (currentTheme === 'light') {
            newTheme = 'dark';
        } else {
            newTheme = 'light';
        }

        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    });

    // Mobile Navigation Toggle
    const navToggle = document.getElementById('navToggle');
    const navMenu = document.querySelector('.nav-menu');
    const body = document.querySelector('body');

    navToggle.addEventListener('click', () => {
        navMenu.classList.toggle('active');
        navToggle.classList.toggle('active');

        // Prevent body scroll when menu is open
        if (navMenu.classList.contains('active')) {
            body.style.overflow = 'hidden';
        } else {
            body.style.overflow = '';
        }
    });

    // Close mobile menu when clicking outside
    document.addEventListener('click', (e) => {
        if (navMenu.classList.contains('active') &&
            !e.target.closest('.nav-menu') &&
            !e.target.closest('.nav-toggle')) {
            navMenu.classList.remove('active');
            navToggle.classList.remove('active');
            body.style.overflow = '';
        }
    });

    // Close mobile menu when a link is clicked
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            navMenu.classList.remove('active');
            navToggle.classList.remove('active');
            body.style.overflow = '';
        });
    });

    // WhatsApp Join Community Button
    const joinCommunityBtn = document.getElementById('joinCommunityBtn');
    const whatsappFloat = document.getElementById('whatsappFloat');

    // WhatsApp community link handler (use both buttons)
    const openWhatsApp = (e) => {
        e.preventDefault();
        // Replace with your actual WhatsApp group invite link
        window.open('https://chat.whatsapp.com/your-group-invite-link', '_blank');
    };

    if (joinCommunityBtn) {
        joinCommunityBtn.addEventListener('click', openWhatsApp);
    }

    if (whatsappFloat) {
        whatsappFloat.addEventListener('click', openWhatsApp);
    }

    // Smooth scrolling for internal links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');

            if (href !== "#") {
                e.preventDefault();

                const target = document.querySelector(href);
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            }
        });
    });

    // Add scroll-based navbar styling
    const navbar = document.querySelector('.navbar-container');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('navbar-scrolled');
        } else {
            navbar.classList.remove('navbar-scrolled');
        }
    });

    // Initialize Resource Cards and Lazy Loading
    initResources();

    // Initialize Testimonial Slider
    initTestimonialSlider();

    // Initialize the footer animations
    initFooterAnimations();
});

function initResources() {
    // Lazy loading with Intersection Observer
    const lazyLoadElements = document.querySelectorAll('.lazy-load');
    const revealElements = document.querySelectorAll('.reveal-element');

    // Intersection Observer for lazy loading cards
    if ('IntersectionObserver' in window) {
        // Observer for resource cards
        const cardObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const card = entry.target;
                    // Staggered animation based on index position
                    const cardIndex = Array.from(lazyLoadElements).indexOf(card);

                    setTimeout(() => {
                        card.classList.add('visible');
                        card.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
                    }, 100 * cardIndex);

                    observer.unobserve(card);
                }
            });
        }, { threshold: 0.15 });

        // Observer for reveal elements (section headers, etc)
        const revealObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('revealed');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.15 });

        lazyLoadElements.forEach(element => cardObserver.observe(element));
        revealElements.forEach(element => revealObserver.observe(element));
    } else {
        // Fallback for browsers without Intersection Observer
        lazyLoadElements.forEach(element => element.classList.add('visible'));
        revealElements.forEach(element => element.classList.add('revealed'));
    }

    // Resource filtering functionality
    const filterButtons = document.querySelectorAll('.filter-btn');
    const resourceCards = document.querySelectorAll('.resource-card');

    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Update active button
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            const filterValue = button.getAttribute('data-filter');

            // Filter resources
            resourceCards.forEach(card => {
                if (filterValue === 'all') {
                    card.classList.remove('hidden');

                    // Staggered re-appearance
                    setTimeout(() => {
                        card.classList.add('visible');
                    }, 100 * Array.from(resourceCards).indexOf(card));
                } else {
                    const cardTypes = card.getAttribute('data-types');

                    if (cardTypes && cardTypes.includes(filterValue)) {
                        card.classList.remove('hidden');

                        // Staggered re-appearance
                        setTimeout(() => {
                            card.classList.add('visible');
                        }, 100 * Array.from(resourceCards).indexOf(card));
                    } else {
                        card.classList.add('hidden');
                    }
                }
            });
        });
    });

    // Enhanced interactions for resources
    resourceCards.forEach(card => {
        // Add hover effect that affects siblings
        card.addEventListener('mouseenter', () => {
            resourceCards.forEach(otherCard => {
                if (otherCard !== card && !otherCard.classList.contains('hidden')) {
                    otherCard.style.opacity = '0.7';
                    otherCard.style.transform = 'scale(0.98)';
                }
            });
        });

        card.addEventListener('mouseleave', () => {
            resourceCards.forEach(otherCard => {
                if (!otherCard.classList.contains('hidden')) {
                    otherCard.style.opacity = '';
                    otherCard.style.transform = '';
                }
            });
        });
    });

    // Enhanced lazy loading for user cards
    const userCards = document.querySelectorAll('.user-card.lazy-load');

    if ('IntersectionObserver' in window) {
        const userCardObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const card = entry.target;
                    // Staggered animation based on index position
                    const cardIndex = Array.from(userCards).indexOf(card);

                    setTimeout(() => {
                        card.classList.add('visible');
                        card.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
                    }, 150 * cardIndex); // Slightly longer delay for dramatic effect

                    observer.unobserve(card);
                }
            });
        }, { threshold: 0.15 });

        userCards.forEach(card => userCardObserver.observe(card));
    } else {
        // Fallback for browsers without Intersection Observer
        userCards.forEach(card => card.classList.add('visible'));
    }

    // Interactive effects for user cards
    userCards.forEach(card => {
        const socialLinks = card.querySelectorAll('.social-hover');

        // Add hover effects for social links
        socialLinks.forEach(link => {
            link.addEventListener('mouseenter', () => {
                link.classList.add('pulsing');
            });

            link.addEventListener('mouseleave', () => {
                setTimeout(() => {
                    link.classList.remove('pulsing');
                }, 300);
            });
        });
    });

    // Event cards lazy loading
    const eventCards = document.querySelectorAll('.event-card.lazy-load');

    if ('IntersectionObserver' in window) {
        const eventCardObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const card = entry.target;
                    // Staggered animation based on index position
                    const cardIndex = Array.from(eventCards).indexOf(card);

                    setTimeout(() => {
                        card.classList.add('visible');
                        card.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
                    }, 150 * cardIndex);

                    observer.unobserve(card);
                }
            });
        }, { threshold: 0.15 });

        eventCards.forEach(card => eventCardObserver.observe(card));
    } else {
        // Fallback for browsers without Intersection Observer
        eventCards.forEach(card => card.classList.add('visible'));
    }
}

// Testimonial Slider Functionality
function initTestimonialSlider() {
    const slides = document.querySelectorAll('.testimonial-item');
    const dots = document.querySelectorAll('.dot');
    const prevBtn = document.getElementById('testimonialPrev');
    const nextBtn = document.getElementById('testimonialNext');

    let currentIndex = 0;
    let slideInterval;
    const autoSlideDelay = 5000;
    const slideTotalCount = slides.length;

    // If no testimonials on page, exit early
    if (!slides.length || !dots.length) return;

    // Function to show a specific slide
    const showSlide = (index) => {
        // Remove active class from all slides and dots
        slides.forEach(slide => {
            slide.classList.remove('active');
            slide.style.animation = '';
        });
        dots.forEach(dot => dot.classList.remove('active'));

        // Add active class to current slide and dot
        slides[index].classList.add('active');
        slides[index].style.animation = 'fadeInRight 0.7s ease forwards';
        dots[index].classList.add('active');
    };

    // Start auto-slide
    const startAutoSlide = () => {
        slideInterval = setInterval(() => {
            currentIndex = (currentIndex + 1) % slideTotalCount;
            showSlide(currentIndex);
        }, autoSlideDelay);
    };

    // Stop auto-slide
    const stopAutoSlide = () => {
        clearInterval(slideInterval);
    };

    // Initialize auto-slide
    startAutoSlide();

    // Event listeners for navigation
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            stopAutoSlide();
            currentIndex = (currentIndex - 1 + slideTotalCount) % slideTotalCount;
            showSlide(currentIndex);
            startAutoSlide();
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            stopAutoSlide();
            currentIndex = (currentIndex + 1) % slideTotalCount;
            showSlide(currentIndex);
            startAutoSlide();
        });
    }

    // Event listeners for dots
    dots.forEach((dot, index) => {
        dot.addEventListener('click', () => {
            stopAutoSlide();
            currentIndex = index;
            showSlide(currentIndex);
            startAutoSlide();
        });
    });

    // Pause auto-advance when hovering over testimonials
    const testimonialSlider = document.getElementById('testimonialSlider');
    if (testimonialSlider) {
        testimonialSlider.addEventListener('mouseenter', stopAutoSlide);
        testimonialSlider.addEventListener('mouseleave', startAutoSlide);
    }

    // Handle touch events for mobile swipe
    let touchStartX = 0;
    let touchEndX = 0;

    const handleSwipe = () => {
        if (touchStartX - touchEndX > 50) {
            // Swipe left - go to next slide
            stopAutoSlide();
            currentIndex = (currentIndex + 1) % slideTotalCount;
            showSlide(currentIndex);
            startAutoSlide();
        }
        if (touchEndX - touchStartX > 50) {
            // Swipe right - go to previous slide
            stopAutoSlide();
            currentIndex = (currentIndex - 1 + slideTotalCount) % slideTotalCount;
            showSlide(currentIndex);
            startAutoSlide();
        }
    };

    if (testimonialSlider) {
        testimonialSlider.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });

        testimonialSlider.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            handleSwipe();
        }, { passive: true });
    }
}


function initFooterAnimations() {
    const footerLogo = document.querySelector('.footer-logo');
    const footerColumns = document.querySelectorAll('.footer-links-column');
    const footerBottom = document.querySelector('.footer-bottom');
    
    // Initialize Intersection Observer for footer elements
    if ('IntersectionObserver' in window) {
        const footerObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                }
            });
        }, { 
            threshold: 0.15,
            rootMargin: '0px 0px -50px 0px'
        });
        
        // Observe footer elements
        if (footerLogo) footerObserver.observe(footerLogo);
        if (footerBottom) footerObserver.observe(footerBottom);
        
        footerColumns.forEach(column => {
            footerObserver.observe(column);
        });
    } else {
        // Fallback for browsers without Intersection Observer
        if (footerLogo) footerLogo.classList.add('visible');
        if (footerBottom) footerBottom.classList.add('visible');
        
        footerColumns.forEach(column => {
            column.classList.add('visible');
        });
    }
    
    // Update the email address
    const emailElement = document.querySelector('.footer-contact li:first-child');
    if (emailElement) {
        const mailtoLink = document.createElement('a');
        mailtoLink.href = 'mailto:contact@techtitans.team';
        mailtoLink.textContent = 'contact@techtitans.team';
        
        // Replace the content
        emailElement.innerHTML = '<i class="fas fa-envelope"></i> ';
        emailElement.appendChild(mailtoLink);
    }
    
    // Update the copyright year
    const copyrightElement = document.querySelector('.copyright p');
    if (copyrightElement) {
        const currentYear = new Date().getFullYear();
        copyrightElement.textContent = `© ${currentYear} TechTitans. All rights reserved.`;
    }
}