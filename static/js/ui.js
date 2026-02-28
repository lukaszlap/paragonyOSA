// UI Utilities - handles UI state, toasts, loaders, etc.
class UIManager {
    constructor() {
        this.loader = document.getElementById('loader');
        this.toastContainer = document.getElementById('toast-container');
        this.notificationBadgeIds = [
            'notifications-count',
            'sidebar-notifications-count',
            'mobile-notifications-count'
        ];
    }

    // Show loader
    showLoader() {
        if (this.loader) {
            this.loader.classList.remove('hidden');
        }
    }

    // Hide loader
    hideLoader() {
        if (this.loader) {
            this.loader.classList.add('hidden');
        }
    }

    // Receipt Analysis Loader with professional multi-step animation
    showReceiptLoader() {
        const receiptLoader = document.getElementById('receipt-loader');
        if (!receiptLoader) return;

        // Reset all steps to pending state
        const steps = receiptLoader.querySelectorAll('.loader-step');
        steps.forEach(step => {
            step.classList.remove('active', 'completed');
            step.classList.add('pending');
            const statusIcon = step.querySelector('.step-status i');
            if (statusIcon) {
                statusIcon.className = 'fas fa-circle';
            }
        });

        // Reset progress
        const progressBar = document.getElementById('receipt-progress-bar');
        const progressText = document.getElementById('receipt-progress-text');
        const timeRemaining = document.getElementById('receipt-time-remaining');
        
        if (progressBar) progressBar.style.width = '0%';
        if (progressText) progressText.textContent = '0%';
        
        // Initialize estimated time display
        if (timeRemaining) {
            timeRemaining.textContent = '~40s';
        }

        // Show loader
        receiptLoader.classList.remove('hidden');

        // Define steps with timing (total ~40 seconds)
        const stepSequence = [
            { step: 'upload', duration: 3000, progress: 10 },           // 0-3s: Upload
            { step: 'preprocessing', duration: 4000, progress: 20 },    // 3-7s: Preprocessing
            { step: 'ocr', duration: 8000, progress: 40 },             // 7-15s: OCR Analysis
            { step: 'extraction', duration: 6000, progress: 55 },       // 15-21s: Product extraction
            { step: 'classification', duration: 7000, progress: 70 },   // 21-28s: Classification
            { step: 'validation', duration: 5000, progress: 85 },       // 28-33s: Validation
            { step: 'save', duration: 4000, progress: 95 },            // 33-37s: Saving to DB
            { step: 'finalize', duration: 3000, progress: 100 }        // 37-40s: Finalize
        ];

        const totalDuration = 40000; // 40 seconds
        let currentTime = 0;
        const timeouts = [];
        
        // Continuous time countdown - updates every second
        const startTime = Date.now();
        const timeInterval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const remaining = Math.max(0, Math.ceil((totalDuration - elapsed) / 1000));
            if (timeRemaining) {
                timeRemaining.textContent = `~${remaining}s`;
            }
            if (elapsed >= totalDuration) {
                clearInterval(timeInterval);
            }
        }, 1000);
        
        // Store interval for cleanup
        this.receiptLoaderInterval = timeInterval;

        // Animate through each step
        stepSequence.forEach((stepData, index) => {
            // Start step
            const startTimeout = setTimeout(() => {
                const stepElement = receiptLoader.querySelector(`[data-step="${stepData.step}"]`);
                if (stepElement) {
                    stepElement.classList.remove('pending');
                    stepElement.classList.add('active');
                    const statusIcon = stepElement.querySelector('.step-status i');
                    if (statusIcon) {
                        statusIcon.className = 'fas fa-spinner';
                    }
                }

                // Animate progress bar
                if (progressBar) {
                    progressBar.style.width = `${stepData.progress}%`;
                }
                if (progressText) {
                    progressText.textContent = `${stepData.progress}%`;
                }
            }, currentTime);
            timeouts.push(startTimeout);

            // Complete step
            const completeTimeout = setTimeout(() => {
                const stepElement = receiptLoader.querySelector(`[data-step="${stepData.step}"]`);
                if (stepElement) {
                    stepElement.classList.remove('active');
                    stepElement.classList.add('completed');
                    const statusIcon = stepElement.querySelector('.step-status i');
                    if (statusIcon) {
                        statusIcon.className = 'fas fa-check-circle';
                    }
                }
            }, currentTime + stepData.duration);
            timeouts.push(completeTimeout);

            currentTime += stepData.duration;
        });

        // Store timeouts for cleanup
        this.receiptLoaderTimeouts = timeouts;

        // Handle cancel button
        const cancelBtn = document.getElementById('cancel-analysis-btn');
        if (cancelBtn) {
            // Remove old listeners to prevent duplicates
            const newBtn = cancelBtn.cloneNode(true);
            cancelBtn.parentNode.replaceChild(newBtn, cancelBtn);
            
            newBtn.addEventListener('click', () => {
                // Skip the animation by clearing all timeouts and interval
                if (this.receiptLoaderTimeouts) {
                    this.receiptLoaderTimeouts.forEach(timeout => clearTimeout(timeout));
                    this.receiptLoaderTimeouts = [];
                }
                
                if (this.receiptLoaderInterval) {
                    clearInterval(this.receiptLoaderInterval);
                    this.receiptLoaderInterval = null;
                }
                
                // Hide the loader immediately
                this.hideReceiptLoader();
                
                // Set flag that user skipped the animation
                if (window.scanManager) {
                    window.scanManager.loaderSkipped = true;
                }
            });
        }
    }

    hideReceiptLoader() {
        const receiptLoader = document.getElementById('receipt-loader');
        if (receiptLoader) {
            receiptLoader.classList.add('hidden');
        }

        // Clear all timeouts
        if (this.receiptLoaderTimeouts) {
            this.receiptLoaderTimeouts.forEach(timeout => clearTimeout(timeout));
            this.receiptLoaderTimeouts = [];
        }
        
        // Clear interval
        if (this.receiptLoaderInterval) {
            clearInterval(this.receiptLoaderInterval);
            this.receiptLoaderInterval = null;
        }
    }

    // Update notification badge counters across navigation
    updateNotificationBadges(count = 0) {
        const safeCount = Number.isFinite(count) ? count : 0;

        this.notificationBadgeIds.forEach(id => {
            const element = document.getElementById(id);
            if (!element) {
                return;
            }

            element.textContent = safeCount;

            const isNavbarBadge = id === 'notifications-count';
            if (element.classList.contains('notification-badge') || element.classList.contains('badge')) {
                if (safeCount > 0 || !isNavbarBadge) {
                    element.classList.remove('hidden');
                } else if (isNavbarBadge) {
                    element.classList.add('hidden');
                }
            }
        });
    }

    getToastIcon(type) {
        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };
        return icons[type] || icons.info;
    }

    showToast(message, type = 'info', duration = 4000) {
        if (!this.toastContainer) {
            return;
        }

        const allowedTypes = new Set(['success', 'error', 'warning', 'info']);
        const toastType = allowedTypes.has(type) ? type : 'info';
        const toast = document.createElement('div');
        toast.className = `toast toast-${toastType}`;
        toast.innerHTML = `
            <i class="${this.getToastIcon(toastType)}"></i>
            <div class="toast-message">${this.escapeHtml(message || '')}</div>
            <button class="toast-close" type="button" aria-label="Zamknij powiadomienie">&times;</button>
        `;

        this.toastContainer.appendChild(toast);

        requestAnimationFrame(() => {
            toast.classList.add('show');
        });

        const hideToast = () => {
            toast.classList.remove('show');
            toast.classList.add('hide');
            toast.addEventListener('transitionend', () => {
                toast.remove();
            }, { once: true });
        };

        const timeout = setTimeout(hideToast, Math.max(duration, 2000));

        const closeBtn = toast.querySelector('.toast-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                clearTimeout(timeout);
                hideToast();
            });
        }
    }

    // Show/hide views
    showView(viewId) {
        // Hide all views
        document.querySelectorAll('.view').forEach(view => {
            view.classList.remove('active');
        });
        
        // Show target view
        const targetView = document.getElementById(viewId);
        if (targetView) {
            targetView.classList.add('active');
        }
        
        // Hide floating assistant button on auth view
        if (viewId === 'auth-view') {
            const floatingBtn = document.getElementById('floating-assistant-btn');
            if (floatingBtn) {
                floatingBtn.style.display = 'none';
            }
        }
    }

    // Show/hide content views (within app)
    showContentView(viewId) {
        // Hide all content views
        document.querySelectorAll('.content-view').forEach(view => {
            view.classList.remove('active');
        });
        
        // Show target content view
        const targetView = document.getElementById(viewId);
        if (targetView) {
            targetView.classList.add('active');
        }

        // Update active nav link (both old nav-link and new sidebar-menu-link)
        document.querySelectorAll('.nav-link, .sidebar-menu-link').forEach(link => {
            link.classList.remove('active');
            if (link.dataset.view === viewId.replace('-view', '')) {
                link.classList.add('active');
            }
        });
    }

    // Show message in container
    showMessage(containerId, message, type = 'info') {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        container.className = `message ${type}`;
        container.innerHTML = `
            <i class="${this.getToastIcon(type)}"></i>
            <span>${message}</span>
        `;
        container.classList.remove('hidden');
    }

    // Hide message
    hideMessage(containerId) {
        const container = document.getElementById(containerId);
        if (container) {
            container.classList.add('hidden');
        }
    }

    // Format currency
    formatCurrency(amount) {
        let numericAmount = amount;

        if (typeof numericAmount !== 'number' || !Number.isFinite(numericAmount)) {
            const cleaned = String(numericAmount ?? '')
                .replace(/[^0-9,.-]+/g, '')
                .replace(',', '.');
            numericAmount = Number(cleaned);
        }

        if (!Number.isFinite(numericAmount)) {
            numericAmount = 0;
        }

        try {
            if (typeof Intl !== 'undefined' && Intl.NumberFormat) {
                return new Intl.NumberFormat('pl-PL', {
                    style: 'currency',
                    currency: 'PLN'
                }).format(numericAmount);
            }
        } catch (e) {
            // Fallback for older browsers
        }
        return numericAmount.toFixed(2) + ' zł';
    }

    // Format date
    formatDate(dateString) {
        try {
            const date = new Date(dateString);
            if (typeof Intl !== 'undefined' && Intl.DateTimeFormat) {
                return new Intl.DateTimeFormat('pl-PL', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                }).format(date);
            }
        } catch (e) {
            // Fallback for older browsers
        }
        // Simple fallback
        const date = new Date(dateString);
        return date.toLocaleString('pl-PL');
    }

    // Format date short
    formatDateShort(dateString) {
        if (!dateString) {
            return '--';
        }

        let date;

        if (dateString instanceof Date) {
            date = dateString;
        } else {
            const normalized = String(dateString).trim().replace(' ', 'T');
            const timestamp = Date.parse(normalized);
            if (!Number.isNaN(timestamp)) {
                date = new Date(timestamp);
            }
        }

        if (date && !Number.isNaN(date.getTime())) {
            try {
                if (typeof Intl !== 'undefined' && Intl.DateTimeFormat) {
                    return new Intl.DateTimeFormat('pl-PL').format(date);
                }
            } catch (e) {
                // Fallback for older browsers
            }

            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            return `${day}.${month}.${year}`;
        }

        const match = String(dateString).match(/(\d{4})[\-\/.](\d{2})[\-\/.](\d{2})/);
        if (match) {
            return `${match[3]}.${match[2]}.${match[1]}`;
        }

        return '--';
    }

    // Confirm dialog
    confirm(message) {
        return window.confirm(message);
    }

    // Show/hide modal
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('hidden');
        }
    }

    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('hidden');
        }
    }

    // Clear form
    clearForm(formId) {
        const form = document.getElementById(formId);
        if (form) {
            form.reset();
        }
    }

    // Populate select element
    populateSelect(selectId, options, valueKey = 'id', textKey = 'nazwa') {
        const select = document.getElementById(selectId);
        if (!select) return;
        
        select.innerHTML = '<option value="">Wybierz...</option>';
        options.forEach(option => {
            const optionElement = document.createElement('option');
            optionElement.value = option[valueKey];
            optionElement.textContent = option[textKey];
            select.appendChild(optionElement);
        });
    }

    // Create receipt card HTML
    createReceiptCard(receipt) {
        const receiptIdRaw = receipt.id_paragonu ?? '';
        const receiptId = this.escapeHtml(String(receiptIdRaw));
        const storeName = this.escapeHtml(receipt.nazwa_firmy || 'Nieznany sklep');
        const cityParts = [receipt.nazwa_miasta, receipt.kod_pocztowy]
            .filter(Boolean)
            .map(value => this.escapeHtml(String(value)));
        const cityLabel = cityParts.length ? cityParts.join(' ') : '—';
        const address = this.escapeHtml(receipt.ulica || 'Brak adresu');
        const totalLabel = this.formatCurrency(receipt.suma);
        const productCount = Number(receipt.liczba_produktow ?? receipt.products_count ?? receipt.total_items);
        const productsLabel = Number.isFinite(productCount) && productCount > 0
            ? `${productCount} pozycji`
            : 'Zobacz szczegóły';
        const discountValue = Number(receipt.rabat);
        const hasDiscount = Number.isFinite(discountValue) && discountValue > 0;
        const discountLabel = hasDiscount ? this.formatCurrency(discountValue) : '';
        const dateFull = this.escapeHtml(this.formatDate(receipt.data_dodania));
        const dateShort = this.escapeHtml(this.formatDateShort(receipt.data_dodania));

        return `
            <article class="receipt-card" data-id="${receiptIdRaw}" aria-label="Paragon z ${storeName}">
                <header class="receipt-card-header">
                    <div class="receipt-card-store">
                        <i class="fas fa-store"></i>
                        <span>${storeName}</span>
                    </div>
                    <div class="receipt-card-meta">
                        <span class="receipt-card-meta-item">
                            <i class="fas fa-location-dot"></i>
                            ${cityLabel}
                        </span>
                        <span class="receipt-card-meta-item" title="${dateFull}">
                            <i class="fas fa-calendar-day"></i>
                            ${dateShort}
                        </span>
                    </div>
                </header>
                <div class="receipt-card-body">
                    <div class="receipt-card-total">${totalLabel}</div>
                    <ul class="receipt-card-info">
                        <li>
                            <i class="fas fa-map-marker-alt"></i>
                            <span>${address}</span>
                        </li>
                        <li>
                            <i class="fas fa-box-open"></i>
                            <span>${productsLabel}</span>
                        </li>
                        ${hasDiscount ? `
                        <li>
                            <i class="fas fa-percent"></i>
                            <span>Rabat: ${discountLabel}</span>
                        </li>` : ''}
                    </ul>
                </div>
                <footer class="receipt-card-footer">
                    <span class="receipt-card-id">
                        <i class="fas fa-receipt"></i>
                        #${receiptId}
                    </span>
                    <span class="receipt-card-cta">
                        <i class="fas fa-eye"></i>
                        Otwórz
                    </span>
                </footer>
            </article>
        `;
    }

    // Create limit card HTML
    createLimitCard(limit) {
        const percentage = (limit.Wydano / limit.Limit) * 100;
        
        // Enhanced status logic with better thresholds:
        // exceeded > 100%, critical >= 90%, warning >= 75%, safe < 75%
        let statusClass, statusIcon, statusText;
        if (percentage > 100) {
            statusClass = 'exceeded';
            statusIcon = 'fa-ban';
            statusText = '🚫 Przekroczono limit!';
        } else if (percentage >= 90) {
            statusClass = 'critical';
            statusIcon = 'fa-exclamation-triangle';
            statusText = '⚠️ Krytyczny poziom! (90%+)';
        } else if (percentage >= 75) {
            statusClass = 'warning';
            statusIcon = 'fa-exclamation-circle';
            statusText = '⚡ Uwaga! Zbliżasz się do limitu (75%+)';
        } else {
            statusClass = 'safe';
            statusIcon = 'fa-check-circle';
            statusText = '✅ W limicie';
        }
        
        // Progress bar color with enhanced thresholds
        let progressClass = '';
        if (percentage > 100) {
            progressClass = 'danger';
        } else if (percentage >= 90) {
            progressClass = 'danger';
        } else if (percentage >= 75) {
            progressClass = 'warning';
        }
        
        return `
            <div class="limit-card">
                <div class="limit-card-header">
                    <div class="limit-card-title">
                        <span class="limit-card-category">
                            <i class="fas fa-tag"></i>
                            ${this.escapeHtml(limit.NazwaKategorii)}
                        </span>
                    </div>
                </div>
                <div class="limit-card-body">
                    <div class="limit-progress-container">
                        <div class="limit-progress-header">
                            <div class="limit-progress-amount">${this.formatCurrency(limit.Wydano)}</div>
                            <div class="limit-progress-total">z ${this.formatCurrency(limit.Limit)}</div>
                        </div>
                        <div class="limit-progress-bar-container">
                            <div class="limit-progress-bar ${progressClass}" style="width: ${Math.min(percentage, 100)}%"></div>
                        </div>
                        <div class="limit-progress-percentage">${percentage.toFixed(1)}% wykorzystane</div>
                    </div>
                    <div class="limit-status ${statusClass}">
                        <i class="fas ${statusIcon}"></i>
                        <span>${statusText}</span>
                    </div>
                </div>
                <div class="limit-card-footer">
                    <button class="btn btn-primary btn-small edit-limit-btn" data-id="${limit.id}">
                        <i class="fas fa-edit"></i> Edytuj
                    </button>
                    <button class="btn btn-danger btn-small delete-limit-btn" data-id="${limit.id}">
                        <i class="fas fa-trash"></i> Usuń
                    </button>
                </div>
            </div>
        `;
    }

    // Create notification HTML
    createNotificationItem(notification) {
        const rawMessage = notification.tresc || notification.wiadomosc || '';
        const normalizedMessage = rawMessage.toLowerCase();
        
        // Enhanced logic to determine notification type and severity
        let notificationClass = 'info';
        let title = notification.nazwa || 'Powiadomienie';
        let enhancedMessage = rawMessage;
        let icon = 'fas fa-info-circle';

        // Check if it's a limit notification with percentage
        const percentMatch = rawMessage.match(/(\d+(?:\.\d+)?)\s*%/);
        const categoryName = notification.nazwa || notification.kategoria || '';
        
        if (percentMatch && (normalizedMessage.includes('limit') || normalizedMessage.includes('wykorzystan'))) {
            const percentage = parseFloat(percentMatch[1]);
            
            if (percentage >= 90) {
                // Critical warning - 90% or more
                notificationClass = 'danger';
                icon = 'fas fa-exclamation-triangle';
                title = `⚠️ Krytyczne przekrocenie limitu - ${categoryName}`;
                enhancedMessage = `Twój limit dla kategorii "${categoryName}" został wykorzystany w ${percentage.toFixed(1)}%!\n\n` +
                    `🚨 To bardzo wysoki poziom wydatków. Zalecamy natychmiastowe ograniczenie zakupów w tej kategorii.\n\n` +
                    `💡 Sprawdź szczegóły w sekcji "Limity wydatków" i rozważ dostosowanie budżetu.`;
            } else if (percentage >= 75) {
                // Warning - 75-89%
                notificationClass = 'warning';
                icon = 'fas fa-exclamation-circle';
                title = `⚡ Ostrzeżenie o limicie - ${categoryName}`;
                enhancedMessage = `Twój limit dla kategorii "${categoryName}" został wykorzystany w ${percentage.toFixed(1)}%.\n\n` +
                    `⚠️ Zbliżasz się do wyczerpania budżetu dla tej kategorii.\n\n` +
                    `💡 Zalecamy monitorowanie kolejnych wydatków, aby nie przekroczyć ustalonego limitu.`;
            } else if (percentage >= 50) {
                // Info - 50-74%
                notificationClass = 'info';
                icon = 'fas fa-info-circle';
                title = `📊 Informacja o limicie - ${categoryName}`;
                enhancedMessage = `Wykorzystałeś ${percentage.toFixed(1)}% limitu dla kategorii "${categoryName}".\n\n` +
                    `✅ Twoje wydatki są pod kontrolą. Kontynuuj świadome zakupy!`;
            }
        } else if (normalizedMessage.includes('przekrocz') || normalizedMessage.includes('limit przekroczony')) {
            // Limit exceeded
            notificationClass = 'danger';
            icon = 'fas fa-ban';
            title = `🚫 Limit przekroczony - ${categoryName}`;
            enhancedMessage = `Przekroczyłeś ustalony limit dla kategorii "${categoryName}"!\n\n` +
                `🚨 Zalecamy natychmiastowe działanie: przejrzyj wydatki i rozważ zwiększenie limitu lub ograniczenie zakupów.`;
        } else if (normalizedMessage.includes('sukces') || normalizedMessage.includes('dodano') || normalizedMessage.includes('zapisano')) {
            notificationClass = 'success';
            icon = 'fas fa-check-circle';
            title = notification.nazwa || '✅ Sukces';
        } else if (normalizedMessage.includes('czeka') || normalizedMessage.includes('przypomnienie')) {
            notificationClass = 'warning';
            icon = 'fas fa-bell';
            title = notification.nazwa || '🔔 Przypomnienie';
        }

        const messageHtml = this.escapeHtml(enhancedMessage || 'Brak treści').replace(/\n/g, '<br>');
        const dateValue = notification.data_utworzenia || notification.created_at;
        const dateLabel = dateValue ? this.formatDateShort(dateValue) : '--';
        const categoryLabel = notification.kategoria || notification.nazwa || 'Ogólne';

        return `
            <article class="notification-item ${notificationClass}">
                <div class="notification-item-header">
                    <div class="notification-item-title">
                        <i class="${icon}"></i>
                        <span>${this.escapeHtml(title)}</span>
                    </div>
                    <div class="notification-item-date">${dateLabel}</div>
                </div>
                <div class="notification-item-body">${messageHtml}</div>
                <div>
                    <span class="notification-chip">
                        <i class="fas fa-layer-group"></i>
                        ${this.escapeHtml(categoryLabel)}
                    </span>
                </div>
            </article>
        `;
    }

    // Create product row HTML
    createProductRow(product) {
        const productName = this.escapeHtml(product.nazwa_produktu);
        const categoryName = this.escapeHtml(product.nazwa_kategorii || '');
        const quantityValue = [product.ilosc, product.jednostka]
            .filter(Boolean)
            .map(value => this.escapeHtml(String(value)))
            .join(' ');
        const vatCode = this.escapeHtml(product.typ_podatku || '-');

        return `
            <tr data-id="${product.id_produktu}">
                <td data-label="Nazwa">${productName}</td>
                <td data-label="Kategoria">${categoryName}</td>
                <td data-label="Cena"><strong>${this.formatCurrency(product.cena)}</strong></td>
                <td data-label="Ilość">${quantityValue || '-'}</td>
                <td data-label="VAT">${vatCode}</td>
                <td class="product-actions" data-label="Akcje">
                    <button class="btn btn-info btn-small view-product-info-btn" data-id="${product.id_produktu}" data-name="${this.escapeHtml(product.nazwa_produktu)}" title="Zobacz informacje o produkcie">
                        <i class="fas fa-info-circle"></i>
                    </button>
                    <button class="btn btn-primary btn-small edit-product-btn" data-id="${product.id_produktu}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-danger btn-small delete-product-btn" data-id="${product.id_produktu}">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }

    // Create shopping list card HTML
    createShoppingListCard(list, items, summary = null) {
        const displayItems = Array.isArray(items) ? items : [];
        const previewHtml = displayItems.slice(0, 3).map(item => {
            const quantity = item.ilosc ?? item.ilosc_lista ?? '';
            return `
                <div class="list-item">
                    <span>${item.nazwa}</span>
                    <span>${quantity}x</span>
                </div>
            `;
        }).join('');
        const remainingInfo = displayItems.length > 3 ? `<p>... i ${displayItems.length - 3} więcej</p>` : '';
        const hasSummary = summary && (Number(summary.bestPerProductTotal) > 0 || Number(summary.currentEstimatedTotal) > 0);
        const estimatedTotal = hasSummary
            ? (Number(summary.bestPerProductTotal) > 0 ? Number(summary.bestPerProductTotal) : Number(summary.currentEstimatedTotal))
            : null;
        const recommendedStore = summary?.recommendedStore?.store || summary?.storeRecommendations?.bestStore?.store;
        return `
            <div class="list-card" data-id="${list.id}">
                <h3>Lista #${list.id}</h3>
                <p>Utworzono: ${this.formatDateShort(list.data_utworzenia || new Date())}</p>
                <div class="list-items">
                    ${previewHtml || '<p>Brak produktów</p>'}
                    ${remainingInfo}
                </div>
                ${hasSummary ? `
                <div class="list-meta">
                    <span class="list-total">Szacowany koszt: <strong>${this.formatCurrency(estimatedTotal)}</strong></span>
                    ${recommendedStore ? `<span class="list-recommendation">Najlepszy sklep: <strong>${recommendedStore}</strong></span>` : ''}
                </div>
                ` : ''}
                <div class="list-actions">
                    <button class="btn btn-primary btn-small view-list-btn" data-id="${list.id}">
                        <i class="fas fa-eye"></i> Zobacz
                    </button>
                    <button class="btn btn-danger btn-small delete-list-btn" data-id="${list.id}">
                        <i class="fas fa-trash"></i> Usuń
                    </button>
                </div>
            </div>
        `;
    }

    // Empty state message
    showEmptyState(containerId, message, icon = 'fas fa-inbox') {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: var(--text-light);">
                <i class="${icon}" style="font-size: 64px; margin-bottom: 20px; opacity: 0.5;"></i>
                <p style="font-size: 18px;">${message}</p>
            </div>
        `;
    }

    // Escape HTML for security
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

    // Generate avatar with initials (first letter + last letter of name)
    generateAvatar(name, size = 120) {
        if (!name || typeof name !== 'string') {
            name = 'User';
        }

        const cleanName = name.trim();
        let initials = '';

        if (cleanName.length === 0) {
            initials = 'U';
        } else if (cleanName.length === 1) {
            initials = cleanName[0].toUpperCase();
        } else {
            // First letter + last letter
            initials = (cleanName[0] + cleanName[cleanName.length - 1]).toUpperCase();
        }

        // Create canvas for avatar
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        // Draw blue background
        ctx.fillStyle = '#2563eb';
        ctx.fillRect(0, 0, size, size);

        // Draw white text
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${size * 0.4}px Arial, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(initials, size / 2, size / 2);

        // Return data URL
        return canvas.toDataURL('image/png');
    }

    // Update avatar in all places (navbar, profile)
    updateAvatars(name) {
        const avatarDataUrl = this.generateAvatar(name, 120);
        const smallAvatarDataUrl = this.generateAvatar(name, 48);

        // Update navbar avatar
        const navbarAvatar = document.querySelector('.navbar-avatar');
        if (navbarAvatar) {
            navbarAvatar.src = smallAvatarDataUrl;
        }

        // Update profile avatar
        const profileAvatar = document.getElementById('profile-avatar-img');
        if (profileAvatar) {
            profileAvatar.src = avatarDataUrl;
        }
    }
}

// Create global instance
const ui = new UIManager();
