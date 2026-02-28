/**
 * Virtual Assistant Manager
 * Zarządza komunikacją z AI asystentem finansowym
 */

class AssistantManager {
    constructor() {
        this.conversationHistory = [];
        this.isLoading = false;
        this.currentSessionActive = false;
        this.isInitialized = false;
        this.isMiniChatInitialized = false;
        
        // DOM Elements (będą ustawione po załadowaniu)
        this.elements = {};
        
        // Quick suggestions dla użytkownika
        this.quickSuggestions = [
            "Jakie były moje wydatki dzisiaj?",
            "Ile wydałem na jedzenie w tym miesiącu?",
            "Pokaż moje zakupy w Biedronce",
            "Jak wygląda mój budżet?",
            "Co było najdroższe w tym tygodniu?",
            "Porównaj wydatki z ostatnich 2 miesięcy",
            "Historia cen mleka",
            "W jakich sklepach najczęściej robię zakupy?"
        ];
    }

    /**
     * Inicjalizacja managera
     */
    async initialize() {
        // Cachuj elementy przy każdym wywołaniu (mogą się zmienić)
        this.cacheElements();
        
        // Event listenery tylko raz
        if (!this.isInitialized) {
            this.attachEventListeners();
            this.initializeMiniChat();
            this.isInitialized = true;
        }
        
        this.renderQuickSuggestions();
        
        // Sprawdź status asystenta
        try {
            await this.checkHealth();
            
            // Pokaż wiadomość powitalną tylko jeśli chat jest pusty
            if (this.elements.chatMessages && this.elements.chatMessages.children.length === 0) {
                this.showWelcomeMessage();
            }
        } catch (error) {
            console.error('Failed to initialize assistant:', error);
            this.showErrorMessage('Nie można połączyć się z asystentem AI');
        }
    }

    /**
     * Cachowanie elementów DOM
     */
    cacheElements() {
        this.elements = {
            chatMessages: document.getElementById('assistant-messages'),
            messageInput: document.getElementById('assistant-input'),
            sendButton: document.getElementById('assistant-send-btn'),
            clearButton: document.getElementById('assistant-clear-btn'),
            suggestionsContainer: document.getElementById('assistant-suggestions'),
            statusIndicator: document.getElementById('assistant-status'),
            typingIndicator: document.getElementById('assistant-typing')
        };
    }

    /**
     * Przypisanie event listeners
     */
    attachEventListeners() {
        // Wysłanie wiadomości przez button
        this.elements.sendButton?.addEventListener('click', () => this.sendMessage());
        
        // Wysłanie wiadomości przez Enter
        this.elements.messageInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        // Wyczyść historię
        this.elements.clearButton?.addEventListener('click', () => this.clearHistory());
        
        // Auto-resize textarea
        this.elements.messageInput?.addEventListener('input', (e) => {
            this.autoResizeTextarea(e.target);
        });
    }

    /**
     * Auto-resize textarea podczas pisania
     */
    autoResizeTextarea(textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }

    /**
     * Renderowanie quick suggestions
     */
    renderQuickSuggestions() {
        if (!this.elements.suggestionsContainer) return;
        
        const suggestionsHTML = this.quickSuggestions.map(suggestion => `
            <button class="assistant-suggestion-btn" data-suggestion="${this.escapeHtml(suggestion)}">
                <i class="fas fa-lightbulb"></i>
                ${this.escapeHtml(suggestion)}
            </button>
        `).join('');
        
        this.elements.suggestionsContainer.innerHTML = suggestionsHTML;
        
        // Attach listeners do suggestions
        this.elements.suggestionsContainer.querySelectorAll('.assistant-suggestion-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const suggestion = btn.dataset.suggestion;
                this.elements.messageInput.value = suggestion;
                this.sendMessage();
            });
        });
    }

    /**
     * Pokazanie wiadomości powitalnej
     */
    showWelcomeMessage() {
        const welcomeMessage = {
            role: 'assistant',
            content: `Cześć! 👋 Jestem Twoim wirtualnym asystentem finansowym.
Mogę pomóc Ci w:
• Analizowaniu wydatków
• Sprawdzaniu budżetów i limitów
• Porównywaniu okresów czasowych
• Wyszukiwaniu produktów i cen
• Analizowaniu nawyków zakupowych
Zadaj mi dowolne pytanie o Twoje finanse!`,
            timestamp: new Date().toISOString(),
            isWelcome: true
        };
        
        this.addMessageToUI(welcomeMessage);
    }

    /**
     * Wysłanie wiadomości do asystenta
     */
    async sendMessage() {
        const message = this.elements.messageInput?.value.trim();
        
        if (!message || this.isLoading) {
            return;
        }
        
        // Wyczyść input
        this.elements.messageInput.value = '';
        this.elements.messageInput.style.height = 'auto';
        
        // Dodaj wiadomość użytkownika do UI
        const userMessage = {
            role: 'user',
            content: message,
            timestamp: new Date().toISOString()
        };
        this.addMessageToUI(userMessage);
        this.conversationHistory.push(userMessage);
        
        // Pokaż typing indicator
        this.showTypingIndicator();
        this.isLoading = true;
        
        try {
            // Wyślij do API - używamy api.post
            console.log('Sending message to assistant:', message);
            const response = await api.post('/assistant/chat', {
                message: message,
                context: {}
            });
            
            console.log('Assistant response:', response);
            
            if (response.success) {
                const assistantMessage = {
                    role: 'assistant',
                    content: response.response,
                    intent: response.intent,
                    data: response.data,
                    timestamp: response.timestamp || new Date().toISOString()
                };
                
                this.conversationHistory.push(assistantMessage);
                this.addMessageToUI(assistantMessage);
                this.currentSessionActive = true;
            } else {
                throw new Error(response.error || 'Nieznany błąd');
            }
        } catch (error) {
            console.error('Error sending message:', error);
            const errorMessage = {
                role: 'assistant',
                content: `Przepraszam, wystąpił błąd: ${error.message}. Spróbuj ponownie.`,
                timestamp: new Date().toISOString(),
                isError: true
            };
            this.addMessageToUI(errorMessage);
            ui.showToast('Błąd komunikacji z asystentem', 'error');
        } finally {
            this.hideTypingIndicator();
            this.isLoading = false;
        }
    }

    /**
     * Dodanie wiadomości do UI
     */
    addMessageToUI(message) {
        if (!this.elements.chatMessages) return;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `assistant-message assistant-message-${message.role}`;
        
        if (message.isError) {
            messageDiv.classList.add('assistant-message-error');
        }
        
        if (message.isWelcome) {
            messageDiv.classList.add('assistant-message-welcome');
        }
        
        // Avatar
        const avatar = document.createElement('div');
        avatar.className = 'assistant-message-avatar';
        avatar.innerHTML = message.role === 'user' 
            ? '<i class="fas fa-user"></i>' 
            : '<i class="fas fa-robot"></i>';
        
        // Content
        const content = document.createElement('div');
        content.className = 'assistant-message-content';
        
        // Text
        const text = document.createElement('div');
        text.className = 'assistant-message-text';
        text.innerHTML = this.formatMessageContent(message.content);
        content.appendChild(text);
        
        // Data visualization - WYŁĄCZONE (pokazujemy tylko response)
        // Backend zwraca sformatowaną odpowiedź w polu "response",
        // pole "data" zawiera surowe dane i nie jest potrzebne do wyświetlania
        
        // Timestamp
        const timestamp = document.createElement('div');
        timestamp.className = 'assistant-message-timestamp';
        timestamp.textContent = this.formatTimestamp(message.timestamp);
        content.appendChild(timestamp);
        
        messageDiv.appendChild(avatar);
        messageDiv.appendChild(content);
        
        this.elements.chatMessages.appendChild(messageDiv);
        
        // Scroll do dołu
        this.scrollToBottom();
    }

    /**
     * Tworzenie karty z danymi
     * NIEUŻYWANE - Backend zwraca sformatowaną odpowiedź w polu "response"
     */
    createDataCard(data, intent) {
        if (!data || data.length === 0) return null;
        
        const card = document.createElement('div');
        card.className = 'assistant-data-card';
        
        const firstData = data[0];
        
        // Tytuł karty bazując na intent
        const title = document.createElement('div');
        title.className = 'assistant-data-title';
        title.innerHTML = `<i class="fas fa-chart-line"></i> Szczegóły danych`;
        card.appendChild(title);
        
        // Zawartość danych
        const dataContent = document.createElement('div');
        dataContent.className = 'assistant-data-content';
        
        // Formatuj dane w zależności od typu
        if (firstData.function === 'get_expenses_by_date' && firstData.data.receipts) {
            dataContent.innerHTML = this.formatReceiptsData(firstData.data);
        } else if (firstData.function === 'get_spending_summary' && firstData.data.summary) {
            dataContent.innerHTML = this.formatSummaryData(firstData.data);
        } else if (firstData.function === 'get_budget_status' && firstData.data.budgets) {
            dataContent.innerHTML = this.formatBudgetData(firstData.data);
        } else if (firstData.function === 'get_product_history' && firstData.data.history) {
            dataContent.innerHTML = this.formatProductHistoryData(firstData.data);
        } else {
            // Generyczne wyświetlanie
            dataContent.innerHTML = `<pre>${JSON.stringify(firstData.data, null, 2)}</pre>`;
        }
        
        card.appendChild(dataContent);
        return card;
    }

    /**
     * Formatowanie danych paragonów
     * NIEUŻYWANE - Backend zwraca sformatowaną odpowiedź w polu "response"
     */
    formatReceiptsData(data) {
        if (!data.receipts || data.receipts.length === 0) {
            return '<p class="text-muted">Brak paragonów do wyświetlenia</p>';
        }
        
        let html = `<div class="data-summary">
            <span><strong>Liczba paragonów:</strong> ${data.count}</span>
            <span><strong>Suma:</strong> ${ui.formatCurrency(data.total_amount)}</span>
        </div>`;
        
        html += '<div class="data-list">';
        data.receipts.slice(0, 5).forEach(receipt => {
            html += `
                <div class="data-item">
                    <div class="data-item-main">
                        <strong>${receipt.sklep || 'Nieznany sklep'}</strong>
                        <span class="badge badge-primary">${receipt.kategoria || 'Bez kategorii'}</span>
                    </div>
                    <div class="data-item-details">
                        <span>${this.formatDate(receipt.data_zakupu)}</span>
                        <span class="data-amount">${ui.formatCurrency(receipt.suma_zakupu)}</span>
                    </div>
                </div>
            `;
        });
        
        if (data.receipts.length > 5) {
            html += `<p class="text-muted text-center mt-2">... i ${data.receipts.length - 5} więcej</p>`;
        }
        
        html += '</div>';
        return html;
    }

    /**
     * Formatowanie podsumowania wydatków
     * NIEUŻYWANE - Backend zwraca sformatowaną odpowiedź w polu "response"
     */
    formatSummaryData(data) {
        if (!data.summary || data.summary.length === 0) {
            return '<p class="text-muted">Brak danych do wyświetlenia</p>';
        }
        
        let html = '<div class="data-list">';
        data.summary.forEach(item => {
            const percentage = (item.percentage || 0).toFixed(1);
            html += `
                <div class="data-item">
                    <div class="data-item-main">
                        <strong>${item.name}</strong>
                    </div>
                    <div class="data-item-details">
                        <span>${percentage}%</span>
                        <span class="data-amount">${ui.formatCurrency(item.total_amount)}</span>
                    </div>
                    <div class="progress-bar-mini">
                        <div class="progress-bar-fill" style="width: ${percentage}%"></div>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        return html;
    }

    /**
     * Formatowanie statusu budżetu
     * NIEUŻYWANE - Backend zwraca sformatowaną odpowiedź w polu "response"
     */
    formatBudgetData(data) {
        if (!data.budgets || data.budgets.length === 0) {
            return '<p class="text-muted">Brak limitów budżetowych</p>';
        }
        
        let html = '<div class="data-list">';
        data.budgets.forEach(budget => {
            const percentage = budget.percentage_used || 0;
            const statusClass = percentage > 100 ? 'danger' : percentage > 80 ? 'warning' : 'success';
            
            html += `
                <div class="data-item">
                    <div class="data-item-main">
                        <strong>${budget.category}</strong>
                        <span class="badge badge-${statusClass}">${percentage.toFixed(0)}%</span>
                    </div>
                    <div class="data-item-details">
                        <span>${ui.formatCurrency(budget.spent)} / ${ui.formatCurrency(budget.limit)}</span>
                        <span class="data-amount">${ui.formatCurrency(budget.remaining)} pozostało</span>
                    </div>
                    <div class="progress-bar-mini">
                        <div class="progress-bar-fill progress-bar-${statusClass}" style="width: ${Math.min(percentage, 100)}%"></div>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        return html;
    }

    /**
     * Formatowanie historii produktu
     * NIEUŻYWANE - Backend zwraca sformatowaną odpowiedź w polu "response"
     */
    formatProductHistoryData(data) {
        if (!data.history || data.history.length === 0) {
            return '<p class="text-muted">Brak historii zakupów dla tego produktu</p>';
        }
        
        let html = `<div class="data-summary">
            <span><strong>Produkt:</strong> ${data.product_name}</span>
            <span><strong>Liczba zakupów:</strong> ${data.count}</span>
        </div>`;
        
        if (data.price_stats) {
            html += `<div class="data-summary">
                <span><strong>Średnia cena:</strong> ${ui.formatCurrency(data.price_stats.average)}</span>
                <span><strong>Min:</strong> ${ui.formatCurrency(data.price_stats.min)}</span>
                <span><strong>Max:</strong> ${ui.formatCurrency(data.price_stats.max)}</span>
            </div>`;
        }
        
        html += '<div class="data-list">';
        data.history.slice(0, 5).forEach(item => {
            html += `
                <div class="data-item">
                    <div class="data-item-main">
                        <strong>${item.sklep || 'Nieznany sklep'}</strong>
                    </div>
                    <div class="data-item-details">
                        <span>${this.formatDate(item.data_zakupu)}</span>
                        <span class="data-amount">${ui.formatCurrency(item.cena)}</span>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        return html;
    }

    /**
     * Formatowanie contentu wiadomości (markdown-like)
     */
    formatMessageContent(content) {
        if (!content) return '';
        
        // Escape HTML
        let formatted = this.escapeHtml(content);
        
        // Bold **text**
        formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        
        // Italic *text*
        formatted = formatted.replace(/\*(.+?)\*/g, '<em>$1</em>');
        
        // Lists - zamień • na <li>, potem opakuj w <ul>
        formatted = formatted.replace(/^• (.+)$/gm, '<li>$1</li>');
        
        // Opakuj wszystkie sąsiadujące <li> w <ul> i usuń \n wewnątrz
        formatted = formatted.replace(/(<li>.*?<\/li>\n?)+/gs, (match) => {
            // Usuń \n z wewnątrz match i opakuj w <ul>
            const cleanedMatch = match.replace(/\n/g, '');
            return '\n<ul>' + cleanedMatch + '</ul>\n';
        });
        
        // Zamień \n\n (podwójne) na znacznik paragrafów
        formatted = formatted.replace(/\n\n/g, '</p><p>');
        
        // Zamień pojedyncze \n na <br>
        formatted = formatted.replace(/\n/g, '<br>');
        
        // Opakuj w paragraf
        formatted = '<p>' + formatted + '</p>';
        
        // Wyczyść puste paragrafy
        formatted = formatted.replace(/<p><\/p>/g, '');
        formatted = formatted.replace(/<p>\s*<\/p>/g, '');
        
        // Wyczyść <br> wokół list i paragrafów
        formatted = formatted.replace(/<br>\s*<ul>/g, '<ul>');
        formatted = formatted.replace(/<\/ul>\s*<br>/g, '</ul>');
        formatted = formatted.replace(/<p><br>/g, '<p>');
        formatted = formatted.replace(/<br><\/p>/g, '</p>');
        
        return formatted;
    }

    /**
     * Pokazanie typing indicator
     */
    showTypingIndicator() {
        if (!this.elements.typingIndicator) return;
        this.elements.typingIndicator.classList.remove('hidden');
        this.scrollToBottom();
    }

    /**
     * Ukrycie typing indicator
     */
    hideTypingIndicator() {
        if (!this.elements.typingIndicator) return;
        this.elements.typingIndicator.classList.add('hidden');
    }

    /**
     * Przewinięcie do dołu chatu
     */
    scrollToBottom() {
        if (!this.elements.chatMessages) return;
        
        setTimeout(() => {
            this.elements.chatMessages.scrollTo({
                top: this.elements.chatMessages.scrollHeight,
                behavior: 'smooth'
            });
        }, 100);
    }

    /**
     * Wyczyszczenie historii
     */
    async clearHistory() {
        const confirmed = await this.showClearHistoryConfirmDialog();
        if (!confirmed) {
            return;
        }
        
        try {
            console.log('Clearing assistant history...');
            const response = await api.post('/assistant/clear', {});
            
            console.log('Clear history response:', response);
            
            if (response.success) {
                this.conversationHistory = [];
                this.elements.chatMessages.innerHTML = '';
                this.showWelcomeMessage();
                ui.showToast('Historia rozmowy została wyczyszczona', 'success');
            } else {
                throw new Error(response.error || 'Nieznany błąd');
            }
        } catch (error) {
            console.error('Error clearing history:', error);
            ui.showToast(`Nie udało się wyczyścić historii: ${error.message}`, 'error');
        }
    }

    async showClearHistoryConfirmDialog() {
        return new Promise((resolve) => {
            const modal = document.getElementById('confirm-clear-history-modal');
            if (!modal) {
                resolve(false);
                return;
            }

            modal.classList.remove('hidden');

            const confirmBtn = document.getElementById('confirm-clear-history-action');
            const cancelBtns = modal.querySelectorAll('.close-modal');

            const cleanup = () => {
                modal.classList.add('hidden');
                confirmBtn.onclick = null;
                cancelBtns.forEach(btn => btn.onclick = null);
                modal.onclick = null;
            };

            confirmBtn.onclick = () => {
                cleanup();
                resolve(true);
            };

            cancelBtns.forEach(btn => {
                btn.onclick = () => {
                    cleanup();
                    resolve(false);
                };
            });

            modal.onclick = (e) => {
                if (e.target === modal) {
                    cleanup();
                    resolve(false);
                }
            };
        });
    }

    /**
     * Wyczyść historię mini czatu
     */
    clearMiniChatHistory() {
        const miniMessages = document.getElementById('assistant-mini-messages');
        if (!miniMessages) return;
        
        // Wyczyść wiadomości z mini chatu
        miniMessages.innerHTML = '';
        
        // Wyczyść historię
        this.conversationHistory = [];
        
        // Pokaż wiadomość powitalną
        this.showMiniWelcomeMessage();
        
        // Toast informacyjny
        ui.showToast('Historia czatu została wyczyszczona', 'success');
    }

    /**
     * Zakończenie sesji
     */
    async endSession() {
        try {
            console.log('Ending assistant session...');
            const response = await api.post('/assistant/session/end', {});
            
            if (response.success) {
                this.currentSessionActive = false;
                console.log('Assistant session ended');
            }
        } catch (error) {
            console.error('Error ending session:', error);
        }
    }

    /**
     * Sprawdzenie statusu asystenta
     */
    async checkHealth() {
        try {
            console.log('Checking assistant health...');
            const response = await api.get('/assistant/health');
            
            console.log('Health check response:', response);
            
            if (response.success && response.status === 'online') {
                this.updateStatusIndicator('online');
                return true;
            } else {
                this.updateStatusIndicator('offline');
                return false;
            }
        } catch (error) {
            console.error('Health check error:', error);
            this.updateStatusIndicator('offline');
            return false;
        }
    }

    /**
     * Aktualizacja wskaźnika statusu
     */
    updateStatusIndicator(status) {
        if (!this.elements.statusIndicator) return;
        
        this.elements.statusIndicator.className = `assistant-status assistant-status-${status}`;
        this.elements.statusIndicator.innerHTML = status === 'online' 
            ? '<i class="fas fa-circle"></i> Online' 
            : '<i class="fas fa-circle"></i> Offline';
    }

    /**
     * Pokazanie błędu
     */
    showErrorMessage(message) {
        const errorMessage = {
            role: 'assistant',
            content: message,
            timestamp: new Date().toISOString(),
            isError: true
        };
        this.addMessageToUI(errorMessage);
    }

    /**
     * Formatowanie timestamp
     */
    formatTimestamp(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        
        if (diffMins < 1) return 'Teraz';
        if (diffMins < 60) return `${diffMins} min temu`;
        if (diffMins < 1440) return `${Math.floor(diffMins / 60)} godz. temu`;
        
        return date.toLocaleString('pl-PL', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    /**
     * Formatowanie daty
     */
    formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('pl-PL', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    }

    /**
     * Escape HTML
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Inicjalizacja mini czatu (floating button)
     */
    initializeMiniChat() {
        // Jeśli mini chat już został zainicjalizowany, nie rób tego ponownie
        if (this.isMiniChatInitialized) {
            return;
        }
        
        const floatingBtn = document.getElementById('floating-assistant-btn');
        const miniChat = document.getElementById('assistant-mini-chat');
        const closeBtn = document.getElementById('assistant-mini-chat-close');
        const clearBtn = document.getElementById('assistant-mini-clear-btn');
        const miniInput = document.getElementById('assistant-mini-input');
        const miniSendBtn = document.getElementById('assistant-mini-send-btn');
        
        if (!floatingBtn || !miniChat) return;
        
        // Otwórz/zamknij czat
        floatingBtn.addEventListener('click', () => {
            this.toggleMiniChat();
        });
        
        // Zamknij czat
        closeBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.closeMiniChat();
        });
        
        // Wyczyść czat
        clearBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.clearMiniChatHistory();
        });
        
        // Wysłanie wiadomości przez button
        miniSendBtn?.addEventListener('click', () => this.sendMiniMessage());
        
        // Wysłanie wiadomości przez Enter
        miniInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMiniMessage();
            }
        });
        
        // Auto-resize mini input
        miniInput?.addEventListener('input', (e) => {
            this.autoResizeMiniTextarea(e.target);
        });
        
        // Oznacz mini chat jako zainicjalizowany
        this.isMiniChatInitialized = true;
    }

    /**
     * Toggle mini chatu
     */
    toggleMiniChat() {
        const miniChat = document.getElementById('assistant-mini-chat');
        if (!miniChat) return;
        
        if (miniChat.classList.contains('active')) {
            this.closeMiniChat();
        } else {
            this.openMiniChat();
        }
    }

    /**
     * Otwórz mini czat
     */
    openMiniChat() {
        const miniChat = document.getElementById('assistant-mini-chat');
        const miniMessages = document.getElementById('assistant-mini-messages');
        const miniInput = document.getElementById('assistant-mini-input');
        
        if (!miniChat) return;
        
        miniChat.classList.add('active');
        
        // Jeśli czat jest pusty, pokaż wiadomość powitalną
        if (miniMessages && miniMessages.children.length === 0) {
            this.showMiniWelcomeMessage();
        }
        
        // Focus na input
        miniInput?.focus();
    }

    /**
     * Zamknij mini czat
     */
    closeMiniChat() {
        const miniChat = document.getElementById('assistant-mini-chat');
        if (!miniChat) return;
        
        miniChat.classList.remove('active');
    }

    /**
     * Pokaż wiadomość powitalną w mini czacie
     */
    showMiniWelcomeMessage() {
        const miniMessage = {
            role: 'assistant',
            content: 'Cześć! 👋 Jak się masz? Mogę pomóc w analizie Twoich wydatków. Co Cię interesuje?',
            timestamp: new Date().toISOString(),
            isWelcome: true
        };
        
        this.addMiniMessageToUI(miniMessage);
    }

    /**
     * Auto-resize textarea w mini czacie
     */
    autoResizeMiniTextarea(textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 80) + 'px';
    }

    /**
     * Wysłanie wiadomości w mini czacie
     */
    async sendMiniMessage() {
        const miniInput = document.getElementById('assistant-mini-input');
        const message = miniInput?.value.trim();
        
        if (!message || this.isLoading) {
            return;
        }
        
        // Wyczyść input
        miniInput.value = '';
        miniInput.style.height = 'auto';
        
        // Dodaj wiadomość użytkownika do UI
        const userMessage = {
            role: 'user',
            content: message,
            timestamp: new Date().toISOString()
        };
        this.addMiniMessageToUI(userMessage);
        this.conversationHistory.push(userMessage);
        
        // Pokaż typing indicator w mini czacie
        this.showMiniTypingIndicator();
        this.isLoading = true;
        
        try {
            // Wyślij do API
            const response = await api.post('/assistant/chat', {
                message: message,
                context: {}
            });
            
            if (response.success) {
                const assistantMessage = {
                    role: 'assistant',
                    content: response.response,
                    intent: response.intent,
                    data: response.data,
                    timestamp: response.timestamp || new Date().toISOString()
                };
                
                this.conversationHistory.push(assistantMessage);
                this.addMiniMessageToUI(assistantMessage);
                this.currentSessionActive = true;
            } else {
                throw new Error(response.error || 'Nieznany błąd');
            }
        } catch (error) {
            console.error('Error sending mini message:', error);
            const errorMessage = {
                role: 'assistant',
                content: `Przepraszam, coś poszło nie tak. Spróbuj ponownie.`,
                timestamp: new Date().toISOString(),
                isError: true
            };
            this.addMiniMessageToUI(errorMessage);
        } finally {
            this.hideMiniTypingIndicator();
            this.isLoading = false;
        }
    }

    /**
     * Dodanie wiadomości do mini czatu
     */
    addMiniMessageToUI(message) {
        const miniMessages = document.getElementById('assistant-mini-messages');
        if (!miniMessages) return;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `assistant-mini-message ${message.role}`;
        
        // Avatar
        const avatar = document.createElement('div');
        avatar.className = 'assistant-mini-message-avatar';
        avatar.innerHTML = message.role === 'user' 
            ? '<i class="fas fa-user"></i>' 
            : '<i class="fas fa-robot"></i>';
        
        // Content
        const content = document.createElement('div');
        content.className = 'assistant-mini-message-content';
        
        // Text
        const text = document.createElement('div');
        text.className = 'assistant-mini-message-text';
        text.innerHTML = this.formatMessageContent(message.content);
        content.appendChild(text);
        
        messageDiv.appendChild(avatar);
        messageDiv.appendChild(content);
        
        miniMessages.appendChild(messageDiv);
        
        // Scroll do dołu
        miniMessages.scrollTop = miniMessages.scrollHeight;
    }

    /**
     * Pokaż typing indicator w mini czacie
     */
    showMiniTypingIndicator() {
        const miniMessages = document.getElementById('assistant-mini-messages');
        if (!miniMessages) return;
        
        const typingDiv = document.createElement('div');
        typingDiv.className = 'assistant-mini-message assistant';
        typingDiv.id = 'mini-typing-indicator';
        
        const avatar = document.createElement('div');
        avatar.className = 'assistant-mini-message-avatar';
        avatar.innerHTML = '<i class="fas fa-robot"></i>';
        
        const content = document.createElement('div');
        content.className = 'assistant-mini-message-content';
        
        const typing = document.createElement('div');
        typing.className = 'typing-indicator';
        typing.innerHTML = '<span></span><span></span><span></span>';
        
        content.appendChild(typing);
        typingDiv.appendChild(avatar);
        typingDiv.appendChild(content);
        
        miniMessages.appendChild(typingDiv);
        miniMessages.scrollTop = miniMessages.scrollHeight;
    }

    /**
     * Ukryj typing indicator w mini czacie
     */
    hideMiniTypingIndicator() {
        const typingIndicator = document.getElementById('mini-typing-indicator');
        typingIndicator?.remove();
    }

    /**
     * Cleanup przy opuszczeniu widoku
     */
    cleanup() {
        // Opcjonalnie zakończ sesję przy długiej nieaktywności
        if (this.currentSessionActive) {
            // Możemy zdecydować czy kończyć sesję czy nie
            // this.endSession();
        }
    }
}

// Eksport global instance
window.assistantManager = new AssistantManager();
