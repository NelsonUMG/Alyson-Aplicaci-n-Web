import { useEffect, useMemo, useRef, useState } from "react";
import { maplibregl } from "../utilidades/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { consultarMapa } from "../api/portalPublico";
import { CabeceraPagina } from "../componentes/CabeceraPagina";
import { formatearTextoTecnico } from "../utilidades/formatoTexto";

const mapaVacio = { nodos: [], conexiones: [], areas: [], actualizadoEn: null };
const coordenadaParque = [-90.5410824, 14.6391786];
const zoomDetalleAvisos = 18.5;
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
  if (estado === "ENMANTENIMIENTO") return "#a66508";
  if (estado === "FUERADESERVICIO") return "#b53635";
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

function coordenadasArea(area) {
  if (area.latitudCentro == null || area.longitudCentro == null) return null;
  const latitud = Number(area.latitudCentro);
  const longitud = Number(area.longitudCentro);
  return coordenadasUbicacionValidas(latitud, longitud) ? [longitud, latitud] : null;
}

function perimetroArea(area) {
  const vertices = area.perimetro || [];
  if (vertices.length < 3 || vertices.some((v) => v.latitud == null || v.longitud == null
    || !coordenadasUbicacionValidas(Number(v.latitud), Number(v.longitud)))) return [];
  const puntos = vertices.map((v) => [Number(v.longitud), Number(v.latitud)]);
  return [...puntos, puntos[0]];
}

function datosAreas(areas, idSeleccionado) {
  return {
    type: "FeatureCollection",
    features: areas.flatMap((area) => {
      const puntos = perimetroArea(area);
      return puntos.length ? [{
        type: "Feature",
        properties: { idArea: area.idArea, color: colorEstadoNodo(area), seleccionada: area.idArea === idSeleccionado },
        geometry: { type: "Polygon", coordinates: [puntos] },
      }] : [];
    }),
  };
}

function escalaAvisos(mapa) {
  // El aviso se reduce con el terreno, sin un tamaño mínimo que tape el parque.
  return Math.min(1, 2 ** (mapa.getZoom() - zoomDetalleAvisos));
}

function MapaInteractivo({
  tipoVista,
  ubicacion,
  areas,
  seleccionArea,
  solicitudEnfoque,
  alCambiarTipoVista,
  alErrorMapa,
}) {
  const contenedor = useRef(null);
  const instanciaMapa = useRef(null);
  const marcadorParque = useRef(null);
  const marcadorUbicacion = useRef(null);
  const marcadoresAreas = useRef([]);
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
        attributionControl: { compact: true },
      });
    } catch {
      acciones.current.alErrorMapa("Este navegador no permite mostrar el mapa interactivo.");
      return undefined;
    }
    instanciaMapa.current = mapaCreado;

    const actualizarEscalaAvisos = () => {
      contenedor.current?.style.setProperty("--escala-avisos-mapa", String(escalaAvisos(mapaCreado)));
    };
    actualizarEscalaAvisos();
    mapaCreado.on("zoom", actualizarEscalaAvisos);

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
      mapaCreado.addSource("areas-con-aviso", { type: "geojson", data: datosAreas([], null) });
      mapaCreado.addLayer({
        id: "areas-relleno", type: "fill", source: "areas-con-aviso",
        layout: { visibility: "none" },
        paint: { "fill-color": ["get", "color"] },
      });
      mapaCreado.addLayer({
        id: "areas-borde", type: "line", source: "areas-con-aviso",
        layout: { visibility: "none" },
        paint: { "line-color": ["get", "color"] },
      });
      establecerMapaListo(true);
    };

    mapaCreado.on("style.load", manejarCarga);

    return () => {
      mapaCreado.off("zoom", actualizarEscalaAvisos);
      mapaCreado.off("style.load", manejarCarga);
      marcadorParque.current?.remove();
      marcadorUbicacion.current?.remove();
      marcadoresAreas.current.forEach(({ marcador }) => marcador.remove());
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

    const puntos = areas.map(coordenadasArea).filter(Boolean);
    if (!ajusteInicial.current && puntos.length > 0) {
      const limites = new maplibregl.LngLatBounds(coordenadaParque, coordenadaParque);
      puntos.forEach((punto) => limites.extend(punto));
      mapaCreado.fitBounds(limites, { padding: 55, maxZoom: 17 });
      ajusteInicial.current = true;
    }
  }, [mapaListo, areas]);

  useEffect(() => {
    const mapaCreado = instanciaMapa.current;
    if (!mapaListo || !mapaCreado) return undefined;
    marcadoresAreas.current = areas.flatMap((area, indice) => {
      const coordenadas = coordenadasArea(area);
      if (!coordenadas) return [];
      const elemento = document.createElement("div");
      elemento.className = "mapa-marcador-area";
      elemento.style.setProperty("--color-estado", colorEstadoNodo(area));
      elemento.setAttribute("role", "img");
      elemento.setAttribute("aria-label", `${area.nombreArea}: ${formatearTextoTecnico(obtenerEstadoNodo(area))}`);
      const numero = document.createElement("span");
      numero.className = "mapa-marcador-numero";
      numero.textContent = String(indice + 1);
      const estado = document.createElement("span");
      estado.className = "mapa-marcador-etiqueta";
      estado.textContent = formatearTextoTecnico(obtenerEstadoNodo(area));
      const contenido = document.createElement("span");
      contenido.className = "mapa-marcador-area-contenido";
      contenido.append(numero, estado);
      elemento.append(contenido);
      const marcador = new maplibregl.Marker({ element: elemento, anchor: "center" })
        .setLngLat(coordenadas).addTo(mapaCreado);
      return [{ marcador, elemento, idArea: area.idArea }];
    });
    return () => marcadoresAreas.current.forEach(({ marcador }) => marcador.remove());
  }, [mapaListo, areas]);

  useEffect(() => {
    if (!mapaListo || !instanciaMapa.current) return;
    instanciaMapa.current.getSource("areas-con-aviso")?.setData(datosAreas(areas, seleccionArea?.idArea));
    marcadoresAreas.current.forEach(({ elemento, idArea }) => {
      elemento.classList.toggle("mapa-marcador-area-activa", idArea === seleccionArea?.idArea);
    });
  }, [mapaListo, areas, seleccionArea]);

  useEffect(() => {
    const mapaCreado = instanciaMapa.current;
    const contenedorMapa = contenedor.current;
    if (!mapaListo || !mapaCreado || !contenedorMapa || typeof mapaCreado.project !== "function") return undefined;

    const superposicion = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    superposicion.classList.add("mapa-superposicion-areas");
    superposicion.setAttribute("aria-hidden", "true");
    contenedorMapa.appendChild(superposicion);

    const dibujarPerimetros = () => {
      const ancho = contenedorMapa.clientWidth || 1;
      const alto = contenedorMapa.clientHeight || 1;
      superposicion.setAttribute("viewBox", `0 0 ${ancho} ${alto}`);
      superposicion.replaceChildren();

      areas.forEach((area) => {
        const vertices = perimetroArea(area).slice(0, -1);
        if (vertices.length < 3) return;
        const puntos = vertices.map((coordenada) => {
          const punto = mapaCreado.project(coordenada);
          return `${punto.x},${punto.y}`;
        }).join(" ");
        const poligono = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
        const seleccionada = area.idArea === seleccionArea?.idArea;
        poligono.setAttribute("points", puntos);
        poligono.setAttribute("fill", colorEstadoNodo(area));
        poligono.setAttribute("fill-opacity", seleccionada ? "0.38" : "0.22");
        poligono.setAttribute("stroke", colorEstadoNodo(area));
        poligono.setAttribute("stroke-width", String((seleccionada ? 5 : 3) * escalaAvisos(mapaCreado)));
        poligono.setAttribute("stroke-linejoin", "round");
        poligono.setAttribute("vector-effect", "non-scaling-stroke");
        poligono.dataset.idArea = String(area.idArea);
        superposicion.appendChild(poligono);
      });
    };

    mapaCreado.on("move", dibujarPerimetros);
    mapaCreado.on("resize", dibujarPerimetros);
    dibujarPerimetros();
    return () => {
      mapaCreado.off("move", dibujarPerimetros);
      mapaCreado.off("resize", dibujarPerimetros);
      superposicion.remove();
    };
  }, [mapaListo, areas, seleccionArea]);

  useEffect(() => {
    const mapaCreado = instanciaMapa.current;
    if (!mapaListo || !mapaCreado || !solicitudEnfoque) return;
    const area = solicitudEnfoque.area;
    if (!area || !coordenadasArea(area)) return;
    const coordenadas = coordenadasArea(area);
    const puntos = perimetroArea(area);
    if (puntos.length) {
      const limites = new maplibregl.LngLatBounds(puntos[0], puntos[0]);
      puntos.forEach((punto) => limites.extend(punto));
      mapaCreado.fitBounds(limites, { padding: { top: 125, bottom: 60, left: 60, right: 60 }, maxZoom: 18.5, duration: 900 });
    } else {
      mapaCreado.flyTo({ center: coordenadas, zoom: 18, duration: 900 });
    }
  }, [mapaListo, solicitudEnfoque]);

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
  const [seleccionArea, establecerSeleccionArea] = useState(null);
  const [solicitudEnfoque, establecerSolicitudEnfoque] = useState(null);
  const seccionMapa = useRef(null);

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
    ["ENUSO", "ENMANTENIMIENTO", "FUERADESERVICIO"].includes(obtenerEstadoNodo(area))
  )), [mapa.areas]);

  function seleccionarArea(area) {
    establecerSeleccionArea({ idArea: area.idArea });
    establecerSolicitudEnfoque({ area });
    seccionMapa.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
  }

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
        <div className="portal-contenedor mapa-contenido" ref={seccionMapa}>
          <MapaInteractivo
            tipoVista={tipoVista}
            ubicacion={ubicacion}
            areas={alertasAreas}
            seleccionArea={seleccionArea}
            solicitudEnfoque={solicitudEnfoque}
            alCambiarTipoVista={establecerTipoVista}
            alErrorMapa={establecerError}
          />
          <aside className="mapa-informacion">
            <p className="portal-sobrelinea">Mapa interactivo</p>
            <h2>{alertasAreas.length > 0 ? "Avisos activos de las áreas" : "Mapa del Parque Erick Barrondo"}</h2>
            <p>
              {alertasAreas.length > 0
                ? "Usa “Ver ubicación en el mapa” para acercarte al área."
                : "No hay áreas en uso, en mantenimiento ni fuera de servicio en este momento."}
            </p>
            {alertasAreas.length > 0 && (
              <div className="mapa-disponibilidad" aria-label="Áreas con avisos">
                {alertasAreas.map((elemento) => (
                  <article
                    key={`area-${elemento.idArea}`}
                    className="mapa-tarjeta-area"
                    style={{ "--color-estado": colorEstadoNodo(elemento) }}
                  >
                    <strong>{elemento.nombreArea || elemento.nombre}</strong>
                    {(textoReloj(elemento, momentoActual) || elemento.notaDisponibilidad) && <small>{textoReloj(elemento, momentoActual) || elemento.notaDisponibilidad}</small>}
                    <button
                      type="button"
                      className="mapa-tarjeta-enlace"
                      onClick={() => seleccionarArea(elemento)}
                      disabled={!coordenadasArea(elemento)}
                    >
                      {coordenadasArea(elemento) ? "Ver ubicación en el mapa ↗" : "Ubicación no disponible"}
                    </button>
                  </article>
                ))}
              </div>
            )}
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
            {error && <p className="portal-mensaje-error" role="alert">{error}</p>}
          </aside>
        </div>
      </section>
    </>
  );
}
