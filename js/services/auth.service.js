// Auth servisi
const authService = {
    // Mevcut oturum durumunu kontrol et
    getCurrentUser() {
        return new Promise((resolve, reject) => {
            if (!window.auth) {
                reject(new Error('Auth servisi henüz yüklenmedi'));
                return;
            }

            const unsubscribe = window.auth.onAuthStateChanged(user => {
                unsubscribe();
                resolve(user);
            }, reject);
        });
    },

    // Oturum açma
    async login(email, password) {
        try {
            if (!window.auth) {
                throw new Error('Auth servisi henüz yüklenmedi');
            }

            const result = await window.auth.signInWithEmailAndPassword(email, password);
            return result.user;
        } catch (error) {
            console.error('Oturum açma hatası:', error);
            throw this.handleAuthError(error);
        }
    },

    // Oturum kapatma
    async logout() {
        try {
            if (!window.auth) {
                throw new Error('Auth servisi henüz yüklenmedi');
            }

            await window.auth.signOut();
        } catch (error) {
            console.error('Oturum kapatma hatası:', error);
            throw error;
        }
    },

    // Kullanıcı kaydı
    async register(email, password) {
        try {
            if (!window.auth) {
                throw new Error('Auth servisi henüz yüklenmedi');
            }

            const result = await window.auth.createUserWithEmailAndPassword(email, password);
            return result.user;
        } catch (error) {
            console.error('Kullanıcı kayıt hatası:', error);
            throw this.handleAuthError(error);
        }
    },

    // Şifre sıfırlama e-postası gönder
    async sendPasswordResetEmail(email) {
        try {
            if (!window.auth) {
                throw new Error('Auth servisi henüz yüklenmedi');
            }

            await window.auth.sendPasswordResetEmail(email);
        } catch (error) {
            console.error('Şifre sıfırlama e-postası gönderme hatası:', error);
            throw this.handleAuthError(error);
        }
    },

    // Kullanıcı tipini kontrol et
    async checkUserType(userId) {
        try {
            if (!window.db) {
                throw new Error('Firestore servisi henüz yüklenmedi');
            }

            // Berber kontrolü
            const barberDoc = await window.db.collection('barbers').doc(userId).get();
            if (barberDoc.exists) return 'barber';

            // Müşteri kontrolü
            const customerDoc = await window.db.collection('customers').doc(userId).get();
            if (customerDoc.exists) return 'customer';

            // Admin kontrolü
            const user = window.auth.currentUser;
            if (user && user.email === 'admin@berberotomasyon.com') return 'admin';

            return null;
        } catch (error) {
            console.error('Kullanıcı tipi kontrolü hatası:', error);
            throw error;
        }
    },

    // Oturum durumu değişikliğini dinle
    onAuthStateChanged(callback) {
        if (!window.auth) {
            throw new Error('Auth servisi henüz yüklenmedi');
        }

        return window.auth.onAuthStateChanged(callback);
    },

    // Hata yönetimi
    handleAuthError(error) {
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
                return error;
        }
    }
};

// Firebase yüklendikten sonra servisi başlat
window.checkFirebaseLoaded().then(() => {
    window.authService = authService;
    console.log('Auth servisi başarıyla başlatıldı');
}).catch(error => {
    console.error('Auth servisi başlatılamadı:', error);
});

// Sayfa yüklendiğinde oturum durumunu kontrol et
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Firebase'in yüklendiğinden emin ol
        if (!window.firebase) {
            throw new Error('Firebase yüklenemedi');
        }

        // Oturum durumunu kontrol et
        const user = await authService.getCurrentUser();
        
        // Oturum açılmamışsa ve geçerli sayfa login.html değilse, login sayfasına yönlendir
        const currentPage = window.location.pathname.split('/').pop();
        if (!user && currentPage !== 'login.html') {
            window.location.href = '/login.html';
            return;
        }

        // Oturum açılmışsa ve login sayfasındaysa, ana sayfaya yönlendir
        if (user && currentPage === 'login.html') {
            const userType = await authService.checkUserType(user.uid);
            switch (userType) {
                case 'admin':
                    window.location.href = '/admin/dashboard.html';
                    break;
                case 'barber':
                    window.location.href = '/barber/dashboard.html';
                    break;
                case 'customer':
                    window.location.href = '/customer/dashboard.html';
                    break;
                default:
                    console.error('Bilinmeyen kullanıcı tipi');
                    break;
            }
        }
    } catch (error) {
        console.error('Oturum kontrolü hatası:', error);
    }
}); 