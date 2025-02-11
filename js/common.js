// Slider Fonksiyonu
const initSlider = () => {
    const slides = document.querySelectorAll('.slide-item');
    if (!slides.length) return;

    let currentSlide = 0;
    const totalSlides = slides.length;

    const showSlide = (index) => {
        slides.forEach(slide => {
            slide.classList.remove('active');
        });
        slides[index].classList.add('active');
    };

    const nextSlide = () => {
        currentSlide = (currentSlide + 1) % totalSlides;
        showSlide(currentSlide);
    };

    // İlk slide'ı göster
    showSlide(0);

    // Her 3 saniyede bir sonraki slide'a geç
    setInterval(nextSlide, 3000);
};

// Sayfa yüklendiğinde slider'ı başlat
document.addEventListener('DOMContentLoaded', initSlider); 