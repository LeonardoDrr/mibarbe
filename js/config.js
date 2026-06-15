// ============================================================
// CONFIGURACIÓN CENTRAL DE LA APLICACIÓN
// Edita este archivo para cambiar la configuración del negocio
// ============================================================

const APP_CONFIG = {
    // ── Firebase ──
    firebase: {
        apiKey: "AIzaSyBuzYagg3Q8Y4aAOiTlXFpbTWZnZ6foR4Y",
        authDomain: "click-shop-app.firebaseapp.com",
        projectId: "click-shop-app",
        storageBucket: "click-shop-app.firebasestorage.app",
        messagingSenderId: "233795372315",
        appId: "1:233795372315:web:9521d8ff6168eab4413fbe"
    },

    // ── Cloudinary (imágenes) ──
    cloudinary: {
        cloudName: "dndiosy4u",
        uploadPreset: "barberia_unsigned"
    },

    // ── Negocio ──
    shop: {
        name: "Barbería Elite",
        whatsappNumber: "584146329982",
        currency: "$",
        timezone: "America/Argentina/Buenos_Aires",
        address: "Maracaibo, Venezuela"
    },

    // ── Mapa ──
    map: {
        lat: 10.534676,
        lng: -71.693850
    },

    // ── Admin ──
    adminUid: "REEMPLAZA_CON_TU_ADMIN_UID"
};

// Exportamos globalmente para que sea accesible en otros scripts
window.APP_CONFIG = APP_CONFIG;
