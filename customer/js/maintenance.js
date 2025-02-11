// Bakım modu kontrolü
async function checkMaintenanceMode() {
    try {
        const maintenanceStatus = await window.settingsService.checkMaintenanceMode();
        if (maintenanceStatus.enabled) {
            document.body.innerHTML = `
                <div class="maintenance-mode">
                    <div class="maintenance-content">
                        <i class="fas fa-tools"></i>
                        <h1>Bakım Modu</h1>
                        <p>${maintenanceStatus.message}</p>
                        <button onclick="window.location.reload()">Tekrar Dene</button>
                    </div>
                </div>
                <style>
                    .maintenance-mode {
                        position: fixed;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        background: rgba(255, 255, 255, 0.95);
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        z-index: 9999;
                    }
                    .maintenance-content {
                        text-align: center;
                        padding: 30px;
                        background: white;
                        border-radius: 8px;
                        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                    }
                    .maintenance-content i {
                        font-size: 48px;
                        color: #f39c12;
                        margin-bottom: 20px;
                    }
                    .maintenance-content h1 {
                        margin: 0 0 10px;
                        color: #333;
                    }
                    .maintenance-content p {
                        margin: 0 0 20px;
                        color: #666;
                    }
                    .maintenance-content button {
                        padding: 10px 20px;
                        background: #3498db;
                        color: white;
                        border: none;
                        border-radius: 4px;
                        cursor: pointer;
                        transition: background 0.3s;
                    }
                    .maintenance-content button:hover {
                        background: #2980b9;
                    }
                </style>
            `;
            return true;
        }
        return false;
    } catch (error) {
        console.error('Bakım modu kontrolü sırasında hata:', error);
        return false;
    }
}

// Sayfa yüklendiğinde bakım modunu kontrol et
document.addEventListener('DOMContentLoaded', checkMaintenanceMode); 