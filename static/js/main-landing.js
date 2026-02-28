// ==========================================
// LANDING PAGE JAVASCRIPT - Paragony
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initScrollReveal();
    initFAQ();
    initScrollToTop();
    initSmoothScroll();
    initCounterAnimation();
    initMobileMenu();
    initDemoModal();
    initFAQSearch();
    initFAQCategories();
    initEnhancedFAQ();
    initDemoTabs();
    initScanDemo();
    initDashboardDemo();
    initLimitsDemo(); // Added missing init
    initAssistantDemo();
    initSavingsCalculator();
    initPricingComparison();
    initNewsletter();
});

// ==========================================
// NAVIGATION
// ==========================================

function initNavigation() {
    const nav = document.getElementById('landing-nav');
    
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            nav.classList.add('scrolled');
        } else {
            nav.classList.remove('scrolled');
        }
    });
}

// ==========================================
// MOBILE MENU
// ==========================================

function initMobileMenu() {
    const toggle = document.getElementById('nav-toggle');
    const menu = document.getElementById('nav-menu');
    
    if (!toggle || !menu) return;
    
    toggle.addEventListener('click', () => {
        menu.classList.toggle('active');
        
        // Animate hamburger
        const spans = toggle.querySelectorAll('span');
        if (menu.classList.contains('active')) {
            spans[0].style.transform = 'rotate(45deg) translateY(8px)';
            spans[1].style.opacity = '0';
            spans[2].style.transform = 'rotate(-45deg) translateY(-8px)';
        } else {
            spans[0].style.transform = '';
            spans[1].style.opacity = '';
            spans[2].style.transform = '';
        }
    });
    
    // Close menu on link click
    const navLinks = menu.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            menu.classList.remove('active');
            const spans = toggle.querySelectorAll('span');
            spans[0].style.transform = '';
            spans[1].style.opacity = '';
            spans[2].style.transform = '';
        });
    });
}

// ==========================================
// SCROLL REVEAL ANIMATION
// ==========================================

function initScrollReveal() {
    const revealElements = document.querySelectorAll('.reveal');
    
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                // Staggered animation
                setTimeout(() => {
                    entry.target.classList.add('active');
                }, index * 100);
                
                // Unobserve after reveal
                revealObserver.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });
    
    revealElements.forEach(element => {
        revealObserver.observe(element);
    });
}

// ==========================================
// FAQ ACCORDION (Old - kept for compatibility)
// ==========================================

function initFAQ() {
    const faqItems = document.querySelectorAll('.faq-item');
    
    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        const answer = item.querySelector('.faq-answer');
        
        if (!question || !answer) return;
        
        question.addEventListener('click', () => {
            const isActive = item.classList.contains('active');
            
            // Close all items
            faqItems.forEach(otherItem => {
                otherItem.classList.remove('active');
                const otherAnswer = otherItem.querySelector('.faq-answer');
                if (otherAnswer) {
                    otherAnswer.style.maxHeight = null;
                }
            });
            
            // Open clicked item if it wasn't active
            if (!isActive) {
                item.classList.add('active');
                answer.style.maxHeight = answer.scrollHeight + 'px';
            }
        });
    });
}

// ==========================================
// ENHANCED FAQ
// ==========================================

function initEnhancedFAQ() {
    const faqItems = document.querySelectorAll('.faq-item-enhanced');
    
    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question-enhanced');
        const answer = item.querySelector('.faq-answer-enhanced');
        
        if (!question || !answer) return;
        
        question.addEventListener('click', () => {
            const isActive = item.classList.contains('active');
            
            // Close all items
            faqItems.forEach(otherItem => {
                otherItem.classList.remove('active');
            });
            
            // Open clicked item if it wasn't active
            if (!isActive) {
                item.classList.add('active');
            }
        });
    });
}

// ==========================================
// FAQ SEARCH
// ==========================================

function initFAQSearch() {
    const searchInput = document.getElementById('faq-search-input');
    const faqItems = document.querySelectorAll('.faq-item-enhanced');
    
    if (!searchInput) return;
    
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        
        faqItems.forEach(item => {
            const questionText = item.querySelector('.faq-question-enhanced span').textContent.toLowerCase();
            const answerText = item.querySelector('.faq-answer-enhanced p').textContent.toLowerCase();
            
            if (questionText.includes(searchTerm) || answerText.includes(searchTerm)) {
                item.style.display = '';
            } else {
                item.style.display = 'none';
            }
        });
        
        // If search is empty, show all
        if (searchTerm === '') {
            faqItems.forEach(item => {
                item.style.display = '';
            });
        }
    });
}

// ==========================================
// FAQ CATEGORIES
// ==========================================

function initFAQCategories() {
    const categoryBtns = document.querySelectorAll('.faq-category-btn');
    const faqItems = document.querySelectorAll('.faq-item-enhanced');
    
    categoryBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const category = btn.dataset.category;
            
            // Update active state
            categoryBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Filter items
            faqItems.forEach(item => {
                const itemCategory = item.dataset.category;
                
                if (category === 'all' || itemCategory === category) {
                    item.style.display = '';
                } else {
                    item.style.display = 'none';
                }
            });
            
            // Clear search
            const searchInput = document.getElementById('faq-search-input');
            if (searchInput) {
                searchInput.value = '';
            }
        });
    });
}

// ==========================================
// SCROLL TO TOP BUTTON
// ==========================================

function initScrollToTop() {
    const scrollBtn = document.getElementById('scroll-to-top');
    
    if (!scrollBtn) return;
    
    window.addEventListener('scroll', () => {
        if (window.scrollY > 500) {
            scrollBtn.classList.add('visible');
        } else {
            scrollBtn.classList.remove('visible');
        }
    });
    
    scrollBtn.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
}

// ==========================================
// SMOOTH SCROLL
// ==========================================

function initSmoothScroll() {
    const links = document.querySelectorAll('a[href^="#"]');
    
    links.forEach(link => {
        link.addEventListener('click', (e) => {
            const href = link.getAttribute('href');
            
            // Ignore empty anchors
            if (href === '#' || href === '#demo') {
                e.preventDefault();
                return;
            }
            
            const target = document.querySelector(href);
            
            if (target) {
                e.preventDefault();
                
                const navHeight = 70; // Height of fixed nav
                const targetPosition = target.offsetTop - navHeight;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
}

// ==========================================
// COUNTER ANIMATION
// ==========================================

function initCounterAnimation() {
    const counters = document.querySelectorAll('.stat-number[data-target]');
    
    const counterObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const counter = entry.target;
                const target = parseInt(counter.getAttribute('data-target'));
                
                animateCounter(counter, target);
                counterObserver.unobserve(counter);
            }
        });
    }, {
        threshold: 0.5
    });
    
    counters.forEach(counter => {
        counterObserver.observe(counter);
    });
}

function animateCounter(element, target) {
    const duration = 2000; // 2 seconds
    const steps = 60;
    const increment = target / steps;
    let current = 0;
    const stepDuration = duration / steps;
    
    const timer = setInterval(() => {
        current += increment;
        
        if (current >= target) {
            element.textContent = formatNumber(target);
            clearInterval(timer);
        } else {
            element.textContent = formatNumber(Math.floor(current));
        }
    }, stepDuration);
}

function formatNumber(num) {
    if (num >= 1000) {
        return (num / 1000).toFixed(0) + 'k';
    }
    return num.toString();
}

// ==========================================
// PARALLAX EFFECT (Optional Enhancement)
// ==========================================

function initParallax() {
    const hero = document.querySelector('.hero');
    
    if (!hero) return;
    
    window.addEventListener('scroll', () => {
        const scrolled = window.scrollY;
        const rate = scrolled * 0.5;
        
        hero.style.transform = `translateY(${rate}px)`;
    });
}

// ==========================================
// TYPED TEXT EFFECT (Optional Enhancement)
// ==========================================

function initTypedEffect() {
    const typedElement = document.querySelector('.gradient-text');
    
    if (!typedElement) return;
    
    const words = ['inteligentnie', 'automatycznie', 'efektywnie', 'łatwo'];
    let wordIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    
    function type() {
        const currentWord = words[wordIndex];
        
        if (isDeleting) {
            typedElement.textContent = currentWord.substring(0, charIndex - 1);
            charIndex--;
        } else {
            typedElement.textContent = currentWord.substring(0, charIndex + 1);
            charIndex++;
        }
        
        if (!isDeleting && charIndex === currentWord.length) {
            // Pause at end
            setTimeout(() => {
                isDeleting = true;
                type();
            }, 2000);
            return;
        }
        
        if (isDeleting && charIndex === 0) {
            isDeleting = false;
            wordIndex = (wordIndex + 1) % words.length;
        }
        
        const typeSpeed = isDeleting ? 50 : 100;
        setTimeout(type, typeSpeed);
    }
    
    // Uncomment to enable typed effect
    // type();
}

// ==========================================
// FEATURE CARD TILT EFFECT (Optional)
// ==========================================

function initCardTilt() {
    const cards = document.querySelectorAll('.feature-card, .benefit-card, .pricing-card');
    
    cards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            
            const rotateX = (y - centerY) / 20;
            const rotateY = (centerX - x) / 20;
            
            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`;
        });
        
        card.addEventListener('mouseleave', () => {
            card.style.transform = '';
        });
    });
}

// Uncomment to enable tilt effect
// document.addEventListener('DOMContentLoaded', initCardTilt);

// ==========================================
// LAZY LOADING IMAGES (Optional)
// ==========================================

function initLazyLoading() {
    const images = document.querySelectorAll('img[data-src]');
    
    const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.removeAttribute('data-src');
                imageObserver.unobserve(img);
            }
        });
    });
    
    images.forEach(img => imageObserver.observe(img));
}

// ==========================================
// UTILITY: Debounce Function
// ==========================================

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ==========================================
// UTILITY: Throttle Function
// ==========================================

function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// ==========================================
// PERFORMANCE: Optimize Scroll Events
// ==========================================

const optimizedScrollHandler = throttle(() => {
    // Scroll-based animations here
}, 100);

window.addEventListener('scroll', optimizedScrollHandler);

// ==========================================
// ANALYTICS (Optional)
// ==========================================

function trackEvent(category, action, label) {
    // Google Analytics or other tracking
    if (typeof gtag !== 'undefined') {
        gtag('event', action, {
            'event_category': category,
            'event_label': label
        });
    }
    
    console.log(`Event tracked: ${category} - ${action} - ${label}`);
}

// Track CTA clicks
document.addEventListener('click', (e) => {
    const button = e.target.closest('.btn-primary, .btn-register');
    if (button) {
        const buttonText = button.textContent.trim();
        trackEvent('CTA', 'click', buttonText);
    }
});

// ==========================================
// PRELOADER (Optional)
// ==========================================

window.addEventListener('load', () => {
    // Hide preloader if exists
    const preloader = document.querySelector('.preloader');
    if (preloader) {
        preloader.classList.add('hidden');
    }
    
    // Add loaded class to body
    document.body.classList.add('loaded');
});

// ==========================================
// EASTER EGGS (Optional Fun)
// ==========================================

let konamiCode = [];
const konamiSequence = [
    'ArrowUp', 'ArrowUp', 
    'ArrowDown', 'ArrowDown', 
    'ArrowLeft', 'ArrowRight', 
    'ArrowLeft', 'ArrowRight', 
    'b', 'a'
];

document.addEventListener('keydown', (e) => {
    konamiCode.push(e.key);
    konamiCode = konamiCode.slice(-konamiSequence.length);
    
    if (konamiCode.join('') === konamiSequence.join('')) {
        activateEasterEgg();
    }
});

function activateEasterEgg() {
    // Add fun animation or feature
    document.body.style.animation = 'rainbow 2s infinite';
    
    const style = document.createElement('style');
    style.textContent = `
        @keyframes rainbow {
            0% { filter: hue-rotate(0deg); }
            100% { filter: hue-rotate(360deg); }
        }
    `;
    document.head.appendChild(style);
    
    setTimeout(() => {
        document.body.style.animation = '';
    }, 5000);
    
    console.log('🎉 Easter egg activated! 🎉');
}

// ==========================================
// DEMO MODAL
// ==========================================

function initDemoModal() {
    const demoModal = document.getElementById('demo-modal');
    const demoModalClose = document.getElementById('demo-modal-close');
    const demoBtns = document.querySelectorAll('a[href="#demo"]');
    
    if (!demoModal) return;
    
    // Open modal
    demoBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            demoModal.classList.add('active');
            document.body.style.overflow = 'hidden';
            
            // Animate counters in modal
            setTimeout(() => {
                animateDemoCounters();
                initDemoCharts();
                simulateLiveUpdates();
            }, 300);
        });
    });
    
    // Close modal
    const closeModal = () => {
        demoModal.classList.remove('active');
        document.body.style.overflow = '';
        stopLiveUpdates();
    };
    
    if (demoModalClose) {
        demoModalClose.addEventListener('click', closeModal);
    }
    
    // Close on backdrop click
    demoModal.addEventListener('click', (e) => {
        if (e.target === demoModal) {
            closeModal();
        }
    });
    
    // Close on ESC key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && demoModal.classList.contains('active')) {
            closeModal();
        }
    });
    
    // Interactive filter buttons
    const filterBtns = document.querySelectorAll('.chart-filter');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active from siblings
            btn.parentElement.querySelectorAll('.chart-filter').forEach(b => {
                b.classList.remove('active');
            });
            // Add active to clicked
            btn.classList.add('active');
            
            // Show toast (simulated action)
            showDemoToast('Zmieniono zakres danych: ' + btn.textContent);
            
            // Simulate chart update
            updateDemoChart();
        });
    });
    
    // Interactive nav items
    const navItems = document.querySelectorAll('.demo-nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            navItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            showDemoToast('Przełączono widok: ' + item.querySelector('span').textContent);
        });
    });
}

function animateDemoCounters() {
    const counters = document.querySelectorAll('.stat-value[data-count]');
    
    counters.forEach(counter => {
        const target = parseInt(counter.getAttribute('data-count'));
        const currency = counter.getAttribute('data-currency') || '';
        const duration = 1500;
        const steps = 30;
        const increment = target / steps;
        let current = 0;
        const stepDuration = duration / steps;
        
        const timer = setInterval(() => {
            current += increment;
            
            if (current >= target) {
                counter.textContent = formatDemoNumber(target) + (currency ? ' ' + currency : '');
                clearInterval(timer);
            } else {
                counter.textContent = formatDemoNumber(Math.floor(current)) + (currency ? ' ' + currency : '');
            }
        }, stepDuration);
    });
}

function initDemoCharts() {
    // Animate bars
    const bars = document.querySelectorAll('.chart-bar');
    bars.forEach((bar, index) => {
        bar.style.height = '0%';
        setTimeout(() => {
            const targetHeight = bar.parentElement.getAttribute('data-amount') / 3.5 + '%'; // Scale factor
            bar.style.height = bar.style.getPropertyValue('--height');
        }, 100 + (index * 100));
    });
    
    // Animate donut
    const donut = document.querySelector('.donut-chart');
    if (donut) {
        donut.style.transform = 'rotate(-180deg) scale(0.8)';
        donut.style.opacity = '0';
        setTimeout(() => {
            donut.style.transition = 'all 1s cubic-bezier(0.34, 1.56, 0.64, 1)';
            donut.style.transform = 'rotate(0deg) scale(1)';
            donut.style.opacity = '1';
        }, 500);
    }
}

function updateDemoChart() {
    const bars = document.querySelectorAll('.chart-bar');
    bars.forEach((bar, index) => {
        // Randomize heights for demo effect
        const newHeight = Math.floor(Math.random() * 80) + 20 + '%';
        bar.style.height = '0%';
        setTimeout(() => {
            bar.style.height = newHeight;
        }, 100 + (index * 50));
    });
}

let liveUpdateInterval;

function simulateLiveUpdates() {
    // Simulate a new transaction every few seconds
    if (liveUpdateInterval) clearInterval(liveUpdateInterval);
    
    liveUpdateInterval = setInterval(() => {
        const chance = Math.random();
        if (chance > 0.7) { // 30% chance
            showNewTransaction();
        }
    }, 5000);
}

function stopLiveUpdates() {
    if (liveUpdateInterval) clearInterval(liveUpdateInterval);
}

function showNewTransaction() {
    const stores = ['Żabka', 'Carrefour', 'Auchan', 'Empik', 'McDonalds'];
    const amounts = [24.50, 156.20, 42.90, 89.00, 35.50];
    
    const store = stores[Math.floor(Math.random() * stores.length)];
    const amount = amounts[Math.floor(Math.random() * amounts.length)];
    
    const list = document.querySelector('.transactions-list');
    if (!list) return;
    
    const item = document.createElement('div');
    item.className = 'transaction-item';
    item.style.opacity = '0';
    item.style.transform = 'translateX(-20px)';
    item.innerHTML = `
        <div class="trans-icon" style="background: #6366f1">N</div>
        <div class="trans-details">
            <div class="trans-store">${store}</div>
            <div class="trans-date">Przed chwilą</div>
        </div>
        <div class="trans-amount">-${amount.toFixed(2)} zł</div>
    `;
    
    list.insertBefore(item, list.firstChild);
    
    // Animate in
    setTimeout(() => {
        item.style.opacity = '1';
        item.style.transform = 'translateX(0)';
    }, 50);
    
    // Remove last if too many
    if (list.children.length > 6) {
        list.lastElementChild.remove();
    }
    
    // Update total spent
    const totalEl = document.querySelector('.stat-value[data-currency="zł"]');
    if (totalEl) {
        let current = parseInt(totalEl.textContent.replace(/\D/g, ''));
        current += Math.floor(amount);
        totalEl.textContent = formatDemoNumber(current) + ' zł';
        
        // Flash effect
        totalEl.style.color = '#ef4444';
        setTimeout(() => {
            totalEl.style.color = '';
        }, 500);
    }
    
    showDemoToast(`Nowa transakcja: ${store} (-${amount.toFixed(2)} zł)`);
}

function formatDemoNumber(num) {
    if (num >= 1000) {
        return num.toLocaleString('pl-PL');
    }
    return num.toString();
}

function showDemoToast(message) {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        bottom: 2rem;
        right: 2rem;
        background: #1e293b;
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 12px;
        box-shadow: 0 10px 25px rgba(0,0,0,0.3);
        z-index: 10000;
        animation: slideInRight 0.3s ease;
        font-size: 0.875rem;
        max-width: 300px;
        display: flex;
        align-items: center;
        gap: 0.75rem;
    `;
    toast.innerHTML = `<i class="fas fa-info-circle" style="color: #6366f1"></i> ${message}`;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
            if (document.body.contains(toast)) {
                document.body.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

// Add animation styles
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// ==========================================
// CONSOLE MESSAGE
// ==========================================

console.log(
    '%c👋 Witaj w Paragony! ',
    'background: #6366f1; color: white; font-size: 20px; padding: 10px; border-radius: 5px;'
);

console.log(
    '%cInteresuje Cię kod? Dołącz do nas! ',
    'font-size: 14px; color: #6366f1;'
);

// ==========================================
// ERROR HANDLING
// ==========================================

window.addEventListener('error', (e) => {
    console.error('JavaScript Error:', e.message);
    
    // Send to error tracking service in production
    // trackError(e.message, e.filename, e.lineno);
});

// ==========================================
// SERVICE WORKER (For PWA - Optional)
// ==========================================

if ('serviceWorker' in navigator) {
    // window.addEventListener('load', () => {
    //     navigator.serviceWorker.register('/sw.js')
    //         .then(reg => console.log('Service Worker registered'))
    //         .catch(err => console.log('Service Worker registration failed'));
    // });
}

// ==========================================
// EXPORT FOR TESTING (Optional)
// ==========================================

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        formatNumber,
        animateCounter,
        debounce,
        throttle
    };
}

// ==========================================
// DEMO TABS
// ==========================================

function initDemoTabs() {
    const tabs = document.querySelectorAll('.demo-tab');
    const contents = document.querySelectorAll('.demo-content');
    
    if (!tabs.length) return;
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const demoType = tab.dataset.demo;
            
            // Update active states
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            contents.forEach(c => c.classList.remove('active'));
            const targetContent = document.getElementById(`demo-${demoType}`);
            if (targetContent) {
                targetContent.classList.add('active');
            }
        });
    });
}

// ==========================================
// SCAN DEMO ANIMATION
// ==========================================

function initScanDemo() {
    const btn = document.getElementById('demo-scan-btn');
    const cameraView = document.getElementById('scan-camera-view');
    const processingView = document.getElementById('scan-processing-view');
    const resultView = document.getElementById('scan-result-view');
    const shutter = document.getElementById('demo-shutter');
    const highlights = document.getElementById('ocr-highlights');
    const itemsList = document.getElementById('scan-items-list');
    
    if (!btn) return;

    btn.addEventListener('click', () => {
        if (btn.disabled) return;
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Symulacja w toku...';

        // Reset
        cameraView.classList.remove('hidden');
        processingView.classList.add('hidden');
        resultView.classList.add('hidden');
        highlights.innerHTML = '';
        itemsList.innerHTML = '';
        cameraView.classList.remove('scanning');

        // 1. Shutter & Scan Start
        setTimeout(() => {
            if(shutter) {
                shutter.style.transform = 'scale(0.9)';
                setTimeout(() => shutter.style.transform = 'scale(1)', 100);
            }
            cameraView.classList.add('scanning');
        }, 500);

        // 2. OCR Highlights (staggered)
        const boxes = [
            { t: '25%', l: '10%', w: '40%', h: '4%' },
            { t: '25%', l: '80%', w: '15%', h: '4%' },
            { t: '30%', l: '10%', w: '50%', h: '4%' },
            { t: '30%', l: '80%', w: '15%', h: '4%' },
            { t: '35%', l: '10%', w: '30%', h: '4%' },
            { t: '35%', l: '80%', w: '15%', h: '4%' },
            { t: '50%', l: '40%', w: '30%', h: '6%' } // Total
        ];

        boxes.forEach((box, i) => {
            setTimeout(() => {
                const div = document.createElement('div');
                div.className = 'ocr-box';
                div.style.top = box.t;
                div.style.left = box.l;
                div.style.width = box.w;
                div.style.height = box.h;
                highlights.appendChild(div);
            }, 1500 + (i * 300));
        });

        // 3. Processing View
        setTimeout(() => {
            cameraView.classList.add('hidden');
            processingView.classList.remove('hidden');
            
            const steps = processingView.querySelectorAll('.step');
            if(steps.length) {
                steps.forEach(s => { s.className = 'step pending'; });
                setTimeout(() => { steps[0].className = 'step completed'; steps[1].className = 'step active'; }, 500);
                setTimeout(() => { steps[1].className = 'step completed'; steps[2].className = 'step active'; }, 1500);
                setTimeout(() => { steps[2].className = 'step completed'; }, 2500);
            }
        }, 4000);

        // 4. Result View
        setTimeout(() => {
            processingView.classList.add('hidden');
            resultView.classList.remove('hidden');
            
            const items = [
                { name: 'Mleko 3.2%', price: '3.50 zł' },
                { name: 'Chleb Razowy', price: '4.20 zł' },
                { name: 'Masło Extra', price: '6.99 zł' },
                { name: 'Ser Gouda', price: '8.50 zł' },
                { name: 'Szynka Wiejska', price: '12.90 zł' }
            ];

            items.forEach((item, i) => {
                setTimeout(() => {
                    const row = document.createElement('div');
                    row.className = 'receipt-item-row';
                    row.innerHTML = `<span>${item.name}</span><span>${item.price}</span>`;
                    itemsList.appendChild(row);
                }, i * 200);
            });

            btn.innerHTML = '<i class="fas fa-check"></i> Zakończono';
            setTimeout(() => {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-play"></i> Uruchom ponownie';
            }, 2000);

        }, 7500);
    });
}

// ==========================================
// DASHBOARD DEMO INTERACTION
// ==========================================

function initDashboardDemo() {
    const btn = document.getElementById('demo-dashboard-btn');
    const cursor = document.getElementById('demo-cursor');
    const chartContainer = document.getElementById('demo-chart-bars');
    const tooltip = document.getElementById('demo-chart-tooltip');
    const statCard = document.getElementById('d-stat-2');
    
    if (!btn) return;

    btn.addEventListener('click', () => {
        if (btn.disabled) return;
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Odtwarzanie...';

        // Reset
        chartContainer.innerHTML = '';
        tooltip.classList.add('hidden');
        cursor.style.opacity = '0';
        cursor.style.top = '50%';
        cursor.style.left = '50%';
        if(statCard) statCard.classList.remove('hovered');

        // 1. Draw Chart
        const heights = [40, 70, 50, 90, 60, 80, 45];
        heights.forEach((h, i) => {
            const bar = document.createElement('div');
            bar.className = 'd-bar';
            bar.style.height = '0%';
            chartContainer.appendChild(bar);
            setTimeout(() => { bar.style.height = h + '%'; }, 100 + (i * 100));
        });

        // 2. Move Cursor to Bar
        setTimeout(() => {
            cursor.classList.add('active');
            cursor.style.top = '60%';
            cursor.style.left = '55%'; // Approx middle bar
        }, 1500);

        // 3. Hover Bar
        setTimeout(() => {
            const bars = chartContainer.querySelectorAll('.d-bar');
            if(bars[3]) bars[3].classList.add('active');
            cursor.classList.add('clicking');
            setTimeout(() => cursor.classList.remove('clicking'), 200);
            
            tooltip.style.left = '55%';
            tooltip.style.bottom = '95%';
            tooltip.classList.remove('hidden');
        }, 2500);

        // 4. Move to Stat Card
        setTimeout(() => {
            const bars = chartContainer.querySelectorAll('.d-bar');
            if(bars[3]) bars[3].classList.remove('active');
            tooltip.classList.add('hidden');
            
            cursor.style.top = '25%';
            cursor.style.left = '75%'; // Stat card pos
        }, 4000);

        // 5. Click Stat Card
        setTimeout(() => {
            if(statCard) statCard.classList.add('hovered');
            cursor.classList.add('clicking');
            setTimeout(() => cursor.classList.remove('clicking'), 200);
        }, 5000);

        // 6. Update Chart
        setTimeout(() => {
            const bars = chartContainer.querySelectorAll('.d-bar');
            bars.forEach(b => b.style.background = 'var(--color-green)');
            
            btn.innerHTML = '<i class="fas fa-check"></i> Zakończono';
            setTimeout(() => {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-play"></i> Zobacz interakcję';
                cursor.classList.remove('active');
            }, 2000);
        }, 5500);
    });
}

// ==========================================
// LIMITS DEMO
// ==========================================

function initLimitsDemo() {
    const btn = document.getElementById('demo-limits-btn');
    const list = document.getElementById('demo-limits-list');
    const toast = document.getElementById('demo-transaction-toast');
    const modal = document.getElementById('demo-limit-alert');
    
    if (!btn) return;

    // Initial Render
    const renderLimits = (progress = 80) => {
        list.innerHTML = `
            <div class="limit-item">
                <div class="limit-header">
                    <span class="limit-category">Żywność</span>
                    <span class="limit-amount">${progress === 80 ? '1200' : '1524'} / 1500 zł</span>
                </div>
                <div class="limit-bar">
                    <div class="limit-progress ${progress > 100 ? 'danger' : ''}" style="width: ${progress}%"></div>
                </div>
                <div class="limit-status ${progress > 100 ? 'danger' : 'safe'}">
                    ${progress > 100 ? 'Przekroczono o 24 zł' : 'W normie'}
                </div>
            </div>
            <div class="limit-item">
                <div class="limit-header">
                    <span class="limit-category">Paliwo</span>
                    <span class="limit-amount">450 / 600 zł</span>
                </div>
                <div class="limit-bar">
                    <div class="limit-progress" style="width: 75%"></div>
                </div>
                <div class="limit-status safe">W normie</div>
            </div>
            <div class="limit-item">
                <div class="limit-header">
                    <span class="limit-category">Rozrywka</span>
                    <span class="limit-amount">120 / 400 zł</span>
                </div>
                <div class="limit-bar">
                    <div class="limit-progress" style="width: 30%"></div>
                </div>
                <div class="limit-status safe">W normie</div>
            </div>
        `;
    };
    renderLimits();

    btn.addEventListener('click', () => {
        if (btn.disabled) return;
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Symulacja...';

        // Reset
        renderLimits(80);
        modal.classList.add('hidden');
        toast.classList.remove('visible');

        // 1. Show Toast
        setTimeout(() => {
            toast.classList.add('visible');
            // Auto hide toast after 3s
            setTimeout(() => toast.classList.remove('visible'), 3000);
        }, 1000);

        // 2. Update Limit
        setTimeout(() => {
            renderLimits(102); // Over limit
        }, 2500);

        // 3. Show Alert
        setTimeout(() => {
            modal.classList.remove('hidden');
            
            btn.innerHTML = '<i class="fas fa-check"></i> Zakończono';
            setTimeout(() => {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-play"></i> Symuluj zakup';
                modal.classList.add('hidden');
            }, 3000);
        }, 3500);
    });
}

// ==========================================
// ASSISTANT DEMO
// ==========================================

function initAssistantDemo() {
    const btn = document.getElementById('demo-assistant-btn');
    const messages = document.getElementById('demo-chat-messages');
    const input = document.getElementById('demo-chat-input');
    
    if (!btn) return;

    btn.addEventListener('click', () => {
        if (btn.disabled) return;
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Pisanie...';

        // Reset
        messages.innerHTML = '';
        input.textContent = '';

        // 1. Type Question
        const question = "Ile wydałem na paliwo w tym miesiącu?";
        let i = 0;
        const typeInterval = setInterval(() => {
            input.textContent += question.charAt(i);
            i++;
            if (i >= question.length) {
                clearInterval(typeInterval);
                
                // 2. Send
                setTimeout(() => {
                    input.textContent = '';
                    addMessage(question, 'user');
                    
                    // 3. Typing Indicator
                    setTimeout(() => {
                        const typingId = addTypingIndicator();
                        
                        // 4. Response
                        setTimeout(() => {
                            removeMessage(typingId);
                            streamResponse("W tym miesiącu wydałeś łącznie <strong>450 zł</strong> na paliwo. To o 50 zł mniej niż w zeszłym miesiącu! 🚗");
                            
                            btn.innerHTML = '<i class="fas fa-check"></i> Zakończono';
                            setTimeout(() => {
                                btn.disabled = false;
                                btn.innerHTML = '<i class="fas fa-play"></i> Zadaj pytanie';
                            }, 2000);
                        }, 2000);
                    }, 500);
                }, 500);
            }
        }, 50);
    });

    function addMessage(text, type) {
        const div = document.createElement('div');
        div.className = `chat-message ${type}`;
        div.innerHTML = text;
        messages.appendChild(div);
        messages.scrollTop = messages.scrollHeight;
        return div;
    }

    function addTypingIndicator() {
        const id = 'typing-' + Date.now();
        const div = document.createElement('div');
        div.id = id;
        div.className = 'chat-message assistant';
        div.innerHTML = '<div class="typing-indicator"><span></span><span></span><span></span></div>';
        messages.appendChild(div);
        messages.scrollTop = messages.scrollHeight;
        return id;
    }

    function removeMessage(id) {
        const el = document.getElementById(id);
        if (el) el.remove();
    }

    function streamResponse(html) {
        const div = document.createElement('div');
        div.className = 'chat-message assistant';
        messages.appendChild(div);
        
        div.innerHTML = html;
        messages.scrollTop = messages.scrollHeight;
    }
}

// ==========================================
// SAVINGS CALCULATOR
// ==========================================

function initSavingsCalculator() {
    const slider = document.getElementById('spending-slider');
    const spendingValue = document.getElementById('spending-value');
    const savingsMonth = document.getElementById('savings-month');
    const savingsYear = document.getElementById('savings-year');
    
    if (!slider) return;
    
    slider.addEventListener('input', (e) => {
        const spending = parseInt(e.target.value);
        const savings = Math.round(spending * 0.14); // 14% savings
        const yearSavings = savings * 12;
        
        if (spendingValue) spendingValue.textContent = spending.toLocaleString('pl-PL');
        if (savingsMonth) savingsMonth.textContent = savings.toLocaleString('pl-PL');
        if (savingsYear) savingsYear.textContent = yearSavings.toLocaleString('pl-PL');
    });
}

// ==========================================
// PRICING COMPARISON TABLE
// ==========================================

function initPricingComparison() {
    const toggleBtn = document.getElementById('toggle-comparison');
    const comparisonTable = document.getElementById('comparison-table');
    
    if (!toggleBtn || !comparisonTable) return;
    
    toggleBtn.addEventListener('click', () => {
        comparisonTable.classList.toggle('hidden');
        
        if (comparisonTable.classList.contains('hidden')) {
            toggleBtn.innerHTML = '<i class="fas fa-table"></i> Porównaj wszystkie funkcje';
        } else {
            toggleBtn.innerHTML = '<i class="fas fa-times"></i> Ukryj porównanie';
        }
    });
}

// ==========================================
// NEWSLETTER
// ==========================================

function initNewsletter() {
    const form = document.getElementById('newsletter-form');
    
    if (!form) return;
    
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const input = form.querySelector('input');
        const button = form.querySelector('button');
        const status = form.querySelector('.form-status');
        
        if (!input.value) return;
        
        // Simulate loading
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        button.disabled = true;
        
        setTimeout(() => {
            // Success state
            button.innerHTML = '<i class="fas fa-check"></i>';
            button.style.background = 'var(--success)';
            
            // Show toast
            showDemoToast('Dziękujemy za zapisanie się do newslettera!');
            
            // Reset form
            input.value = '';
            
            setTimeout(() => {
                button.innerHTML = '<i class="fas fa-paper-plane"></i>';
                button.style.background = '';
                button.disabled = false;
            }, 3000);
        }, 1500);
    });
    
    // Update copyright year
    const yearSpan = document.getElementById('current-year');
    if (yearSpan) {
        yearSpan.textContent = new Date().getFullYear();
    }
}

// Initialize newsletter
document.addEventListener('DOMContentLoaded', initNewsletter);
