// Sayfa yüklendiğinde
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Firebase'in yüklenmesini bekle
        await window.checkFirebaseLoaded();
        console.log('Firebase servisleri hazır, sayfa yükleniyor...');

        // Oturum durumunu kontrol et
        const user = await window.authService.getCurrentUser();
        if (!user) {
            window.location.href = '/login.html';
            return;
        }

        // Kullanıcı tipini kontrol et
        const userType = await window.authService.checkUserType(user.uid);
        console.log('Kullanıcı tipi:', userType);

        // Randevuları yükle
        await loadAppointments(userType, user.uid);

        // Randevu filtreleme olaylarını dinle
        setupFilterListeners();

    } catch (error) {
        console.error('Sayfa yüklenirken hata:', error);
        alert('Bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
    }
});

// Randevuları yükle
async function loadAppointments(userType, userId) {
    try {
        const appointmentsContainer = document.getElementById('appointmentsContainer');
        if (!appointmentsContainer) return;

        // Yükleniyor göster
        appointmentsContainer.innerHTML = `
            <div class="loading">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Randevular yükleniyor...</p>
            </div>
        `;

        // Randevuları getir
        let query = window.db.collection('appointments');

        // Kullanıcı tipine göre filtrele
        if (userType === 'customer') {
            query = query.where('customerId', '==', userId);
        } else if (userType === 'barber') {
            query = query.where('barberId', '==', userId);
        }

        // Tarihe göre sırala
        query = query.orderBy('date', 'desc');

        const appointments = await query.get();
        
        if (appointments.empty) {
            appointmentsContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-calendar-times"></i>
                    <p>Henüz randevu bulunmuyor</p>
                </div>
            `;
            return;
        }

        // Randevuları listele
        appointmentsContainer.innerHTML = '';
        appointments.forEach(doc => {
            const appointment = doc.data();
            const appointmentElement = createAppointmentElement(doc.id, appointment, userType);
            appointmentsContainer.appendChild(appointmentElement);
        });

    } catch (error) {
        console.error('Randevular yüklenirken hata:', error);
        alert('Randevular yüklenirken bir hata oluştu');
    }
}

// Randevu elementi oluştur
function createAppointmentElement(id, appointment, userType) {
    const date = appointment.date.toDate();
    const status = getAppointmentStatus(appointment.status);
    
    const div = document.createElement('div');
    div.className = `appointment-card ${appointment.status}`;
    div.innerHTML = `
        <div class="appointment-time">
            <i class="far fa-clock"></i>
            ${formatDate(date)}
        </div>
        <div class="appointment-details">
            <div class="customer-info">
                <h4>
                    <i class="fas fa-user"></i>
                    ${appointment.customerName || 'Müşteri'}
                </h4>
                <p>
                    <i class="fas fa-phone"></i>
                    ${appointment.customerPhone || 'Telefon bilgisi yok'}
                </p>
            </div>
            <div class="services-list">
                <h5>
                    <i class="fas fa-cut"></i>
                    Hizmetler
                </h5>
                <div class="services">
                    ${appointment.services.map(service => `
                        <span class="service-tag">
                            ${service.name}
                            <small>${service.duration} dk - ₺${service.price}</small>
                        </span>
                    `).join('')}
                </div>
            </div>
            ${appointment.notes ? `
                <div class="customer-notes">
                    <i class="fas fa-sticky-note"></i>
                    <p>${appointment.notes}</p>
                </div>
            ` : ''}
        </div>
        <div class="appointment-actions">
            ${getAppointmentActions(id, appointment, userType)}
        </div>
    `;

    return div;
}

// Randevu durumunu getir
function getAppointmentStatus(status) {
    const statusMap = {
        'pending': {
            text: 'Bekliyor',
            icon: 'fa-clock',
            color: 'warning'
        },
        'confirmed': {
            text: 'Onaylandı',
            icon: 'fa-check',
            color: 'success'
        },
        'cancelled': {
            text: 'İptal Edildi',
            icon: 'fa-times',
            color: 'danger'
        },
        'completed': {
            text: 'Tamamlandı',
            icon: 'fa-check-double',
            color: 'info'
        }
    };

    return statusMap[status] || statusMap.pending;
}

// Randevu aksiyonlarını getir
function getAppointmentActions(id, appointment, userType) {
    const status = appointment.status;
    
    if (status === 'cancelled' || status === 'completed') {
        return '';
    }

    let actions = '';

    if (userType === 'barber') {
        if (status === 'pending') {
            actions += `
                <button onclick="confirmAppointment('${id}')" class="btn btn-success">
                    <i class="fas fa-check"></i>
                    Onayla
                </button>
            `;
        }
        if (status === 'confirmed') {
            actions += `
                <button onclick="completeAppointment('${id}')" class="btn btn-info">
                    <i class="fas fa-check-double"></i>
                    Tamamla
                </button>
            `;
        }
    }

    if (status === 'pending') {
        actions += `
            <button onclick="cancelAppointment('${id}')" class="btn btn-danger">
                <i class="fas fa-times"></i>
                İptal Et
            </button>
        `;
    }

    return actions;
}

// Randevu aksiyonları
async function confirmAppointment(id) {
    try {
        await window.db.collection('appointments').doc(id).update({
            status: 'confirmed',
            confirmedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        location.reload();
    } catch (error) {
        console.error('Randevu onaylanırken hata:', error);
        alert('Randevu onaylanırken bir hata oluştu');
    }
}

async function completeAppointment(id) {
    try {
        await window.db.collection('appointments').doc(id).update({
            status: 'completed',
            completedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        location.reload();
    } catch (error) {
        console.error('Randevu tamamlanırken hata:', error);
        alert('Randevu tamamlanırken bir hata oluştu');
    }
}

async function cancelAppointment(id) {
    try {
        if (!confirm('Randevuyu iptal etmek istediğinize emin misiniz?')) {
            return;
        }

        await window.db.collection('appointments').doc(id).update({
            status: 'cancelled',
            cancelledAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        location.reload();
    } catch (error) {
        console.error('Randevu iptal edilirken hata:', error);
        alert('Randevu iptal edilirken bir hata oluştu');
    }
}

// Yardımcı fonksiyonlar
function formatDate(date) {
    return new Intl.DateTimeFormat('tr-TR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(date);
}

// Filtreleme olaylarını ayarla
function setupFilterListeners() {
    const statusFilter = document.getElementById('statusFilter');
    const dateFilter = document.getElementById('dateFilter');

    if (statusFilter) {
        statusFilter.addEventListener('change', applyFilters);
    }

    if (dateFilter) {
        dateFilter.addEventListener('change', applyFilters);
    }
}

// Filtreleri uygula
async function applyFilters() {
    const statusFilter = document.getElementById('statusFilter')?.value;
    const dateFilter = document.getElementById('dateFilter')?.value;

    try {
        const user = await window.authService.getCurrentUser();
        if (!user) return;

        const userType = await window.authService.checkUserType(user.uid);
        
        let query = window.db.collection('appointments');

        // Kullanıcı tipine göre filtrele
        if (userType === 'customer') {
            query = query.where('customerId', '==', user.uid);
        } else if (userType === 'barber') {
            query = query.where('barberId', '==', user.uid);
        }

        // Duruma göre filtrele
        if (statusFilter && statusFilter !== 'all') {
            query = query.where('status', '==', statusFilter);
        }

        // Tarihe göre filtrele
        if (dateFilter) {
            const startDate = new Date(dateFilter);
            startDate.setHours(0, 0, 0, 0);
            
            const endDate = new Date(dateFilter);
            endDate.setHours(23, 59, 59, 999);

            query = query.where('date', '>=', startDate)
                        .where('date', '<=', endDate);
        }

        // Tarihe göre sırala
        query = query.orderBy('date', 'desc');

        const appointments = await query.get();
        
        const appointmentsContainer = document.getElementById('appointmentsContainer');
        if (!appointmentsContainer) return;

        if (appointments.empty) {
            appointmentsContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-calendar-times"></i>
                    <p>Randevu bulunamadı</p>
                </div>
            `;
            return;
        }

        appointmentsContainer.innerHTML = '';
        appointments.forEach(doc => {
            const appointment = doc.data();
            const appointmentElement = createAppointmentElement(doc.id, appointment, userType);
            appointmentsContainer.appendChild(appointmentElement);
        });

    } catch (error) {
        console.error('Filtreler uygulanırken hata:', error);
        alert('Filtreler uygulanırken bir hata oluştu');
    }
} 