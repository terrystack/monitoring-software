import { Component, type ReactNode } from 'react';

interface Props {
  respaldo: ReactNode;
  children: ReactNode;
}

/** Si el modelo anatómico no carga (archivo ausente, sin WebGL2, etc.), muestra el respaldo. */
export class LimiteError extends Component<Props, { fallo: boolean }> {
  state = { fallo: false };

  static getDerivedStateFromError() {
    return { fallo: true };
  }

  componentDidCatch(error: unknown) {
    console.warn('HANAN PACHA: no se pudo cargar el cuerpo anatómico; se usa el procedural.', error);
  }

  render() {
    return this.state.fallo ? this.props.respaldo : this.props.children;
  }
}
