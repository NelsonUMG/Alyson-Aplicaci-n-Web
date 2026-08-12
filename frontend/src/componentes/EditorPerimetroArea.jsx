import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import trabajadorMapLibre from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";

maplibregl.setWorkerUrl(trabajadorMapLibre);

const coordenadaParque = [-90.5410824, 14.6391786];
const estiloOpenFreeMap = "https://tiles.openfreemap.org/styles/liberty";
const mosaicosSatelitales = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const fuentePerimetro = "perimetro-area-edicion";
const capaRellenoPerimetro = "perimetro-area-edicion-relleno";
const capaLineaPerimetro = "perimetro-area-edicion-linea";

function datosPerimetro(perimetro) {
  const coordenadas = perimetro.map((vertice) => [Number(vertice.longitud), Number(vertice.latitud)]);
  const caracteristicas = [];
  if (coordenadas.length >= 3) {
    caracteristicas.push({
      type: "Feature",
      properties: { tipo: "poligono" },
      geometry: { type: "Polygon", coordinates: [[...coordenadas, coordenadas[0]]] },
    });
  }
  if (coordenadas.length >= 2) {
    caracteristicas.push({
      type: "Feature",
      properties: { tipo: "linea" },
      geometry: { type: "LineString", coordinates: coordenadas },
    });
  }
  return { type: "FeatureCollection", features: caracteristicas };
}

function crearMarcadorVertice(indice) {
  const elemento = document.createElement("span");
  elemento.className = "editor-perimetro-marcador";
  elemento.textContent = String(indice + 1);
  elemento.setAttribute("aria-hidden", "true");
  return elemento;
}

export function EditorPerimetroArea({ perimetro, alCambiar }) {
  const contenedor = useRef(null);
  const instanciaMapa = useRef(null);
  const marcadores = useRef([]);
  const accionCambiar = useRef(alCambiar);
  const ajusteRealizado = useRef(false);
  const [mapaListo, establecerMapaListo] = useState(false);

  useEffect(() => {
    accionCambiar.current = alCambiar;
  }, [alCambiar]);

  useEffect(() => {
    if (!contenedor.current) return undefined;
    const mapa = new maplibregl.Map({
      container: contenedor.current,
      style: estiloOpenFreeMap,
      center: coordenadaParque,
      zoom: 17,
      minZoom: 14,
      attributionControl: { compact: false },
    });
    instanciaMapa.current = mapa;
    mapa.addControl(new maplibregl.NavigationControl({ showCompass: true, showZoom: true }), "top-right");

    const cargar = () => {
      mapa.addSource("vista-satelital-editor", {
        type: "raster",
        tiles: [mosaicosSatelitales],
        tileSize: 256,
        maxzoom: 19,
        attribution: "Imágenes: Esri, Vantor, Earthstar Geographics y GIS User Community",
      });
      const primeraEtiqueta = mapa.getStyle().layers.find((capa) => capa.type === "symbol")?.id;
      mapa.addLayer({
        id: "vista-satelital-editor",
        type: "raster",
        source: "vista-satelital-editor",
      }, primeraEtiqueta);
      mapa.addSource(fuentePerimetro, { type: "geojson", data: datosPerimetro([]) });
      mapa.addLayer({
        id: capaRellenoPerimetro,
        type: "fill",
        source: fuentePerimetro,
        filter: ["==", ["get", "tipo"], "poligono"],
        paint: { "fill-color": "#d9a62e", "fill-opacity": 0.3 },
      });
      mapa.addLayer({
        id: capaLineaPerimetro,
        type: "line",
        source: fuentePerimetro,
        paint: { "line-color": "#7b2f91", "line-width": 4 },
      });
      establecerMapaListo(true);
    };
    const agregarVertice = (evento) => {
      accionCambiar.current((actual) => [
        ...actual,
        {
          latitud: Number(evento.lngLat.lat.toFixed(8)),
          longitud: Number(evento.lngLat.lng.toFixed(8)),
        },
      ]);
    };
    mapa.on("load", cargar);
    mapa.on("click", agregarVertice);
    return () => {
      mapa.off("load", cargar);
      mapa.off("click", agregarVertice);
      marcadores.current.forEach((marcador) => marcador.remove());
      marcadores.current = [];
      instanciaMapa.current = null;
      mapa.remove();
    };
  }, []);

  useEffect(() => {
    const mapa = instanciaMapa.current;
    if (!mapaListo || !mapa) return;
    mapa.getSource(fuentePerimetro)?.setData(datosPerimetro(perimetro));
    marcadores.current.forEach((marcador) => marcador.remove());
    marcadores.current = perimetro.map((vertice, indice) => new maplibregl.Marker({
      element: crearMarcadorVertice(indice),
      anchor: "center",
    })
      .setLngLat([Number(vertice.longitud), Number(vertice.latitud)])
      .addTo(mapa));
    if (!ajusteRealizado.current && perimetro.length > 0) {
      const limites = new maplibregl.LngLatBounds();
      perimetro.forEach((vertice) => limites.extend([
        Number(vertice.longitud),
        Number(vertice.latitud),
      ]));
      mapa.fitBounds(limites, { padding: 65, maxZoom: 19 });
      ajusteRealizado.current = true;
    }
  }, [mapaListo, perimetro]);

  return (
    <div className="editor-perimetro-area">
      <div className="editor-perimetro-instrucciones">
        <div>
          <strong>Dibujar perímetro de la cancha o campo</strong>
          <p>Haz clic sobre cada esquina en orden. Con tres o más puntos se cerrará el polígono.</p>
        </div>
        <div className="acciones-publicacion">
          <button
            type="button"
            className="boton-secundario"
            disabled={perimetro.length === 0}
            onClick={() => alCambiar((actual) => actual.slice(0, -1))}
          >
            Deshacer último punto
          </button>
          <button
            type="button"
            className="boton-peligro"
            disabled={perimetro.length === 0}
            onClick={() => alCambiar([])}
          >
            Limpiar perímetro
          </button>
        </div>
      </div>
      <div
        className="editor-perimetro-mapa"
        ref={contenedor}
        aria-label="Mapa para dibujar el perímetro del área"
      />
      <p className="editor-perimetro-conteo" role="status">
        {perimetro.length} {perimetro.length === 1 ? "vértice marcado" : "vértices marcados"}.
      </p>
      {perimetro.length > 0 && (
        <ol className="editor-perimetro-coordenadas" aria-label="Coordenadas del perímetro">
          {perimetro.map((vertice, indice) => (
            <li key={`${vertice.latitud}-${vertice.longitud}-${indice}`}>
              <strong>Punto {indice + 1}</strong>
              <span>{Number(vertice.latitud).toFixed(8)}, {Number(vertice.longitud).toFixed(8)}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
