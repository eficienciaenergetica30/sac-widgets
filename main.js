(function () {
  let template = document.createElement("template");
  template.innerHTML = `<style>:host { display: none; }</style>`;

  class SACRickAndMorty extends HTMLElement {
    constructor() {
      super();
      this._shadowRoot = this.attachShadow({ mode: "open" });
      this._shadowRoot.appendChild(template.content.cloneNode(true));
      this._data = { name: "Cargando...", status: "...", species: "..." };
    }

    async obtenerPersonajes() {
      const id = Math.floor(Math.random() * 826) + 1;
      try {
        const res = await fetch(`https://rickandmortyapi.com/api/character/${id}`);
        const json = await res.json();
        this._data = { name: json.name, status: json.status, species: json.species };
        this.dispatchEvent(new CustomEvent("onDataReady"));
      } catch (e) { console.error(e); }
    }

    getNombre() { return this._data.name; }
    getEstado() { return this._data.status; }
    getEspecie() { return this._data.species; }
  }
  customElements.define("com-empresa-rickandmorty-v2", SACRickAndMorty);
})();
