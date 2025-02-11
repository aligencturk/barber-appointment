// Form elemanlarını global olarak tanımla
let loginForm, emailInput, passwordInput, rememberCheckbox, submitButton, togglePasswordBtn;

// Sayfa yüklendiğinde form elemanlarını başlat
window.onload = function() {
    // Form elemanlarını al
    loginForm = document.getElementById('loginForm');
    emailInput = document.getElementById('email');
    passwordInput = document.getElementById('password');
    rememberCheckbox = document.getElementById('remember');
    submitButton = document.getElementById('submitButton');
    togglePasswordBtn = document.getElementById('togglePassword');

    // Event Listeners
    if (loginForm) {
        loginForm.addEventListener('submit', handleCustomerLogin);
    }

    if (togglePasswordBtn) {
        togglePasswordBtn.addEventListener('click', togglePasswordVisibility);
    }

    // Auth state değişikliklerini dinlemeyi durdur
    const unsubscribe = firebase.auth().onAuthStateChanged(() => {
        unsubscribe(); // Dinlemeyi hemen durdur
    });
};

// Toggle Password Visibility
function togglePasswordVisibility() {
    const type = passwordInput.type === 'password' ? 'text' : 'password';
    passwordInput.type = type;
    
    const icon = togglePasswordBtn.querySelector('i');
    icon.className = `fas fa-${type === 'password' ? 'eye' : 'eye-slash'}`;
}

// Handle Login
async function handleCustomerLogin(event) {
    event.preventDefault();
    
    // Form elemanlarını kontrol et
    if (!emailInput || !passwordInput || !rememberCheckbox) {
        showError('Form elemanları bulunamadı');
        return;
    }
    
    const email = emailInput.value;
    const password = passwordInput.value;
    const remember = rememberCheckbox.checked;
    
    try {
        showLoading('Giriş yapılıyor...');
        
        if (submitButton) {
            submitButton.disabled = true;
        }

        console.log('Giriş denemesi başladı:', email);
        
        // Set persistence
        await firebase.auth().setPersistence(
            remember ? firebase.auth.Auth.Persistence.LOCAL : firebase.auth.Auth.Persistence.SESSION
        );
        
        // Sign in
        const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        console.log('Firebase girişi başarılı, müşteri kontrolü yapılıyor...');
        
        // Müşteri kontrolü yap
        const customerDoc = await window.db.collection('customers').doc(user.uid).get();
        
        if (!customerDoc.exists) {
            console.error('Müşteri dokümanı bulunamadı');
            await firebase.auth().signOut();
            hideLoading();
            showError('Bu hesap bir müşteri hesabı değil');
            if (submitButton) {
                submitButton.disabled = false;
            }
            return;
        }
        
        console.log('Müşteri doğrulaması başarılı, yönlendirme hazırlanıyor...');
        
        // Başarılı giriş
        hideLoading();
        showToast('Giriş başarılı! Yönlendiriliyorsunuz...', 'success');
        
        // 2 saniye bekle ve yönlendir
        await new Promise(resolve => setTimeout(resolve, 2000));
        console.log('Müşteri paneline yönlendiriliyor...');
        window.location.href = '/customer/dashboard.html';
        
    } catch (error) {
        console.error('Giriş hatası:', error);
        hideLoading();
        
        let errorMessage = 'Giriş yapılırken bir hata oluştu';
        
        switch (error.code) {
            case 'auth/invalid-email':
                errorMessage = 'Geçersiz e-posta adresi';
                break;
            case 'auth/user-disabled':
                errorMessage = 'Bu hesap devre dışı bırakılmış';
                break;
            case 'auth/user-not-found':
                errorMessage = 'Bu e-posta adresi ile kayıtlı hesap bulunamadı';
                break;
            case 'auth/wrong-password':
                errorMessage = 'Hatalı şifre';
                break;
            default:
                errorMessage = `Giriş hatası: ${error.message}`;
                break;
        }
        
        showError(errorMessage);
        if (submitButton) {
            submitButton.disabled = false;
        }
    }
}

// Show Toast Message
function showToast(message, type = 'success') {
    console.log('Toast mesajı:', message, type);
    const toast = document.getElementById('toast');
    if (toast) {
        toast.textContent = message;
        toast.className = `toast show ${type}`;
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
}

// Yükleniyor göstergesi
function showLoading(message) {
    console.log('Loading:', message);
    const loading = document.getElementById('loading');
    if (loading) {
        loading.textContent = message;
        loading.style.display = 'flex';
    }
}

function hideLoading() {
    console.log('Loading gizlendi');
    const loading = document.getElementById('loading');
    if (loading) {
        loading.style.display = 'none';
    }
}

// Hata mesajı göster
function showError(message) {
    console.error('Hata mesajı:', message);
    const error = document.getElementById('error');
    if (error) {
        error.textContent = message;
        error.style.display = 'block';
        
        setTimeout(() => {
            error.style.display = 'none';
        }, 5000); // Hata mesajını 5 saniye göster
    }
} 