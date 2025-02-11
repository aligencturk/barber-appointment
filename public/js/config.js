// Uygulama yapılandırması
const config = {
    // API endpoint'leri
    api: {
        base: 'https://api.berberotomasyon.com',
        version: 'v1'
    },
    
    // Uygulama ayarları
    app: {
        name: 'Berber Randevu Sistemi',
        version: '1.0.0',
        environment: 'development',
        debug: true
    },
    
    // Varsayılan ayarlar
    defaults: {
        language: 'tr',
        currency: 'TRY',
        timezone: 'Europe/Istanbul',
        dateFormat: 'DD.MM.YYYY',
        timeFormat: 'HH:mm'
    },
    
    // Randevu ayarları
    appointment: {
        minDuration: 15, // dakika
        maxDuration: 180, // dakika
        interval: 15, // dakika
        maxPerDay: 20,
        startTime: '09:00',
        endTime: '21:00'
    }
};

// Global olarak kullanılabilir yap
window.config = config; 