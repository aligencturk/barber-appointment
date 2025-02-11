// Event Listeners
document.addEventListener('click', (e) => {
    const target = e.target.closest('[data-action]');
    if (!target) return;

    const action = target.dataset.action;
    switch (action) {
        case 'customer-login':
            window.location.href = '/customer/login.html';
            break;
        case 'barber-login':
            window.location.href = '/barber/login.html';
            break;
        case 'new-appointment':
            handleNewAppointment();
            break;
    }
});

// Handle New Appointment
function handleNewAppointment() {
    const user = window.auth.currentUser;
    if (!user) {
        window.location.href = '/customer/login.html';
        return;
    }

    checkUserType(user.uid).then(userType => {
        if (userType === 'customer') {
            window.location.href = '/customer/new-appointment.html';
        } else {
            showToast('Bu özellik sadece müşteriler için geçerlidir.', 'error');
        }
    });
}

// Initialize Auth State
window.auth.onAuthStateChanged(async (user) => {
    // Ana sayfa değilse işlem yapma
    if (!window.location.pathname.endsWith('index.html') && 
        window.location.pathname !== '/' && 
        window.location.pathname !== '') {
        return;
    }

    const guestButtons = document.getElementById('guestButtons');
    const customerMenu = document.getElementById('customerMenu');

    if (user) {
        try {
            const userType = await checkUserType(user.uid);
            if (userType === 'customer') {
                // Müşteri bilgilerini al
                const customerDoc = await window.db.collection('customers').doc(user.uid).get();
                const customerData = customerDoc.data();

                if (guestButtons) guestButtons.style.display = 'none';
                if (customerMenu) {
                    customerMenu.style.display = 'flex';
                    const userName = document.getElementById('userName');
                    if (userName) {
                        userName.textContent = customerData.fullName || 'Kullanıcı';
                    }
                }
            } else if (userType === 'barber') {
                window.location.href = '/barber/dashboard.html';
            } else if (user.email === 'admin@berberotomasyon.com') {
                window.location.href = '/admin/dashboard.html';
            }
        } catch (error) {
            console.error('Error checking user type:', error);
        }
    } else {
        if (guestButtons) guestButtons.style.display = 'flex';
        if (customerMenu) customerMenu.style.display = 'none';
    }
});

// Check User Type
async function checkUserType(uid) {
    try {
        const customerDoc = await window.db.collection('customers').doc(uid).get();
        if (customerDoc.exists) {
            return 'customer';
        }
        
        const barberDoc = await window.db.collection('barbers').doc(uid).get();
        if (barberDoc.exists) {
            return 'barber';
        }
        
        return null;
    } catch (error) {
        console.error('Error checking user type:', error);
        return null;
    }
}

// Toast Function
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Çıkış Fonksiyonu
async function logout() {
    try {
        await window.auth.signOut();
        window.location.href = '/';
    } catch (error) {
        console.error('Çıkış hatası:', error);
        showToast('Çıkış yapılırken bir hata oluştu', 'error');
    }
}

// Smooth Scroll
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Intersection Observer for Animations
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('animate');
            observer.unobserve(entry.target);
        }
    });
}, {
    threshold: 0.1
});

// Observe elements for animation
document.addEventListener('DOMContentLoaded', () => {
    // Hero content animation
    const heroContent = document.querySelector('.hero-content');
    if (heroContent) {
        heroContent.style.opacity = '0';
        heroContent.style.transform = 'translateY(20px)';
        setTimeout(() => {
            heroContent.style.transition = 'all 1s ease';
            heroContent.style.opacity = '1';
            heroContent.style.transform = 'translateY(0)';
        }, 200);
    }

    // Feature cards animation
    const featureCards = document.querySelectorAll('.feature-card');
    featureCards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        setTimeout(() => {
            card.style.transition = 'all 0.6s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, 400 + (index * 200));
    });

    // Steps animation
    const steps = document.querySelectorAll('.step');
    steps.forEach((step, index) => {
        step.style.opacity = '0';
        step.style.transform = 'translateY(20px)';
        setTimeout(() => {
            step.style.transition = 'all 0.6s ease';
            step.style.opacity = '1';
            step.style.transform = 'translateY(0)';
        }, 600 + (index * 200));
    });

    // CTA section animation
    const cta = document.querySelector('.cta');
    if (cta) {
        observer.observe(cta);
    }
});

// Mobile Menu Toggle
const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
const nav = document.querySelector('.nav');

if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener('click', () => {
        nav.classList.toggle('active');
    });
}

// Giriş yap
async function login() {
    try {
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        await window.auth.signInWithEmailAndPassword(email, password);
    } catch (error) {
        console.error('Giriş hatası:', error);
        showToast('Giriş yapılırken bir hata oluştu', 'error');
    }
} 