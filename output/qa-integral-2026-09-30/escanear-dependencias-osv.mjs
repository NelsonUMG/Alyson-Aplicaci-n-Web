import { readFile } from "node:fs/promises";

const arbol = JSON.parse(await readFile(new URL("../../backend/target/dependency-tree-updated.json", import.meta.url)));
const dependencias = new Map();

function recorrer(nodo) {
  if (nodo.groupId && nodo.artifactId && nodo.version
      && !["test", "provided", "system"].includes(nodo.scope)) {
    const nombre = `${nodo.groupId}:${nodo.artifactId}`;
    dependencias.set(`${nombre}@${nodo.version}`, { nombre, version: nodo.version });
  }
  for (const hijo of nodo.children || []) recorrer(hijo);
}

recorrer(arbol);
const lista = [...dependencias.values()];
const respuesta = await fetch("https://api.osv.dev/v1/querybatch", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    queries: lista.map(({ nombre, version }) => ({
      package: { ecosystem: "Maven", name: nombre },
      version,
    })),
  }),
  signal: AbortSignal.timeout(60_000),
});
if (!respuesta.ok) throw new Error(`OSV respondió ${respuesta.status}.`);
const datos = await respuesta.json();
const hallazgos = [];
datos.results.forEach((resultado, indice) => {
  for (const vulnerabilidad of resultado.vulns || []) {
    hallazgos.push({
      dependencia: lista[indice].nombre,
      version: lista[indice].version,
      vulnerabilidad: vulnerabilidad.id,
    });
  }
});
const detalles = {};
for (const id of [...new Set(hallazgos.map(({ vulnerabilidad }) => vulnerabilidad))]) {
  const detalle = await fetch(`https://api.osv.dev/v1/vulns/${id}`, {
    signal: AbortSignal.timeout(30_000),
  }).then((resultado) => resultado.json());
  detalles[id] = {
    resumen: detalle.summary,
    severidad: detalle.database_specific?.severity || detalle.severity || null,
    publicado: detalle.published,
    modificado: detalle.modified,
    rangos: (detalle.affected || []).flatMap((afectado) =>
      (afectado.ranges || []).flatMap((rango) => rango.events || [])),
  };
}
console.log(JSON.stringify({ dependenciasConsultadas: lista.length, hallazgos, detalles }, null, 2));
