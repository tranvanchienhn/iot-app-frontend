// Utility Functions
class Utils {
    // Format numbers
    static formatNumber(num, decimals = 0) {
        return new Intl.NumberFormat('vi-VN', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        }).format(num);
    }

    // Format currency
    static formatCurrency(amount) {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(amount);
    }

    // Format date/time
    static formatDateTime(date, options = {}) {
        const defaultOptions = {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        return new Intl.DateTimeFormat('vi-VN', { ...defaultOptions, ...options }).format(new Date(date));
    }

    // Format relative time
    static formatRelativeTime(date) {
        const now = new Date();
        const target = new Date(date);
        const diffMs = now - target;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Vừa xong';
        if (diffMins < 60) return `${diffMins} phút trước`;
        if (diffHours < 24) return `${diffHours} giờ trước`;
        if (diffDays < 7) return `${diffDays} ngày trước`;
        
        return this.formatDateTime(date, { 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // Generate unique ID
    static generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    // Debounce function
    static debounce(func, wait) {
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

    // Throttle function
    static throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    // Deep clone object
    static deepClone(obj) {
        return JSON.parse(JSON.stringify(obj));
    }

    // Check if device is mobile
    static isMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    // Check if device supports touch
    static isTouchDevice() {
        return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    }

    // Get device type
    static getDeviceType() {
        const width = window.innerWidth;
        if (width < 576) return 'mobile';
        if (width < 768) return 'tablet';
        if (width < 992) return 'desktop-small';
        return 'desktop';
    }

    // Validate email
    static isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Validate phone number (Vietnamese format)
    static isValidPhone(phone) {
        const phoneRegex = /^(\+84|84|0)([3|5|7|8|9])+([0-9]{8})$/;
        return phoneRegex.test(phone.replace(/\s/g, ''));
    }

    // Validate password strength
    static validatePassword(password) {
        const minLength = 8;
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumbers = /\d/.test(password);
        const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

        return {
            isValid: password.length >= minLength && hasUpperCase && hasLowerCase && hasNumbers,
            criteria: {
                length: password.length >= minLength,
                upperCase: hasUpperCase,
                lowerCase: hasLowerCase,
                numbers: hasNumbers,
                specialChar: hasSpecialChar
            },
            strength: this.getPasswordStrength(password)
        };
    }

    // Calculate password strength
    static getPasswordStrength(password) {
        let score = 0;
        if (password.length >= 8) score++;
        if (password.length >= 12) score++;
        if (/[a-z]/.test(password)) score++;
        if (/[A-Z]/.test(password)) score++;
        if (/[0-9]/.test(password)) score++;
        if (/[^A-Za-z0-9]/.test(password)) score++;

        if (score < 3) return 'weak';
        if (score < 5) return 'medium';
        return 'strong';
    }

    // Local storage helpers
    static storage = {
        set(key, value) {
            try {
                localStorage.setItem(key, JSON.stringify(value));
                return true;
            } catch (e) {
                console.error('Storage set error:', e);
                return false;
            }
        },

        get(key, defaultValue = null) {
            try {
                const item = localStorage.getItem(key);
                return item ? JSON.parse(item) : defaultValue;
            } catch (e) {
                console.error('Storage get error:', e);
                return defaultValue;
            }
        },

        remove(key) {
            try {
                localStorage.removeItem(key);
                return true;
            } catch (e) {
                console.error('Storage remove error:', e);
                return false;
            }
        },

        clear() {
            try {
                localStorage.clear();
                return true;
            } catch (e) {
                console.error('Storage clear error:', e);
                return false;
            }
        }
    };

    // Animation helpers
    static animate = {
        fadeIn(element, duration = 300) {
            element.style.opacity = '0';
            element.style.display = 'block';
            
            const start = performance.now();
            const animate = (currentTime) => {
                const elapsed = currentTime - start;
                const progress = Math.min(elapsed / duration, 1);
                
                element.style.opacity = progress;
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                }
            };
            
            requestAnimationFrame(animate);
        },

        fadeOut(element, duration = 300) {
            const start = performance.now();
            const initialOpacity = parseFloat(window.getComputedStyle(element).opacity);
            
            const animate = (currentTime) => {
                const elapsed = currentTime - start;
                const progress = Math.min(elapsed / duration, 1);
                
                element.style.opacity = initialOpacity * (1 - progress);
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    element.style.display = 'none';
                }
            };
            
            requestAnimationFrame(animate);
        },

        slideDown(element, duration = 300) {
            element.style.height = '0px';
            element.style.overflow = 'hidden';
            element.style.display = 'block';
            
            const targetHeight = element.scrollHeight;
            const start = performance.now();
            
            const animate = (currentTime) => {
                const elapsed = currentTime - start;
                const progress = Math.min(elapsed / duration, 1);
                
                element.style.height = (targetHeight * progress) + 'px';
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    element.style.height = '';
                    element.style.overflow = '';
                }
            };
            
            requestAnimationFrame(animate);
        },

        slideUp(element, duration = 300) {
            const initialHeight = element.offsetHeight;
            const start = performance.now();
            
            element.style.overflow = 'hidden';
            
            const animate = (currentTime) => {
                const elapsed = currentTime - start;
                const progress = Math.min(elapsed / duration, 1);
                
                element.style.height = (initialHeight * (1 - progress)) + 'px';
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    element.style.display = 'none';
                    element.style.height = '';
                    element.style.overflow = '';
                }
            };
            
            requestAnimationFrame(animate);
        }
    };

    // Network helpers
    static network = {
        async request(url, options = {}) {
            const defaultOptions = {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
                timeout: 10000
            };

            const config = { ...defaultOptions, ...options };
            
            // Add timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), config.timeout);
            config.signal = controller.signal;

            try {
                const response = await fetch(url, config);
                clearTimeout(timeoutId);
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                return await response.json();
            } catch (error) {
                clearTimeout(timeoutId);
                
                if (error.name === 'AbortError') {
                    throw new Error('Request timeout');
                }
                
                throw error;
            }
        },

        isOnline() {
            return navigator.onLine;
        },

        onOnline(callback) {
            window.addEventListener('online', callback);
        },

        onOffline(callback) {
            window.addEventListener('offline', callback);
        }
    };

    // Performance helpers
    static performance = {
        measure(name, fn) {
            const start = performance.now();
            const result = fn();
            const end = performance.now();
            console.log(`${name} took ${end - start} milliseconds`);
            return result;
        },

        debounce: this.debounce,
        throttle: this.throttle,

        lazy(fn) {
            let cached = false;
            let result;
            
            return function(...args) {
                if (!cached) {
                    result = fn.apply(this, args);
                    cached = true;
                }
                return result;
            };
        }
    };

    // Error handling
    static error = {
        log(error, context = '') {
            console.error(`Error ${context ? `in ${context}` : ''}:`, error);
            
            // Send to error tracking service in production
            if (process.env.NODE_ENV === 'production') {
                // Example: Sentry.captureException(error);
            }
        },

        handle(error, userMessage = 'Đã xảy ra lỗi không mong muốn') {
            this.log(error);
            UI.showToast(userMessage, 'error');
        },

        async wrap(asyncFn, errorMessage) {
            try {
                return await asyncFn();
            } catch (error) {
                this.handle(error, errorMessage);
                throw error;
            }
        }
    };
}

// Export for use in other files
window.Utils = Utils;