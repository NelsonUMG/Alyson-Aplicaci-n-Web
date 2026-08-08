import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { calcularRutaMapa, consultarMapa } from "../api/portalPublico";
import { CabeceraPagina } from "../componentes/CabeceraPagina";

const mapaVacio = { nodos: [], conexiones: [], actualizadoEn: null };
const centroParque = { lat: 14.638834, lng: -90.543997 };
const claveGoogleMaps = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim() || "";
const idMapaGoogle = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID?.trim() || "DEMO_MAP_ID";
let promesaGoogleMaps = null;

const estadosBloqueados = new Set(["ENMANTENIMIENTO", "CERRADA", "FUERADESERVICIO", "PENDIENTECONFIRMACION"]);

function obtenerEstadoNodo(nodo) {
  return nodo.estadoCalculadoArea || nodo.estadoArea || "DISPONIBLE";
}

function estaDisponibleNodo(nodo) {
  if (typeof nodo.disponibleAhora === "boolean") return nodo.disponibleAhora;
  return obtenerEstadoNodo(nodo) === "DISPONIBLE";
}

function colorEstadoNodo(nodo) {
  const estado = obtenerEstadoNodo(nodo);
  if (estado === "DISPONIBLE") return "#1f7a55";
  if (estado === "ENUSO") return "#c56f2d";
  if (estadosBloqueados.has(estado)) return "#78837d";
  return "#d9a62e";
}

function claseEstadoNodo(nodo) {
  const estado = obtenerEstadoNodo(nodo).toLowerCase();
  return `mapa-marcador mapa-marcador-${estado}`;
}

function formatearDuracion(milisegundos) {
  const segundosTotales = Math.max(0, Math.floor(milisegundos / 1000));
  const horas = Math.floor(segundosTotales / 3600);
  const minutos = Math.floor((segundosTotales % 3600) / 60);
  const segundos = segundosTotales % 60;
  if (horas > 0) return `${horas}h ${String(minutos).padStart(2, "0")}m`;
  return `${minutos}m ${String(segundos).padStart(2, "0")}s`;
}

function textoReloj(nodo, ahora) {
  if (!nodo.cambiaEstadoEn) return "";
  const objetivo = new Date(nodo.cambiaEstadoEn).getTime();
  const diferencia = objetivo - ahora;
  if (diferencia <= 0) return "Actualizando disponibilidad";
  return obtenerEstadoNodo(nodo) === "ENUSO"
    ? `Libre en ${formatearDuracion(diferencia)}`
    : `Disponible durante ${formatearDuracion(diferencia)}`;
}

function cargarGoogleMaps() {
  if (!claveGoogleMaps) return Promise.reject(new Error("No hay llave pública de Google Maps configurada."));
  if (window.google?.maps?.importLibrary) return Promise.resolve(window.google.maps);
  if (promesaGoogleMaps) return promesaGoogleMaps;
  promesaGoogleMaps = new Promise((resolver, rechazar) => {
    const nombreCallback = "__parqueErickBarrondoGoogleMaps";
    window[nombreCallback] = () => resolver(window.google.maps);
    const guion = document.createElement("script");
    const parametros = new URLSearchParams({
      key: claveGoogleMaps,
      auth_referrer_policy: "origin",
      callback: nombreCallback,
      language: "es",
      libraries: "marker",
      loading: "async",
      region: "GT",
      v: "weekly",
    });
    guion.src = `https://maps.googleapis.com/maps/api/js?${parametros.toString()}`;
    guion.async = true;
    guion.onerror = () => rechazar(new Error("No fue posible cargar Google Maps."));
    document.head.appendChild(guion);
  });
  return promesaGoogleMaps;
}

function distanciaEntrePuntos(latitudUno, longitudUno, latitudDos, longitudDos) {
  const radianes = (grados) => grados * Math.PI / 180;
  const diferenciaLatitud = radianes(latitudDos - latitudUno);
  const diferenciaLongitud = radianes(longitudDos - longitudUno);
  const valor = Math.sin(diferenciaLatitud / 2) ** 2
    + Math.cos(radianes(latitudUno)) * Math.cos(radianes(latitudDos))
    * Math.sin(diferenciaLongitud / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(valor), Math.sqrt(1 - valor));
}

function encontrarNodoCercano(nodos, ubicacion) {
  if (!ubicacion || nodos.length === 0) return null;
  return nodos.reduce((cercano, nodo) => {
    const distancia = distanciaEntrePuntos(
      ubicacion.latitud,
      ubicacion.longitud,
      Number(nodo.latitud),
      Number(nodo.longitud),
    );
    return !cercano || distancia < cercano.distancia ? { nodo, distancia } : cercano;
  }, null);
}

function LienzoMapa({ mapa, ruta }) {
  const lienzo = useRef(null);

  useEffect(() => {
    const elemento = lienzo.current;
    if (!elemento || mapa.nodos.length === 0) return undefined;
    const dibujar = () => {
      const contexto = elemento.getContext?.("2d");
      if (!contexto) return;
      const rectangulo = elemento.getBoundingClientRect();
      const ancho = Math.max(Math.round(rectangulo.width), 680);
      const alto = Math.max(Math.round(rectangulo.height), 430);
      const escala = window.devicePixelRatio || 1;
      elemento.width = ancho * escala;
      elemento.height = alto * escala;
      contexto.setTransform(escala, 0, 0, escala, 0, 0);
      contexto.clearRect(0, 0, ancho, alto);

      const latitudes = mapa.nodos.map((nodo) => Number(nodo.latitud));
      const longitudes = mapa.nodos.map((nodo) => Number(nodo.longitud));
      const minimaLatitud = Math.min(...latitudes);
      const maximaLatitud = Math.max(...latitudes);
      const minimaLongitud = Math.min(...longitudes);
      const maximaLongitud = Math.max(...longitudes);
      const margen = 42;
      const ubicar = (nodo) => ({
        x: margen + ((Number(nodo.longitud) - minimaLongitud) / (maximaLongitud - minimaLongitud || 1))
          * (ancho - margen * 2),
        y: alto - margen - ((Number(nodo.latitud) - minimaLatitud) / (maximaLatitud - minimaLatitud || 1))
          * (alto - margen * 2),
      });
      const porId = new Map(mapa.nodos.map((nodo) => [nodo.idNodoMapa, nodo]));
      const pasos = new Set();
      (ruta?.pasos || []).forEach((paso, indice, arreglo) => {
        if (indice < arreglo.length - 1) {
          pasos.add(`${paso.idNodoMapa}-${arreglo[indice + 1].idNodoMapa}`);
          pasos.add(`${arreglo[indice + 1].idNodoMapa}-${paso.idNodoMapa}`);
        }
      });

      mapa.conexiones.forEach((conexion) => {
        const origen = porId.get(conexion.idNodoOrigen);
        const destino = porId.get(conexion.idNodoDestino);
        if (!origen || !destino) return;
        const puntoOrigen = ubicar(origen);
        const puntoDestino = ubicar(destino);
        const seleccionada = pasos.has(`${conexion.idNodoOrigen}-${conexion.idNodoDestino}`);
        contexto.beginPath();
        contexto.moveTo(puntoOrigen.x, puntoOrigen.y);
        contexto.lineTo(puntoDestino.x, puntoDestino.y);
        contexto.lineWidth = seleccionada ? 6 : 3;
        contexto.strokeStyle = seleccionada ? "#e09b31" : conexion.cerrada ? "#8f8f8f" : "#2f6b52";
        contexto.setLineDash(conexion.cerrada ? [8, 8] : []);
        contexto.stroke();
      });
      contexto.setLineDash([]);

      mapa.nodos.forEach((nodo) => {
        const punto = ubicar(nodo);
        contexto.beginPath();
        contexto.arc(punto.x, punto.y, 10, 0, Math.PI * 2);
        contexto.fillStyle = colorEstadoNodo(nodo);
        contexto.fill();
        contexto.lineWidth = 3;
        contexto.strokeStyle = estaDisponibleNodo(nodo) ? "#ffffff" : "#173b2d";
        contexto.stroke();
        contexto.fillStyle = "#173b2d";
        contexto.font = "600 13px sans-serif";
        contexto.textAlign = "center";
        contexto.fillText(nodo.nombre, punto.x, punto.y - 16);
      });
    };
    dibujar();
    if (typeof window.ResizeObserver === "undefined") return undefined;
    const observador = new window.ResizeObserver(dibujar);
    observador.observe(elemento);
    return () => observador.disconnect();
  }, [mapa, ruta]);

  return (
    <div className="mapa-lienzo" aria-label="Mapa pendiente de habilitación">
      {mapa.nodos.length > 0 ? (
        <canvas className="mapa-grafo" ref={lienzo} />
      ) : (
        <>
          <span className="mapa-ruta mapa-ruta-uno" />
          <span className="mapa-ruta mapa-ruta-dos" />
          <i className="mapa-punto mapa-punto-uno" />
          <i className="mapa-punto mapa-punto-dos" />
          <i className="mapa-punto mapa-punto-tres" />
        </>
      )}
    </div>
  );
}

function MapaGoogle({ mapa, ruta, nodoActivo, alSeleccionarNodo, alError }) {
  const contenedor = useRef(null);
  const instanciaMapa = useRef(null);
  const marcadores = useRef([]);
  const lineaRuta = useRef(null);

  useEffect(() => {
    let cancelado = false;
    if (!contenedor.current || mapa.nodos.length === 0) return undefined;

    cargarGoogleMaps()
      .then(async () => {
        const [{ Map: MapaGoogleClase }, { AdvancedMarkerElement }] = await Promise.all([
          window.google.maps.importLibrary("maps"),
          window.google.maps.importLibrary("marker"),
        ]);
        if (cancelado) return;

        if (!instanciaMapa.current) {
          instanciaMapa.current = new MapaGoogleClase(contenedor.current, {
            center: centroParque,
            zoom: 17,
            mapId: idMapaGoogle,
            mapTypeId: "satellite",
            fullscreenControl: true,
            mapTypeControl: false,
            streetViewControl: false,
          });
        }

        marcadores.current.forEach((marcador) => {
          marcador.map = null;
        });
        marcadores.current = mapa.nodos.map((nodo) => {
          const contenido = document.createElement("button");
          contenido.type = "button";
          contenido.className = claseEstadoNodo(nodo);
          if (nodoActivo?.idNodoMapa === nodo.idNodoMapa) {
            contenido.classList.add("mapa-marcador-activo");
          }
          contenido.style.setProperty("--color-marcador", colorEstadoNodo(nodo));
          const etiqueta = document.createElement("span");
          etiqueta.textContent = nodo.nombreArea ? nodo.nombreArea.slice(0, 2).toUpperCase() : "•";
          contenido.appendChild(etiqueta);
          contenido.addEventListener("click", () => alSeleccionarNodo(nodo));
          const marcador = new AdvancedMarkerElement({
            map: instanciaMapa.current,
            position: { lat: Number(nodo.latitud), lng: Number(nodo.longitud) },
            title: nodo.nombreArea || nodo.nombre,
            content: contenido,
          });
          marcador.addListener("click", () => alSeleccionarNodo(nodo));
          return marcador;
        });

        const limites = new window.google.maps.LatLngBounds();
        mapa.nodos.forEach((nodo) => limites.extend({
          lat: Number(nodo.latitud),
          lng: Number(nodo.longitud),
        }));
        instanciaMapa.current.fitBounds(limites, 52);
        if (mapa.nodos.length === 1) instanciaMapa.current.setZoom(18);

        if (lineaRuta.current) lineaRuta.current.setMap(null);
        const nodosPorId = new Map(mapa.nodos.map((nodo) => [nodo.idNodoMapa, nodo]));
        const camino = (ruta?.pasos || [])
          .map((paso) => nodosPorId.get(paso.idNodoMapa))
          .filter(Boolean)
          .map((nodo) => ({ lat: Number(nodo.latitud), lng: Number(nodo.longitud) }));
        lineaRuta.current = camino.length > 1
          ? new window.google.maps.Polyline({
            path: camino,
            map: instanciaMapa.current,
            strokeColor: "#e09b31",
            strokeOpacity: 0.95,
            strokeWeight: 6,
          })
          : null;
      })
      .catch(() => {
        if (!cancelado) alError();
      });

    return () => {
      cancelado = true;
    };
  }, [mapa.nodos, nodoActivo, ruta, alSeleccionarNodo, alError]);

  useEffect(() => () => {
    marcadores.current.forEach((marcador) => {
      marcador.map = null;
    });
    if (lineaRuta.current) lineaRuta.current.setMap(null);
  }, []);

  return <div className="mapa-google" ref={contenedor} aria-label="Mapa satelital del parque" />;
}

function MapaInteractivo({ mapa, ruta, nodoActivo, alSeleccionarNodo }) {
  const [googleDisponible, establecerGoogleDisponible] = useState(Boolean(claveGoogleMaps));
  const manejarErrorGoogle = useCallback(() => establecerGoogleDisponible(false), []);

  if (googleDisponible && mapa.nodos.length > 0) {
    return (
      <MapaGoogle
        mapa={mapa}
        ruta={ruta}
        nodoActivo={nodoActivo}
        alSeleccionarNodo={alSeleccionarNodo}
        alError={manejarErrorGoogle}
      />
    );
  }

  return <LienzoMapa mapa={mapa} ruta={ruta} />;
}

export function PaginaMapa() {
  const [mapa, establecerMapa] = useState(mapaVacio);
  const [seleccion, establecerSeleccion] = useState({ origen: "", destino: "", accesible: false });
  const [ruta, establecerRuta] = useState(null);
  const [ubicacion, establecerUbicacion] = useState(null);
  const [nodoActivo, establecerNodoActivo] = useState(null);
  const [momentoActual, establecerMomentoActual] = useState(() => Date.now());
  const [estado, establecerEstado] = useState({ cargando: true, error: "", ubicando: false });
  const seguimiento = useRef(null);

  useEffect(() => {
    let vigente = true;
    async function cargarMapa(silencioso = false) {
      try {
        const respuesta = await consultarMapa();
        if (vigente) {
          establecerMapa(respuesta);
          establecerEstado((actual) => ({ ...actual, cargando: false, error: "" }));
        }
      } catch (error) {
        if (vigente && !silencioso) {
          establecerEstado((actual) => ({ ...actual, cargando: false, error: error.message }));
        }
      }
    }
    cargarMapa();
    const actualizacion = window.setInterval(() => cargarMapa(true), 60000);
    return () => {
      vigente = false;
      window.clearInterval(actualizacion);
      if (seguimiento.current !== null && window.navigator.geolocation) {
        window.navigator.geolocation.clearWatch(seguimiento.current);
      }
    };
  }, []);

  useEffect(() => {
    const reloj = window.setInterval(() => establecerMomentoActual(Date.now()), 1000);
    return () => window.clearInterval(reloj);
  }, []);

  useEffect(() => {
    if (!nodoActivo) return;
    const actualizado = mapa.nodos.find((nodo) => nodo.idNodoMapa === nodoActivo.idNodoMapa) || null;
    if (actualizado !== nodoActivo) establecerNodoActivo(actualizado);
  }, [mapa.nodos, nodoActivo]);

  const nodoCercano = useMemo(() => encontrarNodoCercano(mapa.nodos, ubicacion), [mapa.nodos, ubicacion]);
  const nodosConDisponibilidad = useMemo(
    () => mapa.nodos.filter((nodo) => nodo.idArea || nodo.codigoArea || nodo.estadoArea),
    [mapa.nodos],
  );
  const nodoDetalle = nodoActivo || nodosConDisponibilidad[0] || null;

  function iniciarUbicacion() {
    if (!window.navigator.geolocation) {
      establecerEstado((actual) => ({ ...actual, error: "La ubicación no está disponible en este navegador." }));
      return;
    }
    if (seguimiento.current !== null) window.navigator.geolocation.clearWatch(seguimiento.current);
    establecerEstado((actual) => ({ ...actual, error: "", ubicando: true }));
    seguimiento.current = window.navigator.geolocation.watchPosition(
      (posicion) => {
        const nuevaUbicacion = {
          latitud: posicion.coords.latitude,
          longitud: posicion.coords.longitude,
          precision: posicion.coords.accuracy,
        };
        establecerUbicacion(nuevaUbicacion);
        const cercano = encontrarNodoCercano(mapa.nodos, nuevaUbicacion);
        if (cercano) {
          establecerSeleccion((actual) => ({ ...actual, origen: String(cercano.nodo.idNodoMapa) }));
        }
        establecerEstado((actual) => ({ ...actual, ubicando: true, error: "" }));
      },
      () => establecerEstado((actual) => ({
        ...actual,
        ubicando: false,
        error: "No fue posible obtener tu ubicación. Revisa el permiso del navegador e intenta nuevamente.",
      })),
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 },
    );
  }

  function detenerUbicacion() {
    if (seguimiento.current !== null && window.navigator.geolocation) {
      window.navigator.geolocation.clearWatch(seguimiento.current);
      seguimiento.current = null;
    }
    establecerEstado((actual) => ({ ...actual, ubicando: false }));
  }

  async function solicitarRuta(evento) {
    evento.preventDefault();
    establecerRuta(null);
    establecerEstado((actual) => ({ ...actual, cargando: true, error: "" }));
    try {
      const respuesta = await calcularRutaMapa(
        seleccion.origen,
        seleccion.destino,
        seleccion.accesible,
      );
      establecerRuta(respuesta);
      establecerEstado((actual) => ({ ...actual, cargando: false, error: "" }));
    } catch (error) {
      establecerEstado((actual) => ({ ...actual, cargando: false, error: error.message }));
    }
  }

  return (
    <>
      <CabeceraPagina
        etiqueta="Orientación"
        titulo="Mapa del parque"
        descripcion="Ubica entradas, áreas, servicios y recorridos accesibles."
      />
      <section className="portal-seccion">
        <div className="portal-contenedor mapa-contenido">
          <MapaInteractivo
            mapa={mapa}
            ruta={ruta}
            nodoActivo={nodoDetalle}
            alSeleccionarNodo={establecerNodoActivo}
          />
          <aside className="mapa-informacion">
            <p className="portal-sobrelinea">Mapa interactivo</p>
            <h2>Coordenadas pendientes de confirmación</h2>
            <p>El mapa se habilitará únicamente con ubicaciones verificadas por la institución.</p>
            <ul>
              <li>Entradas y salidas</li>
              <li>Áreas deportivas</li>
              <li>Servicios y puntos de interés</li>
              <li>Recorridos accesibles</li>
            </ul>
            {nodosConDisponibilidad.length > 0 && (
              <div className="mapa-disponibilidad" aria-live="polite">
                {nodosConDisponibilidad.map((nodo) => (
                  <button
                    className={nodoDetalle?.idNodoMapa === nodo.idNodoMapa ? "mapa-disponibilidad-activa" : ""}
                    type="button"
                    key={nodo.idNodoMapa}
                    onClick={() => establecerNodoActivo(nodo)}
                  >
                    <span>
                      <strong>{nodo.nombreArea || nodo.nombre}</strong>
                      <small>{textoReloj(nodo, momentoActual) || nodo.notaDisponibilidad || nodo.nombre}</small>
                    </span>
                    <span className="mapa-estado-disponibilidad" style={{ "--color-estado": colorEstadoNodo(nodo) }}>
                      {obtenerEstadoNodo(nodo)}
                    </span>
                  </button>
                ))}
              </div>
            )}
            {nodoDetalle && (
              <div className="mapa-detalle-disponibilidad">
                <strong>{nodoDetalle.nombreArea || nodoDetalle.nombre}</strong>
                <span>{estaDisponibleNodo(nodoDetalle) ? "Disponible" : "No disponible"}</span>
                {textoReloj(nodoDetalle, momentoActual) && <p>{textoReloj(nodoDetalle, momentoActual)}</p>}
                {nodoDetalle.tituloReservaActiva && <p>{nodoDetalle.tituloReservaActiva}</p>}
                {!nodoDetalle.tituloReservaActiva && nodoDetalle.tituloProximaReserva && <p>{nodoDetalle.tituloProximaReserva}</p>}
              </div>
            )}
          </aside>
        </div>
        <div className="portal-contenedor mapa-planificador">
          <div>
            <p className="portal-sobrelinea">Orientación dentro del parque</p>
            <h2>Planifica un recorrido confirmado</h2>
            <p>La ubicación permanece en tu navegador y se usa solamente para sugerir el punto de inicio más cercano.</p>
            <div className="mapa-acciones-ubicacion">
              <button type="button" onClick={iniciarUbicacion}>Usar mi ubicación</button>
              {estado.ubicando && <button type="button" className="boton-secundario" onClick={detenerUbicacion}>Detener ubicación</button>}
            </div>
            {ubicacion && (
              <p className="mapa-precision" role="status">
                Ubicación obtenida con precisión aproximada de {Math.round(ubicacion.precision)} metros.
                {nodoCercano && ` Punto confirmado más cercano: ${nodoCercano.nodo.nombre}.`}
              </p>
            )}
            {estado.error && <p className="portal-mensaje-error" role="alert">{estado.error}</p>}
          </div>
          <form className="mapa-formulario-ruta" onSubmit={solicitarRuta}>
            <label htmlFor="mapa-origen">Origen</label>
            <select id="mapa-origen" required value={seleccion.origen} onChange={(evento) => establecerSeleccion({ ...seleccion, origen: evento.target.value })}>
              <option value="">Selecciona un punto</option>
              {mapa.nodos.map((nodo) => <option key={nodo.idNodoMapa} value={nodo.idNodoMapa}>{nodo.nombre}</option>)}
            </select>
            <label htmlFor="mapa-destino">Destino</label>
            <select id="mapa-destino" required value={seleccion.destino} onChange={(evento) => establecerSeleccion({ ...seleccion, destino: evento.target.value })}>
              <option value="">Selecciona un punto</option>
              {mapa.nodos.map((nodo) => <option key={nodo.idNodoMapa} value={nodo.idNodoMapa}>{nodo.nombre}</option>)}
            </select>
            <label className="campo-verificacion">
              <input type="checkbox" checked={seleccion.accesible} onChange={(evento) => establecerSeleccion({ ...seleccion, accesible: evento.target.checked })} />
              Necesito un recorrido accesible
            </label>
            <button type="submit" disabled={estado.cargando || mapa.nodos.length === 0}>Calcular recorrido</button>
          </form>
          {ruta && (
            <div className="mapa-resultado-ruta" role="status">
              <h3>Recorrido disponible</h3>
              <p>Distancia aproximada: {Number(ruta.distanciaTotalMetros).toLocaleString("es-GT")} metros.</p>
              <ol>{ruta.pasos.map((paso) => <li key={paso.idNodoMapa}>{paso.nombre}</li>)}</ol>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
