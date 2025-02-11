class AuthService {
    constructor() {
        this.auth = firebase.auth();
        this.db = firebase.firestore();
    }

    // Admin hesabı oluştur veya kontrol et
    async createInitialAdmin() {
        try {
            // Önce mevcut kullanıcı var mı kontrol et
            const adminEmail = 'admin@berberotomasyon.com';
            const methods = await this.auth.fetchSignInMethodsForEmail(adminEmail);
            
            if (methods.length > 0) {
                console.log('Admin hesabı zaten mevcut');
                return true;
            }

            // Eğer hesap yoksa, sadece log kaydı düş
            console.log('Admin hesabı henüz oluşturulmamış');
            return false;

        } catch (error) {
            console.error('Admin hesabı kontrolünde hata:', error);
            return false;
        }
    }

    // Admin girişi
    async login(email, password, rememberMe = false) {
        try {
            // Persistence ayarı
            await this.auth.setPersistence(
                rememberMe 
                    ? firebase.auth.Auth.Persistence.LOCAL 
                    : firebase.auth.Auth.Persistence.SESSION
            );

            // Giriş yap
            const userCredential = await this.auth.signInWithEmailAndPassword(email, password);
            const user = userCredential.user;

            // Admin kontrolü - email kontrolü yeterli
            if (user.email !== 'admin@berberotomasyon.com') {
                await this.auth.signOut();
                throw new Error('Bu hesap admin hesabı değil');
            }

            return {
                uid: user.uid,
                email: user.email,
                role: 'admin'
            };

        } catch (error) {
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
            
            throw new Error(errorMessage);
        }
    }

    // Oturum kontrolü
    async getCurrentAdmin() {
        try {
            const user = this.auth.currentUser;
            if (!user) return null;

            // Email kontrolü yeterli
            if (user.email === 'admin@berberotomasyon.com') {
                return {
                    uid: user.uid,
                    email: user.email,
                    role: 'admin'
                };
            }

            return null;
        } catch (error) {
            console.error('Admin kontrolü hatası:', error);
            return null;
        }
    }

    // Çıkış yap
    async logout() {
        try {
            await this.auth.signOut();
            return true;
        } catch (error) {
            console.error('Çıkış hatası:', error);
            throw new Error('Çıkış yapılırken bir hata oluştu');
        }
    }

    // Admin şifresini güncelle
    async updatePassword(currentPassword, newPassword) {
        try {
            const user = this.auth.currentUser;
            if (!user) throw new Error('Oturum açık değil');

            // Mevcut şifreyi doğrula
            const credential = firebase.auth.EmailAuthProvider.credential(
                user.email,
                currentPassword
            );
            await user.reauthenticateWithCredential(credential);

            // Şifreyi güncelle
            await user.updatePassword(newPassword);
            return true;
        } catch (error) {
            console.error('Şifre güncelleme hatası:', error);
            let errorMessage = 'Şifre güncellenirken bir hata oluştu';

            if (error.code === 'auth/wrong-password') {
                errorMessage = 'Mevcut şifre hatalı';
            }

            throw new Error(errorMessage);
        }
    }
}

// Service'i global olarak kullanılabilir yap
window.authService = new AuthService(); 