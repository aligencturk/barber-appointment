// Auth servisi
const authService = {
    // Giriş yap
    async login(email, password) {
        try {
            const userCredential = await window.auth.signInWithEmailAndPassword(email, password);
            return userCredential.user;
        } catch (error) {
            throw this.handleAuthError(error);
        }
    },

    // Çıkış yap
    async logout() {
        try {
            await window.auth.signOut();
        } catch (error) {
            throw this.handleAuthError(error);
        }
    },

    // Mevcut kullanıcıyı getir
    getCurrentUser() {
        return window.auth.currentUser;
    },

    // Auth durumunu dinle
    onAuthStateChanged(callback) {
        return window.auth.onAuthStateChanged(callback);
    },

    // Hata yönetimi
    handleAuthError(error) {
        console.error('Auth error:', error);
        
        switch (error.code) {
            case 'auth/user-not-found':
                return new Error('Kullanıcı bulunamadı');
            case 'auth/wrong-password':
                return new Error('Hatalı şifre');
            case 'auth/invalid-email':
                return new Error('Geçersiz e-posta adresi');
            case 'auth/user-disabled':
                return new Error('Hesabınız devre dışı bırakılmış');
            case 'auth/email-already-in-use':
                return new Error('Bu e-posta adresi zaten kullanımda');
            case 'auth/operation-not-allowed':
                return new Error('Bu işlem şu anda kullanılamıyor');
            case 'auth/weak-password':
                return new Error('Şifre çok zayıf');
            default:
                return new Error('Bir hata oluştu');
        }
    }
};

// Global olarak tanımla
window.authService = authService; 