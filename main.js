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
      // 1. Generamos un ID aleatorio entre 1 y 826 (el total de personajes de la API)
      const min = 1;
      const max = 826;
      const idAleatorio = Math.floor(Math.random() * (max - min + 1)) + min;

      // 2. Le pegamos al endpoint específico del personaje aleatorio
      const url = `https://rickandmortyapi.com/api/character/${idAleatorio}`;
      
      try {
        const respuesta = await fetch(url);
        const personaje = await respuesta.json(); // La API aquí ya devuelve el objeto directo, no un arreglo
        
        // 3. Guardamos los datos correctamente emparejados en las variables que SAC ya conoce
        this._nombre = personaje.name;
        this._estado = personaje.status;
        this._especie = personaje.species;

        // 4. Avisamos a SAC que los datos están listos para que los pinte
        this.dispatchEvent(new CustomEvent("onDataReady"));

      } catch (error) {
        console.error("Error al obtener el personaje aleatorio:", error);
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
