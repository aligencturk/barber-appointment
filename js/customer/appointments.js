// Yükleme göstergesi fonksiyonları
function showLoading(message = 'Yükleniyor...') {
    Swal.fire({
        title: message,
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        willOpen: () => {
            Swal.showLoading();
        }
    });
}

function hideLoading() {
    Swal.close();
}

// Tarih formatlama fonksiyonu
const formatDate = (dateString) => {
    const options = { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        weekday: 'long'
    };
    return new Date(dateString).toLocaleDateString('tr-TR', options);
};

// DOM elementlerini seç
const appointmentsGrid = document.getElementById('appointmentsGrid');
const searchInput = document.getElementById('searchInput');
const searchButton = document.querySelector('.search-box i.fa-search');
let allAppointments = [];
let lastSearchTerm = '';

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

        // Randevuları yükle
        await loadAppointments();
    } catch (error) {
        console.error('Kullanıcı kontrolü hatası:', error);
        window.location.href = '/customer/login.html';
    }
});

// Randevuları yükle
async function loadAppointments() {
    if (!appointmentsGrid) {
        console.error('appointmentsGrid elementi bulunamadı');
        return;
    }

    try {
        showLoading('Randevularınız yükleniyor...');
        console.log('Randevular yükleniyor...'); // Debug log

        const userId = window.auth.currentUser.uid;
        console.log('Kullanıcı ID:', userId); // Debug log

        // Tüm randevuları getir
        const appointmentsSnapshot = await window.db.collection('appointments')
            .where('customerId', '==', userId)
            .orderBy('date', 'desc')
            .get();

        console.log('Bulunan randevu sayısı:', appointmentsSnapshot.size); // Debug log

        if (appointmentsSnapshot.empty) {
            console.log('Randevu bulunamadı'); // Debug log
            appointmentsGrid.innerHTML = `
                <div class="no-appointments">
                    <i class="fas fa-calendar-xmark"></i>
                    <p>Henüz randevunuz bulunmuyor.</p>
                    <a href="/customer/new-appointment.html" class="new-appointment-btn">
                        <i class="fas fa-plus"></i>
                        Yeni Randevu Al
                    </a>
                </div>
            `;
            hideLoading();
            return;
        }

        // Randevuları grupla
        const appointments = {
            active: [], // Onaylanmış ve bekleyen
            past: [],  // Tamamlanmış
            cancelled: [] // İptal edilmiş
        };

        const now = new Date();

        // Randevuları grupla
        for (const doc of appointmentsSnapshot.docs) {
            const appointment = { id: doc.id, ...doc.data() };
            const appointmentDate = new Date(appointment.date + 'T' + appointment.time);

            // Berber bilgilerini getir
            if (appointment.barberId) {
                const barberDoc = await window.db.collection('barbers').doc(appointment.barberId).get();
                if (barberDoc.exists) {
                    appointment.barberName = barberDoc.data().businessName;
                }
            }

            if (appointment.status === 'cancelled') {
                appointments.cancelled.push(appointment);
            } else if (appointmentDate < now) {
                appointments.past.push(appointment);
            } else {
                appointments.active.push(appointment);
            }
        }

        // HTML oluştur
        let html = '';

        // Aktif Randevular
        if (appointments.active.length > 0) {
            html += `
                <div class="appointments-section active-appointments">
                    <h3><i class="fas fa-calendar-check"></i> Aktif Randevularınız</h3>
                    <div class="appointments-grid">
                        ${appointments.active.map(appointment => createAppointmentCard(appointment)).join('')}
                    </div>
                </div>
            `;
        }

        // Geçmiş Randevular
        if (appointments.past.length > 0) {
            html += `
                <div class="appointments-section past-appointments">
                    <h3><i class="fas fa-calendar-days"></i> Geçmiş Randevularınız</h3>
                    <div class="appointments-grid">
                        ${appointments.past.map(appointment => createAppointmentCard(appointment)).join('')}
                    </div>
                </div>
            `;
        }

        // İptal Edilen Randevular
        if (appointments.cancelled.length > 0) {
            html += `
                <div class="appointments-section cancelled-appointments">
                    <h3><i class="fas fa-calendar-xmark"></i> İptal Edilen Randevular</h3>
                    <div class="appointments-grid">
                        ${appointments.cancelled.map(appointment => createAppointmentCard(appointment)).join('')}
                    </div>
                </div>
            `;
        }

        if (!html) {
            html = `
                <div class="no-appointments">
                    <i class="fas fa-calendar-xmark"></i>
                    <p>Henüz randevunuz bulunmuyor.</p>
                    <a href="/customer/new-appointment.html" class="new-appointment-btn">
                        <i class="fas fa-plus"></i>
                        Yeni Randevu Al
                    </a>
                </div>
            `;
        }

        appointmentsGrid.innerHTML = html;
        hideLoading();

        // Tüm randevuları sakla
        allAppointments = [...appointments.active, ...appointments.past, ...appointments.cancelled];

    } catch (error) {
        console.error('Randevular yüklenirken hata:', error);
        appointmentsGrid.innerHTML = `
            <div class="error-state">
                <i class="fas fa-exclamation-circle"></i>
                <p>Randevular yüklenirken bir hata oluştu</p>
                <button onclick="loadAppointments()" class="retry-btn">
                    <i class="fas fa-sync"></i>
                    Tekrar Dene
                </button>
            </div>
        `;
        hideLoading();
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

// Randevu kartı oluştur
function createAppointmentCard(appointment) {
    const appointmentDate = new Date(appointment.date + 'T' + appointment.time);
    const formattedDate = formatDate(appointmentDate);
    
    const statusClasses = {
        'pending': 'pending',
        'confirmed': 'confirmed',
        'completed': 'completed',
        'cancelled': 'cancelled'
    };

    const statusTexts = {
        'pending': 'Onay Bekliyor',
        'confirmed': 'Onaylandı',
        'completed': 'Tamamlandı',
        'cancelled': 'İptal Edildi'
    };

    const statusIcons = {
        'pending': 'fa-clock',
        'confirmed': 'fa-check',
        'completed': 'fa-check-double',
        'cancelled': 'fa-times'
    };

    // İptal nedeni HTML'i
    const cancellationHtml = appointment.status === 'cancelled' && (appointment.cancellationReason || appointment.cancelNote) ? `
        <div class="cancellation-reason">
            <i class="fas fa-info-circle"></i>
            <p>
                <strong>İptal Nedeni:</strong> 
                ${appointment.cancellationReason || appointment.cancelNote}
                ${appointment.cancelledBy ? `<br><small>(${appointment.cancelledBy === 'barber' ? 'Berber tarafından iptal edildi' : 'Müşteri tarafından iptal edildi'})</small>` : ''}
            </p>
        </div>
    ` : '';

    return `
        <div class="appointment-card ${statusClasses[appointment.status]}">
            <div class="appointment-header">
                <div class="appointment-time">
                    <i class="fas fa-clock"></i>
                    ${appointment.time}
                </div>
                <div class="appointment-status">
                    <i class="fas ${statusIcons[appointment.status]}"></i>
                    ${statusTexts[appointment.status]}
                </div>
            </div>
            
            <div class="appointment-details">
                <div class="customer-info">
                    <div class="customer-name">
                        <i class="fas fa-user"></i>
                        ${appointment.customer?.name || 'İsimsiz Müşteri'}
                    </div>
                    <div class="customer-phone">
                        <i class="fas fa-phone"></i>
                        ${appointment.customer?.phone || 'Telefon bilgisi yok'}
                    </div>
                </div>

                <div class="barber-info">
                    <i class="fas fa-user-tie"></i>
                    ${appointment.barberName}
                </div>
                <div class="appointment-date">
                    <i class="fas fa-calendar"></i>
                    ${formattedDate}
                </div>
                <div class="services-list">
                    ${appointment.services.map(service => `
                        <span class="service-tag">
                            ${service.name}
                        </span>
                    `).join('')}
                </div>
                ${appointment.notes ? `
                    <div class="customer-notes">
                        <i class="fas fa-note-sticky"></i>
                        ${appointment.notes}
                    </div>
                ` : ''}
                ${cancellationHtml}
                <div class="appointment-total">
                    <span class="duration">
                        <i class="fas fa-clock"></i>
                        ${appointment.totalDuration} dakika
                    </span>
                    <span class="price">
                        <i class="fa-solid fa-turkish-lira-sign"></i>
                        ${appointment.totalPrice} TL
                    </span>
                </div>
            </div>
            
            ${appointment.status === 'pending' || appointment.status === 'confirmed' ? `
                <div class="appointment-actions">
                    <button onclick="cancelAppointment('${appointment.id}')" class="cancel-btn">
                        <i class="fas fa-times"></i>
                        İptal Et
                    </button>
                    <button onclick="rescheduleAppointment('${appointment.id}')" class="reschedule-btn">
                        <i class="fas fa-calendar-alt"></i>
                        Yeniden Planla
                    </button>
                </div>
            ` : ''}
        </div>
    `;
}

// Randevu iptal et
async function cancelAppointment(appointmentId) {
    try {
        const result = await Swal.fire({
            title: 'Randevu İptali',
            text: 'Bu randevuyu iptal etmek istediğinizden emin misiniz?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Evet, İptal Et',
            cancelButtonText: 'Vazgeç',
            confirmButtonColor: '#e74c3c',
            cancelButtonColor: '#7f8c8d'
        });

        if (result.isConfirmed) {
            showLoading('Randevunuz iptal ediliyor...');

            // İptal nedenini sor
            const reasonResult = await Swal.fire({
                title: 'İptal Nedeni',
                input: 'textarea',
                inputLabel: 'Lütfen iptal nedeninizi belirtin (Opsiyonel)',
                inputPlaceholder: 'İptal nedeninizi yazın...',
                showCancelButton: true,
                confirmButtonText: 'İptal Et',
                cancelButtonText: 'Vazgeç',
                confirmButtonColor: '#e74c3c',
                cancelButtonColor: '#7f8c8d'
            });

            if (reasonResult.isConfirmed) {
                // Randevuyu güncelle
                await window.db.collection('appointments').doc(appointmentId).update({
                    status: 'cancelled',
                    cancelledBy: 'customer',
                    cancelNote: reasonResult.value || '',
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                hideLoading();
                
                await Swal.fire({
                    title: 'Başarılı!',
                    text: 'Randevunuz başarıyla iptal edildi',
                    icon: 'success',
                    confirmButtonColor: '#2e86de'
                });

                // Randevuları yeniden yükle
                await loadAppointments();
            }
        }
    } catch (error) {
        console.error('Randevu iptal edilirken hata:', error);
        hideLoading();
        
        await Swal.fire({
            title: 'Hata!',
            text: 'Randevu iptal edilirken bir hata oluştu',
            icon: 'error',
            confirmButtonColor: '#2e86de'
        });
    }
}

// Randevuyu yeniden planla
async function rescheduleAppointment(appointmentId) {
    try {
        // Mevcut randevu bilgilerini al
        const appointmentDoc = await window.db.collection('appointments').doc(appointmentId).get();
        if (!appointmentDoc.exists) {
            throw new Error('Randevu bulunamadı');
        }

        const appointment = appointmentDoc.data();

        // Yeni randevu sayfasına yönlendir
        window.location.href = `/customer/new-appointment.html?action=reschedule&appointmentId=${appointmentId}&barberId=${appointment.barberId}&services=${JSON.stringify(appointment.services)}`;
    } catch (error) {
        console.error('Randevu yeniden planlanırken hata:', error);
        await Swal.fire({
            title: 'Hata!',
            text: 'Randevu yeniden planlanırken bir hata oluştu',
            icon: 'error',
            confirmButtonColor: '#2e86de'
        });
    }
}

// Arama işlevi
if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        if (searchTerm === lastSearchTerm) return;
        lastSearchTerm = searchTerm;

        if (!allAppointments.length) return;

        const filteredAppointments = allAppointments.filter(appointment => {
            return (
                appointment.barberName?.toLowerCase().includes(searchTerm) ||
                appointment.customer?.name?.toLowerCase().includes(searchTerm) ||
                appointment.customer?.phone?.includes(searchTerm) ||
                appointment.services.some(service => service.name.toLowerCase().includes(searchTerm))
            );
        });

        // Filtrelenmiş randevuları grupla ve göster
        const grouped = {
            active: filteredAppointments.filter(a => a.status === 'pending' || a.status === 'confirmed'),
            past: filteredAppointments.filter(a => a.status === 'completed'),
            cancelled: filteredAppointments.filter(a => a.status === 'cancelled')
        };

        let html = '';

        if (grouped.active.length > 0) {
            html += `
                <div class="appointments-section active-appointments">
                    <h3><i class="fas fa-calendar-check"></i> Aktif Randevularınız</h3>
                    <div class="appointments-grid">
                        ${grouped.active.map(appointment => createAppointmentCard(appointment)).join('')}
                    </div>
                </div>
            `;
        }

        if (grouped.past.length > 0) {
            html += `
                <div class="appointments-section past-appointments">
                    <h3><i class="fas fa-calendar-days"></i> Geçmiş Randevularınız</h3>
                    <div class="appointments-grid">
                        ${grouped.past.map(appointment => createAppointmentCard(appointment)).join('')}
                    </div>
                </div>
            `;
        }

        if (grouped.cancelled.length > 0) {
            html += `
                <div class="appointments-section cancelled-appointments">
                    <h3><i class="fas fa-calendar-xmark"></i> İptal Edilen Randevular</h3>
                    <div class="appointments-grid">
                        ${grouped.cancelled.map(appointment => createAppointmentCard(appointment)).join('')}
                    </div>
                </div>
            `;
        }

        if (!html) {
            html = `
                <div class="no-results">
                    <i class="fas fa-search"></i>
                    <p>Arama sonucunda randevu bulunamadı</p>
                </div>
            `;
        }

        appointmentsGrid.innerHTML = html;
    });
}

// Bildirimleri kontrol et ve göster
async function checkNotifications() {
    try {
        const user = window.auth.currentUser;
        if (!user) return;

        console.log('Bildirimler kontrol ediliyor...'); // Debug log

        // Okunmamış bildirimleri getir
        const notificationsRef = window.db.collection('notifications')
            .where('userId', '==', user.uid)
            .where('isRead', '==', false);

        console.log('Bildirim sorgusu oluşturuldu:', notificationsRef); // Debug log

        const notificationsSnapshot = await notificationsRef.get();

        console.log('Bildirimler alındı:', notificationsSnapshot.size); // Debug log

        if (!notificationsSnapshot.empty) {
            notificationsSnapshot.forEach(doc => {
                const notification = doc.data();
                
                // Toast bildirimi göster
                Swal.fire({
                    title: notification.title,
                    text: notification.message,
                    icon: notification.type || 'info',
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 5000,
                    timerProgressBar: true
                });

                // Bildirimi okundu olarak işaretle
                window.db.collection('notifications').doc(doc.id).update({
                    isRead: true,
                    readAt: new Date().toISOString()
                }).catch(error => {
                    console.error('Bildirim güncellenirken hata:', error);
                });
            });

            // Randevuları yeniden yükle
            await loadAppointments();
        }
    } catch (error) {
        console.error('Bildirimler kontrol edilirken hata detayı:', {
            code: error.code,
            message: error.message,
            stack: error.stack
        });
    }
}

// Randevuları kontrol et ve güncelle
async function checkAndUpdateAppointments() {
    try {
        // Kullanıcı oturumunu kontrol et
        const user = window.auth.currentUser;
        if (!user) {
            console.log('Kullanıcı oturumu bulunamadı');
            return;
        }

        const now = new Date();
        const today = now.toISOString().split('T')[0];
        const currentTime = now.getHours().toString().padStart(2, '0') + ':' + 
                          now.getMinutes().toString().padStart(2, '0');

        // Kullanıcının randevularını getir
        const appointmentsSnapshot = await window.db.collection('appointments')
            .where('customerId', '==', user.uid)
            .where('status', 'in', ['pending', 'confirmed'])
            .get();

        if (appointmentsSnapshot.empty) {
            console.log('Güncellenecek randevu bulunamadı');
            return;
        }

        const batch = window.db.batch();
        let hasUpdates = false;

        appointmentsSnapshot.forEach(doc => {
            const appointment = doc.data();
            const appointmentDate = appointment.date;
            const appointmentTime = appointment.time;

            // Randevu tarihi bugünden önceyse veya bugün ve saati geçmişse
            if (appointmentDate < today || (appointmentDate === today && appointmentTime < currentTime)) {
                console.log(`Randevu güncelleniyor: ${doc.id}`);
                const appointmentRef = window.db.collection('appointments').doc(doc.id);
                batch.update(appointmentRef, {
                    status: 'completed',
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                hasUpdates = true;
            }
        });

        if (hasUpdates) {
            await batch.commit();
            console.log('Randevular güncellendi');
            // Randevuları yeniden yükle
            await loadAppointments();
        }

    } catch (error) {
        console.error('Randevular kontrol edilirken hata:', error);
    }
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

// Firebase yüklenmesini bekle ve oturum durumunu kontrol et
document.addEventListener('DOMContentLoaded', () => {
    // Auth state observer zaten tanımlı olduğu için
    // burada sadece bildirimleri ve randevuları kontrol et
    const checkInterval = setInterval(async () => {
        try {
            const user = window.auth.currentUser;
            if (user) {
                await checkNotifications();
                await checkAndUpdateAppointments();
            }
        } catch (error) {
            console.error('Periyodik kontrol sırasında hata:', error);
        }
    }, 60000); // Her dakika kontrol et

    // Sayfa kapatıldığında interval'i temizle
    window.addEventListener('beforeunload', () => {
        clearInterval(checkInterval);
    });
}); 