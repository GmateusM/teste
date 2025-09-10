document.addEventListener("DOMContentLoaded", () => {
  // =================================================================================
  // CONFIGURAÇÃO E VARIÁVEIS GLOBAIS
  // =================================================================================
  const API_URL = "/api";
  const CLOUDINARY_CLOUD_NAME = "dhmvpgabe";
  const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

  let token = null;
  let allProducts = [];
  let allCategories = [];

  // =================================================================================
  // SELETORES DE ELEMENTOS DO DOM
  // =================================================================================
  // Gerais
  const adminProfileDiv = document.getElementById("admin-profile");
  const adminNameSpan = document.getElementById("admin-name");
  const logoutBtn = document.getElementById("logout-btn");
  const modalBackdrop = document.getElementById("modal-backdrop");
  
  // Tabs
  const adminTabs = document.getElementById("admin-tabs");
  const tabContents = {
    products: document.getElementById("products-tab-content"),
    categories: document.getElementById("categories-tab-content"),
    orders: document.getElementById("orders-tab-content"),
  };

  // Formulário de Produto
  const productForm = document.getElementById("product-form");
  const productListDiv = document.getElementById("product-list");
  const categorySelect = document.getElementById("category");
  const imageUrlInput = document.getElementById("image-url");
  const fileUploadInput = document.getElementById("file-upload");
  const imagePreview = document.getElementById("image-preview");
  const imageUploadPlaceholder = document.getElementById("image-upload-placeholder");
  const uploadProgressContainer = document.getElementById("upload-progress-container");
  const uploadProgressBar = document.getElementById("upload-progress-bar");

  // Formulário de Categoria
  const categoryForm = document.getElementById("category-form");
  const categoryListDiv = document.getElementById("category-list");

  // Lista de Pedidos
  const orderListDiv = document.getElementById("order-list");

  // Modal de Edição de Produto
  const editModal = document.getElementById("edit-modal");
  const closeEditModalBtn = document.getElementById("close-edit-modal-btn");
  const editProductForm = document.getElementById("edit-product-form");
  const editCategorySelect = document.getElementById("edit-category");
  const editImageUrlInput = document.getElementById("edit-image-url");
  const editFileUploadInput = document.getElementById("edit-file-upload");
  const editImagePreview = document.getElementById("edit-image-preview");
  const editUploadProgressContainer = document.getElementById("edit-upload-progress-container");
  const editUploadProgressBar = document.getElementById("edit-upload-progress-bar");

  // =================================================================================
  // FUNÇÕES UTILITÁRIAS
  // =================================================================================
  const apiFetch = async (endpoint, options = {}) => {
    const headers = { "Content-Type": "application/json", ...options.headers };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    
    const response = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
    
    if (response.status === 204 || response.headers.get("content-length") === "0") return;

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Ocorreu um erro na requisição.");
    return data;
  };

  const toggleButtonLoading = (button, isLoading) => {
    const text = button.querySelector('.btn-text');
    const loader = button.querySelector('.loader');
    if (isLoading) {
      button.disabled = true;
      text.classList.add('hidden');
      loader.classList.remove('hidden');
    } else {
      button.disabled = false;
      text.classList.remove('hidden');
      loader.classList.add('hidden');
    }
  };

  // =================================================================================
  // AUTENTICAÇÃO E INICIALIZAÇÃO
  // =================================================================================
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
      
      // Carregar todos os dados necessários para o painel
      await loadCategories();
      await loadProducts();
      await loadOrders();

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
  // GESTÃO DE TABS (ABAS)
  // =================================================================================
  const switchTab = (tabName) => {
    // Esconde todos os painéis
    Object.values(tabContents).forEach(panel => panel.classList.add('hidden'));
    // Desativa todos os botões
    adminTabs.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active-tab'));

    // Mostra o painel correto
    tabContents[tabName].classList.remove('hidden');
    // Ativa o botão correto
    adminTabs.querySelector(`[data-tab="${tabName}"]`).classList.add('active-tab');
  };

  // =================================================================================
  // GESTÃO DE CATEGORIAS
  // =================================================================================
  const loadCategories = async () => {
    try {
        allCategories = await apiFetch("/categories");
        renderCategoryList(allCategories);
        populateCategorySelects(allCategories);
    } catch (error) {
        categoryListDiv.innerHTML = `<p class="text-red-500">Erro ao carregar categorias: ${error.message}</p>`;
    }
  };

  const renderCategoryList = (categories) => {
    if (!categories || categories.length === 0) {
        categoryListDiv.innerHTML = "<p>Nenhuma categoria cadastrada.</p>";
        return;
    }
    categoryListDiv.innerHTML = categories.map(cat => `
        <div class="bg-white p-4 rounded-lg shadow-sm flex justify-between items-center">
            <div>
                <span class="font-bold text-red-800">${cat.name}</span>
                <span class="text-sm text-gray-500 ml-2">(Ordem: ${cat.display_order})</span>
            </div>
            <button class="delete-category-btn text-red-600 hover:text-red-800 font-bold py-1 px-3 rounded" data-id="${cat.id}" data-name="${cat.name}">
                <i class="fas fa-trash mr-1"></i> Apagar
            </button>
        </div>
    `).join('');
  };

  const populateCategorySelects = (categories) => {
    categorySelect.innerHTML = '<option value="">Selecione uma categoria...</option>';
    editCategorySelect.innerHTML = '<option value="">Selecione uma categoria...</option>';
    categories.forEach(cat => {
        const option = `<option value="${cat.id}">${cat.name}</option>`;
        categorySelect.innerHTML += option;
        editCategorySelect.innerHTML += option;
    });
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    const button = e.target.querySelector('button[type="submit"]');
    toggleButtonLoading(button, true);
    const formData = new FormData(categoryForm);
    const categoryData = {
        name: formData.get('name'),
        display_order: parseInt(formData.get('display_order'), 10)
    };
    try {
        await apiFetch("/categories", { method: "POST", body: JSON.stringify(categoryData) });
        alert(`Categoria "${categoryData.name}" adicionada com sucesso!`);
        categoryForm.reset();
        loadCategories(); // Recarrega a lista
    } catch (error) {
        alert(`Erro ao adicionar categoria: ${error.message}`);
    } finally {
        toggleButtonLoading(button, false);
    }
  };

  const handleDeleteCategory = async (categoryId, categoryName) => {
    if (!confirm(`Tem certeza de que deseja apagar a categoria "${categoryName}"?\n\nOs produtos nesta categoria não serão apagados, mas ficarão sem categoria.`)) {
        return;
    }
    try {
        await apiFetch(`/categories/${categoryId}`, { method: "DELETE" });
        alert("Categoria apagada com sucesso!");
        loadCategories();
        loadProducts(); // Recarrega os produtos pois podem ter ficado sem categoria
    } catch (error) {
        alert(`Erro ao apagar categoria: ${error.message}`);
    }
  };

  // =================================================================================
  // GESTÃO DE PEDIDOS
  // =================================================================================
  const loadOrders = async () => {
    try {
      const orders = await apiFetch("/admin-orders");
      renderOrderList(orders);
    } catch (error) {
      orderListDiv.innerHTML = `<p class="text-red-500">Erro ao carregar pedidos: ${error.message}</p>`;
    }
  };

  const renderOrderList = (orders) => {
    if (!orders || orders.length === 0) {
      orderListDiv.innerHTML = "<p>Nenhum pedido registado encontrado.</p>";
      return;
    }
    const statusOptions = ['Recebido', 'Em preparação', 'A caminho', 'Entregue', 'Cancelado'];
    orderListDiv.innerHTML = orders.map(order => `
      <div class="bg-white p-6 rounded-xl shadow-md border-l-8 border-yellow-500">
        <div class="flex flex-wrap justify-between items-start mb-4">
          <div>
            <p class="font-bold text-red-800 text-lg">${order.user_name || "Cliente não registado"} (${order.user_phone || "N/A"})</p>
            <p class="text-sm text-gray-500">Pedido #${order.id.substring(0, 8).toUpperCase()}</p>
            <p class="text-sm text-gray-500">${new Date(order.created_at).toLocaleString("pt-BR")}</p>
          </div>
          <div class="text-right">
            <p class="font-display text-2xl text-red-900">R$ ${parseFloat(order.total).toFixed(2).replace(".", ",")}</p>
             <div class="mt-2">
                <select data-order-id="${order.id}" class="order-status-select form-input !py-1 !px-2 !text-sm">
                    ${statusOptions.map(s => `<option value="${s}" ${order.status === s ? 'selected' : ''}>${s}</option>`).join('')}
                </select>
            </div>
          </div>
        </div>
        <div class="mb-4">
          <h4 class="font-bold text-red-800 mb-2">Endereço:</h4>
          <p class="text-gray-700 bg-gray-50 p-3 rounded-md">${order.address}</p>
        </div>
        <div>
          <h4 class="font-bold text-red-800 mb-2">Itens:</h4>
          <ul class="list-disc list-inside space-y-1 text-gray-700">
            ${order.items.map(item => `<li>${item.quantity}x ${item.name}</li>`).join("")}
          </ul>
        </div>
      </div>
    `).join("");
  };

  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
        await apiFetch(`/admin-orders/${orderId}`, {
            method: 'PUT',
            body: JSON.stringify({ status: newStatus })
        });
        alert(`Status do pedido #${orderId.substring(0, 8)} atualizado para "${newStatus}"!`);
        // Opcional: pode recarregar a lista ou apenas atualizar a UI visualmente
    } catch (error) {
        alert(`Erro ao atualizar status do pedido: ${error.message}`);
        loadOrders(); // Recarrega para reverter a mudança visual no dropdown
    }
  };

  // =================================================================================
  // GESTÃO DE PRODUTOS
  // =================================================================================
  const loadProducts = async () => {
    try {
      const productsByCategory = await apiFetch("/products");
      allProducts = Object.values(productsByCategory).flat();
      renderProductList(allProducts);
    } catch (error) {
      productListDiv.innerHTML = `<p class="text-red-500">Erro ao carregar produtos: ${error.message}</p>`;
    }
  };

  const renderProductList = (products) => {
     if (!products || products.length === 0) {
        productListDiv.innerHTML = "<p>Nenhum produto cadastrado.</p>";
        return;
      }
    productListDiv.innerHTML = products.map((product) => `
      <div class="bg-white p-4 rounded-lg shadow flex flex-col">
        <img src="${product.image.replace('/upload/', '/upload/q_auto,f_auto,w_400/')}" alt="${product.name}" class="w-full h-32 object-cover rounded-md mb-4">
        <div class="flex-grow">
          <h3 class="font-bold text-lg text-red-800">${product.name}</h3>
          <p class="text-sm text-gray-600">${product.category_name || "Sem Categoria"}</p>
          <p class="font-display text-xl text-red-900 mt-2">R$ ${parseFloat(product.price).toFixed(2).replace(".", ",")}</p>
          ${product.promo ? '<span class="text-xs bg-red-500 text-white font-bold py-1 px-2 rounded-full">PROMO</span>' : ""}
        </div>
        <div class="mt-4 pt-4 border-t flex justify-end gap-2">
          <button class="edit-btn text-blue-600 hover:text-blue-800 font-bold py-1 px-3 rounded" data-id="${product.id}"><i class="fas fa-edit mr-1"></i> Editar</button>
          <button class="delete-btn text-red-600 hover:text-red-800 font-bold py-1 px-3 rounded" data-id="${product.id}"><i class="fas fa-trash mr-1"></i> Desativar</button>
        </div>
      </div>`).join("");
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    const button = e.target.querySelector('button[type="submit"]');
    if (!imageUrlInput.value) {
      alert("Por favor, aguarde o upload da imagem ser concluído.");
      return;
    }
    toggleButtonLoading(button, true);
    const formData = new FormData(productForm);
    const productData = {
        name: formData.get('name'),
        description: formData.get('description'),
        price: parseFloat(formData.get('price')),
        oldPrice: formData.get('oldPrice') ? parseFloat(formData.get('oldPrice')) : null,
        image: formData.get('image'),
        category_id: formData.get('category_id'),
        promo: productForm.querySelector("#promo").checked
    };
    
    try {
      await apiFetch("/products", { method: "POST", body: JSON.stringify(productData) });
      alert(`Produto "${productData.name}" adicionado com sucesso!`);
      productForm.reset();
      imageUrlInput.value = "";
      imagePreview.src = "";
      imagePreview.classList.add("hidden");
      imageUploadPlaceholder.classList.remove("hidden");
      uploadProgressContainer.classList.add("hidden");
      loadProducts();
    } catch (error) {
      alert(`Erro ao adicionar produto: ${error.message}`);
    } finally {
        toggleButtonLoading(button, false);
    }
  };

  const handleEditProduct = async (e) => {
    e.preventDefault();
    const button = e.target.querySelector('button[type="submit"]');
    if (!editImageUrlInput.value) {
      alert("A imagem do produto é obrigatória. Aguarde o upload ser concluído.");
      return;
    }
    toggleButtonLoading(button, true);

    const id = document.getElementById("edit-product-id").value;
    const formData = new FormData(editProductForm);
    const productData = {
        name: formData.get('name'),
        description: formData.get('description'),
        price: parseFloat(formData.get('price')),
        oldPrice: formData.get('oldPrice') ? parseFloat(formData.get('oldPrice')) : null,
        image: formData.get('image'),
        category_id: formData.get('category_id'),
        promo: editProductForm.querySelector("#edit-promo").checked
    };

    try {
      await apiFetch(`/products/${id}`, { method: "PUT", body: JSON.stringify(productData) });
      alert(`Produto "${productData.name}" atualizado com sucesso!`);
      toggleModal("edit-modal", false);
      loadProducts();
    } catch (error) {
      alert(`Erro ao atualizar produto: ${error.message}`);
    } finally {
        toggleButtonLoading(button, false);
    }
  };

  const handleDeleteProduct = async (productId) => {
    const product = allProducts.find((p) => p.id === productId);
    if (!product || !confirm(`Tem certeza de que deseja DESATIVAR o produto "${product.name}"?\n\nEle não aparecerá mais no cardápio, mas continuará no histórico de pedidos.`)) {
      return;
    }
    try {
      await apiFetch(`/products/${productId}`, { method: "DELETE" });
      alert("Produto desativado com sucesso!");
      loadProducts();
    } catch (error) {
      alert(`Erro ao desativar produto: ${error.message}`);
    }
  };

  // =================================================================================
  // FUNÇÕES DE UPLOAD DE IMAGEM
  // =================================================================================
  const handleImageUpload = async (file, elements) => {
    const { preview, urlInput, progressContainer, progressBar, placeholder } = elements;
    
    urlInput.value = "";
    const reader = new FileReader();
    reader.onload = e => {
      preview.src = e.target.result;
      preview.classList.remove("hidden");
      if (placeholder) placeholder.classList.add("hidden");
    };
    reader.readAsDataURL(file);

    try {
      const { signature, timestamp, api_key } = await apiFetch("/upload-signature");
      const formData = new FormData();
      formData.append("file", file);
      formData.append("api_key", api_key);
      formData.append("timestamp", timestamp);
      formData.append("signature", signature);
      formData.append("folder", "tocomfome-vr-produtos");

      progressContainer.classList.remove("hidden");
      progressBar.style.width = "0%";
      progressBar.textContent = "0%";
      
      const xhr = new XMLHttpRequest();
      xhr.open("POST", CLOUDINARY_UPLOAD_URL, true);
      xhr.upload.onprogress = e => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          progressBar.style.width = `${percent}%`;
          progressBar.textContent = `${percent}%`;
        }
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          urlInput.value = JSON.parse(xhr.responseText).secure_url;
        } else {
          throw new Error(JSON.parse(xhr.responseText).error.message);
        }
      };
      xhr.onerror = () => { throw new Error("Erro de rede durante o upload."); };
      xhr.send(formData);
    } catch (error) {
      alert(`Erro no upload: ${error.message}`);
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
    const product = allProducts.find((p) => p.id === productId);
    if (!product) return;
    
    // Encontra o category_id a partir do category_name
    const category = allCategories.find(c => c.name === product.category_name);

    document.getElementById("edit-product-id").value = product.id;
    document.getElementById("edit-name").value = product.name;
    document.getElementById("edit-category").value = category ? category.id : "";
    document.getElementById("edit-price").value = product.price;
    document.getElementById("edit-oldPrice").value = product.oldPrice || "";
    document.getElementById("edit-description").value = product.description;
    document.getElementById("edit-promo").checked = product.promo;
    editImageUrlInput.value = product.image;
    editImagePreview.src = product.image;
    editImagePreview.classList.remove("hidden");
    editUploadProgressContainer.classList.add("hidden");

    toggleModal("edit-modal", true);
  };

  // =================================================================================
  // EVENT LISTENERS
  // =================================================================================
  logoutBtn.addEventListener("click", logout);
  
  // Navegação por Tabs
  adminTabs.addEventListener('click', (e) => {
    const tabButton = e.target.closest('.tab-btn');
    if (tabButton) {
        switchTab(tabButton.dataset.tab);
    }
  });

  // Formulários
  productForm.addEventListener("submit", handleAddProduct);
  editProductForm.addEventListener("submit", handleEditProduct);
  categoryForm.addEventListener("submit", handleAddCategory);

  // Modais
  closeEditModalBtn.addEventListener("click", () => toggleModal("edit-modal", false));
  modalBackdrop.addEventListener("click", () => toggleModal("edit-modal", false));

  // Delegação de eventos para botões de apagar/editar
  productListDiv.addEventListener("click", (e) => {
    const editBtn = e.target.closest(".edit-btn");
    const deleteBtn = e.target.closest(".delete-btn");
    if (editBtn) openEditModal(editBtn.dataset.id);
    if (deleteBtn) handleDeleteProduct(deleteBtn.dataset.id);
  });
  categoryListDiv.addEventListener("click", (e) => {
    const deleteBtn = e.target.closest(".delete-category-btn");
    if(deleteBtn) handleDeleteCategory(deleteBtn.dataset.id, deleteBtn.dataset.name);
  });
  orderListDiv.addEventListener('change', (e) => {
    const statusSelect = e.target.closest('.order-status-select');
    if (statusSelect) {
        handleUpdateOrderStatus(statusSelect.dataset.orderId, statusSelect.value);
    }
  });

  // Upload de Imagem
  fileUploadInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) handleImageUpload(file, {
        preview: imagePreview, urlInput: imageUrlInput, progressContainer: uploadProgressContainer,
        progressBar: uploadProgressBar, placeholder: imageUploadPlaceholder
    });
  });
  editFileUploadInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) handleImageUpload(file, {
          preview: editImagePreview, urlInput: editImageUrlInput, progressContainer: editUploadProgressContainer,
          progressBar: editUploadProgressBar, placeholder: null
      });
  });

  // INICIA A APLICAÇÃO
  checkAdminAuth();
});
