// Firebase yapılandırması - global olarak tanımla
if (!window.firebaseConfig) {
    window.firebaseConfig = {
        apiKey: "AIzaSyBj3CY-haDsXLFD74T3AIKS5uMtDNyyQD8",
        authDomain: "barberotomasyon.firebaseapp.com",
        projectId: "barberotomasyon",
        storageBucket: "barberotomasyon.appspot.com",
        messagingSenderId: "660719353365",
        appId: "1:660719353365:web:772e6c5b033cd106a0981c",
        measurementId: "G-FLNML0T2XN"
    };
}

// Firebase'i başlat
try {
    if (!window.app) {
        if (!firebase.apps.length) {
            window.app = firebase.initializeApp(window.firebaseConfig);
        } else {
            window.app = firebase.app();
        }

        // Global değişkenler
        window.auth = window.app.auth();
        window.db = window.app.firestore();
        
        // Türkçe dil desteği
        window.auth.languageCode = 'tr';
        
        // Firestore ayarları
        window.db.settings({
            merge: true,
            ignoreUndefinedProperties: true
        });

        console.log('Firebase servisleri başarıyla başlatıldı');

        // Admin kontrolü fonksiyonu - global olarak tanımla
        window.checkAdmin = async function(user) {
            if (!user) return false;
            return user.email === 'admin@berberotomasyon.com';
        }

        // Oturum kontrolü
        const currentPath = window.location.pathname;
        const isLoginPage = currentPath.includes('/login.html');

        if (!isLoginPage) {
            // Login sayfası dışındaki tüm sayfalarda oturum kontrolü yap
            window.auth.onAuthStateChanged(async (user) => {
                const isAdmin = await window.checkAdmin(user);
                if (!isAdmin) {
                    window.location.href = '../pages/login.html';
                }
            });
        }
    }
} catch (error) {
    console.error('Firebase başlatma hatası:', error);
} 