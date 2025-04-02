document.addEventListener('DOMContentLoaded', function () {
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
});

// Testimonial Slider Functionality
document.addEventListener('DOMContentLoaded', function () {
    // Existing code is here...

    // Initialize testimonial slider
    initTestimonialSlider();
});

function initTestimonialSlider() {
    const slides = document.querySelectorAll('.testimonial-item');
    const dots = document.querySelectorAll('.dot');
    const prevBtn = document.getElementById('testimonialPrev');
    const nextBtn = document.getElementById('testimonialNext');
    let currentIndex = 0;
    let slideInterval;

    // If no testimonials on page, exit early
    if (!slides.length || !dots.length) return;

    // Function to show a specific slide
    const showSlide = (index) => {
        slides.forEach(slide => slide.classList.remove('active'));
        dots.forEach(dot => dot.classList.remove('active'));

        slides[index].classList.add('active');
        dots[index].classList.add('active');
    };

    // Start auto-slide
    const startAutoSlide = () => {
        slideInterval = setInterval(() => {
            currentIndex = (currentIndex + 1) % slides.length;
            showSlide(currentIndex);
        }, 5000); // Change slide every 5 seconds
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
            currentIndex = (currentIndex - 1 + slides.length) % slides.length;
            showSlide(currentIndex);
            startAutoSlide();
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            stopAutoSlide();
            currentIndex = (currentIndex + 1) % slides.length;
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
            currentIndex = (currentIndex + 1) % slides.length;
            showSlide(currentIndex);
            startAutoSlide();
        }
        if (touchEndX - touchStartX > 50) {
            // Swipe right - go to previous slide
            stopAutoSlide();
            currentIndex = (currentIndex - 1 + slides.length) % slides.length;
            showSlide(currentIndex);
            startAutoSlide();
        }
    };

    if (testimonialSlider) {
        testimonialSlider.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
        });

        testimonialSlider.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            handleSwipe();
        });
    }
}