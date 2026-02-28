// Scan Receipt Manager
class ScanManager {
    constructor() {
        this.selectedFile = null;
        this.stream = null;
        this.initializeEventListeners();
        this.checkApiKey();
    }

    initializeEventListeners() {
        // Check and show/hide scan area based on API key
        const selectFileBtn = document.getElementById('select-file-btn');
        const takePhotoBtn = document.getElementById('take-photo-btn');
        const fileInput = document.getElementById('receipt-file');
        const uploadZone = document.getElementById('upload-zone');
        const analyzeBtn = document.getElementById('analyze-btn');
        const cancelBtn = document.getElementById('cancel-preview-btn');
        const skipRedirectBtn = document.getElementById('skip-redirect-btn');
        const saveApiKeyBtn = document.getElementById('save-api-key-btn');
        const capturePhotoBtn = document.getElementById('capture-photo-btn');
        const cancelCameraBtn = document.getElementById('cancel-camera-btn');

        if (selectFileBtn) {
            selectFileBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                fileInput.click();
            });
        }

        if (takePhotoBtn) {
            takePhotoBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.openCamera();
            });
        }

        if (fileInput) {
            fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        }

        if (uploadZone) {
            uploadZone.addEventListener('dragover', (e) => this.handleDragOver(e));
            uploadZone.addEventListener('dragleave', (e) => this.handleDragLeave(e));
            uploadZone.addEventListener('drop', (e) => this.handleDrop(e));
        }

        if (analyzeBtn) {
            analyzeBtn.addEventListener('click', () => this.analyzeReceipt());
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.cancelPreview());
        }

        if (capturePhotoBtn) {
            capturePhotoBtn.addEventListener('click', () => this.capturePhoto());
        }

        if (cancelCameraBtn) {
            cancelCameraBtn.addEventListener('click', () => this.closeCamera());
        }

        if (skipRedirectBtn) {
            skipRedirectBtn.addEventListener('click', () => {
                this.redirectToReceipt();
            });
        }

        if (saveApiKeyBtn) {
            saveApiKeyBtn.addEventListener('click', () => this.saveApiKey());
        }
    }

    checkApiKey() {
        const hasApiKey = localStorage.getItem(CONFIG.STORAGE_KEYS.HAS_API_KEY) === 'true';
        const apiKeySection = document.getElementById('api-key-section');
        const scanArea = document.getElementById('scan-area');

        if (hasApiKey) {
            apiKeySection.classList.add('hidden');
            scanArea.classList.remove('hidden');
        } else {
            apiKeySection.classList.remove('hidden');
            scanArea.classList.add('hidden');
        }
    }

    async saveApiKey() {
        const keyInput = document.getElementById('gemini-key-input');
        const key = keyInput.value.trim();

        if (!key) {
            ui.showToast('Wprowadź klucz API', 'warning');
            return;
        }

        ui.showLoader();

        try {
            await api.addApiKey(key);
            localStorage.setItem(CONFIG.STORAGE_KEYS.HAS_API_KEY, 'true');
            ui.showToast('Klucz API został zapisany!', 'success');
            this.checkApiKey();
            keyInput.value = '';
        } catch (error) {
            ui.showToast(error.message || 'Błąd zapisywania klucza', 'error');
        } finally {
            ui.hideLoader();
        }
    }

    handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.classList.add('drag-over');
    }

    handleDragLeave(e) {
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.classList.remove('drag-over');
    }

    handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.classList.remove('drag-over');

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            this.processFile(files[0]);
        }
    }

    handleFileSelect(e) {
        const files = e.target.files;
        if (files.length > 0) {
            this.processFile(files[0]);
        }
    }

    processFile(file) {
        // Validate file type
        if (!CONFIG.ALLOWED_IMAGE_TYPES.includes(file.type)) {
            ui.showToast('Nieprawidłowy format pliku. Użyj JPG lub PNG.', 'error');
            return;
        }

        // Validate file size
        if (file.size > CONFIG.MAX_FILE_SIZE) {
            ui.showToast('Plik jest za duży. Maksymalny rozmiar to 10MB.', 'error');
            return;
        }

        this.selectedFile = file;
        this.showPreview(file);
    }

    showPreview(file) {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            const previewImage = document.getElementById('preview-image');
            previewImage.src = e.target.result;

            // Ukryj oba karty
            document.getElementById('upload-card').classList.add('hidden');
            document.getElementById('camera-card').classList.add('hidden');
            
            document.getElementById('preview-area').classList.remove('hidden');
            document.getElementById('scan-result').classList.add('hidden');
        };

        reader.readAsDataURL(file);
    }

    cancelPreview() {
        this.selectedFile = null;
        document.getElementById('receipt-file').value = '';
        
        // Zatrzymaj kamerę jeśli jest aktywna
        this.closeCamera();
        
        // Pokaż oba karty
        document.getElementById('upload-card').classList.remove('hidden');
        document.getElementById('camera-card').classList.remove('hidden');
        
        document.getElementById('preview-area').classList.add('hidden');
        document.getElementById('scan-result').classList.add('hidden');
        document.getElementById('camera-area').classList.add('hidden');
        document.getElementById('camera-trigger').classList.remove('hidden');
    }

    async analyzeReceipt() {
        if (!this.selectedFile) {
            ui.showToast('Wybierz plik do analizy', 'warning');
            return;
        }

        // Reset skip flag
        this.loaderSkipped = false;

        // Show professional receipt loader with step-by-step animation
        ui.showReceiptLoader();

        try {
            // Convert file to base64
            const base64 = await this.fileToBase64(this.selectedFile);
            
            // Remove data URL prefix
            const base64Data = base64.split(',')[1];

            // Send to API - when it responds, immediately show the result
            const receiptId = await api.analyzeReceipt(base64Data);

            // Hide loader immediately when backend responds
            ui.hideReceiptLoader();

            // Store receipt ID
            document.getElementById('new-receipt-id').textContent = receiptId;
            
            // Check if user skipped the loader animation
            if (this.loaderSkipped) {
                // User clicked skip - just show toast, no redirect
                ui.showToast('Paragon został przeanalizowany pomyślnie!', 'success');
                // Hide preview and show upload options again for next receipt
                document.getElementById('preview-area').classList.add('hidden');
                document.getElementById('upload-card').classList.remove('hidden');
                document.getElementById('camera-card').classList.remove('hidden');
                document.getElementById('camera-trigger').classList.remove('hidden');
                // Reset file input
                this.selectedFile = null;
                const fileInput = document.getElementById('receipt-file');
                if (fileInput) fileInput.value = '';
            } else {
                // User waited - show success screen with countdown and redirect
                document.getElementById('preview-area').classList.add('hidden');
                document.getElementById('scan-result').classList.remove('hidden');
                
                // Start countdown to redirect
                this.startRedirectCountdown();
            }

        } catch (error) {
            // Hide loader immediately on error
            ui.hideReceiptLoader();
            ui.showToast(error.message || 'Błąd analizy paragonu', 'error');
        }
    }

    startRedirectCountdown() {
        let seconds = 3;
        const countdownEl = document.getElementById('redirect-countdown');
        countdownEl.textContent = seconds;

        this.redirectInterval = setInterval(() => {
            seconds--;
            countdownEl.textContent = seconds;
            
            if (seconds <= 0) {
                this.redirectToReceipt();
            }
        }, 1000);
    }

    redirectToReceipt() {
        if (this.redirectInterval) {
            clearInterval(this.redirectInterval);
        }
        
        const receiptId = document.getElementById('new-receipt-id').textContent;
        if (window.receiptsManager) {
            window.receiptsManager.showReceiptDetail(receiptId);
        }
    }

    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    async openCamera() {
        try {
            // Sprawdź dostępność MediaDevices API
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                ui.showToast('Twoja przeglądarka nie obsługuje dostępu do kamery', 'error');
                return;
            }

            // Ukryj upload card i trigger, pokaż camera area
            document.getElementById('upload-card').classList.add('hidden');
            document.getElementById('camera-trigger').classList.add('hidden');
            document.getElementById('camera-area').classList.remove('hidden');
            document.getElementById('preview-area').classList.add('hidden');

            // Konfiguracja dla urządzeń mobilnych i desktopowych
            const constraints = {
                video: {
                    facingMode: 'environment', // Tylna kamera na telefonie
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                }
            };

            // Poproś o dostęp do kamery
            this.stream = await navigator.mediaDevices.getUserMedia(constraints);
            
            const videoElement = document.getElementById('camera-preview');
            videoElement.srcObject = this.stream;

            ui.showToast('Kamera uruchomiona pomyślnie', 'success');

        } catch (error) {
            console.error('Błąd dostępu do kamery:', error);
            
            // Obsługa różnych błędów
            let errorMessage = 'Nie udało się uruchomić kamery';
            
            if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
                errorMessage = 'Dostęp do kamery został zablokowany. Sprawdź uprawnienia w ustawieniach przeglądarki.';
            } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
                errorMessage = 'Nie znaleziono kamery. Upewnij się, że urządzenie ma kamerę.';
            } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
                errorMessage = 'Kamera jest już używana przez inną aplikację.';
            } else if (error.name === 'OverconstrainedError') {
                errorMessage = 'Nie można spełnić wymagań kamery. Spróbuj ponownie.';
            } else if (error.name === 'SecurityError') {
                errorMessage = 'Dostęp do kamery zablokowany ze względów bezpieczeństwa. Sprawdź, czy strona używa HTTPS.';
            }
            
            ui.showToast(errorMessage, 'error');
            this.closeCamera();
        }
    }

    capturePhoto() {
        const videoElement = document.getElementById('camera-preview');
        const canvas = document.getElementById('camera-canvas');
        const context = canvas.getContext('2d');

        // Ustaw wymiary canvas na podstawie wideo
        canvas.width = videoElement.videoWidth;
        canvas.height = videoElement.videoHeight;

        // Narysuj aktualną klatkę z wideo na canvas
        context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

        // Konwertuj canvas na blob
        canvas.toBlob((blob) => {
            if (blob) {
                // Utwórz plik z bloba
                const file = new File([blob], 'camera-photo.jpg', { type: 'image/jpeg' });
                this.selectedFile = file;
                
                // Zatrzymaj stream i pokaż podgląd
                this.closeCamera();
                this.showPreview(file);
                
                ui.showToast('Zdjęcie zrobione pomyślnie!', 'success');
            } else {
                ui.showToast('Błąd podczas przechwytywania zdjęcia', 'error');
            }
        }, 'image/jpeg', 0.95);
    }

    closeCamera() {
        // Zatrzymaj wszystkie ścieżki wideo
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }

        // Wyczyść video element
        const videoElement = document.getElementById('camera-preview');
        if (videoElement) {
            videoElement.srcObject = null;
        }

        // Pokaż oba karty z powrotem
        const uploadCard = document.getElementById('upload-card');
        const cameraTrigger = document.getElementById('camera-trigger');
        const cameraArea = document.getElementById('camera-area');
        
        if (uploadCard) uploadCard.classList.remove('hidden');
        if (cameraTrigger) cameraTrigger.classList.remove('hidden');
        if (cameraArea) cameraArea.classList.add('hidden');
    }


}

// Create global instance
window.scanManager = new ScanManager();
