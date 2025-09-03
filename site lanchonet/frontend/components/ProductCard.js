class ProductCard extends HTMLElement {
  constructor() {
    super();
    // Ativa o Shadow DOM para encapsular o estilo e a estrutura do componente
    this.attachShadow({ mode: "open" });
  }

  // Chamado quando o elemento é adicionado ao DOM
  connectedCallback() {
    this.render();
    this.attachEventListeners();
  }

  render() {
    // Coleta os atributos do HTML (ex: <product-card name="..." price="..."></product-card>)
    const name = this.getAttribute("name");
    const price = parseFloat(this.getAttribute("price")).toFixed(2);
    const oldPrice = this.getAttribute("oldPrice");
    const promo = this.getAttribute("promo") === "true";
    const description = this.getAttribute("description");
    const img = this.getAttribute("img");
    const placeholderUrl = `https://placehold.co/400x200/fff8e1/b91c1c?text=Ops!+Imagem+não+encontrada`;

    // Define o HTML e o CSS internos do componente
    this.shadowRoot.innerHTML = `
      <style>
        :host { 
          display: block; 
          animation: fadeIn 0.5s ease-out forwards;
          opacity: 0;
        }
        .card { 
          transition: transform 0.3s ease, box-shadow 0.3s ease; 
          border-radius: 1.5rem; 
          box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05);
          background: #fff; 
          border: 4px solid #facc15; 
          overflow: hidden; 
          position: relative; 
          display: flex; 
          flex-direction: column; 
          height: 100%; 
        }
        .card:hover, .card:focus-within { 
          transform: translateY(-10px); 
          box-shadow: 0 20px 25px -5px rgba(220, 38, 38, 0.3), 0 10px 10px -5px rgba(220, 38, 38, 0.2);
        }
        .card-img-wrapper {
          overflow: hidden;
        }
        .card-img { 
          width: 100%; 
          height: 200px; 
          object-fit: cover;
          transition: transform 0.4s ease;
        }
        .card:hover .card-img, .card:focus-within .card-img {
          transform: scale(1.1);
        }
        .card-body { 
          padding: 1.25rem; 
          flex-grow: 1; 
          display: flex; 
          flex-direction: column; 
          background-color: #fefce8;
        }
        .card-title { 
          font-family: 'Fredoka One', cursive; 
          font-size: 1.3rem; 
          color: #b91c1c; 
          margin-bottom: 0.5rem; 
          min-height: 3.2rem; /* Garante alinhamento */
        }
        .card-description { 
          font-size: 0.9rem; 
          color: #9a3412; 
          margin-bottom: 1rem; 
          flex-grow: 1;
        }
        .price-section { 
          display: flex; 
          align-items: baseline; 
          margin-bottom: 1rem; 
        }
        .price-current { 
          font-size: 1.75rem; 
          font-weight: 700; 
          color: #9a3412; 
          font-family: 'Fredoka One', cursive; 
        }
        .price-old { 
          text-decoration: line-through; 
          color: #9ca3af; 
          font-size: 1rem; 
          margin-left: 0.5rem; 
        }
        .add-btn { 
          background-color: #facc15; 
          color: #7f1d1d; 
          font-family: 'Fredoka One', cursive; 
          padding: 0.75rem 1.5rem; 
          border-radius: 9999px; 
          border: 3px solid #7f1d1d;
          font-weight: 700; 
          cursor: pointer; 
          transition: all 0.2s ease; 
          width: 100%; 
          text-transform: uppercase;
          box-shadow: 0 4px 0 #f59e0b;
        }
        .add-btn:hover, .add-btn:focus { 
          background-color: #f59e0b; 
          transform: translateY(-2px);
          box-shadow: 0 6px 0 #f59e0b;
          outline: 2px solid white;
        }
        .add-btn:active {
          transform: translateY(2px);
          box-shadow: 0 2px 0 #f59e0b;
        }
        .promo-badge { 
          position: absolute; 
          top: 1rem; 
          right: -10px; 
          background: #dc2626; 
          color: #fefce8; 
          font-weight: 700; 
          font-size: 0.8rem; 
          padding: 5px 15px; 
          text-transform: uppercase; 
          font-family: 'Fredoka One', cursive; 
          box-shadow: 0 4px 6px rgba(0,0,0,0.2); 
          transform: rotate(15deg); 
          border: 2px solid #fefce8;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      </style>
      <div class="card">
        ${promo ? '<span class="promo-badge">Promo!</span>' : ""}
        <div class="card-img-wrapper">
            <img src="${img}" alt="${name}" class="card-img" onerror="this.onerror=null;this.src='${placeholderUrl}';">
        </div>
        <div class="card-body">
          <h3 class="card-title">${name}</h3>
          ${description ? `<p class="card-description">${description}</p>` : ""}
          <div class="price-section">
            <span class="price-current">R$ ${price.replace(".", ",")}</span>
            ${
              oldPrice
                ? `<span class="price-old">R$ ${parseFloat(oldPrice)
                    .toFixed(2)
                    .replace(".", ",")}</span>`
                : ""
            }
          </div>
          <button class="add-btn" aria-label="Adicionar ${name} ao carrinho por R$ ${price.replace(
      ".",
      ","
    )}">Adicionar</button>
        </div>
      </div>
    `;
  }

  attachEventListeners() {
    // Adiciona o listener de clique ao botão "Adicionar"
    this.shadowRoot.querySelector(".add-btn").addEventListener("click", () => {
      // Dispara um evento customizado que o `app.js` pode "ouvir"
      this.dispatchEvent(
        new CustomEvent("addToCart", {
          bubbles: true, // Permite que o evento "suba" na árvore do DOM
          composed: true, // Permite que o evento cruze a barreira do Shadow DOM
          detail: {
            // Os dados que queremos enviar junto com o evento
            id: this.getAttribute("id"),
            name: this.getAttribute("name"),
            price: parseFloat(this.getAttribute("price")),
          },
        })
      );
    });
  }
}

// Define o novo elemento customizado <product-card>
customElements.define("product-card", ProductCard);
