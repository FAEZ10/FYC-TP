
const API_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:8080'  
    : 'https://api.faez-studio.fr';  

const productsList = document.getElementById('products-list');
const productForm = document.getElementById('product-form');
const loadingEl = document.getElementById('loading');
const errorEl = document.getElementById('error');
const serverInfoEl = document.getElementById('server-info');

loadProducts();

productForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const product = {
        name: document.getElementById('name').value,
        description: document.getElementById('description').value,
        price: parseFloat(document.getElementById('price').value),
        stock: parseInt(document.getElementById('stock').value) || 0
    };
    
    try {
        const response = await fetch(`${API_URL}/api/products`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(product)
        });
        
        if (!response.ok) throw new Error('Erreur lors de l\'ajout du produit');
        
        productForm.reset();
        
        showSuccess('Produit ajouté avec succès ! 🎉');
        
        loadProducts();
    } catch (error) {
        console.error('Erreur:', error);
        showError('Impossible d\'ajouter le produit');
    }
});

async function loadProducts() {
    try {
        loadingEl.style.display = 'block';
        errorEl.classList.remove('show');
        
        const response = await fetch(`${API_URL}/api/products`);
        if (!response.ok) throw new Error('Erreur lors du chargement');
        
        const products = await response.json();
        
        loadingEl.style.display = 'none';
        displayProducts(products);
        
        loadServerInfo();
    } catch (error) {
        console.error('Erreur:', error);
        loadingEl.style.display = 'none';
        showError('Impossible de charger les produits. Vérifiez que l\'API est démarrée.');
    }
}

function displayProducts(products) {
    if (products.length === 0) {
        productsList.innerHTML = '<p style="text-align: center; color: #666;">Aucun produit disponible</p>';
        return;
    }
    
    productsList.innerHTML = products.map(product => `
        <div class="product-card">
            <div class="product-name">${escapeHtml(product.name)}</div>
            <div class="product-description">${escapeHtml(product.description || 'Pas de description')}</div>
            <div class="product-info">
                <span class="product-price">${product.price.toFixed(2)} €</span>
                <span class="product-stock ${getStockClass(product.stock)}">
                    Stock: ${product.stock}
                </span>
            </div>
        </div>
    `).join('');
}

async function loadServerInfo() {
    try {
        const response = await fetch(`${API_URL}/health`);
        if (!response.ok) return;
        
        const info = await response.json();
        serverInfoEl.textContent = `📡 Serveur: ${info.hostname} | ⏰ ${new Date(info.timestamp).toLocaleTimeString('fr-FR')}`;
    } catch (error) {
        console.error('Impossible de charger les infos serveur:', error);
    }
}

function showError(message) {
    errorEl.textContent = `❌ ${message}`;
    errorEl.classList.add('show');
    setTimeout(() => errorEl.classList.remove('show'), 5000);
}

function showSuccess(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.textContent = message;
    productForm.parentElement.insertBefore(successDiv, productForm);
    setTimeout(() => successDiv.remove(), 3000);
}

function getStockClass(stock) {
    if (stock === 0) return 'out-of-stock';
    if (stock < 10) return 'low-stock';
    return '';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

setInterval(loadProducts, 30000);
