import { auth, db } from '../firebase.js';
import { doc, getDoc, addDoc, updateDoc, collection } from 'firebase/firestore';
import { Review } from '../models/index.js';

let selectedRating = 0;
let currentAppointment = null;

// Değerlendirme modalını aç
export async function openReviewModal(appointmentId) {
    try {
        // Randevu bilgilerini al
        const appointmentDoc = await getDoc(doc(db, 'appointments', appointmentId));
        if (!appointmentDoc.exists()) {
            showToast('Randevu bulunamadı', 'error');
            return;
        }

        currentAppointment = appointmentDoc.data();
        currentAppointment.id = appointmentDoc.id;

        // Modal içeriğini hazırla
        const modal = document.createElement('div');
        modal.className = 'modal review-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Değerlendirme Yap</h2>
                    <button class="close-modal" onclick="closeReviewModal()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <form id="reviewForm">
                        <div class="rating-container">
                            <label>Puanınız</label>
                            <div class="rating-input">
                                ${Array.from({ length: 5 }, (_, i) => `
                                    <i class="fas fa-star" data-rating="${i + 1}"></i>
                                `).join('')}
                            </div>
                        </div>
                        <div class="form-group">
                            <label for="reviewComment">Yorumunuz</label>
                            <textarea id="reviewComment" 
                                    name="comment" 
                                    rows="4" 
                                    placeholder="Deneyiminizi paylaşın..."></textarea>
                        </div>
                        <div class="modal-footer">
                            <button type="submit" class="submit-btn">
                                <i class="fas fa-paper-plane"></i>
                                Değerlendirmeyi Gönder
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        // Modalı sayfaya ekle
        document.body.appendChild(modal);
        setTimeout(() => modal.classList.add('active'), 100);

        // Event listener'ları ekle
        setupReviewEventListeners(modal);
    } catch (error) {
        console.error('Değerlendirme modalı açılırken hata:', error);
        showToast('Değerlendirme modalı açılırken bir hata oluştu', 'error');
    }
}

// Event listener'ları ayarla
function setupReviewEventListeners(modal) {
    // Yıldız derecelendirme
    const stars = modal.querySelectorAll('.rating-input i');
    stars.forEach(star => {
        star.addEventListener('click', () => {
            const rating = parseInt(star.dataset.rating);
            selectedRating = rating;
            
            stars.forEach(s => {
                if (parseInt(s.dataset.rating) <= rating) {
                    s.classList.add('active');
                } else {
                    s.classList.remove('active');
                }
            });
        });

        star.addEventListener('mouseover', () => {
            const rating = parseInt(star.dataset.rating);
            stars.forEach(s => {
                if (parseInt(s.dataset.rating) <= rating) {
                    s.classList.add('hover');
                } else {
                    s.classList.remove('hover');
                }
            });
        });

        star.addEventListener('mouseout', () => {
            stars.forEach(s => {
                s.classList.remove('hover');
                if (parseInt(s.dataset.rating) <= selectedRating) {
                    s.classList.add('active');
                } else {
                    s.classList.remove('active');
                }
            });
        });
    });

    // Form gönderimi
    const form = modal.querySelector('#reviewForm');
    form.addEventListener('submit', submitReview);
}

// Değerlendirmeyi gönder
async function submitReview(event) {
    event.preventDefault();

    if (selectedRating === 0) {
        showToast('Lütfen bir puan seçin', 'error');
        return;
    }

    try {
        const review = new Review({
            appointmentId: currentAppointment.id,
            barberId: currentAppointment.barberId,
            customerId: auth.currentUser.uid,
            rating: selectedRating,
            comment: event.target.comment.value.trim()
        });

        // Değerlendirmeyi kaydet
        const reviewRef = await addDoc(collection(db, 'reviews'), review.toFirestore());

        // Randevuyu güncelle
        await updateDoc(doc(db, 'appointments', currentAppointment.id), {
            reviewed: true
        });

        // Berber puanını güncelle
        const barberRef = doc(db, 'barbers', currentAppointment.barberId);
        const barberDoc = await getDoc(barberRef);
        const barber = barberDoc.data();

        const newRating = ((barber.rating || 0) * (barber.reviewCount || 0) + selectedRating) / ((barber.reviewCount || 0) + 1);
        await updateDoc(barberRef, {
            rating: newRating,
            reviewCount: (barber.reviewCount || 0) + 1
        });

        showToast('Değerlendirmeniz başarıyla kaydedildi', 'success');
        closeReviewModal();

        // Sayfayı yenile
        window.dispatchEvent(new CustomEvent('reviewSubmitted'));
    } catch (error) {
        console.error('Değerlendirme gönderilirken hata:', error);
        showToast('Değerlendirme gönderilirken bir hata oluştu', 'error');
    }
}

// Değerlendirme modalını kapat
export function closeReviewModal() {
    const modal = document.querySelector('.review-modal');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => modal.remove(), 300);
    }
}

// Toast mesajı göster
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type} show`;
    toast.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
} 