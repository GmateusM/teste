document.addEventListener("DOMContentLoaded", () => {
  // CORRIGIDO: URL relativa para funcionar em produção no Netlify
  const API_URL = "/api";
  let token = null;

  // Seletores do DOM
  const adminProfileDiv = document.getElementById("admin-profile");
  const adminNameSpan = document.getElementById("admin-name");
  const logoutBtn = document.getElementById("logout-btn");
  const productForm = document.getElementById("product-form");
  const productListDiv = document.getElementById("product-list");

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

  const checkAdminAuth = async () => {
    token = localStorage.getItem("tcfv_token");
    if (!token) {
      alert("Acesso negado. Faça login como administrador.");
      window.location.href = "index.html";
      return;
    }
    try {
      // CORRIGIDO: O endpoint correto é /user, conforme definido em netlify/functions/user.js
      const user = await apiFetch("/user");

      // CORRIGIDO: A propriedade booleana é is_admin (padrão do SQL) e não isAdmin
      if (!user.is_admin) {
        alert("Acesso negado. Esta página é apenas para administradores.");
        window.location.href = "index.html";
        return;
      }
      // Se for admin, mostra o perfil e carrega os produtos
      adminNameSpan.textContent = user.name.split(" ")[0];
      adminProfileDiv.classList.remove("hidden");
      adminProfileDiv.classList.add("flex");
      loadProducts();
    } catch (error) {
      alert("Sessão inválida. Por favor, faça login novamente.");
      localStorage.removeItem("tcfv_token");
      window.location.href = "index.html";
    }
  };

  const logout = () => {
    localStorage.removeItem("tcfv_token");
    window.location.href = "index.html";
  };

  // =================================================================================
  // FUNÇÕES DE GESTÃO DE PRODUTOS
  // =================================================================================

  const loadProducts = async () => {
    try {
      const productsByCategory = await apiFetch("/products");
      productListDiv.innerHTML = ""; // Limpa a lista antes de renderizar

      // Junta todos os produtos de todas as categorias num único array
      const allProducts = Object.values(productsByCategory).flat();

      if (allProducts.length === 0) {
        productListDiv.innerHTML = "<p>Nenhum produto cadastrado.</p>";
        return;
      }

      allProducts.forEach((product) => {
        const productCard = document.createElement("div");
        productCard.className = "bg-white p-4 rounded-lg shadow";
        productCard.innerHTML = `
            <img src="${product.image}" alt="${
          product.name
        }" class="w-full h-32 object-cover rounded-md mb-4">
            <h3 class="font-bold text-lg text-red-800">${product.name}</h3>
            <p class="text-sm text-gray-600">${product.category}</p>
            <p class="font-display text-xl text-red-900 mt-2">R$ ${parseFloat(
              product.price
            )
              .toFixed(2)
              .replace(".", ",")}</p>
            ${
              product.promo
                ? '<span class="text-xs bg-red-500 text-white font-bold py-1 px-2 rounded-full">PROMO</span>'
                : ""
            }
            `;
        productListDiv.appendChild(productCard);
      });
    } catch (error) {
      productListDiv.innerHTML = `<p class="text-red-500">Erro ao carregar produtos: ${error.message}</p>`;
    }
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    const formData = new FormData(productForm);
    const productData = Object.fromEntries(formData.entries());

    // Converte os tipos de dados para o formato correto
    productData.price = parseFloat(productData.price);
    productData.oldPrice = productData.oldPrice
      ? parseFloat(productData.oldPrice)
      : null;
    productData.promo = productForm.querySelector("#promo").checked;

    try {
      const createdProduct = await apiFetch("/products", {
        method: "POST",
        body: JSON.stringify(productData),
      });
      alert(`Produto "${createdProduct.name}" adicionado com sucesso!`);
      productForm.reset();
      loadProducts(); // Atualiza a lista de produtos na tela
    } catch (error) {
      alert(`Erro ao adicionar produto: ${error.message}`);
    }
  };

  // =================================================================================
  // INICIALIZAÇÃO E EVENT LISTENERS
  // =================================================================================
  logoutBtn.addEventListener("click", logout);
  productForm.addEventListener("submit", handleAddProduct);

  checkAdminAuth(); // Função principal que inicia a página
});
