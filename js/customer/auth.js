import { auth, db } from '../config.js';
import { Customer } from '../models/index.js';
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
        
        // Check if user is a customer
        const customerDoc = await getDoc(doc(db, 'customers', userCredential.user.uid));
        const customer = Customer.fromFirestore(customerDoc);
        
        if (!customer) {
            throw new Error('Bu hesap bir müşteri hesabı değil.');
        }
        
        // Redirect to customer dashboard
        window.location.href = '/customer/dashboard.html';
    } catch (error) {
        showError('Giriş yapılırken bir hata oluştu: ' + error.message);
    }
});

// Register form submit
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('registerName').value;
    const phone = document.getElementById('registerPhone').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const passwordConfirm = document.getElementById('registerPasswordConfirm').value;

    // Validate password match
    if (password !== passwordConfirm) {
        showError('Şifreler eşleşmiyor!');
        return;
    }

    try {
        // Create user
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        
        // Create customer model
        const customer = new Customer({
            id: userCredential.user.uid,
            email,
            fullName: name,
            phone
        });

        // Add user data to Firestore
        await setDoc(doc(db, 'customers', customer.id), customer.toFirestore());

        // Redirect to customer dashboard
        window.location.href = '/customer/dashboard.html';
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

// Check if user is already logged in
auth.onAuthStateChanged(async (user) => {
    if (user) {
        try {
            const customerDoc = await getDoc(doc(db, 'customers', user.uid));
            const customer = Customer.fromFirestore(customerDoc);
            if (customer) {
                window.location.href = '/customer/dashboard.html';
            }
        } catch (error) {
            console.error('Kullanıcı kontrolü yapılırken hata:', error);
        }
    }
}); 