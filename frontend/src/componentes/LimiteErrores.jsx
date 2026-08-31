import { Component } from "react";
import { PaginaEstado } from "../paginas/PaginaEstado";

export class LimiteErrores extends Component {
  constructor(propiedades) {
    super(propiedades);
    this.state = { hayError: false, referencia: "" };
  }

  static getDerivedStateFromError() {
    return {
      hayError: true,
      referencia: window.crypto?.randomUUID?.() || String(Date.now()),
    };
  }

  componentDidCatch() {
    // La observabilidad se añadirá sin registrar datos sensibles.
  }

  render() {
    if (this.state.hayError) {
      return (
        <PaginaEstado
          codigo="500"
          codigoSoporte="ERR-UI-500"
          referencia={this.state.referencia}
          textoAccion="Recargar página"
          alAccion={() => window.location.reload()}
        />
      );
    }

    return this.props.children;
  }
}
