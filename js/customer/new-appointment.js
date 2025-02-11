// UI Elements
const barbersGrid = document.getElementById('barbersGrid');
const appointmentForm = document.getElementById('appointmentForm');
const searchInput = document.getElementById('searchInput');
const filterButtons = document.querySelectorAll('.filter-btn');
const servicesGrid = document.getElementById('servicesGrid');
const timeSlots = document.getElementById('timeSlots');
const selectedBarberName = document.getElementById('selectedBarberName');

// State Variables
let selectedServices = new Set();
let selectedBarber = null;
let selectedDate = null;
let selectedTime = null;

// Auth State Observer
window.auth.onAuthStateChanged(async (user) => {
    if (!user) {
        window.location.href = '/customer/login.html';
        return;
    }

    // Kullanıcı tipini kontrol et
    try {
        const customerDoc = await window.db.collection('customers').doc(user.uid).get();
        if (!customerDoc.exists) {
            await window.auth.signOut();
            window.location.href = '/customer/login.html';
            return;
        }

        // Kullanıcı oturum açmışsa berberleri yükle
        await loadBarbers();
        setupEventListeners();
    } catch (error) {
        console.error('Kullanıcı kontrolü hatası:', error);
        window.location.href = '/customer/login.html';
    }
});

// Load Barbers
async function loadBarbers() {
    try {
        const snapshot = await window.db.collection('barbers').get();
        let barbersHTML = '';

        if (snapshot.empty) {
            barbersGrid.innerHTML = '<p class="no-results">Henüz berber bulunmamaktadır.</p>';
            return;
        }

        snapshot.forEach(doc => {
            const barber = doc.data();
            console.log('Berber data:', barber); // Debug için

            barbersHTML += `
                <div class="barber-card" data-id="${doc.id}">
                    <img src="${barber.imageUrl || '../assets/default-avatar.png'}" alt="${barber.businessName}" class="barber-image">
                    <div class="barber-info">
                        <div class="barber-header">
                            <h3 class="barber-name">${barber.businessName || 'İsimsiz Berber'}</h3>
                            <p class="barber-address">
                                <i class="fas fa-location-dot"></i>
                                ${barber.address || 'Adres belirtilmemiş'}
                            </p>
                        </div>
                        <div class="barber-rating">
                            <div class="rating-stars">
                                ${getRatingStars(barber.rating || 0)}
                            </div>
                            <span class="rating-count">(${barber.ratingCount || 0} değerlendirme)</span>
                        </div>
                        <div class="barber-actions">
                            <button onclick="selectBarber('${doc.id}')" class="randevu-btn">
                                <i class="fas fa-calendar-plus"></i>
                                Randevu Al
                            </button>
                            <button onclick="toggleFavorite('${doc.id}')" class="favori-btn">
                                <i class="fas fa-heart"></i>
                                Favorilere Ekle
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });

        if (barbersGrid) {
            barbersGrid.innerHTML = barbersHTML;
        }
    } catch (error) {
        console.error('Error loading barbers:', error);
        showToast('Berberler yüklenirken bir hata oluştu', 'error');
        barbersGrid.innerHTML = '<p class="error">Berberler yüklenirken bir hata oluştu. Lütfen sayfayı yenileyin.</p>';
    }
}

// Setup Event Listeners
function setupEventListeners() {
    // Tarih seçimi
    const dateInput = document.getElementById('appointmentDate');
    if (dateInput) {
        dateInput.addEventListener('change', handleDateSelection);
        
        // Minimum tarih olarak bugünü ayarla
        const today = new Date().toISOString().split('T')[0];
        dateInput.setAttribute('min', today);
    }

    // Arama kutusu
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', handleSearch);
    }

    // Filtre butonları
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(button => {
        button.addEventListener('click', handleFilter);
    });
}

// Helper Functions
function getRatingStars(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - Math.ceil(rating);
    
    let stars = '';
    
    // Full stars
    for (let i = 0; i < fullStars; i++) {
        stars += '<i class="fas fa-star"></i>';
    }
    
    // Half star
    if (hasHalfStar) {
        stars += '<i class="fas fa-star-half-alt"></i>';
    }
    
    // Empty stars
    for (let i = 0; i < emptyStars; i++) {
        stars += '<i class="far fa-star"></i>';
    }
    
    return stars;
}

// Show Toast Message
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    if (toast) {
        toast.textContent = message;
        toast.className = `toast show ${type}`;
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
}

// Filter Barbers
function filterBarbers(searchTerm) {
    const barberCards = document.querySelectorAll('.barber-card');
    
    barberCards.forEach(card => {
        const name = card.querySelector('.barber-name').textContent.toLowerCase();
        const address = card.querySelector('.barber-address').textContent.toLowerCase();
        
        if (name.includes(searchTerm) || address.includes(searchTerm)) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

// Apply Filter
async function applyFilter(filter) {
    // Reset active state
    filterButtons.forEach(btn => btn.classList.remove('active'));
    const activeButton = document.querySelector(`[data-filter="${filter}"]`);
    if (activeButton) activeButton.classList.add('active');

    try {
        let query = window.db.collection('barbers');
        
        switch (filter) {
            case 'nearest':
                // Konum bazlı sıralama (örnek)
                query = query.orderBy('location');
                break;
            case 'popular':
                query = query.orderBy('rating', 'desc');
                break;
            case 'favorites':
                const userId = window.auth.currentUser.uid;
                const userDoc = await window.db.collection('customers').doc(userId).get();
                const favorites = userDoc.data()?.favorites || [];
                query = query.where(firebase.firestore.FieldPath.documentId(), 'in', favorites);
                break;
        }

        const snapshot = await query.get();
        updateBarbersGrid(snapshot);
    } catch (error) {
        console.error('Error applying filter:', error);
        showToast('Filtre uygulanırken bir hata oluştu', 'error');
    }
}

// Update Barbers Grid
function updateBarbersGrid(snapshot) {
    let barbersHTML = '';
    
    if (snapshot.empty) {
        barbersGrid.innerHTML = '<p class="no-results">Sonuç bulunamadı</p>';
        return;
    }
    
    snapshot.forEach(doc => {
        const barber = doc.data();
        barbersHTML += `
            <div class="barber-card" data-id="${doc.id}">
                <img src="${barber.imageUrl || '../assets/default-avatar.png'}" alt="${barber.businessName}" class="barber-image">
                <div class="barber-info">
                    <div class="barber-header">
                    <h3 class="barber-name">${barber.businessName || 'İsimsiz Berber'}</h3>
                    <p class="barber-address">
                        <i class="fas fa-location-dot"></i>
                        ${barber.address || 'Adres belirtilmemiş'}
                    </p>
                    </div>
                    <div class="barber-rating">
                        <div class="rating-stars">
                            ${getRatingStars(barber.rating || 0)}
                        </div>
                        <span class="rating-count">(${barber.ratingCount || 0} değerlendirme)</span>
                    </div>
                    <div class="barber-actions">
                        <button onclick="selectBarber('${doc.id}')" class="randevu-btn">
                            <i class="fas fa-calendar-plus"></i>
                            Randevu Al
                        </button>
                        <button onclick="toggleFavorite('${doc.id}')" class="favori-btn">
                            <i class="fas fa-heart"></i>
                            Favorilere Ekle
                        </button>
                    </div>
                </div>
            </div>
        `;
    });

    if (barbersGrid) {
        barbersGrid.innerHTML = barbersHTML || '<p class="no-results">Sonuç bulunamadı</p>';
    }
}

// Select Barber
async function selectBarber(barberId) {
    try {
        showLoading('Berber bilgileri yükleniyor...');
        
        const barberDoc = await window.db.collection('barbers').doc(barberId).get();
        if (!barberDoc.exists) {
            throw new Error('Berber bulunamadı');
        }

        selectedBarber = barberId;
        const barber = barberDoc.data();
        
        // Berber adını güncelle
        const selectedBarberName = document.getElementById('selectedBarberName');
        if (selectedBarberName) {
            selectedBarberName.textContent = barber.businessName;
        }

        // Randevu formunu göster ve berber seçim bölümünü gizle
        const appointmentForm = document.getElementById('appointmentForm');
        const berberSection = document.querySelector('.appointment-container > section:first-child');
        
        if (appointmentForm) appointmentForm.style.display = 'block';
        if (berberSection) berberSection.style.display = 'none';

        // Form verilerini sıfırla
        resetFormData();

        // Hizmetleri yükle
        await loadServices(barberId);
        
        hideLoading();
    } catch (error) {
        console.error('Berber seçilirken hata:', error);
        hideLoading();
        showAppointmentError('Berber seçilirken bir hata oluştu');
    }
}

// Toggle Favorite
async function toggleFavorite(barberId) {
    try {
        const userId = window.auth.currentUser.uid;
        const userRef = window.db.collection('customers').doc(userId);
        const userDoc = await userRef.get();
        
        if (!userDoc.exists) {
            showToast('Kullanıcı bulunamadı', 'error');
            return;
        }

        const favorites = userDoc.data().favorites || [];
        const isFavorite = favorites.includes(barberId);
        
        if (isFavorite) {
            await userRef.update({
                favorites: firebase.firestore.FieldValue.arrayRemove(barberId)
            });
            showToast('Favorilerden çıkarıldı');
        } else {
            await userRef.update({
                favorites: firebase.firestore.FieldValue.arrayUnion(barberId)
            });
            showToast('Favorilere eklendi');
        }
        
        // Update UI
        const favoriteButton = document.querySelector(`[data-id="${barberId}"] .add-favorite i`);
        if (favoriteButton) {
            favoriteButton.className = isFavorite ? 'fas fa-heart' : 'far fa-heart';
        }
    } catch (error) {
        console.error('Error toggling favorite:', error);
        showToast('Favori işlemi sırasında bir hata oluştu', 'error');
    }
}

// Load Services
async function loadServices(barberId) {
    const servicesGrid = document.getElementById('servicesGrid');
    if (!servicesGrid) {
        console.error('servicesGrid elementi bulunamadı');
        return;
    }

    try {
        console.log('Hizmetler yükleniyor - Berber ID:', barberId);
        servicesGrid.innerHTML = '<div class="loading">Hizmetler yükleniyor...</div>';

        const servicesSnapshot = await window.db.collection('services')
            .where('barberId', '==', barberId)
            .where('active', '==', true) // Sadece aktif hizmetleri getir
            .get();
        
        console.log('Bulunan hizmet sayısı:', servicesSnapshot.size);
        
        if (servicesSnapshot.empty) {
            servicesGrid.innerHTML = '<p class="no-results">Henüz hizmet eklenmemiş.</p>';
            return;
        }

        let servicesHTML = '';
        servicesSnapshot.forEach(doc => {
            const service = doc.data();
            console.log('Hizmet detayları:', service);
            
            servicesHTML += `
                <div class="service-card" data-id="${doc.id}" onclick="selectService('${doc.id}')">
                    <div class="service-name">${service.name}</div>
                    <div class="service-details">
                        <span class="service-duration">
                            <i class="far fa-clock"></i>
                            ${service.duration} dakika
                        </span>
                        <span class="service-price">
                            <i class="fa-solid fa-turkish-lira-sign"></i>
                            ${service.price}
                        </span>
                    </div>
                    ${service.description ? `
                        <div class="service-description">
                            <p>${service.description}</p>
                        </div>
                    ` : '<div class="service-description"><p>Açıklama eklenmemiş</p></div>'}
                    ${service.image ? `
                        <div class="service-image">
                            <img src="${service.image}" alt="${service.name}" loading="lazy">
                        </div>
                    ` : ''}
                </div>
            `;
        });

        servicesGrid.innerHTML = servicesHTML;

        // Daha önce seçili olan hizmetleri işaretle
        selectedServices.forEach(serviceId => {
            const serviceCard = document.querySelector(`.service-card[data-id="${serviceId}"]`);
            if (serviceCard) {
                serviceCard.classList.add('selected');
            }
        });

    } catch (error) {
        console.error('Hizmetler yüklenirken hata:', error);
        servicesGrid.innerHTML = '<div class="error-state">Hizmetler yüklenirken bir hata oluştu</div>';
    }
}

// Select Service
function selectService(serviceId) {
    const serviceCard = document.querySelector(`.service-card[data-id="${serviceId}"]`);
    if (!serviceCard) return;

    if (selectedServices.has(serviceId)) {
        selectedServices.delete(serviceId);
        serviceCard.classList.remove('selected');
    } else {
        selectedServices.add(serviceId);
        serviceCard.classList.add('selected');
    }

    updateServiceSummary();
}

// Update Service Summary
async function updateServiceSummary() {
    const summaryElement = document.getElementById('appointmentSummary');
    if (!summaryElement || selectedServices.size === 0) {
        summaryElement.innerHTML = '';
        return;
    }

    try {
        let totalPrice = 0;
        let totalDuration = 0;
        const servicesDetails = [];

        for (const serviceId of selectedServices) {
            const serviceDoc = await window.db.collection('services').doc(serviceId).get();
            if (serviceDoc.exists) {
                const service = serviceDoc.data();
                totalPrice += service.price;
                totalDuration += service.duration;
                servicesDetails.push(service.name);
            }
        }

        summaryElement.innerHTML = `
            <h4>Seçilen Hizmetler</h4>
            <ul>
                ${servicesDetails.map(name => `<li>${name}</li>`).join('')}
            </ul>
            <div class="summary-totals">
                <p>Toplam Süre: ${totalDuration} dakika</p>
                <p>Toplam Ücret: ${totalPrice} TL</p>
            </div>
        `;
    } catch (error) {
        console.error('Error updating service summary:', error);
        showToast('Hizmet özeti güncellenirken bir hata oluştu', 'error');
    }
}

// Tarih seçimi işleyicisi
async function handleDateSelection(e) {
    selectedDate = e.target.value;
    await loadTimeSlots();
}

// Saat dilimlerini yükle
async function loadTimeSlots() {
    const timeSlotsContainer = document.getElementById('timeSlots');
    if (!selectedDate || !selectedBarber || !timeSlotsContainer) {
        console.log('Gerekli bilgiler eksik:', { selectedDate, selectedBarber, timeSlotsContainer });
        return;
    }

    try {
        timeSlotsContainer.innerHTML = '<div class="loading">Müsait saatler yükleniyor...</div>';

        // Seçilen tarihin başlangıç ve bitiş zamanlarını ayarla
        const selectedDateTime = new Date(selectedDate);
        const now = new Date();
        
        // Eğer seçilen tarih bugünse, şu anki saatten önceki saatleri devre dışı bırak
        const isToday = selectedDateTime.toDateString() === now.toDateString();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();

        // Berber çalışma saatlerini al
        const barberDoc = await window.db.collection('barbers').doc(selectedBarber).get();
        const workingHours = barberDoc.data().workingHours || {};
        const dayOfWeek = selectedDateTime.getDay();
        const todayHours = workingHours[dayOfWeek] || { start: '09:00', end: '18:00' };

        // Saat dilimlerini oluştur
        const slots = [];
        let [startHour, startMinute] = todayHours.start.split(':').map(Number);
        const [endHour, endMinute] = todayHours.end.split(':').map(Number);

        // Eğer bugünse ve şu anki saat başlangıç saatinden sonraysa, başlangıç saatini güncelle
        if (isToday && currentHour >= startHour) {
            startHour = currentHour;
            if (currentMinute > 30) {
                startHour++;
                startMinute = 0;
            } else if (currentMinute > 0) {
                startMinute = 30;
            }
        }

        // Saat dilimlerini oluştur (30'ar dakikalık)
        for (let hour = startHour; hour <= endHour; hour++) {
            for (let minute = (hour === startHour ? startMinute : 0); minute < 60; minute += 30) {
                if (hour === endHour && minute >= endMinute) break;
                
                const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
                slots.push(timeString);
            }
        }

        // Mevcut randevuları kontrol et
        const appointmentsSnapshot = await window.db.collection('appointments')
            .where('barberId', '==', selectedBarber)
            .where('date', '==', selectedDate)
            .get();

        const bookedSlots = new Set();
        appointmentsSnapshot.forEach(doc => {
            const appointment = doc.data();
            if (appointment.status !== 'cancelled') {
                bookedSlots.add(appointment.time);
            }
        });

        // Saat dilimlerini grupla (3'lü gruplar halinde)
        const timeGroups = [];
        for (let i = 0; i < slots.length; i += 3) {
            timeGroups.push(slots.slice(i, i + 3));
        }

        // HTML oluştur
        let timeSlotsHTML = '';
        timeGroups.forEach(group => {
            timeSlotsHTML += '<div class="time-slots-row">';
            group.forEach(time => {
                const isBooked = bookedSlots.has(time);
                timeSlotsHTML += `
                    <button type="button" 
                            class="time-slot ${isBooked ? 'booked' : ''}" 
                            onclick="selectTimeSlot(this)"
                            data-time="${time}"
                            ${isBooked ? 'disabled' : ''}>
                        <i class="far fa-clock"></i>
                        ${time}
                    </button>
                `;
            });
            timeSlotsHTML += '</div>';
        });

        // Saat dilimlerini göster
        if (slots.length === 0) {
            timeSlotsContainer.innerHTML = '<p class="no-slots">Bu tarih için uygun saat bulunmuyor.</p>';
        } else {
            timeSlotsContainer.innerHTML = timeSlotsHTML;
        }

    } catch (error) {
        console.error('Saat dilimleri yüklenirken hata:', error);
        timeSlotsContainer.innerHTML = `
            <div class="error">
                <i class="fas fa-exclamation-circle"></i>
                <p>Saat dilimleri yüklenirken bir hata oluştu.</p>
            </div>
        `;
    }
}

// Saat seçimi bölümünü aç/kapat
function toggleTimeSlots() {
    const timeSlotsWrapper = document.getElementById('timeSlots');
    const header = document.querySelector('.time-slots-header');
    const isVisible = timeSlotsWrapper.style.display === 'block';
    
    if (isVisible) {
        timeSlotsWrapper.style.display = 'none';
        header.classList.remove('active');
    } else {
        timeSlotsWrapper.style.display = 'block';
        header.classList.add('active');
    }
}

// Saat seçimi
function selectTimeSlot(button) {
    // Önceki seçimi kaldır
    const allSlots = document.querySelectorAll('.time-slot');
    allSlots.forEach(slot => slot.classList.remove('selected'));

    // Yeni seçimi işaretle
    button.classList.add('selected');
    selectedTime = button.getAttribute('data-time');
    
    // Seçilen saati header'a yaz
    const header = document.querySelector('.time-slots-header label');
    header.innerHTML = `<i class="fas fa-clock"></i> Seçilen Saat: ${selectedTime}`;
    
    // Menüyü kapat
    setTimeout(() => {
        toggleTimeSlots();
    }, 200);
}

// Berber Seçimine Dön
function showBarberSelection() {
    // Randevu formunu gizle
    const appointmentForm = document.getElementById('appointmentForm');
    if (appointmentForm) {
        appointmentForm.style.display = 'none';
    }

    // Berber seçim bölümünü göster
    const berberSection = document.querySelector('.appointment-container > section:first-child');
    if (berberSection) {
        berberSection.style.display = 'block';
    }

    // Form verilerini sıfırla
    resetFormData();
}

// Form verilerini sıfırla
function resetFormData() {
    // Seçili hizmetleri temizle
    selectedServices.clear();
    if (servicesGrid) {
        servicesGrid.innerHTML = '';
    }
    
    // Seçili tarihi temizle
    selectedDate = null;
    const dateInput = document.getElementById('appointmentDate');
    if (dateInput) {
        dateInput.value = '';
    }
    
    // Seçili saati temizle
    selectedTime = null;
    if (timeSlots) {
        timeSlots.innerHTML = '';
    }
    
    // Notları temizle
    const notesInput = document.getElementById('notes');
    if (notesInput) {
        notesInput.value = '';
    }

    // Özet bölümünü temizle
    const summaryElement = document.getElementById('appointmentSummary');
    if (summaryElement) {
        summaryElement.innerHTML = '';
    }
}

// URL parametrelerini kontrol et
const checkUrlParams = async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const action = urlParams.get('action');
    const appointmentId = urlParams.get('appointmentId');
    const barberId = urlParams.get('barberId');
    const servicesParam = urlParams.get('services');

    if (action === 'reschedule' && appointmentId && barberId) {
        try {
            // Yükleme göster
            showLoading('Randevu bilgileri yükleniyor...');

            // Mevcut randevuyu getir
            const appointmentDoc = await window.db.collection('appointments').doc(appointmentId).get();
            if (!appointmentDoc.exists) {
                throw new Error('Randevu bulunamadı');
            }

            const appointment = appointmentDoc.data();

            // Berberi seç
            await selectBarber(barberId);

            // Servisleri seç
            if (servicesParam) {
                const services = JSON.parse(servicesParam);
                for (const service of services) {
                    selectedServices.add(service.id);
                    const serviceCard = document.querySelector(`.service-card[data-id="${service.id}"]`);
                    if (serviceCard) {
                        serviceCard.classList.add('selected');
                    }
                }
                await updateServiceSummary();
            }

            // Tarihi seç
            if (appointment.date) {
                const dateInput = document.getElementById('appointmentDate');
                if (dateInput) {
                    dateInput.value = appointment.date;
                    selectedDate = appointment.date;
                    await loadTimeSlots();
                }
            }

            // Saati seç
            if (appointment.time) {
                selectedTime = appointment.time;
                const timeSlots = document.querySelectorAll('.time-slot-btn');
                timeSlots.forEach(slot => {
                    if (slot.textContent.trim() === appointment.time) {
                        slot.classList.add('selected');
                    }
                });
            }

            // Not bilgisini doldur
            if (appointment.notes) {
                const notesInput = document.getElementById('notes');
                if (notesInput) {
                    notesInput.value = appointment.notes;
                }
            }

            // Submit butonunu güncelle
            const submitBtn = document.querySelector('.submit-btn');
            if (submitBtn) {
                submitBtn.innerHTML = '<i class="fas fa-check"></i> Randevuyu Güncelle';
            }

            hideLoading();

        } catch (error) {
            console.error('Randevu bilgileri yüklenirken hata:', error);
            hideLoading();
            showAppointmentError('Randevu bilgileri yüklenirken bir hata oluştu');
        }
    }
};

// Form gönderme işlemi
window.handleSubmit = async (event) => {
    event.preventDefault();
    
    try {
        // Gerekli alanları kontrol et
        if (!selectedBarber) {
            throw new Error('Lütfen bir berber seçin');
        }
        if (!selectedServices.size) {
            throw new Error('Lütfen en az bir hizmet seçin');
        }
        if (!selectedDate) {
            throw new Error('Lütfen randevu tarihi seçin');
        }
        if (!selectedTime) {
            throw new Error('Lütfen randevu saati seçin');
        }
        if (!document.getElementById('fullName').value) {
            throw new Error('Lütfen adınızı ve soyadınızı girin');
        }
        if (!document.getElementById('phone').value) {
            throw new Error('Lütfen telefon numaranızı girin');
        }

        // URL'den randevu ID'sini kontrol et
        const urlParams = new URLSearchParams(window.location.search);
        const appointmentId = urlParams.get('appointmentId');
        const isUpdate = !!appointmentId;

        // Berber bilgilerini al
        const barberDoc = await window.db.collection('barbers').doc(selectedBarber).get();
        if (!barberDoc.exists) {
            throw new Error('Berber bilgileri bulunamadı');
        }
        const barberData = barberDoc.data();

        // Toplam süre ve tutarı hesapla
        let totalDuration = 0;
        let totalPrice = 0;
        const selectedServiceDetails = [];

        // Seçili hizmetlerin detaylarını al
        for (const serviceId of selectedServices) {
            const serviceDoc = await window.db.collection('services').doc(serviceId).get();
            if (serviceDoc.exists) {
                const serviceData = serviceDoc.data();
                selectedServiceDetails.push({
                    id: serviceId,
                    name: serviceData.name,
                    duration: serviceData.duration,
                    price: serviceData.price
                });
                totalDuration += serviceData.duration;
                totalPrice += serviceData.price;
            }
        }

        // Randevu verilerini hazırla
        const appointmentData = {
            barberId: selectedBarber,
            customerId: window.auth.currentUser.uid,
            customer: {
                name: document.getElementById('fullName').value,
                phone: document.getElementById('phone').value
            },
            date: selectedDate,
            time: selectedTime,
            services: selectedServiceDetails,
            totalDuration: totalDuration,
            totalPrice: totalPrice,
            notes: document.getElementById('notes')?.value || '',
            status: 'pending',
            isHidden: false,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        if (!isUpdate) {
            // Yeni randevu oluşturma - onay ekranı göster
            const result = await Swal.fire({
                title: 'Randevu Onayı',
                html: `
                    <div style="text-align: left; margin: 1rem 0;">
                        <p><strong>Berber:</strong> ${document.getElementById('selectedBarberName').textContent}</p>
                        <p><strong>Tarih:</strong> ${selectedDate}</p>
                        <p><strong>Saat:</strong> ${selectedTime}</p>
                        <p><strong>Ad Soyad:</strong> ${document.getElementById('fullName').value}</p>
                        <p><strong>Telefon:</strong> ${document.getElementById('phone').value}</p>
                        <p><strong>Toplam Süre:</strong> ${totalDuration} dakika</p>
                        <p><strong>Toplam Ücret:</strong> ${totalPrice} TL</p>
                    </div>
                `,
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: 'Randevuyu Oluştur',
                cancelButtonText: 'İptal',
                confirmButtonColor: '#2e86de',
                cancelButtonColor: '#e74c3c'
            });

            if (!result.isConfirmed) {
                return;
            }

            // Yükleme göster
            showLoading('Randevunuz kaydediliyor...');

            // createdAt sadece yeni randevularda ekle
            appointmentData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            
            // Randevuyu kaydet
            await window.db.collection('appointments').add(appointmentData);
            
            hideLoading();
            
            await Swal.fire({
                title: 'Başarılı!',
                text: 'Randevunuz başarıyla oluşturuldu',
                icon: 'success',
                confirmButtonColor: '#2e86de'
            });
        } else {
            // Randevu güncelleme - direkt güncelle
            showLoading('Randevunuz güncelleniyor...');
            
            // Randevuyu güncelle
            await window.db.collection('appointments').doc(appointmentId).update(appointmentData);
            
            hideLoading();
            
            await Swal.fire({
                title: 'Başarılı!',
                text: 'Randevunuz başarıyla güncellendi',
                icon: 'success',
                confirmButtonColor: '#2e86de',
                showConfirmButton: false,
                timer: 1500
            });
        }

        // Randevularım sayfasına yönlendir
        window.location.href = '/customer/appointments.html';

    } catch (error) {
        console.error('Randevu işlemi sırasında hata:', error);
        hideLoading();
        
        await Swal.fire({
            title: 'Hata!',
            text: error.message || 'Randevu işlemi sırasında bir hata oluştu',
            icon: 'error',
            confirmButtonColor: '#2e86de'
        });
    }
};

// Yükleme göstergesi
const showLoading = (message = 'Yükleniyor...') => {
    Swal.fire({
        title: message,
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        willOpen: () => {
            Swal.showLoading();
        }
    });
};

const hideLoading = () => {
    Swal.close();
};

// Hata göstergesi
const showAppointmentError = async (message) => {
    const toast = document.getElementById('toast');
    if (toast) {
        toast.textContent = message;
        toast.className = 'toast show error';
        setTimeout(() => toast.classList.remove('show'), 3000);
    }
};

// Arama işlemi
function handleSearch(event) {
    const searchTerm = event.target.value.toLowerCase();
    const barberCards = document.querySelectorAll('.barber-card');
    
    barberCards.forEach(card => {
        const barberName = card.querySelector('.barber-name').textContent.toLowerCase();
        const barberAddress = card.querySelector('.barber-address').textContent.toLowerCase();
        
        if (barberName.includes(searchTerm) || barberAddress.includes(searchTerm)) {
            card.style.display = 'flex';
        } else {
            card.style.display = 'none';
        }
    });
}

// Filtreleme işlemi
function handleFilter(event) {
    const selectedFilter = event.target.dataset.filter;
    const filterButtons = document.querySelectorAll('.filter-btn');
    
    // Aktif filtre butonunu güncelle
    filterButtons.forEach(button => {
        button.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Berberleri filtrele
    filterBarbers(selectedFilter);
}

// Berberleri filtrele
async function filterBarbers(filter) {
    try {
        let query = window.db.collection('barbers');
        
        switch (filter) {
            case 'nearest':
                // Konum bazlı sıralama (şimdilik basit sıralama)
                query = query.orderBy('address');
                break;
            case 'popular':
                // Puana göre sıralama
                query = query.orderBy('rating', 'desc');
                break;
            case 'favorites':
                // Favorileri getir
                const userDoc = await window.db.collection('customers').doc(window.auth.currentUser.uid).get();
                const favorites = userDoc.data()?.favorites || [];
                if (favorites.length > 0) {
                    query = query.where(firebase.firestore.FieldPath.documentId(), 'in', favorites);
                } else {
                    const barbersGrid = document.getElementById('barbersGrid');
                    barbersGrid.innerHTML = '<p class="no-results">Favori berberiniz bulunmuyor.</p>';
                    return;
                }
                break;
        }
        
        const snapshot = await query.get();
        updateBarbersGrid(snapshot);
        
    } catch (error) {
        console.error('Berberler filtrelenirken hata:', error);
        showToast('Berberler filtrelenirken bir hata oluştu', 'error');
    }
}

// Çıkış yapma fonksiyonu
async function logout() {
    try {
        await window.auth.signOut();
        window.location.href = '/customer/login.html';
    } catch (error) {
        console.error('Çıkış yapma hatası:', error);
        showToast('Çıkış yapılırken bir hata oluştu', 'error');
    }
}

// Sayfa yüklendiğinde
document.addEventListener('DOMContentLoaded', () => {
    // Auth durumunu kontrol et
    window.auth.onAuthStateChanged(user => {
        if (user) {
            // Berberleri yükle
            loadBarbers();
            
            // Form submit olayını dinle
            const appointmentForm = document.querySelector('.appointment-form');
            if (appointmentForm) {
                // Önceki event listener'ları temizle
                const newAppointmentForm = appointmentForm.cloneNode(true);
                appointmentForm.parentNode.replaceChild(newAppointmentForm, appointmentForm);
                
                // Yeni event listener ekle
                newAppointmentForm.addEventListener('submit', handleSubmit);
            }

            // Event listener'ları ayarla
            setupEventListeners();

            // URL parametrelerini kontrol et
            checkUrlParams();
        } else {
            window.location.href = '/customer/login.html';
        }
    });
}); 