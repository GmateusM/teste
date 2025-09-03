document.addEventListener("DOMContentLoaded", () => {
  // =================================================================================
  // CONFIGURAÇÃO E VARIÁVEIS GLOBAIS
  // =================================================================================
  const API_URL = "/api"; // URL relativa para funcionar no Netlify
  const WHATSAPP_NUMBER = "5524999219813"; // INSIRA SEU NÚMERO DE WHATSAPP AQUI

  let cart = [];
  let token = null;
  let user = null;

  // =================================================================================
  // SELETORES DE ELEMENTOS DO DOM
  // =================================================================================
  const menuSection = document.getElementById("menu");
  const categoryButtonsContainer = document.getElementById(
    "category-buttons-container"
  );
  const loginBtn = document.getElementById("login-btn");
  const userProfileDiv = document.getElementById("user-profile");
  const userNameSpan = document.getElementById("user-name");
  const logoutBtn = document.getElementById("logout-btn");
  const adminPanelBtn = document.getElementById("admin-panel-btn"); // ADICIONADO: Seletor para o novo botão do painel
  const modalBackdrop = document.getElementById("modal-backdrop");
  const loginModal = document.getElementById("login-modal");
  const registerModal = document.getElementById("register-modal");
  const closeLoginModalBtn = document.getElementById("close-login-modal-btn");
  const closeRegisterModalBtn = document.getElementById(
    "close-register-modal-btn"
  );
  const switchToRegisterLink = document.getElementById("switch-to-register");
  const switchToLoginLink = document.getElementById("switch-to-login");
  const loginForm = document.getElementById("login-form");
  const registerForm = document.getElementById("register-form");
  const loginErrorMsg = document.getElementById("login-error-msg");
  const registerErrorMsg = document.getElementById("register-error-msg");
  const loyaltyCardContainer = document.getElementById(
    "loyalty-card-container"
  );
  const loyaltyStampsDiv = document.getElementById("loyalty-stamps");
  const loyaltyMessageP = document.getElementById("loyalty-message");
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
  const toastContainer = document.getElementById("toast-container");
  const guestCheckoutModal = document.getElementById("guest-checkout-modal");
  const closeGuestModalBtn = document.getElementById("close-guest-modal-btn");
  const promptLoginBtn = document.getElementById("prompt-login-btn");
  const continueAsGuestBtn = document.getElementById("continue-as-guest-btn");

  // =================================================================================
  // FUNÇÕES DE API E AUTENTICAÇÃO
  // =================================================================================
  const apiFetch = async (endpoint, options = {}) => {
    const headers = { "Content-Type": "application/json", ...options.headers };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Ocorreu um erro na requisição.");
    }
    return data;
  };

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

  const handleLogin = async (e) => {
    e.preventDefault();
    const phone = document.getElementById("login-phone").value;
    const password = document.getElementById("login-password").value;
    try {
      loginErrorMsg.classList.add("hidden");
      const data = await apiFetch("/auth", {
        method: "POST",
        body: JSON.stringify({ action: "login", phone, password }),
      });
      user = data;
      token = data.token;
      localStorage.setItem("tcfv_token", token);
      updateUIAfterLogin();
      toggleModal("login-modal", false);
      showToast(`Bem-vindo de volta, ${user.name.split(" ")[0]}!`, "success");
    } catch (error) {
      loginErrorMsg.textContent = error.message;
      loginErrorMsg.classList.remove("hidden");
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    const name = document.getElementById("register-name").value;
    const phone = document.getElementById("register-phone").value;
    const password = document.getElementById("register-password").value;
    try {
      registerErrorMsg.classList.add("hidden");
      const data = await apiFetch("/auth", {
        method: "POST",
        body: JSON.stringify({ action: "register", name, phone, password }),
      });
      user = data;
      token = data.token;
      localStorage.setItem("tcfv_token", token);
      updateUIAfterLogin();
      toggleModal("register-modal", false);
      showToast(
        `Conta criada com sucesso, ${user.name.split(" ")[0]}!`,
        "success"
      );
    } catch (error) {
      registerErrorMsg.textContent = error.message;
      registerErrorMsg.classList.remove("hidden");
    }
  };

  const logout = () => {
    user = null;
    token = null;
    localStorage.removeItem("tcfv_token");
    updateUIAfterLogout();
  };

  // =================================================================================
  // RENDERIZAÇÃO E ATUALIZAÇÃO DA INTERFACE (UI)
  // =================================================================================

  const updateUIAfterLogin = () => {
    loginBtn.classList.add("hidden");
    userProfileDiv.classList.remove("hidden");
    userProfileDiv.classList.add("flex");
    userNameSpan.textContent = user.name.split(" ")[0];
    renderLoyaltyCard(user.loyalty_stamps);

    // ADICIONADO: Mostra o botão do painel admin se o utilizador for admin
    if (user.is_admin) {
      adminPanelBtn.classList.remove("hidden");
    }
  };

  const updateUIAfterLogout = () => {
    loginBtn.classList.remove("hidden");
    userProfileDiv.classList.add("hidden");
    userNameSpan.textContent = "";
    loyaltyCardContainer.classList.add("hidden");
    // ADICIONADO: Garante que o botão do painel admin fica escondido ao sair
    adminPanelBtn.classList.add("hidden");
  };

  const toggleModal = (modalId, show) => {
    const modal = document.getElementById(modalId);
    if (show) {
      modalBackdrop.classList.remove("hidden");
      modal.classList.remove("hidden");
    } else {
      modalBackdrop.classList.add("hidden");
      modal.classList.add("hidden");
    }
  };

  const renderMenu = (productsByCategory) => {
    menuSection.innerHTML = "";
    categoryButtonsContainer.innerHTML = "";

    for (const category in productsByCategory) {
      // Cria o botão da categoria
      const categoryButton = document.createElement("a");
      categoryButton.href = `#category-${category.replace(/\s+/g, "-")}`;
      categoryButton.className = "category-btn py-2 px-4 rounded-full text-sm";
      categoryButton.textContent = category;
      categoryButtonsContainer.appendChild(categoryButton);

      // Cria a seção da categoria
      const categorySection = document.createElement("div");
      categorySection.id = `category-${category.replace(/\s+/g, "-")}`;
      categorySection.innerHTML = `<h2 class="section-title">${category}</h2>`;
      const productsGrid = document.createElement("div");
      productsGrid.className =
        "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8";
      categorySection.appendChild(productsGrid);

      // Adiciona os produtos na seção
      productsByCategory[category].forEach((product) => {
        const productCard = document.createElement("product-card");
        productCard.setAttribute("id", product.id);
        productCard.setAttribute("name", product.name);
        productCard.setAttribute("price", product.price);
        productCard.setAttribute("description", product.description);
        productCard.setAttribute("img", product.image);
        productCard.setAttribute("promo", product.promo);
        if (product.oldPrice) {
          productCard.setAttribute("oldPrice", product.oldPrice);
        }
        productsGrid.appendChild(productCard);
      });
      menuSection.appendChild(categorySection);
    }
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
    if (stamps >= 10) {
      loyaltyMessageP.textContent = "Parabéns! Você ganhou um prêmio!";
    } else {
      loyaltyMessageP.textContent = `Faltam ${10 - stamps} selos para seu prêmio!`;
    }
  };

  // =================================================================================
  // LÓGICA DO CARRINHO E PEDIDO
  // =================================================================================

  const addToCart = (product) => {
    const existingProduct = cart.find((item) => item.id === product.id);
    if (existingProduct) {
      existingProduct.quantity++;
    } else {
      cart.push({ ...product, quantity: 1 });
    }
    updateCart();
    showToast(`${product.name} adicionado ao carrinho!`, "success");
  };

  const updateCart = () => {
    renderCart();
    updateCartTotal();
    updateCartCount();
    checkCheckoutButtonState();
  };

  const renderCart = () => {
    if (cart.length === 0) {
      cartItemsContainer.innerHTML = "";
      cartEmptyMsg.classList.remove("hidden");
      clearCartBtn.classList.add("hidden");
    } else {
      cartEmptyMsg.classList.add("hidden");
      clearCartBtn.classList.remove("hidden");
      cartItemsContainer.innerHTML = cart
        .map(
          (item) => `
            <div class="flex justify-between items-center bg-white p-3 rounded-lg shadow-sm">
                <div>
                    <p class="font-bold text-red-800">${item.name}</p>
                    <p class="text-sm text-gray-600">R$ ${item.price.toFixed(
                      2
                    )}</p>
                </div>
                <div class="flex items-center gap-3">
                    <button class="quantity-change bg-gray-200 w-6 h-6 rounded-full font-bold" data-id="${
                      item.id
                    }" data-change="-1">-</button>
                    <span>${item.quantity}</span>
                    <button class="quantity-change bg-gray-200 w-6 h-6 rounded-full font-bold" data-id="${
                      item.id
                    }" data-change="1">+</button>
                    <button class="remove-item text-red-500 hover:text-red-700 ml-2" data-id="${
                      item.id
                    }"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `
        )
        .join("");
    }
  };

  const updateCartTotal = () => {
    const total = cart.reduce(
      (acc, item) => acc + item.price * item.quantity,
      0
    );
    cartTotalSpan.textContent = `R$ ${total.toFixed(2).replace(".", ",")}`;
  };

  const updateCartCount = () => {
    const count = cart.reduce((acc, item) => acc + item.quantity, 0);
    cartCount.textContent = count;
  };

  const handleQuantityChange = (productId, change) => {
    const product = cart.find((item) => item.id === productId);
    if (product) {
      product.quantity += change;
      if (product.quantity <= 0) {
        cart = cart.filter((item) => item.id !== productId);
      }
      updateCart();
    }
  };

  const handleRemoveItem = (productId) => {
    cart = cart.filter((item) => item.id !== productId);
    updateCart();
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

  const checkCheckoutButtonState = () => {
    checkoutBtn.disabled = cart.length === 0 || addressInput.value.trim() === "";
    if (checkoutBtn.disabled) {
      checkoutBtn.classList.add("opacity-50", "cursor-not-allowed");
    } else {
      checkoutBtn.classList.remove("opacity-50", "cursor-not-allowed");
    }
  };

  const formatOrderForWhatsApp = () => {
    let message = "*🍔 NOVO PEDIDO TÔ COM FOME VR 🍔*\n\n";
    message += "*Itens do Pedido:*\n";
    cart.forEach((item) => {
      message += `▪️ ${item.quantity}x ${
        item.name
      } - R$ ${(item.price * item.quantity).toFixed(2)}\n`;
    });
    message += "\n";
    const total = cart
      .reduce((acc, item) => acc + item.price * item.quantity, 0)
      .toFixed(2);
    message += `*Total: R$ ${total}*\n\n`;
    message += `*Endereço de Entrega:*\n${addressInput.value.trim()}\n\n`;
    if (user) {
      message += `*Cliente:* ${user.name} (${user.phone})`;
    } else {
      message += `*Cliente:* (Não cadastrado)`;
    }
    return encodeURIComponent(message);
  };

  const handleCheckout = async () => {
    if (user) {
      // Cliente logado: salva no banco e abre o WhatsApp
      try {
        const orderData = {
          items: cart,
          total: cart.reduce(
            (acc, item) => acc + item.price * item.quantity,
            0
          ),
          address: addressInput.value.trim(),
        };
        const result = await apiFetch("/orders", {
          method: "POST",
          body: JSON.stringify(orderData),
        });
        // Atualiza o cartão de fidelidade na tela
        renderLoyaltyCard(result.loyalty.newStampCount);
        showToast(
          result.loyalty.rewardMessage || "Pedido registado e selo ganho!",
          "success"
        );
      } catch (error) {
        showToast(`Erro ao registar o pedido: ${error.message}`, "error");
      }
    }
    // Para todos os casos (logado ou não), abre o WhatsApp
    const whatsappMessage = formatOrderForWhatsApp();
    window.open(
      `https://wa.me/${WHATSAPP_NUMBER}?text=${whatsappMessage}`,
      "_blank"
    );
    // Limpa o carrinho e fecha a modal após o pedido
    cart = [];
    addressInput.value = "";
    updateCart();
    toggleCartModal(false);
  };

  // =================================================================================
  // FUNÇÕES UTILITÁRIAS
  // =================================================================================
  const showToast = (message, type = "info") => {
    const toast = document.createElement("div");
    const colors = {
      info: "bg-blue-500",
      success: "bg-green-500",
      error: "bg-red-500",
    };
    toast.className = `fixed bottom-5 right-5 ${colors[type]} text-white py-3 px-5 rounded-lg shadow-lg transform translate-y-20 opacity-0 transition-all duration-300`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.classList.remove("translate-y-20", "opacity-0");
    }, 10);

    setTimeout(() => {
      toast.classList.add("translate-y-20", "opacity-0");
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  };

  // =================================================================================
  // INICIALIZAÇÃO E EVENT LISTENERS
  // =================================================================================
  const init = async () => {
    await checkAuthState();
    try {
      const products = await apiFetch("/products");
      renderMenu(products);
    } catch (error) {
      menuSection.innerHTML =
        '<p class="text-center text-red-500">Erro ao carregar o cardápio. Tente novamente mais tarde.</p>';
    }
  };

  // Listeners para Modais de Autenticação
  loginBtn.addEventListener("click", () => toggleModal("login-modal", true));
  closeLoginModalBtn.addEventListener("click", () =>
    toggleModal("login-modal", false)
  );
  closeRegisterModalBtn.addEventListener("click", () =>
    toggleModal("register-modal", false)
  );
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
    toggleModal("login-modal", false);
    toggleModal("register-modal", false);
    toggleModal("guest-checkout-modal", false);
  });

  // Listeners para Formulários
  loginForm.addEventListener("submit", handleLogin);
  registerForm.addEventListener("submit", handleRegister);
  logoutBtn.addEventListener("click", logout);

  // Listener para Adicionar ao Carrinho (delegação de evento)
  menuSection.addEventListener("addToCart", (event) => {
    addToCart(event.detail);
  });

  // Listeners para o Carrinho
  cartIcon.addEventListener("click", () => toggleCartModal(true));
  closeCartBtn.addEventListener("click", () => toggleCartModal(false));
  cartBackdrop.addEventListener("click", () => toggleCartModal(false));
  clearCartBtn.addEventListener("click", () => {
    cart = [];
    updateCart();
  });
  cartItemsContainer.addEventListener("click", (e) => {
    const target = e.target.closest("button");
    if (!target) return;
    const id = target.dataset.id;
    if (target.classList.contains("quantity-change")) {
      const change = parseInt(target.dataset.change);
      handleQuantityChange(id, change);
    }
    if (target.classList.contains("remove-item")) {
      handleRemoveItem(id);
    }
  });

  // Listener para o Checkout
  addressInput.addEventListener("input", checkCheckoutButtonState);
  checkoutBtn.addEventListener("click", () => {
    if (!user) {
      toggleModal("guest-checkout-modal", true);
    } else {
      handleCheckout();
    }
  });

  // Listeners para Modal de Checkout de Convidado
  closeGuestModalBtn.addEventListener("click", () =>
    toggleModal("guest-checkout-modal", false)
  );
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
