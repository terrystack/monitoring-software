import type { ReactNode } from 'react';

interface Props {
  titulo: string;
  children?: ReactNode;
}

/** Marco común de las pestañas 2–4: título accesible y área con scroll. */
export function ContenedorPestana({ titulo, children }: Props) {
  return (
    <div className="h-full overflow-y-auto overflow-x-hidden">
      <h1 className="sr-only">{titulo}</h1>
      {children}
    </div>
  );
}
