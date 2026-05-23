(function () {
  let template = document.createElement("template");
  template.innerHTML = `<style>:host { display: none; }</style>`;

  class SACRickAndMorty extends HTMLElement {
    constructor() {
      super();
      this._shadowRoot = this.attachShadow({ mode: "open" });
      this._shadowRoot.appendChild(template.content.cloneNode(true));
      this._apiResponseString = "";
    }

    async obtenerPersonajes() {
      // COMENTARIO DE CONTROL: v1.0.5-FINAL
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

        this._apiResponseString = JSON.stringify(datosFiltrados);
        this.dispatchEvent(new CustomEvent("onDataReady"));

      } catch (error) {
        console.error("Error en la API:", error);
      }
    }

    // Asegúrate de que esta función exista exactamente aquí, antes de cerrar la clase
    getApiResponse() {
      return this._apiResponseString;
    }
  }
  customElements.define("com-empresa-rickandmorty", SACRickAndMorty);
})();
