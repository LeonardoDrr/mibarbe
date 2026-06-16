// ============================================================
// LÓGICA DE RESERVAS (booking.js)
// Flujo multi-paso, calendario, cálculos de disponibilidad
// ============================================================

let db;
let services = [];
let schedules = [];
let existingBookings = [];

// Estado de la reserva
let selectedService = null;
let selectedDate = null; // Date object
let selectedTime = null; // "HH:mm"
let currentStep = 1;

// Helper para AM/PM
function formatAMPM(time24) {
    let [h, m] = time24.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    h = h ? h : 12; 
    const minStr = m.toString().padStart(2, '0');
    return `${h}:${minStr} ${ampm}`;
}

// Referencias DOM
const elStep1 = document.getElementById('step-1');
const elStep2 = document.getElementById('step-2');
const elStep3 = document.getElementById('step-3');
const elInd1 = document.getElementById('ind-1');
const elInd2 = document.getElementById('ind-2');
const elInd3 = document.getElementById('ind-3');
const btnNextTo3 = document.getElementById('btn-next-to-3');

document.addEventListener('DOMContentLoaded', async () => {
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
    
    if (!firebase.apps.length) {
        firebase.initializeApp(APP_CONFIG.firebase);
    }
    db = firebase.firestore();

    await Promise.all([
        loadServices(),
        loadSchedules(),
        loadExistingBookings(),
        loadProductsForBooking()
    ]);

    initCalendar();
});

// ── CARGAR PRODUCTOS PARA SELECCIONAR EN RESERVA ──
async function loadProductsForBooking() {
    const container = document.getElementById('product-selection-list');
    if (!container) return;
    
    try {
        const snap = await db.collection('products').where('isActive', '==', true).get();
        const products = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        products.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'es'));
        
        if (products.length === 0) {
            container.innerHTML = '<p class="text-muted" style="font-size:0.85rem;">No hay productos disponibles.</p>';
            return;
        }
        
        container.innerHTML = '';
        products.forEach(p => {
            const label = document.createElement('label');
            label.style.cssText = 'display:flex; align-items:center; gap:0.5rem; padding:0.6rem 0.8rem; border:1px solid var(--color-border); border-radius:var(--radius-sm); cursor:pointer; transition:var(--transition);';
            label.innerHTML = `
                <input type="checkbox" name="product" value="${p.name}" style="width:16px; height:16px; accent-color: var(--color-gold);">
                <span style="font-size:0.88rem;">${p.name}</span>
            `;
            label.querySelector('input').addEventListener('change', function() {
                label.style.borderColor = this.checked ? 'var(--color-gold)' : 'var(--color-border)';
                label.style.background = this.checked ? 'var(--color-gold-dim)' : 'transparent';
            });
            container.appendChild(label);
        });
    } catch (e) {
        console.error('Error cargando productos para reserva:', e);
        container.innerHTML = '';
    }
}

// ── PASO 1: SERVICIOS ──
async function loadServices() {
    const list = document.getElementById('service-list');
    
    try {
        const snap = await db.collection('services').where('isActive', '==', true).get();
        services = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Ordenar en memoria
        services.sort((a, b) => (a.order || 0) - (b.order || 0));
        
        list.innerHTML = '';
        services.forEach(svc => {
            const div = document.createElement('div');
            div.className = 'card card-body';
            div.style.display = 'flex';
            div.style.justifyContent = 'space-between';
            div.style.alignItems = 'center';
            div.style.cursor = 'pointer';
            
            div.innerHTML = `
                <div>
                    <h3 style="margin-bottom:0.25rem;">${svc.name}</h3>
                    <p class="text-muted"><i class="fa-regular fa-clock"></i> ${svc.durationMinutes} min</p>
                </div>
                <div class="text-gold" style="font-weight:bold; font-size:1.1rem;">
                    ${APP_CONFIG.shop.currency}${svc.price}
                </div>
            `;
            
            div.addEventListener('click', () => selectService(svc));
            list.appendChild(div);
        });
    } catch (e) {
        console.error(e);
        list.innerHTML = '<p class="text-error">Error cargando servicios.</p>';
    }
}

// Buscador de servicios en tiempo real
window.filterServices = function(q) {
    const cards = document.querySelectorAll('#service-list .card');
    const term = q.toLowerCase().trim();
    let visible = 0;
    cards.forEach(card => {
        const name = (card.querySelector('h3')?.textContent || '').toLowerCase();
        const show = name.includes(term);
        card.style.display = show ? '' : 'none';
        if (show) visible++;
    });
    const noRes = document.getElementById('service-no-results');
    if (noRes) noRes.style.display = (visible === 0 && term) ? 'block' : 'none';
};

function selectService(svc) {
    selectedService = svc;
    
    // Actualizar resumen paso 3
    document.getElementById('summary-service').textContent = svc.name;
    document.getElementById('summary-price').textContent = `${APP_CONFIG.shop.currency}${svc.price}`;
    
    goToStep(2);
}

// ── NAVEGACIÓN PASOS ──
window.goToStep = function(step) {
    currentStep = step;
    [elStep1, elStep2, elStep3].forEach(el => el.classList.remove('active'));
    [elInd1, elInd2, elInd3].forEach(el => el.classList.remove('active'));
    
    if (step === 1) { elStep1.classList.add('active'); elInd1.classList.add('active'); }
    if (step === 2) { elStep2.classList.add('active'); elInd2.classList.add('active'); }
    if (step === 3) { 
        elStep3.classList.add('active'); elInd3.classList.add('active');
        const dateStr = selectedDate.toLocaleDateString('es-ES', { weekday:'long', day:'numeric', month:'long' });
        document.getElementById('summary-datetime').textContent = `${dateStr} a las ${formatAMPM(selectedTime)}`;
    }
}

btnNextTo3.addEventListener('click', () => {
    if (selectedDate && selectedTime) goToStep(3);
});

// ── PASO 2: CALENDARIO Y DISPONIBILIDAD ──
async function loadSchedules() {
    const snap = await db.collection('schedules').get();
    schedules = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function loadExistingBookings() {
    // Para simplificar, cargamos reservas futuras
    const todayStr = new Date().toISOString().split('T')[0];
    const snap = await db.collection('bookings').where('date', '>=', todayStr).get();
    existingBookings = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

let currentDateDisplay = new Date();
const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

function initCalendar() {
    renderCalendar(currentDateDisplay);
    
    document.getElementById('prev-month').addEventListener('click', () => {
        currentDateDisplay.setMonth(currentDateDisplay.getMonth() - 1);
        renderCalendar(currentDateDisplay);
    });
    
    document.getElementById('next-month').addEventListener('click', () => {
        currentDateDisplay.setMonth(currentDateDisplay.getMonth() + 1);
        renderCalendar(currentDateDisplay);
    });
}

function renderCalendar(date) {
    const monthYear = date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    document.getElementById('current-month-display').textContent = monthYear.charAt(0).toUpperCase() + monthYear.slice(1);
    
    const grid = document.getElementById('calendar-days');
    grid.innerHTML = '';
    
    // Header (Lun - Dom)
    ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].forEach(d => {
        const div = document.createElement('div');
        div.className = 'calendar-header';
        div.textContent = d;
        grid.appendChild(div);
    });
    
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay(); // 0 = Dom
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    // Ajustar para que la semana empiece en Lunes
    let emptyCells = firstDay === 0 ? 6 : firstDay - 1;
    
    for (let i = 0; i < emptyCells; i++) {
        grid.appendChild(document.createElement('div'));
    }
    
    const today = new Date();
    today.setHours(0,0,0,0);
    
    for (let i = 1; i <= daysInMonth; i++) {
        const cellDate = new Date(year, month, i);
        const cellDateStr = cellDate.toISOString().split('T')[0];
        
        const btn = document.createElement('button');
        btn.className = 'calendar-day';
        btn.textContent = i;
        
        // Deshabilitar días pasados
        if (cellDate < today) {
            btn.disabled = true;
        } else {
            // Validar si el barbero trabaja este día
            const dayOfWeek = cellDate.getDay();
            const schedule = schedules.find(s => parseInt(s.dayOfWeek) === dayOfWeek);
            
            if (!schedule || !schedule.isWorking) {
                btn.disabled = true;
                btn.title = "Cerrado";
            } else {
                btn.addEventListener('click', () => {
                    document.querySelectorAll('.calendar-day').forEach(el => el.classList.remove('selected'));
                    btn.classList.add('selected');
                    selectDate(cellDate, schedule);
                });
            }
        }
        
        grid.appendChild(btn);
    }
}

function selectDate(dateObj, schedule) {
    selectedDate = dateObj;
    selectedTime = null;
    btnNextTo3.disabled = true;
    
    const dateStr = dateObj.toISOString().split('T')[0];
    document.getElementById('selected-date-text').textContent = dateObj.toLocaleDateString('es-ES', { weekday:'long', day:'numeric', month:'long' });
    document.getElementById('time-slots-container').style.display = 'block';
    
    renderTimeSlots(dateStr, schedule);
}

function renderTimeSlots(dateStr, schedule) {
    const container = document.getElementById('slots-list');
    container.innerHTML = '';
    
    const duration = selectedService.durationMinutes;
    const slots = generateSlots(schedule, duration, dateStr);
    
    if (slots.length === 0) {
        container.innerHTML = '<p class="text-muted" style="grid-column: 1/-1;">No hay horarios disponibles para este día.</p>';
        return;
    }
    
    slots.forEach(slot => {
        const btn = document.createElement('button');
        btn.className = 'time-slot';
        btn.textContent = formatAMPM(slot);
        
        btn.addEventListener('click', () => {
            document.querySelectorAll('.time-slot').forEach(el => el.classList.remove('selected'));
            btn.classList.add('selected');
            selectedTime = slot;
            btnNextTo3.disabled = false;
        });
        
        container.appendChild(btn);
    });
}

function generateSlots(schedule, durationMin, dateStr) {
    // Convierte "HH:mm" a minutos desde las 00:00
    const toMin = time => {
        const [h, m] = time.split(':').map(Number);
        return h * 60 + m;
    };
    
    const formatMin = mins => {
        const h = Math.floor(mins / 60).toString().padStart(2, '0');
        const m = (mins % 60).toString().padStart(2, '0');
        return `${h}:${m}`;
    };
    
    let current = toMin(schedule.startTime);
    const end = toMin(schedule.endTime);
    const breakStart = toMin(schedule.breakStart);
    const breakEnd = toMin(schedule.breakEnd);
    
    const slots = [];
    
    // Obtener reservas de ese día
    const dayBookings = existingBookings.filter(b => b.date === dateStr && b.status !== 'cancelled_by_admin');
    
    // Filtrar si es hoy
    const isToday = dateStr === new Date().toISOString().split('T')[0];
    const nowMins = isToday ? (new Date().getHours() * 60 + new Date().getMinutes()) : 0;
    
    while (current + durationMin <= end) {
        const slotEnd = current + durationMin;
        
        // Solapamiento con descanso
        const overlapsBreak = (current < breakEnd && breakStart < slotEnd);
        
        // Pasado (si es hoy)
        const isPast = isToday && (current <= nowMins);
        
        // Solapamiento con otra reserva
        const isBooked = dayBookings.some(b => {
            const bStart = toMin(b.timeSlot);
            const bEnd = bStart + 30; // Asumimos min 30 por simplificar, o cruzar con servicio
            return (current < bEnd && bStart < slotEnd);
        });
        
        if (!overlapsBreak && !isPast && !isBooked) {
            slots.push(formatMin(current));
        }
        
        current += durationMin; // Saltar al siguiente hueco
    }
    
    return slots;
}

// ── PASO 3: CONFIRMACIÓN Y WHATSAPP ──
document.getElementById('booking-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const btn = document.getElementById('btn-submit-booking');
    btn.disabled = true;
    btn.innerHTML = '<span class="loader" style="width:20px; height:20px; border-width:2px;"></span> Procesando...';
    
    const clientName = document.getElementById('clientName').value;
    const clientPhone = document.getElementById('clientPhone').value;
    const dateStr = selectedDate.toISOString().split('T')[0];
    
    try {
        // Guardar en Firestore
        const docRef = await db.collection('bookings').add({
            serviceId: selectedService.id,
            serviceName: selectedService.name,
            clientName,
            clientPhone,
            clientEmail: '',
            date: dateStr,
            timeSlot: selectedTime,
            status: 'pending',
            price: selectedService.price,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Redirigir a WhatsApp
        const dateDisplay = selectedDate.toLocaleDateString('es-ES', { weekday:'long', day:'numeric', month:'long' });
        
        // Obtener productos seleccionados
        const checkedProducts = [...document.querySelectorAll('#product-selection-list input[type="checkbox"]:checked')]
            .map(cb => cb.value);
        const productsLine = checkedProducts.length > 0
            ? `\n\n📦 Productos para preparar: ${checkedProducts.join(', ')}.`
            : '';
        
        const msg = `Hola, soy ${clientName}. Acabo de reservar: ${selectedService.name} el ${dateDisplay} a las ${formatAMPM(selectedTime)}. Quiero confirmar mi cita.${productsLine}\n\nID de reserva: ${docRef.id}`;
        
        const waUrl = `https://wa.me/${APP_CONFIG.shop.whatsappNumber}?text=${encodeURIComponent(msg)}`;
        
        // Abrir en una nueva pestaña para mantener limpia la consola de nuestra app
        window.open(waUrl, '_blank');
        
        // Mostrar éxito en la UI actual
        btn.innerHTML = '<i class="fa-solid fa-check"></i> ¡Cita Registrada!';
        btn.style.backgroundColor = '#10b981'; // Verde éxito
        btn.style.color = '#000';
        btn.style.borderColor = '#10b981';
        
        // Regresar al inicio después de 3 segundos
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 3000);
        
    } catch (error) {
        console.error("Error guardando reserva:", error);
        alert("Hubo un error al guardar tu reserva. Por favor intenta nuevamente.");
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-brands fa-whatsapp"></i> Confirmar Reserva por WhatsApp';
    }
});
