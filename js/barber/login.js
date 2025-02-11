// UI Elements
const loginForm = document.getElementById('loginForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const rememberCheckbox = document.getElementById('remember');
const togglePasswordBtn = document.querySelector('.toggle-password');
const toast = document.getElementById('toast');

// Auth state değişikliklerini dinlemeyi durdur
const unsubscribe = firebase.auth().onAuthStateChanged(() => {
    unsubscribe(); // Dinlemeyi hemen durdur
});

// Event Listeners
if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
}
if (togglePasswordBtn) {
    togglePasswordBtn.addEventListener('click', togglePasswordVisibility);
}

// Handle Login
async function handleLogin(e) {
    e.preventDefault();
    
    const email = emailInput.value;
    const password = passwordInput.value;
    const remember = rememberCheckbox.checked;
    
    try {
        showLoading('Giriş yapılıyor...');
        
        // Set persistence
        await firebase.auth().setPersistence(
            remember ? firebase.auth.Auth.Persistence.LOCAL : firebase.auth.Auth.Persistence.SESSION
        );
        
        console.log('Berber girişi deneniyor:', email);
        
        // Sign in
        const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        console.log('Firebase girişi başarılı, berber kontrolü yapılıyor...');
        
        // Berber kontrolü yap
        const barberDoc = await window.db.collection('barbers').doc(user.uid).get();
        
        if (!barberDoc.exists) {
            console.error('Berber dokümanı bulunamadı');
            await firebase.auth().signOut();
            hideLoading();
            showError('Bu hesap bir berber hesabı değil');
            return;
        }
        
        console.log('Berber doğrulaması başarılı, yönlendirme hazırlanıyor...');
        
        // Başarılı giriş
        hideLoading();
        showToast('Giriş başarılı! Yönlendiriliyorsunuz...', 'success');
        
        // 2 saniye bekle ve yönlendir
        await new Promise(resolve => setTimeout(resolve, 2000));
        console.log('Berber paneline yönlendiriliyor...');
        window.location.href = '/barber/dashboard.html';
        
    } catch (error) {
        hideLoading();
        console.error('Giriş hatası:', error);
        
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
        }
        
        showError(errorMessage);
    }
}

// Toggle Password Visibility
function togglePasswordVisibility() {
    const type = passwordInput.type === 'password' ? 'text' : 'password';
    passwordInput.type = type;
    
    const icon = togglePasswordBtn.querySelector('i');
    icon.className = `fas fa-${type === 'password' ? 'eye' : 'eye-slash'}`;
}

// Show Toast Message
function showToast(message, type = 'success') {
    if (!toast) return;
    
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Yükleniyor göstergesi
function showLoading(message) {
    const loading = document.getElementById('loading');
    if (loading) {
        loading.textContent = message;
        loading.style.display = 'flex';
    }
}

function hideLoading() {
    const loading = document.getElementById('loading');
    if (loading) {
        loading.style.display = 'none';
    }
}

// Hata mesajı göster
function showError(message) {
    const error = document.getElementById('error');
    if (error) {
        error.textContent = message;
        error.style.display = 'block';
        
        setTimeout(() => {
            error.style.display = 'none';
        }, 5000); // Hata mesajını 5 saniye göster
    }
} 