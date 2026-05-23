(function () {
  let template = document.createElement("template");
  template.innerHTML = `<style>:host { display: none; }</style>`;

  class SACRickAndMorty extends HTMLElement {
    constructor() {
      super();
      this._shadowRoot = this.attachShadow({ mode: "open" });
      this._shadowRoot.appendChild(template.content.cloneNode(true));
    }

    async obtenerPersonajes() {
      const url = "https://rickandmortyapi.com/api/character";
      try {
        const respuesta = await fetch(url);
        const data = await respuesta.json();
        
        const primerPersonaje = data.results[0]; 

        const datosFiltrados = {
          nombre: primerPersonaje.name,
          estado: primerPersonaje.status,
          especie: primerPersonaje.species
        };

        // PASO CLAVE: Mandamos el JSON como un parámetro llamado apiResponse
        this.dispatchEvent(new CustomEvent("onDataReady", { 
          detail: { 
            apiResponse: JSON.stringify(datosFiltrados) 
          } 
        }));

      } catch (error) {
        console.error("Error en la API:", error);
      }
    }
  }
  customElements.define("com-empresa-rickandmorty", SACRickAndMorty);
})();
