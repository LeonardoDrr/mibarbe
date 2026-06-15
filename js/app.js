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

    // 2. Inicializar Firebase
    if (!firebase.apps.length) {
        firebase.initializeApp(APP_CONFIG.firebase);
    }
    const db = firebase.firestore();

    // 3. Cargar Servicios desde Firestore
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
            const card = document.createElement('div');
            card.className = 'card';
            
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
            container.appendChild(card);
        });

    } catch (error) {
        console.error("Error cargando servicios:", error);
        container.innerHTML = '<p class="text-error text-center" style="grid-column: 1/-1;">Hubo un error cargando los servicios. Intenta nuevamente.</p>';
    }
}
