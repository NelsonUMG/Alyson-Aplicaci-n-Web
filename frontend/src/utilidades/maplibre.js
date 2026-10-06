import * as maplibregl from "maplibre-gl";
import urlTrabajadorMapa from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";

// Vite debe empaquetar el worker y resolver su URL tanto en desarrollo como en producción.
maplibregl.setWorkerUrl(urlTrabajadorMapa);

export { maplibregl };
