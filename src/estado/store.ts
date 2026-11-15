import { create } from 'zustand';
import { createJSONStorage, persist, subscribeWithSelector } from 'zustand/middleware';
import type { ConfigAyni, IdCapa, ModoCapa } from '../config/esquemas';
import type { Idioma } from '../config/idioma';
import type { EstadoMotor } from '../datos/tipos';
import type { EstadoCuerpo } from '../escena3d/estadoDesdeMotor';

export type Calidad = 'alta' | 'media' | 'baja';
export type Pestana = 'cuerpo3d' | 'evolucion' | 'medir';

export const MODO_CAPA_INICIAL: Record<IdCapa, ModoCapa> = {
  piel: 'visible',
  musculos: 'oculta',
  esqueleto: 'translucida',
  organos: 'visible',
  nervioso: 'visible',
  vascular: 'visible',
  halo: 'visible',
};

interface EstadoApp {
  /** Configuración ya traducida al idioma activo. */
  config: ConfigAyni | null;
  estadoCuerpo: EstadoCuerpo | null;
  motor: EstadoMotor | null;
  zonaSeleccionada: string | null;
  zonaHover: string | null;
  modoCapa: Record<IdCapa, ModoCapa>;
  calidad: Calidad;
  /** Ajuste del perfil; se combina con prefers-reduced-motion. */
  movimientoReducido: boolean;
  textoGrande: boolean;
  altoContraste: boolean;
  idioma: Idioma;
  pestana: Pestana;
  perfilAbierto: boolean;
  /** null = lo que indique el escenario inicial (ver estado/seleccion.ts). */
  tripulanteId: string | null;
  entornoId: string | null;
  dia: number | null;
  /** Pasos de la tarjeta marcados como hechos; clave `tripulante|dia|zona|paso`. */
  pasosHechos: Record<string, true>;
  /** Se incrementa para pedir a la cámara que vuelva a la vista frontal. */
  vistaFrontalPedida: number;
  /** Cambia cada vez que la escena vuelve a medir las zonas (centros para etiquetas y cámara). */
  versionZonas: number;

  setConfig: (config: ConfigAyni) => void;
  setEstadoCuerpo: (estado: EstadoCuerpo) => void;
  setMotor: (motor: EstadoMotor | null) => void;
  seleccionarZona: (zona: string | null) => void;
  setZonaHover: (zona: string | null) => void;
  setModoCapa: (capa: IdCapa, modo: ModoCapa) => void;
  setModosCapa: (modos: Partial<Record<IdCapa, ModoCapa>>) => void;
  setCalidad: (calidad: Calidad) => void;
  setMovimientoReducido: (activo: boolean) => void;
  setTextoGrande: (activo: boolean) => void;
  setAltoContraste: (activo: boolean) => void;
  setIdioma: (idioma: Idioma) => void;
  setPestana: (pestana: Pestana) => void;
  setPerfilAbierto: (abierto: boolean) => void;
  setTripulante: (id: string) => void;
  setEntorno: (id: string | null) => void;
  setDia: (dia: number) => void;
  /** Escenario de demo: su tripulante, el entorno de ese tripulante y su día de demo. */
  elegirEscenario: (tripulanteId: string, dia: number) => void;
  alternarPaso: (clave: string) => void;
  vistaFrontal: () => void;
  marcarZonasRegistradas: () => void;
}

export const useAyni = create<EstadoApp>()(
  subscribeWithSelector(
    persist(
      (set) => ({
        config: null,
        estadoCuerpo: null,
        motor: null,
        zonaSeleccionada: null,
        zonaHover: null,
        modoCapa: MODO_CAPA_INICIAL,
        calidad: 'media',
        movimientoReducido: false,
        textoGrande: false,
        altoContraste: false,
        idioma: 'es',
        pestana: 'cuerpo3d',
        perfilAbierto: false,
        tripulanteId: null,
        entornoId: null,
        dia: null,
        pasosHechos: {},
        vistaFrontalPedida: 0,
        versionZonas: 0,

        setConfig: (config) => set({ config }),
        setEstadoCuerpo: (estadoCuerpo) => set({ estadoCuerpo }),
        setMotor: (motor) => set({ motor }),
        seleccionarZona: (zonaSeleccionada) => set({ zonaSeleccionada }),
        setZonaHover: (zonaHover) => set({ zonaHover }),
        setModoCapa: (capa, modo) => set((s) => ({ modoCapa: { ...s.modoCapa, [capa]: modo } })),
        setModosCapa: (modos) => set((s) => ({ modoCapa: { ...s.modoCapa, ...modos } })),
        setCalidad: (calidad) => set({ calidad }),
        setMovimientoReducido: (movimientoReducido) => set({ movimientoReducido }),
        setTextoGrande: (textoGrande) => set({ textoGrande }),
        setAltoContraste: (altoContraste) => set({ altoContraste }),
        setIdioma: (idioma) => set({ idioma }),
        setPestana: (pestana) => set({ pestana }),
        setPerfilAbierto: (perfilAbierto) => set({ perfilAbierto }),
        setTripulante: (tripulanteId) => set({ tripulanteId, entornoId: null }),
        setEntorno: (entornoId) => set({ entornoId }),
        setDia: (dia) => set({ dia }),
        elegirEscenario: (tripulanteId, dia) => set({ tripulanteId, entornoId: null, dia }),
        alternarPaso: (clave) =>
          set((s) => {
            const pasosHechos = { ...s.pasosHechos };
            if (pasosHechos[clave]) delete pasosHechos[clave];
            else pasosHechos[clave] = true;
            return { pasosHechos };
          }),
        vistaFrontal: () =>
          set((s) => ({ zonaSeleccionada: null, vistaFrontalPedida: s.vistaFrontalPedida + 1 })),
        marcarZonasRegistradas: () => set((s) => ({ versionZonas: s.versionZonas + 1 })),
      }),
      {
        name: 'ayni-preferencias',
        version: 1,
        storage: createJSONStorage(() => localStorage),
        partialize: (s) => ({
          idioma: s.idioma,
          movimientoReducido: s.movimientoReducido,
          textoGrande: s.textoGrande,
          altoContraste: s.altoContraste,
          tripulanteId: s.tripulanteId,
          entornoId: s.entornoId,
          dia: s.dia,
          pasosHechos: s.pasosHechos,
        }),
      },
    ),
  ),
);
