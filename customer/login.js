window.onload = function() {
    const loginForm = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const submitButton = document.getElementById('submitButton');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            submitButton.disabled = true;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Giriş yapılıyor...';
            
            const email = emailInput.value;
            const password = passwordInput.value;
            
            await auth.signInWithEmailAndPassword(email, password);
            
            // Kullanıcı bilgilerini al
            const user = auth.currentUser;
            const userDoc = await db.collection('customers').doc(user.uid).get();
            const userData = userDoc.data();
            
            // Session storage'a kullanıcı bilgilerini kaydet
            sessionStorage.setItem('userName', userData.fullName);
            sessionStorage.setItem('userType', 'customer');
            
            showToast('Giriş başarılı!', 'success');
            
            setTimeout(() => {
                window.location.href = '/index.html';
            }, 1000);
        } catch (error) {
            console.error('Giriş hatası:', error);
            showToast('Giriş yapılamadı: ' + error.message, 'error');
            submitButton.disabled = false;
            submitButton.innerHTML = 'Giriş Yap';
        }
    });
} 