document.addEventListener("DOMContentLoaded", () => {
  // =================================================================================
  // CONFIGURAÇÃO E VARIÁVEIS GLOBAIS
  // =================================================================================
  const API_URL = "/api"; // CORRIGIDO: URL relativa para funcionar no Netlify
  const WHATSAPP_NUMBER = "5524999219813";

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
      // CORRIGIDO: Adicionado "action: 'login'" e a chamada é para /auth
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
      // CORRIGIDO: Adicionado "action: 'register'" e a chamada é para /auth
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

  // ... (O resto do ficheiro está correto e pode ser mantido como está)
  // RENDERIZAÇÃO E ATUALIZAÇÃO DA INTERFACE (UI)
  // LÓGICA DO CARRINHO E PEDIDO
  // INICIALIZAÇÃO E EVENT LISTENERS
});
