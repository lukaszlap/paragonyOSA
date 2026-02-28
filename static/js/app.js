// Main Application Controller
class App {
    constructor() {
        this.currentView = null;
        this.initializeNavigation();
        this.initializeFloatingButtonVisibility();
        this.checkAuthentication();
        this.initializeSessionKeepAlive();
        this.initializeMiniChat();
    }

    // Initialize floating button visibility - hidden by default, shown after login
    initializeFloatingButtonVisibility() {
        const floatingBtn = document.getElementById('floating-assistant-btn');
        if (floatingBtn) {
            // Force hide on init - will only be shown after successful checkAuthentication
            floatingBtn.style.display = 'none';
        }
    }

    // Initialize mini chat floating button
    initializeMiniChat() {
        if (window.assistantManager) {
            window.assistantManager.initializeMiniChat();
        }
    }

    // Initialize session keep-alive mechanism
    initializeSessionKeepAlive() {
        // Refresh session on user activity (mouse, keyboard, touch)
        const refreshSession = () => {
            if (api.getToken()) {
                api.refreshSessionTimestamp();
            }
        };

        // Add event listeners for user activity
        document.addEventListener('click', refreshSession, true);
        document.addEventListener('keydown', refreshSession, true);
        document.addEventListener('scroll', refreshSession, true);
        document.addEventListener('touchstart', refreshSession, true);

        // Also refresh periodically (every 15 minutes) to keep session alive
        setInterval(() => {
            if (api.getToken() && api.isSessionValid()) {
                api.refreshSessionTimestamp();
                console.log('Session refreshed. Session info:', api.getSessionInfo());
            }
        }, 15 * 60 * 1000); // 15 minutes
    }

    initializeNavigation() {
        // Setup sidebar toggle for mobile
        const sidebarToggle = document.getElementById('sidebar-toggle');
        const sidebar = document.getElementById('sidebar');
        const sidebarBackdrop = document.getElementById('sidebar-backdrop');
        const updateSidebarState = () => {
            if (!sidebar) {
                return;
            }
            const isOpen = sidebar.classList.contains('open');
            document.body.classList.toggle('sidebar-open', isOpen);
        };

        const closeSidebar = () => {
            if (sidebar && sidebarBackdrop) {
                sidebar.classList.remove('open');
                sidebarBackdrop.classList.remove('active');
                updateSidebarState();
            }
        };

        // Setup navigation links (both old nav-link and new sidebar-menu-link)
        const navLinks = document.querySelectorAll('.nav-link, .sidebar-menu-link, [data-view]');
        
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const viewName = link.dataset.view;
                if (viewName) {
                    this.navigateTo(viewName);
                    // Close sidebar on mobile after clicking a link
                    closeSidebar();
                }
            });
        });

        if (sidebarToggle && sidebar && sidebarBackdrop) {
            sidebarToggle.addEventListener('click', () => {
                sidebar.classList.toggle('open');
                sidebarBackdrop.classList.toggle('active');
                updateSidebarState();
            });

            sidebarBackdrop.addEventListener('click', () => {
                closeSidebar();
            });

            updateSidebarState();
        }

        // Setup mobile bottom navigation
        const mobileNavItems = document.querySelectorAll('.mobile-nav-item[data-view]');
        mobileNavItems.forEach(item => {
            item.addEventListener('click', () => {
                const viewName = item.dataset.view;
                if (viewName) {
                    // Update active state
                    mobileNavItems.forEach(i => i.classList.remove('active'));
                    item.classList.add('active');
                    
                    // Navigate to view
                    this.navigateTo(viewName);
                    
                    // Close sidebar if open
                    closeSidebar();
                }
            });
        });

        // Setup mobile notifications button
        const mobileNotifBtn = document.getElementById('mobile-notifications-btn');
        if (mobileNotifBtn) {
            mobileNotifBtn.addEventListener('click', () => {
                this.navigateTo('notifications');
            });
        }

        // Setup desktop notifications button
        const notificationsBtn = document.getElementById('notifications-btn');
        if (notificationsBtn) {
            notificationsBtn.addEventListener('click', () => {
                this.navigateTo('notifications');
            });
        }

        // Setup navbar search with dropdown
        this.initializeNavbarSearch();

        // Setup user menu dropdown
        const userMenuWrapper = document.getElementById('user-menu');
        const userMenuBtn = document.getElementById('user-menu-btn');
        const userMenuDropdown = document.getElementById('user-menu-dropdown');

        const closeUserMenu = () => {
            if (!userMenuDropdown || !userMenuBtn) {
                return;
            }
            userMenuDropdown.classList.remove('open');
            userMenuDropdown.classList.add('hidden');
            userMenuBtn.classList.remove('active');
            userMenuBtn.setAttribute('aria-expanded', 'false');
        };

        const openUserMenu = () => {
            if (!userMenuDropdown || !userMenuBtn) {
                return;
            }
            userMenuDropdown.classList.remove('hidden');
            userMenuDropdown.classList.add('open');
            userMenuBtn.classList.add('active');
            userMenuBtn.setAttribute('aria-expanded', 'true');
        };

        if (userMenuBtn && userMenuDropdown) {
            userMenuBtn.addEventListener('click', (event) => {
                event.stopPropagation();
                const isOpen = userMenuDropdown.classList.contains('open');
                if (isOpen) {
                    closeUserMenu();
                } else {
                    openUserMenu();
                }
            });

            document.addEventListener('click', (event) => {
                if (!userMenuWrapper) {
                    return;
                }
                if (!userMenuWrapper.contains(event.target)) {
                    closeUserMenu();
                }
            });

            document.addEventListener('keydown', (event) => {
                if (event.key === 'Escape') {
                    closeUserMenu();
                }
            });

            userMenuDropdown.querySelectorAll('[data-view]').forEach(item => {
                item.addEventListener('click', () => {
                    closeUserMenu();
                });
            });
        }

        // Setup tabs functionality
        this.initializeTabs();
    }

    initializeTabs() {
        const tabs = document.querySelectorAll('.tab[data-tab]');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.dataset.tab;
                const tabsContainer = tab.closest('.tabs, .tabs-pills');
                const tabContents = tab.closest('.col-span-2, .content-section')?.querySelectorAll('.tab-content');

                // Remove active class from all tabs in this container
                tabsContainer.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                
                // Add active class to clicked tab
                tab.classList.add('active');

                // Hide all tab contents and show the selected one
                if (tabContents) {
                    tabContents.forEach(content => {
                        content.classList.remove('active');
                        if (content.id === `${tabName}-tab`) {
                            content.classList.add('active');
                        }
                    });
                }
            });
        });
    }

    initializeNavbarSearch() {
        const navbarSearchInput = document.querySelector('.form-search-input');
        const navbarSearchClear = document.getElementById('navbar-search-clear');
        const searchDropdown = document.getElementById('navbar-search-dropdown');
        const recentSearchesList = document.getElementById('recent-searches-list');
        const quickResultsList = document.getElementById('quick-results-list');
        const clearHistoryBtn = document.getElementById('clear-search-history');
        const viewAllBtn = document.getElementById('view-all-results');
        const recentSection = document.getElementById('recent-searches-section');
        const quickSection = document.getElementById('quick-results-section');

        let searchDebounce = null;
        let quickSearchCache = null;

        if (!navbarSearchInput || !searchDropdown) return;

        // Show/hide clear button
        const updateClearButton = () => {
            if (navbarSearchClear) {
                if (navbarSearchInput.value.trim()) {
                    navbarSearchClear.classList.remove('hidden');
                } else {
                    navbarSearchClear.classList.add('hidden');
                }
            }
        };

        // Clear search
        if (navbarSearchClear) {
            navbarSearchClear.addEventListener('click', () => {
                navbarSearchInput.value = '';
                updateClearButton();
                this.showRecentSearches(recentSearchesList, recentSection);
                if (quickSection) quickSection.classList.add('hidden');
                navbarSearchInput.focus();
            });
        }

        // Show recent searches on focus
        navbarSearchInput.addEventListener('focus', () => {
            searchDropdown.classList.remove('hidden');
            navbarSearchInput.setAttribute('aria-expanded', 'true');
            if (!navbarSearchInput.value.trim()) {
                this.showRecentSearches(recentSearchesList, recentSection);
                if (quickSection) quickSection.classList.add('hidden');
            }
        });

        // Hide dropdown on outside click
        document.addEventListener('click', (e) => {
            if (!navbarSearchInput.contains(e.target) && !searchDropdown.contains(e.target)) {
                searchDropdown.classList.add('hidden');
                navbarSearchInput.setAttribute('aria-expanded', 'false');
            }
        });

        // Handle input and show quick results
        navbarSearchInput.addEventListener('input', () => {
            updateClearButton();
            const query = navbarSearchInput.value.trim();

            if (query.length < 2) {
                this.showRecentSearches(recentSearchesList, recentSection);
                if (quickSection) quickSection.classList.add('hidden');
                return;
            }

            if (recentSection) recentSection.classList.add('hidden');
            if (quickSection) quickSection.classList.remove('hidden');

            if (searchDebounce) clearTimeout(searchDebounce);
            
            searchDebounce = setTimeout(async () => {
                await this.performQuickSearch(query, quickResultsList);
            }, 300);
        });

        // Handle Enter key
        navbarSearchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const query = navbarSearchInput.value.trim();
                if (query) {
                    this.saveSearchQuery(query);
                    this.navigateToFullSearch(query);
                }
            }
        });

        // Clear history
        if (clearHistoryBtn) {
            clearHistoryBtn.addEventListener('click', () => {
                localStorage.removeItem('searchHistory');
                this.showRecentSearches(recentSearchesList, recentSection);
            });
        }

        // View all results
        if (viewAllBtn) {
            viewAllBtn.addEventListener('click', () => {
                const query = navbarSearchInput.value.trim();
                if (query) {
                    this.saveSearchQuery(query);
                }
                this.navigateToFullSearch(query || '');
            });
        }

        // Initialize with recent searches
        this.showRecentSearches(recentSearchesList, recentSection);
    }

    getSearchHistory() {
        try {
            const history = localStorage.getItem('searchHistory');
            return history ? JSON.parse(history) : [];
        } catch (e) {
            return [];
        }
    }

    saveSearchQuery(query) {
        if (!query || query.length < 2) return;
        
        let history = this.getSearchHistory();
        history = history.filter(q => q !== query);
        history.unshift(query);
        history = history.slice(0, 10);
        
        try {
            localStorage.setItem('searchHistory', JSON.stringify(history));
        } catch (e) {
            console.error('Failed to save search history:', e);
        }
    }

    showRecentSearches(container, section) {
        if (!container || !section) return;

        const history = this.getSearchHistory();

        if (history.length === 0) {
            section.classList.add('hidden');
            return;
        }

        section.classList.remove('hidden');
        container.innerHTML = history.map(query => `
            <div class="search-dropdown-item" data-query="${this.escapeHtml(query)}">
                <div class="search-dropdown-item-icon">
                    <i class="fas fa-history"></i>
                </div>
                <div class="search-dropdown-item-content">
                    <div class="search-dropdown-item-title">${this.escapeHtml(query)}</div>
                </div>
                <i class="fas fa-arrow-up-right" style="color: var(--gray-400); font-size: 12px;"></i>
            </div>
        `).join('');

        // Add click listeners
        container.querySelectorAll('.search-dropdown-item').forEach(item => {
            item.addEventListener('click', () => {
                const query = item.dataset.query;
                this.navigateToFullSearch(query);
            });
        });
    }

    async performQuickSearch(query, container) {
        if (!container) return;

        container.innerHTML = '<div class="search-dropdown-empty"><i class="fas fa-spinner fa-spin"></i><div>Wyszukiwanie...</div></div>';

        try {
            let products = [];
            
            if (window.searchManager && window.searchManager.productsData.length > 0) {
                products = window.searchManager.productsData;
            } else {
                products = await api.getProductsForReceipt();
            }

            const normalizedQuery = query.toLowerCase();
            const results = products
                .filter(p => (p.nazwa || '').toLowerCase().includes(normalizedQuery))
                .slice(0, 5);

            if (results.length === 0) {
                container.innerHTML = '<div class="search-dropdown-empty"><i class="fas fa-search"></i><div>Brak wyników</div></div>';
                return;
            }

            container.innerHTML = results.map(product => `
                <div class="search-dropdown-item" data-product-id="${product.id_produktu}">
                    <div class="search-dropdown-item-icon">
                        <i class="fas fa-shopping-basket"></i>
                    </div>
                    <div class="search-dropdown-item-content">
                        <div class="search-dropdown-item-title">${this.escapeHtml(product.nazwa)}</div>
                        <div class="search-dropdown-item-meta">
                            <span><i class="fas fa-store"></i> ${this.escapeHtml(product.nazwa_firmy || 'Brak danych')}</span>
                        </div>
                    </div>
                    <div class="search-dropdown-item-price">${ui.formatCurrency(product.cena)}</div>
                </div>
            `).join('');

            // Add click listeners
            container.querySelectorAll('.search-dropdown-item').forEach(item => {
                item.addEventListener('click', () => {
                    this.navigateToFullSearch(query);
                });
            });

        } catch (error) {
            console.error('Quick search failed:', error);
            container.innerHTML = '<div class="search-dropdown-empty"><i class="fas fa-exclamation-triangle"></i><div>Błąd wyszukiwania</div></div>';
        }
    }

    navigateToFullSearch(query) {
        const navbarSearchInput = document.querySelector('.form-search-input');
        const searchDropdown = document.getElementById('navbar-search-dropdown');
        
        if (searchDropdown) searchDropdown.classList.add('hidden');
        if (navbarSearchInput) navbarSearchInput.value = query || '';

        this.navigateTo('search');
        
        setTimeout(() => {
            const searchPageInput = document.getElementById('search-page-input');
            if (searchPageInput) {
                searchPageInput.value = query || '';
                if (query) {
                    searchPageInput.dispatchEvent(new Event('input'));
                }
                searchPageInput.focus();
            }
        }, 100);
    }

    escapeHtml(text) {
        if (text === null || text === undefined) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    async checkAuthentication() {
        // Check if user is logged in
        const isAuthenticated = await authManager.checkSession();
        
        const floatingBtn = document.getElementById('floating-assistant-btn');
        if (floatingBtn) {
            // Show floating assistant button only if authenticated
            if (isAuthenticated) {
                floatingBtn.style.display = 'flex';
            } else {
                floatingBtn.style.display = 'none';
            }
        }
        
        // Initialize mini chat visibility based on current view
        const currentView = this.currentView || 'dashboard';
        this.updateMiniChatVisibility(currentView);
    }

    initializeKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            const navbarSearchInput = document.querySelector('.form-search-input');
            const searchDropdown = document.getElementById('navbar-search-dropdown');

            // Ctrl+K or Cmd+K to focus search
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                if (navbarSearchInput) {
                    navbarSearchInput.focus();
                }
            }

            // / to focus search (if not in input)
            if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && 
                document.activeElement.tagName !== 'TEXTAREA') {
                e.preventDefault();
                if (navbarSearchInput) {
                    navbarSearchInput.focus();
                }
            }

            // Escape to clear search and close dropdown
            if (e.key === 'Escape') {
                if (navbarSearchInput && document.activeElement === navbarSearchInput) {
                    navbarSearchInput.value = '';
                    navbarSearchInput.blur();
                    if (searchDropdown) {
                        searchDropdown.classList.add('hidden');
                    }
                    const clearBtn = document.getElementById('navbar-search-clear');
                    if (clearBtn) {
                        clearBtn.classList.add('hidden');
                    }
                }
            }
        });
    }

    navigateTo(viewName) {
        const viewId = `${viewName}-view`;
        
        // Clean up camera if leaving scan view
        if (this.currentView === 'scan' && viewName !== 'scan' && window.scanManager) {
            window.scanManager.closeCamera();
        }
        
        // Update current view
        this.currentView = viewName;
        
        // Show the view
        ui.showContentView(viewId);
        
        // Hide mini chat when on assistant view
        this.updateMiniChatVisibility(viewName);
        
        // Initialize view-specific managers
        this.initializeView(viewName);
    }

    // Control mini chat visibility based on current view
    updateMiniChatVisibility(viewName) {
        const miniChat = document.getElementById('assistant-mini-chat');
        const floatingBtn = document.getElementById('floating-assistant-btn');
        
        if (!miniChat || !floatingBtn) return;
        
        // Only show button if user is authenticated
        const token = api.getToken();
        const isAuthenticated = token && api.isSessionValid();
        
        if (viewName === 'assistant') {
            // Hide mini chat and button on full assistant view
            miniChat.classList.remove('active');
            floatingBtn.style.display = 'none';
        } else {
            // Show mini chat button on other views ONLY if authenticated
            if (isAuthenticated) {
                floatingBtn.style.display = 'flex';
            } else {
                floatingBtn.style.display = 'none';
            }
        }
    }

    async initializeView(viewName) {
        switch(viewName) {
            case 'dashboard':
                if (window.dashboardManager) {
                    await window.dashboardManager.initialize();
                }
                break;
                
            case 'scan':
                if (window.scanManager) {
                    window.scanManager.checkApiKey();
                }
                break;
                
            case 'receipts':
                if (window.receiptsManager) {
                    await window.receiptsManager.initialize();
                }
                break;
                
            case 'limits':
                if (window.limitsManager) {
                    await window.limitsManager.initialize();
                }
                break;
                
            case 'reports':
                if (window.reportsManager) {
                    await window.reportsManager.initialize();
                }
                break;
                
            case 'shopping-lists':
                if (window.shoppingListsManager) {
                    await window.shoppingListsManager.initialize();
                }
                break;
                
            case 'search':
                if (window.searchManager) {
                    await window.searchManager.initialize();
                }
                break;
                
            case 'notifications':
                if (window.notificationsManager) {
                    await window.notificationsManager.initialize();
                }
                break;
                
            case 'profile':
                if (window.profileManager) {
                    await window.profileManager.initialize();
                }
                break;
                
            case 'assistant':
                if (window.assistantManager) {
                    await window.assistantManager.initialize();
                }
                break;

            case 'guide':
                if (window.guideManager) {
                    await window.guideManager.initialize();
                }
                break;
        }
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
    window.app.initializeKeyboardShortcuts();
});

// Add slide out animation for toasts
const style = document.createElement('style');
style.textContent = `
    @keyframes slideOut {
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
