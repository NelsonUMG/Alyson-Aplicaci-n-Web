import { useEffect, useMemo, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import trabajadorMapLibre from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import { consultarMapa } from "../api/portalPublico";
import { CabeceraPagina } from "../componentes/CabeceraPagina";
import { formatearTextoTecnico } from "../utilidades/formatoTexto";

const mapaVacio = { nodos: [], conexiones: [], areas: [], actualizadoEn: null };
maplibregl.setWorkerUrl(trabajadorMapLibre);
const coordenadaParque = [-90.5410824, 14.6391786];
const estiloOpenFreeMap = "https://tiles.openfreemap.org/styles/liberty";
const identificadorFuenteSatelite = "vista-satelital";
const identificadorCapaSatelite = "vista-satelital";
const mosaicosSatelitales = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

const estadosBloqueados = new Set(["ENMANTENIMIENTO", "CERRADA", "FUERADESERVICIO", "PENDIENTECONFIRMACION"]);

function coordenadasUbicacionValidas(latitud, longitud) {
  return Number.isFinite(latitud)
    && Number.isFinite(longitud)
    && latitud >= -90
    && latitud <= 90
    && longitud >= -180
    && longitud <= 180;
}

function obtenerEstadoNodo(nodo) {
  return nodo.estadoCalculadoArea || nodo.estadoArea || "DISPONIBLE";
}

function colorEstadoNodo(nodo) {
  const estado = obtenerEstadoNodo(nodo);
  if (estado === "DISPONIBLE") return "#1f7a55";
  if (estado === "ENUSO") return "#c56f2d";
  if (estadosBloqueados.has(estado)) return "#78837d";
  return "#d9a62e";
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
  return obtenerEstadoNodo(nodo) === "ENUSO" ? `Libre en ${formatearDuracion(diferencia)}` : "";
}

function crearContenidoPopupParque() {
  const contenido = document.createElement("div");
  contenido.className = "mapa-popup-parque";
  const titulo = document.createElement("strong");
  titulo.textContent = "Parque Erick Barrondo";
  const descripcion = document.createElement("p");
  descripcion.textContent = "Centro deportivo y recreativo";
  contenido.append(titulo, descripcion);
  return contenido;
}

function crearContenidoMarcadorParque() {
  const marcador = document.createElement("button");
  marcador.type = "button";
  marcador.className = "mapa-marcador-parque";
  marcador.setAttribute("aria-label", "Parque Erick Barrondo");
  const etiqueta = document.createElement("span");
  etiqueta.textContent = "P";
  marcador.appendChild(etiqueta);
  return marcador;
}

function crearContenidoMarcadorUbicacion() {
  const marcador = document.createElement("span");
  marcador.className = "mapa-marcador-ubicacion";
  marcador.setAttribute("role", "img");
  marcador.setAttribute("aria-label", "Tu ubicación actual");
  return marcador;
}

function MapaInteractivo({
  mapa,
  tipoVista,
  ubicacion,
  alCambiarTipoVista,
  alErrorMapa,
}) {
  const contenedor = useRef(null);
  const instanciaMapa = useRef(null);
  const marcadorParque = useRef(null);
  const marcadorUbicacion = useRef(null);
  const ajusteInicial = useRef(false);
  const panelInformacion = useRef(null);
  const acciones = useRef({ alErrorMapa });
  const [mapaListo, establecerMapaListo] = useState(false);
  const [informacionAbierta, establecerInformacionAbierta] = useState(false);

  useEffect(() => {
    acciones.current = { alErrorMapa };
  }, [alErrorMapa]);

  useEffect(() => {
    if (!contenedor.current) return undefined;
    let mapaCreado;
    try {
      mapaCreado = new maplibregl.Map({
        container: contenedor.current,
        style: estiloOpenFreeMap,
        center: coordenadaParque,
        zoom: 15.5,
        minZoom: 7,
        attributionControl: { compact: false },
      });
    } catch {
      acciones.current.alErrorMapa("Este navegador no permite mostrar el mapa interactivo.");
      return undefined;
    }
    instanciaMapa.current = mapaCreado;

    mapaCreado.addControl(new maplibregl.NavigationControl({
      showCompass: true,
      showZoom: true,
      visualizePitch: true,
    }), "top-right");

    marcadorParque.current = new maplibregl.Marker({
      element: crearContenidoMarcadorParque(),
      anchor: "bottom",
    })
      .setLngLat(coordenadaParque)
      .setPopup(new maplibregl.Popup({ offset: 28 }).setDOMContent(crearContenidoPopupParque()))
      .addTo(mapaCreado);

    const manejarCarga = () => {
      mapaCreado.addSource(identificadorFuenteSatelite, {
        type: "raster",
        tiles: [mosaicosSatelitales],
        tileSize: 256,
        maxzoom: 19,
        attribution: "Imágenes: Esri, Vantor, Earthstar Geographics y GIS User Community",
      });
      const primeraCapaEtiquetas = mapaCreado.getStyle().layers
        .find((capa) => capa.type === "symbol")?.id;
      mapaCreado.addLayer({
        id: identificadorCapaSatelite,
        type: "raster",
        source: identificadorFuenteSatelite,
        layout: { visibility: "visible" },
      }, primeraCapaEtiquetas);
      establecerMapaListo(true);
    };

    mapaCreado.on("load", manejarCarga);

    return () => {
      mapaCreado.off("load", manejarCarga);
      marcadorParque.current?.remove();
      marcadorUbicacion.current?.remove();
      instanciaMapa.current = null;
      mapaCreado.remove();
    };
  }, []);

  useEffect(() => {
    if (!mapaListo || !instanciaMapa.current) return;
    instanciaMapa.current.setLayoutProperty(
      identificadorCapaSatelite,
      "visibility",
      tipoVista === "satelite" ? "visible" : "none",
    );
  }, [mapaListo, tipoVista]);

  useEffect(() => {
    if (!informacionAbierta || typeof panelInformacion.current?.scrollIntoView !== "function") return;
    panelInformacion.current.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [informacionAbierta]);

  useEffect(() => {
    const mapaCreado = instanciaMapa.current;
    if (!mapaListo || !mapaCreado) return;

    if (!ajusteInicial.current && mapa.nodos.length > 0) {
      const limites = new maplibregl.LngLatBounds(coordenadaParque, coordenadaParque);
      mapa.nodos.forEach((nodo) => limites.extend([Number(nodo.longitud), Number(nodo.latitud)]));
      mapaCreado.fitBounds(limites, { padding: 55, maxZoom: 17 });
      ajusteInicial.current = true;
    }
  }, [mapaListo, mapa.nodos]);

  useEffect(() => {
    const mapaCreado = instanciaMapa.current;
    if (!mapaListo || !mapaCreado || !ubicacion) return;

    if (!coordenadasUbicacionValidas(ubicacion.latitud, ubicacion.longitud)) {
      acciones.current.alErrorMapa("La ubicación recibida no contiene coordenadas válidas. Activa el GPS nuevamente.");
      return;
    }

    const coordenadas = [ubicacion.longitud, ubicacion.latitud];
    if (!marcadorUbicacion.current) {
      marcadorUbicacion.current = new maplibregl.Marker({
        element: crearContenidoMarcadorUbicacion(),
        anchor: "center",
      })
        .setLngLat(coordenadas)
        .addTo(mapaCreado);
    } else {
      marcadorUbicacion.current.setLngLat(coordenadas);
    }
    mapaCreado.flyTo({ center: coordenadas, zoom: 17, essential: true });
  }, [mapaListo, ubicacion]);

  return (
    <div className="mapa-visor">
      <div className="mapa-maplibre" ref={contenedor} aria-label="Mapa interactivo del Parque Erick Barrondo" />
      <div className="mapa-selector-vista" role="group" aria-label="Tipo de mapa">
        <button
          type="button"
          aria-pressed={tipoVista === "mapa"}
          onClick={() => alCambiarTipoVista("mapa")}
        >
          Mapa
        </button>
        <button
          type="button"
          aria-pressed={tipoVista === "satelite"}
          onClick={() => alCambiarTipoVista("satelite")}
        >
          Satélite
        </button>
      </div>
      <button
        className="mapa-boton-informacion"
        type="button"
        aria-label="Ver información y atribuciones del mapa"
        aria-expanded={informacionAbierta}
        aria-controls="mapa-panel-informacion"
        onClick={() => establecerInformacionAbierta(true)}
      >
        ⓘ
      </button>
      {informacionAbierta && (
        <section
          className="mapa-panel-informacion"
          id="mapa-panel-informacion"
          ref={panelInformacion}
          role="dialog"
          aria-modal="false"
          aria-labelledby="mapa-titulo-informacion"
        >
          <div className="mapa-panel-informacion-cabecera">
            <h3 id="mapa-titulo-informacion">Información del mapa y atribuciones</h3>
            <button
              type="button"
              aria-label="Cerrar información del mapa"
              onClick={() => establecerInformacionAbierta(false)}
            >
              ×
            </button>
          </div>
          {tipoVista === "mapa" ? (
            <div className="mapa-panel-informacion-seccion">
              <h4>Mapa estándar</h4>
              <ul>
                <li><strong>OpenFreeMap</strong> — proveedor del mapa.</li>
                <li><strong>OpenMapTiles</strong> — tecnología/datos cartográficos.</li>
                <li><strong>OpenStreetMap contributors</strong> — datos geográficos.</li>
                <li><strong>MapLibre GL JS</strong> — motor de visualización.</li>
              </ul>
              <p>OpenFreeMap y los datos cartográficos se utilizan conforme a sus respectivas licencias y requisitos de atribución.</p>
            </div>
          ) : (
            <div className="mapa-panel-informacion-seccion">
              <h4>Imágenes satelitales</h4>
              <ul>
                <li>Esri</li>
                <li>Vantor</li>
                <li>Earthstar Geographics</li>
                <li>GIS User Community</li>
              </ul>
              <p>Las imágenes y datos pertenecen a sus respectivos proveedores y se muestran con la atribución correspondiente.</p>
            </div>
          )}
          <p className="mapa-panel-informacion-aviso">
            Esta aplicación no reclama propiedad sobre los mapas, imágenes satelitales ni datos geográficos de terceros. Las marcas y contenidos pertenecen a sus respectivos propietarios y están sujetos a sus términos y licencias.
          </p>
        </section>
      )}
    </div>
  );
}

export function PaginaMapa() {
  const [mapa, establecerMapa] = useState(mapaVacio);
  const [tipoVista, establecerTipoVista] = useState("satelite");
  const [momentoActual, establecerMomentoActual] = useState(() => Date.now());
  const [error, establecerError] = useState("");
  const [ubicacion, establecerUbicacion] = useState(null);
  const [estadoUbicacion, establecerEstadoUbicacion] = useState("inactiva");
  const [errorUbicacion, establecerErrorUbicacion] = useState("");

  useEffect(() => {
    let vigente = true;
    async function cargarMapa(silencioso = false) {
      try {
        const respuesta = await consultarMapa();
        if (vigente) {
          establecerMapa(respuesta);
          establecerError("");
        }
      } catch (error) {
        if (vigente && !silencioso) {
          establecerError(error.message);
        }
      }
    }
    cargarMapa();
    const actualizacion = window.setInterval(() => cargarMapa(true), 60000);
    return () => {
      vigente = false;
      window.clearInterval(actualizacion);
    };
  }, []);

  useEffect(() => {
    const reloj = window.setInterval(() => establecerMomentoActual(Date.now()), 1000);
    return () => window.clearInterval(reloj);
  }, []);

  const alertasAreas = useMemo(() => (mapa.areas || []).filter((area) => (
    ["ENUSO", "ENMANTENIMIENTO"].includes(obtenerEstadoNodo(area))
  )), [mapa.areas]);

  function solicitarUbicacion() {
    if (!window.navigator.geolocation) {
      establecerErrorUbicacion("Este navegador no permite consultar tu ubicación actual.");
      return;
    }
    establecerEstadoUbicacion("solicitando");
    establecerErrorUbicacion("");
    window.navigator.geolocation.getCurrentPosition(
      (posicion) => {
        const latitud = Number(posicion?.coords?.latitude);
        const longitud = Number(posicion?.coords?.longitude);
        if (!coordenadasUbicacionValidas(latitud, longitud)) {
          establecerEstadoUbicacion("inactiva");
          establecerErrorUbicacion("El GPS devolvió una ubicación inválida. Verifica la señal e inténtalo nuevamente.");
          return;
        }
        establecerUbicacion({
          latitud,
          longitud,
          precision: posicion.coords.accuracy,
        });
        establecerEstadoUbicacion("activa");
      },
      (errorGeolocalizacion) => {
        const mensajes = {
          1: "No autorizaste el acceso a tu ubicación. Puedes habilitarlo desde los permisos del navegador.",
          2: "No fue posible determinar tu ubicación en este momento.",
          3: "La ubicación tardó demasiado. Intenta nuevamente.",
        };
        establecerEstadoUbicacion("inactiva");
        establecerErrorUbicacion(mensajes[errorGeolocalizacion.code] || "No fue posible obtener tu ubicación actual.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  }

  return (
    <>
      <CabeceraPagina
        etiqueta="Orientación"
        titulo="Mapa del parque"
        descripcion="Consulta el mapa y los avisos actuales de las áreas del parque."
      />
      <section className="portal-seccion">
        <div className="portal-contenedor mapa-contenido">
          <MapaInteractivo
            mapa={mapa}
            tipoVista={tipoVista}
            ubicacion={ubicacion}
            alCambiarTipoVista={establecerTipoVista}
            alErrorMapa={establecerError}
          />
          <aside className="mapa-informacion">
            <p className="portal-sobrelinea">Mapa interactivo</p>
            <h2>{alertasAreas.length > 0 ? "Avisos activos de las áreas" : "Mapa del Parque Erick Barrondo"}</h2>
            <p>
              {alertasAreas.length > 0
                ? "Solo se muestran las áreas que están en uso o en mantenimiento."
                : "No hay áreas en uso ni en mantenimiento en este momento."}
            </p>
            <div className="mapa-ubicacion-actual">
              <button
                className="mapa-boton-ubicacion"
                type="button"
                onClick={solicitarUbicacion}
                disabled={estadoUbicacion === "solicitando"}
              >
                {estadoUbicacion === "solicitando" ? "Activando GPS…" : "Activar GPS"}
              </button>
              <p>
                Al continuar, el navegador solicitará permiso para usar el GPS o la ubicación del dispositivo.
              </p>
              {ubicacion && (
                <p className="mapa-precision" role="status">
                  Ubicación actual mostrada en el mapa · precisión aproximada de {Math.round(ubicacion.precision)} metros.
                </p>
              )}
            </div>
            {errorUbicacion && <p className="portal-mensaje-error" role="alert">{errorUbicacion}</p>}
            {alertasAreas.length > 0 && (
              <div className="mapa-disponibilidad" aria-live="polite">
                {alertasAreas.map((elemento) => (
                  <article key={`area-${elemento.idArea}`}>
                    <span>
                      <strong>{elemento.nombreArea || elemento.nombre}</strong>
                      {(textoReloj(elemento, momentoActual) || elemento.notaDisponibilidad) && <small>{textoReloj(elemento, momentoActual) || elemento.notaDisponibilidad}</small>}
                    </span>
                    <span className="mapa-estado-disponibilidad" style={{ "--color-estado": colorEstadoNodo(elemento) }}>
                      {formatearTextoTecnico(obtenerEstadoNodo(elemento))}
                    </span>
                  </article>
                ))}
              </div>
            )}
            {error && <p className="portal-mensaje-error" role="alert">{error}</p>}
          </aside>
        </div>
      </section>
    </>
  );
}
