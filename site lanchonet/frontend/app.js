document.addEventListener("DOMContentLoaded", () => {
  // =================================================================================
  // CONFIGURAÇÃO E VARIÁVEIS GLOBAIS
  // =================================================================================
  const API_URL = "/api";
  const WHATSAPP_NUMBER = "5524999219813"; // INSIRA SEU NÚMERO DE WHATSAPP AQUI

  let cart = [];
  let token = null;
  let user = null;
  let allProducts = [];

  // =================================================================================
  // SELETORES DE ELEMENTOS DO DOM
  // =================================================================================
  const menuSection = document.getElementById("menu");
  const menuLoader = document.getElementById("menu-loader-container");
  const categoryButtonsContainer = document.getElementById("category-buttons-container");
  const loginBtn = document.getElementById("login-btn");
  const userProfileDiv = document.getElementById("user-profile");
  const userNameSpan = document.getElementById("user-name");
  const logoutBtn = document.getElementById("logout-btn");
  const adminPanelBtn = document.getElementById("admin-panel-btn");
  const modalBackdrop = document.getElementById("modal-backdrop");
  
  // Modais de Autenticação
  const loginModal = document.getElementById("login-modal");
  const registerModal = document.getElementById("register-modal");
  const closeLoginModalBtn = document.getElementById("close-login-modal-btn");
  const closeRegisterModalBtn = document.getElementById("close-register-modal-btn");
  const switchToRegisterLink = document.getElementById("switch-to-register");
  const switchToLoginLink = document.getElementById("switch-to-login");
  const loginForm = document.getElementById("login-form");
  const registerForm = document.getElementById("register-form");
  const loginErrorMsg = document.getElementById("login-error-msg");
  const registerErrorMsg = document.getElementById("register-error-msg");
  
  // Modal "Meus Pedidos"
  const myOrdersBtn = document.getElementById("my-orders-btn");
  const myOrdersModal = document.getElementById("my-orders-modal");
  const closeOrdersModalBtn = document.getElementById("close-orders-modal-btn");
  const ordersListContainer = document.getElementById("orders-list-container");

  // Cartão Fidelidade
  const loyaltyCardContainer = document.getElementById("loyalty-card-container");
  const loyaltyStampsDiv = document.getElementById("loyalty-stamps");
  const loyaltyMessageP = document.getElementById("loyalty-message");

  // Carrinho
  const cartIcon = document.getElementById("cart-icon");
  const cartCount = document.getElementById("cart-count");
  const cartModal = document.getElementById("cart-modal");
  const cartBackdrop = document.getElementById("cart-backdrop");
  const closeCartBtn = document.getElementById("close-cart-btn");
  const clearCartBtn = document.getElementById("clear-cart-btn");
  const cartItemsContainer = document.getElementById("cart-items-container");
  const cartEmptyMsg = document.getElementById("cart-empty-msg");
  const cartTotalSpan = document.getElementById("cart-total");
  const checkoutBtn = document.getElementById("checkout-btn");
  const addressInput = document.getElementById("address");

  // Checkout Convidado
  const guestCheckoutModal = document.getElementById("guest-checkout-modal");
  const closeGuestModalBtn = document.getElementById("close-guest-modal-btn");
  const promptLoginBtn = document.getElementById("prompt-login-btn");
  const continueAsGuestBtn = document.getElementById("continue-as-guest-btn");
  
  // =================================================================================
  // FUNÇÕES UTILITÁRIAS
  // =================================================================================
  const apiFetch = async (endpoint, options = {}) => {
    const headers = { "Content-Type": "application/json", ...options.headers };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    
    const response = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
    
    // Trata respostas sem conteúdo (ex: DELETE)
    if (response.status === 204 || response.headers.get("content-length") === "0") return;
    
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Ocorreu um erro na requisição.");
    return data;
  };
  
  const showToast = (message, type = "info") => {
    const toast = document.createElement("div");
    const colors = {
      info: "bg-blue-500",
      success: "bg-green-500",
      error: "bg-red-500",
    };
    toast.className = `fixed bottom-5 right-5 ${colors[type]} text-white py-3 px-5 rounded-lg shadow-lg transform translate-y-20 opacity-0 transition-all duration-300 z-[100]`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.classList.remove("translate-y-20", "opacity-0");
    }, 10);

    setTimeout(() => {
      toast.classList.add("translate-y-20", "opacity-0");
      setTimeout(() => toast.remove(), 400);
    }, 4000);
  };
  
  const toggleButtonLoading = (button, isLoading) => {
    const text = button.querySelector('.btn-text');
    const loader = button.querySelector('.loader');
    if (isLoading) {
      button.disabled = true;
      if (text) text.classList.add('hidden');
      if (loader) loader.classList.remove('hidden');
    } else {
      button.disabled = false;
      if (text) text.classList.remove('hidden');
      if (loader) loader.classList.add('hidden');
    }
  };
  
  const toggleModal = (modalId, show) => {
    const modal = document.getElementById(modalId);
    if (show) {
      modalBackdrop.classList.remove("hidden");
      modal.classList.remove("hidden");
      modal.setAttribute('aria-hidden', 'false');
    } else {
      modalBackdrop.classList.add("hidden");
      modal.classList.add("hidden");
      modal.setAttribute('aria-hidden', 'true');
    }
  };

  // =================================================================================
  // AUTENTICAÇÃO E SESSÃO
  // =================================================================================
  const checkAuthState = async () => {
    token = localStorage.getItem("tcfv_token");
    if (!token) return;
    try {
      user = await apiFetch("/user");
      updateUIAfterLogin();
    } catch (error) {
      logout();
    }
  };

  const handleAuth = async (form, action, errorMsgElement) => {
    const button = form.querySelector('button[type="submit"]');
    toggleButtonLoading(button, true);
    errorMsgElement.classList.add("hidden");

    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    
    try {
        const result = await apiFetch("/auth", {
            method: "POST",
            body: JSON.stringify({ action, ...data }),
        });
        user = result;
        token = result.token;
        localStorage.setItem("tcfv_token", token);
        updateUIAfterLogin();
        toggleModal(form.closest('.modal-container').id, false);
        const welcomeMsg = action === 'login' ? `Bem-vindo de volta, ${user.name.split(" ")[0]}!` : `Conta criada com sucesso, ${user.name.split(" ")[0]}!`;
        showToast(welcomeMsg, "success");
    } catch (error) {
        errorMsgElement.textContent = error.message;
        errorMsgElement.classList.remove("hidden");
    } finally {
        toggleButtonLoading(button, false);
    }
  };

  const logout = () => {
    user = null;
    token = null;
    localStorage.removeItem("tcfv_token");
    updateUIAfterLogout();
  };

  // =================================================================================
  // ATUALIZAÇÃO DA INTERFACE (UI)
  // =================================================================================
  const updateUIAfterLogin = () => {
    loginBtn.classList.add("hidden");
    userProfileDiv.classList.remove("hidden");
    userProfileDiv.classList.add("flex");
    userNameSpan.textContent = user.name.split(" ")[0];
    renderLoyaltyCard(user.loyalty_stamps);
    if (user.is_admin) adminPanelBtn.classList.remove("hidden");
  };

  const updateUIAfterLogout = () => {
    loginBtn.classList.remove("hidden");
    userProfileDiv.classList.add("hidden");
    userNameSpan.textContent = "";
    loyaltyCardContainer.classList.add("hidden");
    adminPanelBtn.classList.add("hidden");
  };

  const renderMenu = (productsByCategory) => {
    menuSection.innerHTML = "";
    if (Object.keys(productsByCategory).length === 0) {
        menuSection.innerHTML = '<p class="text-center">Nenhum produto encontrado.</p>';
        return;
    }

    for (const category_name in productsByCategory) {
      const categoryId = `category-${category_name.replace(/\s+/g, "-").replace(/[^\w-]/g, '')}`;
      const categorySection = document.createElement("div");
      categorySection.id = categoryId;
      categorySection.innerHTML = `<h2 class="section-title">${category_name}</h2>`;
      const productsGrid = document.createElement("div");
      productsGrid.className = "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8";
      categorySection.appendChild(productsGrid);

      productsByCategory[category_name].forEach((product) => {
        const productCard = document.createElement("product-card");
        productCard.setAttribute("id", product.id);
        productCard.setAttribute("name", product.name);
        productCard.setAttribute("price", product.price);
        productCard.setAttribute("description", product.description);
        productCard.setAttribute("img", product.image.replace('/upload/', '/upload/c_fill,h_200,w_400,f_auto,q_auto/'));
        productCard.setAttribute("promo", product.promo);
        if (product.oldPrice) productCard.setAttribute("oldPrice", product.oldPrice);
        productsGrid.appendChild(productCard);
      });
      menuSection.appendChild(categorySection);
    }
  };

  const renderCategoryButtons = (categories) => {
    categoryButtonsContainer.innerHTML = "";
    categories.forEach(category => {
        const categoryId = `#category-${category.name.replace(/\s+/g, "-").replace(/[^\w-]/g, '')}`;
        const categoryButton = document.createElement("a");
        categoryButton.href = categoryId;
        categoryButton.className = "category-btn py-2 px-4 rounded-full text-sm";
        categoryButton.textContent = category.name;
        categoryButtonsContainer.appendChild(categoryButton);
    });
  };

  const renderLoyaltyCard = (stamps) => {
    loyaltyCardContainer.classList.remove("hidden");
    loyaltyStampsDiv.innerHTML = "";
    for (let i = 1; i <= 10; i++) {
      const stampDiv = document.createElement("div");
      stampDiv.className = "stamp";
      if (i <= stamps) {
        stampDiv.classList.add("stamped");
        stampDiv.innerHTML = '<i class="fas fa-star text-2xl"></i>';
      }
      loyaltyStampsDiv.appendChild(stampDiv);
    }
    const remaining = 10 - stamps;
    loyaltyMessageP.textContent = remaining > 0 ? `Faltam ${remaining} selos para seu prêmio!` : "Parabéns! Peça seu prêmio no próximo pedido!";
  };

  // =================================================================================
  // LÓGICA DE PEDIDOS DO UTILIZADOR
  // =================================================================================
  const fetchMyOrders = async () => {
    ordersListContainer.innerHTML = '<div class="flex justify-center"><div class="loader"></div></div>';
    try {
        const orders = await apiFetch("/admin-orders"); // Reutiliza a rota de admin
        const userOrders = orders.filter(order => order.user_phone === user.phone);
        renderMyOrders(userOrders);
    } catch (error) {
        ordersListContainer.innerHTML = `<p class="text-red-500 text-center">Erro ao buscar seus pedidos: ${error.message}</p>`;
    }
  };

  const renderMyOrders = (orders) => {
    if (orders.length === 0) {
        ordersListContainer.innerHTML = `<p class="text-center">Você ainda não fez nenhum pedido.</p>`;
        return;
    }
    ordersListContainer.innerHTML = orders.map(order => `
        <div class="bg-white p-4 rounded-lg shadow-md border-l-4 border-yellow-500">
            <div class="flex justify-between items-start">
                <div>
                    <p class="font-bold text-red-800">Pedido #${order.id.substring(0, 8).toUpperCase()}</p>
                    <p class="text-sm text-gray-500">${new Date(order.created_at).toLocaleDateString('pt-BR')}</p>
                </div>
                <span class="text-sm font-bold py-1 px-3 rounded-full text-white ${order.status === 'Entregue' ? 'bg-green-500' : 'bg-yellow-500'}">${order.status}</span>
            </div>
            <ul class="text-sm mt-2 list-disc list-inside">
                ${order.items.map(item => `<li>${item.quantity}x ${item.name}</li>`).join('')}
            </ul>
            <p class="text-right font-bold text-red-900 mt-2">Total: R$ ${parseFloat(order.total).toFixed(2)}</p>
        </div>
    `).join('');
  };

  // =================================================================================
  // LÓGICA DO CARRINHO
  // =================================================================================
  const addToCart = (product) => {
    const existingProduct = cart.find((item) => item.id === product.id);
    if (existingProduct) existingProduct.quantity++;
    else cart.push({ ...product, quantity: 1 });
    updateCart();
    showToast(`${product.name} adicionado ao carrinho!`, "success");
  };

  const updateCart = () => {
    renderCartItems();
    updateCartTotal();
    updateCartCount();
    checkCheckoutButtonState();
  };

  const renderCartItems = () => {
    if (cart.length === 0) {
      cartItemsContainer.innerHTML = "";
      cartEmptyMsg.classList.remove("hidden");
      clearCartBtn.classList.add("hidden");
    } else {
      cartEmptyMsg.classList.add("hidden");
      clearCartBtn.classList.remove("hidden");
      cartItemsContainer.innerHTML = cart.map((item) => `
            <div class="flex justify-between items-center bg-white p-3 rounded-lg shadow-sm">
                <div>
                    <p class="font-bold text-red-800">${item.name}</p>
                    <p class="text-sm text-gray-600">R$ ${item.price.toFixed(2)}</p>
                </div>
                <div class="flex items-center gap-3">
                    <button class="quantity-change bg-gray-200 w-6 h-6 rounded-full font-bold" data-id="${item.id}" data-change="-1">-</button>
                    <span>${item.quantity}</span>
                    <button class="quantity-change bg-gray-200 w-6 h-6 rounded-full font-bold" data-id="${item.id}" data-change="1">+</button>
                    <button class="remove-item text-red-500 hover:text-red-700 ml-2" data-id="${item.id}"><i class="fas fa-trash"></i></button>
                </div>
            </div>`).join("");
    }
  };

  const updateCartTotal = () => {
    const total = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
    cartTotalSpan.textContent = `R$ ${total.toFixed(2).replace(".", ",")}`;
  };

  const updateCartCount = () => {
    const count = cart.reduce((acc, item) => acc + item.quantity, 0);
    cartCount.textContent = count;
  };

  const handleCartActions = (e) => {
    const target = e.target.closest("button");
    if (!target) return;
    const id = target.dataset.id;
    if (target.classList.contains("quantity-change")) {
      const change = parseInt(target.dataset.change);
      const product = cart.find((item) => item.id === id);
      if (product) {
        product.quantity += change;
        if (product.quantity <= 0) cart = cart.filter((item) => item.id !== id);
        updateCart();
      }
    }
    if (target.classList.contains("remove-item")) {
      cart = cart.filter((item) => item.id !== id);
      updateCart();
    }
  };
  
  const toggleCartModal = (show) => {
    if (show) {
      cartBackdrop.classList.remove("hidden");
      cartModal.classList.remove("translate-x-full");
    } else {
      cartBackdrop.classList.add("hidden");
      cartModal.classList.add("translate-x-full");
    }
  };
  
  // =================================================================================
  // LÓGICA DE CHECKOUT
  // =================================================================================
  const checkCheckoutButtonState = () => {
    const isValid = cart.length > 0 && addressInput.value.trim().length >= 10;
    checkoutBtn.disabled = !isValid;
    if (isValid) checkoutBtn.classList.remove("opacity-50", "cursor-not-allowed");
    else checkoutBtn.classList.add("opacity-50", "cursor-not-allowed");
  };

  const formatOrderForWhatsApp = () => {
    const total = cart.reduce((acc, item) => acc + item.price * item.quantity, 0).toFixed(2);
    let message = `*🍔 NOVO PEDIDO TÔ COM FOME VR 🍔*\n\n*Itens:*\n${cart.map(item => `▪️ ${item.quantity}x ${item.name}`).join('\n')}\n\n*Total: R$ ${total}*\n\n*Endereço:*\n${addressInput.value.trim()}`;
    if (user) message += `\n\n*Cliente:* ${user.name} (${user.phone})`;
    return encodeURIComponent(message);
  };

  const handleCheckout = async () => {
    toggleButtonLoading(checkoutBtn, true);

    // Se o utilizador estiver logado, regista o pedido no sistema primeiro
    if (user) {
      try {
        const orderData = {
          items: cart,
          total: cart.reduce((acc, item) => acc + item.price * item.quantity, 0),
          address: addressInput.value.trim(),
        };
        const result = await apiFetch("/orders", {
          method: "POST",
          body: JSON.stringify(orderData),
        });
        renderLoyaltyCard(result.loyalty.newStampCount);
        const successMsg = result.loyalty.rewardMessage || "Pedido registado e selo ganho!";
        showToast(successMsg, "success");
      } catch (error) {
        showToast(`Erro ao registar o pedido: ${error.message}`, "error");
        toggleButtonLoading(checkoutBtn, false);
        return; // Não continua para o WhatsApp se o registo no sistema falhar
      }
    }
    
    // Envia a mensagem para o WhatsApp
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${formatOrderForWhatsApp()}`, "_blank");
    
    // Limpa o carrinho e fecha os modais
    cart = [];
    addressInput.value = "";
    updateCart();
    toggleCartModal(false);
    toggleButtonLoading(checkoutBtn, false);
  };

  // =================================================================================
  // INICIALIZAÇÃO E EVENT LISTENERS
  // =================================================================================
  const init = async () => {
    await checkAuthState();
    try {
        const [productsData, categoriesData] = await Promise.all([
            apiFetch("/products"),
            apiFetch("/categories")
        ]);
        allProducts = productsData;
        renderMenu(allProducts);
        renderCategoryButtons(categoriesData);
        menuLoader.classList.add("hidden");
        menuSection.classList.remove("hidden");
    } catch (error) {
        menuLoader.innerHTML = `<p class="text-center text-red-500">Erro ao carregar o cardápio. Tente novamente mais tarde.</p>`;
    }
  };

  // Modais de Autenticação
  loginBtn.addEventListener("click", () => toggleModal("login-modal", true));
  closeLoginModalBtn.addEventListener("click", () => toggleModal("login-modal", false));
  closeRegisterModalBtn.addEventListener("click", () => toggleModal("register-modal", false));
  switchToRegisterLink.addEventListener("click", (e) => {
    e.preventDefault();
    toggleModal("login-modal", false);
    toggleModal("register-modal", true);
  });
  switchToLoginLink.addEventListener("click", (e) => {
    e.preventDefault();
    toggleModal("register-modal", false);
    toggleModal("login-modal", true);
  });
  modalBackdrop.addEventListener("click", () => {
    document.querySelectorAll('.modal-container').forEach(modal => toggleModal(modal.id, false));
  });

  // Formulários de Autenticação
  loginForm.addEventListener("submit", (e) => { e.preventDefault(); handleAuth(loginForm, 'login', loginErrorMsg); });
  registerForm.addEventListener("submit", (e) => { e.preventDefault(); handleAuth(registerForm, 'register', registerErrorMsg); });
  logoutBtn.addEventListener("click", logout);

  // Modal Meus Pedidos
  myOrdersBtn.addEventListener("click", () => {
    toggleModal("my-orders-modal", true);
    fetchMyOrders();
  });
  closeOrdersModalBtn.addEventListener("click", () => toggleModal("my-orders-modal", false));

  // Adicionar ao Carrinho (delegação de evento)
  menuSection.addEventListener("addToCart", (e) => addToCart(e.detail));

  // Carrinho
  cartIcon.addEventListener("click", () => toggleCartModal(true));
  closeCartBtn.addEventListener("click", () => toggleCartModal(false));
  cartBackdrop.addEventListener("click", () => toggleCartModal(false));
  clearCartBtn.addEventListener("click", () => { cart = []; updateCart(); });
  cartItemsContainer.addEventListener("click", handleCartActions);

  // Checkout
  addressInput.addEventListener("input", checkCheckoutButtonState);
  checkoutBtn.addEventListener("click", () => {
    if (!user) {
      toggleModal("guest-checkout-modal", true);
    } else {
      handleCheckout();
    }
  });

  // Checkout de Convidado
  closeGuestModalBtn.addEventListener("click", () => toggleModal("guest-checkout-modal", false));
  promptLoginBtn.addEventListener("click", () => {
    toggleModal("guest-checkout-modal", false);
    toggleModal("login-modal", true);
  });
  continueAsGuestBtn.addEventListener("click", () => {
    toggleModal("guest-checkout-modal", false);
    handleCheckout();
  });

  // Inicia a aplicação
  init();
});
