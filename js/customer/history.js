// Firebase değişkenleri
let auth;
let db;

// State
let appointments = [];

// Initialize
function initializeFirebase() {
    // Firebase yüklenene kadar bekle
    const checkFirebase = setInterval(() => {
        if (window.auth && window.db) {
            clearInterval(checkFirebase);
            
            auth = window.auth;
            db = window.db;
            
            // Auth durumunu dinle
            auth.onAuthStateChanged(async (user) => {
                if (user) {
                    await initializePage();
                } else {
                    window.location.href = '/customer/login.html';
                }
            });
        }
    }, 100);
}

// Sayfa yüklendiğinde başlat
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeFirebase);
} else {
    initializeFirebase();
}

async function initializePage() {
    try {
        await loadAppointments();
    } catch (error) {
        console.error('Error initializing page:', error);
        showToast('Sayfa yüklenirken hata oluştu', 'error');
    }
}

async function loadAppointments() {
    try {
        const user = auth.currentUser;
        if (!user) return;

        const appointmentsSnapshot = await db.collection('appointments')
            .where('customerId', '==', user.uid)
            .orderBy('date', 'desc')
            .orderBy('time', 'desc')
            .get();

        appointments = [];
        for (const doc of appointmentsSnapshot.docs) {
            if (doc.exists) {
                appointments.push({
                    id: doc.id,
                    ...doc.data()
                });
            }
        }

        updateAppointmentsUI();
    } catch (error) {
        console.error('Randevular yüklenirken hata:', error);
        showToast('Randevular yüklenirken hata oluştu', 'error');
    }
}

function updateAppointmentsUI() {
    const appointmentsList = document.querySelector('.appointments-list');
    if (!appointmentsList) return;

    if (appointments.length === 0) {
        appointmentsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-calendar-times"></i>
                <p>Henüz randevu geçmişiniz bulunmuyor</p>
            </div>
        `;
        return;
    }

    appointmentsList.innerHTML = appointments.map(appointment => `
        <div class="appointment-card">
            <div class="appointment-header">
                <h3>${appointment.barberName || 'İsimsiz Berber'}</h3>
                <span class="status-badge ${getStatusClass(appointment.status)}">
                    ${formatStatus(appointment.status)}
                </span>
            </div>
            <div class="appointment-details">
                <div class="detail-item">
                    <i class="fas fa-calendar"></i>
                    <span>${formatDate(appointment.date)}</span>
                </div>
                <div class="detail-item">
                    <i class="fas fa-clock"></i>
                    <span>${formatTime(appointment.time)}</span>
                </div>
            </div>
            <div class="appointment-services">
                ${appointment.services.map(service => `
                    <div class="service-item">
                        <span class="service-name">${service.name}</span>
                        <div class="service-details">
                            <span>${service.duration} dk</span>
                            <span>${formatPrice(service.price)}</span>
                        </div>
                    </div>
                `).join('')}
            </div>
            ${appointment.note ? `
                <div class="appointment-note">
                    <i class="fas fa-sticky-note"></i>
                    <p>${appointment.note}</p>
                </div>
            ` : ''}
            ${appointment.status === 'completed' && !appointment.reviewed ? `
                <div class="appointment-actions">
                    <button class="btn btn-primary" onclick="showReviewModal('${appointment.id}')">
                        <i class="fas fa-star"></i>
                        Değerlendir
                    </button>
                </div>
            ` : ''}
        </div>
    `).join('');
}

function showReviewModal(appointmentId) {
    const appointment = appointments.find(a => a.id === appointmentId);
    if (!appointment) return;

    const modal = document.getElementById('reviewModal');
    if (!modal) return;

    const form = modal.querySelector('#reviewForm');
    if (form) {
        form.dataset.appointmentId = appointmentId;
        form.reset();
    }

    modal.classList.add('show');
}

async function submitReview(e) {
    e.preventDefault();

    const form = e.target;
    const appointmentId = form.dataset.appointmentId;
    const rating = parseInt(form.querySelector('input[name="rating"]:checked')?.value);
    const comment = form.querySelector('textarea[name="comment"]').value.trim();

    if (!rating) {
        showToast('Lütfen bir puan seçin', 'error');
        return;
    }

    try {
        const appointment = appointments.find(a => a.id === appointmentId);
        if (!appointment) throw new Error('Randevu bulunamadı');

        // Değerlendirmeyi kaydet
        await db.collection('reviews').add({
            appointmentId,
            barberId: appointment.barberId,
            customerId: auth.currentUser.uid,
            rating,
            comment,
            createdAt: new Date()
        });

        // Randevuyu güncelle
        await db.collection('appointments').doc(appointmentId).update({
            reviewed: true,
            updatedAt: new Date()
        });

        // Berber puanını güncelle
        const barberDoc = await db.collection('barbers').doc(appointment.barberId).get();
        if (barberDoc.exists) {
            const barberData = barberDoc.data();
            const currentRating = barberData.rating || 0;
            const reviewCount = barberData.reviewCount || 0;
            const newRating = ((currentRating * reviewCount) + rating) / (reviewCount + 1);

            await db.collection('barbers').doc(appointment.barberId).update({
                rating: newRating,
                reviewCount: reviewCount + 1,
                updatedAt: new Date()
            });
        }

        closeModal('reviewModal');
        showToast('Değerlendirmeniz için teşekkürler');
        await loadAppointments();
    } catch (error) {
        console.error('Error submitting review:', error);
        showToast('Değerlendirme gönderilirken hata oluştu', 'error');
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('show');
    }
}

// Helpers
function formatDate(date) {
    if (!date) return '';
    if (typeof date === 'string') {
        date = new Date(date);
    }
    return date.toLocaleDateString('tr-TR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function formatTime(time) {
    if (!time) return '';
    return time;
}

function formatPrice(price) {
    if (!price) return '₺0';
    return `₺${price.toLocaleString('tr-TR')}`;
}

function formatStatus(status) {
    const statusMap = {
        'pending': 'Bekliyor',
        'confirmed': 'Onaylandı',
        'completed': 'Tamamlandı',
        'cancelled': 'İptal Edildi'
    };
    return statusMap[status] || status;
}

function getStatusClass(status) {
    const statusMap = {
        'pending': 'warning',
        'confirmed': 'info',
        'completed': 'success',
        'cancelled': 'danger'
    };
    return statusMap[status] || 'secondary';
}

function showToast(message, type = 'success', autoHide = true) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 100);
    
    if (autoHide) {
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
    
    return toast;
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    const reviewForm = document.getElementById('reviewForm');
    if (reviewForm) {
        reviewForm.addEventListener('submit', submitReview);
    }

    // Modal kapatma butonları
    document.querySelectorAll('.close-modal').forEach(button => {
        button.addEventListener('click', () => {
            const modal = button.closest('.modal');
            if (modal) {
                closeModal(modal.id);
            }
        });
    });

    // Modal dışına tıklandığında kapatma
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal(modal.id);
            }
        });
    });
}); 