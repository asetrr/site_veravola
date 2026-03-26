(function () {
    const products = window.VERAVOLA_PRODUCTS || [];
    const sizeGuide = window.VERAVOLA_SIZE_GUIDE || [];
    const looks = window.VERAVOLA_LOOKBOOK || [];
    const journal = window.VERAVOLA_JOURNAL || [];
    const brand = window.VERAVOLA_BRAND || {};
    const accountData = window.VERAVOLA_ACCOUNT || {};

    const storageKeys = {
        cart: "veravolaCart",
        wishlist: "veravolaWishlist"
    };

    let cart = readCart();
    let wishlist = readWishlist();
    let currentGalleryProductId = null;
    let currentGalleryMode = "photo";
    let currentGalleryImage = 0;
    let currentCatalogQuickFilter = "all";
    let currentCatalogView = "grid-3";
    let notificationTimer = null;
    let heroSliderTimer = null;

    const heroSlidesData = [
        {
            title: "Spring 2026",
            text: "Мягкий свет, спокойные оттенки и одежда, в которой легко быть собой."
        },
        {
            title: "Natural Layers",
            text: "Лаконичные сочетания, воздух в силуэте и мягкая тактильность натуральных тканей."
        },
        {
            title: "Quiet Evenings",
            text: "Сдержанная палитра и чистые линии для образов, которые выглядят спокойно и дорого."
        }
    ];

    function readCart() {
        try {
            const parsed = JSON.parse(localStorage.getItem(storageKeys.cart));
            if (!parsed || typeof parsed !== "object") {
                return {};
            }

            const sanitized = {};
            Object.entries(parsed).forEach(([id, quantity]) => {
                const product = getProductById(id);
                const safeQuantity = Number(quantity);
                if (product && Number.isFinite(safeQuantity) && safeQuantity > 0) {
                    sanitized[product.id] = Math.floor(safeQuantity);
                }
            });
            return sanitized;
        } catch (error) {
            return {};
        }
    }

    function readWishlist() {
        try {
            const parsed = JSON.parse(localStorage.getItem(storageKeys.wishlist));
            if (!Array.isArray(parsed)) {
                return new Set();
            }

            return new Set(
                parsed
                    .map((id) => Number(id))
                    .filter((id) => Number.isFinite(id) && !!getProductById(id))
            );
        } catch (error) {
            return new Set();
        }
    }

    function saveCart() {
        localStorage.setItem(storageKeys.cart, JSON.stringify(cart));
    }

    function saveWishlist() {
        localStorage.setItem(storageKeys.wishlist, JSON.stringify(Array.from(wishlist)));
    }

    function getProductById(id) {
        return products.find((product) => product.id === Number(id));
    }

    function getProductsByIds(ids) {
        return ids.map((id) => getProductById(id)).filter(Boolean);
    }

    function getCartItems() {
        return Object.entries(cart)
            .map(([id, quantity]) => {
                const product = getProductById(id);
                if (!product) {
                    return null;
                }

                return {
                    product,
                    quantity
                };
            })
            .filter(Boolean);
    }

    function getCartCount() {
        return Object.values(cart).reduce((sum, quantity) => sum + quantity, 0);
    }

    function formatCurrency(amount) {
        return amount + " руб.";
    }

    function pluralize(number, forms) {
        const n = Math.abs(number) % 100;
        const last = n % 10;
        if (n > 10 && n < 20) {
            return forms[2];
        }
        if (last > 1 && last < 5) {
            return forms[1];
        }
        if (last === 1) {
            return forms[0];
        }
        return forms[2];
    }

    function formatEmailForDisplay(email) {
        if (!email) {
            return "-";
        }

        return email.replace("@", "@<wbr>");
    }

    function getProductSummaryTag(product) {
        if (product.badge) {
            return product.badge;
        }

        if ((product.material || "").toLowerCase().includes("лен")) {
            return "Natural";
        }

        return product.season || "VeraVola";
    }

    function getProductSizeNote(product) {
        if (!product.sizes?.length) {
            return "";
        }

        if (product.sizes.length >= 5) {
            return "Размерный ряд расширен";
        }

        if (product.sizes.includes("XL")) {
            return "Есть до XL";
        }

        return "Осталось несколько размеров";
    }

    function getProductFeel(product) {
        return product.features?.slice(0, 2).join(" · ") || product.description;
    }

    function showNotification(message) {
        const notification = document.getElementById("notification");
        if (!notification) {
            return;
        }

        notification.textContent = message;
        notification.classList.add("show");

        if (notificationTimer) {
            window.clearTimeout(notificationTimer);
        }

        notificationTimer = window.setTimeout(() => {
            notification.classList.remove("show");
        }, 2200);
    }

    function updateCounters() {
        const cartCount = getCartCount();
        const wishlistCount = wishlist.size;

        document.querySelectorAll("[data-cart-count]").forEach((node) => {
            node.textContent = cartCount;
        });

        document.querySelectorAll("[data-wishlist-count]").forEach((node) => {
            node.textContent = wishlistCount;
        });
    }

    function toggleWishlist(id) {
        const numericId = Number(id);

        if (wishlist.has(numericId)) {
            wishlist.delete(numericId);
            showNotification("Товар убран из избранного.");
        } else {
            wishlist.add(numericId);
            showNotification("Товар добавлен в избранное.");
        }

        saveWishlist();
        updateCounters();
    }

    function addToCart(id, quantity, size) {
        const numericId = Number(id);
        const product = getProductById(numericId);

        if (!product) {
            return;
        }

        if (document.body.dataset.page === "product" && !size) {
            showNotification("Сначала выберите размер.");
            return;
        }

        const safeQuantity = Math.max(1, Number(quantity) || 1);
        cart[numericId] = (cart[numericId] || 0) + safeQuantity;
        saveCart();
        updateCounters();
        showNotification("Товар добавлен в корзину.");
    }

    function changeCartQuantity(id, delta) {
        const numericId = Number(id);
        const next = (cart[numericId] || 0) + delta;

        if (next <= 0) {
            delete cart[numericId];
        } else {
            cart[numericId] = next;
        }

        saveCart();
        updateCounters();
        renderCartPage();
    }

    function removeFromCart(id) {
        delete cart[Number(id)];
        saveCart();
        updateCounters();
        renderCartPage();
        showNotification("Товар удалён из корзины.");
    }

    function renderHeader() {
        const target = document.getElementById("siteHeader");
        if (!target) {
            return;
        }

        const page = document.body.dataset.page;
        const navItems = [
            { href: "index.html", label: "Главная", key: "home" },
            { href: "catalog.html", label: "Каталог", key: "catalog" },
            { href: "lookbook.html", label: "Lookbook", key: "lookbook" },
            { href: "about.html", label: "О бренде", key: "about" },
            { href: "blog.html", label: "Журнал", key: "blog" },
            { href: "contacts.html", label: "Контакты", key: "contacts" }
        ];

        const links = navItems.map((item) => {
            const isActive = page === item.key || (page === "product" && item.key === "catalog");
            return `<a class="${isActive ? "is-active" : ""}" href="${item.href}">${item.label}</a>`;
        }).join("");

        target.innerHTML = `
            <header class="site-header">
                <div class="container header-row">
                    <a class="brand-mark" href="index.html">Vera<span>Vola</span></a>
                    <nav class="nav-links" aria-label="Основная навигация">${links}</nav>
                    <div class="header-tools">
                        <button class="icon-button desktop-only" type="button" id="searchToggle" aria-label="Поиск">
                            <i class="fa-solid fa-magnifying-glass"></i>
                        </button>
                        <a class="icon-link" href="wishlist.html" aria-label="Избранное">
                            <i class="fa-regular fa-heart"></i>
                            <span class="counter" data-wishlist-count>0</span>
                        </a>
                        <a class="icon-link" href="cart.html" aria-label="Корзина">
                            <i class="fa-solid fa-bag-shopping"></i>
                            <span class="counter" data-cart-count>0</span>
                        </a>
                        <a class="icon-link desktop-only" href="account.html" aria-label="Личный кабинет">
                            <i class="fa-regular fa-user"></i>
                        </a>
                        <button class="menu-toggle" type="button" id="menuToggle" aria-label="Открыть меню">
                            <i class="fa-solid fa-bars"></i>
                        </button>
                    </div>
                </div>
                <div class="container mobile-panel" id="mobilePanel">
                    <nav aria-label="Мобильная навигация">
                        ${links}
                        <a href="shipping.html">Доставка и оплата</a>
                        <a href="account.html">Личный кабинет</a>
                        <a href="wishlist.html">Избранное</a>
                        <a href="cart.html">Корзина</a>
                    </nav>
                </div>
            </header>
        `;

        const menuToggle = document.getElementById("menuToggle");
        const mobilePanel = document.getElementById("mobilePanel");
        if (menuToggle && mobilePanel) {
            menuToggle.addEventListener("click", () => {
                mobilePanel.classList.toggle("open");
            });
        }
    }

    function renderFooter() {
        const target = document.getElementById("siteFooter");
        if (!target) {
            return;
        }

        target.innerHTML = `
            <footer class="site-footer" id="contacts">
                <div class="container footer-shell reveal">
                    <div class="footer-grid">
                        <div class="footer-column">
                            <div class="brand-mark">Vera<span>Vola</span></div>
                            <p>Интернет-магазин женской одежды из натуральных тканей с мягкой эстетикой, спокойной роскошью и тактильным качеством.</p>
                            <div class="footer-socials">
                                <a href="https://instagram.com" target="_blank" rel="noreferrer" aria-label="Instagram"><i class="fa-brands fa-instagram"></i></a>
                                <a href="https://t.me" target="_blank" rel="noreferrer" aria-label="Telegram"><i class="fa-brands fa-telegram"></i></a>
                                <a href="mailto:hello@veravola.by" aria-label="Email"><i class="fa-solid fa-envelope"></i></a>
                            </div>
                        </div>
                        <div class="footer-column">
                            <h3>Разделы</h3>
                            <ul>
                                <li><a href="catalog.html">Каталог</a></li>
                                <li><a href="lookbook.html">Lookbook</a></li>
                                <li><a href="about.html">О бренде</a></li>
                                <li><a href="blog.html">Журнал</a></li>
                            </ul>
                        </div>
                        <div class="footer-column">
                            <h3>Покупателям</h3>
                            <ul>
                                <li><a href="shipping.html">Доставка и оплата</a></li>
                                <li><a href="wishlist.html">Избранное</a></li>
                                <li><a href="account.html">Личный кабинет</a></li>
                                <li><a href="cart.html">Корзина</a></li>
                            </ul>
                        </div>
                        <div class="footer-column">
                            <h3>Контакты</h3>
                            <ul>
                                <li>hello@veravola.by</li>
                                <li>+375 (29) 123-45-67</li>
                                <li>Минск, Беларусь</li>
                                <li>Ежедневно 10:00-20:00</li>
                            </ul>
                        </div>
                    </div>
                    <div class="footer-bottom">
                        <span>© 2026 VeraVola. Все права защищены.</span>
                        <span>Натуральность, комфорт и тихая роскошь в цифровом формате.</span>
                    </div>
                </div>
            </footer>
        `;
    }

    function renderGlobalOverlays() {
        if (!document.getElementById("searchOverlay")) {
            const searchOverlay = document.createElement("div");
            searchOverlay.className = "search-overlay";
            searchOverlay.id = "searchOverlay";
            searchOverlay.innerHTML = `
                <div class="search-modal">
                    <div class="search-head">
                        <h2>Поиск</h2>
                        <button class="search-close" type="button" id="searchClose" aria-label="Закрыть поиск">
                            <i class="fa-solid fa-xmark"></i>
                        </button>
                    </div>
                    <div class="search-input-wrap">
                        <input type="search" id="globalSearchInput" placeholder="Например: лен, платье, чёрный">
                    </div>
                    <div class="search-results" id="globalSearchResults"></div>
                </div>
            `;
            document.body.appendChild(searchOverlay);
        }

        if (!document.getElementById("lightboxOverlay")) {
            const lightbox = document.createElement("div");
            lightbox.className = "lightbox-overlay";
            lightbox.id = "lightboxOverlay";
            lightbox.innerHTML = `
                <div class="lightbox-modal">
                    <div class="lightbox-head" style="padding: 18px 22px 0;">
                        <h2 id="lightboxTitle">Фото</h2>
                        <button class="lightbox-close" type="button" id="lightboxClose" aria-label="Закрыть фото">
                            <i class="fa-solid fa-xmark"></i>
                        </button>
                    </div>
                    <img class="lightbox-main" id="lightboxImage" alt="">
                    <div class="lightbox-caption" id="lightboxCaption"></div>
                </div>
            `;
            document.body.appendChild(lightbox);
        }
    }

    function createProductCard(product) {
        const badgeClass = product.badge.toLowerCase() === "sale" ? "product-badge sale" : "product-badge";
        const badge = product.badge ? `<span class="${badgeClass}">${product.badge}</span>` : "";
        const active = wishlist.has(product.id) ? "is-active" : "";
        const heartIcon = wishlist.has(product.id) ? "fa-solid" : "fa-regular";
        const sizePreview = (product.sizes || []).slice(0, 4).map((size) => `<span>${size}</span>`).join("");

        return `
            <article class="product-card reveal">
                <a href="product.html?id=${product.id}">
                    <div class="product-thumb">
                        ${badge}
                        <img src="${product.image}" alt="${product.name}">
                        <div class="product-hover-copy">
                            <span>${getProductSummaryTag(product)}</span>
                            <p>${getProductFeel(product)}</p>
                        </div>
                    </div>
                </a>
                <div class="product-actions">
                    <a href="product.html?id=${product.id}" aria-label="Открыть ${product.name}">
                        <i class="fa-solid fa-eye"></i>
                    </a>
                    <button type="button" class="${active}" data-wishlist-toggle="${product.id}" aria-label="Добавить в избранное">
                        <i class="${heartIcon} fa-heart"></i>
                    </button>
                    <button type="button" data-cart-add="${product.id}" aria-label="Добавить в корзину">
                        <i class="fa-solid fa-bag-shopping"></i>
                    </button>
                </div>
                <div class="product-info">
                    <div class="product-meta-top">
                        <span>${product.category}</span>
                        <span>${product.material}</span>
                    </div>
                    <h3 class="product-title"><a href="product.html?id=${product.id}">${product.name}</a></h3>
                    <div class="product-card-bottom">
                        <div>
                            <div class="product-price">${product.price}</div>
                            <p class="product-fit-note">${getProductSizeNote(product)}</p>
                        </div>
                        <div class="product-size-preview">${sizePreview}</div>
                    </div>
                </div>
            </article>
        `;
    }

    function bindProductActions(scope) {
        scope.querySelectorAll("[data-wishlist-toggle]").forEach((button) => {
            button.addEventListener("click", () => {
                toggleWishlist(button.dataset.wishlistToggle);
                refreshDynamicAreas();
            });
        });

        scope.querySelectorAll("[data-cart-add]").forEach((button) => {
            button.addEventListener("click", () => {
                addToCart(button.dataset.cartAdd, 1, true);
            });
        });
    }

    function openSearch() {
        const overlay = document.getElementById("searchOverlay");
        const input = document.getElementById("globalSearchInput");
        if (!overlay || !input) {
            return;
        }

        overlay.classList.add("open");
        input.focus();
        renderSearchResults(input.value);
    }

    function closeSearch() {
        document.getElementById("searchOverlay")?.classList.remove("open");
    }

    function renderSearchResults(rawQuery) {
        const resultsNode = document.getElementById("globalSearchResults");
        if (!resultsNode) {
            return;
        }

        const query = (rawQuery || "").trim().toLowerCase();
        const filtered = !query
            ? products.slice(0, 6)
            : products.filter((product) => {
                return [
                    product.name,
                    product.category,
                    product.material,
                    product.color,
                    product.description
                ].join(" ").toLowerCase().includes(query);
            });

        if (!filtered.length) {
            resultsNode.innerHTML = `
                <div class="empty-state">
                    <i class="fa-solid fa-magnifying-glass"></i>
                    <h2>Ничего не найдено</h2>
                    <p>Попробуйте другой запрос: материал, цвет, категорию или название модели.</p>
                </div>
            `;
            return;
        }

        resultsNode.innerHTML = filtered.map((product) => `
            <article class="search-result">
                <img src="${product.image}" alt="${product.name}">
                <div>
                    <strong>${product.name}</strong>
                    <p>${product.category} · ${product.material} · ${product.color}</p>
                </div>
                <a class="btn btn-secondary" href="product.html?id=${product.id}">Открыть</a>
            </article>
        `).join("");
    }

    function openLightbox(src, title, caption) {
        const overlay = document.getElementById("lightboxOverlay");
        const image = document.getElementById("lightboxImage");
        const titleNode = document.getElementById("lightboxTitle");
        const captionNode = document.getElementById("lightboxCaption");
        if (!overlay || !image || !titleNode || !captionNode) {
            return;
        }

        image.src = src;
        image.alt = title;
        titleNode.textContent = title;
        captionNode.textContent = caption || "";
        overlay.classList.add("open");
    }

    function closeLightbox() {
        document.getElementById("lightboxOverlay")?.classList.remove("open");
    }

    function createJournalCard(article) {
        return `
            <article class="journal-card reveal">
                <img src="${article.image}" alt="${article.title}">
                <div class="journal-copy">
                    <div class="journal-meta">
                        <span>${article.category}</span>
                        <span>${article.readTime}</span>
                    </div>
                    <h2>${article.title}</h2>
                    <p>${article.excerpt}</p>
                </div>
            </article>
        `;
    }

    function renderHomePage() {
        const featured = document.getElementById("featuredProducts");
        const homeLooks = document.getElementById("homeLooks");
        const homeJournal = document.getElementById("homeJournal");

        if (featured) {
            featured.innerHTML = products.slice(0, 4).map(createProductCard).join("");
            bindProductActions(featured);
        }

        if (homeLooks) {
            homeLooks.innerHTML = looks.slice(0, 2).map((look) => `
                <article class="lookbook-card reveal">
                    <img src="${look.image}" alt="${look.title}">
                    <div class="lookbook-copy">
                        <p class="eyebrow">${look.subtitle}</p>
                        <h2>${look.title}</h2>
                        <p>${look.description}</p>
                        <div class="lookbook-products">
                            ${getProductsByIds(look.productIds).map((product) => `<a class="chip" href="product.html?id=${product.id}">${product.name}</a>`).join("")}
                        </div>
                    </div>
                </article>
            `).join("");
        }

        if (homeJournal) {
            homeJournal.innerHTML = journal.slice(0, 2).map(createJournalCard).join("");
        }

        const form = document.getElementById("newsletterForm");
        if (form && !form.dataset.bound) {
            form.dataset.bound = "true";
            form.addEventListener("submit", (event) => {
                event.preventDefault();
                form.reset();
                showNotification("Спасибо за подписку на новости VeraVola.");
            });
        }

        initHeroSlider();
    }

    function getCheckedValues(name) {
        return Array.from(document.querySelectorAll(`input[name="${name}"]:checked`)).map((input) => input.value);
    }

    function applyCatalogPresetFromQuery() {
        const params = new URLSearchParams(window.location.search);
        const category = params.get("category");
        const material = params.get("material");
        const badge = params.get("badge");

        if (category) {
            const input = document.querySelector(`input[name="category"][value="${category}"]`);
            if (input) {
                input.checked = true;
            }
        }

        if (material) {
            const input = document.querySelector(`input[name="material"][value="${material}"]`);
            if (input) {
                input.checked = true;
            }
        }

        if (badge) {
            const input = document.querySelector(`input[name="badge"][value="${badge}"]`);
            if (input) {
                input.checked = true;
            }
        }
    }

    function filterProducts() {
        const categories = getCheckedValues("category");
        const materials = getCheckedValues("material");
        const colors = getCheckedValues("color");
        const badges = getCheckedValues("badge");
        const priceMin = Number(document.getElementById("priceMin")?.value || 0);
        const priceMax = Number(document.getElementById("priceMax")?.value || 0);
        const sort = document.getElementById("sortSelect")?.value || "featured";

        let filtered = products.filter((product) => {
            const matchesCategory = !categories.length || categories.includes(product.category);
            const matchesMaterial = !materials.length || materials.includes(product.material);
            const matchesColor = !colors.length || colors.includes(product.color);
            const matchesBadge = !badges.length || badges.includes(product.badge);
            const matchesMin = !priceMin || product.priceNum >= priceMin;
            const matchesMax = !priceMax || product.priceNum <= priceMax;

            return matchesCategory && matchesMaterial && matchesColor && matchesBadge && matchesMin && matchesMax;
        });

        if (currentCatalogQuickFilter !== "all") {
            filtered = filtered.filter((product) => {
                if (currentCatalogQuickFilter === "new") {
                    return product.badge === "Новинка";
                }
                if (currentCatalogQuickFilter === "linen") {
                    return product.material === "Лен";
                }
                if (currentCatalogQuickFilter === "dresses") {
                    return product.category === "Платья";
                }
                if (currentCatalogQuickFilter === "black") {
                    return product.color === "Черный";
                }

                return true;
            });
        }

        const searchQuery = (document.getElementById("catalogSearch")?.value || "").trim().toLowerCase();
        if (searchQuery) {
            filtered = filtered.filter((product) => {
                return [
                    product.name,
                    product.category,
                    product.material,
                    product.color,
                    product.description
                ].join(" ").toLowerCase().includes(searchQuery);
            });
        }

        if (sort === "priceAsc") {
            filtered = filtered.sort((a, b) => a.priceNum - b.priceNum);
        } else if (sort === "priceDesc") {
            filtered = filtered.sort((a, b) => b.priceNum - a.priceNum);
        } else if (sort === "nameAsc") {
            filtered = filtered.sort((a, b) => a.name.localeCompare(b.name, "ru"));
        }

        return filtered;
    }

    function applyCatalogFilters() {
        const grid = document.getElementById("catalogGrid");
        const empty = document.getElementById("catalogEmpty");
        const count = document.getElementById("productCount");
        if (!grid || !empty || !count) {
            return;
        }

        const filtered = filterProducts();
        count.textContent = filtered.length + " " + pluralize(filtered.length, ["товар", "товара", "товаров"]);
        grid.classList.toggle("catalog-grid-compact", currentCatalogView === "grid-2");
        grid.innerHTML = filtered.map(createProductCard).join("");
        empty.classList.toggle("is-hidden", filtered.length > 0);
        bindProductActions(grid);
        initRevealAnimations();
    }

    function initCatalogPage() {
        if (document.body.dataset.page !== "catalog") {
            return;
        }

        applyCatalogPresetFromQuery();

        document.querySelectorAll('.filters-card input, #sortSelect, #catalogSearch').forEach((element) => {
            element.addEventListener("change", applyCatalogFilters);
            element.addEventListener("input", applyCatalogFilters);
        });

        document.querySelectorAll("[data-quick-filter]").forEach((button) => {
            button.addEventListener("click", () => {
                currentCatalogQuickFilter = button.dataset.quickFilter || "all";
                document.querySelectorAll("[data-quick-filter]").forEach((chip) => {
                    chip.classList.toggle("is-active", chip === button);
                });
                applyCatalogFilters();
            });
        });

        document.querySelectorAll("[data-grid-view]").forEach((button) => {
            button.addEventListener("click", () => {
                currentCatalogView = button.dataset.gridView || "grid-3";
                document.querySelectorAll("[data-grid-view]").forEach((toggle) => {
                    toggle.classList.toggle("is-active", toggle === button);
                });
                applyCatalogFilters();
            });
        });

        const clearButton = document.getElementById("clearFiltersBtn");
        if (clearButton) {
            clearButton.addEventListener("click", () => {
                document.querySelectorAll('.filters-card input[type="checkbox"]').forEach((input) => {
                    input.checked = false;
                });
                document.querySelectorAll('.filters-card input[type="number"]').forEach((input) => {
                    input.value = "";
                });
                const sortSelect = document.getElementById("sortSelect");
                if (sortSelect) {
                    sortSelect.value = "featured";
                }
                const catalogSearch = document.getElementById("catalogSearch");
                if (catalogSearch) {
                    catalogSearch.value = "";
                }
                currentCatalogQuickFilter = "all";
                document.querySelectorAll("[data-quick-filter]").forEach((chip) => {
                    chip.classList.toggle("is-active", chip.dataset.quickFilter === "all");
                });
                applyCatalogFilters();
            });
        }

        applyCatalogFilters();
    }

    function createGalleryThumbs(product) {
        return product.gallery.map((image, index) => `
            <button type="button" class="${index === currentGalleryImage ? "is-active" : ""}" data-gallery-thumb="${index}" aria-label="Фото ${index + 1}">
                <img src="${image}" alt="${product.name} ${index + 1}">
            </button>
        `).join("");
    }

    function getCurrentGalleryMedia(product) {
        if (currentGalleryMode === "detail") {
            return `
                <div class="product-main-visual zoomable">
                    <div class="gallery-toolbar">
                        <button type="button" data-gallery-mode="photo">Фото</button>
                        <button type="button" class="is-active" data-gallery-mode="detail">Ткань</button>
                        <button type="button" data-gallery-mode="video">Видео</button>
                    </div>
                    <button type="button" class="gallery-zoom-btn" data-open-lightbox="${product.detailImage}" data-lightbox-title="${product.name}" data-lightbox-caption="Деталь ткани и фактура крупным планом">Увеличить</button>
                    <img src="${product.detailImage}" alt="Деталь ткани ${product.name}">
                </div>
            `;
        }

        if (currentGalleryMode === "video") {
            return `
                <div class="product-main-visual">
                    <div class="gallery-toolbar">
                        <button type="button" data-gallery-mode="photo">Фото</button>
                        <button type="button" data-gallery-mode="detail">Ткань</button>
                        <button type="button" class="is-active" data-gallery-mode="video">Видео</button>
                    </div>
                    <video src="${product.video}" autoplay muted loop playsinline controls poster="${product.gallery[0]}"></video>
                </div>
            `;
        }

        return `
            <div class="product-main-visual zoomable">
                <div class="gallery-toolbar">
                    <button type="button" class="is-active" data-gallery-mode="photo">Фото</button>
                    <button type="button" data-gallery-mode="detail">Ткань</button>
                    <button type="button" data-gallery-mode="video">Видео</button>
                </div>
                <button type="button" class="gallery-zoom-btn" data-open-lightbox="${product.gallery[currentGalleryImage]}" data-lightbox-title="${product.name}" data-lightbox-caption="Фото на модели. Можно рассмотреть силуэт и посадку крупнее.">Увеличить</button>
                <img src="${product.gallery[currentGalleryImage]}" alt="${product.name}">
            </div>
        `;
    }

    function createReviewCard(review) {
        return `
            <article class="review-card reveal">
                <strong>${review.author}, ${review.city}</strong>
                <div class="review-rating">${"★".repeat(review.rating)}</div>
                <p>${review.text}</p>
            </article>
        `;
    }

    function renderProductSizeChips(product) {
        const availableSizes = (product.sizes || []).map((size, index) => `
            <button type="button" class="size-chip ${index === 0 ? "is-active" : ""}" data-size-option="${size}">
                ${size}
            </button>
        `).join("");

        return `
            <div class="size-picker-block">
                <div class="size-picker-head">
                    <strong>Размер</strong>
                    <button class="text-btn" type="button" data-scroll-to-size-guide>Таблица размеров</button>
                </div>
                <div class="size-chip-row">
                    ${availableSizes}
                </div>
                <p class="size-note">Свободная посадка и мягкая линия плеч. Если хочется более собранный силуэт, можно выбрать размер меньше.</p>
            </div>
        `;
    }

    function renderProductHighlights(product) {
        return `
            <div class="product-highlights">
                <article>
                    <span>Посадка</span>
                    <strong>Свободная и мягкая</strong>
                    <p>${product.features?.[0] || "Комфортный силуэт для спокойного ежедневного гардероба."}</p>
                </article>
                <article>
                    <span>Ткань</span>
                    <strong>${product.composition}</strong>
                    <p>${product.features?.[1] || "Натуральная фактура ощущается воздушно и дорого."}</p>
                </article>
                <article>
                    <span>Уход</span>
                    <strong>Без лишней сложности</strong>
                    <p>${product.care?.[0] || "Подходит для деликатного ухода дома."}</p>
                </article>
            </div>
        `;
    }

    function renderProductLook(product) {
        const matchingLook = looks.find((look) => (look.productIds || []).includes(product.id));
        if (!matchingLook) {
            return "";
        }

        return `
            <section class="product-look-card reveal">
                <div class="product-look-media">
                    <img src="${matchingLook.image}" alt="${matchingLook.title}">
                </div>
                <div class="product-look-copy">
                    <p class="eyebrow">Образ с этой вещью</p>
                    <h3>${matchingLook.title}</h3>
                    <p>${matchingLook.description}</p>
                    <div class="lookbook-products">
                        ${getProductsByIds(matchingLook.productIds)
                            .filter((item) => item.id !== product.id)
                            .map((item) => `<a class="chip" href="product.html?id=${item.id}">${item.name}</a>`)
                            .join("")}
                    </div>
                    <a class="btn btn-secondary" href="lookbook.html">Смотреть lookbook</a>
                </div>
            </section>
        `;
    }

    function renderSizeGuide() {
        return `
            <section class="size-guide-card reveal">
                <h3>Таблица размеров</h3>
                <table class="size-guide-table">
                    <thead>
                        <tr>
                            <th>Размер</th>
                            <th>Грудь</th>
                            <th>Талия</th>
                            <th>Бёдра</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sizeGuide.map((row) => `
                            <tr>
                                <td>${row.size}</td>
                                <td>${row.bust}</td>
                                <td>${row.waist}</td>
                                <td>${row.hips}</td>
                            </tr>
                        `).join("")}
                    </tbody>
                </table>
            </section>
        `;
    }

    function renderProductPage() {
        if (document.body.dataset.page !== "product") {
            return;
        }

        const content = document.getElementById("productPageContent");
        const related = document.getElementById("relatedProducts");
        if (!content || !related) {
            return;
        }

        const params = new URLSearchParams(window.location.search);
        const product = getProductById(params.get("id"));

        if (!product) {
            content.innerHTML = `
                <div class="empty-state">
                    <i class="fa-solid fa-shirt"></i>
                    <h2>Товар не найден</h2>
                    <p>Возможно, модель снята с продажи или ссылка устарела.</p>
                    <a class="btn btn-primary" href="catalog.html">Вернуться в каталог</a>
                </div>
            `;
            related.innerHTML = "";
            return;
        }

        if (currentGalleryProductId !== product.id) {
            currentGalleryProductId = product.id;
            currentGalleryMode = "photo";
            currentGalleryImage = 0;
        }

        document.title = product.name + " - VeraVola";

        const breadcrumbs = document.getElementById("productBreadcrumbs");
        if (breadcrumbs) {
            breadcrumbs.innerHTML = `
                <a href="index.html">Главная</a>
                <span>/</span>
                <a href="catalog.html">Каталог</a>
                <span>/</span>
                <span>${product.name}</span>
            `;
        }

        content.innerHTML = `
            <section class="product-detail reveal">
                <div class="product-gallery-shell">
                    ${getCurrentGalleryMedia(product)}
                    <div class="gallery-thumbs">
                        ${createGalleryThumbs(product)}
                    </div>
                    <div class="gallery-info">
                        <p>Наведите на фото ткани, чтобы рассмотреть фактуру крупнее, или включите короткое видео с движением изделия.</p>
                    </div>
                </div>
                <div>
                    <p class="eyebrow">${product.category}</p>
                    <h1>${product.name}</h1>
                    <div class="product-price-row">
                        <div class="product-price">${product.price}</div>
                        ${product.badge ? `<span class="product-chip">${product.badge}</span>` : ""}
                    </div>
                    <p class="product-description">${product.description}</p>
                    ${renderProductHighlights(product)}
                    <ul class="product-feature-list">
                        ${product.features.map((item) => `<li>${item}</li>`).join("")}
                    </ul>
                    ${renderProductSizeChips(product)}
                    <div class="product-actions-row">
                        <select id="sizeSelect" aria-label="Выберите размер">
                            <option value="">Размер</option>
                            ${product.sizes.map((size) => `<option value="${size}">${size}</option>`).join("")}
                        </select>
                        <button class="btn btn-primary" id="productAddToCart" type="button">Добавить в корзину</button>
                        <button class="btn btn-secondary" id="productToggleWishlist" type="button">${wishlist.has(product.id) ? "Убрать из избранного" : "В избранное"}</button>
                    </div>
                    <div class="meta-list">
                        <div><strong>Состав:</strong> ${product.composition}</div>
                        <div><strong>Цвет:</strong> ${product.color}</div>
                        <div><strong>Сезон:</strong> ${product.season}</div>
                        <div><strong>Уход:</strong> ${product.care.join(", ")}</div>
                    </div>
                </div>
            </section>
            ${renderSizeGuide()}
            ${renderProductLook(product)}
            <section class="reviews-block">
                <div class="section-head compact">
                    <div>
                        <p class="eyebrow">Отзывы</p>
                        <h3>Что говорят о модели</h3>
                    </div>
                </div>
                <div class="reviews-grid">
                    ${product.reviews.map(createReviewCard).join("")}
                </div>
            </section>
        `;

        const sizeSelect = document.getElementById("sizeSelect");
        if (sizeSelect) {
            sizeSelect.value = product.sizes[0] || "";
        }

        content.querySelectorAll("[data-size-option]").forEach((button) => {
            button.addEventListener("click", () => {
                content.querySelectorAll("[data-size-option]").forEach((chip) => {
                    chip.classList.toggle("is-active", chip === button);
                });
                if (sizeSelect) {
                    sizeSelect.value = button.dataset.sizeOption || "";
                }
            });
        });

        content.querySelector("[data-scroll-to-size-guide]")?.addEventListener("click", () => {
            document.querySelector(".size-guide-card")?.scrollIntoView({ behavior: "smooth", block: "start" });
        });

        const addButton = document.getElementById("productAddToCart");
        if (addButton) {
            addButton.addEventListener("click", () => {
                addToCart(product.id, 1, sizeSelect?.value);
            });
        }

        const wishlistButton = document.getElementById("productToggleWishlist");
        if (wishlistButton) {
            wishlistButton.addEventListener("click", () => {
                toggleWishlist(product.id);
                renderProductPage();
                updateCounters();
            });
        }

        content.querySelectorAll("[data-gallery-thumb]").forEach((button) => {
            button.addEventListener("click", () => {
                currentGalleryMode = "photo";
                currentGalleryImage = Number(button.dataset.galleryThumb);
                renderProductPage();
            });
        });

        content.querySelectorAll("[data-gallery-mode]").forEach((button) => {
            button.addEventListener("click", () => {
                currentGalleryMode = button.dataset.galleryMode;
                renderProductPage();
            });
        });

        content.querySelectorAll("[data-open-lightbox]").forEach((button) => {
            button.addEventListener("click", () => {
                openLightbox(
                    button.dataset.openLightbox,
                    button.dataset.lightboxTitle || product.name,
                    button.dataset.lightboxCaption || ""
                );
            });
        });

        const relatedProducts = products
            .filter((item) => item.category === product.category && item.id !== product.id)
            .slice(0, 4);

        related.innerHTML = relatedProducts.map(createProductCard).join("");
        bindProductActions(related);
        initRevealAnimations();
    }

    function renderCartPage() {
        if (document.body.dataset.page !== "cart") {
            return;
        }

        const target = document.getElementById("cartPageContent");
        if (!target) {
            return;
        }

        const items = getCartItems();
        if (!items.length) {
            target.innerHTML = `
                <div class="empty-state reveal">
                    <i class="fa-solid fa-bag-shopping"></i>
                    <h2>Корзина пока пуста</h2>
                    <p>Добавьте понравившиеся модели из каталога, и они появятся здесь.</p>
                    <a class="btn btn-primary" href="catalog.html">Перейти в каталог</a>
                </div>
            `;
            initRevealAnimations();
            return;
        }

        const subtotal = items.reduce((sum, item) => sum + item.product.priceNum * item.quantity, 0);
        const delivery = subtotal >= 250 ? 0 : 12;
        const total = subtotal + delivery;

        target.innerHTML = `
            <section class="cart-layout">
                <div class="cart-list">
                    ${items.map((item) => `
                        <article class="cart-card reveal">
                            <img src="${item.product.image}" alt="${item.product.name}">
                            <div>
                                <div class="cart-item-top">
                                    <div>
                                        <h2 class="cart-item-title">${item.product.name}</h2>
                                        <p class="cart-item-meta">${item.product.category} · ${item.product.material} · ${item.product.color}</p>
                                    </div>
                                    <button class="text-btn" type="button" data-cart-remove="${item.product.id}">Удалить</button>
                                </div>
                                <div class="cart-item-top">
                                    <strong>${item.product.price}</strong>
                                    <div class="quantity-control" aria-label="Количество товара">
                                        <button type="button" data-qty-minus="${item.product.id}" aria-label="Уменьшить количество">-</button>
                                        <span>${item.quantity}</span>
                                        <button type="button" data-qty-plus="${item.product.id}" aria-label="Увеличить количество">+</button>
                                    </div>
                                </div>
                            </div>
                        </article>
                    `).join("")}
                </div>
                <aside class="summary-card reveal">
                    <h2>Итого</h2>
                    <div class="summary-row">
                        <span>Товары</span>
                        <strong>${formatCurrency(subtotal)}</strong>
                    </div>
                    <div class="summary-row">
                        <span>Доставка</span>
                        <strong>${delivery === 0 ? "Бесплатно" : formatCurrency(delivery)}</strong>
                    </div>
                    <div class="summary-row summary-total">
                        <span>К оплате</span>
                        <strong>${formatCurrency(total)}</strong>
                    </div>
                    <a class="btn btn-primary" href="checkout.html">Оформить заказ</a>
                    <a class="btn btn-secondary" href="shipping.html">Условия доставки</a>
                    <div class="checkout-summary-note">
                        После подтверждения мы свяжемся с вами, чтобы уточнить время доставки и детали заказа.
                    </div>
                </aside>
            </section>
        `;

        target.querySelectorAll("[data-qty-minus]").forEach((button) => {
            button.addEventListener("click", () => changeCartQuantity(button.dataset.qtyMinus, -1));
        });

        target.querySelectorAll("[data-qty-plus]").forEach((button) => {
            button.addEventListener("click", () => changeCartQuantity(button.dataset.qtyPlus, 1));
        });

        target.querySelectorAll("[data-cart-remove]").forEach((button) => {
            button.addEventListener("click", () => removeFromCart(button.dataset.cartRemove));
        });

        initRevealAnimations();
    }

    function renderWishlistPage() {
        if (document.body.dataset.page !== "wishlist") {
            return;
        }

        const target = document.getElementById("wishlistPageContent");
        if (!target) {
            return;
        }

        const items = products.filter((product) => wishlist.has(product.id));
        if (!items.length) {
            target.innerHTML = `
                <div class="empty-state reveal">
                    <i class="fa-regular fa-heart"></i>
                    <h2>В избранном пока пусто</h2>
                    <p>Добавляйте модели в избранное, чтобы быстро вернуться к ним позже.</p>
                    <a class="btn btn-primary" href="catalog.html">Посмотреть каталог</a>
                </div>
            `;
            initRevealAnimations();
            return;
        }

        target.innerHTML = `<div class="products-grid">${items.map(createProductCard).join("")}</div>`;
        bindProductActions(target);
        initRevealAnimations();
    }

    function renderLookbookPage() {
        const target = document.getElementById("lookbookPageContent");
        if (!target) {
            return;
        }

        target.innerHTML = `
            <div class="lookbook-grid">
                ${looks.map((look) => `
                    <article class="lookbook-card reveal">
                        <img src="${look.image}" alt="${look.title}">
                        <div class="lookbook-copy">
                            <p class="eyebrow">${look.subtitle}</p>
                            <h2>${look.title}</h2>
                            <p>${look.description}</p>
                            <div class="lookbook-products">
                                ${getProductsByIds(look.productIds).map((product) => `<a class="chip" href="product.html?id=${product.id}">${product.name}</a>`).join("")}
                            </div>
                        </div>
                    </article>
                `).join("")}
            </div>
        `;
    }

    function renderAboutPage() {
        const target = document.getElementById("aboutPageContent");
        if (!target) {
            return;
        }

        target.innerHTML = `
            <section class="content-card reveal">
                <p class="eyebrow">Философия бренда</p>
                <h1>О бренде VeraVola</h1>
                <p>${brand.philosophy || ""}</p>
                <div class="info-grid">
                    <article class="benefit-card">
                        <i class="fa-solid fa-leaf"></i>
                        <h2>Материалы</h2>
                        <p>${(brand.materials || []).join(". ")}.</p>
                    </article>
                    <article class="benefit-card">
                        <i class="fa-solid fa-hand-sparkles"></i>
                        <h2>Производство</h2>
                        <p>${(brand.production || []).join(". ")}.</p>
                    </article>
                    <article class="benefit-card">
                        <i class="fa-solid fa-heart"></i>
                        <h2>Ощущение</h2>
                        <p>Мы делаем вещи для тех, кто ищет спокойную красоту, комфорт и уверенность без визуального шума.</p>
                    </article>
                </div>
            </section>
        `;
    }

    function renderShippingPage() {
        const target = document.getElementById("shippingPageContent");
        if (!target) {
            return;
        }

        target.innerHTML = `
            <section class="content-card reveal">
                <p class="eyebrow">Покупателям</p>
                <h1>Доставка и оплата</h1>
                <div class="info-grid">
                    <article class="benefit-card">
                        <i class="fa-solid fa-truck-fast"></i>
                        <h2>Доставка</h2>
                        <p>По Минску 1-2 дня, по Беларуси 2-4 дня. Бесплатная доставка при заказе от 250 руб.</p>
                    </article>
                    <article class="benefit-card">
                        <i class="fa-solid fa-credit-card"></i>
                        <h2>Оплата</h2>
                        <p>Картой на сайте, через ЕРИП или при получении. Все способы подтверждаются при оформлении.</p>
                    </article>
                    <article class="benefit-card">
                        <i class="fa-solid fa-rotate-left"></i>
                        <h2>Возврат</h2>
                        <p>14 дней на обмен и возврат при сохранении товарного вида, бирок и упаковки.</p>
                    </article>
                </div>
            </section>
        `;
    }

    function renderCheckoutPage() {
        const target = document.getElementById("checkoutPageContent");
        if (!target) {
            return;
        }

        const items = getCartItems();
        if (!items.length) {
            target.innerHTML = `
                <div class="empty-state reveal">
                    <i class="fa-solid fa-bag-shopping"></i>
                    <h2>Сначала добавьте товары</h2>
                    <p>Чтобы перейти к оформлению, положите в корзину хотя бы одну модель.</p>
                    <a class="btn btn-primary" href="catalog.html">Открыть каталог</a>
                </div>
            `;
            initRevealAnimations();
            return;
        }

        const subtotal = items.reduce((sum, item) => sum + item.product.priceNum * item.quantity, 0);
        const delivery = subtotal >= 250 ? 0 : 12;
        const total = subtotal + delivery;
        const orderCount = items.reduce((sum, item) => sum + item.quantity, 0);

        target.innerHTML = `
            <section class="checkout-steps reveal">
                <div class="checkout-step is-complete">
                    <span>1</span>
                    <div>
                        <strong>Корзина</strong>
                        <p>${orderCount} ${pluralize(orderCount, ["товар", "товара", "товаров"])}</p>
                    </div>
                </div>
                <div class="checkout-step is-active">
                    <span>2</span>
                    <div>
                        <strong>Доставка и оплата</strong>
                        <p>Проверьте детали заказа</p>
                    </div>
                </div>
                <div class="checkout-step">
                    <span>3</span>
                    <div>
                        <strong>Подтверждение</strong>
                        <p>Финальный шаг</p>
                    </div>
                </div>
            </section>
            <section class="checkout-layout">
                <article class="content-card checkout-form-card reveal">
                    <div class="checkout-intro">
                        <p class="eyebrow">VeraVola checkout</p>
                        <h2>Почти готово</h2>
                        <p>Заполните данные один раз. Мы бережно соберём заказ, подтвердим детали и отправим его в удобный для вас день.</p>
                    </div>
                    <div class="checkout-section">
                        <p class="eyebrow">Контакты</p>
                        <div class="checkout-form-grid">
                            <input type="text" placeholder="Имя" required>
                            <input type="tel" placeholder="Телефон" required>
                            <input class="full" type="email" placeholder="Email" required>
                        </div>
                    </div>
                    <div class="checkout-section">
                        <p class="eyebrow">Доставка</p>
                        <div class="checkout-options">
                            <label><input type="radio" name="delivery" checked> Курьер по Минску — бесплатно от 250 руб.</label>
                            <label><input type="radio" name="delivery"> Доставка по Беларуси 2-4 дня</label>
                            <label><input type="radio" name="delivery"> Самовывоз из студии</label>
                        </div>
                    </div>
                    <div class="checkout-section">
                        <p class="eyebrow">Оплата</p>
                        <div class="checkout-options">
                            <label><input type="radio" name="payment" checked> Онлайн картой</label>
                            <label><input type="radio" name="payment"> ЕРИП</label>
                            <label><input type="radio" name="payment"> При получении</label>
                        </div>
                    </div>
                    <div class="checkout-section">
                        <p class="eyebrow">Комментарий</p>
                        <div class="checkout-form-grid">
                            <textarea class="full" placeholder="Например: позвонить за 30 минут, уточнить размер, оформить как подарок"></textarea>
                        </div>
                    </div>
                    <div class="checkout-section">
                        <div class="checkout-assurance">
                            <div>
                                <i class="fa-solid fa-box-open"></i>
                                <span>Бережная упаковка</span>
                            </div>
                            <div>
                                <i class="fa-solid fa-ruler-combined"></i>
                                <span>Поможем с размером</span>
                            </div>
                            <div>
                                <i class="fa-solid fa-rotate-left"></i>
                                <span>Обмен и возврат 14 дней</span>
                            </div>
                        </div>
                    </div>
                </article>
                <aside class="summary-card checkout-summary-card reveal">
                    <div class="checkout-summary-top">
                        <p class="eyebrow">Итог заказа</p>
                        <div class="checkout-summary-badge">Secure checkout</div>
                    </div>
                    <h2>Ваш заказ</h2>
                    <div class="checkout-items">
                        ${items.map((item) => `
                            <div class="checkout-item">
                                <img src="${item.product.image}" alt="${item.product.name}">
                                <div>
                                    <strong>${item.product.name}</strong>
                                    <p>${item.quantity} × ${item.product.price}</p>
                                </div>
                            </div>
                        `).join("")}
                    </div>
                    <div class="summary-row" style="margin-top: 20px;">
                        <span>Товары</span>
                        <strong>${formatCurrency(subtotal)}</strong>
                    </div>
                    <div class="summary-row">
                        <span>Доставка</span>
                        <strong>${delivery === 0 ? "Бесплатно" : formatCurrency(delivery)}</strong>
                    </div>
                    <div class="summary-row summary-total">
                        <span>Итого</span>
                        <strong>${formatCurrency(total)}</strong>
                    </div>
                    <button class="btn btn-primary" type="button" id="placeOrderButton">Подтвердить заказ</button>
                </aside>
            </section>
        `;

        const placeOrderButton = document.getElementById("placeOrderButton");
        if (placeOrderButton) {
            placeOrderButton.addEventListener("click", () => {
                cart = {};
                saveCart();
                updateCounters();
                renderCheckoutPage();
                showNotification("Заказ принят. Мы скоро свяжемся с вами для подтверждения.");
            });
        }

        initRevealAnimations();
    }

    function setHeroSlide(index) {
        const slides = document.querySelectorAll("#heroSlides .hero-slide");
        const dots = document.querySelectorAll("#heroDots [data-hero-dot]");
        const caption = document.getElementById("heroMoodCaption");

        if (!slides.length || !caption || !heroSlidesData[index]) {
            return;
        }

        slides.forEach((slide, slideIndex) => {
            slide.classList.toggle("is-active", slideIndex === index);
        });

        dots.forEach((dot, dotIndex) => {
            dot.classList.toggle("is-active", dotIndex === index);
        });

        caption.innerHTML = `
            <h2>${heroSlidesData[index].title}</h2>
            <p>${heroSlidesData[index].text}</p>
        `;
    }

    function initHeroSlider() {
        const slidesRoot = document.getElementById("heroSlides");
        const dots = document.querySelectorAll("#heroDots [data-hero-dot]");
        if (!slidesRoot || !dots.length) {
            return;
        }

        if (slidesRoot.dataset.bound === "true") {
            return;
        }
        slidesRoot.dataset.bound = "true";

        let currentIndex = 0;
        setHeroSlide(currentIndex);

        const goTo = (index) => {
            currentIndex = index;
            setHeroSlide(currentIndex);
        };

        dots.forEach((dot) => {
            dot.addEventListener("click", () => {
                goTo(Number(dot.dataset.heroDot));
            });
        });

        if (heroSliderTimer) {
            window.clearInterval(heroSliderTimer);
        }

        heroSliderTimer = window.setInterval(() => {
            currentIndex = (currentIndex + 1) % heroSlidesData.length;
            setHeroSlide(currentIndex);
        }, 4200);
    }

    function renderBlogPage() {
        const target = document.getElementById("blogPageContent");
        if (!target) {
            return;
        }

        target.innerHTML = `
            <section class="content-card reveal">
                <p class="eyebrow">Журнал VeraVola</p>
                <h1>Стиль, ткани и забота о вещах</h1>
                <p>Пишем о капсульном гардеробе, натуральных материалах и маленьких практиках, которые делают одежду красивее, а повседневность спокойнее.</p>
            </section>
            <div class="journal-grid">
                ${journal.map(createJournalCard).join("")}
            </div>
        `;
    }

    function renderAccountPage() {
        const target = document.getElementById("accountPageContent");
        if (!target) {
            return;
        }

        const customer = accountData.customer || {};
        const orders = accountData.orders || [];

        target.innerHTML = `
            <section class="account-shell reveal">
                <div class="section-head compact">
                    <div>
                        <p class="eyebrow">Личный кабинет</p>
                        <h1>${customer.name || "Профиль"}</h1>
                        <p class="section-copy">Здесь удобно проверить заказы, быстро перейти в избранное и держать под рукой свои данные.</p>
                    </div>
                </div>
                <div class="account-layout">
                    <aside class="account-sidebar">
                        <article class="account-profile-card">
                            <div class="account-avatar">${(customer.name || "V").charAt(0)}</div>
                            <div class="account-profile-copy">
                                <h2>${customer.name || "Профиль"}</h2>
                                <p class="account-email">${formatEmailForDisplay(customer.email)}</p>
                                <p>${customer.city || "-"}</p>
                            </div>
                        </article>
                        <nav class="account-nav" aria-label="Разделы кабинета">
                            <a class="is-active" href="account.html">Профиль</a>
                            <a href="wishlist.html">Избранное</a>
                            <a href="cart.html">Корзина</a>
                            <a href="shipping.html">Доставка и оплата</a>
                        </nav>
                    </aside>
                    <div class="account-main">
                        <section class="account-panel">
                            <div class="account-stat-grid">
                                <article class="account-stat-card">
                                    <span>Заказы</span>
                                    <strong>${orders.length}</strong>
                                    <p>${pluralize(orders.length, ["активный заказ", "активных заказа", "активных заказов"])}</p>
                                </article>
                                <article class="account-stat-card">
                                    <span>Избранное</span>
                                    <strong>${wishlist.size}</strong>
                                    <p>${pluralize(wishlist.size, ["сохранённый товар", "сохранённых товара", "сохранённых товаров"])}</p>
                                </article>
                                <article class="account-stat-card">
                                    <span>Корзина</span>
                                    <strong>${getCartCount()}</strong>
                                    <p>${pluralize(getCartCount(), ["товар ждёт", "товара ждут", "товаров ждут"])}</p>
                                </article>
                            </div>
                        </section>
                        <section class="account-panel">
                            <div class="account-panel-head">
                                <h2>Последние заказы</h2>
                                <a class="section-link" href="shipping.html">Условия доставки</a>
                            </div>
                            <div class="account-order-list">
                                ${orders.map((order) => `
                                    <article class="account-order-card">
                                        <button class="account-order-toggle" type="button" data-order-toggle aria-expanded="false">
                                            <div class="account-order-top">
                                                <div class="account-order-mainline">
                                                    <h3>${order.number}</h3>
                                                    <p>${order.date}</p>
                                                </div>
                                                <div class="account-order-toggle-side">
                                                    <span class="chip">${order.status}</span>
                                                    <i class="fa-solid fa-plus"></i>
                                                </div>
                                    </div>
                                </button>
                                <div class="account-order-details" hidden>
                                    <p><strong>Сумма:</strong> ${order.total}</p>
                                    <p><strong>Статус:</strong> ${order.status}</p>
                                    <p>Заказ оформлен через сайт VeraVola. Для уточнений по доставке и составу можно написать нам в контакты.</p>
                                </div>
                            </article>
                        `).join("")}
                    </div>
                </section>
                        <section class="account-panel">
                            <div class="account-panel-head">
                                <h2>Быстрые действия</h2>
                            </div>
                            <div class="account-actions">
                                <a class="btn btn-secondary" href="wishlist.html">Открыть избранное</a>
                                <a class="btn btn-secondary" href="catalog.html">Перейти в каталог</a>
                                <a class="btn btn-secondary" href="contacts.html">Связаться с нами</a>
                            </div>
                        </section>
                    </div>
                </div>
            </section>
        `;

        target.querySelectorAll("[data-order-toggle]").forEach((button) => {
            button.addEventListener("click", () => {
                const expanded = button.getAttribute("aria-expanded") === "true";
                const details = button.nextElementSibling;
                const icon = button.querySelector(".fa-solid");

                button.setAttribute("aria-expanded", String(!expanded));
                if (details) {
                    details.hidden = expanded;
                }
                if (icon) {
                    icon.classList.toggle("fa-plus", expanded);
                    icon.classList.toggle("fa-minus", !expanded);
                }
            });
        });
    }

    function renderContactsPage() {
        const target = document.getElementById("contactsPageContent");
        if (!target) {
            return;
        }

        target.innerHTML = `
            <section class="contact-grid">
                <article class="contact-card reveal">
                    <p class="eyebrow">Связаться с нами</p>
                    <h1>Контакты</h1>
                    <p>Если нужна помощь с размером, тканью, доставкой или выбором образа, напишите нам. Мы стараемся отвечать спокойно и по делу.</p>
                    <p><strong>Email:</strong> hello@veravola.by</p>
                    <p><strong>Телефон:</strong> +375 (29) 123-45-67</p>
                    <p><strong>Адрес:</strong> Минск, Беларусь</p>
                    <img class="contact-map" src="https://images.unsplash.com/photo-1526772662000-3f88f10405ff?w=1400&auto=format&fit=crop&q=80" alt="Студия VeraVola">
                </article>
                <article class="contact-card reveal">
                    <p class="eyebrow">Форма связи</p>
                    <h2>Напишите нам</h2>
                    <form class="contact-form" id="contactForm">
                        <input type="text" id="contactName" placeholder="Ваше имя" required>
                        <input type="email" id="contactEmail" placeholder="Email" required>
                        <textarea id="contactMessage" placeholder="Ваш вопрос"></textarea>
                        <button class="btn btn-primary" type="submit">Отправить сообщение</button>
                    </form>
                </article>
            </section>
        `;

        const form = document.getElementById("contactForm");
        if (form && !form.dataset.bound) {
            form.dataset.bound = "true";
            form.addEventListener("submit", (event) => {
                event.preventDefault();
                form.reset();
                showNotification("Сообщение отправлено. Мы свяжемся с вами в ближайшее время.");
            });
        }
    }

    function refreshDynamicAreas() {
        updateCounters();
        renderHomePage();
        applyCatalogFilters();
        renderProductPage();
        renderWishlistPage();
        renderAccountPage();
    }

    function initRevealAnimations() {
        const items = document.querySelectorAll(".reveal");
        if (!items.length) {
            return;
        }

        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add("is-visible");
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.12 });

        items.forEach((item) => observer.observe(item));
    }

    function bindGlobalUi() {
        document.getElementById("searchToggle")?.addEventListener("click", openSearch);
        document.getElementById("searchClose")?.addEventListener("click", closeSearch);
        document.getElementById("lightboxClose")?.addEventListener("click", closeLightbox);

        document.getElementById("searchOverlay")?.addEventListener("click", (event) => {
            if (event.target.id === "searchOverlay") {
                closeSearch();
            }
        });

        document.getElementById("lightboxOverlay")?.addEventListener("click", (event) => {
            if (event.target.id === "lightboxOverlay") {
                closeLightbox();
            }
        });

        const searchInput = document.getElementById("globalSearchInput");
        if (searchInput && !searchInput.dataset.bound) {
            searchInput.dataset.bound = "true";
            searchInput.addEventListener("input", () => {
                renderSearchResults(searchInput.value);
            });
        }
    }

    document.addEventListener("DOMContentLoaded", () => {
        renderHeader();
        renderFooter();
        renderGlobalOverlays();
        updateCounters();
        bindGlobalUi();
        renderHomePage();
        initCatalogPage();
        renderProductPage();
        renderCartPage();
        renderWishlistPage();
        renderLookbookPage();
        renderAboutPage();
        renderShippingPage();
        renderBlogPage();
        renderAccountPage();
        renderContactsPage();
        renderCheckoutPage();
        initRevealAnimations();
    });
})();
