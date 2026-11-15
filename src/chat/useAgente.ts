import { useCallback, useState } from 'react';
import type { ConfigAyni } from '../config/esquemas';
import type { Seleccion } from '../estado/seleccion';
import { useAyni } from '../estado/store';
import { efectosDeRespuesta, type IdsValidos } from './acciones';
import { construirContexto } from './contexto';
import type { PeticionChat, RespuestaChat } from './contrato';
import { responderLocal } from './respaldoLocal';
import type { ImagenAdjunta, MensajeChat } from './tipos';
import { hablar } from './voz';

const TIEMPO_CLIENTE_MS = 30_000;
const MENSAJES_ENVIADOS = 12;

type DispositivoConSensores = ConfigAyni['dispositivos'][number] & {
  sensores?: { id: string }[];
};

export function idsValidos(config: ConfigAyni): IdsValidos {
  const lista = (config.dispositivos as DispositivoConSensores[]).filter((d) => d.sensores?.length);
  const dispositivos = lista.map((d) => ({
    id: d.id,
    sensores: (d.sensores ?? []).map((s) => s.id),
    pasos: d.pasos.length,
  }));
  return {
    zonas: config.zonas.map((z) => z.id),
    indicadores: config.indicadores.map((i) => i.id),
    capas: config.escena.capas.map((c) => c.id),
    sensores: dispositivos.flatMap((d) => d.sensores),
    pasos: Math.max(1, ...dispositivos.map((d) => d.pasos)),
    dispositivos,
  };
}

const horaActual = () => new Date().toTimeString().slice(0, 5);
const nuevoId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

/** Envía preguntas al agente (/api/chat) con respaldo local si no hay conexión o falla. */
export function useAgente(config: ConfigAyni, seleccion: Seleccion) {
  const [pensando, setPensando] = useState(false);

  const enviar = useCallback(
    async (texto: string, imagen?: ImagenAdjunta) => {
      const s = useAyni.getState();
      if (pensando || (!texto.trim() && !imagen)) return;
      const pregunta: MensajeChat = { id: nuevoId(), rol: 'usuario', texto: texto.trim(), imagen };
      s.agregarMensaje(pregunta);
      setPensando(true);

      const contexto = s.motor
        ? construirContexto({
            config,
            seleccion,
            motor: s.motor,
            lecturas: [...s.lecturas, ...s.lecturasManuales],
            idioma: s.idioma,
            pestanaAnterior: s.pestana,
            zonaSeleccionada: s.zonaSeleccionada,
            lienzo: s.lienzo,
            ahoraHHMM: horaActual(),
          })
        : null;

      let respuesta: RespuestaChat | null = null;
      let sinConexion = false;
      if (contexto) {
        const historial = [...useAyni.getState().chat].slice(-MENSAJES_ENVIADOS);
        const cuerpo: PeticionChat = {
          idioma: s.idioma,
          contexto,
          mensajes: historial.map((m) => ({
            rol: m.rol,
            texto: m.texto,
            ...(m.imagen && m.id === pregunta.id ? { imagen: m.imagen } : {}),
          })),
        };
        const control = new AbortController();
        const temporizador = setTimeout(() => control.abort(), TIEMPO_CLIENTE_MS);
        try {
          const r = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(cuerpo),
            signal: control.signal,
          });
          const tipo = r.headers.get('content-type') ?? '';
          if (r.ok && tipo.includes('application/json')) {
            const datos = (await r.json()) as RespuestaChat;
            if (typeof datos.texto === 'string' && datos.texto) respuesta = datos;
          }
        } catch {
          respuesta = null;
        } finally {
          clearTimeout(temporizador);
        }
        if (!respuesta) {
          respuesta = responderLocal(texto, contexto, config);
          sinConexion = true;
        }
      } else {
        respuesta = {
          texto: config.escena.respaldo.noEntiendo,
          llamadas: [],
          respuestasRapidas: [],
          fuentes: [],
        };
        sinConexion = true;
      }

      const actual = useAyni.getState();
      actual.agregarMensaje({
        id: nuevoId(),
        rol: 'asistente',
        texto: respuesta.texto,
        llamadas: respuesta.llamadas,
        respuestasRapidas: respuesta.respuestasRapidas,
        fuentes: respuesta.fuentes,
        sinConexion,
      });
      const efectos = efectosDeRespuesta(respuesta.llamadas, idsValidos(config));
      if (efectos.lienzo) actual.setLienzo(efectos.lienzo);
      if (efectos.pestana && efectos.pestana !== 'agente') actual.setPestana(efectos.pestana);
      if (actual.vozActiva) hablar(respuesta.texto, actual.idioma);
      setPensando(false);
    },
    [config, seleccion, pensando],
  );

  return { enviar, pensando };
}
