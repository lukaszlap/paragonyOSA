// Notifications Page Manager
class NotificationsManager {
    constructor() {
        this.allNotifications = [];
        this.currentFilter = 'all';
        this.notificationsList = document.getElementById('all-notifications-list');
        this.filterButtons = document.querySelectorAll('.filter-btn');
        this.markAllReadBtn = document.getElementById('mark-all-read-btn');

        this.initializeFilters();
        this.initializeMarkAllRead();
    }

    async initialize() {
        await this.loadAllNotifications();
    }

    initializeFilters() {
        if (!this.filterButtons) {
            return;
        }

        this.filterButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const filter = btn.dataset.filter;
                this.setActiveFilter(filter);
                this.filterNotifications(filter);
            });
        });
    }

    initializeMarkAllRead() {
        if (!this.markAllReadBtn) {
            return;
        }

        this.markAllReadBtn.addEventListener('click', async () => {
            await this.markAllAsRead();
        });
    }

    setActiveFilter(filter) {
        this.currentFilter = filter;
        
        this.filterButtons.forEach(btn => {
            if (btn.dataset.filter === filter) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    async loadAllNotifications() {
        try {
            const notifications = await api.getNotifications();
            this.allNotifications = notifications || [];

            this.updateCounters();
            ui.updateNotificationBadges(this.allNotifications.length);

            if (this.allNotifications.length === 0) {
                this.showEmptyState('Brak powiadomień');
                return;
            }

            this.filterNotifications(this.currentFilter);

        } catch (error) {
            console.error('Error loading notifications:', error);
            this.allNotifications = [];
            this.updateCounters();
            ui.updateNotificationBadges(0);
            this.showEmptyState('Błąd ładowania powiadomień');
            ui.showToast('Nie udało się załadować powiadomień', 'error');
        }
    }

    filterNotifications(filter) {
        let filtered = [...this.allNotifications];

        // Note: Since the API doesn't provide read/unread status,
        // we'll show all notifications for now
        // In a real implementation, you would filter based on notification status

        switch (filter) {
            case 'all':
                // Show all notifications
                break;
            case 'unread':
                // Filter unread (for now, show all)
                // filtered = filtered.filter(n => !n.read);
                break;
            case 'read':
                // Filter read (for now, show empty or all)
                // filtered = filtered.filter(n => n.read);
                filtered = []; // Temporary: show empty for "read"
                break;
        }

        // Sort notifications by priority: danger (90%+) > warning (75%+) > info (50%+) > success
        filtered.sort((a, b) => {
            const getPriority = (notification) => {
                const rawMessage = notification.tresc || notification.wiadomosc || '';
                const message = rawMessage.toLowerCase();
                const percentMatch = rawMessage.match(/(\d+(?:\.\d+)?)\s*%/);
                
                if (percentMatch && (message.includes('limit') || message.includes('wykorzystan'))) {
                    const percentage = parseFloat(percentMatch[1]);
                    if (percentage >= 90) return 4; // Critical - red
                    if (percentage >= 75) return 3; // Warning - yellow
                    if (percentage >= 50) return 2; // Info - blue
                }
                
                if (message.includes('przekrocz')) return 4;
                if (message.includes('ostrzeżenie')) return 3;
                if (message.includes('sukces')) return 1;
                
                return 2; // Default info priority
            };
            
            return getPriority(b) - getPriority(a);
        });

        this.renderNotifications(filtered);
    }

    renderNotifications(notifications) {
        if (!this.notificationsList) {
            return;
        }

        const emptyState = document.getElementById('notifications-empty');

        if (notifications.length === 0) {
            if (emptyState) {
                const textElement = emptyState.querySelector('.notifications-empty-text');
                if (textElement) {
                    textElement.textContent = 'Brak powiadomień w tej kategorii';
                }
                emptyState.classList.remove('hidden');
            }
            this.notificationsList.innerHTML = '';
            return;
        }

        if (emptyState) {
            emptyState.classList.add('hidden');
        }

        this.notificationsList.innerHTML = notifications.map((notification, index) => {
            const content = ui.createNotificationItem(notification);
            const actions = this.renderNotificationActions(notification);
            return `
                <div class="notification-entry" data-index="${index}">
                    ${content}
                    ${actions}
                </div>
            `;
        }).join('');

        this.attachNotificationListeners();
    }

    attachNotificationListeners() {
        // Add any click handlers for notification actions here
        const deleteButtons = this.notificationsList.querySelectorAll('.delete-notification-btn');
        deleteButtons.forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const notificationId = btn.dataset.notificationId;
                await this.deleteNotification(notificationId);
            });
        });
    }

    getNotificationType(notification) {
        // Determine notification type based on content with enhanced threshold logic
        const rawMessage = notification.tresc || notification.wiadomosc || '';
        const message = rawMessage.toLowerCase();
        
        // Check for percentage-based limit notifications
        const percentMatch = rawMessage.match(/(\d+(?:\.\d+)?)\s*%/);
        
        if (percentMatch && (message.includes('limit') || message.includes('wykorzystan'))) {
            const percentage = parseFloat(percentMatch[1]);
            
            if (percentage >= 90) {
                return 'danger';  // 90%+ = red/critical
            } else if (percentage >= 75) {
                return 'warning'; // 75-89% = yellow/warning
            } else if (percentage >= 50) {
                return 'info';    // 50-74% = blue/info
            }
            return '';
        }
        
        // Legacy checks
        if (message.includes('przekrocz') || message.includes('limit przekroczony')) {
            return 'danger';
        }
        if (message.includes('ostrzeżenie') || message.includes('uwaga')) {
            return 'warning';
        }
        if (message.includes('sukces') || message.includes('dodano') || message.includes('zapisano')) {
            return 'success';
        }
        
        return '';
    }

    getNotificationIcon(type) {
        switch (type) {
            case 'success':
                return 'fas fa-check-circle';
            case 'danger':
                return 'fas fa-exclamation-triangle';
            case 'warning':
                return 'fas fa-exclamation-circle';
            case 'info':
                return 'fas fa-info-circle';
            default:
                return 'fas fa-bell';
        }
    }

    getNotificationTitle(notification) {
        // Extract or generate enhanced title from notification
        const categoryName = notification.nazwa || notification.kategoria || '';
        const rawMessage = notification.tresc || notification.wiadomosc || '';
        const message = rawMessage.toLowerCase();
        
        // Check for percentage-based limit notifications
        const percentMatch = rawMessage.match(/(\d+(?:\.\d+)?)\s*%/);
        
        if (percentMatch && (message.includes('limit') || message.includes('wykorzystan'))) {
            const percentage = parseFloat(percentMatch[1]);
            
            if (percentage >= 90) {
                return `⚠️ Krytyczne przekroczenie limitu - ${categoryName}`;
            } else if (percentage >= 75) {
                return `⚡ Ostrzeżenie o limicie - ${categoryName}`;
            } else if (percentage >= 50) {
                return `📊 Informacja o limicie - ${categoryName}`;
            }
            return `${categoryName} - ${percentage.toFixed(1)}% limitu`;
        }
        
        if (message.includes('przekrocz')) {
            return `🚫 Limit przekroczony - ${categoryName}`;
        }
        if (message.includes('limit')) {
            return categoryName || 'Ostrzeżenie o limicie';
        }
        if (message.includes('paragon')) {
            return categoryName || '🧾 Nowy paragon';
        }
        if (message.includes('sukces')) {
            return categoryName || '✅ Sukces';
        }
        
        return categoryName || 'Powiadomienie';
    }

    formatNotificationDate(notification) {
        // Format notification date
        if (notification.data_utworzenia) {
            return ui.formatDateShort(notification.data_utworzenia);
        }
        if (notification.created_at) {
            return ui.formatDateShort(notification.created_at);
        }
        return 'Brak daty';
    }

    renderNotificationActions(notification) {
        // Add action buttons if needed
        return `
            <div class="notification-actions hidden">
                <button class="btn btn-small btn-secondary delete-notification-btn" data-notification-id="${notification.id || ''}">
                    <i class="fas fa-trash"></i> Usuń
                </button>
            </div>
        `;
    }

    async deleteNotification(notificationId) {
        // Implement delete functionality if API supports it
        try {
            // await api.deleteNotification(notificationId);
            ui.showToast('Funkcja usuwania powiadomień nie jest jeszcze dostępna', 'warning');
            // await this.loadAllNotifications();
        } catch (error) {
            console.error('Error deleting notification:', error);
            ui.showToast('Nie udało się usunąć powiadomienia', 'error');
        }
    }

    async markAllAsRead() {
        // Implement mark all as read functionality if API supports it
        try {
            // await api.markAllNotificationsAsRead();
            ui.showToast('Funkcja oznaczania jako przeczytane nie jest jeszcze dostępna', 'warning');
            // await this.loadAllNotifications();
        } catch (error) {
            console.error('Error marking notifications as read:', error);
            ui.showToast('Nie udało się oznaczyć powiadomień', 'error');
        }
    }

    showEmptyState(message) {
        if (!this.notificationsList) {
            return;
        }

        const emptyState = document.getElementById('notifications-empty');
        if (emptyState) {
            const textElement = emptyState.querySelector('.notifications-empty-text');
            if (textElement) {
                textElement.textContent = message;
            }
            emptyState.classList.remove('hidden');
        }

        this.notificationsList.innerHTML = '';
    }

    updateCounters() {
        const total = this.allNotifications.length;
        const unread = total; // API does not expose read/unread state yet
        const read = 0;
        const important = this.allNotifications.filter(notification => {
            const type = this.getNotificationType(notification);
            if (type === 'danger') {
                return true;
            }
            const message = (notification.tresc || notification.wiadomosc || '').toLowerCase();
            return message.includes('ważne');
        }).length;

        const setCounter = (id, value) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        };

        setCounter('all-count', total);
        setCounter('unread-count', unread);
        setCounter('read-count', read);
        setCounter('important-count', important);
    }

    escapeHtml(text) {
        if (text === null || text === undefined) {
            return '';
        }
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        };
        return String(text).replace(/[&<>"']/g, char => map[char]);
    }
}

// Create global instance
window.notificationsManager = new NotificationsManager();
