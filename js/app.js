// ============================================================
// LÓGICA PRINCIPAL (index.html)
// Inicializa Firebase, carga información y servicios
// ============================================================

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Aplicar variables de configuración al DOM
    document.title = `${APP_CONFIG.shop.name} - Inicio`;
    document.getElementById('nav-shop-name').textContent = APP_CONFIG.shop.name;
    document.getElementById('footer-shop-name').textContent = APP_CONFIG.shop.name;
    document.getElementById('footer-address').textContent = APP_CONFIG.shop.address;
    document.getElementById('current-year').textContent = new Date().getFullYear();

    // Menu Mobile Toggle
    const menuToggle = document.getElementById('menu-toggle');
    const navbarNav = document.getElementById('navbar-nav');
    menuToggle.addEventListener('click', () => {
        navbarNav.classList.toggle('active');
    });

    // 2. Cargar Mapa de Google en el Footer
    if (APP_CONFIG.map) {
        const mapHtml = `<iframe width="100%" height="100%" frameborder="0" style="border:0" src="https://maps.google.com/maps?q=${APP_CONFIG.map.lat},${APP_CONFIG.map.lng}&z=15&output=embed" allowfullscreen></iframe>`;
        const mapContainer = document.getElementById('footer-map');
        if (mapContainer) mapContainer.innerHTML = mapHtml;
    }

    // 3. Inicializar Firebase
    if (!firebase.apps.length) {
        firebase.initializeApp(APP_CONFIG.firebase);
    }
    const db = firebase.firestore();

    // 4. Cargar Servicios desde Firestore
    loadServices(db);
});

// Generar URL de imagen optimizada de Cloudinary
function getCloudinaryUrl(publicId, width = 600) {
    if (!publicId) return 'https://placehold.co/600x400/1f1f1f/c9a84c?text=Servicio';
    return `https://res.cloudinary.com/${APP_CONFIG.cloudinary.cloudName}/image/upload/c_thumb,w_${width},q_auto,f_auto/${publicId}`;
}

async function loadServices(db) {
    const container = document.getElementById('services-container');

    try {
        const snapshot = await db.collection('services')
            .where('isActive', '==', true)
            .get();
        
        const services = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Ordenar en memoria
        services.sort((a, b) => (a.order || 0) - (b.order || 0));

        container.innerHTML = ''; // Limpiar loader

        if (services.length === 0) {
            container.innerHTML = '<p class="text-muted text-center" style="grid-column: 1/-1;">Aún no hay servicios disponibles.</p>';
            return;
        }

        services.forEach(service => {
            const slide = document.createElement('div');
            slide.className = 'swiper-slide';
            
            const card = document.createElement('div');
            card.className = 'card';
            card.style.height = '100%';
            
            const imageUrl = getCloudinaryUrl(service.imageId);
            const priceStr = `${APP_CONFIG.shop.currency}${service.price}`;

            card.innerHTML = `
                <div class="card-img-wrapper">
                    <img src="${imageUrl}" alt="${service.name}" class="card-img">
                </div>
                <div class="card-body">
                    <h3 class="card-title">${service.name}</h3>
                    <p class="text-muted" style="font-size: 0.9rem; margin-bottom: 1rem;">
                        <i class="fa-regular fa-clock"></i> ${service.durationMinutes} min
                    </p>
                    <p class="text-muted">${service.description || 'Sin descripción'}</p>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 1rem;">
                        <span class="card-price">${priceStr}</span>
                        <a href="reserva.html?service=${service.id}" class="btn btn-outline" style="padding: 0.5rem 1rem; font-size: 0.9rem;">
                            Reservar
                        </a>
                    </div>
                </div>
            `;
            slide.appendChild(card);
            container.appendChild(slide);
        });

        // Inicializar Swiper después de inyectar el DOM
        new Swiper(".mySwiper", {
            slidesPerView: 1.2,
            centeredSlides: true,
            spaceBetween: 20,
            loop: true,
            grabCursor: true,
            autoplay: {
                delay: 2500,
                disableOnInteraction: false,
            },
            breakpoints: {
                640: { slidesPerView: 2.2, spaceBetween: 20 },
                1024: { slidesPerView: 3.5, spaceBetween: 30 }
            }
        });

    } catch (error) {
        console.error("Error cargando servicios:", error);
        container.innerHTML = '<p class="text-error text-center" style="grid-column: 1/-1;">Hubo un error cargando los servicios. Intenta nuevamente.</p>';
    }
}
