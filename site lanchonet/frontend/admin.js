document.addEventListener("DOMContentLoaded", () => {
  // =================================================================================
  // CONFIGURAÇÃO E VARIÁVEIS GLOBAIS
  // =================================================================================
  const API_URL = "/api";
  const CLOUDINARY_CLOUD_NAME = "Root";
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

  // Seletores do formulário de Adicionar Produto
  const imageUrlInput = document.getElementById("image-url");
  const fileUploadInput = document.getElementById("file-upload");
  const imagePreview = document.getElementById("image-preview");
  const imageUploadPlaceholder = document.getElementById("image-upload-placeholder");
  const uploadProgressContainer = document.getElementById("upload-progress-container");
  const uploadProgressBar = document.getElementById("upload-progress-bar");

  // Seletores do Modal de Edição
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
  // FUNÇÕES DE UPLOAD DE IMAGEM (NOVO)
  // =================================================================================

  const handleImageUpload = async (file, elements) => {
    const { preview, urlInput, progressContainer, progressBar } = elements;

    // 1. Exibir preview local
    const reader = new FileReader();
    reader.onload = (e) => {
      preview.src = e.target.result;
      preview.classList.remove("hidden");
      if (imageUploadPlaceholder) imageUploadPlaceholder.classList.add("hidden");
    };
    reader.readAsDataURL(file);

    // 2. Obter assinatura do backend
    try {
      const { signature, timestamp, api_key } = await apiFetch("/upload-signature");
      
      // 3. Enviar imagem para o Cloudinary
      const formData = new FormData();
      formData.append("file", file);
      formData.append("api_key", api_key);
      formData.append("timestamp", timestamp);
      formData.append("signature", signature);
      formData.append("folder", "tocomfome-vr-produtos");

      progressContainer.classList.remove("hidden");

      const xhr = new XMLHttpRequest();
      xhr.open("POST", CLOUDINARY_UPLOAD_URL, true);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded / event.total) * 100);
          progressBar.style.width = `${percentComplete}%`;
          progressBar.textContent = `${percentComplete}%`;
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText);
          urlInput.value = response.secure_url; // Guarda a URL segura no input escondido
          alert("Upload da imagem concluído com sucesso!");
        } else {
          throw new Error("Falha no upload para o Cloudinary.");
        }
      };
      
      xhr.onerror = () => { throw new Error("Erro de rede durante o upload."); };
      
      xhr.send(formData);

    } catch (error) {
      alert(`Erro no upload da imagem: ${error.message}`);
      // Reset UI
      preview.classList.add("hidden");
      if (imageUploadPlaceholder) imageUploadPlaceholder.classList.remove("hidden");
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
    if (orders.length === 0) {
      orderListDiv.innerHTML = "<p>Nenhum pedido registado encontrado.</p>";
      return;
    }
    orderListDiv.innerHTML = orders.map((order) => `...`).join(""); // Código omitido para brevidade, igual ao anterior
  };

  // =================================================================================
  // FUNÇÕES DE GESTÃO DE PRODUTOS
  // =================================================================================
  const loadProducts = async () => { /* ... igual ao anterior ... */ };
  const renderProductList = (products) => { /* ... igual ao anterior ... */ };

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
      const createdProduct = await apiFetch("/products", {
        method: "POST",
        body: JSON.stringify(productData),
      });
      alert(`Produto "${createdProduct.name}" adicionado com sucesso!`);
      productForm.reset();
      // Reset do campo de imagem
      imagePreview.classList.add("hidden");
      imageUploadPlaceholder.classList.remove("hidden");
      uploadProgressContainer.classList.add("hidden");

    } catch (error) {
      alert(`Erro ao adicionar produto: ${error.message}`);
    }
  };

  const handleEditProduct = async (e) => {
    e.preventDefault();
     if (!editImageUrlInput.value) {
      alert("Por favor, selecione uma imagem ou aguarde o upload ser concluído.");
      return;
    }
    const id = document.getElementById("edit-product-id").value;
    const formData = new FormData(editProductForm);
    const productData = Object.fromEntries(formData.entries());
    productData.price = parseFloat(productData.price);
    productData.oldPrice = productData.oldPrice ? parseFloat(productData.oldPrice) : null;
    productData.promo = editProductForm.querySelector("#edit-promo").checked;

    try {
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

  const handleDeleteProduct = async (productId) => { /* ... igual ao anterior ... */ };
  const toggleModal = (modalId, show) => { /* ... igual ao anterior ... */ };

  const openEditModal = (productId) => {
    const product = allProducts.find((p) => p.id === productId);
    if (!product) return;
    document.getElementById("edit-product-id").value = product.id;
    document.getElementById("edit-name").value = product.name;
    //... (preenchimento dos outros campos igual ao anterior)
    
    // Preenche a imagem
    editImageUrlInput.value = product.image;
    editImagePreview.src = product.image;
    editImagePreview.classList.remove("hidden");
    
    // Reset da barra de progresso do modal
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

  productListDiv.addEventListener("click", (e) => { /* ... igual ao anterior ... */ });

  // Event Listeners para Upload de Imagem
  fileUploadInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
      handleImageUpload(file, {
          preview: imagePreview,
          urlInput: imageUrlInput,
          progressContainer: uploadProgressContainer,
          progressBar: uploadProgressBar,
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
          });
      }
  });


  checkAdminAuth();
});

