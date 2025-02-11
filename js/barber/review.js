import { auth, db } from '../config.js';
import { Review } from '../models/index.js';

// State
let currentBarber = null;
let reviews = [];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeAuth();
});

// Authentication
function initializeAuth() {
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            await loadInitialData();
        } else {
            window.location.href = '/barber/login.html';
        }
    });
}

// Data Loading
async function loadInitialData() {
    try {
        await Promise.all([
            loadBarberData(),
            loadReviews()
        ]);
    } catch (error) {
        console.error('Error loading initial data:', error);
        showToast('Veriler yüklenirken hata oluştu', 'error');
    }
}

async function loadBarberData() {
    try {
        if (!auth.currentUser) return;
        const barberDoc = await db.collection('barbers').doc(auth.currentUser.uid).get();
        if (barberDoc.exists) {
            currentBarber = barberDoc.data();
            currentBarber.id = barberDoc.id;
            updateBarberUI();
        }
    } catch (error) {
        console.error('Error loading barber data:', error);
        showToast('Berber bilgileri yüklenirken hata oluştu', 'error');
    }
}

async function loadReviews() {
    try {
        if (!auth.currentUser) return;
        const snapshot = await db.collection('reviews')
            .where('barberId', '==', auth.currentUser.uid)
            .orderBy('createdAt', 'desc')
            .get();

        reviews = snapshot.docs.map(doc => Review.fromFirestore(doc));
        updateReviewsUI();
    } catch (error) {
        console.error('Error loading reviews:', error);
        showToast('Değerlendirmeler yüklenirken hata oluştu', 'error');
    }
}

// UI Updates
function updateBarberUI() {
    if (!currentBarber) return;

    const ratingElement = document.querySelector('.rating');
    if (ratingElement) {
        ratingElement.innerHTML = `
            <div class="stars" style="--rating: ${currentBarber.rating || 0}"></div>
            <span>(${currentBarber.reviewCount || 0} değerlendirme)</span>
        `;
    }
}

function updateReviewsUI() {
    const reviewsList = document.querySelector('.reviews-list');
    if (!reviewsList) return;

    if (reviews.length === 0) {
        reviewsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-star"></i>
                <p>Henüz değerlendirme yapılmamış</p>
            </div>
        `;
        return;
    }

    reviewsList.innerHTML = reviews.map(review => `
        <div class="review-card">
            <div class="review-header">
                <div class="review-rating">
                    <div class="stars" style="--rating: ${review.rating}"></div>
                    <span class="review-date">${formatDate(review.createdAt)}</span>
                </div>
            </div>
            ${review.comment ? `
                <div class="review-comment">
                    <p>${review.comment}</p>
                </div>
            ` : ''}
            <div class="review-footer">
                <button class="btn btn-danger btn-sm" onclick="deleteReview('${review.id}')">
                    <i class="fas fa-trash"></i>
                    Sil
                </button>
            </div>
        </div>
    `).join('');
}

// Actions
async function deleteReview(reviewId) {
    if (!confirm('Bu değerlendirmeyi silmek istediğinize emin misiniz?')) return;

    try {
        await db.collection('reviews').doc(reviewId).delete();
        showToast('Değerlendirme başarıyla silindi');
        await loadReviews();
    } catch (error) {
        console.error('Error deleting review:', error);
        showToast('Değerlendirme silinirken hata oluştu', 'error');
    }
}

// Helpers
function formatDate(date) {
    if (!date) return '';
    return date.toLocaleDateString('tr-TR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
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