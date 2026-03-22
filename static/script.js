/* ═══════════════════════════════════════════════════════════════════
   Registration System — Client-Side Validation & Interactions
   ═══════════════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {
    initRegisterForm();
    initOTPForm();
    initConfetti();
    autoHideAlerts();
});


/* ── Registration Form ─────────────────────────────────────────── */
function initRegisterForm() {
    const form = document.getElementById('register-form');
    if (!form) return;

    const nameInput = document.getElementById('name');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const toggleBtn = document.getElementById('toggle-password');
    const strengthContainer = document.getElementById('password-strength');
    const strengthFill = document.getElementById('strength-fill');
    const strengthLabel = document.getElementById('strength-label');

    // ── Toggle password visibility
    if (toggleBtn && passwordInput) {
        toggleBtn.addEventListener('click', () => {
            const isPassword = passwordInput.type === 'password';
            passwordInput.type = isPassword ? 'text' : 'password';
            toggleBtn.innerHTML = isPassword
                ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                   </svg>`
                : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                   </svg>`;
        });
    }

    // ── Password strength meter
    if (passwordInput && strengthContainer) {
        passwordInput.addEventListener('input', () => {
            const val = passwordInput.value;
            if (val.length === 0) {
                strengthContainer.classList.remove('visible');
                return;
            }
            strengthContainer.classList.add('visible');

            let score = 0;
            if (val.length >= 6) score++;
            if (val.length >= 10) score++;
            if (/[A-Z]/.test(val)) score++;
            if (/[0-9]/.test(val)) score++;
            if (/[^A-Za-z0-9]/.test(val)) score++;

            const levels = [
                { label: 'Weak', color: '#ef4444', width: '20%' },
                { label: 'Weak', color: '#ef4444', width: '30%' },
                { label: 'Fair', color: '#f59e0b', width: '50%' },
                { label: 'Good', color: '#06b6d4', width: '70%' },
                { label: 'Strong', color: '#22c55e', width: '85%' },
                { label: 'Excellent', color: '#22c55e', width: '100%' },
            ];

            const level = levels[score];
            strengthFill.style.width = level.width;
            strengthFill.style.background = level.color;
            strengthLabel.textContent = level.label;
            strengthLabel.style.color = level.color;
        });
    }

    // ── Real-time field validation (clear errors on input)
    [nameInput, emailInput, passwordInput].forEach(input => {
        if (!input) return;
        input.addEventListener('input', () => {
            clearError(input.id);
        });
    });

    // ── Form submission validation
    form.addEventListener('submit', (e) => {
        let isValid = true;

        // Clear previous errors
        clearAllErrors();

        // Name validation
        if (!nameInput.value.trim()) {
            showError('name', 'Please enter your full name');
            isValid = false;
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailInput.value.trim()) {
            showError('email', 'Please enter your email address');
            isValid = false;
        } else if (!emailRegex.test(emailInput.value.trim())) {
            showError('email', 'Please enter a valid email address');
            isValid = false;
        }

        // Password validation
        if (!passwordInput.value.trim()) {
            showError('password', 'Please enter a password');
            isValid = false;
        } else if (passwordInput.value.length < 6) {
            showError('password', 'Password must be at least 6 characters');
            isValid = false;
        }

        if (!isValid) {
            e.preventDefault();
            // Shake the card
            const card = document.getElementById('register-card');
            card.style.animation = 'none';
            card.offsetHeight; // trigger reflow
            card.style.animation = 'shake 0.5s ease';
            return;
        }

        // Show loading state
        const btn = document.getElementById('register-btn');
        btn.classList.add('loading');
        btn.disabled = true;
    });
}


/* ── OTP Form ─────────────────────────────────────────────────── */
function initOTPForm() {
    const form = document.getElementById('otp-form');
    if (!form) return;

    const boxes = document.querySelectorAll('.otp-box');
    const hiddenInput = document.getElementById('otp-hidden');

    boxes.forEach((box, index) => {
        // Auto-advance on input
        box.addEventListener('input', (e) => {
            const value = e.target.value;

            // Only allow digits
            e.target.value = value.replace(/\D/g, '').slice(0, 1);

            if (e.target.value && index < boxes.length - 1) {
                boxes[index + 1].focus();
            }

            // Mark as filled
            box.classList.toggle('filled', !!e.target.value);

            // Update hidden input
            updateHiddenOTP(boxes, hiddenInput);

            // Clear error
            clearError('otp');
        });

        // Handle backspace
        box.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !box.value && index > 0) {
                boxes[index - 1].focus();
                boxes[index - 1].value = '';
                boxes[index - 1].classList.remove('filled');
                updateHiddenOTP(boxes, hiddenInput);
            }

            // Allow paste
            if (e.key === 'v' && (e.ctrlKey || e.metaKey)) {
                return; // Let paste event handle it
            }

            // Arrow key navigation
            if (e.key === 'ArrowLeft' && index > 0) {
                e.preventDefault();
                boxes[index - 1].focus();
            }
            if (e.key === 'ArrowRight' && index < boxes.length - 1) {
                e.preventDefault();
                boxes[index + 1].focus();
            }
        });

        // Handle paste
        box.addEventListener('paste', (e) => {
            e.preventDefault();
            const pasted = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '').slice(0, 6);
            pasted.split('').forEach((char, i) => {
                if (boxes[i]) {
                    boxes[i].value = char;
                    boxes[i].classList.add('filled');
                }
            });
            // Focus last filled or next empty
            const focusIndex = Math.min(pasted.length, boxes.length - 1);
            boxes[focusIndex].focus();
            updateHiddenOTP(boxes, hiddenInput);
        });

        // Select text on focus
        box.addEventListener('focus', () => {
            box.select();
        });
    });

    // Form validation
    form.addEventListener('submit', (e) => {
        updateHiddenOTP(boxes, hiddenInput);

        const otp = hiddenInput.value;
        if (otp.length !== 6) {
            e.preventDefault();
            showError('otp', 'Please enter the complete 6-digit code');

            // Shake animation
            const card = document.getElementById('verify-card');
            card.style.animation = 'none';
            card.offsetHeight;
            card.style.animation = 'shake 0.5s ease';
            return;
        }

        // Show loading
        const btn = document.getElementById('verify-btn');
        btn.classList.add('loading');
        btn.disabled = true;
    });
}

function updateHiddenOTP(boxes, hiddenInput) {
    if (!hiddenInput) return;
    hiddenInput.value = Array.from(boxes).map(b => b.value).join('');
}


/* ── Confetti (Success Page) ──────────────────────────────────── */
function initConfetti() {
    const container = document.getElementById('confetti-container');
    if (!container) return;

    const colors = ['#7c3aed', '#a78bfa', '#22c55e', '#06b6d4', '#ec4899', '#f59e0b', '#c4b5fd', '#34d399'];

    for (let i = 0; i < 50; i++) {
        const piece = document.createElement('div');
        piece.classList.add('confetti-piece');
        piece.style.left = `${Math.random() * 100}%`;
        piece.style.background = colors[Math.floor(Math.random() * colors.length)];
        piece.style.width = `${Math.random() * 8 + 5}px`;
        piece.style.height = `${Math.random() * 8 + 5}px`;
        piece.style.animationDuration = `${Math.random() * 2 + 2}s`;
        piece.style.animationDelay = `${Math.random() * 2}s`;
        piece.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
        container.appendChild(piece);
    }

    // Remove confetti after animation
    setTimeout(() => {
        container.innerHTML = '';
    }, 5000);
}


/* ── Utility Functions ────────────────────────────────────────── */

function showError(fieldId, message) {
    const errorEl = document.getElementById(`${fieldId}-error`);
    if (errorEl) {
        errorEl.textContent = message;
        errorEl.style.opacity = '1';
    }

    const input = document.getElementById(fieldId);
    if (input) {
        input.style.borderColor = 'var(--error)';
    }
}

function clearError(fieldId) {
    const errorEl = document.getElementById(`${fieldId}-error`);
    if (errorEl) {
        errorEl.textContent = '';
        errorEl.style.opacity = '0';
    }

    const input = document.getElementById(fieldId);
    if (input) {
        input.style.borderColor = '';
    }
}

function clearAllErrors() {
    document.querySelectorAll('.error-text').forEach(el => {
        el.textContent = '';
        el.style.opacity = '0';
    });
    document.querySelectorAll('input').forEach(input => {
        input.style.borderColor = '';
    });
}

function autoHideAlerts() {
    const alerts = document.querySelectorAll('.alert');
    alerts.forEach(alert => {
        setTimeout(() => {
            alert.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            alert.style.opacity = '0';
            alert.style.transform = 'translateY(-8px)';
            setTimeout(() => alert.remove(), 500);
        }, 5000);
    });
}


/* ── Shake Animation (injected via JS) ────────────────────────── */
const shakeStyle = document.createElement('style');
shakeStyle.textContent = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
        20%, 40%, 60%, 80% { transform: translateX(4px); }
    }
`;
document.head.appendChild(shakeStyle);
