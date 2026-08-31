import { useEffect, useMemo, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import trabajadorMapLibre from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import { calcularRecorridoPeatonal, consultarMapa } from "../api/portalPublico";
import { CabeceraPagina } from "../componentes/CabeceraPagina";
import { formatearTextoTecnico } from "../utilidades/formatoTexto";

const mapaVacio = { nodos: [], conexiones: [], areas: [], actualizadoEn: null };
maplibregl.setWorkerUrl(trabajadorMapLibre);
const coordenadaParque = [-90.5410824, 14.6391786];
const estiloOpenFreeMap = "https://tiles.openfreemap.org/styles/liberty";
const identificadorFuenteRuta = "ruta-parque";
const identificadorCapaRuta = "ruta-parque";
const identificadorFuenteSatelite = "vista-satelital";
const identificadorCapaSatelite = "vista-satelital";
const mosaicosSatelitales = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

const estadosBloqueados = new Set(["ENMANTENIMIENTO", "CERRADA", "FUERADESERVICIO", "PENDIENTECONFIRMACION"]);

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

function distanciaEntrePuntos(latitudUno, longitudUno, latitudDos, longitudDos) {
  const radianes = (grados) => grados * Math.PI / 180;
  const diferenciaLatitud = radianes(latitudDos - latitudUno);
  const diferenciaLongitud = radianes(longitudDos - longitudUno);
  const valor = Math.sin(diferenciaLatitud / 2) ** 2
    + Math.cos(radianes(latitudUno)) * Math.cos(radianes(latitudDos))
    * Math.sin(diferenciaLongitud / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(valor), Math.sqrt(1 - valor));
}

function obtenerCentroArea(area) {
  if (area?.latitudCentro != null && area?.longitudCentro != null) {
    return { latitud: Number(area.latitudCentro), longitud: Number(area.longitudCentro) };
  }
  if (area?.latitud != null && area?.longitud != null) {
    return { latitud: Number(area.latitud), longitud: Number(area.longitud) };
  }
  const perimetro = area?.perimetro || [];
  if (perimetro.length === 0) return null;
  const suma = perimetro.reduce((acumulado, vertice) => ({
    latitud: acumulado.latitud + Number(vertice.latitud),
    longitud: acumulado.longitud + Number(vertice.longitud),
  }), { latitud: 0, longitud: 0 });
  return {
    latitud: Number((suma.latitud / perimetro.length).toFixed(8)),
    longitud: Number((suma.longitud / perimetro.length).toFixed(8)),
  };
}

function formatearTiempoRecorrido(segundos) {
  const minutos = Math.max(1, Math.round(Number(segundos) / 60));
  if (minutos < 60) return `${minutos} min`;
  const horas = Math.floor(minutos / 60);
  const minutosRestantes = minutos % 60;
  return minutosRestantes > 0 ? `${horas} h ${minutosRestantes} min` : `${horas} h`;
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

function coleccionVacia() {
  return { type: "FeatureCollection", features: [] };
}

function MapaInteractivo({
  mapa,
  ruta,
  tipoVista,
  solicitudUbicacion,
  alCambiarTipoVista,
  alActualizarUbicacion,
  alCambiarSeguimiento,
  alErrorUbicacion,
  alErrorMapa,
}) {
  const contenedor = useRef(null);
  const instanciaMapa = useRef(null);
  const geolocalizador = useRef(null);
  const marcadorParque = useRef(null);
  const ajusteInicial = useRef(false);
  const ultimaRutaAjustada = useRef(null);
  const panelInformacion = useRef(null);
  const acciones = useRef({
    alActualizarUbicacion,
    alCambiarSeguimiento,
    alErrorUbicacion,
    alErrorMapa,
  });
  const [mapaListo, establecerMapaListo] = useState(false);
  const [informacionAbierta, establecerInformacionAbierta] = useState(false);

  useEffect(() => {
    acciones.current = {
      alActualizarUbicacion,
      alCambiarSeguimiento,
      alErrorUbicacion,
      alErrorMapa,
    };
  }, [
    alActualizarUbicacion,
    alCambiarSeguimiento,
    alErrorUbicacion,
    alErrorMapa,
  ]);

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

    const controlUbicacion = new maplibregl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true,
      showUserLocation: true,
      showAccuracyCircle: true,
      fitBoundsOptions: { maxZoom: 18 },
    });
    geolocalizador.current = controlUbicacion;
    controlUbicacion.on("geolocate", (evento) => {
      acciones.current.alActualizarUbicacion({
        latitud: evento.coords.latitude,
        longitud: evento.coords.longitude,
        precision: evento.coords.accuracy,
      });
    });
    controlUbicacion.on("trackuserlocationstart", () => acciones.current.alCambiarSeguimiento(true));
    controlUbicacion.on("trackuserlocationend", () => acciones.current.alCambiarSeguimiento(false));
    controlUbicacion.on("error", () => acciones.current.alErrorUbicacion());
    mapaCreado.addControl(controlUbicacion, "top-right");

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
      mapaCreado.addSource(identificadorFuenteRuta, {
        type: "geojson",
        data: coleccionVacia(),
      });
      mapaCreado.addLayer({
        id: identificadorCapaRuta,
        type: "line",
        source: identificadorFuenteRuta,
        paint: {
          "line-color": "#e09b31",
          "line-opacity": 0.95,
          "line-width": 6,
        },
      });
      establecerMapaListo(true);
    };

    mapaCreado.on("load", manejarCarga);

    return () => {
      mapaCreado.off("load", manejarCarga);
      marcadorParque.current?.remove();
      geolocalizador.current = null;
      instanciaMapa.current = null;
      mapaCreado.remove();
    };
  }, []);

  useEffect(() => {
    if (!mapaListo || solicitudUbicacion === 0 || !geolocalizador.current) return;
    const activado = geolocalizador.current.trigger();
    if (!activado) acciones.current.alErrorUbicacion();
  }, [mapaListo, solicitudUbicacion]);

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

    const camino = (ruta?.coordenadas || []).map((coordenada) => [
      Number(coordenada[0]),
      Number(coordenada[1]),
    ]);
    mapaCreado.getSource(identificadorFuenteRuta)?.setData({
      type: "FeatureCollection",
      features: camino.length > 1 ? [{
        type: "Feature",
        properties: {},
        geometry: { type: "LineString", coordinates: camino },
      }] : [],
    });

    if (camino.length > 1 && ultimaRutaAjustada.current !== ruta) {
      const limitesRuta = new maplibregl.LngLatBounds(camino[0], camino[0]);
      camino.slice(1).forEach((coordenada) => limitesRuta.extend(coordenada));
      mapaCreado.fitBounds(limitesRuta, { padding: 70, maxZoom: 18 });
      ultimaRutaAjustada.current = ruta;
    }

    if (!ajusteInicial.current && mapa.nodos.length > 0) {
      const limites = new maplibregl.LngLatBounds(coordenadaParque, coordenadaParque);
      mapa.nodos.forEach((nodo) => limites.extend([Number(nodo.longitud), Number(nodo.latitud)]));
      mapaCreado.fitBounds(limites, { padding: 55, maxZoom: 17 });
      ajusteInicial.current = true;
    }
  }, [mapaListo, mapa.nodos, ruta]);

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
  const [seleccion, establecerSeleccion] = useState({ destino: "" });
  const [ruta, establecerRuta] = useState(null);
  const [ubicacion, establecerUbicacion] = useState(null);
  const [solicitudUbicacion, establecerSolicitudUbicacion] = useState(0);
  const [tipoVista, establecerTipoVista] = useState("satelite");
  const [momentoActual, establecerMomentoActual] = useState(() => Date.now());
  const [solicitudRecorrido, establecerSolicitudRecorrido] = useState(0);
  const [estado, establecerEstado] = useState({ cargando: true, calculandoRuta: false, error: "", ubicando: false });
  const ultimaUbicacionCalculada = useRef(null);

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
    };
  }, []);

  useEffect(() => {
    const reloj = window.setInterval(() => establecerMomentoActual(Date.now()), 1000);
    return () => window.clearInterval(reloj);
  }, []);

  const alertasAreas = useMemo(() => (mapa.areas || []).filter((area) => (
    ["ENUSO", "ENMANTENIMIENTO"].includes(obtenerEstadoNodo(area))
  )), [mapa.areas]);
  const destinosMapa = useMemo(() => {
    const destinos = new Map();
    mapa.nodos.forEach((nodo) => {
      if (!nodo.idArea || destinos.has(nodo.idArea)) return;
      destinos.set(nodo.idArea, {
        idArea: nodo.idArea,
        nombreArea: nodo.nombreArea || nodo.nombre,
        latitud: nodo.latitud,
        longitud: nodo.longitud,
      });
    });
    alertasAreas.forEach((area) => {
      if (!destinos.has(area.idArea)) destinos.set(area.idArea, area);
    });
    return [...destinos.values()].sort((primero, segundo) => (
      primero.nombreArea.localeCompare(segundo.nombreArea, "es-GT")
    ));
  }, [alertasAreas, mapa.nodos]);

  useEffect(() => {
    const idArea = Number(seleccion.destino);
    const areaDestino = destinosMapa.find((area) => area.idArea === idArea);
    const destino = obtenerCentroArea(areaDestino);
    if (!ubicacion || !destino) return undefined;

    const anterior = ultimaUbicacionCalculada.current;
    const desplazamiento = anterior
      ? distanciaEntrePuntos(
          anterior.latitud,
          anterior.longitud,
          ubicacion.latitud,
          ubicacion.longitud,
        )
      : Number.POSITIVE_INFINITY;
    if (anterior?.idArea === idArea
        && anterior.solicitud === solicitudRecorrido
        && desplazamiento < 15) return undefined;

    ultimaUbicacionCalculada.current = {
      idArea,
      latitud: ubicacion.latitud,
      longitud: ubicacion.longitud,
      solicitud: solicitudRecorrido,
    };
    let vigente = true;
    establecerEstado((actual) => ({ ...actual, calculandoRuta: true, error: "" }));
    calcularRecorridoPeatonal(ubicacion, destino)
      .then((recorrido) => {
        if (!vigente) return;
        establecerRuta({ ...recorrido, idArea, nombreDestino: areaDestino.nombreArea });
        establecerEstado((actual) => ({ ...actual, calculandoRuta: false, error: "" }));
      })
      .catch((error) => {
        if (!vigente) return;
        establecerRuta(null);
        establecerEstado((actual) => ({ ...actual, calculandoRuta: false, error: error.message }));
      });
    return () => {
      vigente = false;
    };
  }, [destinosMapa, seleccion.destino, solicitudRecorrido, ubicacion]);

  function cambiarDestino(evento) {
    const destino = evento.target.value;
    establecerSeleccion({ destino });
    establecerRuta(null);
    ultimaUbicacionCalculada.current = null;
    if (!destino) return;
    establecerSolicitudRecorrido((actual) => actual + 1);
    if (!ubicacion) alternarUbicacion();
  }

  function alternarUbicacion() {
    establecerEstado((actual) => ({ ...actual, error: "" }));
    establecerSolicitudUbicacion((actual) => actual + 1);
  }

  function actualizarUbicacion(nuevaUbicacion) {
    establecerUbicacion(nuevaUbicacion);
    establecerEstado((actual) => ({ ...actual, ubicando: true, error: "" }));
  }

  function cambiarSeguimiento(ubicando) {
    establecerEstado((actual) => ({ ...actual, ubicando }));
  }

  function mostrarErrorUbicacion() {
    establecerEstado((actual) => ({
      ...actual,
      ubicando: false,
      error: "No fue posible obtener tu ubicación. Revisa el permiso del navegador e intenta nuevamente.",
    }));
  }

  function solicitarRuta(evento) {
    evento.preventDefault();
    establecerEstado((actual) => ({ ...actual, error: "" }));
    ultimaUbicacionCalculada.current = null;
    establecerSolicitudRecorrido((actual) => actual + 1);
    if (!ubicacion) alternarUbicacion();
  }

  return (
    <>
      <CabeceraPagina
        etiqueta="Orientación"
        titulo="Mapa del parque"
        descripcion="Ubica las áreas y traza recorridos peatonales desde tu posición."
      />
      <section className="portal-seccion">
        <div className="portal-contenedor mapa-contenido">
          <MapaInteractivo
            mapa={mapa}
            ruta={ruta}
            tipoVista={tipoVista}
            solicitudUbicacion={solicitudUbicacion}
            alCambiarTipoVista={establecerTipoVista}
            alActualizarUbicacion={actualizarUbicacion}
            alCambiarSeguimiento={cambiarSeguimiento}
            alErrorUbicacion={mostrarErrorUbicacion}
            alErrorMapa={(mensaje) => establecerEstado((actual) => ({ ...actual, error: mensaje }))}
          />
          <aside className="mapa-informacion">
            <p className="portal-sobrelinea">Mapa interactivo</p>
            <h2>{alertasAreas.length > 0 ? "Avisos activos de las áreas" : "Mapa del Parque Erick Barrondo"}</h2>
            <p>
              {alertasAreas.length > 0
                ? "Solo se muestran las áreas que están en uso o en mantenimiento."
                : "No hay áreas en uso ni en mantenimiento en este momento."}
            </p>
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
          </aside>
        </div>
        <div className="portal-contenedor mapa-planificador">
          <div>
            <p className="portal-sobrelinea">Orientación dentro del parque</p>
            <h2>Cómo llegar a una cancha</h2>
            <p>Selecciona el destino. El GPS tomará tu ubicación actual y el recorrido peatonal aparecerá directamente sobre el mapa.</p>
            <div className="mapa-acciones-ubicacion">
              <button type="button" onClick={alternarUbicacion}>{estado.ubicando ? "Detener ubicación" : "Usar mi ubicación"}</button>
            </div>
            {ubicacion && (
              <p className="mapa-precision" role="status">
                Ubicación obtenida con precisión aproximada de {Math.round(ubicacion.precision)} metros.
              </p>
            )}
            <p className="mapa-aviso-privacidad-ruta">
              Para calcular el camino, las coordenadas se envían temporalmente al servicio de rutas Valhalla con datos de OpenStreetMap. Esta aplicación no las guarda.
            </p>
            {estado.error && <p className="portal-mensaje-error" role="alert">{estado.error}</p>}
          </div>
          <form className="mapa-formulario-ruta" onSubmit={solicitarRuta}>
            <label htmlFor="mapa-destino">Destino</label>
            <select id="mapa-destino" required value={seleccion.destino} onChange={cambiarDestino}>
              <option value="">Selecciona una cancha o área</option>
              {destinosMapa.map((area) => (
                <option key={area.idArea} value={area.idArea}>
                  {area.nombreArea}
                </option>
              ))}
            </select>
            <button type="submit" disabled={estado.calculandoRuta || !seleccion.destino || destinosMapa.length === 0}>
              {estado.calculandoRuta ? "Calculando recorrido..." : ruta ? "Actualizar recorrido" : "Marcar recorrido"}
            </button>
          </form>
          {ruta && (
            <div className="mapa-resultado-ruta" role="status">
              <h3>Recorrido hacia {ruta.nombreDestino}</h3>
              <p>Distancia aproximada: {Number(ruta.distanciaTotalMetros).toLocaleString("es-GT")} metros.</p>
              <p>Tiempo estimado caminando: {formatearTiempoRecorrido(ruta.duracionTotalSegundos)}.</p>
              <ol>{ruta.instrucciones.map((paso, indice) => <li key={`${indice}-${paso.instruccion}`}>{paso.instruccion}</li>)}</ol>
              <small>Ruta calculada con {ruta.proveedor}.</small>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
