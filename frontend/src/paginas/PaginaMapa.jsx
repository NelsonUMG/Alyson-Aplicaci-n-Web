import { useEffect, useMemo, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import trabajadorMapLibre from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import { calcularRecorridoPeatonal, consultarMapa } from "../api/portalPublico";
import { CabeceraPagina } from "../componentes/CabeceraPagina";

const mapaVacio = { nodos: [], conexiones: [], areas: [], actualizadoEn: null };
maplibregl.setWorkerUrl(trabajadorMapLibre);
const coordenadaParque = [-90.5410824, 14.6391786];
const estiloOpenFreeMap = "https://tiles.openfreemap.org/styles/liberty";
const identificadorFuenteConexiones = "conexiones-parque";
const identificadorCapaConexiones = "conexiones-parque";
const identificadorFuenteRuta = "ruta-parque";
const identificadorCapaRuta = "ruta-parque";
const identificadorFuenteSatelite = "vista-satelital";
const identificadorCapaSatelite = "vista-satelital";
const identificadorFuenteAreas = "areas-parque";
const identificadorCapaRellenoAreas = "areas-parque-relleno";
const identificadorCapaBordeAreas = "areas-parque-borde";
const mosaicosSatelitales = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

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

function coleccionAreas(areas, idAreaActiva) {
  return {
    type: "FeatureCollection",
    features: areas.flatMap((area) => {
      const coordenadas = (area.perimetro || []).map((vertice) => [
        Number(vertice.longitud),
        Number(vertice.latitud),
      ]);
      if (coordenadas.length < 3) return [];
      return [{
        type: "Feature",
        properties: {
          idArea: area.idArea,
          nombre: area.nombreArea,
          estado: obtenerEstadoNodo(area),
          activa: area.idArea === idAreaActiva,
        },
        geometry: { type: "Polygon", coordinates: [[...coordenadas, coordenadas[0]]] },
      }];
    }),
  };
}

function MapaInteractivo({
  mapa,
  ruta,
  tipoVista,
  solicitudUbicacion,
  nodoActivo,
  areaActiva,
  alCambiarTipoVista,
  alSeleccionarNodo,
  alSeleccionarArea,
  alSeleccionarCoordenada,
  alActualizarUbicacion,
  alCambiarSeguimiento,
  alErrorUbicacion,
  alErrorMapa,
}) {
  const contenedor = useRef(null);
  const instanciaMapa = useRef(null);
  const geolocalizador = useRef(null);
  const marcadorParque = useRef(null);
  const marcadorSeleccion = useRef(null);
  const marcadoresNodos = useRef([]);
  const ajusteInicial = useRef(false);
  const ultimaRutaAjustada = useRef(null);
  const panelInformacion = useRef(null);
  const acciones = useRef({
    alSeleccionarCoordenada,
    alActualizarUbicacion,
    alCambiarSeguimiento,
    alErrorUbicacion,
    alErrorMapa,
    alSeleccionarArea,
  });
  const [mapaListo, establecerMapaListo] = useState(false);
  const [informacionAbierta, establecerInformacionAbierta] = useState(false);

  useEffect(() => {
    acciones.current = {
      alSeleccionarCoordenada,
      alActualizarUbicacion,
      alCambiarSeguimiento,
      alErrorUbicacion,
      alErrorMapa,
      alSeleccionarArea,
    };
  }, [
    alSeleccionarCoordenada,
    alActualizarUbicacion,
    alCambiarSeguimiento,
    alErrorUbicacion,
    alErrorMapa,
    alSeleccionarArea,
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

    const manejarSeleccion = (evento) => {
      if (mapaCreado.queryRenderedFeatures?.(evento.point, {
        layers: [identificadorCapaRellenoAreas],
      }).length) return;
      const latitud = Number(evento.lngLat.lat.toFixed(7));
      const longitud = Number(evento.lngLat.lng.toFixed(7));
      if (!marcadorSeleccion.current) {
        marcadorSeleccion.current = new maplibregl.Marker({ color: "#e09b31" })
          .setLngLat([longitud, latitud])
          .addTo(mapaCreado);
      } else {
        marcadorSeleccion.current.setLngLat([longitud, latitud]);
      }
      acciones.current.alSeleccionarCoordenada({ latitud, longitud });
    };

    const manejarSeleccionArea = (evento) => {
      const caracteristica = evento.features?.[0];
      if (!caracteristica) return;
      acciones.current.alSeleccionarArea(Number(caracteristica.properties.idArea));
      const contenido = document.createElement("div");
      const titulo = document.createElement("strong");
      titulo.textContent = caracteristica.properties.nombre;
      const estado = document.createElement("p");
      estado.textContent = caracteristica.properties.estado;
      contenido.append(titulo, estado);
      new maplibregl.Popup({ closeButton: true })
        .setLngLat(evento.lngLat)
        .setDOMContent(contenido)
        .addTo(mapaCreado);
    };

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
      mapaCreado.addSource(identificadorFuenteAreas, {
        type: "geojson",
        data: coleccionVacia(),
      });
      mapaCreado.addLayer({
        id: identificadorCapaRellenoAreas,
        type: "fill",
        source: identificadorFuenteAreas,
        paint: {
          "fill-color": [
            "match", ["get", "estado"],
            "DISPONIBLE", "#1f7a55",
            "ENUSO", "#d97724",
            "ENMANTENIMIENTO", "#a33b32",
            "CERRADA", "#5f6863",
            "FUERADESERVICIO", "#5f6863",
            "#d9a62e",
          ],
          "fill-opacity": ["case", ["boolean", ["get", "activa"], false], 0.55, 0.32],
        },
      });
      mapaCreado.addLayer({
        id: identificadorCapaBordeAreas,
        type: "line",
        source: identificadorFuenteAreas,
        paint: {
          "line-color": [
            "match", ["get", "estado"],
            "DISPONIBLE", "#0c573b",
            "ENUSO", "#944612",
            "ENMANTENIMIENTO", "#72251f",
            "#3e4843",
          ],
          "line-width": ["case", ["boolean", ["get", "activa"], false], 5, 3],
        },
      });
      mapaCreado.addSource(identificadorFuenteConexiones, {
        type: "geojson",
        data: coleccionVacia(),
      });
      mapaCreado.addLayer({
        id: identificadorCapaConexiones,
        type: "line",
        source: identificadorFuenteConexiones,
        paint: {
          "line-color": ["case", ["boolean", ["get", "cerrada"], false], "#8f8f8f", "#2f6b52"],
          "line-opacity": 0.8,
          "line-width": 3,
        },
      });
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

    mapaCreado.on("click", manejarSeleccion);
    mapaCreado.on("click", identificadorCapaRellenoAreas, manejarSeleccionArea);
    mapaCreado.on("load", manejarCarga);

    return () => {
      mapaCreado.off("click", manejarSeleccion);
      mapaCreado.off("click", identificadorCapaRellenoAreas, manejarSeleccionArea);
      mapaCreado.off("load", manejarCarga);
      marcadoresNodos.current.forEach((marcador) => marcador.remove());
      marcadoresNodos.current = [];
      marcadorSeleccion.current?.remove();
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

    marcadoresNodos.current.forEach((marcador) => marcador.remove());
    marcadoresNodos.current = mapa.nodos.map((nodo) => {
      const elemento = document.createElement("button");
      elemento.type = "button";
      elemento.className = claseEstadoNodo(nodo);
      elemento.setAttribute("aria-label", nodo.nombreArea || nodo.nombre);
      if (nodoActivo?.idNodoMapa === nodo.idNodoMapa) elemento.classList.add("mapa-marcador-activo");
      elemento.style.setProperty("--color-marcador", colorEstadoNodo(nodo));
      const etiqueta = document.createElement("span");
      etiqueta.textContent = nodo.nombreArea ? nodo.nombreArea.slice(0, 2).toUpperCase() : "•";
      elemento.appendChild(etiqueta);
      elemento.addEventListener("click", (evento) => {
        evento.stopPropagation();
        alSeleccionarNodo(nodo);
      });
      const popup = document.createElement("div");
      const titulo = document.createElement("strong");
      titulo.textContent = nodo.nombreArea || nodo.nombre;
      const estado = document.createElement("p");
      estado.textContent = obtenerEstadoNodo(nodo);
      popup.append(titulo, estado);
      return new maplibregl.Marker({ element: elemento, anchor: "center" })
        .setLngLat([Number(nodo.longitud), Number(nodo.latitud)])
        .setPopup(new maplibregl.Popup({ offset: 22 }).setDOMContent(popup))
        .addTo(mapaCreado);
    });

    const nodosPorId = new Map(mapa.nodos.map((nodo) => [nodo.idNodoMapa, nodo]));
    const conexiones = mapa.conexiones.flatMap((conexion) => {
      const origen = nodosPorId.get(conexion.idNodoOrigen);
      const destino = nodosPorId.get(conexion.idNodoDestino);
      if (!origen || !destino) return [];
      return [{
        type: "Feature",
        properties: { cerrada: Boolean(conexion.cerrada) },
        geometry: {
          type: "LineString",
          coordinates: [
            [Number(origen.longitud), Number(origen.latitud)],
            [Number(destino.longitud), Number(destino.latitud)],
          ],
        },
      }];
    });
    mapaCreado.getSource(identificadorFuenteConexiones)?.setData({
      type: "FeatureCollection",
      features: conexiones,
    });
    mapaCreado.getSource(identificadorFuenteAreas)?.setData(
      coleccionAreas(mapa.areas || [], areaActiva?.idArea),
    );

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

    if (!ajusteInicial.current && (mapa.nodos.length > 0 || (mapa.areas || []).length > 0)) {
      const limites = new maplibregl.LngLatBounds(coordenadaParque, coordenadaParque);
      mapa.nodos.forEach((nodo) => limites.extend([Number(nodo.longitud), Number(nodo.latitud)]));
      (mapa.areas || []).forEach((area) => area.perimetro.forEach((vertice) => limites.extend([
        Number(vertice.longitud),
        Number(vertice.latitud),
      ])));
      mapaCreado.fitBounds(limites, { padding: 55, maxZoom: 17 });
      ajusteInicial.current = true;
    }
  }, [mapaListo, mapa.nodos, mapa.conexiones, mapa.areas, nodoActivo, areaActiva, ruta, alSeleccionarNodo]);

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
      {(mapa.areas || []).length > 0 && <div className="mapa-leyenda-estados" aria-label="Estados de las áreas">
        <strong>Estado de las áreas</strong>
        <span><i className="mapa-leyenda-disponible" />Disponible</span>
        <span><i className="mapa-leyenda-en-uso" />En uso</span>
        <span><i className="mapa-leyenda-mantenimiento" />En mantenimiento</span>
      </div>}
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
  const [coordenadaSeleccionada, establecerCoordenadaSeleccionada] = useState(null);
  const [solicitudUbicacion, establecerSolicitudUbicacion] = useState(0);
  const [mensajeCoordenadas, establecerMensajeCoordenadas] = useState("");
  const [nodoActivo, establecerNodoActivo] = useState(null);
  const [areaActiva, establecerAreaActiva] = useState(null);
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

  useEffect(() => {
    if (!nodoActivo) return;
    const actualizado = mapa.nodos.find((nodo) => nodo.idNodoMapa === nodoActivo.idNodoMapa) || null;
    if (actualizado !== nodoActivo) establecerNodoActivo(actualizado);
  }, [mapa.nodos, nodoActivo]);

  useEffect(() => {
    if (!areaActiva) return;
    const actualizada = (mapa.areas || []).find((area) => area.idArea === areaActiva.idArea) || null;
    if (actualizada !== areaActiva) establecerAreaActiva(actualizada);
  }, [mapa.areas, areaActiva]);

  const nodosConDisponibilidad = useMemo(
    () => mapa.nodos.filter((nodo) => nodo.idArea || nodo.codigoArea || nodo.estadoArea),
    [mapa.nodos],
  );
  const areasConDisponibilidad = mapa.areas || [];
  const elementosDisponibilidad = areasConDisponibilidad.length > 0
    ? areasConDisponibilidad
    : nodosConDisponibilidad;
  const elementoDetalle = areaActiva || nodoActivo || elementosDisponibilidad[0] || null;

  useEffect(() => {
    const idArea = Number(seleccion.destino);
    const areaDestino = areasConDisponibilidad.find((area) => area.idArea === idArea);
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
  }, [areasConDisponibilidad, seleccion.destino, solicitudRecorrido, ubicacion]);

  function seleccionarNodo(nodo) {
    establecerNodoActivo(nodo);
    establecerAreaActiva(null);
  }

  function seleccionarArea(idArea) {
    const area = areasConDisponibilidad.find((elemento) => elemento.idArea === idArea) || null;
    establecerAreaActiva(area);
    establecerNodoActivo(null);
  }

  function cambiarDestino(evento) {
    const destino = evento.target.value;
    establecerSeleccion({ destino });
    establecerRuta(null);
    ultimaUbicacionCalculada.current = null;
    if (!destino) return;
    seleccionarArea(Number(destino));
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

  function seleccionarCoordenada(coordenada) {
    establecerCoordenadaSeleccionada(coordenada);
    establecerMensajeCoordenadas("");
  }

  async function copiarCoordenadas() {
    if (!coordenadaSeleccionada) return;
    const texto = [
      coordenadaSeleccionada.latitud.toFixed(7),
      coordenadaSeleccionada.longitud.toFixed(7),
    ].join(", ");
    try {
      if (!window.navigator.clipboard?.writeText) throw new Error("Portapapeles no disponible");
      await window.navigator.clipboard.writeText(texto);
      establecerMensajeCoordenadas("Coordenadas copiadas.");
    } catch {
      establecerMensajeCoordenadas("No fue posible copiar las coordenadas.");
    }
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
            nodoActivo={nodoActivo}
            areaActiva={areaActiva}
            alCambiarTipoVista={establecerTipoVista}
            alSeleccionarNodo={seleccionarNodo}
            alSeleccionarArea={seleccionarArea}
            alSeleccionarCoordenada={seleccionarCoordenada}
            alActualizarUbicacion={actualizarUbicacion}
            alCambiarSeguimiento={cambiarSeguimiento}
            alErrorUbicacion={mostrarErrorUbicacion}
            alErrorMapa={(mensaje) => establecerEstado((actual) => ({ ...actual, error: mensaje }))}
          />
          <aside className="mapa-informacion">
            <p className="portal-sobrelinea">Mapa interactivo</p>
            <h2>{elementosDisponibilidad.length > 0 ? "Disponibilidad del parque en tiempo real" : "Mapa real del Parque Erick Barrondo"}</h2>
            <p>
              {elementosDisponibilidad.length > 0
                ? "Consulta las áreas disponibles, ocupadas o cerradas según la información registrada por la institución."
                : "Explora el parque y selecciona puntos para obtener coordenadas exactas. Las instalaciones aparecerán cuando sus ubicaciones sean confirmadas."}
            </p>
            <ul>
              <li>Entradas y salidas</li>
              <li>Áreas deportivas</li>
              <li>Servicios y puntos de interés</li>
              <li>Recorridos peatonales</li>
            </ul>
            {elementosDisponibilidad.length > 0 && (
              <div className="mapa-disponibilidad" aria-live="polite">
                {elementosDisponibilidad.map((elemento) => (
                  <button
                    className={elementoDetalle === elemento ? "mapa-disponibilidad-activa" : ""}
                    type="button"
                    key={elemento.idArea ? `area-${elemento.idArea}` : `nodo-${elemento.idNodoMapa}`}
                    onClick={() => (elemento.perimetro
                      ? seleccionarArea(elemento.idArea)
                      : seleccionarNodo(elemento))}
                  >
                    <span>
                      <strong>{elemento.nombreArea || elemento.nombre}</strong>
                      <small>{textoReloj(elemento, momentoActual) || elemento.notaDisponibilidad || elemento.nombre}</small>
                    </span>
                    <span className="mapa-estado-disponibilidad" style={{ "--color-estado": colorEstadoNodo(elemento) }}>
                      {obtenerEstadoNodo(elemento)}
                    </span>
                  </button>
                ))}
              </div>
            )}
            {elementoDetalle && (
              <div className="mapa-detalle-disponibilidad">
                <strong>{elementoDetalle.nombreArea || elementoDetalle.nombre}</strong>
                <span>{estaDisponibleNodo(elementoDetalle) ? "Disponible" : "No disponible"}</span>
                {textoReloj(elementoDetalle, momentoActual) && <p>{textoReloj(elementoDetalle, momentoActual)}</p>}
                {elementoDetalle.tituloReservaActiva && <p>{elementoDetalle.tituloReservaActiva}</p>}
                {!elementoDetalle.tituloReservaActiva && elementoDetalle.tituloProximaReserva && <p>{elementoDetalle.tituloProximaReserva}</p>}
              </div>
            )}
            {coordenadaSeleccionada && (
              <div className="mapa-coordenada-seleccionada" aria-live="polite">
                <strong>Coordenada seleccionada</strong>
                <span>Latitud: {coordenadaSeleccionada.latitud.toFixed(7)}</span>
                <span>Longitud: {coordenadaSeleccionada.longitud.toFixed(7)}</span>
                <button type="button" onClick={copiarCoordenadas}>Copiar coordenadas</button>
                {mensajeCoordenadas && <small role="status">{mensajeCoordenadas}</small>}
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
              {areasConDisponibilidad.map((area) => (
                <option key={area.idArea} value={area.idArea}>
                  {area.nombreArea} — {obtenerEstadoNodo(area)}
                </option>
              ))}
            </select>
            <button type="submit" disabled={estado.calculandoRuta || !seleccion.destino || areasConDisponibilidad.length === 0}>
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
