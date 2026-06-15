// ============================================================
// LÓGICA DE ADMINISTRACIÓN (admin.js)
// Ver citas y catálogo desde Firestore
// ============================================================

let db;

document.addEventListener('DOMContentLoaded', async () => {
    document.getElementById('nav-shop-name').textContent = APP_CONFIG.shop.name;
    
    // Navegación por Tabs
    const links = document.querySelectorAll('.sidebar-link');
    const views = document.querySelectorAll('.admin-view');
    
    links.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('data-target');
            
            links.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            
            views.forEach(v => v.classList.remove('active'));
            document.getElementById(targetId).classList.add('active');
        });
    });

    // Inicializar Firebase
    if (!firebase.apps.length) {
        firebase.initializeApp(APP_CONFIG.firebase);
    }
    db = firebase.firestore();

    // Cargar Datos
    loadBookings();
    loadCatalog();
    loadAdminProducts();
    
    document.getElementById('btn-refresh-citas').addEventListener('click', loadBookings);
});

// ── CITAS ──
async function loadBookings() {
    const tbody = document.getElementById('table-citas');
    tbody.innerHTML = '<tr><td colspan="5" class="text-center"><span class="loader"></span></td></tr>';
    
    try {
        const snap = await db.collection('bookings').get();
        let bookings = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Ordenar en memoria: primero fecha descendente, luego timeSlot descendente
        bookings.sort((a, b) => {
            if (a.date !== b.date) return (b.date || '').localeCompare(a.date || '');
            return (b.timeSlot || '').localeCompare(a.timeSlot || '');
        });
        
        tbody.innerHTML = '';
        
        if (bookings.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No hay citas registradas.</td></tr>';
            return;
        }
        
        bookings.forEach(b => {
            const tr = document.createElement('tr');
            
            const statusClass = b.status === 'pending' ? 'status-pending' : 'status-completed';
            const statusText = b.status === 'pending' ? 'Pendiente' : 'Completado';
            
            tr.innerHTML = `
                <td>
                    <strong>${b.date}</strong><br>
                    <span class="text-muted"><i class="fa-regular fa-clock"></i> ${b.timeSlot}</span>
                </td>
                <td>${b.clientName}</td>
                <td>
                    <a href="https://wa.me/${b.clientPhone.replace(/[^0-9]/g, '')}" target="_blank" class="text-gold">
                        ${b.clientPhone}
                    </a>
                </td>
                <td>
                    ${b.serviceName}<br>
                    <span class="text-muted" style="font-size:0.85rem">${APP_CONFIG.shop.currency}${b.price}</span>
                </td>
                <td>
                    <span class="status-badge ${statusClass}">${statusText}</span>
                </td>
            `;
            tbody.appendChild(tr);
        });
        
    } catch (error) {
        console.error("Error cargando citas:", error);
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-error">Error cargando citas. Revisa las reglas de Firestore (es posible que requieran autenticación).</td></tr>';
    }
}

// ── CATÁLOGO ──
async function loadCatalog() {
    const tbody = document.getElementById('table-catalogo');
    
    try {
        const snap = await db.collection('services').get();
        let services = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Ordenar en memoria
        services.sort((a, b) => (a.order || 0) - (b.order || 0));
        
        tbody.innerHTML = '';
        
        if (services.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No hay servicios en el catálogo.</td></tr>';
            return;
        }
        
        services.forEach(s => {
            const tr = document.createElement('tr');
            const statusText = s.isActive ? '<span style="color:#10b981">Activo</span>' : '<span style="color:#ef4444">Inactivo</span>';
            
            tr.innerHTML = `
                <td>
                    <strong>${s.name}</strong>
                </td>
                <td class="text-gold" style="font-weight:bold">${APP_CONFIG.shop.currency}${s.price}</td>
                <td>${s.durationMinutes} min</td>
                <td>${statusText}</td>
            `;
            tbody.appendChild(tr);
        });
        
// ── PRODUCTOS (TIENDA) ──
async function loadAdminProducts() {
    const tbody = document.getElementById('table-productos');
    
    try {
        const snap = await db.collection('productos').get();
        let products = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        products.sort((a, b) => (a.order || 0) - (b.order || 0));
        
        tbody.innerHTML = '';
        
        if (products.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No hay productos en la tienda.</td></tr>';
            return;
        }
        
        products.forEach(p => {
            const tr = document.createElement('tr');
            const statusText = p.isActive ? '<span style="color:#10b981">Activo</span>' : '<span style="color:#ef4444">Inactivo</span>';
            
            tr.innerHTML = `
                <td>
                    <strong>${p.name}</strong>
                </td>
                <td class="text-gold" style="font-weight:bold">${APP_CONFIG.shop.currency}${p.price}</td>
                <td>${p.stock}</td>
                <td>${statusText}</td>
            `;
            tbody.appendChild(tr);
        });
        
    } catch (error) {
        console.error("Error cargando productos:", error);
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-error">Error cargando productos.</td></tr>';
    }
}
