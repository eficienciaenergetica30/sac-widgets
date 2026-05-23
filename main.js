(function () {
  let template = document.createElement("template");
  template.innerHTML = `<style>:host { display: none; }</style>`;

  class SACRickAndMorty extends HTMLElement {
    constructor() {
      super();
      this._shadowRoot = this.attachShadow({ mode: "open" });
      this._shadowRoot.appendChild(template.content.cloneNode(true));
      
      // Variables individuales limpias para SAC
      this._nombre = "";
      this._estado = "";
      this._especie = "";
    }

    async obtenerPersonajes() {
      const url = "https://rickandmortyapi.com/api/character";
      try {
        const respuesta = await fetch(url);
        const data = await respuesta.json();
        const primerPersonaje = data.results[0]; 
        
        // Guardamos los datos limpios en texto plano
        this._nombre = primerPersonaje.name;
        this._estado = primerPersonaje.status;
        this._especie = primerPersonaje.species;

        // Avisamos a SAC que los datos ya están listos
        this.dispatchEvent(new CustomEvent("onDataReady"));

      } catch (error) {
        console.error("Error en la API:", error);
      }
    }

    // TRES MÉTODOS LIMPIOS QUE SAC VA A RECONOCER
    getNombre() {
      return this._nombre;
    }

    getEstado() {
      return this._estado;
    }

    getEspecie() {
      return this._especie;
    }
  }
  customElements.define("com-empresa-rickandmorty", SACRickAndMorty);
})();
