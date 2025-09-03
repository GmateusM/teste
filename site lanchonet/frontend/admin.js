document.addEventListener("DOMContentLoaded", () => {
  // =================================================================================
  // CONFIGURAÇÃO E VARIÁVEIS GLOBAIS
  // =================================================================================
  const API_URL = "/api";
  let token = null;
  let allProducts = []; // Guarda uma cópia local de todos os produtos

  // =================================================================================
  // SELETORES DE ELEMENTOS DO DOM
  // =================================================================================
  const adminProfileDiv = document.getElementById("admin-profile");
  const adminNameSpan = document.getElementById("admin-name");
  const logoutBtn = document.getElementById("logout-btn");
  const productForm = document.getElementById("product-form");
  const productListDiv = document.getElementById("product-list");

  // Seletores do Modal de Edição
  const modalBackdrop = document.getElementById("modal-backdrop");
  const editModal = document.getElementById("edit-modal");
  const closeEditModalBtn = document.getElementById("close-edit-modal-btn");
  const editProductForm = document.getElementById("edit-product-form");

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
    // O método DELETE pode retornar uma resposta sem corpo JSON
    if (response.status === 204 || response.headers.get("content-length") === "0") {
        return; // Retorna undefined ou um objeto vazio se preferir
    }
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
      const user = await apiFetch("/user");
      if (!user.is_admin) {
        alert("Acesso negado. Esta página é apenas para administradores.");
        window.location.href = "index.html";
        return;
      }
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
      allProducts = Object.values(productsByCategory).flat(); // Armazena os produtos

      if (allProducts.length === 0) {
        productListDiv.innerHTML = "<p>Nenhum produto cadastrado.</p>";
        return;
      }
      renderProductList(allProducts);
    } catch (error) {
      productListDiv.innerHTML = `<p class="text-red-500">Erro ao carregar produtos: ${error.message}</p>`;
    }
  };

  const renderProductList = (products) => {
    productListDiv.innerHTML = ""; // Limpa a lista antes de renderizar
    products.forEach((product) => {
      const productCard = document.createElement("div");
      productCard.className = "bg-white p-4 rounded-lg shadow flex flex-col";
      productCard.innerHTML = `
        <img src="${product.image}" alt="${
        product.name
      }" class="w-full h-32 object-cover rounded-md mb-4">
        <div class="flex-grow">
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
        </div>
        <div class="mt-4 pt-4 border-t flex justify-end gap-2">
            <button class="edit-btn text-blue-600 hover:text-blue-800 font-bold py-1 px-3 rounded" data-id="${
              product.id
            }"><i class="fas fa-edit mr-1"></i> Editar</button>
            <button class="delete-btn text-red-600 hover:text-red-800 font-bold py-1 px-3 rounded" data-id="${
              product.id
            }"><i class="fas fa-trash mr-1"></i> Apagar</button>
        </div>
      `;
      productListDiv.appendChild(productCard);
    });
  };


  const handleAddProduct = async (e) => {
    e.preventDefault();
    const formData = new FormData(productForm);
    const productData = Object.fromEntries(formData.entries());

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
      loadProducts();
    } catch (error) {
      alert(`Erro ao adicionar produto: ${error.message}`);
    }
  };

  const handleEditProduct = async (e) => {
    e.preventDefault();
    const id = document.getElementById("edit-product-id").value;
    const formData = new FormData(editProductForm);
    const productData = Object.fromEntries(formData.entries());

    productData.price = parseFloat(productData.price);
    productData.oldPrice = productData.oldPrice
      ? parseFloat(productData.oldPrice)
      : null;
    productData.promo = editProductForm.querySelector("#edit-promo").checked;

    try {
      // A Rota agora é /products/ID_DO_PRODUTO
      const updatedProduct = await apiFetch(`/products/${id}`, {
        method: "PUT",
        body: JSON.stringify(productData),
      });
      alert(`Produto "${updatedProduct.name}" atualizado com sucesso!`);
      toggleModal("edit-modal", false);
      loadProducts();
    } catch (error) {
      alert(`Erro ao atualizar produto: ${error.message}`);
    }
  };

  const handleDeleteProduct = async (productId) => {
    const product = allProducts.find(p => p.id === productId);
    if (!product || !confirm(`Tem certeza de que deseja apagar o produto "${product.name}"?`)) {
        return;
    }

    try {
        await apiFetch(`/products/${productId}`, {
            method: "DELETE",
        });
        alert("Produto apagado com sucesso!");
        loadProducts();
    } catch (error) {
        alert(`Erro ao apagar produto: ${error.message}`);
    }
  };


  // =================================================================================
  // FUNÇÕES DO MODAL
  // =================================================================================
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

  const openEditModal = (productId) => {
    const product = allProducts.find(p => p.id === productId);
    if (!product) return;

    // Preenche o formulário do modal com os dados do produto
    document.getElementById("edit-product-id").value = product.id;
    document.getElementById("edit-name").value = product.name;
    document.getElementById("edit-category").value = product.category;
    document.getElementById("edit-price").value = product.price;
    document.getElementById("edit-oldPrice").value = product.oldPrice || '';
    document.getElementById("edit-description").value = product.description;
    document.getElementById("edit-image").value = product.image;
    document.getElementById("edit-promo").checked = product.promo;

    toggleModal("edit-modal", true);
  };


  // =================================================================================
  // INICIALIZAÇÃO E EVENT LISTENERS
  // =================================================================================
  logoutBtn.addEventListener("click", logout);
  productForm.addEventListener("submit", handleAddProduct);
  editProductForm.addEventListener("submit", handleEditProduct);

  // Listeners do Modal
  closeEditModalBtn.addEventListener("click", () => toggleModal("edit-modal", false));
  modalBackdrop.addEventListener("click", () => toggleModal("edit-modal", false));

  // Delegação de eventos para os botões de editar e apagar
  productListDiv.addEventListener("click", (e) => {
    const editButton = e.target.closest(".edit-btn");
    const deleteButton = e.target.closest(".delete-btn");

    if (editButton) {
      const productId = editButton.dataset.id;
      openEditModal(productId);
    } else if (deleteButton) {
      const productId = deleteButton.dataset.id;
      handleDeleteProduct(productId);
    }
  });


  checkAdminAuth(); // Função principal que inicia a página
});
