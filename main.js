(function () {
  let template = document.createElement("template");
  template.innerHTML = `
    <style>
      :host { display: none; }
    </style>
  `;

  class SACRickAndMorty extends HTMLElement {
    constructor() {
      super();
      this._shadowRoot = this.attachShadow({ mode: "open" });
      this._shadowRoot.appendChild(template.content.cloneNode(true));
    }

    // Este es el método que llamará tu botón de SAC
    async obtenerPersonajes() {
      const url = "https://rickandmortyapi.com/api/character";
      
      try {
        console.log("Iniciando petición a la API de Rick y Morty...");
        const respuesta = await fetch(url, { method: "GET" });

        if (!respuesta.ok) {
          throw new Error(`Error HTTP: ${respuesta.status}`);
        }

        const data = await respuesta.json();
        
        // Imprimimos los resultados en la consola del navegador para verificar
        console.log("¡Datos recibidos de la API con éxito!", data.results);
        
        // Aquí podrías iterar los personajes o enviarlos a otra parte
        data.results.forEach(personaje => {
            console.log(`Personaje: ${personaje.name} - Especie: ${personaje.species}`);
        });

      } catch (error) {
        console.error("Error al consumir la API desde el Custom Widget:", error);
      }
    }
  }

  customElements.define("com-empresa-rickandmorty", SACRickAndMorty);
})();
