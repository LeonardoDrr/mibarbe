// ============================================================
// LÓGICA DE TIENDA (store.js)
// Carga productos desde la colección 'productos' en Firestore
// ============================================================

document.addEventListener('DOMContentLoaded', async () => {
    document.title = `${APP_CONFIG.shop.name} - Tienda`;
    document.getElementById('nav-shop-name').textContent = APP_CONFIG.shop.name;
    document.getElementById('footer-shop-name').textContent = APP_CONFIG.shop.name;
    document.getElementById('footer-address').textContent = APP_CONFIG.shop.address;
    const yearEl = document.getElementById('current-year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    if (APP_CONFIG.map) {
        const mapHtml = `<iframe width="100%" height="100%" frameborder="0" style="border:0" src="https://maps.google.com/maps?q=${APP_CONFIG.map.lat},${APP_CONFIG.map.lng}&z=15&output=embed" allowfullscreen></iframe>`;
        const mapContainer = document.getElementById('footer-map');
        if (mapContainer) mapContainer.innerHTML = mapHtml;
    }

    const menuToggle = document.getElementById('menu-toggle');
    const navbarNav = document.getElementById('navbar-nav');
    menuToggle.addEventListener('click', () => {
        navbarNav.classList.toggle('active');
    });

    if (!firebase.apps.length) {
        firebase.initializeApp(APP_CONFIG.firebase);
    }
    const db = firebase.firestore();

    loadProducts(db);
});

function getImageUrl(item, width = 600) {
    if (item.imageUrl && item.imageUrl.startsWith('http')) return item.imageUrl;
    if (item.imagePublicId) return `https://res.cloudinary.com/${APP_CONFIG.cloudinary.cloudName}/image/upload/c_thumb,w_${width},q_auto,f_auto/${item.imagePublicId}`;
    return 'https://placehold.co/600x400/1f1f1f/c9a84c?text=Producto';
}

async function loadProducts(db) {
    const container = document.getElementById('products-container');

    try {
        const snapshot = await db.collection('products')
            .where('isActive', '==', true)
            .get();
        
        let products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Ordenar alfabéticamente por nombre
        products.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'es'));

        container.innerHTML = ''; 

        if (products.length === 0) {
            container.innerHTML = '<p class="text-muted text-center" style="grid-column: 1/-1;">Aún no hay productos en la tienda.</p>';
            return;
        }

        products.forEach(prod => {
            const card = document.createElement('div');
            card.className = 'card';
            
            const imageUrl = getImageUrl(prod);
            const priceStr = `${APP_CONFIG.shop.currency}${prod.price}`;
            
            // Botón de WhatsApp para comprar
            const msg = `Hola, quiero comprar el producto: ${prod.name}.`;
            const waUrl = `https://wa.me/${APP_CONFIG.shop.whatsappNumber}?text=${encodeURIComponent(msg)}`;

            card.innerHTML = `
                <div class="card-img-wrapper">
                    <img src="${imageUrl}" alt="${prod.name}" class="card-img">
                </div>
                <div class="card-body">
                    <h3 class="card-title">${prod.name}</h3>
                    <p class="text-muted" style="font-size: 0.9rem; margin-bottom: 1rem;">
                        <i class="fa-solid fa-box"></i> Stock: ${prod.stock}
                    </p>
                    <p class="text-muted">${prod.description || 'Sin descripción'}</p>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 1rem;">
                        <span class="card-price">${priceStr}</span>
                        <a href="${waUrl}" target="_blank" class="btn btn-outline" style="padding: 0.5rem 1rem; font-size: 0.9rem;">
                            <i class="fa-brands fa-whatsapp"></i> Comprar
                        </a>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });

    } catch (error) {
        console.error("Error cargando productos:", error);
        container.innerHTML = '<p class="text-error text-center" style="grid-column: 1/-1;">Hubo un error cargando los productos. Intenta nuevamente.</p>';
    }
}
