// Firebase yapılandırması
const firebaseConfig = {
    apiKey: "AIzaSyBj3CY-haDsXLFD74T3AIKS5uMtDNyyQD8",
    authDomain: "barberotomasyon.firebaseapp.com",
    projectId: "barberotomasyon",
    storageBucket: "barberotomasyon.firebasestorage.app",
    messagingSenderId: "660719353365",
    appId: "1:660719353365:web:772e6c5b033cd106a0981c",
    measurementId: "G-FLNML0T2XN"
};

// Firebase'i başlat
let app;

try {
    // Firebase App başlatma
    if (firebase.apps.length) {
        app = firebase.app();
    } else {
        app = firebase.initializeApp(firebaseConfig);
    }

    // Firebase servislerini başlat ve global olarak tanımla
    window.auth = app.auth();
    
    // Firestore başlatma ve ayarları
    window.db = app.firestore();
    window.db.settings({
        merge: true,
        ignoreUndefinedProperties: true,
        experimentalForceLongPolling: true,
        experimentalAutoDetectLongPolling: false,
        cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED
    });
    
    // Storage servisini kontrol et ve başlat
    if (firebase.storage) {
        window.storage = app.storage();
    }

    // Global app tanımla
    window.app = app;

    // Auth dil ayarı
    window.auth.languageCode = 'tr';

    console.log('Firebase başarıyla başlatıldı', {
        app: !!window.app,
        auth: !!window.auth,
        db: !!window.db,
        storage: !!window.storage,
        projectId: firebaseConfig.projectId
    });
} catch (error) {
    console.error('Firebase başlatma hatası:', error);
    console.error('Hata detayları:', {
        code: error.code,
        message: error.message,
        stack: error.stack
    });
}

// Firebase yüklendiğini kontrol et
function checkFirebaseLoaded() {
    return new Promise((resolve, reject) => {
        let attempts = 0;
        const maxAttempts = 10;
        const interval = 1000;

        const check = () => {
            attempts++;
            const services = {
                firebase: !!window.firebase,
                app: !!window.app,
                auth: !!window.auth,
                db: !!window.db,
                storage: !!window.storage
            };

            if (services.firebase && services.app && services.auth && services.db) {
                console.log('Firebase servisleri hazır');
                resolve(true);
            } else if (attempts < maxAttempts) {
                console.log(`Firebase servisleri bekleniyor... (${attempts}/${maxAttempts})`);
                setTimeout(check, interval);
            } else {
                console.error('Firebase servisleri yüklenemedi:', services);
                reject(new Error('Firebase servisleri yüklenemedi'));
            }
        };

        check();
    });
}

// Global olarak tanımla
window.checkFirebaseLoaded = checkFirebaseLoaded;