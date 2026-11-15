import { z } from 'zod';
import indicadoresJson from './indicadores.json';
import zonasJson from './zonas.json';
import dispositivosJson from './dispositivos.json';
import entornosJson from './entornos.json';
import escenariosJson from './escenarios.json';
import rutinaJson from './rutina.json';
import tripulantesJson from './tripulantes.json';
import reglasCompuestasJson from './reglas-compuestas.json';
import escenaJson from './escena.json';
import frasesJson from './frases.json';
import evaluacionesJson from './evaluaciones.json';

// --- 4.4.1 Tipos comunes ---------------------------------------------------

export const esquemaEstado = z.enum(['normal', 'atencion', 'critico', 'sin_dato']);
export const esquemaDireccionRiesgo = z.enum(['sube', 'baja', 'ambas']);
export const esquemaComparador = z.enum(['<', '<=', '>', '>=']);
export const esquemaAgregacion = z.enum(['ultimo', 'promedio', 'suma', 'max', 'min']);
export const esquemaContexto = z.enum([
  'reposo',
  'ejercicio',
  'sueno',
  'eva',
  'post_comida',
  'noche',
  'manual',
  'despertar',
]);
export const esquemaFranja = z.enum(['manana', 'dia', 'noche', 'semanal']);
export const esquemaAnclaje = z.enum([
  'muneca_izq',
  'muneca_der',
  'pecho',
  'brazo_izq',
  'dedo_indice',
  'frente',
]);

const texto = z.string().min(1);
const hora = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'formato de hora HH:MM');
const fecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'formato de fecha AAAA-MM-DD');

// --- 4.4.3 Tipos de regla ----------------------------------------------------

const reglaLineaBase = z
  .object({
    tipo: z.literal('linea_base'),
    ventanaDias: z.number().int().positive(),
    minDias: z.number().int().positive(),
    zAmbar: z.number().positive(),
    zRojo: z.number().positive(),
  })
  .strict();
const reglaLimiteFijo = z
  .object({
    tipo: z.literal('limite_fijo'),
    comparador: esquemaComparador,
    ambar: z.number(),
    rojo: z.number(),
    ventanaHoras: z.number().positive().optional(),
  })
  .strict();
const reglaTendencia = z
  .object({
    tipo: z.literal('tendencia'),
    comparador: esquemaComparador,
    umbral: z.number(),
    diasConsecutivos: z.number().int().positive(),
    estado: z.enum(['atencion', 'critico']),
  })
  .strict();
const reglaPorcentajeCambio = z
  .object({
    tipo: z.literal('porcentaje_cambio'),
    referencia: z.enum(['inicio', 'linea_base']),
    ambarPct: z.number().positive(),
    rojoPct: z.number().positive(),
  })
  .strict();
const reglaMetaDiaria = z
  .object({
    tipo: z.literal('meta_diaria'),
    meta: z.number().positive(),
    diasAmbar: z.number().int().positive(),
    diasRojo: z.number().int().positive(),
  })
  .strict();
const reglaPresupuesto = z
  .object({
    tipo: z.literal('presupuesto'),
    limite: z.number().positive(),
    ambarPct: z.number().positive(),
    rojoPct: z.number().positive(),
  })
  .strict();

export const esquemaRegla = z.discriminatedUnion('tipo', [
  reglaLineaBase,
  reglaLimiteFijo,
  reglaTendencia,
  reglaPorcentajeCambio,
  reglaMetaDiaria,
  reglaPresupuesto,
]);

const esquemaReglaParcial = z.union([
  reglaLineaBase.partial(),
  reglaLimiteFijo.partial(),
  reglaTendencia.partial(),
  reglaPorcentajeCambio.partial(),
  reglaMetaDiaria.partial(),
  reglaPresupuesto.partial(),
]);

// --- 4.4.2 Indicador ---------------------------------------------------------

export const esquemaIndicador = z
  .object({
    id: texto,
    nombre: texto,
    unidad: texto,
    zonas: z.array(texto).min(1),
    validacion: z.object({ min: z.number(), max: z.number() }).strict(),
    direccionRiesgo: esquemaDireccionRiesgo,
    agregacionDiaria: esquemaAgregacion,
    contextosIgnorados: z.array(esquemaContexto),
    reglas: z.array(esquemaRegla).min(1),
    textos: z.object({ queEs: texto, queSignifica: texto, porQueEspacio: texto }).strict(),
    acciones: z.array(texto).min(1).max(3),
    avisoMedico: texto,
    fuente: z.string().url(),
    fuenteNombre: texto,
    dispositivo: texto,
    entrada: z.enum(['dispositivo', 'manual', 'ambos']),
    sintetico: z
      .object({
        media: z.number(),
        desv: z.number().nonnegative(),
        /** `rutina`: a la hora de cada tarea de rutina.json que incluye el indicador. */
        frecuencia: z.enum(['diaria', 'tres_veces_dia', 'cada_hora', 'rutina']),
        decimales: z.number().int().nonnegative(),
        cicloDiario: z.number().optional(),
        acumulado: z.boolean().optional(),
        /**
         * Genera el indicador con su propio flujo aleatorio para no cambiar el resto del CSV
         * (indicadores añadidos después de fijar los escenarios de demo).
         */
        flujoPropio: z.boolean().optional(),
        /** Cambio de la media por día de misión (unidades/día). */
        tendenciaDiaria: z.number().optional(),
      })
      .strict(),
  })
  .strict()
  .refine((i) => i.validacion.min < i.validacion.max, {
    message: 'validacion.min debe ser menor que validacion.max',
    path: ['validacion'],
  });

// --- 4.3 Zona ----------------------------------------------------------------

export const esquemaCapa = z.enum([
  'nervioso',
  'organos',
  'vascular',
  'esqueleto',
  'musculos',
  'piel',
  'halo',
]);

export const esquemaZona = z
  .object({
    id: texto,
    nombre: texto,
    capa: esquemaCapa,
    mallas: z.array(texto).min(1),
    funcion: texto,
  })
  .strict();

// --- 4.4.5 Tripulantes -------------------------------------------------------

export const esquemaConfigTripulantes = z
  .object({
    generador: z
      .object({ semilla: z.number().int(), fechaInicio: fecha, dias: z.number().int().positive() })
      .strict(),
    tripulantes: z
      .array(
        z
          .object({
            id: texto,
            nombre: texto,
            rol: texto,
            diaMisionInicial: z.number().int().nonnegative(),
            entorno: texto,
            desviosPersonales: z.record(z.string(), z.number()),
          })
          .strict(),
      )
      .min(1),
  })
  .strict();

// --- 4.4.6 Escenarios --------------------------------------------------------

export const esquemaEscenario = z
  .object({
    id: texto,
    nombre: texto,
    descripcion: texto,
    tripulanteId: texto,
    alteraciones: z.array(
      z
        .object({
          indicador: texto,
          diaInicio: z.number().int().positive(),
          diaFin: z.number().int().positive(),
          modo: z.enum(['sumar', 'multiplicar', 'fijar', 'rampa']),
          valor: z.number(),
          valorFinal: z.number().optional(),
          contexto: esquemaContexto.optional(),
        })
        .strict()
        .refine((a) => a.diaInicio <= a.diaFin, {
          message: 'diaInicio debe ser menor o igual que diaFin',
          path: ['diaFin'],
        })
        .refine((a) => a.modo !== 'rampa' || a.valorFinal !== undefined, {
          message: 'el modo rampa requiere valorFinal',
          path: ['valorFinal'],
        }),
    ),
    diaDemo: z.number().int().positive(),
  })
  .strict();

// --- 4.4.7 Reglas compuestas -------------------------------------------------

export const esquemaReglasCompuestas = z
  .object({
    multisenal: z.array(
      z
        .object({
          id: texto,
          nombre: texto,
          ventanaHoras: z.number().positive(),
          minimoCondiciones: z.number().int().positive(),
          condiciones: z
            .array(
              z
                .object({
                  indicador: texto,
                  medida: z.enum(['z', 'valor', 'estado']),
                  comparador: esquemaComparador,
                  umbral: z.number(),
                })
                .strict(),
            )
            .min(1),
          estado: z.enum(['atencion', 'critico']),
          zonas: z.array(texto).min(1),
          tarjeta: z
            .object({
              queSignifica: texto,
              acciones: z.array(texto).min(1).max(3),
              avisoMedico: texto,
              porQueEspacio: texto,
              fuente: z.string().url(),
              fuenteNombre: texto,
            })
            .strict(),
        })
        .strict()
        .refine((m) => m.minimoCondiciones <= m.condiciones.length, {
          message: 'minimoCondiciones no puede superar el número de condiciones',
          path: ['minimoCondiciones'],
        }),
    ),
    aptitud: z.array(
      z
        .object({
          id: texto,
          nombre: texto,
          zonas: z.array(texto).min(1),
          criterio: z.literal('peor_estado'),
        })
        .strict(),
    ),
  })
  .strict();

// --- 4.4.8 Dispositivos ------------------------------------------------------

export const esquemaDispositivo = z
  .object({
    id: texto,
    nombre: texto,
    modelo: texto,
    anclaje: esquemaAnclaje,
    indicadores: z.array(texto).min(1),
    pasos: z
      .array(
        z
          .object({
            texto,
            animacion: z.enum([
              'presentar',
              'volar_a_anclaje',
              'ajustar',
              'medir',
              'mostrar_resultado',
              'error',
              'colocar',
              'despiece',
            ]),
            duracionMs: z.number().int().positive(),
            resaltarZona: texto.optional(),
            /** Error común de este paso (AYNI_FUSION.md §7.1). */
            error: texto.optional(),
            /** Sensor que se resalta en este paso. */
            sensor: texto.optional(),
          })
          .strict(),
      )
      .min(1),
    sensores: z
      .array(
        z
          .object({
            id: texto,
            nombre: texto,
            donde: texto,
            indicadores: z.array(texto),
            posicion: z.discriminatedUnion('tipo', [
              z
                .object({ tipo: z.literal('torso'), altura: z.number(), angulo: z.number() })
                .strict(),
              z.object({ tipo: z.literal('anclaje'), anclaje: esquemaAnclaje }).strict(),
              /** Elipse de la cabeza (ángulo 0° = frente, + = izquierda). */
              z
                .object({ tipo: z.literal('cabeza'), altura: z.number(), angulo: z.number() })
                .strict(),
              /** Pieza del modelo 3D (el componente calcula su posición). */
              z.object({ tipo: z.literal('pieza'), pieza: texto }).strict(),
            ]),
          })
          .strict(),
      )
      .optional(),
    /** Nombres de las partes del modelo 3D para el despiece (id de la parte → nombre). */
    partes: z.record(z.string(), texto).optional(),
    /** Ficha del dispositivo en la pestaña Medición (AYNI_DISPOSITIVOS_3D.md §8). */
    ficha: z
      .object({
        inspiradoEn: texto,
        fuente: z.string().url(),
        mide: z.array(texto).min(1),
        peso: texto.optional(),
        autonomia: texto.optional(),
      })
      .strict()
      .optional(),
    erroresComunes: z.array(
      z
        .object({
          texto,
          anclajeIncorrecto: esquemaAnclaje.optional(),
          desplazamiento: z.tuple([z.number(), z.number(), z.number()]).optional(),
        })
        .strict(),
    ),
  })
  .strict();

// --- Evaluaciones (PVT-B y MHCL) ---------------------------------------------

const ms = z.number().int().nonnegative();
const textosEvaluaciones = z
  .object({
    titulo: texto,
    intro: texto,
    pvtNombre: texto,
    pvtResumen: texto,
    mhclNombre: texto,
    mhclResumen: texto,
    hoy: texto,
    fecha: texto,
    estaSemana: texto,
    momento: texto,
    momentoDespertar: texto,
    momentoNoche: texto,
    momentoLibre: texto,
    comoFunciona: texto,
    pvtPasos: z.array(texto).min(1),
    pvtSinAviso: texto,
    empezar: texto,
    antesDeLaPrueba: texto,
    preguntaEstres: texto,
    ayudaEstres: texto,
    sinResponder: texto,
    estresNada: texto,
    estresMucho: texto,
    horasSueno: texto,
    continuar: texto,
    listoTitulo: texto,
    listoTexto: texto,
    iniciarPrueba: texto,
    cancelar: texto,
    instruccionPrueba: texto,
    tiempoRestante: texto,
    salirPrueba: texto,
    resultados: texto,
    avisoResultados: texto,
    velocidad: texto,
    ayudaVelocidad: texto,
    trMedio: texto,
    lapsos: texto,
    ayudaLapsos: texto,
    salidasFalsas: texto,
    ayudaSalidas: texto,
    estresReportado: texto,
    sueno: texto,
    intentos: texto,
    graficoIntentos: texto,
    historial: texto,
    sinSesiones: texto,
    guardado: texto,
    otraVez: texto,
    volver: texto,
    entrada: texto,
    entradaTeclado: texto,
    entradaTactil: texto,
    entradaRaton: texto,
    avisoTactil: texto,
    fuentePvt: texto,
    mhclInstruccion: texto,
    /** Etiquetas guía de la escala, ubicadas bajo el número que indican. */
    mhclAnclas: z.array(z.object({ valor: z.number().int(), texto }).strict()).min(2),
    preguntaDe: texto,
    anterior: texto,
    siguiente: texto,
    terminar: texto,
    mhclAviso: texto,
    promedioSubescala: texto,
    referenciaEstudio: texto,
    fuenteMhcl: texto,
  })
  .strict();

export const esquemaEvaluaciones = z
  .object({
    pvt: z
      .object({
        duracionS: z.number().positive(),
        esperaMinMs: ms,
        esperaMaxMs: ms,
        retroalimentacionMs: ms,
        maxRespuestaMs: z.number().int().positive(),
        umbralLapsoMs: z.number().int().positive(),
        umbralFalsaMs: z.number().int().positive(),
        pasoContadorMs: z.number().int().positive(),
        tecla: z.string().length(1),
        filas: z.number().int().min(1).max(12),
        columnas: z.number().int().min(1).max(12),
        indicadores: z.object({ tiempoReaccion: texto, velocidad: texto, estres: texto }).strict(),
        momentos: z
          .array(z.object({ id: texto, tarea: texto, contexto: esquemaContexto }).strict())
          .min(1),
      })
      .strict()
      .refine((p) => p.esperaMinMs <= p.esperaMaxMs, {
        message: 'esperaMinMs debe ser ≤ esperaMaxMs',
        path: ['esperaMinMs'],
      }),
    mhcl: z
      .object({
        escalaMin: z.number().int(),
        escalaMax: z.number().int(),
        tarea: texto,
        nota: z.string().optional(),
        subescalas: z
          .array(
            z.object({ id: texto, nombre: texto, descripcion: texto, indicador: texto }).strict(),
          )
          .min(1),
        items: z
          .array(
            z
              .object({
                id: texto,
                texto,
                subescala: texto,
                /** Media (DE) del ítem en la tabla 3 del estudio de referencia; solo orientación. */
                referencia: z.object({ media: z.number(), desv: z.number() }).strict().optional(),
              })
              .strict(),
          )
          .min(1),
      })
      .strict(),
    textos: textosEvaluaciones,
  })
  .strict();

// --- 4.4.9 Rutina ------------------------------------------------------------

export const esquemaTarea = z
  .object({
    id: texto,
    titulo: texto,
    franja: esquemaFranja,
    hora,
    diasSemana: z.array(z.number().int().min(1).max(7)).min(1).optional(),
    indicadores: z.array(texto).min(1),
    dispositivo: texto,
    duracionMin: z.number().positive(),
    puntos: z.number().int().nonnegative(),
    obligatoria: z.boolean(),
    /** Si se indica, la tarea solo cuenta como hecha con lecturas de ese contexto. */
    contexto: esquemaContexto.optional(),
  })
  .strict()
  .refine((t) => (t.franja === 'semanal') === (t.diasSemana !== undefined), {
    message: 'diasSemana es obligatorio solo en la franja semanal',
    path: ['diasSemana'],
  });

// --- 4.4.10 Entornos ---------------------------------------------------------

export const esquemaEntorno = z
  .object({
    id: z.enum(['nave_transito', 'estacion', 'rover', 'base_lunar', 'base_marciana']),
    nombre: texto,
    gravedad: z.number().nonnegative(),
    retrasoComMin: z.tuple([z.number().nonnegative(), z.number().nonnegative()]),
    riesgosDestacados: z.array(texto),
    ajustes: z.record(z.string(), esquemaReglaParcial).optional(),
  })
  .strict();

// --- 4.4.11 Escena -------------------------------------------------------------

export const esquemaModoCapa = z.enum(['visible', 'translucida', 'oculta']);

const listaPalabras = z.array(texto).min(1);
export const esquemaRespaldo = z
  .object({
    /** Fragmentos (sin tildes, en minúsculas) que activan cada intención. */
    palabras: z
      .object({
        emergencia: listaPalabras,
        estado: listaPalabras,
        dispositivo: listaPalabras,
        medico: listaPalabras,
        tendencia: listaPalabras,
        relacion: listaPalabras,
        diagnostico: listaPalabras,
        medicamento: listaPalabras,
        internet: listaPalabras,
        inventar: listaPalabras,
        agenda: listaPalabras,
        animo: listaPalabras,
        radiacion: listaPalabras,
        ignorar: z.array(texto),
      })
      .strict(),
    emergencia: texto,
    noDiagnostico: texto,
    noMedicamento: texto,
    sinInternet: texto,
    queEs: texto,
    noInvento: texto,
    otroTripulante: texto,
    agenda: texto,
    agendaCompleta: texto,
    animo: texto,
    comparar: texto,
    radiacion: texto,
    co2: texto,
    errorPaso: texto,
    repetirMedicion: texto,
    estado: texto,
    todoNormal: texto,
    zonasFuera: texto,
    zona: texto,
    acciones: texto,
    aviso: texto,
    indicador: texto,
    indicadorSinNormal: texto,
    sinValor: texto,
    prediccion: texto,
    dispositivo: texto,
    medicoNada: texto,
    noEntiendo: texto,
  })
  .strict();

export const esquemaEscena = z
  .object({
    estados: z
      .array(
        z
          .object({
            id: esquemaEstado,
            etiqueta: texto,
            color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'color hexadecimal #RRGGBB'),
          })
          .strict(),
      )
      .min(1),
    capas: z
      .array(z.object({ id: esquemaCapa, nombre: texto, orden: z.number().int() }).strict())
      .min(1),
    modosCapa: z.array(z.object({ id: esquemaModoCapa, etiqueta: texto }).strict()).min(1),
    textos: z
      .object({
        datosSinteticos: texto,
        noDiagnostico: texto,
        capas: texto,
        vistaFrontal: texto,
        cerrar: texto,
        cargandoEscena: texto,
        queCambio: texto,
        queSignifica: texto,
        acciones: texto,
        avisoMedico: texto,
        porQueEspacio: texto,
        fuente: texto,
        creditos: texto,
        tituloCreditos: texto,
        introCreditos: texto,
        licenciaDerivada: texto,
        verLicencia: texto,
        verFuente: texto,
        creditosNoDisponibles: texto,
        volverAlCuerpo: texto,
        secciones: texto,
        pestanaCuerpo: texto,
        pestanaMonitoreo: texto,
        pestanaMedicion: texto,
        pestanaAgente: texto,
        pestanaEvaluaciones: texto,
        diaMision: texto,
        alertas: texto,
        sinAlertas: texto,
        abrirPerfil: texto,
        idioma: texto,
        aptitudDelDia: texto,
        zonasDelCuerpo: texto,
        columnaZona: texto,
        columnaEstado: texto,
        columnaValor: texto,
        columnaNormal: texto,
        sinValor: texto,
        eligeZona: texto,
        verEvolucion: texto,
        medirAhora: texto,
        perfil: texto,
        tripulante: texto,
        entorno: texto,
        lineaBase: texto,
        sinLineaBase: texto,
        accesibilidad: texto,
        textoGrande: texto,
        altoContraste: texto,
        movimientoReducido: texto,
        modoDemo: texto,
        escenario: texto,
        diaDatos: texto,
        diaAnterior: texto,
        diaSiguiente: texto,
        // Fusión a 4 pestañas (AYNI_FUSION.md §4.4)
        hoy: texto,
        puntajeDe: texto,
        estadoGeneral: texto,
        presupuestoRadiacion: texto,
        mSvAcumulados: texto,
        limiteCarrera: texto,
        rango: texto,
        dias: texto,
        todasLasZonas: texto,
        prediccion: texto,
        entrenadoCon: texto,
        fueraDeTuNormal: texto,
        dentroDeTuNormal: texto,
        comparar: texto,
        agendaHoy: texto,
        pendiente: texto,
        hecha: texto,
        atrasada: texto,
        guiaDispositivo: texto,
        dispositivos: texto,
        verPiezas: texto,
        armar: texto,
        inspiradoEn: texto,
        queMide: texto,
        peso: texto,
        autonomia: texto,
        noEsReplica: texto,
        errorComun: texto,
        anterior: texto,
        siguientePaso: texto,
        repetirPaso: texto,
        sensores: texto,
        tocaUnSensor: texto,
        registrarMedicion: texto,
        guardar: texto,
        medicionGuardada: texto,
        animoHoy: texto,
        agenteBienvenida: texto,
        escribeTuPregunta: texto,
        enviar: texto,
        adjuntarImagen: texto,
        dictar: texto,
        dictadoTranscribiendo: texto,
        dictadoError: texto,
        leerEnVoz: texto,
        detenerVoz: texto,
        modoSinConexion: texto,
        lienzoVacio: texto,
        preguntarAyni: texto,
        modeloV1: texto,
        siSigueAsi: texto,
        siSigueAsiManana: texto,
        verEnElCuerpo: texto,
        diaDeTotal: texto,
        sinMedicionesRango: texto,
        pensando: texto,
        mostradoEnLienzo: texto,
        abrirEnPestana: texto,
        quitarImagen: texto,
        vistaAnterior: texto,
        vistaSiguiente: texto,
        tu: texto,
        ocultarLienzo: texto,
        mostrarLienzo: texto,
        preguntaZona: texto,
        imagenNoValida: texto,
        resumenHoy: texto,
        conversacion: texto,
        lienzo: texto,
        franjaManana: texto,
        franjaDia: texto,
        franjaNoche: texto,
        franjaSemanal: texto,
        borrarRegistros: texto,
        midiendo: texto,
        mide: texto,
        sinIndicadores: texto,
        valor: texto,
        indicador: texto,
      })
      .strict(),
    /** Etiquetas de la escala de ánimo, de 1 (muy mal) a 5 (muy bien). */
    escalaAnimo: z.array(texto).length(5),
    /** Indicador que registra la escala de ánimo (caras) y que usa el agente al hablar de ánimo. */
    indicadorAnimo: texto,
    /** Indicadores que se pueden registrar a mano en la pestaña Medición. */
    indicadoresRegistro: z.array(texto),
    /** Botones iniciales del Agente AYNI. */
    preguntasSugeridas: z.array(texto).min(1),
    /** Indicadores del reto que encabezan Monitoreo cuando todo está normal. */
    indicadoresDestacados: z.array(texto),
    /** Respuestas del agente sin conexión con el modelo (AYNI_FUSION.md §8.9). */
    respaldo: esquemaRespaldo,
    etiquetasAptitud: z
      .object({ normal: texto, atencion: texto, critico: texto, sin_dato: texto })
      .strict(),
    /** Escenario con el que abre la app hasta que el usuario elige otro en el perfil. */
    escenarioInicial: texto,
  })
  .strict();

// --- Frases del motor (motivos y "qué cambió") ---------------------------------

export const esquemaFrases = z
  .object({
    separadorDecimal: z.enum([',', '.']),
    indicadorNoConfigurado: texto,
    fueraDeRango: texto,
    faltanDias: texto,
    lineaBase: texto,
    promedioHoras: texto,
    dentroDelLimite: texto,
    fueraDelLimite: texto,
    tendencia: texto,
    sinTendencia: texto,
    sinReferencia: texto,
    cambio: texto,
    referenciaInicio: texto,
    referenciaNormal: texto,
    metaCumplida: texto,
    metaUnDia: texto,
    metaDias: texto,
    presupuesto: texto,
    multisenal: texto,
    sinMediciones: texto,
    dentroDeTuNormal: texto,
  })
  .strict();

// --- Tipos inferidos ---------------------------------------------------------

export type Estado = z.infer<typeof esquemaEstado>;
export type DireccionRiesgo = z.infer<typeof esquemaDireccionRiesgo>;
export type Comparador = z.infer<typeof esquemaComparador>;
export type Agregacion = z.infer<typeof esquemaAgregacion>;
export type Contexto = z.infer<typeof esquemaContexto>;
export type Franja = z.infer<typeof esquemaFranja>;
export type Regla = z.infer<typeof esquemaRegla>;
export type Indicador = z.infer<typeof esquemaIndicador>;
export type Zona = z.infer<typeof esquemaZona>;
export type ConfigTripulantes = z.infer<typeof esquemaConfigTripulantes>;
export type Tripulante = ConfigTripulantes['tripulantes'][number];
export type Escenario = z.infer<typeof esquemaEscenario>;
export type ReglasCompuestas = z.infer<typeof esquemaReglasCompuestas>;
export type Multisenal = ReglasCompuestas['multisenal'][number];
export type Aptitud = ReglasCompuestas['aptitud'][number];
export type Dispositivo = z.infer<typeof esquemaDispositivo>;
export type Tarea = z.infer<typeof esquemaTarea>;
export type Entorno = z.infer<typeof esquemaEntorno>;
export type IdCapa = z.infer<typeof esquemaCapa>;
export type ModoCapa = z.infer<typeof esquemaModoCapa>;
export type ConfigEscena = z.infer<typeof esquemaEscena>;
export type Frases = z.infer<typeof esquemaFrases>;
export type ConfigEvaluaciones = z.infer<typeof esquemaEvaluaciones>;

export interface ConfigAyni {
  escena: ConfigEscena;
  frases: Frases;
  indicadores: Indicador[];
  zonas: Zona[];
  dispositivos: Dispositivo[];
  entornos: Entorno[];
  escenarios: Escenario[];
  rutina: Tarea[];
  tripulantes: ConfigTripulantes;
  reglasCompuestas: ReglasCompuestas;
  evaluaciones: ConfigEvaluaciones;
}

export interface ConfigCruda {
  escena: unknown;
  frases: unknown;
  indicadores: unknown;
  zonas: unknown;
  dispositivos: unknown;
  entornos: unknown;
  escenarios: unknown;
  rutina: unknown;
  tripulantes: unknown;
  reglasCompuestas: unknown;
  evaluaciones: unknown;
}

export interface ErrorConfig {
  archivo: string;
  ruta: string;
  mensaje: string;
}

export type ResultadoConfig =
  { ok: true; config: ConfigAyni } | { ok: false; errores: ErrorConfig[] };

// --- Validación ----------------------------------------------------------------

const ARCHIVOS: Record<keyof ConfigCruda, string> = {
  escena: 'escena.json',
  frases: 'frases.json',
  indicadores: 'indicadores.json',
  zonas: 'zonas.json',
  dispositivos: 'dispositivos.json',
  entornos: 'entornos.json',
  escenarios: 'escenarios.json',
  rutina: 'rutina.json',
  tripulantes: 'tripulantes.json',
  reglasCompuestas: 'reglas-compuestas.json',
  evaluaciones: 'evaluaciones.json',
};

const ESQUEMAS = {
  escena: esquemaEscena,
  frases: esquemaFrases,
  indicadores: z.array(esquemaIndicador),
  zonas: z.array(esquemaZona),
  dispositivos: z.array(esquemaDispositivo),
  entornos: z.array(esquemaEntorno),
  escenarios: z.array(esquemaEscenario),
  rutina: z.array(esquemaTarea),
  tripulantes: esquemaConfigTripulantes,
  reglasCompuestas: esquemaReglasCompuestas,
  evaluaciones: esquemaEvaluaciones,
} as const;

const mapaErroresEs: z.ZodErrorMap = (issue, ctx) => {
  switch (issue.code) {
    case z.ZodIssueCode.invalid_type:
      return issue.received === 'undefined'
        ? { message: 'campo obligatorio ausente' }
        : { message: `se esperaba ${issue.expected} y se recibió ${issue.received}` };
    case z.ZodIssueCode.invalid_enum_value:
      return {
        message: `valor "${String(issue.received)}" no válido; opciones: ${issue.options.join(', ')}`,
      };
    case z.ZodIssueCode.invalid_literal:
      return { message: `se esperaba exactamente ${JSON.stringify(issue.expected)}` };
    case z.ZodIssueCode.invalid_union_discriminator:
      return { message: `tipo no válido; opciones: ${issue.options.join(', ')}` };
    case z.ZodIssueCode.unrecognized_keys:
      return { message: `campos no definidos en el contrato: ${issue.keys.join(', ')}` };
    case z.ZodIssueCode.too_small:
      return issue.type === 'array'
        ? { message: `se requieren al menos ${String(issue.minimum)} elementos` }
        : issue.type === 'string'
          ? { message: 'el texto no puede estar vacío' }
          : { message: `debe ser ${issue.inclusive ? '≥' : '>'} ${String(issue.minimum)}` };
    case z.ZodIssueCode.too_big:
      return issue.type === 'array'
        ? { message: `se permiten como máximo ${String(issue.maximum)} elementos` }
        : { message: `debe ser ${issue.inclusive ? '≤' : '<'} ${String(issue.maximum)}` };
    case z.ZodIssueCode.invalid_string:
      return issue.validation === 'url'
        ? { message: 'debe ser una URL válida' }
        : { message: ctx.defaultError };
    default:
      return { message: ctx.defaultError };
  }
};

function rutaTexto(ruta: (string | number)[], crudo: unknown): string {
  return ruta.reduce<string>((acc, parte, i) => {
    if (typeof parte !== 'number') return acc ? `${acc}.${parte}` : parte;
    const id =
      i === 0 && Array.isArray(crudo)
        ? (crudo[parte] as { id?: unknown } | undefined)?.id
        : undefined;
    return typeof id === 'string' ? `${acc}[${parte}] (${id})` : `${acc}[${parte}]`;
  }, '');
}

function ubicar(lista: { id: string }[], indice: number): string {
  return `[${indice}] (${lista[indice]?.id ?? '?'})`;
}

function validarReferencias(config: ConfigAyni): ErrorConfig[] {
  const errores: ErrorConfig[] = [];
  const agregar = (clave: keyof ConfigCruda, ruta: string, mensaje: string) =>
    errores.push({ archivo: ARCHIVOS[clave], ruta, mensaje });

  const zonas = new Set(config.zonas.map((z) => z.id));
  const indicadores = new Set(config.indicadores.map((i) => i.id));
  const dispositivos = new Set(config.dispositivos.map((d) => d.id));
  const entornos = new Set(config.entornos.map((e) => e.id));
  const tripulantes = new Set(config.tripulantes.tripulantes.map((t) => t.id));
  const { dias } = config.tripulantes.generador;

  const unicos = (clave: keyof ConfigCruda, lista: { id: string }[]) => {
    const vistos = new Set<string>();
    lista.forEach((item, i) => {
      if (vistos.has(item.id)) agregar(clave, `[${i}].id`, `id repetido "${item.id}"`);
      vistos.add(item.id);
    });
  };
  unicos('indicadores', config.indicadores);
  unicos('zonas', config.zonas);
  unicos('dispositivos', config.dispositivos);
  unicos('entornos', config.entornos);
  unicos('escenarios', config.escenarios);
  unicos('rutina', config.rutina);
  unicos('tripulantes', config.tripulantes.tripulantes);

  const dispositivoValido = (id: string) => id === 'manual' || dispositivos.has(id);

  config.indicadores.forEach((ind, i) => {
    const base = ubicar(config.indicadores, i);
    ind.zonas.forEach((z, j) => {
      if (!zonas.has(z))
        agregar('indicadores', `${base}.zonas[${j}]`, `zona "${z}" no existe en zonas.json`);
    });
    if (!dispositivoValido(ind.dispositivo))
      agregar(
        'indicadores',
        `${base}.dispositivo`,
        `dispositivo "${ind.dispositivo}" no existe en dispositivos.json`,
      );
  });

  config.dispositivos.forEach((d, i) => {
    const base = ubicar(config.dispositivos, i);
    d.indicadores.forEach((id, j) => {
      if (!indicadores.has(id))
        agregar(
          'dispositivos',
          `${base}.indicadores[${j}]`,
          `indicador "${id}" no existe en indicadores.json`,
        );
    });
    const sensores = new Set((d.sensores ?? []).map((s) => s.id));
    (d.sensores ?? []).forEach((s, j) => {
      s.indicadores.forEach((id, k) => {
        if (!indicadores.has(id))
          agregar(
            'dispositivos',
            `${base}.sensores[${j}].indicadores[${k}]`,
            `indicador "${id}" no existe en indicadores.json`,
          );
      });
    });
    d.pasos.forEach((p, j) => {
      if (p.sensor && !sensores.has(p.sensor))
        agregar(
          'dispositivos',
          `${base}.pasos[${j}].sensor`,
          `sensor "${p.sensor}" no existe en sensores`,
        );
      if (p.resaltarZona && !zonas.has(p.resaltarZona))
        agregar(
          'dispositivos',
          `${base}.pasos[${j}].resaltarZona`,
          `zona "${p.resaltarZona}" no existe en zonas.json`,
        );
    });
    if (d.pasos.length < 4 || d.pasos.length > 6)
      agregar('dispositivos', `${base}.pasos`, 'cada dispositivo debe tener entre 4 y 6 pasos');
    if (d.erroresComunes.length < 1)
      agregar('dispositivos', `${base}.erroresComunes`, 'se requiere al menos un error común');
  });

  config.entornos.forEach((e, i) => {
    Object.keys(e.ajustes ?? {}).forEach((id) => {
      if (!indicadores.has(id))
        agregar(
          'entornos',
          `${ubicar(config.entornos, i)}.ajustes.${id}`,
          `indicador "${id}" no existe en indicadores.json`,
        );
    });
  });

  config.rutina.forEach((t, i) => {
    const base = ubicar(config.rutina, i);
    t.indicadores.forEach((id, j) => {
      if (!indicadores.has(id))
        agregar(
          'rutina',
          `${base}.indicadores[${j}]`,
          `indicador "${id}" no existe en indicadores.json`,
        );
    });
    if (!dispositivoValido(t.dispositivo))
      agregar(
        'rutina',
        `${base}.dispositivo`,
        `dispositivo "${t.dispositivo}" no existe en dispositivos.json`,
      );
  });

  config.tripulantes.tripulantes.forEach((t, i) => {
    const base = `tripulantes${ubicar(config.tripulantes.tripulantes, i)}`;
    if (!entornos.has(t.entorno as Entorno['id']))
      agregar(
        'tripulantes',
        `${base}.entorno`,
        `entorno "${t.entorno}" no existe en entornos.json`,
      );
    Object.keys(t.desviosPersonales).forEach((id) => {
      if (!indicadores.has(id))
        agregar(
          'tripulantes',
          `${base}.desviosPersonales.${id}`,
          `indicador "${id}" no existe en indicadores.json`,
        );
    });
  });

  config.escenarios.forEach((e, i) => {
    const base = ubicar(config.escenarios, i);
    if (!tripulantes.has(e.tripulanteId))
      agregar(
        'escenarios',
        `${base}.tripulanteId`,
        `tripulante "${e.tripulanteId}" no existe en tripulantes.json`,
      );
    if (e.diaDemo > dias) agregar('escenarios', `${base}.diaDemo`, `debe estar entre 1 y ${dias}`);
    e.alteraciones.forEach((a, j) => {
      if (!indicadores.has(a.indicador))
        agregar(
          'escenarios',
          `${base}.alteraciones[${j}].indicador`,
          `indicador "${a.indicador}" no existe en indicadores.json`,
        );
      if (a.diaFin > dias)
        agregar('escenarios', `${base}.alteraciones[${j}].diaFin`, `debe estar entre 1 y ${dias}`);
    });
  });

  config.reglasCompuestas.multisenal.forEach((m, i) => {
    const base = `multisenal${ubicar(config.reglasCompuestas.multisenal, i)}`;
    m.condiciones.forEach((c, j) => {
      if (!indicadores.has(c.indicador))
        agregar(
          'reglasCompuestas',
          `${base}.condiciones[${j}].indicador`,
          `indicador "${c.indicador}" no existe en indicadores.json`,
        );
    });
    m.zonas.forEach((z, j) => {
      if (!zonas.has(z))
        agregar('reglasCompuestas', `${base}.zonas[${j}]`, `zona "${z}" no existe en zonas.json`);
    });
  });
  config.reglasCompuestas.aptitud.forEach((a, i) => {
    a.zonas.forEach((z, j) => {
      if (!zonas.has(z))
        agregar(
          'reglasCompuestas',
          `aptitud${ubicar(config.reglasCompuestas.aptitud, i)}.zonas[${j}]`,
          `zona "${z}" no existe en zonas.json`,
        );
    });
  });

  const estadosEscena = new Set(config.escena.estados.map((e) => e.id));
  for (const estado of esquemaEstado.options) {
    if (!estadosEscena.has(estado)) agregar('escena', 'estados', `falta el estado "${estado}"`);
  }
  const capasEscena = new Set(config.escena.capas.map((c) => c.id));
  for (const zona of config.zonas) {
    if (!capasEscena.has(zona.capa))
      agregar('escena', 'capas', `falta la capa "${zona.capa}" que usa la zona "${zona.id}"`);
  }
  if (!indicadores.has(config.escena.indicadorAnimo))
    agregar(
      'escena',
      'indicadorAnimo',
      `indicador "${config.escena.indicadorAnimo}" no existe en indicadores.json`,
    );
  config.escena.indicadoresRegistro.forEach((id, i) => {
    if (!indicadores.has(id))
      agregar(
        'escena',
        `indicadoresRegistro[${i}]`,
        `indicador "${id}" no existe en indicadores.json`,
      );
  });
  config.escena.indicadoresDestacados.forEach((id, i) => {
    if (!indicadores.has(id))
      agregar(
        'escena',
        `indicadoresDestacados[${i}]`,
        `indicador "${id}" no existe en indicadores.json`,
      );
  });
  if (!config.escenarios.some((e) => e.id === config.escena.escenarioInicial))
    agregar(
      'escena',
      'escenarioInicial',
      `escenario "${config.escena.escenarioInicial}" no existe en escenarios.json`,
    );
  const modos = new Set(config.escena.modosCapa.map((m) => m.id));
  for (const modo of esquemaModoCapa.options) {
    if (!modos.has(modo)) agregar('escena', 'modosCapa', `falta el modo "${modo}"`);
  }

  const ev = config.evaluaciones;
  const tareas = new Set(config.rutina.map((t) => t.id));
  Object.entries(ev.pvt.indicadores).forEach(([clave, id]) => {
    if (!indicadores.has(id))
      agregar(
        'evaluaciones',
        `pvt.indicadores.${clave}`,
        `indicador "${id}" no existe en indicadores.json`,
      );
  });
  ev.pvt.momentos.forEach((m, i) => {
    if (!tareas.has(m.tarea))
      agregar(
        'evaluaciones',
        `pvt.momentos[${i}].tarea`,
        `tarea "${m.tarea}" no existe en rutina.json`,
      );
  });
  if (!tareas.has(ev.mhcl.tarea))
    agregar('evaluaciones', 'mhcl.tarea', `tarea "${ev.mhcl.tarea}" no existe en rutina.json`);
  const subescalas = new Set(ev.mhcl.subescalas.map((s) => s.id));
  ev.mhcl.subescalas.forEach((s, i) => {
    if (!indicadores.has(s.indicador))
      agregar(
        'evaluaciones',
        `mhcl.subescalas[${i}].indicador`,
        `indicador "${s.indicador}" no existe en indicadores.json`,
      );
  });
  ev.mhcl.items.forEach((it, i) => {
    if (!subescalas.has(it.subescala))
      agregar(
        'evaluaciones',
        `mhcl.items[${i}].subescala`,
        `subescala "${it.subescala}" no existe`,
      );
  });
  for (const s of ev.mhcl.subescalas)
    if (!ev.mhcl.items.some((it) => it.subescala === s.id))
      agregar('evaluaciones', 'mhcl.items', `la subescala "${s.id}" no tiene ítems`);
  ev.textos.mhclAnclas.forEach((a, i) => {
    if (a.valor < ev.mhcl.escalaMin || a.valor > ev.mhcl.escalaMax)
      agregar('evaluaciones', `textos.mhclAnclas[${i}].valor`, 'fuera de la escala de la MHCL');
  });
  if (ev.mhcl.escalaMin >= ev.mhcl.escalaMax)
    agregar('evaluaciones', 'mhcl.escalaMin', 'escalaMin debe ser menor que escalaMax');

  return errores;
}

/** Valida forma (Zod) y referencias cruzadas de todos los archivos de configuración. */
export function validarConfig(crudo: ConfigCruda): ResultadoConfig {
  const errores: ErrorConfig[] = [];
  const config: Partial<ConfigAyni> = {};

  for (const clave of Object.keys(ESQUEMAS) as (keyof ConfigCruda)[]) {
    const resultado = ESQUEMAS[clave].safeParse(crudo[clave], { errorMap: mapaErroresEs });
    if (resultado.success) {
      (config as Record<string, unknown>)[clave] = resultado.data;
    } else {
      for (const issue of resultado.error.issues) {
        errores.push({
          archivo: ARCHIVOS[clave],
          ruta: rutaTexto(issue.path, crudo[clave]) || '(raíz)',
          mensaje: issue.message,
        });
      }
    }
  }

  if (errores.length > 0) return { ok: false, errores };
  const completa = config as ConfigAyni;
  const referencias = validarReferencias(completa);
  return referencias.length > 0
    ? { ok: false, errores: referencias }
    : { ok: true, config: completa };
}

export function formatearErrorConfig(e: ErrorConfig): string {
  return `${e.archivo} > ${e.ruta}: ${e.mensaje}`;
}

export const configCruda: ConfigCruda = {
  escena: escenaJson,
  frases: frasesJson,
  indicadores: indicadoresJson,
  zonas: zonasJson,
  dispositivos: dispositivosJson,
  entornos: entornosJson,
  escenarios: escenariosJson,
  rutina: rutinaJson,
  tripulantes: tripulantesJson,
  reglasCompuestas: reglasCompuestasJson,
  evaluaciones: evaluacionesJson,
};

/** Valida los JSON de src/config incluidos en el bundle. */
export function cargarConfig(): ResultadoConfig {
  return validarConfig(configCruda);
}
