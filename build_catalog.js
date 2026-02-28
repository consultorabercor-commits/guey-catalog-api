const fs = require('fs');
const path = require('path');

const templatePath = path.join(__dirname, 'Export_Stitch_HTML', 'Home_Catalog_V3.html');
const dataPath = path.join(__dirname, 'guey_catalog_verified.json');
const outputPath = path.join(__dirname, 'Export_Stitch_HTML', 'Home_Catalog_Final.html');

// Número de WhatsApp de la tienda (sin + ni espacios, con código de país)
const WHATSAPP_NUMBER = '5493515579020';

// Lógica de categorización por palabras clave en el título
function getCategory(title) {
    const t = title.toLowerCase();

    if (/oferta|sale|básicas?\s*1\s*[\/al]*\s*5|niño\s*oferta/.test(t)) return 'ofertas';

    if (/campera|buzo|sweater|saco|ruanas?|chaleco|kimono|polar|lanilla\s*(saco|buzo)|piel|peluche|engomad|simil\s*cuero|símil\s*cuero|neopreno|rompeviento|sudadera|superpuesta/.test(t)) return 'abrigo';

    if (/remera|camiseta|polera|musculosa|crop|top|camisola|poplin|camisaco|maxi\s*remera|remeras?\s*(básic|lacoste|morley|algodón|lurex|varios|lisas|m\s*larga)/.test(t)) return 'remeras';

    if (/pantalón|pantal|jean|jogger|babucha|palazzo|palazos?|palazo|biker|corte\s*chino|wide\s*leg|wid\s*leg|win\s*leg|bengalina|lino|gabardina|rústico\s*dama|capri|elephant|tiro\s*fino/.test(t)) return 'pantalones';

    if (/short|shorts?|shorts?\s*(baño|ba[ñn]o|lycra|deportivo|seamless|fibrana|algodón)|short\s*(ba[ño]o)|bermuda/.test(t)) return 'verano';

    if (/conjunto|seamless|calza|lycra\s*deport|térmica|termico|deportivo|catsuit|bikini|traje/.test(t)) return 'conjuntos';

    if (/vestido|mono|camisola\s*vestido|maxi\s*vestido|vestidos\s*especial/.test(t)) return 'vestidos';

    if (/media|accesorio/.test(t)) return 'accesorios';

    // Casos especiales
    if (/solera|seda\s*fr/.test(t)) return 'verano';
    if (/pilu/.test(t)) return 'pantalones';
    if (/microfibra/.test(t)) return 'abrigo';
    if (/animal\s*print|modal\s*viscoza|viscoza/.test(t)) return 'remeras';

    return 'otros';
}

try {
    const templateHtml = fs.readFileSync(templatePath, 'utf8');
    const products = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

    let generatedCards = '';
    let totalProducts = 0;

    for (const prod of products) {
        const category = getCategory(prod.corrected_title || '');
        let priceElement = '';
        let priceDisplay = '';
        const basePriceFormatted = prod.base_price > 0 ? "$" + prod.base_price.toLocaleString('es-AR') : "Consultar";

        if (prod.price_type === "VARIABLE" && prod.variants && prod.variants.length > 0) {
            let expandedOptions = [];
            for (const v of prod.variants) {
                const lowerCond = v.condition.toLowerCase();
                let matched = false;

                // Pattern 1: Match "1 al 5" or "del 1 al 5" or "talle 1 al 5"
                const rangeMatch = lowerCond.match(/(?:talle\s+)?(?:del\s+)?(\d+)\s+al\s+(\d+)/);
                if (rangeMatch) {
                    const start = parseInt(rangeMatch[1], 10);
                    const end = parseInt(rangeMatch[2], 10);
                    if (start <= end && end - start <= 15) {
                        for (let i = start; i <= end; i++) {
                            expandedOptions.push({ label: `Talle ${i}`, price: v.price });
                        }
                        matched = true;
                    }
                }

                // Pattern 2: Match "3/4/5/6"
                if (!matched) {
                    const slashMatch = lowerCond.match(/(?:t\s*)?(\d+(?:\/\d+)+)/);
                    if (slashMatch) {
                        const talles = slashMatch[1].split('/');
                        for (const t of talles) {
                            expandedOptions.push({ label: `Talle ${t}`, price: v.price });
                        }
                        matched = true;
                    }
                }

                // Fallback
                if (!matched) {
                    let label = v.condition.charAt(0).toUpperCase() + v.condition.slice(1);
                    expandedOptions.push({ label: label, price: v.price });
                }
            }

            let options = expandedOptions.map(opt =>
                `<option value="${opt.price}">${opt.label} - $${opt.price.toLocaleString('es-AR')}</option>`
            ).join('');

            priceDisplay = basePriceFormatted;
            priceElement = `
                <div class="flex flex-col w-full">
                    <span class="text-xs text-gray-500 mb-1">Seleccionar Talle/Opción:</span>
                    <select class="product-size-select w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-md focus:ring-primary focus:border-primary block p-2">
                        <option value="" disabled selected>Seleccione Talle</option>
                        ${options}
                    </select>
                </div>`;
        } else {
            priceDisplay = basePriceFormatted;
            if (prod.is_sale && prod.original_price) {
                const originalFormatted = "$" + prod.original_price.toLocaleString('es-AR');
                priceElement = `
                <div class="flex flex-col gap-0.5">
                    <div class="flex items-center gap-2">
                        <span class="bg-guey-red text-white text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded">SALE</span>
                        <span class="text-gray-400 text-sm line-through">${originalFormatted}</span>
                    </div>
                    <p class="text-primary font-black tracking-tight text-xl leading-none">${basePriceFormatted}</p>
                </div>`;
            } else {
                priceElement = `<p class="text-primary font-black tracking-tight text-lg">${basePriceFormatted}</p>`;
            }
        }

        // Build the single processed image URL for production
        const baseImgName = (prod.image_file || "").replace(/\.(jpg|jpeg|png)$/i, '');
        let imgSrc = `https://raw.githubusercontent.com/consultorabercor-commits/guey-catalog-api/main/Catalog_Images_Processed/${baseImgName}.png`;
        if (prod.image_url) {
            imgSrc = prod.image_url.replace(/\.jpg$/i, '.png');
        }

        const safeTitle = (prod.corrected_title || "").replace(/"/g, '&quot;');
        const safeDesc = (prod.corrected_description || "").replace(/"/g, '&quot;');
        // Encode title for WhatsApp URL
        const waTitle = encodeURIComponent(prod.corrected_title || '');
        const waMsg = encodeURIComponent(`Hola! Me interesa el producto: *${prod.corrected_title}*. ¿Pueden darme más info?`);

        const hasVariants = prod.price_type === "VARIABLE" && prod.variants && prod.variants.length > 0;
        const dataImg = encodeURIComponent(imgSrc);

        // Generate card with single premium studio photo
        generatedCards += `
<div class="group relative product-card" data-title="${safeTitle.toLowerCase()}" data-price="${prod.base_price}" data-category="${category}" data-img="${dataImg}">
    <div class="relative bg-white rounded-lg overflow-hidden border border-gray-200 shadow-sm hover:shadow-xl transition-shadow duration-300">
        <!-- Image Container -->
        <div class="relative aspect-[4/5] bg-[#F0F0F0] overflow-hidden">
            <img alt="${safeTitle}" class="w-full h-full object-contain transition-transform duration-700 group-hover:scale-110" src="${imgSrc}" loading="lazy" />
            
            <!-- Floating WhatsApp Icon -->
            <a href="https://wa.me/${WHATSAPP_NUMBER}?text=${waMsg}" target="_blank" rel="noopener noreferrer" class="whatsapp-btn absolute bottom-4 right-4 bg-[#25D366] text-white p-3 rounded-full shadow-lg hover:scale-110 transition-transform flex items-center justify-center z-20">
                <span class="material-symbols-outlined text-lg">chat</span>
            </a>
        </div>
        
        <!-- Details Container -->
        <div class="p-5 flex flex-col gap-2 min-h-[160px]">
            <h4 class="font-black text-gray-900 uppercase tracking-tight text-sm leading-tight line-clamp-2" title="${safeTitle}">${safeTitle}</h4>
            
            <p class="text-xs text-gray-500 line-clamp-2 leading-relaxed" title="${safeDesc}">${safeDesc}</p>
            
            <div class="mt-auto pt-3 border-t border-gray-100 flex flex-col gap-2 w-full">
                ${priceElement}
                <button class="add-to-cart-btn w-full mt-1 py-2 bg-gray-900 hover:bg-[#E60000] text-white text-xs font-black uppercase tracking-widest rounded transition-colors flex items-center justify-center gap-1.5"
                    data-product-title="${safeTitle}"
                    data-product-price="${prod.base_price}"
                    data-product-img="${dataImg}"
                    data-has-variants="${hasVariants}">
                    <span class="material-symbols-outlined text-sm">add_shopping_cart</span>
                    Agregar al carrito
                </button>
            </div>
        </div>
    </div>
</div>\n`;
        totalProducts++;
    }

    // Build the JS to inject at end of body
    const catalogScript = `
<script>
(function() {
    const WHATSAPP = '${WHATSAPP_NUMBER}';
    const TOTAL = ${totalProducts};

    // --- Cart state (localStorage) ---
    function getCart() {
        try { return JSON.parse(localStorage.getItem('guey_cart') || '[]'); } catch(e) { return []; }
    }
    function saveCart(cart) {
        localStorage.setItem('guey_cart', JSON.stringify(cart));
    }
    function updateCartBadge() {
        const cart = getCart();
        const total = cart.reduce((a, b) => a + b.qty, 0);
        document.querySelectorAll('.cart-badge').forEach(el => {
            el.textContent = total;
            el.style.display = total > 0 ? '' : 'none';
        });
    }

    // --- Filter state ---
    let activeFilter = 'todos';
    let searchQuery = '';

    function filterProducts() {
        const cards = document.querySelectorAll('.product-card');
        let visible = 0;
        cards.forEach(card => {
            const cat = card.dataset.category || '';
            const title = card.dataset.title || '';
            const matchesFilter = activeFilter === 'todos' || cat === activeFilter;
            const matchesSearch = !searchQuery || title.includes(searchQuery.toLowerCase());
            if (matchesFilter && matchesSearch) {
                card.style.display = '';
                visible++;
            } else {
                card.style.display = 'none';
            }
        });
        // Update count on active filter button
        const activeBtn = document.querySelector('.filter-btn.active-filter');
        if (activeBtn) {
            const baseName = activeBtn.dataset.label || 'Todos';
            activeBtn.textContent = baseName + ' (' + visible + ')';
        }
        // Show/hide empty state
        const emptyState = document.getElementById('catalog-empty');
        if (emptyState) emptyState.style.display = visible === 0 ? '' : 'none';
    }

    // --- Setup filter buttons ---
    function setupFilters() {
        const filterBtns = document.querySelectorAll('.filter-btn');
        filterBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                filterBtns.forEach(b => {
                    b.classList.remove('active-filter', 'bg-guey-red', 'text-white', 'shadow-lg', 'shadow-red-900/20');
                    b.classList.add('bg-transparent', 'border-2', 'border-white/30', 'text-pure-white');
                });
                this.classList.add('active-filter', 'bg-guey-red', 'text-white', 'shadow-lg', 'shadow-red-900/20');
                this.classList.remove('bg-transparent', 'border-2', 'border-white/30', 'text-pure-white');
                activeFilter = this.dataset.filter || 'todos';
                filterProducts();
            });
        });
    }

    // --- Setup search ---
    function setupSearch() {
        const searchInput = document.getElementById('catalog-search');
        if (!searchInput) return;
        searchInput.addEventListener('input', function() {
            searchQuery = this.value.trim();
            filterProducts();
        });
    }

    // --- Setup "Ver Catálogo" hero button scroll ---
    function setupHeroBtns() {
        const verCatalogo = document.getElementById('btn-ver-catalogo');
        if (verCatalogo) {
            verCatalogo.addEventListener('click', function() {
                const catalogSection = document.getElementById('catalogo-section');
                if (catalogSection) catalogSection.scrollIntoView({ behavior: 'smooth' });
            });
        }
        // WhatsApp contacto general
        const contactWA = document.getElementById('btn-contacto-wa');
        if (contactWA) {
            contactWA.href = 'https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent('Hola! Quisiera consultar sobre sus productos.');
        }
    }

    // --- Cart button click (header) ---
    function setupCartBtn() {
        const cartBtn = document.getElementById('cart-btn');
        if (cartBtn) {
            cartBtn.addEventListener('click', function() {
                window.location.href = 'Cart.html';
            });
        }
    }

    // --- Toast notification ---
    function showToast(msg) {
        let toast = document.getElementById('guey-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'guey-toast';
            toast.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#E60000;color:#fff;font-weight:800;font-size:13px;letter-spacing:.1em;text-transform:uppercase;padding:14px 28px;border-radius:99px;z-index:9999;transition:opacity .3s;box-shadow:0 4px 24px rgba(0,0,0,.4);';
            document.body.appendChild(toast);
        }
        toast.textContent = msg;
        toast.style.opacity = '1';
        clearTimeout(toast._t);
        toast._t = setTimeout(() => { toast.style.opacity = '0'; }, 2200);
    }

    // --- Add to cart ---
    function setupAddToCart() {
        document.addEventListener('click', function(e) {
            const btn = e.target.closest('.add-to-cart-btn');
            if (!btn) return;
            e.preventDefault();

            const title = btn.dataset.productTitle;
            const img = decodeURIComponent(btn.dataset.productImg || '');
            const hasVariants = btn.dataset.hasVariants === 'true';

            // Get selected size/price from the nearest select, if any
            const card = btn.closest('.product-card');
            let price = parseInt(btn.dataset.productPrice) || 0;
            let size = '';

            if (hasVariants && card) {
                const sel = card.querySelector('.product-size-select');
                if (sel && sel.value) {
                    price = parseInt(sel.value) || price;
                    size = sel.options[sel.selectedIndex].text.split(' - ')[0];
                } else if (sel && !sel.value) {
                    showToast('Seleccioná un talle primero');
                    sel.focus();
                    return;
                }
            }

            const cart = getCart();
            const existing = cart.find(i => i.title === title && i.size === size);
            if (existing) {
                existing.qty++;
            } else {
                cart.push({ title, price, size, img, qty: 1 });
            }
            saveCart(cart);
            updateCartBadge();
            showToast('✓ ' + title + ' agregado al carrito');
        });
    }

    // --- Init ---
    document.addEventListener('DOMContentLoaded', function() {
        updateCartBadge();
        setupFilters();
        setupSearch();
        setupHeroBtns();
        setupCartBtn();
        setupAddToCart();

        // Set initial count on "Todos" button
        const todosBtn = document.querySelector('[data-filter="todos"]');
        if (todosBtn) {
            todosBtn.dataset.label = 'Todos';
            todosBtn.textContent = 'Todos (' + TOTAL + ')';
        }
    });
})();
</script>`;

    const sectionStart = '<section class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-24">';

    const startIdx = templateHtml.indexOf(sectionStart);
    if (startIdx === -1) {
        console.error("Could not find grid section boundary.");
        process.exit(1);
    }
    const endIdx = templateHtml.indexOf('</section>', startIdx);

    let finalHtml = templateHtml.substring(0, startIdx + sectionStart.length) + '\n' + generatedCards + '\n' + templateHtml.substring(endIdx);

    // Add empty state message after </section>
    const emptySectionMsg = `\n<div id="catalog-empty" style="display:none;" class="col-span-full text-center py-24 text-gray-400">
    <span class="material-symbols-outlined text-6xl block mb-4 opacity-40">search_off</span>
    <p class="text-xl font-bold uppercase tracking-widest opacity-60">No se encontraron productos</p>
</div>`;

    finalHtml = finalHtml.replace('</section>\n</main>', emptySectionMsg + '\n</section>\n</main>');

    // Inject script before </body>
    finalHtml = finalHtml.replace('</body></html>', catalogScript + '\n</body></html>');

    fs.writeFileSync(outputPath, finalHtml);
    console.log(`Successfully generated catalog with ${totalProducts} products: ${outputPath}`);
    console.log(`WhatsApp: ${WHATSAPP_NUMBER}`);

} catch (e) {
    console.error("Build failed:", e);
}
