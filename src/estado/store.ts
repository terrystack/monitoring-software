import { create } from 'zustand';
import { createJSONStorage, persist, subscribeWithSelector } from 'zustand/middleware';
import type { DiasRango, EstadoLienzo, MensajeChat } from '../chat/tipos';
import type { ConfigAyni, IdCapa, ModoCapa } from '../config/esquemas';
import type { Idioma } from '../config/idioma';
import type { EstadoMotor, Lectura } from '../datos/tipos';
import type { EstadoCuerpo } from '../escena3d/estadoDesdeMotor';
import type { SesionMhclGuardada } from '../evaluaciones/mhcl';
import type { SesionPvtGuardada } from '../evaluaciones/pvt';

export type Calidad = 'alta' | 'media' | 'baja';
export type Pestana = 'cuerpo3d' | 'monitoreo' | 'medicion' | 'evaluaciones' | 'agente';
export const PESTANAS: Pestana[] = ['cuerpo3d', 'monitoreo', 'medicion', 'evaluaciones', 'agente'];

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
  /** Todas las lecturas del CSV sintético. */
  lecturas: Lectura[];
  /** Lecturas registradas a mano (IndexedDB, fuente "manual"). */
  lecturasManuales: Lectura[];
  /** Sesiones de la pestaña Evaluaciones (IndexedDB; null = aún no cargadas). */
  sesionesPvt: SesionPvtGuardada[] | null;
  sesionesMhcl: SesionMhclGuardada[] | null;
  /** Filtros de la pestaña Monitoreo. */
  rangoDias: DiasRango;
  zonaFiltro: string | null;
  /** Guía del dispositivo (pestaña Medición y lienzo del agente). */
  pasoDispositivo: number;
  sensorSeleccionado: string | null;
  /** Se incrementa con "Repetir paso" para relanzar la animación del paso activo. */
  repeticionPaso: number;
  /** Conversación con el Agente AYNI (no se persiste). */
  chat: MensajeChat[];
  lienzo: EstadoLienzo;
  /** Leer en voz alta las respuestas del agente. */
  vozActiva: boolean;
  /** Pregunta prellenada para el agente (botón "Preguntar a AYNI"). */
  borradorAgente: string | null;
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
  setLecturas: (lecturas: Lectura[]) => void;
  setLecturasManuales: (lecturas: Lectura[]) => void;
  setSesionesPvt: (sesiones: SesionPvtGuardada[]) => void;
  setSesionesMhcl: (sesiones: SesionMhclGuardada[]) => void;
  setRangoDias: (dias: DiasRango) => void;
  setZonaFiltro: (zona: string | null) => void;
  setPasoDispositivo: (paso: number) => void;
  setSensorSeleccionado: (sensor: string | null) => void;
  repetirPaso: () => void;
  agregarMensaje: (mensaje: MensajeChat) => void;
  limpiarChat: () => void;
  setLienzo: (lienzo: EstadoLienzo) => void;
  setVozActiva: (activa: boolean) => void;
  setBorradorAgente: (texto: string | null) => void;
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
        lecturas: [],
        lecturasManuales: [],
        sesionesPvt: null,
        sesionesMhcl: null,
        rangoDias: 14,
        zonaFiltro: null,
        pasoDispositivo: 0,
        sensorSeleccionado: null,
        repeticionPaso: 0,
        chat: [],
        lienzo: { tipo: 'vacio' },
        vozActiva: false,
        borradorAgente: null,
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
        setLecturas: (lecturas) => set({ lecturas }),
        setLecturasManuales: (lecturasManuales) => set({ lecturasManuales }),
        setSesionesPvt: (sesionesPvt) => set({ sesionesPvt }),
        setSesionesMhcl: (sesionesMhcl) => set({ sesionesMhcl }),
        setRangoDias: (rangoDias) => set({ rangoDias }),
        setZonaFiltro: (zonaFiltro) => set({ zonaFiltro }),
        setPasoDispositivo: (pasoDispositivo) => set({ pasoDispositivo }),
        setSensorSeleccionado: (sensorSeleccionado) => set({ sensorSeleccionado }),
        repetirPaso: () => set((s) => ({ repeticionPaso: s.repeticionPaso + 1 })),
        agregarMensaje: (mensaje) => set((s) => ({ chat: [...s.chat, mensaje] })),
        limpiarChat: () => set({ chat: [] }),
        setLienzo: (lienzo) => set({ lienzo }),
        setVozActiva: (vozActiva) => set({ vozActiva }),
        setBorradorAgente: (borradorAgente) => set({ borradorAgente }),
        vistaFrontal: () =>
          set((s) => ({ zonaSeleccionada: null, vistaFrontalPedida: s.vistaFrontalPedida + 1 })),
        marcarZonasRegistradas: () => set((s) => ({ versionZonas: s.versionZonas + 1 })),
      }),
      {
        name: 'ayni-preferencias',
        version: 2,
        storage: createJSONStorage(() => localStorage),
        // v1 → v2 solo añade campos (rangoDias, vozActiva); `pestana` nunca se persiste.
        migrate: (persistido) => persistido as Partial<EstadoApp>,
        partialize: (s) => ({
          idioma: s.idioma,
          movimientoReducido: s.movimientoReducido,
          textoGrande: s.textoGrande,
          altoContraste: s.altoContraste,
          tripulanteId: s.tripulanteId,
          entornoId: s.entornoId,
          dia: s.dia,
          pasosHechos: s.pasosHechos,
          rangoDias: s.rangoDias,
          vozActiva: s.vozActiva,
        }),
      },
    ),
  ),
);
