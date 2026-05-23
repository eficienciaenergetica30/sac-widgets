(function () {
  let template = document.createElement("template");
  template.innerHTML = `<style>:host { display: none; }</style>`;

  class SACRickAndMorty extends HTMLElement {
    constructor() {
      super();
      this._shadowRoot = this.attachShadow({ mode: "open" });
      this._shadowRoot.appendChild(template.content.cloneNode(true));
      
      // Propiedad donde guardaremos el JSON como texto para SAC
      this._apiResponseString = "";
    }

    // Getter para que SAC pueda leer el resultado
    get apiResponseString() {
      return this._apiResponseString;
    }

    async obtenerPersonajes() {
      const url = "https://rickandmortyapi.com/api/character";
      try {
        const respuesta = await fetch(url);
        const data = await respuesta.json();
        
        // Tomamos el primer personaje de la lista
        const primerPersonaje = data.results[0]; 

        // Creamos un objeto limpio con lo que nos interesa
        const datosFiltrados = {
          nombre: primerPersonaje.name,
          estado: primerPersonaje.status,
          especie: primerPersonaje.species
        };

        // Lo convertimos a String para que SAC lo pueda recibir
        this._apiResponseString = JSON.stringify(datosFiltrados);
        
        // Le avisamos a SAC que los datos están listos
        this.dispatchEvent(new CustomEvent("onDataReady", { detail: { void: true } }));

      } catch (error) {
        console.error("Error en la API:", error);
      }
    }
  }
  customElements.define("com-empresa-rickandmorty", SACRickAndMorty);
})();
