document.addEventListener("DOMContentLoaded", () => {
  // =================================================================================
  // CONFIGURAÇÃO E VARIÁVEIS GLOBAIS
  // =================================================================================
  const API_URL = "/api";
  // IMPORTANTE: Verifique se este nome é IDÊNTICO ao do seu painel Cloudinary (maiúsculas/minúsculas).
  const CLOUDINARY_CLOUD_NAME = "root"; // INSIRA SEU CLOUD NAME EXATO AQUI
  const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

  let token = null;
  let allProducts = [];

  // =================================================================================
  // SELETORES DE ELEMENTOS DO DOM
  // =================================================================================
  const adminProfileDiv = document.getElementById("admin-profile");
  const adminNameSpan = document.getElementById("admin-name");
  const logoutBtn = document.getElementById("logout-btn");
  const productForm = document.getElementById("product-form");
  const productListDiv = document.getElementById("product-list");
  const orderListDiv = document.getElementById("order-list");

  const imageUrlInput = document.getElementById("image-url");
  const fileUploadInput = document.getElementById("file-upload");
  const imagePreview = document.getElementById("image-preview");
  const imageUploadPlaceholder = document.getElementById("image-upload-placeholder");
  const uploadProgressContainer = document.getElementById("upload-progress-container");
  const uploadProgressBar = document.getElementById("upload-progress-bar");

  const modalBackdrop = document.getElementById("modal-backdrop");
  const editModal = document.getElementById("edit-modal");
  const closeEditModalBtn = document.getElementById("close-edit-modal-btn");
  const editProductForm = document.getElementById("edit-product-form");
  const editImageUrlInput = document.getElementById("edit-image-url");
  const editFileUploadInput = document.getElementById("edit-file-upload");
  const editImagePreview = document.getElementById("edit-image-preview");
  const editUploadProgressContainer = document.getElementById("edit-upload-progress-container");
  const editUploadProgressBar = document.getElementById("edit-upload-progress-bar");

  // =================================================================================
  // FUNÇÕES DE API E AUTENTICAÇÃO
  // =================================================================================
  const apiFetch = async (endpoint, options = {}) => {
    const headers = { "Content-Type": "application/json", ...options.headers };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    const response = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
    if (response.status === 204 || response.headers.get("content-length") === "0") {
      return;
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
      loadOrders();
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
  // FUNÇÕES DE UPLOAD DE IMAGEM
  // =================================================================================
  const handleImageUpload = async (file, elements) => {
    const { preview, urlInput, progressContainer, progressBar, placeholder } = elements;
    
    urlInput.value = ""; // Limpa a URL anterior
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

      xhr.upload.onprogress = event => {
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded / event.total) * 100);
          progressBar.style.width = `${percentComplete}%`;
          progressBar.textContent = `${percentComplete}%`;
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const response = JSON.parse(xhr.responseText);
          urlInput.value = response.secure_url;
        } else {
          // Erro após o upload ter chegado a 100%
          const errorResponse = JSON.parse(xhr.responseText);
          throw new Error(`O Cloudinary respondeu com um erro: ${errorResponse.error.message}. Verifique o seu Cloud Name e as credenciais.`);
        }
      };
      
      xhr.onerror = () => { throw new Error("Erro de rede durante o upload."); };
      
      xhr.send(formData);

    } catch (error) {
      alert(`Erro no upload da imagem: ${error.message}`);
      preview.src = "";
      preview.classList.add("hidden");
      if (placeholder) placeholder.classList.remove("hidden");
      progressContainer.classList.add("hidden");
      urlInput.value = "";
    }
  };

  // =================================================================================
  // FUNÇÕES DE GESTÃO DE PEDIDOS
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
    // CORRIGIDO: O código de renderização que faltava.
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
            ${order.reward_applied ? '<span class="text-xs bg-green-500 text-white font-bold py-1 px-2 rounded-full mt-1 inline-block">PRÉMIO USADO</span>' : ""}
          </div>
        </div>
        <div class="mb-4">
          <h4 class="font-bold text-red-800 mb-2">Endereço:</h4>
          <p class="text-gray-700 bg-gray-50 p-3 rounded-md">${order.address}</p>
        </div>
        <div>
          <h4 class="font-bold text-red-800 mb-2">Itens do Pedido:</h4>
          <ul class="list-disc list-inside space-y-1 text-gray-700">
            ${order.items.map(item => `<li>${item.quantity}x ${item.name} (R$ ${parseFloat(item.price).toFixed(2).replace(".", ",")})</li>`).join("")}
          </ul>
        </div>
      </div>
    `).join("");
  };

  // =================================================================================
  // FUNÇÕES DE GESTÃO DE PRODUTOS
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
    productListDiv.innerHTML = "";
    products.forEach((product) => {
      const productCard = document.createElement("div");
      productCard.className = "bg-white p-4 rounded-lg shadow flex flex-col";
      productCard.innerHTML = `
        <img src="${product.image}" alt="${product.name}" class="w-full h-32 object-cover rounded-md mb-4">
        <div class="flex-grow">
          <h3 class="font-bold text-lg text-red-800">${product.name}</h3>
          <p class="text-sm text-gray-600">${product.category}</p>
          <p class="font-display text-xl text-red-900 mt-2">R$ ${parseFloat(product.price).toFixed(2).replace(".", ",")}</p>
          ${product.promo ? '<span class="text-xs bg-red-500 text-white font-bold py-1 px-2 rounded-full">PROMO</span>' : ""}
        </div>
        <div class="mt-4 pt-4 border-t flex justify-end gap-2">
          <button class="edit-btn text-blue-600 hover:text-blue-800 font-bold py-1 px-3 rounded" data-id="${product.id}"><i class="fas fa-edit mr-1"></i> Editar</button>
          <button class="delete-btn text-red-600 hover:text-red-800 font-bold py-1 px-3 rounded" data-id="${product.id}"><i class="fas fa-trash mr-1"></i> Apagar</button>
        </div>`;
      productListDiv.appendChild(productCard);
    });
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    if (!imageUrlInput.value) {
      alert("Por favor, aguarde o upload da imagem ser concluído.");
      return;
    }
    const formData = new FormData(productForm);
    const productData = Object.fromEntries(formData.entries());
    productData.price = parseFloat(productData.price);
    productData.oldPrice = productData.oldPrice ? parseFloat(productData.oldPrice) : null;
    productData.promo = productForm.querySelector("#promo").checked;
    
    try {
      const createdProduct = await apiFetch("/products", { method: "POST", body: JSON.stringify(productData) });
      alert(`Produto "${createdProduct.name}" adicionado com sucesso!`);
      productForm.reset();
      imageUrlInput.value = "";
      imagePreview.src = "";
      imagePreview.classList.add("hidden");
      imageUploadPlaceholder.classList.remove("hidden");
      uploadProgressContainer.classList.add("hidden");
      loadProducts();
    } catch (error) {
      alert(`Erro ao adicionar produto: ${error.message}`);
    }
  };

  const handleEditProduct = async (e) => {
    e.preventDefault();
    if (!editImageUrlInput.value) {
      alert("A imagem do produto é obrigatória. Aguarde o upload ser concluído.");
      return;
    }
    const id = document.getElementById("edit-product-id").value;
    const formData = new FormData(editProductForm);
    const productData = Object.fromEntries(formData.entries());
    productData.price = parseFloat(productData.price);
    productData.oldPrice = productData.oldPrice ? parseFloat(productData.oldPrice) : null;
    productData.promo = editProductForm.querySelector("#edit-promo").checked;

    try {
      const updatedProduct = await apiFetch(`/products/${id}`, { method: "PUT", body: JSON.stringify(productData) });
      alert(`Produto "${updatedProduct.name}" atualizado com sucesso!`);
      toggleModal("edit-modal", false);
      loadProducts();
    } catch (error) {
      alert(`Erro ao atualizar produto: ${error.message}`);
    }
  };

  const handleDeleteProduct = async (productId) => {
    const product = allProducts.find((p) => p.id === productId);
    if (!product || !confirm(`Tem certeza de que deseja apagar o produto "${product.name}"?`)) {
      return;
    }
    try {
      await apiFetch(`/products/${productId}`, { method: "DELETE" });
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
    const product = allProducts.find((p) => p.id === productId);
    if (!product) return;
    document.getElementById("edit-product-id").value = product.id;
    document.getElementById("edit-name").value = product.name;
    document.getElementById("edit-category").value = product.category;
    document.getElementById("edit-price").value = product.price;
    document.getElementById("edit-oldPrice").value = product.oldPrice || "";
    document.getElementById("edit-description").value = product.description;
    document.getElementById("edit-promo").checked = product.promo;
    
    editImageUrlInput.value = product.image;
    editImagePreview.src = product.image;
    editImagePreview.classList.remove("hidden");
    
    editUploadProgressContainer.classList.add("hidden");
    editUploadProgressBar.style.width = '0%';
    editUploadProgressBar.textContent = '0%';

    toggleModal("edit-modal", true);
  };

  // =================================================================================
  // INICIALIZAÇÃO E EVENT LISTENERS
  // =================================================================================
  logoutBtn.addEventListener("click", logout);
  productForm.addEventListener("submit", handleAddProduct);
  editProductForm.addEventListener("submit", handleEditProduct);

  closeEditModalBtn.addEventListener("click", () => toggleModal("edit-modal", false));
  modalBackdrop.addEventListener("click", () => toggleModal("edit-modal", false));

  productListDiv.addEventListener("click", (e) => {
    const editButton = e.target.closest(".edit-btn");
    const deleteButton = e.target.closest(".delete-btn");
    if (editButton) {
      openEditModal(editButton.dataset.id);
    } else if (deleteButton) {
      handleDeleteProduct(deleteButton.dataset.id);
    }
  });

  fileUploadInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
      handleImageUpload(file, {
          preview: imagePreview,
          urlInput: imageUrlInput,
          progressContainer: uploadProgressContainer,
          progressBar: uploadProgressBar,
          placeholder: imageUploadPlaceholder,
      });
    }
  });

  editFileUploadInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) {
          handleImageUpload(file, {
              preview: editImagePreview,
              urlInput: editImageUrlInput,
              progressContainer: editUploadProgressContainer,
              progressBar: editUploadProgressBar,
              placeholder: null,
          });
      }
  });

  checkAdminAuth();
});
