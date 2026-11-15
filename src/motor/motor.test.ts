import { describe, expect, it } from 'vitest';
import { cargarConfig, type ConfigAyni, type Indicador, type Regla } from '../config/esquemas';
import { fechaDeDia, generarLecturas } from '../datos/generador';
import type { EstadoMotor, EstadoZona, Lectura } from '../datos/tipos';
import { estadoDeZona, evaluarAptitud, evaluarMotor } from './estadoZonas';
import { agregarPorDia, calcularLineaBase } from './lineaBase';
import { evaluarIndicador, evaluarMultisenal, peorEstado } from './reglas';
import { construirTarjeta } from './tarjetaAccion';
import { filtrarContexto, validarLecturas } from './validacion';

const resultado = cargarConfig();
if (!resultado.ok) throw new Error('config inválida');
const config: ConfigAyni = resultado.config;
const indicador = (id: string) => config.indicadores.find((i) => i.id === id)!;

/** Lectura del día `dia` (1 = 2026-10-01) a la hora indicada. */
function lec(
  ind: string,
  dia: number,
  valor: number,
  hora = '07:00',
  contexto = 'reposo',
): Lectura {
  const fecha = new Date(Date.UTC(2026, 9, dia)).toISOString().slice(0, 10);
  return {
    tripulanteId: 'A01',
    fechaHora: `${fecha}T${hora}:00Z`,
    indicador: ind,
    valor,
    unidad: indicador(ind)?.unidad ?? '',
    fuente: 'dispositivo',
    contexto,
  };
}
const ref = (dia: number) => new Date(Date.UTC(2026, 9, dia, 23, 59, 59)).toISOString();
/** Serie diaria: un valor por día empezando el día 1. */
const serie = (ind: string, valores: number[]) => valores.map((v, i) => lec(ind, i + 1, v));
const conReglas = (id: string, reglas: Regla[], cambios: Partial<Indicador> = {}): Indicador => ({
  ...indicador(id),
  reglas,
  ...cambios,
});
const BASE = [60, 62, 61, 63, 59, 61, 62, 60, 61, 62];
const LINEA_BASE: Regla = { tipo: 'linea_base', ventanaDias: 14, minDias: 5, zAmbar: 2, zRojo: 3 };

describe('1. validación física', () => {
  it('descarta lecturas fuera de rango y pide repetir', () => {
    const { validas, descartadas } = validarLecturas(
      [lec('pulso_reposo', 1, 64), lec('pulso_reposo', 1, 400), lec('desconocido', 1, 1)],
      config.indicadores,
    );
    expect(validas).toHaveLength(1);
    expect(descartadas).toHaveLength(2);
    expect(descartadas[0].motivo).toBe(
      'Pulso en reposo: 400 lpm está fuera del rango posible (30–220). Repite la medición.',
    );
    expect(descartadas[1].motivo).toContain('no está configurado');
  });
});

describe('2. contexto', () => {
  it('ignora el pulso tomado durante el ejercicio', () => {
    const lecturas = [
      lec('pulso_reposo', 1, 64),
      lec('pulso_reposo', 1, 120, '16:00', 'ejercicio'),
    ];
    expect(filtrarContexto(lecturas, indicador('pulso_reposo')).map((l) => l.valor)).toEqual([64]);
  });
});

describe('3. agregación diaria', () => {
  const dia = [
    lec('glucosa', 1, 90, '07:00'),
    lec('glucosa', 1, 120, '13:00'),
    lec('glucosa', 1, 99, '21:00'),
  ];
  it.each([
    ['promedio', 103],
    ['suma', 309],
    ['max', 120],
    ['min', 90],
    ['ultimo', 99],
  ] as const)('%s', (agregacion, esperado) => {
    expect(agregarPorDia(dia, agregacion)).toEqual([{ dia: '2026-10-01', valor: esperado }]);
  });
});

describe('4. regla linea_base', () => {
  const ind = conReglas('pulso_reposo', [LINEA_BASE]);

  it('marca atención con |z| ≥ 2 y crítico con |z| ≥ 3', () => {
    const atencion = evaluarIndicador(ind, serie('pulso_reposo', [...BASE, 64]), ref(11))!;
    expect(atencion.estado).toBe('atencion');
    expect(atencion.lineaBase).toMatchObject({ media: 61.1, min: 59, max: 63 });
    // "Tu normal" es media ± 2σ: 61,1 ± 2 × 1,197.
    expect(atencion.motivo).toMatch(
      /^Pulso en reposo 64 lpm; tu normal es 58,7–63,5 \(z = 2,\d\)\.$/,
    );
    expect(evaluarIndicador(ind, serie('pulso_reposo', [...BASE, 70]), ref(11))!.estado).toBe(
      'critico',
    );
    expect(evaluarIndicador(ind, serie('pulso_reposo', [...BASE, 62]), ref(11))!.estado).toBe(
      'normal',
    );
  });

  it('devuelve sin_dato con menos de minDias días', () => {
    const ev = evaluarIndicador(ind, serie('pulso_reposo', [60, 61, 62, 70]), ref(4))!;
    expect(ev.estado).toBe('sin_dato');
    expect(ev.z).toBeNull();
    expect(ev.motivo).toContain('faltan días para calcular tu normal (3 de 5)');
  });

  it('usa el 1 % de la media cuando σ = 0', () => {
    const { lineaBase } = calcularLineaBase(
      agregarPorDia(serie('pulso_reposo', [60, 60, 60, 60, 60, 60]), 'promedio'),
      '2026-10-06',
      14,
      5,
    );
    expect(lineaBase?.desv).toBeCloseTo(0.6);
  });

  it('solo usa los ventanaDias días previos', () => {
    const viejos = Array(10).fill(200);
    const ev = evaluarIndicador(
      conReglas('pulso_reposo', [{ ...LINEA_BASE, ventanaDias: 10 }]),
      serie('pulso_reposo', [...viejos, ...BASE, 61]),
      ref(21),
    )!;
    expect(ev.lineaBase?.max).toBe(63);
  });
});

describe('direccionRiesgo', () => {
  const evaluar = (direccion: Indicador['direccionRiesgo'], ultimo: number) =>
    evaluarIndicador(
      conReglas('pulso_reposo', [LINEA_BASE], { direccionRiesgo: direccion }),
      serie('pulso_reposo', [...BASE, ultimo]),
      ref(11),
    )!.estado;

  it('sube: solo es malo subir', () => {
    expect(evaluar('sube', 70)).toBe('critico');
    expect(evaluar('sube', 52)).toBe('normal');
  });
  it('baja: solo es malo bajar', () => {
    expect(evaluar('baja', 70)).toBe('normal');
    expect(evaluar('baja', 52)).toBe('critico');
  });
  it('ambas: cualquier desvío', () => {
    expect(evaluar('ambas', 70)).toBe('critico');
    expect(evaluar('ambas', 52)).toBe('critico');
  });
});

describe('5. regla limite_fijo', () => {
  it('compara el valor diario con ámbar y rojo', () => {
    const ind = conReglas('spo2', [{ tipo: 'limite_fijo', comparador: '<', ambar: 95, rojo: 92 }]);
    expect(evaluarIndicador(ind, [lec('spo2', 1, 97)], ref(1))!.estado).toBe('normal');
    expect(evaluarIndicador(ind, [lec('spo2', 1, 94)], ref(1))!.estado).toBe('atencion');
    const critico = evaluarIndicador(ind, [lec('spo2', 1, 91)], ref(1))!;
    expect(critico.estado).toBe('critico');
    expect(critico.motivo).toBe('Saturación de oxígeno 91 %; fuera del límite (< 92 %).');
  });

  it('con ventanaHoras usa el promedio de la última hora', () => {
    const ind = indicador('co2_cabina');
    const lecturas = [
      lec('co2_cabina', 1, 5, '20:00'),
      lec('co2_cabina', 1, 3.2, '22:00'),
      lec('co2_cabina', 1, 3.6, '23:00'),
    ];
    const ev = evaluarIndicador(ind, lecturas, ref(1))!;
    expect(ev.estado).toBe('atencion');
    expect(ev.motivo).toBe(
      'CO₂ de cabina (1 h) 3,6 mmHg (promedio de 1 h); fuera del límite (> 3 mmHg).',
    );
  });
});

describe('6. regla tendencia', () => {
  const ind = indicador('sueno_horas');
  it('3 noches < 6 h → atención; 3 noches < 5 h → crítico', () => {
    expect(evaluarIndicador(ind, serie('sueno_horas', [7, 5.8, 5.5, 5.9]), ref(4))!.estado).toBe(
      'atencion',
    );
    expect(evaluarIndicador(ind, serie('sueno_horas', [7, 4.8, 4.5, 4.9]), ref(4))!.estado).toBe(
      'critico',
    );
    expect(evaluarIndicador(ind, serie('sueno_horas', [5.8, 6.2, 5.5, 5.9]), ref(4))!.estado).toBe(
      'normal',
    );
  });
  it('exige días consecutivos', () => {
    const conHueco = [lec('sueno_horas', 1, 5), lec('sueno_horas', 3, 5), lec('sueno_horas', 4, 5)];
    expect(evaluarIndicador(ind, conHueco, ref(4))!.estado).toBe('normal');
  });
  it('ánimo ≤ 2 tres días → atención', () => {
    const ev = evaluarIndicador(indicador('animo'), serie('animo', [4, 2, 2, 2]), ref(4))!;
    expect(ev.estado).toBe('atencion');
    expect(ev.motivo).toBe('Estado de ánimo <= 2/5 durante 3 días seguidos (último: 2/5).');
  });
});

describe('7. regla porcentaje_cambio', () => {
  const ind = indicador('masa_corporal');
  it('% de cambio desde el inicio con direccionRiesgo baja', () => {
    expect(evaluarIndicador(ind, serie('masa_corporal', [72, 71, 70]), ref(3))!.estado).toBe(
      'normal',
    );
    const ambar = evaluarIndicador(ind, serie('masa_corporal', [72, 70, 68]), ref(3))!;
    expect(ambar.estado).toBe('atencion');
    expect(ambar.motivo).toBe('Masa corporal 68 kg; -5,6 % desde el inicio (72 kg).');
    expect(evaluarIndicador(ind, serie('masa_corporal', [72, 66, 64]), ref(3))!.estado).toBe(
      'critico',
    );
    expect(evaluarIndicador(ind, serie('masa_corporal', [72, 76, 80]), ref(3))!.estado).toBe(
      'normal',
    );
  });
  it('referencia linea_base usa la media de la ventana', () => {
    const r = conReglas('masa_corporal', [
      { tipo: 'porcentaje_cambio', referencia: 'linea_base', ambarPct: 5, rojoPct: 10 },
    ]);
    expect(evaluarIndicador(r, serie('masa_corporal', [80, 80, 80, 74]), ref(4))!.estado).toBe(
      'atencion',
    );
  });
});

describe('8. regla meta_diaria', () => {
  const ind = indicador('ejercicio_min');
  it('días seguidos sin meta: 2 → atención, 4 → crítico; el día en curso no cuenta', () => {
    expect(evaluarIndicador(ind, serie('ejercicio_min', [95, 95, 50, 50, 0]), ref(5))!.estado).toBe(
      'atencion',
    );
    expect(
      evaluarIndicador(ind, serie('ejercicio_min', [95, 50, 50, 50, 50, 0]), ref(6))!.estado,
    ).toBe('critico');
    expect(evaluarIndicador(ind, serie('ejercicio_min', [95, 95, 95, 50]), ref(4))!.estado).toBe(
      'normal',
    );
  });
  it('un día sin registro cuenta como meta no cumplida', () => {
    const lecturas = [lec('ejercicio_min', 1, 100), lec('ejercicio_min', 4, 100)];
    const ev = evaluarIndicador(ind, lecturas, ref(5))!;
    expect(ev.estado).toBe('normal');
    const sinAyer = evaluarIndicador(ind, [lec('ejercicio_min', 1, 100)], ref(4))!;
    expect(sinAyer.estado).toBe('atencion');
    expect(sinAyer.motivo).toBe(
      'Ejercicio de resistencia: 2 días seguidos por debajo de la meta de 90 min (ayer: 0 min).',
    );
  });
});

describe('9. regla presupuesto', () => {
  const ind = indicador('dosis_radiacion');
  it.each([
    [100, 'normal'],
    [480, 'atencion'],
    [600, 'critico'],
  ] as const)('%s mSv → %s', (valor, estado) => {
    expect(evaluarIndicador(ind, [lec('dosis_radiacion', 1, valor)], ref(1))!.estado).toBe(estado);
  });
});

describe('10. estado de zona y aptitud', () => {
  it('el peor estado manda; sin_dato solo si todos lo son', () => {
    expect(peorEstado(['normal', 'sin_dato', 'atencion'])).toBe('atencion');
    expect(peorEstado(['sin_dato', 'normal'])).toBe('normal');
    expect(peorEstado(['sin_dato'])).toBe('sin_dato');
    expect(estadoDeZona('rinones', config.indicadores, {})).toBe('sin_dato');
  });

  it('aptitud: peor estado de sus zonas, ignorando sin_dato', () => {
    const estados: Record<string, EstadoZona> = {
      corazon: 'normal',
      pulmones: 'sin_dato',
      nervios: 'atencion',
      cerebro: 'normal',
      vascular: 'sin_dato',
      huesos: 'sin_dato',
      musculos: 'sin_dato',
    };
    const aptitud = evaluarAptitud(config.reglasCompuestas.aptitud, estados);
    expect(aptitud.map((a) => a.estado)).toEqual(['atencion', 'atencion', 'normal']);
    const vacia = evaluarAptitud(config.reglasCompuestas.aptitud, {});
    expect(vacia.every((a) => a.estado === 'sin_dato')).toBe(true);
  });
});

describe('11. multiseñal', () => {
  const fatiga = config.reglasCompuestas.multisenal.find((m) => m.id === 'fatiga')!;
  const lecturas = new Map([
    ['pulso_reposo', [lec('pulso_reposo', 10, 70)]],
    ['hrv', [lec('hrv', 10, 40)]],
    ['sueno_horas', [lec('sueno_horas', 10, 5.2)]],
  ]);
  const evaluacion = (indicadorId: string, z: number) => ({
    indicador: indicadorId,
    valor: 0,
    lineaBase: null,
    z,
    estado: 'atencion' as const,
    motivo: '',
  });

  it('se activa con las 3 condiciones dentro de 48 h', () => {
    const ev = { pulso_reposo: evaluacion('pulso_reposo', 2.4), hrv: evaluacion('hrv', -2.2) };
    const alerta = evaluarMultisenal(fatiga, ev, lecturas, ref(10));
    expect(alerta).toMatchObject({
      id: 'fatiga',
      zonas: ['corazon', 'cerebro'],
      estado: 'atencion',
    });
  });

  it('no se activa si falta una condición o las lecturas son viejas', () => {
    const ev = { pulso_reposo: evaluacion('pulso_reposo', 2.4), hrv: evaluacion('hrv', -1.5) };
    expect(evaluarMultisenal(fatiga, ev, lecturas, ref(10))).toBeNull();
    const ok = { pulso_reposo: evaluacion('pulso_reposo', 2.4), hrv: evaluacion('hrv', -2.2) };
    expect(evaluarMultisenal(fatiga, ok, lecturas, ref(13))).toBeNull();
  });
});

describe('12. tarjeta de acción', () => {
  it('usa los textos del indicador peor y siempre trae aviso al médico', () => {
    const zona = config.zonas.find((z) => z.id === 'corazon')!;
    const pulso = evaluarIndicador(
      indicador('pulso_reposo'),
      serie('pulso_reposo', [...BASE, 70]),
      ref(11),
    )!;
    const hrv = evaluarIndicador(indicador('hrv'), serie('hrv', [...BASE, 61]), ref(11))!;
    const tarjeta = construirTarjeta({
      zona,
      estado: 'critico',
      indicadores: config.indicadores,
      evaluaciones: { pulso_reposo: pulso, hrv },
    });
    expect(tarjeta.indicadores.map((e) => e.indicador)).toEqual(['pulso_reposo', 'hrv']);
    expect(tarjeta.queCambio).toBe(pulso.motivo);
    expect(tarjeta.acciones).toEqual(indicador('pulso_reposo').acciones);
    expect(tarjeta.avisoMedico).toBe(indicador('pulso_reposo').avisoMedico);
    expect(tarjeta.funcion).toBe(zona.funcion);
  });
});

describe('motor completo', () => {
  const lecturas = generarLecturas(config);
  const de = (trip: string) => lecturas.filter((l) => l.tripulanteId === trip);
  const enDemo = (escenarioId: string): EstadoMotor => {
    const esc = config.escenarios.find((e) => e.id === escenarioId)!;
    return evaluarMotor(de(esc.tripulanteId), config, fechaDeDia(config, esc.diaDemo));
  };
  const noNormales = (m: EstadoMotor) =>
    Object.fromEntries(
      Object.entries(m.zonas)
        .filter(([, z]) => z.estado === 'atencion' || z.estado === 'critico')
        .map(([id, z]) => [id, z.estado]),
    );
  const aptitud = (m: EstadoMotor) => Object.fromEntries(m.aptitud.map((a) => [a.id, a.estado]));

  it('es puro: misma entrada, misma salida, sin mutar las lecturas', () => {
    const entrada = de('A01');
    const copia = structuredClone(entrada);
    const a = evaluarMotor(entrada, config, fechaDeDia(config, 27));
    const b = evaluarMotor(entrada, config, fechaDeDia(config, 27));
    expect(a).toEqual(b);
    expect(entrada).toEqual(copia);
  });

  it('las zonas sin indicadores quedan sin_dato', () => {
    expect(enDemo('normal').zonas.rinones.estado).toBe('sin_dato');
  });

  it('cada tarjeta fuera de lo normal trae 1 a 3 acciones y aviso al médico', () => {
    for (const esc of config.escenarios) {
      for (const { tarjeta } of Object.values(enDemo(esc.id).zonas)) {
        if (tarjeta.estado !== 'atencion' && tarjeta.estado !== 'critico') continue;
        expect(tarjeta.acciones.length).toBeGreaterThanOrEqual(1);
        expect(tarjeta.acciones.length).toBeLessThanOrEqual(3);
        expect(tarjeta.avisoMedico).not.toBe('');
      }
    }
  });

  describe('escenarios de la sección 4.4.6 en su diaDemo', () => {
    it('normal: todo verde', () => {
      const m = enDemo('normal');
      expect(noNormales(m)).toEqual({});
      expect(m.alertas).toEqual([]);
      expect(aptitud(m)).toEqual({ eva: 'normal', precision: 'normal', gravedad: 'normal' });
    });

    it('deterioro_sueno: cerebro en ámbar sin cruzar límites fijos', () => {
      const m = enDemo('deterioro_sueno');
      expect(noNormales(m)).toEqual({ cerebro: 'atencion' });
      expect(m.indicadores.sueno_horas.estado).toBe('atencion');
      expect(m.alertas).toEqual([]);
    });

    it('multisenal_fatiga: la alerta de fatiga marca corazón y cerebro', () => {
      const m = enDemo('multisenal_fatiga');
      expect(m.alertas.map((a) => a.id)).toEqual(['fatiga']);
      expect(m.alertas[0].indicadores).toEqual(['pulso_reposo', 'hrv', 'sueno_horas']);
      expect(noNormales(m)).toEqual({ corazon: 'atencion', cerebro: 'atencion' });
      const fatiga = config.reglasCompuestas.multisenal.find((x) => x.id === 'fatiga')!;
      for (const zona of ['corazon', 'cerebro']) {
        const { tarjeta } = m.zonas[zona];
        expect(tarjeta.queSignifica).toBe(fatiga.tarjeta.queSignifica);
        expect(tarjeta.queCambio.startsWith('Posible fatiga acumulada:')).toBe(true);
        expect(tarjeta.indicadores.map((e) => e.indicador)).toEqual([
          'pulso_reposo',
          'hrv',
          'sueno_horas',
        ]);
      }
    });

    it('multisenal_fatiga: el día anterior no hay alerta (el deslizador solo cambia la fecha)', () => {
      const m = evaluarMotor(de('A01'), config, fechaDeDia(config, 26));
      expect(m.alertas).toEqual([]);
    });

    it('co2_alto_cefalea: pulmones en ámbar y la tarjeta atribuye la cefalea al ambiente', () => {
      const m = enDemo('co2_alto_cefalea');
      expect(noNormales(m)).toEqual({ pulmones: 'atencion', cerebro: 'atencion' });
      expect(m.alertas.map((a) => a.id)).toEqual(['co2_sintomas']);
      expect(m.zonas.cerebro.tarjeta.queSignifica).toContain('causa sea ambiental');
    });

    it('evento_solar: halo rojo y presupuesto actualizado', () => {
      const m = enDemo('evento_solar');
      expect(noNormales(m)).toEqual({ todo_cuerpo: 'critico' });
      expect(m.indicadores.tasa_dosis_dia.estado).toBe('critico');
      const antes = evaluarMotor(de('A03'), config, fechaDeDia(config, 28)).indicadores
        .dosis_radiacion.valor;
      expect(m.indicadores.dosis_radiacion.valor - antes).toBeCloseTo(12, 1);
    });

    it('preparacion_aterrizaje: vascular en ámbar y "regreso a la gravedad" en ámbar', () => {
      const m = enDemo('preparacion_aterrizaje');
      expect(m.zonas.vascular.estado).toBe('atencion');
      expect(aptitud(m).gravedad).toBe('atencion');
      expect(Object.values(noNormales(m))).not.toContain('critico');
    });
  });
});
