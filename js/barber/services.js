// Firebase Imports
const auth = window.auth;
const db = window.db;

// Form Elements
const serviceForm = document.getElementById('serviceForm');
const servicesList = document.getElementById('servicesList');

// Service Form Fields
const nameInput = document.getElementById('serviceName');
const descriptionInput = document.getElementById('serviceDescription');
const priceInput = document.getElementById('servicePrice');
const durationInput = document.getElementById('serviceDuration');
const categoryInput = document.getElementById('serviceCategory');
const isActiveInput = document.getElementById('serviceIsActive');

// State
let editingServiceId = null;

// Form Validasyon Kuralları
const validationRules = {
    name: {
        required: true,
        minLength: 3,
        maxLength: 50,
        pattern: /^[a-zA-ZğüşıöçĞÜŞİÖÇ\s-]+$/,
        messages: {
            required: 'Hizmet adı zorunludur',
            minLength: 'Hizmet adı en az 3 karakter olmalıdır',
            maxLength: 'Hizmet adı en fazla 50 karakter olabilir',
            pattern: 'Hizmet adı sadece harf ve boşluk içerebilir'
        }
    },
    description: {
        required: true,
        minLength: 10,
        maxLength: 500,
        messages: {
            required: 'Hizmet açıklaması zorunludur',
            minLength: 'Hizmet açıklaması en az 10 karakter olmalıdır',
            maxLength: 'Hizmet açıklaması en fazla 500 karakter olabilir'
        }
    },
    price: {
        required: true,
        min: 1,
        max: 99999,
        pattern: /^\d+$/,
        messages: {
            required: 'Hizmet ücreti zorunludur',
            min: 'Hizmet ücreti en az 1 TL olmalıdır',
            max: 'Hizmet ücreti en fazla 99.999 TL olabilir',
            pattern: 'Hizmet ücreti sadece sayı olabilir'
        }
    },
    duration: {
        required: true,
        min: 5,
        max: 480,
        pattern: /^\d+$/,
        messages: {
            required: 'Hizmet süresi zorunludur',
            min: 'Hizmet süresi en az 5 dakika olmalıdır',
            max: 'Hizmet süresi en fazla 480 dakika (8 saat) olabilir',
            pattern: 'Hizmet süresi sadece sayı olabilir'
        }
    }
};

// Form Validasyon Fonksiyonları
function validateField(field, value) {
    const rules = validationRules[field];
    if (!rules) return { isValid: true };

    // Boş değer kontrolü
    if (rules.required && !value.trim()) {
        return {
            isValid: false,
            message: rules.messages.required
        };
    }

    // Minimum uzunluk kontrolü
    if (rules.minLength && value.trim().length < rules.minLength) {
        return {
            isValid: false,
            message: rules.messages.minLength
        };
    }

    // Maksimum uzunluk kontrolü
    if (rules.maxLength && value.trim().length > rules.maxLength) {
        return {
            isValid: false,
            message: rules.messages.maxLength
        };
    }

    // Pattern kontrolü
    if (rules.pattern && !rules.pattern.test(value)) {
        return {
            isValid: false,
            message: rules.messages.pattern
        };
    }

    // Minimum değer kontrolü
    if (rules.min && Number(value) < rules.min) {
        return {
            isValid: false,
            message: rules.messages.min
        };
    }

    // Maksimum değer kontrolü
    if (rules.max && Number(value) > rules.max) {
        return {
            isValid: false,
            message: rules.messages.max
        };
    }

    return { isValid: true };
}

function showError(input, message) {
    const formGroup = input.closest('.form-group');
    let errorDiv = formGroup.querySelector('.error-message');
    
    if (!errorDiv) {
        errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        formGroup.appendChild(errorDiv);
    }
    
    errorDiv.textContent = message;
    formGroup.classList.add('error');
}

function resetErrors() {
    document.querySelectorAll('.error-message').forEach(error => error.remove());
    document.querySelectorAll('.form-group.error').forEach(group => group.classList.remove('error'));
}

// Performans optimizasyonu için debounce fonksiyonu
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Performans optimizasyonu için throttle fonksiyonu
function throttle(func, limit) {
    let inThrottle;
    return function executedFunction(...args) {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// DOM elementlerini önbelleğe alma
const DOM = {
    form: document.getElementById('serviceForm'),
    list: document.getElementById('servicesList'),
    inputs: {
        name: document.getElementById('serviceName'),
        description: document.getElementById('serviceDescription'),
        price: document.getElementById('servicePrice'),
        duration: document.getElementById('serviceDuration'),
        category: document.getElementById('serviceCategory'),
        isActive: document.getElementById('serviceIsActive')
    },
    submitButton: document.querySelector('#serviceForm button[type="submit"]')
};

// State yönetimi
const state = {
    editingServiceId: null,
    services: new Map(),
    loading: false,
    initialized: false
};

// Servis verilerini önbelleğe alma
function cacheServiceData(doc) {
    const service = doc.data();
    state.services.set(doc.id, {
        id: doc.id,
        ...service
    });
}

// Servis HTML oluşturma (performans için ayrı fonksiyon)
function createServiceHTML(service) {
    return `
        <div class="service-header">
            <h3>${service.name}</h3>
            <div class="service-actions">
                <button type="button" class="btn-icon edit-btn" data-id="${service.id}">
                    <i class="fas fa-edit"></i>
                </button>
                <button type="button" class="btn-icon delete-btn" data-id="${service.id}">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
        <p class="service-description">${service.description || ''}</p>
        <div class="service-details">
            <span class="price">₺${service.price}</span>
            <span class="duration">${service.duration} dk</span>
            <span class="category">${service.category}</span>
            <span class="status ${service.isActive ? 'active' : 'inactive'}">
                ${service.isActive ? 'Aktif' : 'Pasif'}
            </span>
        </div>
    `;
}

// Servisleri yükleme optimizasyonu
const loadServices = async () => {
    if (state.loading) return;
    state.loading = true;

    try {
        const user = auth.currentUser;
        if (!user) {
            window.location.href = '/barber/login.html';
            return;
        }

        DOM.list.innerHTML = '<div class="loading">Hizmetler yükleniyor...</div>';

        const servicesSnapshot = await db.collection('services')
            .where('barberId', '==', user.uid)
            .orderBy('name')
            .get();

        if (servicesSnapshot.empty) {
            DOM.list.innerHTML = '<div class="empty-state">Henüz hizmet eklenmemiş</div>';
            return;
        }

        // Önbelleği temizle ve yeni verileri ekle
        state.services.clear();
        const fragment = document.createDocumentFragment();

        servicesSnapshot.forEach(doc => {
            cacheServiceData(doc);
            const service = state.services.get(doc.id);
            
            const serviceCard = document.createElement('div');
            serviceCard.className = `service-card ${service.isActive ? 'active' : 'inactive'}`;
            serviceCard.dataset.id = service.id;
            serviceCard.innerHTML = createServiceHTML(service);
            
            fragment.appendChild(serviceCard);
        });

        DOM.list.innerHTML = '';
        DOM.list.appendChild(fragment);
    } catch (error) {
        console.error('Hizmetler yüklenirken hata:', error);
        DOM.list.innerHTML = '<div class="error-state">Hizmetler yüklenirken bir hata oluştu</div>';
        showToast('Hizmetler yüklenirken bir hata oluştu', 'error');
    } finally {
        state.loading = false;
    }
};

// Form işlemleri optimizasyonu
const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (state.loading) return;
    
    resetErrors();
    state.loading = true;

    try {
        const user = auth.currentUser;
        if (!user) {
            showToast('Lütfen giriş yapın', 'error');
            return;
        }

        // Form validasyonu
        if (!validateForm()) return;

        // Form verilerini hazırla
        const serviceData = {
            barberId: user.uid,
            name: DOM.inputs.name.value.trim(),
            description: DOM.inputs.description.value.trim(),
            price: Number(DOM.inputs.price.value),
            duration: Number(DOM.inputs.duration.value),
            category: DOM.inputs.category.value,
            isActive: DOM.inputs.isActive.checked,
            updatedAt: new Date()
        };

        // Loading state
        const originalButtonText = DOM.submitButton.innerHTML;
        DOM.submitButton.disabled = true;
        DOM.submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Kaydediliyor...';

        try {
            if (state.editingServiceId) {
                await db.collection('services').doc(state.editingServiceId).update(serviceData);
                showToast('Hizmet başarıyla güncellendi', 'success');
            } else {
                serviceData.createdAt = new Date();
                const docRef = await db.collection('services').add(serviceData);
                cacheServiceData({ id: docRef.id, data: () => serviceData });
                showToast('Hizmet başarıyla eklendi', 'success');
            }

            DOM.form.reset();
            state.editingServiceId = null;
            await loadServices();
        } finally {
            DOM.submitButton.disabled = false;
            DOM.submitButton.innerHTML = originalButtonText;
        }
    } catch (error) {
        console.error('Hizmet kaydedilirken hata:', error);
        showToast('Hizmet kaydedilirken bir hata oluştu', 'error');
    } finally {
        state.loading = false;
    }
};

// Validasyon optimizasyonu
function validateForm() {
    let isValid = true;
    const fields = ['name', 'description', 'price', 'duration'];
    
    for (const field of fields) {
        const input = DOM.inputs[field];
        const validation = validateField(field, input.value);
        
        if (!validation.isValid) {
            showError(input, validation.message);
            isValid = false;
        }
    }

    return isValid;
}

// Event delegation için click handler
function handleServiceClick(e) {
    const target = e.target.closest('button');
    if (!target) return;

    const serviceId = target.dataset.id;
    if (!serviceId) return;

    if (target.classList.contains('edit-btn')) {
        editService(serviceId);
    } else if (target.classList.contains('delete-btn')) {
        deleteService(serviceId);
    }
}

// Event Listeners optimizasyonu
DOM.form.addEventListener('submit', handleFormSubmit);
DOM.list.addEventListener('click', handleServiceClick);

// Input validasyonları için debounced event listeners
['name', 'description', 'price', 'duration'].forEach(field => {
    const input = DOM.inputs[field];
    if (input) {
        const debouncedValidation = debounce(() => {
            const validation = validateField(field, input.value);
            const formGroup = input.closest('.form-group');
            const errorDiv = formGroup.querySelector('.error-message');
            
            if (errorDiv) {
                if (!validation.isValid) {
                    errorDiv.textContent = validation.message;
                } else {
                    errorDiv.remove();
                    formGroup.classList.remove('error');
                }
            } else if (!validation.isValid) {
                showError(input, validation.message);
            }
        }, 300);

        input.addEventListener('input', debouncedValidation);
    }
});

// Sayısal input kontrolü için throttled event listeners
['price', 'duration'].forEach(field => {
    const input = DOM.inputs[field];
    if (input) {
        const throttledNumberCheck = throttle((e) => {
            e.target.value = e.target.value.replace(/[^0-9]/g, '');
        }, 100);

        input.addEventListener('input', throttledNumberCheck);
    }
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    if (state.initialized) return;
    
    auth.onAuthStateChanged(user => {
        if (user) {
            loadServices();
            state.initialized = true;
        } else {
            window.location.href = '/barber/login.html';
        }
    });
});

// Edit Service
window.editService = async (serviceId) => {
    try {
        const serviceDoc = await db.collection('services').doc(serviceId).get();
        if (!serviceDoc.exists) {
            showToast('Hizmet bulunamadı', 'error');
            return;
        }

        const service = serviceDoc.data();
        nameInput.value = service.name;
        descriptionInput.value = service.description || '';
        priceInput.value = service.price;
        durationInput.value = service.duration;
        categoryInput.value = service.category;
        isActiveInput.checked = service.isActive;

        editingServiceId = serviceId;
        nameInput.focus();
    } catch (error) {
        console.error('Hizmet yüklenirken hata:', error);
        showToast('Hizmet yüklenirken bir hata oluştu', 'error');
    }
};

// Delete Service
window.deleteService = async (serviceId) => {
    if (!confirm('Bu hizmeti silmek istediğinize emin misiniz?')) return;

    try {
        await db.collection('services').doc(serviceId).delete();
        showToast('Hizmet başarıyla silindi', 'success');
        await loadServices();
    } catch (error) {
        console.error('Hizmet silinirken hata:', error);
        showToast('Hizmet silinirken bir hata oluştu', 'error');
    }
}; 