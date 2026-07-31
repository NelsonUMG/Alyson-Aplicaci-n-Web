import { Component } from "react";
import { PaginaEstado } from "../paginas/PaginaEstado";

export class LimiteErrores extends Component {
  constructor(propiedades) {
    super(propiedades);
    this.state = { hayError: false };
  }

  static getDerivedStateFromError() {
    return { hayError: true };
  }

  componentDidCatch() {
    // La observabilidad se añadirá sin registrar datos sensibles.
  }

  render() {
    if (this.state.hayError) {
      return (
        <PaginaEstado
          codigo="Error"
          titulo="Ocurrió un error inesperado"
          mensaje="Recarga la página. Si el problema continúa, comunícalo al personal responsable."
        />
      );
    }

    return this.props.children;
  }
}
