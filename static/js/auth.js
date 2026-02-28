// Authentication Manager
class AuthManager {
    constructor() {
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        // Auth navigation - back to landing page
        const authNavBack = document.getElementById('auth-nav-back');
        if (authNavBack) {
            authNavBack.addEventListener('click', (e) => {
                e.preventDefault();
                window.location.href = '/';
            });
        }

        // Toggle between login and register
        const showRegisterBtn = document.getElementById('show-register');
        const showLoginBtn = document.getElementById('show-login');
        
        if (showRegisterBtn) {
            showRegisterBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.showRegisterForm();
            });
        }
        
        if (showLoginBtn) {
            showLoginBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.showLoginForm();
            });
        }

        // Form submissions
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');
        
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }
        
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleRegister();
            });
        }

        // Logout button
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.handleLogout());
        }

        // Real-time validation for login form
        const loginEmail = document.getElementById('login-email');
        const loginPassword = document.getElementById('login-password');
        
        if (loginEmail) {
            loginEmail.addEventListener('blur', () => this.validateEmailField(loginEmail));
            loginEmail.addEventListener('input', () => {
                if (loginEmail.classList.contains('error')) {
                    this.validateEmailField(loginEmail);
                }
            });
        }
        
        if (loginPassword) {
            loginPassword.addEventListener('blur', () => this.validatePasswordField(loginPassword, true));
            loginPassword.addEventListener('input', () => {
                if (loginPassword.classList.contains('error')) {
                    this.validatePasswordField(loginPassword, true);
                }
            });
        }

        // Real-time validation for register form
        const registerEmail = document.getElementById('register-email');
        const registerPassword = document.getElementById('register-password');
        const registerPasswordConfirm = document.getElementById('register-password-confirm');
        
        if (registerEmail) {
            registerEmail.addEventListener('blur', () => this.validateEmailField(registerEmail));
            registerEmail.addEventListener('input', () => {
                if (registerEmail.classList.contains('error')) {
                    this.validateEmailField(registerEmail);
                }
            });
        }
        
        if (registerPassword) {
            registerPassword.addEventListener('blur', () => this.validatePasswordField(registerPassword, true));
            registerPassword.addEventListener('input', () => {
                if (registerPassword.classList.contains('error')) {
                    this.validatePasswordField(registerPassword, true);
                }
                // Also validate confirm password if it has value
                if (registerPasswordConfirm && registerPasswordConfirm.value) {
                    this.validatePasswordConfirmField(registerPassword, registerPasswordConfirm);
                }
            });
        }
        
        if (registerPasswordConfirm) {
            registerPasswordConfirm.addEventListener('blur', () => {
                if (registerPassword) {
                    this.validatePasswordConfirmField(registerPassword, registerPasswordConfirm);
                }
            });
            registerPasswordConfirm.addEventListener('input', () => {
                if (registerPassword) {
                    this.validatePasswordConfirmField(registerPassword, registerPasswordConfirm);
                }
            });
        }
    }

    showLoginForm() {
        const loginForm = document.getElementById('login-form');
        const registerForm = document.getElementById('register-form');
        
        loginForm.classList.add('active');
        loginForm.classList.remove('hidden');
        
        registerForm.classList.remove('active');
        registerForm.classList.add('hidden');
        
        // Hide all message containers
        ui.hideMessage('auth-message');
        ui.hideMessage('login-message');
        ui.hideMessage('register-message');
    }

    showRegisterForm() {
        const loginForm = document.getElementById('login-form');
        const registerForm = document.getElementById('register-form');
        
        registerForm.classList.add('active');
        registerForm.classList.remove('hidden');
        
        loginForm.classList.remove('active');
        loginForm.classList.add('hidden');
        
        // Hide all message containers
        ui.hideMessage('auth-message');
        ui.hideMessage('login-message');
        ui.hideMessage('register-message');
    }

    async handleLogin() {
        const emailInput = document.getElementById('login-email');
        const passwordInput = document.getElementById('login-password');
        const email = emailInput.value.trim();
        const password = passwordInput.value;

        // Validate fields
        const isEmailValid = this.validateEmailField(emailInput);
        const isPasswordValid = this.validatePasswordField(passwordInput, true);

        if (!email || !password) {
            ui.showMessage('login-message', 'Wypełnij wszystkie pola', 'error');
            return;
        }

        if (!isEmailValid) {
            ui.showMessage('login-message', 'Podaj poprawny adres email', 'error');
            return;
        }

        if (!isPasswordValid) {
            ui.showMessage('login-message', 'Hasło nie spełnia wymagań (min. 8 znaków, wielka litera, cyfra, znak specjalny)', 'error');
            return;
        }

        ui.showLoader();
        ui.hideMessage('login-message');

        try {
            const response = await api.login(email, password);
            
            if (response.success) {
                ui.showToast('Zalogowano pomyślnie!', 'success');
                this.onLoginSuccess(response);
            } else {
                ui.showMessage('login-message', response.message || 'Błąd logowania', 'error');
            }
        } catch (error) {
            // Handle different error scenarios
            let errorMessage = error.message || 'Wystąpił błąd podczas logowania';
            
            // Check for common error patterns and provide helpful messages
            if (errorMessage.toLowerCase().includes('złe dane') ||
                errorMessage.toLowerCase().includes('nieprawidłowy') || 
                errorMessage.toLowerCase().includes('incorrect') ||
                errorMessage.toLowerCase().includes('invalid')) {
                errorMessage = 'Nieprawidłowy email lub hasło. Sprawdź dane i spróbuj ponownie.';
            } else if (errorMessage.toLowerCase().includes('nie znaleziono') || 
                       errorMessage.toLowerCase().includes('not found')) {
                errorMessage = 'Konto o podanym adresie email nie istnieje.';
            } else if (errorMessage.includes('Nie można połączyć się z serwerem')) {
                errorMessage = 'Nie można połączyć się z serwerem. Sprawdź połączenie internetowe.';
            }
            
            ui.showMessage('login-message', errorMessage, 'error');
            console.error('Login error:', error);
        } finally {
            ui.hideLoader();
        }
    }

    async handleRegister() {
        const name = document.getElementById('register-name').value.trim();
        const emailInput = document.getElementById('register-email');
        const passwordInput = document.getElementById('register-password');
        const passwordConfirmInput = document.getElementById('register-password-confirm');
        const email = emailInput.value.trim();
        const password = passwordInput.value;
        const passwordConfirm = passwordConfirmInput.value;

        // Validate fields
        const isEmailValid = this.validateEmailField(emailInput);
        const isPasswordValid = this.validatePasswordField(passwordInput, true);

        if (!name || !email || !password || !passwordConfirm) {
            ui.showMessage('register-message', 'Wypełnij wszystkie pola', 'error');
            return;
        }

        if (password !== passwordConfirm) {
            ui.showMessage('register-message', 'Hasła nie są identyczne', 'error');
            passwordConfirmInput.classList.add('error');
            return;
        } else {
            passwordConfirmInput.classList.remove('error');
        }

        if (!isEmailValid) {
            ui.showMessage('register-message', 'Podaj poprawny adres email', 'error');
            return;
        }

        // Validate password with strict rules
        if (!isPasswordValid || !this.validatePassword(password)) {
            ui.showMessage('register-message', 'Hasło nie spełnia wymagań (min. 8 znaków, wielka litera, cyfra, znak specjalny)', 'error');
            return;
        }

        ui.showLoader();
        ui.hideMessage('register-message');

        try {
            const response = await api.register(email, password, name);
            
            if (response.success) {
                ui.showMessage('register-message', 'Rejestracja udana! Możesz się teraz zalogować.', 'success');
                setTimeout(() => {
                    this.showLoginForm();
                    // Auto-fill login email
                    document.getElementById('login-email').value = email;
                }, 2000);
            } else {
                ui.showMessage('register-message', response.message || 'Błąd rejestracji', 'error');
            }
        } catch (error) {
            // Handle different error scenarios
            let errorMessage = 'Wystąpił błąd podczas rejestracji';
            
            if (error.message) {
                errorMessage = error.message;
            }
            
            // Check for common error patterns and provide helpful messages
            if (errorMessage.toLowerCase().includes('email') && 
                (errorMessage.toLowerCase().includes('istnieje') || 
                 errorMessage.toLowerCase().includes('exists') ||
                 errorMessage.toLowerCase().includes('już') ||
                 errorMessage.toLowerCase().includes('already'))) {
                errorMessage = 'Konto z tym adresem email już istnieje. Spróbuj się zalogować.';
            } else if (errorMessage.toLowerCase().includes('hasło') || 
                       errorMessage.toLowerCase().includes('password')) {
                errorMessage = 'Hasło nie spełnia wymagań bezpieczeństwa. Użyj co najmniej 8 znaków, w tym wielką literę, cyfrę i znak specjalny.';
            } else if (errorMessage.includes('Nie można połączyć się z serwerem')) {
                errorMessage = 'Nie można połączyć się z serwerem. Sprawdź połączenie internetowe.';
            } else if (errorMessage.toLowerCase().includes('email') && 
                       errorMessage.toLowerCase().includes('nieprawidłowy')) {
                errorMessage = 'Podany adres email jest nieprawidłowy.';
            }
            
            ui.showMessage('register-message', errorMessage, 'error');
            console.error('Registration error:', error);
        } finally {
            ui.hideLoader();
        }
    }

    validateEmail(email) {
        // Simple email validation - check if @ exists
        return email.includes('@') && email.indexOf('@') > 0 && email.indexOf('@') < email.length - 1;
    }

    validateEmailField(emailInput) {
        const email = emailInput.value.trim();
        
        if (!email) {
            emailInput.classList.remove('error', 'success');
            return false;
        }
        
        if (this.validateEmail(email)) {
            emailInput.classList.remove('error');
            emailInput.classList.add('success');
            return true;
        } else {
            emailInput.classList.remove('success');
            emailInput.classList.add('error');
            return false;
        }
    }

    validatePassword(password) {
        // Min 8 chars, uppercase, lowercase, digit, special char
        const minLength = password.length >= 8;
        const hasUpper = /[A-Z]/.test(password);
        const hasLower = /[a-z]/.test(password);
        const hasDigit = /\d/.test(password);
        const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
        
        return minLength && hasUpper && hasLower && hasDigit && hasSpecial;
    }

    validatePasswordField(passwordInput, strictValidation = true) {
        const password = passwordInput.value;
        
        if (!password) {
            passwordInput.classList.remove('error', 'success');
            return false;
        }
        
        // Both login and register use the same validation: 
        // Min 8 chars, uppercase, lowercase, digit, special char
        const isValid = this.validatePassword(password);
        
        if (isValid) {
            passwordInput.classList.remove('error');
            passwordInput.classList.add('success');
            return true;
        } else {
            passwordInput.classList.remove('success');
            passwordInput.classList.add('error');
            return false;
        }
    }

    validatePasswordConfirmField(passwordInput, passwordConfirmInput) {
        const password = passwordInput.value;
        const passwordConfirm = passwordConfirmInput.value;
        
        if (!passwordConfirm) {
            passwordConfirmInput.classList.remove('error', 'success');
            return false;
        }
        
        if (password === passwordConfirm && password.length > 0) {
            passwordConfirmInput.classList.remove('error');
            passwordConfirmInput.classList.add('success');
            return true;
        } else {
            passwordConfirmInput.classList.remove('success');
            passwordConfirmInput.classList.add('error');
            return false;
        }
    }

    onLoginSuccess(response) {
        // Update UI with user info
        const userNameElement = document.getElementById('user-name');
        if (userNameElement) {
            userNameElement.textContent = response.imie;
        }

        // Generate and update avatars
        if (response.imie) {
            ui.updateAvatars(response.imie);
        }

        // Check if API key exists
        const hasApiKey = response.klucz;
        localStorage.setItem(CONFIG.STORAGE_KEYS.HAS_API_KEY, hasApiKey);

        // Show floating assistant button after successful login
        const floatingBtn = document.getElementById('floating-assistant-btn');
        if (floatingBtn) {
            floatingBtn.style.display = 'flex';
        }

        // Show app view
        ui.showView('app-view');
        
        // Initialize dashboard
        if (window.dashboardManager) {
            window.dashboardManager.initialize();
        }
    }

    async handleLogout() {
        const confirmed = await this.showLogoutConfirmDialog();
        if (!confirmed) {
            return;
        }

        ui.showLoader();

        try {
            await api.logout();
            ui.showToast('Wylogowano pomyślnie', 'success');
            
            // Clear all data and show login
            this.onLogoutSuccess();
        } catch (error) {
            ui.showToast('Błąd podczas wylogowania', 'error');
            // Still logout on client side
            this.onLogoutSuccess();
        } finally {
            ui.hideLoader();
        }
    }

    async showLogoutConfirmDialog() {
        return new Promise((resolve) => {
            const modal = document.getElementById('confirm-logout-modal');
            if (!modal) {
                resolve(false);
                return;
            }

            modal.classList.remove('hidden');

            const confirmBtn = document.getElementById('confirm-logout-action');
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

    onLogoutSuccess() {
        // Hide floating assistant button
        const floatingBtn = document.getElementById('floating-assistant-btn');
        if (floatingBtn) {
            floatingBtn.style.display = 'none';
        }
        
        // Clear forms
        ui.clearForm('loginForm');
        ui.clearForm('registerForm');
        
        // Redirect to landing page
        window.location.href = '/';
    }

    async checkSession() {
        const token = api.getToken();
        
        // Check if token exists and is still valid
        if (!token || !api.isSessionValid()) {
            // Session expired or no token
            localStorage.removeItem(CONFIG.STORAGE_KEYS.SESSION_TIMESTAMP);
            
            // Hide floating assistant button
            const floatingBtn = document.getElementById('floating-assistant-btn');
            if (floatingBtn) {
                floatingBtn.style.display = 'none';
            }
            
            ui.showView('auth-view');
            return false;
        }

        ui.showLoader();

        try {
            const response = await api.verify();
            
            if (response.success) {
                // Load user info from localStorage
                const userName = localStorage.getItem(CONFIG.STORAGE_KEYS.USER_NAME);
                const userNameElement = document.getElementById('user-name');
                if (userNameElement && userName) {
                    userNameElement.textContent = userName;
                }

                // Generate and update avatars
                if (userName) {
                    ui.updateAvatars(userName);
                }

                ui.showView('app-view');
                
                // Initialize dashboard
                if (window.dashboardManager) {
                    window.dashboardManager.initialize();
                }
                
                // Log remaining session time
                const remainingTime = api.getSessionRemainingTime();
                const remainingHours = Math.floor(remainingTime / (60 * 60 * 1000));
                console.log(`Session valid. Remaining time: ${remainingHours} hours`);
                
                return true;
            }
        } catch (error) {
            console.error('Session check failed:', error);
            
            // Hide floating assistant button on error
            const floatingBtn = document.getElementById('floating-assistant-btn');
            if (floatingBtn) {
                floatingBtn.style.display = 'none';
            }
            
            // If it's a network error, show a helpful message
            if (error.message && error.message.includes('Nie można połączyć się z serwerem')) {
                ui.showToast('Nie można połączyć się z serwerem. Sprawdź połączenie internetowe.', 'error');
            }
            
            ui.showView('auth-view');
            return false;
        } finally {
            ui.hideLoader();
        }
    }
}

// Create global instance
const authManager = new AuthManager();
