(function () {
  let template = document.createElement("template");
  template.innerHTML = `<style>:host { display: none; }</style>`;

  class SACRickAndMorty extends HTMLElement {
    constructor() {
      super();
      this._shadowRoot = this.attachShadow({ mode: "open" });
      this._shadowRoot.appendChild(template.content.cloneNode(true));
      
      // Variable interna para guardar los datos temporalmente
      this._apiResponseString = "";
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

        // Guardamos el JSON en la variable interna
        this._apiResponseString = JSON.stringify(datosFiltrados);
        
        // Disparamos el evento limpio, totalmente sin parámetros
        this.dispatchEvent(new CustomEvent("onDataReady"));

      } catch (error) {
        console.error("Error en la API:", error);
      }
    }

    // NUEVO MÉTODO: SAC llamará a esta función para obtener el texto
    getApiResponse() {
      return this._apiResponseString;
    }
  }
  customElements.define("com-empresa-rickandmorty", SACRickAndMorty);
})();
