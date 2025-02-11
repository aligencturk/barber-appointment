// Auth state observer
window.auth.onAuthStateChanged(async (user) => {
    if (user) {
        // Kullanıcı tipini kontrol et
        const userDoc = await window.db.collection('customers').doc(user.uid).get();
        if (!userDoc.exists) {
            // Eğer müşteri değilse ana sayfaya yönlendir
            window.location.replace('../index.html');
            return;
        }

        // Kullanıcı bilgilerini yükle
        const userData = userDoc.data();
        document.getElementById('userName').textContent = `Hoş Geldin, ${userData.name || 'Değerli Müşterimiz'}`;
        
        // Aktif randevuları yükle
        const today = new Date();
        const appointmentsSnapshot = await window.db.collection('appointments')
            .where('customerId', '==', user.uid)
            .where('date', '>=', today.toISOString().split('T')[0])
            .where('status', 'in', ['pending', 'confirmed'])
            .get();

        // Randevu sayısını güncelle
        const appointmentCount = document.getElementById('appointmentCount');
        if (appointmentCount) {
            appointmentCount.textContent = appointmentsSnapshot.size;
            appointmentCount.style.display = appointmentsSnapshot.size > 0 ? 'inline-flex' : 'none';
        }

        // Öne çıkan berberleri yükle
        loadFeaturedBarbers();
    } else {
        // Kullanıcı giriş yapmamışsa login sayfasına yönlendir
        window.location.replace('./login.html');
    }
});

// Öne çıkan berberleri yükle
async function loadFeaturedBarbers() {
    try {
        const barbersGrid = document.getElementById('featuredBarbers');
        if (!barbersGrid) return;

        const snapshot = await window.db.collection('barbers')
            .orderBy('rating', 'desc')
            .limit(3)
            .get();

        if (snapshot.empty) {
            barbersGrid.innerHTML = '<p class="no-results">Henüz berber bulunmuyor.</p>';
            return;
        }

        let barbersHTML = '';
        snapshot.forEach(doc => {
            const barber = doc.data();
            barbersHTML += `
                <div class="barber-card">
                    <img src="${barber.photoURL || '../assets/default-avatar.png'}" alt="${barber.businessName}" class="barber-image">
                    <div class="barber-info">
                        <h3>${barber.businessName || 'İsimsiz Berber'}</h3>
                        <p class="barber-address">
                            <i class="fas fa-location-dot"></i>
                            ${barber.address || 'Adres belirtilmemiş'}
                        </p>
                        <div class="barber-rating">
                            <div class="rating-stars">
                                ${getRatingStars(barber.rating || 0)}
                            </div>
                            <span class="rating-count">(${barber.reviewCount || 0} değerlendirme)</span>
                        </div>
                        <div class="barber-actions">
                            <a href="new-appointment.html?barberId=${doc.id}" class="btn btn-primary">
                                <i class="fas fa-calendar-plus"></i>
                                Randevu Al
                            </a>
                        </div>
                    </div>
                </div>
            `;
        });

        barbersGrid.innerHTML = barbersHTML;
    } catch (error) {
        console.error('Error loading featured barbers:', error);
        showToast('Berberler yüklenirken bir hata oluştu', 'error');
    }
}

// Yıldız değerlendirmesi oluştur
function getRatingStars(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - Math.ceil(rating);
    
    let stars = '';
    
    // Dolu yıldızlar
    for (let i = 0; i < fullStars; i++) {
        stars += '<i class="fas fa-star"></i>';
    }
    
    // Yarım yıldız
    if (hasHalfStar) {
        stars += '<i class="fas fa-star-half-alt"></i>';
    }
    
    // Boş yıldızlar
    for (let i = 0; i < emptyStars; i++) {
        stars += '<i class="far fa-star"></i>';
    }
    
    return stars;
}

// Çıkış yap
window.logout = async () => {
    try {
        await window.auth.signOut();
        window.location.href = '/index.html';
    } catch (error) {
        console.error('Error signing out:', error);
        showToast('Çıkış yapılırken bir hata oluştu', 'error');
    }
};

// Toast mesajı göster
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

// Randevu kartını oluştur
function createAppointmentCard(appointment) {
    // Randevu durumuna göre stil ve metin belirle
    const statusInfo = {
        'pending': { text: 'Onay Bekliyor', class: 'pending', icon: 'fa-clock' },
        'confirmed': { text: 'Onaylandı', class: 'confirmed', icon: 'fa-check' },
        'cancelled': { text: 'İptal Edildi', class: 'cancelled', icon: 'fa-times' },
        'completed': { text: 'Tamamlandı', class: 'completed', icon: 'fa-check-double' }
    };

    const status = statusInfo[appointment.status];

    // Seçilen hizmetleri listele
    const servicesHtml = appointment.services.map(service => `
        <div class="service-item">
            <i class="fas fa-check"></i>
            <span class="service-name">${service.name}</span>
            <div class="service-details">
                <span class="service-duration">
                    <i class="far fa-clock"></i>
                    ${service.duration} dk
                </span>
                <span class="service-price">
                    <i class="fa-solid fa-turkish-lira-sign"></i>
                    ${service.price}
                </span>
            </div>
        </div>
    `).join('');

    // İptal nedeni varsa göster
    const cancellationHtml = appointment.status === 'cancelled' && appointment.cancellationReason ? `
        <div class="cancellation-reason">
            <i class="fas fa-info-circle"></i>
            <p><strong>İptal Nedeni:</strong> ${appointment.cancellationReason}</p>
        </div>
    ` : '';

    return `
        <div class="appointment-card ${status.class}">
            <div class="appointment-header">
                <div class="appointment-date">
                    <i class="fas fa-calendar"></i>
                    <span>${appointment.date}</span>
                </div>
                <div class="appointment-time">
                    <i class="fas fa-clock"></i>
                    <span>${appointment.time}</span>
                </div>
                <div class="appointment-status">
                    <i class="fas ${status.icon}"></i>
                    <span>${status.text}</span>
                </div>
            </div>
            <div class="appointment-content">
                <div class="barber-info">
                    <h4>
                        <i class="fas fa-user-tie"></i>
                        ${appointment.barber?.businessName || 'Berber Adı'}
                    </h4>
                    <p>
                        <i class="fas fa-map-marker-alt"></i>
                        ${appointment.barber?.address || 'Adres bilgisi bulunamadı'}
                    </p>
                    <p>
                        <i class="fas fa-phone"></i>
                        ${appointment.barber?.phone || 'Telefon bilgisi bulunamadı'}
                    </p>
                </div>
                <div class="services-list">
                    <h5>
                        <i class="fas fa-cut"></i>
                        Seçilen Hizmetler
                    </h5>
                    <div class="services">
                        ${servicesHtml}
                    </div>
                </div>
                ${cancellationHtml}
            </div>
        </div>
    `;
}

// Randevuları yükle
async function loadAppointments() {
    try {
        const user = window.auth.currentUser;
        if (!user) {
            showToast('Lütfen giriş yapın', 'error');
            return;
        }

        const appointmentsContainer = document.getElementById('appointmentsContainer');
        if (!appointmentsContainer) return;

        appointmentsContainer.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i><p>Randevular yükleniyor...</p></div>';

        // Randevuları getir
        const appointmentsSnapshot = await window.db.collection('appointments')
            .where('customerId', '==', user.uid)
            .orderBy('date', 'desc')
            .orderBy('time', 'desc')
            .get();

        if (appointmentsSnapshot.empty) {
            appointmentsContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-calendar-times"></i>
                    <p>Henüz randevunuz bulunmuyor</p>
                    <a href="new-appointment.html" class="btn btn-primary">
                        <i class="fas fa-plus"></i>
                        Randevu Al
                    </a>
                </div>
            `;
            return;
        }

        // Her randevu için berber bilgilerini al
        const appointments = [];
        for (const doc of appointmentsSnapshot.docs) {
            const appointment = { id: doc.id, ...doc.data() };
            
            // Berber bilgilerini getir
            if (appointment.barberId) {
                const barberDoc = await window.db.collection('barbers')
                    .doc(appointment.barberId)
                    .get();
                
                if (barberDoc.exists) {
                    appointment.barber = barberDoc.data();
                }
            }
            
            appointments.push(appointment);
        }

        // Randevuları görüntüle
        appointmentsContainer.innerHTML = appointments.map(appointment => 
            createAppointmentCard(appointment)
        ).join('');

    } catch (error) {
        console.error('Randevular yüklenirken hata:', error);
        const appointmentsContainer = document.getElementById('appointmentsContainer');
        if (appointmentsContainer) {
            appointmentsContainer.innerHTML = `
                <div class="error-state">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>Randevular yüklenirken bir hata oluştu</p>
                    <button onclick="loadAppointments()" class="btn btn-primary">
                        <i class="fas fa-sync"></i>
                        Tekrar Dene
                    </button>
                </div>
            `;
        }
    }
}

// Profil fotoğrafını yükle
async function uploadProfilePhoto(file) {
    try {
        const user = window.auth.currentUser;
        if (!user) {
            showToast('Lütfen giriş yapın', 'error');
            return null;
        }

        const storageRef = window.storage.ref();
        const profilePhotoRef = storageRef.child(`profile_photos/${user.uid}`);
        
        await profilePhotoRef.put(file);
        const downloadURL = await profilePhotoRef.getDownloadURL();
        
        return downloadURL;
    } catch (error) {
        console.error('Profil fotoğrafı yüklenirken hata:', error);
        showToast('Profil fotoğrafı yüklenemedi', 'error');
        return null;
    }
} 