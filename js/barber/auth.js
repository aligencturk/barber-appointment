import { auth, db } from '../config.js';
import { Barber } from '../models/index.js';
import { 
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    setPersistence,
    browserLocalPersistence,
    browserSessionPersistence
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

// DOM Elements
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const tabBtns = document.querySelectorAll('.tab-btn');
const togglePasswordBtns = document.querySelectorAll('.toggle-password');
const rememberMeCheckbox = document.getElementById('rememberMe');
const openingTimeSelect = document.getElementById('openingTime');
const closingTimeSelect = document.getElementById('closingTime');

// Initialize time slots
function initializeTimeSlots() {
    const hours = Array.from({ length: 24 }, (_, i) => {
        const hour = i.toString().padStart(2, '0');
        return `${hour}:00`;
    });

    // Add times to both selects
    hours.forEach(time => {
        openingTimeSelect.add(new Option(time, time));
        closingTimeSelect.add(new Option(time, time));
    });

    // Set default values
    openingTimeSelect.value = '09:00';
    closingTimeSelect.value = '19:00';
}

// Tab switching
tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.auth-form').forEach(form => form.classList.remove('active'));
        
        btn.classList.add('active');
        document.getElementById(btn.dataset.tab + 'Form').classList.add('active');
    });
});

// Toggle password visibility
togglePasswordBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const input = btn.previousElementSibling;
        const type = input.type === 'password' ? 'text' : 'password';
        input.type = type;
        btn.classList.toggle('fa-eye');
        btn.classList.toggle('fa-eye-slash');
    });
});

// Login form submit
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        // Set persistence based on "Remember Me" checkbox
        await setPersistence(auth, 
            rememberMeCheckbox.checked ? browserLocalPersistence : browserSessionPersistence
        );

        // Sign in
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        
        // Check if user is a barber
        const barberDoc = await getDoc(doc(db, 'barbers', userCredential.user.uid));
        const barber = Barber.fromFirestore(barberDoc);
        
        if (!barber) {
            throw new Error('Bu hesap bir berber hesabı değil.');
        }
        
        // Redirect to barber dashboard
        window.location.href = '/barber/dashboard.html';
    } catch (error) {
        showError('Giriş yapılırken bir hata oluştu: ' + error.message);
    }
});

// Register form submit
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const businessName = document.getElementById('registerName').value;
    const ownerName = document.getElementById('registerOwner').value;
    const phone = document.getElementById('registerPhone').value;
    const address = document.getElementById('registerAddress').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const passwordConfirm = document.getElementById('registerPasswordConfirm').value;
    const openingTime = openingTimeSelect.value;
    const closingTime = closingTimeSelect.value;

    // Validate password match
    if (password !== passwordConfirm) {
        showError('Şifreler eşleşmiyor!');
        return;
    }

    // Validate working hours
    if (openingTime >= closingTime) {
        showError('Kapanış saati açılış saatinden sonra olmalıdır!');
        return;
    }

    try {
        // Create user
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        
        // Create barber model
        const barber = new Barber({
            id: userCredential.user.uid,
            email,
            businessName,
            ownerName,
            phone,
            address,
            workingHours: {
                open: openingTime,
                close: closingTime
            },
            status: 'pending' // Berber hesabı onay bekliyor
        });

        // Add barber data to Firestore
        await setDoc(doc(db, 'barbers', barber.id), barber.toFirestore());

        // Show success message and redirect
        alert('Kaydınız alınmıştır. Hesabınız onaylandıktan sonra size bilgi verilecektir.');
        window.location.href = '/barber/dashboard.html';
    } catch (error) {
        showError('Kayıt olurken bir hata oluştu: ' + error.message);
    }
});

// Error handling
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;

    const activeForm = document.querySelector('.auth-form.active');
    activeForm.insertBefore(errorDiv, activeForm.firstChild);

    setTimeout(() => errorDiv.remove(), 3000);
}

// Initialize time slots on page load
initializeTimeSlots();

// Check if user is already logged in
auth.onAuthStateChanged(async (user) => {
    if (user) {
        try {
            const barberDoc = await getDoc(doc(db, 'barbers', user.uid));
            const barber = Barber.fromFirestore(barberDoc);
            if (barber) {
                window.location.href = '/barber/dashboard.html';
            }
        } catch (error) {
            console.error('Kullanıcı kontrolü yapılırken hata:', error);
        }
    }
}); 