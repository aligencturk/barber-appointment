// UI Elements
const loginForm = document.getElementById('loginForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const rememberCheckbox = document.getElementById('remember');
const togglePasswordBtn = document.querySelector('.toggle-password');
const toast = document.getElementById('toast');
const userSection = document.querySelector('.user-section');
const userName = document.getElementById('userName');
const authButtons = document.getElementById('authButtons');

// Firebase Auth referansı
const auth = window.auth;

// Toggle Password Visibility
function togglePasswordVisibility() {
    if (passwordInput && togglePasswordBtn) {
        const type = passwordInput.type === 'password' ? 'text' : 'password';
        passwordInput.type = type;
        
        const icon = togglePasswordBtn.querySelector('i');
        if (icon) {
            icon.className = `fas fa-${type === 'password' ? 'eye' : 'eye-slash'}`;
        }
    }
}

// Show Toast Message
function showToast(message, type = 'success') {
    if (toast) {
        toast.textContent = message;
        toast.className = `toast show ${type}`;
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
}

// Oturum durumunu kontrol et
auth.onAuthStateChanged(async (user) => {
    const guestButtons = document.getElementById('guestButtons');
    const customerMenu = document.getElementById('customerMenu');
    const userNameSpan = document.getElementById('userName');

    if (user) {
        // Kullanıcı oturum açmışsa
        const userType = sessionStorage.getItem('userType');
        const userName = sessionStorage.getItem('userName');

        if (userType === 'customer') {
            // Müşteri menüsünü göster
            if (guestButtons) guestButtons.style.display = 'none';
            if (customerMenu) customerMenu.style.display = 'block';
            if (userNameSpan) userNameSpan.textContent = userName || user.email;

            // Randevularım linki için event listener ekle
            const appointmentsLink = document.querySelector('a[href="/customer/appointments.html"]');
            if (appointmentsLink) {
                appointmentsLink.addEventListener('click', (e) => {
                    e.preventDefault();
                    window.location.href = '/customer/appointments.html';
                });
            }
        } else if (userType === 'barber') {
            // Berber dashboard'a yönlendir
            window.location.href = '/barber/dashboard.html';
        }
    } else {
        // Kullanıcı oturum açmamışsa
        if (guestButtons) guestButtons.style.display = 'block';
        if (customerMenu) customerMenu.style.display = 'none';
        if (userNameSpan) userNameSpan.textContent = '';
    }
});

// Çıkış yapma fonksiyonu
async function logout() {
    try {
        await auth.signOut();
        sessionStorage.clear();
        showToast('Başarıyla çıkış yapıldı', 'success');
        setTimeout(() => {
            window.location.href = '/index.html';
        }, 1000);
    } catch (error) {
        console.error('Çıkış hatası:', error);
        showToast('Çıkış yapılırken bir hata oluştu', 'error');
    }
}

// Global olarak tanımla
window.logout = logout;

// Login Handler
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorText = document.getElementById('errorText');
    
    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // Kullanıcı tipini kontrol et
        const customerDoc = await db.collection('customers').doc(user.uid).get();
        if (customerDoc.exists) {
            // Müşteri girişi başarılı, ana sayfaya yönlendir
            window.location.href = '/index.html';
        } else {
            // Müşteri değilse hata göster
            errorText.textContent = 'Bu giriş sadece müşteriler içindir.';
            errorText.style.display = 'block';
            await auth.signOut();
        }
    } catch (error) {
        console.error('Login error:', error);
        errorText.textContent = getErrorMessage(error.code);
        errorText.style.display = 'block';
    }
}

// Error Messages
function getErrorMessage(errorCode) {
    switch (errorCode) {
        case 'auth/invalid-email':
            return 'Geçersiz e-posta adresi';
        case 'auth/user-disabled':
            return 'Bu hesap devre dışı bırakılmış';
        case 'auth/user-not-found':
            return 'Kullanıcı bulunamadı';
        case 'auth/wrong-password':
            return 'Hatalı şifre';
        default:
            return 'Giriş yapılırken bir hata oluştu';
    }
}

// Event Listeners
if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
}

if (togglePasswordBtn) {
    togglePasswordBtn.addEventListener('click', togglePasswordVisibility);
}

// Form step navigation
function showStep(stepNumber) {
    // Hide all steps
    document.querySelectorAll('.form-step').forEach(step => {
        step.classList.remove('active');
    });
    
    // Show requested step
    document.querySelector(`.form-step[data-step="${stepNumber}"]`).classList.add('active');
    
    // Update step indicators
    document.querySelectorAll('.step').forEach(indicator => {
        indicator.classList.remove('active');
    });
    document.querySelector(`.step[data-step="${stepNumber}"]`).classList.add('active');
}

function nextStep(currentStep) {
    showStep(currentStep + 1);
}

function prevStep(currentStep) {
    showStep(currentStep - 1);
}

// Show error message
function showError(input, message) {
    const formGroup = input.closest('.form-group');
    if (!formGroup) return;
    
    let errorDiv = formGroup.querySelector('.error-message');
    
    if (!errorDiv) {
        errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        formGroup.appendChild(errorDiv);
    }
    
    errorDiv.textContent = message;
    formGroup.classList.add('error');
}

// Reset errors
function resetErrors() {
    document.querySelectorAll('.error-message').forEach(error => error.remove());
    document.querySelectorAll('.form-group.error').forEach(group => group.classList.remove('error'));
}

// Password visibility toggle
function togglePasswordVisibility() {
    const passwordInput = document.getElementById('password');
    const icon = document.querySelector('.toggle-password i');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        passwordInput.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

function toggleConfirmPasswordVisibility() {
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const icon = document.querySelector('.toggle-password:last-of-type i');
    
    if (confirmPasswordInput.type === 'password') {
        confirmPasswordInput.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        confirmPasswordInput.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

// Toast message
function showToast(message, type = 'info') {
    const toast = document.getElementById('toastMessage');
    toast.textContent = message;
    toast.className = `toast-message ${type}`;
    toast.style.display = 'block';
    
    setTimeout(() => {
        toast.style.display = 'none';
    }, 3000);
}

// Format phone number as user types
const phoneInputs = document.querySelectorAll('input[type="tel"]');
phoneInputs.forEach(input => {
    input.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 0) {
            if (value.length <= 3) {
                value = value;
            } else if (value.length <= 6) {
                value = value.slice(0, 3) + ' ' + value.slice(3);
            } else if (value.length <= 8) {
                value = value.slice(0, 3) + ' ' + value.slice(3, 6) + ' ' + value.slice(6);
            } else {
                value = value.slice(0, 3) + ' ' + value.slice(3, 6) + ' ' + value.slice(6, 8) + ' ' + value.slice(8, 10);
            }
        }
        e.target.value = value;
    });
});

// ... existing code ... 