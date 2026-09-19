/* Main Application Logic */

// State
var currentProduct = null;
var currentQuantity = 0;
var focusTrapElements = [];
var lastFocusedElement = null;
var notifyModalOpen = false;
var cartModalOpen = false;
var cart = []; // [{ productId, quantity }] - populated from localStorage in init()
var CART_KEY = 'toystore-cart';

// Escapes quotes too: these values are interpolated into HTML attributes, not just text
function escapeHtml(text) {
    if (text == null) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Utility: Format currency with rounding to whole units
function formatCurrency(amount) {
    if (amount == null || isNaN(amount)) {
        return CONFIG.currency + '0';
    }
    return CONFIG.currency + Math.round(amount);
}

// Utility: Get array of image paths for a product
function getProductImages(product) {
    var images = [];
    for (var i = 1; i <= product.imageCount; i++) {
        images.push('assets/img/'+ product.id +'/' + product.id + '-' + i + '.png');
    }
    return images;
}

// Calculate applicable discount for a given quantity
function calculateDiscount(product, qty) {
    var discount = 0;
    var tiers = getDiscountTiers(product);

    for (var i = 0; i < tiers.length; i++) {
        if (qty >= tiers[i].minQty && tiers[i].percent > discount) {
            discount = tiers[i].percent;
        }
    }

    return discount;
}

// Calculate price breakdown
function calculatePricing(product, qty) {
    var unitPrice = product.price;
    var discount = calculateDiscount(product, qty);
    var subtotal = unitPrice * qty;
    var discountAmount = Math.round((subtotal * discount) / 100);
    var total = subtotal - discountAmount;

    return {
        unitPrice: unitPrice,
        discount: discount,
        subtotal: subtotal,
        discountAmount: discountAmount,
        total: total
    };
}

// Find next discount tier - used by the + button's tooltip
function getNextTier(product, currentQty) {
    var tiers = getDiscountTiers(product);
    var sortedTiers = tiers.slice().sort(function(a, b) {
        return a.minQty - b.minQty;
    });

    // A tier past the order limit can never be reached, so promising it would be a lie.
    var ceiling = getHighestValidQuantity(product);

    for (var i = 0; i < sortedTiers.length; i++) {
        if (currentQty < sortedTiers[i].minQty && sortedTiers[i].minQty <= ceiling) {
            var targetQty = sortedTiers[i].minQty;
            var maxPercent = sortedTiers[i].percent;
            for (var j = i + 1; j < sortedTiers.length && sortedTiers[j].minQty === targetQty; j++) {
                if (sortedTiers[j].percent > maxPercent) {
                    maxPercent = sortedTiers[j].percent;
                }
            }
            return {
                minQty: targetQty,
                percent: maxPercent,
                itemsNeeded: targetQty - currentQty
            };
        }
    }

    return null;
}

// The largest orderable quantity: the product's own limit, else the site default.
// Never below minQty, so bad data cannot produce an empty range.
function getMaxQuantity(product) {
    var minQty = product.minQty || CONFIG.defaultMinQty;
    var maxQty = product.maxQty || CONFIG.defaultMaxQty;
    return maxQty < minQty ? minQty : maxQty;
}

function getDiscountTiers(product) {
    return product.discountTiers || CONFIG.defaultDiscountTiers;
}

// The highest valid quantity that is on the step ladder and within the maximum.
// maxQty itself may not sit on the ladder (min 12, step 6, max 50 tops out at 48).
function getHighestValidQuantity(product) {
    var minQty = product.minQty || CONFIG.defaultMinQty;
    var step = product.qtyStep || CONFIG.defaultQtyStep;
    var maxQty = getMaxQuantity(product);
    return minQty + Math.floor((maxQty - minQty) / step) * step;
}

// Clamp and snap quantity to valid value
function normalizeQuantity(product, qty) {
    var minQty = product.minQty || CONFIG.defaultMinQty;
    var step = product.qtyStep || CONFIG.defaultQtyStep;

    if (qty < minQty) {
        return minQty;
    }

    // Snap to the step ladder first, then pull back inside the maximum. Doing it in
    // this order means the result is always both on-step and within range.
    var snapped = minQty + Math.round((qty - minQty) / step) * step;
    var ceiling = getHighestValidQuantity(product);

    return snapped > ceiling ? ceiling : snapped;
}

// Validate and sanitize quantity input
function validateQuantity(product, value) {
    var parsed = parseInt(value, 10);

    if (isNaN(parsed) || parsed < 1) {
        return product.minQty || CONFIG.defaultMinQty;
    }

    return normalizeQuantity(product, parsed);
}

// The "(Minimum: 12, Maximum: 48)" line under the Quantity label. The maximum is
// only mentioned when the product actually sets one, so the site default stays hidden.
function quantityRangeLabel(product) {
    var minQty = product.minQty || CONFIG.defaultMinQty;
    if (!product.maxQty) {
        return '(Minimum: ' + minQty + ')';
    }
    return '(Minimum: ' + minQty + ', Maximum: ' + getHighestValidQuantity(product) + ')';
}

// Grey out a stopper button once pressing it could not change anything
function updateStepperState() {
    var decreaseBtn = document.getElementById('qty-decrease');
    var increaseBtn = document.getElementById('qty-increase');
    if (!decreaseBtn || !increaseBtn || !currentProduct) return;

    var minQty = currentProduct.minQty || CONFIG.defaultMinQty;
    decreaseBtn.disabled = currentQuantity <= minQty;
    increaseBtn.disabled = currentQuantity >= getHighestValidQuantity(currentProduct);
}

// Get maximum discount percent for badge
function getMaxDiscount(product) {
    var tiers = getDiscountTiers(product);
    var max = 0;

    for (var i = 0; i < tiers.length; i++) {
        if (tiers[i].percent > max) {
            max = tiers[i].percent;
        }
    }

    return max;
}

// --- Hover image roll -----------------------------------------------
// While the pointer rests on a card, its images cross-fade in sequence. Two
// stacked <img> layers alternate, so there is never a blank frame between images.
var ROLL_INTERVAL_MS = 1100;

function canAnimateRoll() {
    if (!window.matchMedia) return false;
    // No hover on touch screens, and honour the OS reduce-motion setting.
    return window.matchMedia('(hover: hover)').matches &&
        !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function stopImageRoll(card) {
    if (card.rollTimer) {
        clearInterval(card.rollTimer);
        card.rollTimer = null;
    }

    var layers = card.querySelectorAll('.card-image');
    if (layers.length === 2) {
        layers[0].src = card.baseImage;
        layers[0].classList.add('is-visible');
        layers[1].classList.remove('is-visible');
    }

    var dots = card.querySelectorAll('.card-dot');
    for (var i = 0; i < dots.length; i++) {
        if (i === 0) dots[i].classList.add('is-active');
        else dots[i].classList.remove('is-active');
    }
}

function startImageRoll(card, product) {
    var images = getProductImages(product);
    if (images.length < 2 || card.rollTimer) return;

    // Fetch the remaining images once, on first hover, so page load stays light.
    if (!card.preloaded) {
        for (var i = 1; i < images.length; i++) {
            var pre = new Image();
            pre.src = images[i];
        }
        card.preloaded = true;
    }

    var layers = card.querySelectorAll('.card-image');
    var dots = card.querySelectorAll('.card-dot');
    if (layers.length !== 2) return;

    var index = 0;
    var shown = 0;

    card.rollTimer = setInterval(function () {
        index = (index + 1) % images.length;
        var next = shown === 0 ? 1 : 0;

        layers[next].src = images[index];
        layers[next].classList.add('is-visible');
        layers[shown].classList.remove('is-visible');
        shown = next;

        for (var j = 0; j < dots.length; j++) {
            if (j === index) dots[j].classList.add('is-active');
            else dots[j].classList.remove('is-active');
        }
    }, ROLL_INTERVAL_MS);
}

// --- Touch swipe on card images --------------------------------------
// canAnimateRoll() is false on touch devices, so the hover roll above never
// runs there - this is the touch equivalent, letting a visitor swipe a card's
// photo directly on the grid instead of only inside the product modal.
function setCardImage(card, product, index) {
    var images = getProductImages(product);
    var wrapped = (index + images.length) % images.length;
    card.currentIndex = wrapped;

    var visibleLayer = card.querySelector('.card-image.is-visible') || card.querySelector('.card-image');
    if (visibleLayer) {
        visibleLayer.src = images[wrapped];
    }

    var dots = card.querySelectorAll('.card-dot');
    for (var i = 0; i < dots.length; i++) {
        if (i === wrapped) dots[i].classList.add('is-active');
        else dots[i].classList.remove('is-active');
    }
}

function setupCardSwipe(card, product) {
    var images = getProductImages(product);
    if (images.length < 2) return;

    var container = card.querySelector('.card-image-container');
    if (!container) return;

    card.currentIndex = 0;

    // Same axis-lock pattern as the modal gallery: touchmove decides horizontal
    // vs. vertical as soon as the drag is clearly one or the other, and only
    // claims (preventDefault) the horizontal case - vertical is left alone so
    // scrolling past the card on the grid is never affected.
    var touchStartX = 0;
    var touchStartY = 0;
    var swipeAxis = null;
    var swipeDx = 0;

    container.addEventListener('touchstart', function (e) {
        if (e.touches.length !== 1) return;
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        swipeAxis = null;
        swipeDx = 0;
    }, { passive: true });

    container.addEventListener('touchmove', function (e) {
        if (e.touches.length !== 1) return;
        var dx = e.touches[0].clientX - touchStartX;
        var dy = e.touches[0].clientY - touchStartY;

        if (swipeAxis === null) {
            if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
            swipeAxis = Math.abs(dx) > Math.abs(dy) ? 'horizontal' : 'vertical';
        }

        if (swipeAxis === 'horizontal') {
            e.preventDefault();
            swipeDx = dx;
        }
    }, { passive: false });

    container.addEventListener('touchend', function () {
        if (swipeAxis === 'horizontal' && Math.abs(swipeDx) > 30) {
            setCardImage(card, product, (card.currentIndex || 0) + (swipeDx < 0 ? 1 : -1));
        }
        swipeAxis = null;
        swipeDx = 0;
    }, { passive: true });
}

// --- Cart -------------------------------------------------------------
// A cart entry is { productId, quantity }. Cart persists to localStorage so it
// survives a reload or the visitor closing and reopening the site, the same way
// the theme choice does.

function findProductById(id) {
    for (var i = 0; i < PRODUCTS.length; i++) {
        if (PRODUCTS[i].id === id) return PRODUCTS[i];
    }
    return null;
}

function saveCart() {
    try {
        localStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch (e) {
        // Private browsing or storage full - the cart still works for this visit,
        // it just won't survive a reload.
    }
}

function loadCart() {
    try {
        var raw = localStorage.getItem(CART_KEY);
        if (!raw) return [];
        var parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];

        // Drop anything that no longer matches a real product (the catalog may
        // have changed since this was saved) and re-clamp quantities in case a
        // product's min/max/step changed too.
        var cleaned = [];
        parsed.forEach(function (item) {
            if (!item || typeof item.productId !== 'string') return;
            var product = findProductById(item.productId);
            if (!product || !(item.quantity > 0)) return;
            cleaned.push({ productId: item.productId, quantity: normalizeQuantity(product, item.quantity) });
        });
        return cleaned;
    } catch (e) {
        return [];
    }
}

function getCartCount() {
    return cart.reduce(function (sum, item) { return sum + item.quantity; }, 0);
}

function addToCart(product, qty) {
    var item = cart.filter(function (i) { return i.productId === product.id; })[0];
    if (item) {
        item.quantity = normalizeQuantity(product, item.quantity + qty);
    } else {
        cart.push({ productId: product.id, quantity: normalizeQuantity(product, qty) });
    }
    saveCart();
    renderCartBadge();
    renderCartModal();
}

function removeFromCart(productId) {
    cart = cart.filter(function (i) { return i.productId !== productId; });
    saveCart();
    renderCartBadge();
    renderCartModal();
}

// direction is +1 or -1, moving by the product's own step. Stepping below the
// product's minimum removes the line entirely, mirroring how a physical cart
// works - there's no such thing as "0.5 of an item" sitting in it.
function changeCartQuantity(product, direction) {
    var item = cart.filter(function (i) { return i.productId === product.id; })[0];
    if (!item) return;

    var step = product.qtyStep || CONFIG.defaultQtyStep;
    var minQty = product.minQty || CONFIG.defaultMinQty;
    var newQty = item.quantity + (direction * step);

    if (direction < 0 && newQty < minQty) {
        removeFromCart(product.id);
        return;
    }

    item.quantity = normalizeQuantity(product, newQty);
    saveCart();
    renderCartBadge();
    renderCartModal();
}

function clearCart() {
    cart = [];
    saveCart();
    renderCartBadge();
    renderCartModal();
}

// Shared with the initial button markup in renderModalContent() below, so the
// icon only needs to be written out once.
var CART_ICON_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="20" r="1.4" fill="currentColor"/>' +
    '<circle cx="18" cy="20" r="1.4" fill="currentColor"/><path d="M2.5 3h2.4l1.9 11.2a2 2 0 0 0 2 1.7h8.4a2 2 0 0 0 1.96-1.6L21 8H6.2" ' +
    'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

// Rebuilds the Add to Cart button's full content (icon + badge) from scratch
// every time, rather than only toggling classes on whatever's currently
// there - the click handler below temporarily replaces the button's content
// with a checkmark, and this is what's responsible for restoring the real
// icon afterward, not just its highlight state. Called on modal open, and
// again after the "Added" confirmation finishes so it reflects a click made
// in this same dialog session too.
function updateAddToCartButtonState() {
    var btn = document.getElementById('add-to-cart-btn');
    if (!btn || !currentProduct) return;

    var item = cart.filter(function (i) { return i.productId === currentProduct.id; })[0];
    var count = item ? (item.quantity > 99 ? '99+' : item.quantity) : '0';

    btn.innerHTML = CART_ICON_SVG +
        '<span id="add-to-cart-badge" class="cta-badge"' + (item ? '' : ' hidden') + '>' + count + '</span>';

    if (item) {
        btn.classList.add('in-cart');
        btn.setAttribute('aria-label', 'In cart: ' + item.quantity + '. Go to cart.');
        btn.setAttribute('data-tooltip', 'In cart: ' + item.quantity + ' \u2014 go to cart');
    } else {
        btn.classList.remove('in-cart');
        btn.setAttribute('aria-label', 'Add to Cart');
        btn.setAttribute('data-tooltip', 'Add to Cart');
    }
}

function renderCartBadge() {
    var badge = document.getElementById('cart-badge');
    var cartBtn = document.getElementById('cart-btn');
    if (!badge) return;

    var count = getCartCount();
    if (count > 0) {
        badge.textContent = count > 99 ? '99+' : count;
        badge.hidden = false;
        if (cartBtn) {
            cartBtn.classList.add('has-items');
            cartBtn.setAttribute('aria-label', 'Go to cart, ' + count + (count === 1 ? ' item' : ' items'));
        }
    } else {
        badge.textContent = '0';
        badge.hidden = true;
        if (cartBtn) {
            cartBtn.classList.remove('has-items');
            cartBtn.setAttribute('aria-label', 'Open cart');
        }
    }
}

// One line per cart entry, plus a grand total - this is what actually reaches
// the business, since there is no backend to place the order through otherwise.
function generateCartWhatsAppMessage() {
    var message = CONFIG.greeting + '\n\n';
    var grandTotal = 0;

    cart.forEach(function (item) {
        var product = findProductById(item.productId);
        if (!product) return;
        var pricing = calculatePricing(product, item.quantity);
        grandTotal += pricing.total;

        message += '• ' + product.name + ' x' + item.quantity;
        if (pricing.discount > 0) {
            message += ' (' + pricing.discount + '% off)';
        }
        message += ' - ' + formatCurrency(pricing.total) + '\n';
    });

    message += '\nGrand Total: ' + formatCurrency(grandTotal) + '\n\nThank you!';
    return message;
}

function renderCartModal() {
    var body = document.getElementById('cart-body');
    var footer = document.getElementById('cart-footer');
    var clearBtn = document.getElementById('cart-clear-btn');
    if (!body) return;

    if (cart.length === 0) {
        body.innerHTML = '<p class="cart-empty">Your cart is empty. Add a few products to build a bulk order.</p>';
        footer.hidden = true;
        clearBtn.hidden = true;
        return;
    }

    footer.hidden = false;
    clearBtn.hidden = false;

    var html = '';
    var grandTotal = 0;

    cart.forEach(function (item) {
        var product = findProductById(item.productId);
        if (!product) return;

        var pricing = calculatePricing(product, item.quantity);
        grandTotal += pricing.total;
        var images = getProductImages(product);

        html +=
            '<div class="cart-item" data-product-id="' + escapeHtml(product.id) + '">' +
            '<img src="' + escapeHtml(images[0]) + '" alt="' + escapeHtml(product.name) + '" class="cart-item-image">' +
            '<div class="cart-item-info">' +
            '<div class="cart-item-name">' + escapeHtml(product.name) + '</div>' +
            '<div class="cart-item-unit">' + formatCurrency(pricing.unitPrice) + ' each' +
                (pricing.discount > 0 ? ' · ' + pricing.discount + '% off' : '') +
            '</div>' +
            '<div class="cart-item-stepper">' +
            '<button type="button" class="cart-qty-btn cart-qty-decrease" aria-label="Decrease quantity of ' + escapeHtml(product.name) + '">&minus;</button>' +
            '<span class="cart-qty-value">' + item.quantity + '</span>' +
            '<button type="button" class="cart-qty-btn cart-qty-increase" aria-label="Increase quantity of ' + escapeHtml(product.name) + '">+</button>' +
            '</div>' +
            '</div>' +
            '<div class="cart-item-total">' +
            '<div class="cart-item-price">' + formatCurrency(pricing.total) + '</div>' +
            '<button type="button" class="cart-item-remove" aria-label="Remove ' + escapeHtml(product.name) + ' from cart">&times;</button>' +
            '</div>' +
            '</div>';
    });

    body.innerHTML = html;
    document.getElementById('cart-grand-total').textContent = formatCurrency(grandTotal);

    var checkoutBtn = document.getElementById('cart-checkout-btn');
    var encoded = encodeURIComponent(generateCartWhatsAppMessage());
    var phoneNumber = CONFIG.whatsappNumber.replace(/\D/g, '');
    checkoutBtn.href = 'https://wa.me/' + phoneNumber + '?text=' + encoded;
}

function openCartModal() {
    cartModalOpen = true;
    lastFocusedElement = document.activeElement;

    var overlay = document.getElementById('cart-overlay');
    var modal = document.getElementById('cart-modal');

    renderCartModal();
    overlay.style.display = 'flex';

    document.querySelector('.site-header').setAttribute('aria-hidden', 'true');
    document.getElementById('product-grid').setAttribute('aria-hidden', 'true');

    var closeBtn = document.getElementById('cart-close');
    setTimeout(function () {
        closeBtn.focus();
    }, 100);

    setupFocusTrap(modal);
}

function closeCartModal() {
    var overlay = document.getElementById('cart-overlay');

    document.querySelector('.site-header').removeAttribute('aria-hidden');
    document.getElementById('product-grid').removeAttribute('aria-hidden');

    overlay.style.display = 'none';
    cartModalOpen = false;
    focusTrapElements = [];

    if (lastFocusedElement) {
        lastFocusedElement.focus();
        lastFocusedElement = null;
    }
}

// Wired once from init(), same reasoning as setupNotifyModal(): this modal's
// markup is static in index.html (unlike the product modal, which rebuilds its
// innerHTML on every open), so its handlers only need binding once. cart-body's
// item rows do get rebuilt on every cart change, so their buttons are handled
// through one delegated listener rather than being rebound per render.
function setupCartModal() {
    var openBtn = document.getElementById('cart-btn');
    var closeBtn = document.getElementById('cart-close');
    var overlay = document.getElementById('cart-overlay');
    var clearBtn = document.getElementById('cart-clear-btn');
    var body = document.getElementById('cart-body');

    if (!openBtn) return;

    openBtn.addEventListener('click', openCartModal);
    closeBtn.addEventListener('click', closeCartModal);

    overlay.addEventListener('click', function (e) {
        if (e.target === overlay) {
            closeCartModal();
        }
    });

    clearBtn.addEventListener('click', clearCart);

    body.addEventListener('click', function (e) {
        var itemEl = e.target.closest('.cart-item');
        if (!itemEl) return;

        var product = findProductById(itemEl.getAttribute('data-product-id'));
        if (!product) return;

        if (e.target.closest('.cart-qty-decrease')) {
            changeCartQuantity(product, -1);
        } else if (e.target.closest('.cart-qty-increase')) {
            changeCartQuantity(product, 1);
        } else if (e.target.closest('.cart-item-remove')) {
            removeFromCart(product.id);
        }
    });
}

// Theme
// The inline script in index.html already set data-theme before first paint.
// This only keeps the button icon in sync and saves the visitor's choice.
var THEME_KEY = 'toystore-theme';

var SUN_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.2" fill="currentColor"/>' +
    '<g stroke="currentColor" stroke-width="2" stroke-linecap="round">' +
    '<line x1="12" y1="2.5" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="21.5"/>' +
    '<line x1="2.5" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="21.5" y2="12"/>' +
    '<line x1="4.9" y1="4.9" x2="6.7" y2="6.7"/><line x1="17.3" y1="17.3" x2="19.1" y2="19.1"/>' +
    '<line x1="4.9" y1="19.1" x2="6.7" y2="17.3"/><line x1="17.3" y1="6.7" x2="19.1" y2="4.9"/>' +
    '</g></svg>';

var MOON_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" ' +
    'd="M20.4 14.7A8.5 8.5 0 1 1 9.3 3.6a7 7 0 0 0 11.1 11.1z"/></svg>';

function currentTheme() {
    return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
}

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    try {
        localStorage.setItem(THEME_KEY, theme);
    } catch (e) {
        // Private browsing can block storage; the theme still applies for this visit.
    }

    // Keep the browser's own chrome (Android address bar, iOS status bar strip)
    // matching the page instead of staying stuck on the light-mode default.
    var themeColorMeta = document.getElementById('meta-theme-color');
    if (themeColorMeta) {
        themeColorMeta.setAttribute('content', theme === 'light' ? '#FFFFFF' : '#1C1F24');
    }

    var btn = document.getElementById('theme-toggle');
    if (!btn) return;
    // Icon (and tooltip/aria-label) show the theme a click switches TO, same
    // sense the old text label used ("Light mode" meant "switch to light").
    var next = theme === 'light' ? 'dark' : 'light';
    btn.innerHTML = next === 'light' ? SUN_ICON : MOON_ICON;
    btn.setAttribute('aria-label', 'Switch to ' + next + ' theme');
    btn.setAttribute('data-tooltip', next === 'light' ? 'Light mode' : 'Dark mode');
}

function setupThemeToggle() {
    var btn = document.getElementById('theme-toggle');
    if (!btn) return;
    applyTheme(currentTheme());
    btn.addEventListener('click', function () {
        applyTheme(currentTheme() === 'light' ? 'dark' : 'light');
    });
}

// Render product grid
function renderProducts() {
    var grid = document.getElementById('product-grid');
    grid.innerHTML = '';

    if (PRODUCTS.length === 0) {
        grid.innerHTML = '<div class="grid-empty">No products available yet. Add products in assets/js/products.js to get started.</div>';
        return;
    }

    PRODUCTS.forEach(function (product, index) {
        if (!product.name || !product.price || !product.imageCount) {
            console.warn('Product missing required fields:', product);
            return;
        }
        var card = document.createElement('article');
        card.className = 'product-card';
        card.setAttribute('role', 'button');
        card.setAttribute('tabindex', '0');
        card.setAttribute('data-product-index', index);

        var images = getProductImages(product);
        var maxDiscount = getMaxDiscount(product);

        var discountBadge = '';
        if (maxDiscount > 0) {
            discountBadge = '<div class="discount-badge">Save up to ' + maxDiscount + '% OFF</div>';
        }

        var dots = '';
        if (images.length > 1) {
            dots = '<div class="card-dots" aria-hidden="true">';
            for (var d = 0; d < images.length; d++) {
                dots += '<span class="card-dot' + (d === 0 ? ' is-active' : '') + '"></span>';
            }
            dots += '</div>';
        }

        card.innerHTML =
            '<div class="card-image-container">' +
            '<img src="' + escapeHtml(images[0]) + '" alt="' + escapeHtml(product.name) + '" class="card-image is-visible" data-layer="0">' +
            '<img alt="" aria-hidden="true" class="card-image" data-layer="1">' +
            dots +
            discountBadge +
            '</div>' +
            '<div class="card-content">' +
                '<h2 class="card-title">' + escapeHtml(product.name) + '</h2>' +
                '<p class="card-tagline">' + escapeHtml(product.tagline) + '</p>' +
                '<div class="card-price">'+ formatCurrency(product.price) +
                    ' <span class="card-price-unit">per unit</span>' +
                '</div>' +
                '<div class="card-age">' + escapeHtml(product.ageRange) + '</div>' +
            '</div>';

        card.baseImage = images[0];

        if (images.length > 1 && canAnimateRoll()) {
            card.addEventListener('mouseenter', function () {
                startImageRoll(this, product);
            });
            card.addEventListener('mouseleave', function () {
                stopImageRoll(this);
            });
        }

        setupCardSwipe(card, product);

        grid.appendChild(card);
    });
}

// Open modal for product
function openModal(product) {
    currentProduct = product;
    currentQuantity = product.minQty || CONFIG.defaultMinQty;

    lastFocusedElement = document.activeElement;

    var modal = document.getElementById('product-modal');
    var overlay = document.getElementById('modal-overlay');

    renderModalContent();

    modal.style.display = 'block';
    overlay.style.display = 'flex';

    document.querySelector('.site-header').setAttribute('aria-hidden', 'true');
    document.getElementById('product-grid').setAttribute('aria-hidden', 'true');

    // Focus close button
    var closeBtn = document.getElementById('modal-close');
    setTimeout(function() {
        closeBtn.focus();
    }, 100);

    // Setup focus trap
    setupFocusTrap(modal);
}

// Close modal
function closeModal() {
    var modal = document.getElementById('product-modal');
    var overlay = document.getElementById('modal-overlay');

    document.querySelector('.site-header').removeAttribute('aria-hidden');
    document.getElementById('product-grid').removeAttribute('aria-hidden');

    modal.style.display = 'none';
    overlay.style.display = 'none';

    currentProduct = null;
    currentQuantity = 0;
    focusTrapElements = [];

    // Restore focus
    if (lastFocusedElement) {
        lastFocusedElement.focus();
        lastFocusedElement = null;
    }
}

// Open the "notify me about new products" modal
function openNotifyModal() {
    notifyModalOpen = true;
    lastFocusedElement = document.activeElement;

    var overlay = document.getElementById('notify-overlay');
    var modal = document.getElementById('notify-modal');

    overlay.style.display = 'flex';

    document.querySelector('.site-header').setAttribute('aria-hidden', 'true');
    document.getElementById('product-grid').setAttribute('aria-hidden', 'true');

    var phoneInput = document.getElementById('notify-phone');
    setTimeout(function() {
        phoneInput.focus();
    }, 100);

    setupFocusTrap(modal);
}

// Close the notify modal and reset it for next time
function closeNotifyModal() {
    var overlay = document.getElementById('notify-overlay');
    var form = document.getElementById('notify-form');
    var success = document.getElementById('notify-success');
    var error = document.getElementById('notify-error');
    var submitBtn = form.querySelector('.notify-submit-btn');

    document.querySelector('.site-header').removeAttribute('aria-hidden');
    document.getElementById('product-grid').removeAttribute('aria-hidden');

    overlay.style.display = 'none';
    form.reset();
    form.hidden = false;
    success.hidden = true;
    error.textContent = '';
    document.getElementById('notify-phone').removeAttribute('aria-invalid');
    submitBtn.disabled = false;
    submitBtn.innerHTML = 'Notify Me <span aria-hidden="true">💬</span>';

    notifyModalOpen = false;
    focusTrapElements = [];

    if (lastFocusedElement) {
        lastFocusedElement.focus();
        lastFocusedElement = null;
    }
}

// Handle notify form submit: validate the number, then send it to the Google Sheet
// webhook (see config.js). GitHub Pages can't run a backend itself, so a small
// Apps Script Web App bound to a Sheet is what actually stores the signup.
//
// The save happens in the background rather than being waited on: with
// mode: 'no-cors' the response is opaque anyway (see the fetch call below), so
// waiting on it before showing "Thanks!" would only add a delay without adding
// any real certainty. The one case this trades away is a genuine network failure -
// there is no error shown for that; the row will simply be missing from the Sheet.
function handleNotifySubmit(e) {
    e.preventDefault();

    var input = document.getElementById('notify-phone');
    var error = document.getElementById('notify-error');
    var form = document.getElementById('notify-form');
    var digits = input.value.replace(/\D/g, '');

    if (digits.length < 10 || digits.length > 15) {
        error.textContent = 'Please enter a valid WhatsApp number.';
        input.setAttribute('aria-invalid', 'true');
        input.focus();
        return;
    }

    error.textContent = '';
    input.removeAttribute('aria-invalid');

    if (!CONFIG.sheetWebhookUrl) {
        error.textContent = 'Sign-ups aren\'t set up yet - please check back soon.';
        return;
    }

    if (window.fetch) {
        fetch(CONFIG.sheetWebhookUrl, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify({ phone: digits, submittedAt: new Date().toISOString() })
        }).catch(function () {
            // Best-effort: nothing meaningful to show the visitor at this point,
            // since the "Thanks!" confirmation is already on screen.
        });
    }

    form.hidden = true;
    document.getElementById('notify-success').hidden = false;
    setTimeout(closeNotifyModal, 2400);
}

// Wire up the notify button, modal close controls and form submit. Called once
// from init(), unlike the product modal's handlers which are rebound on every open
// because that modal's HTML is rebuilt each time.
function setupNotifyModal() {
    var openBtn = document.getElementById('notify-open-btn');
    var closeBtn = document.getElementById('notify-close');
    var overlay = document.getElementById('notify-overlay');
    var form = document.getElementById('notify-form');

    if (!openBtn) return;

    openBtn.addEventListener('click', openNotifyModal);
    closeBtn.addEventListener('click', closeNotifyModal);
    form.addEventListener('submit', handleNotifySubmit);

    overlay.addEventListener('click', function(e) {
        if (e.target === overlay) {
            closeNotifyModal();
        }
    });
}


function renderModalContent() {
    if (!currentProduct) return;

    var modal = document.getElementById('product-modal');
    var images = getProductImages(currentProduct);

    // Gallery
    var thumbnails = images.map(function(src, i) {
        return '<img src="' + escapeHtml(src) + '" alt="' + escapeHtml(currentProduct.name + ' view ' + (i + 1)) +
		'" class="gallery-thumb" tabindex="0" role="button" data-image-index="' + i + '">';
    }).join('');

    var thumbsHtml = images.length > 1 ? '<div class="gallery-thumbs">' + thumbnails + '</div>' : '';

    var navHtml = images.length > 1 ?
        '<button type="button" class="gallery-nav gallery-nav-prev" aria-label="Previous image">' +
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 4l-8 8 8 8" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
        '</button>' +
        '<button type="button" class="gallery-nav gallery-nav-next" aria-label="Next image">' +
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4l8 8-8 8" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
        '</button>' +
        '<div class="gallery-counter" aria-hidden="true"><span id="gallery-counter-current">1</span> / ' + images.length + '</div>'
        : '';

    var maxDiscount = getMaxDiscount(currentProduct);
    var saveUpWrap = '';
    if (maxDiscount > 0) {
        // Full tier breakdown lives on the info icon's tooltip, not the badge
        // itself - the badge stays a plain "Save up to X%" summary, and this
        // is where someone can check what quantities actually unlock it.
        var currDiscountTiers = getDiscountTiers(currentProduct);
        var sortedTiers = currDiscountTiers.slice().sort(function(a, b) {
            return a.minQty - b.minQty;
        });
        var tierTooltip = sortedTiers.map(function(tier) {
            return 'Add '+tier.minQty + '+ units: ' + tier.percent + '% off';
        }).join('\n');

        saveUpWrap =
            '<div class="save-up-wrap">' +
            '<div class="save-up-to-badge">Save up to ' + maxDiscount + '%</div>' +
            '<button type="button" class="save-info-btn" aria-label="Discount tiers" data-tooltip="' + escapeHtml(tierTooltip) + '">i</button>' +
            '</div>';
    }

    modal.innerHTML =
        '<button id="modal-close" class="modal-close" aria-label="Close product details">&times;</button>' +
        '<div class="modal-layout">' +
        '<div class="modal-gallery">' +
        '<div class="gallery-frame">' +
        '<img id="gallery-main" src="' + escapeHtml(images[0]) + '" alt="' + escapeHtml(currentProduct.name) + '" class="gallery-main">' +
        navHtml +
        '</div>' +
        thumbsHtml +
        '</div>' +
        '<div class="modal-details">' +
        '<h1 id="modal-title" class="modal-title">' + escapeHtml(currentProduct.name) + '</h1>' +
        '<p class="modal-tagline">' + escapeHtml(currentProduct.tagline) + '</p>' +
        '<p class="modal-description">' + escapeHtml(currentProduct.description) + '</p>' +
        '<div class="modal-age">Recommended: ' + escapeHtml(currentProduct.ageRange) + '</div>' +
        // Unit price, the quantity stepper, and the resulting total now live in
        // one merged line ("₹150 × [stepper] = ₹750 ₹697.50") instead of a
        // separate quantity section and a 4-row price breakdown. The stepper
        // itself (#qty-decrease/#quantity-input/#qty-increase) is built once
        // here and never rebuilt - only the two text spans either side of it
        // are touched by updatePriceDisplay() on every quantity change, so the
        // stepper buttons' event listeners (bound once in attachModalHandlers)
        // are never destroyed by a price refresh.
        '<div id="price-display" class="price-display" role="status" aria-live="polite">' +
        saveUpWrap +
        '<div class="price-content-row" >' +
        '<span id="price-unit-text" class="price-unit"></span>' +
        '<span class="price-times" aria-hidden="true">\u00d7</span>' +
        '<div class="quantity-stepper" >' +
        '<button id="qty-decrease" class="qty-btn" aria-label="Decrease quantity">\u2212</button>' +
        '<input type="number" id="quantity-input" class="qty-input" inputmode="numeric" value="' + currentQuantity +
		'" min="' + currentProduct.minQty + '" step="' + currentProduct.qtyStep + '" aria-label="Quantity">' +
        '<button id="qty-increase" class="qty-btn" aria-label="Increase quantity">+</button>' +
        '</div>' +
        '<span class="price-equals" aria-hidden="true">=</span>' +
        '<span id="price-result" class="price-result"></span>' +
        '</div>' +
        '</div>' +
        '<div class="modal-cta-group">' +
        '<button type="button" id="add-to-cart-btn" class="add-to-cart-btn" aria-label="Add to Cart" data-tooltip="Add to Cart"></button>' +
        '<a id="whatsapp-cta" class="whatsapp-btn" href="#" target="_blank" rel="noopener" aria-label="Order via WhatsApp" data-tooltip="Order via WhatsApp">' +
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path fill="currentColor" fill-rule="evenodd" clip-rule="evenodd" d="M12.032 2.001c-5.522 0-9.998 4.477-9.998 9.999 0 1.764.461 3.44 1.267 4.895L2 22l5.245-1.372a9.96 9.96 0 0 0 4.787 1.22h.003c5.522 0 9.998-4.477 9.998-9.999 0-5.521-4.477-9.998-9.999-9.998zm0 18.174h-.002a8.15 8.15 0 0 1-4.157-1.14l-.297-.176-3.087.809.824-3.01-.194-.309a8.164 8.164 0 0 1-1.254-4.35c0-4.51 3.671-8.181 8.183-8.181 2.186 0 4.24.851 5.786 2.398a8.131 8.131 0 0 1 2.394 5.788c0 4.512-3.671 8.171-8.196 8.171z"/></svg>' +
        '</a>' +
        '</div>' +
        '</div>' +
        '</div>';

    updatePriceDisplay();
    updateAddToCartButtonState();
    attachModalHandlers();
}

// Update price display
function updatePriceDisplay() {
    if (!currentProduct) return;

    var pricing = calculatePricing(currentProduct, currentQuantity);
    var unitText = document.getElementById('price-unit-text');
    var result = document.getElementById('price-result');

    if (unitText) {
        unitText.textContent = formatCurrency(pricing.unitPrice);
    }

    if (result) {
        var resultHtml = '';
        if (pricing.discount > 0) {
            // pricing.subtotal is unitPrice * qty before any discount - shown
            // struck through next to the actual (discounted) total, so the
            // saving is visible at a glance without a separate line for it.
            resultHtml += '<s class="price-strike">' + formatCurrency(pricing.subtotal) + '</s> ';
        }
        resultHtml += '<strong class="price-final">' + formatCurrency(pricing.total) + '</strong>';
        if (pricing.discount > 0) {
            resultHtml += '<span class="price-discount-tag">' + pricing.discount + '% off</span>';
        }
        result.innerHTML = resultHtml;
    }

    // The + button's tooltip shows just the next reachable discount, not the
    // full tier list, and it updates on every quantity change rather than
    // being fixed at modal-open time.
    var nextTier = getNextTier(currentProduct, currentQuantity);
    var increaseBtn = document.getElementById('qty-increase');
    if (increaseBtn) {
        if (nextTier) {
            increaseBtn.setAttribute('data-tooltip', 'Add ' + nextTier.itemsNeeded + ' more for ' + nextTier.percent + '% off');
        } else {
            increaseBtn.removeAttribute('data-tooltip');
        }
    }

    updateStepperState();
    updateWhatsAppLink();
}

// Generate WhatsApp message
function generateWhatsAppMessage() {
    if (!currentProduct) return '';

    var pricing = calculatePricing(currentProduct, currentQuantity);

    var message = CONFIG.greeting + '\n\n';
    message += 'Product: ' + currentProduct.name + '\n';
    message += 'Quantity: ' + currentQuantity + '\n';
    message += 'Unit Price: ' + formatCurrency(pricing.unitPrice) + '\n';

    if (pricing.discount > 0) {
        message += 'Discount: ' + pricing.discount + '%\n';
    }

    message += 'Total: ' + formatCurrency(pricing.total) + '\n\n';
    message += 'Thank you!';

    return message;
}

// Update WhatsApp Link
function updateWhatsAppLink() {
    var btn = document.getElementById('whatsapp-cta');
    if (!btn) return;

    var message = generateWhatsAppMessage();
    var encoded = encodeURIComponent(message);
    var phoneNumber = CONFIG.whatsappNumber.replace(/\D/g, '');
    var url = 'https://wa.me/' + phoneNumber + '?text=' + encoded;

    btn.href = url;
}

// Setup focus trap. Shared by the product modal and the notify modal - whichever
// element is passed in is the one Tab gets trapped inside.
function setupFocusTrap(modalEl) {
    focusTrapElements = modalEl.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
}

// Handle focus trap
function handleFocusTrap(e) {
    if (focusTrapElements.length === 0) return;

    var firstElement = focusTrapElements[0];
    var lastElement = focusTrapElements[focusTrapElements.length - 1];

    if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
    } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
    }
}

// Attach modal event handlers
function attachModalHandlers() {
    var closeBtn = document.getElementById('modal-close');
    var qtyInput = document.getElementById('quantity-input');
    var decreaseBtn = document.getElementById('qty-decrease');
    var increaseBtn = document.getElementById('qty-increase');
    var thumbs = document.querySelectorAll('.gallery-thumb');

    closeBtn.addEventListener('click', closeModal);

    var addToCartBtn = document.getElementById('add-to-cart-btn');
    if (addToCartBtn) {
        addToCartBtn.addEventListener('click', function () {
            if (addToCartBtn.classList.contains('in-cart')) {
                // Already added (either from an earlier visit or a click earlier in
                // this session) - the button now acts as a shortcut to the cart
                // instead of stacking on more of the same quantity unasked.
                closeModal();
                openCartModal();
                return;
            }

            addToCart(currentProduct, currentQuantity);

            // Quiet confirmation on the button itself rather than a toast - this
            // modal has no toast system. Once it finishes, updateAddToCartButtonState()
            // rebuilds the icon+badge from the real cart data rather than restoring
            // saved markup, so the highlight reflects the click that just happened -
            // in the same dialog session, not just on the next time it's opened.
            addToCartBtn.innerHTML = '<span aria-hidden="true">\u2713</span>';
            addToCartBtn.classList.add('in-cart');
            addToCartBtn.disabled = true;

            setTimeout(function () {
                addToCartBtn.disabled = false;
                updateAddToCartButtonState();
            }, 1400);
        });
    }

    qtyInput.addEventListener('change', function() {
        currentQuantity = validateQuantity(currentProduct, qtyInput.value);
        qtyInput.value = currentQuantity;
        updatePriceDisplay();
    });

    qtyInput.addEventListener('blur', function() {
        currentQuantity = validateQuantity(currentProduct, qtyInput.value);
        qtyInput.value = currentQuantity;
        updatePriceDisplay();
    });

    decreaseBtn.addEventListener('click', function() {
        var newQty = currentQuantity - currentProduct.qtyStep;
        currentQuantity = normalizeQuantity(currentProduct, newQty);
        qtyInput.value = currentQuantity;
        updatePriceDisplay();
    });

    increaseBtn.addEventListener('click', function() {
        var newQty = currentQuantity + currentProduct.qtyStep;
        currentQuantity = normalizeQuantity(currentProduct, newQty);
        qtyInput.value = currentQuantity;
        updatePriceDisplay();

        // Touch devices have no :hover, so the CSS tooltip above never appears
        // there on its own - this nudges it into view briefly on tap instead,
        // alongside the normal increment (the tooltip is supplementary info,
        // not a separate action, so there's no harm in both happening at once).
        if (increaseBtn.hasAttribute('data-tooltip')) {
            increaseBtn.classList.add('tooltip-visible');
            clearTimeout(increaseBtn._tooltipTimer);
            increaseBtn._tooltipTimer = setTimeout(function () {
                increaseBtn.classList.remove('tooltip-visible');
            }, 1800);
        }
    });

    var saveInfoBtn = document.querySelector('.save-info-btn');
    if (saveInfoBtn) {
        saveInfoBtn.addEventListener('click', function () {
            saveInfoBtn.classList.add('tooltip-visible');
            clearTimeout(saveInfoBtn._tooltipTimer);
            saveInfoBtn._tooltipTimer = setTimeout(function () {
                saveInfoBtn.classList.remove('tooltip-visible');
            }, 2200);
        });
    }

    var images = getProductImages(currentProduct);
    var mainImage = document.getElementById('gallery-main');
    var counter = document.getElementById('gallery-counter-current');
    var activeIndex = 0;

    // Single source of truth for "which image is showing" - used by thumbnail
    // taps, the prev/next buttons, and the swipe gesture below, so all three stay
    // in sync instead of duplicating the same DOM updates three times.
    function setActiveImage(index) {
        // Wrap around both ends so prev/next (and swiping) never dead-end.
        var wrapped = (index + images.length) % images.length;
        activeIndex = wrapped;

        mainImage.src = images[wrapped];
        mainImage.alt = currentProduct.name + ' - view ' + (wrapped + 1) + ' of ' + images.length;

        thumbs.forEach(function(t) {
            t.classList.remove('active');
            t.removeAttribute('aria-current');
        });
        if (thumbs[wrapped]) {
            thumbs[wrapped].classList.add('active');
            thumbs[wrapped].setAttribute('aria-current', 'true');
            // Bring the active thumbnail into view if the strip has scrolled past it -
            // otherwise swiping or using the prev/next buttons can silently move the
            // selection off-screen in the thumbnail row.
            thumbs[wrapped].scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        }

        if (counter) {
            counter.textContent = wrapped + 1;
        }
    }

    thumbs.forEach(function(thumb) {
        thumb.addEventListener('click', function() {
            setActiveImage(parseInt(thumb.getAttribute('data-image-index'), 10));
        });

        thumb.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                thumb.click();
            }
        });
    });

    // Set first thumb as active
    if (thumbs.length > 0) {
        thumbs[0].classList.add('active');
        thumbs[0].setAttribute('aria-current', 'true');
    }

    if (images.length > 1 && mainImage) {
        var prevBtn = document.querySelector('.gallery-nav-prev');
        var nextBtn = document.querySelector('.gallery-nav-next');

        if (prevBtn) prevBtn.addEventListener('click', function() { setActiveImage(activeIndex - 1); });
        if (nextBtn) nextBtn.addEventListener('click', function() { setActiveImage(activeIndex + 1); });

        // Swipe the main photo left/right to move between images. The modal frame
        // itself is one scrollable container on mobile (image + thumbnails +
        // details all scroll together), so a plain touchend-only check isn't
        // enough: by the time it fires, the browser may have already claimed the
        // gesture as a vertical scroll of that frame, even for a mostly-sideways
        // drag. Instead, touchmove locks onto an axis as soon as the drag is
        // clearly one or the other - horizontal calls preventDefault() so the
        // frame stops moving under it, vertical does nothing and lets the
        // browser's native scroll proceed exactly as if this listener didn't
        // exist.
        var touchStartX = 0;
        var touchStartY = 0;
        var swipeAxis = null; // null until the drag is clearly horizontal or vertical
        var swipeDx = 0;

        mainImage.addEventListener('touchstart', function(e) {
            if (e.touches.length !== 1) return;
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
            swipeAxis = null;
            swipeDx = 0;
        }, { passive: true });

        mainImage.addEventListener('touchmove', function(e) {
            if (e.touches.length !== 1) return;
            var dx = e.touches[0].clientX - touchStartX;
            var dy = e.touches[0].clientY - touchStartY;

            if (swipeAxis === null) {
                // Wait for a deliberate move (not the first jittery pixels of a
                // tap) before committing to an axis.
                if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
                swipeAxis = Math.abs(dx) > Math.abs(dy) ? 'horizontal' : 'vertical';
            }

            if (swipeAxis === 'horizontal') {
                e.preventDefault();
                swipeDx = dx;
            }
            // swipeAxis === 'vertical': do nothing - this is the frame scroll,
            // not a photo swipe, so it's left entirely to the browser.
        }, { passive: false });

        mainImage.addEventListener('touchend', function() {
            if (swipeAxis === 'horizontal' && Math.abs(swipeDx) > 40) {
                setActiveImage(swipeDx < 0 ? activeIndex + 1 : activeIndex - 1);
            }
            swipeAxis = null;
            swipeDx = 0;
        }, { passive: true });
    }
}

// Initialize app
function init() {
    // All visible naming comes from config.js, so editing it there is enough.
    // The values hardcoded in index.html are only what shows before this runs.
    var title = document.getElementById('site-title');
    var subtitle = document.getElementById('site-subtitle');
    if (title && CONFIG.businessName) title.textContent = CONFIG.businessName;
    if (subtitle && CONFIG.siteDescription) subtitle.textContent = CONFIG.siteDescription;

    if (CONFIG.siteTitle) document.title = CONFIG.siteTitle;

    var metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription && CONFIG.siteDescription) {
        metaDescription.setAttribute('content', CONFIG.siteDescription);
    }

    cart = loadCart();
    setupThemeToggle();
    renderProducts();
    setupNotifyModal();
    setupCartModal();
    renderCartBadge();

    // Grid click delegation
    var grid = document.getElementById('product-grid');
    grid.addEventListener('click', function(e) {
        var card = e.target.closest('.product-card');
        if (card) {
            var index = parseInt(card.getAttribute('data-product-index'), 10);
            openModal(PRODUCTS[index]);
        }
    });

    // Grid keyboard navigation
    grid.addEventListener('keydown', function(e) {
        var card = e.target.closest('.product-card');
        if (card && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            var index = parseInt(card.getAttribute('data-product-index'), 10);
            openModal(PRODUCTS[index]);
        }
    });

    // Overlay click to close
    var overlay = document.getElementById('modal-overlay');
    overlay.addEventListener('click', function(e) {
        if (e.target === overlay) {
            closeModal();
        }
    });

    // Escape key to close
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            if (currentProduct) {
                closeModal();
            } else if (notifyModalOpen) {
                closeNotifyModal();
            } else if (cartModalOpen) {
                closeCartModal();
            }
        }

        if (e.key === 'Tab' && (currentProduct || notifyModalOpen || cartModalOpen)) {
            handleFocusTrap(e);
        }
    });
}

// Start when DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

