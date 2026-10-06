# Ajustes del mapa — 2 de octubre de 2026

## Comportamiento visual

El aviso, su número, su contorno, el punto P y el borde de la cancha acompañan la reducción del terreno al alejarse. No se impone un tamaño mínimo en pantalla ni se reemplaza el aviso por otro diseño. Al acercarse se limita el tamaño a la etiqueta compacta de referencia. Solo el enlace de ubicación inicia el enfoque de la cancha.

Medición real en navegador:

| Vista | Ancho del aviso | Ancho de cancha | Proporción |
| --- | ---: | ---: | ---: |
| Cercana | 113.499 px | 581.750 px | 0.19510 |
| Un nivel más lejos | 56.750 px | 290.875 px | 0.19510 |
| Vista alejada | 7.686 px | 39.396 px | 0.19510 |

Capturas: `mapa-escala-terreno-cerca.jpg`, `mapa-escala-terreno-lejos.jpg` y `mapa-estandar-corregido.jpg`.

## Modo Mapa en blanco

La URL inferida del worker dentro de `.vite/deps` devolvía HTTP 404. Se configuró su URL explícita con `?worker&url`, siguiendo la [documentación de MapLibre para Vite](https://maplibre.org/maplibre-gl-js/docs/#installation), en un módulo compartido por el mapa público y el editor de perímetros.

Con el worker ya cargado, el módulo precompilado de Vite produjo errores `e[n] is not iterable` y mosaicos incompletos. Excluir MapLibre de `optimizeDeps` eliminó esos errores en desarrollo. Se verificó por separado la compilación minificada, que sí incluyó el worker y dibujó ambos modos sin errores de consola. La política CSP permite workers del mismo origen, además de los blob ya permitidos.

## Verificación de este ajuste

- 4/4 pruebas del mapa público y editor de perímetros.
- 10/10 pruebas de seguridad de la API, incluida la política de workers.
- ESLint y compilación aprobados.
- Revisión visual en `127.0.0.1:5173` y vista previa de la compilación en `127.0.0.1:4173`; alternancia Mapa/Satélite correcta.
- Los servicios locales se reiniciaron con la base y los archivos existentes. La verificación automática del administrador usaba credenciales guardadas que fueron rechazadas; se reinició omitiendo esa verificación, sin cambiar la contraseña del usuario.

Paquete actualizado: `output/entregas-produccion/ParqueErickBarrondo-20261002-145924`.

Esta comprobación corresponde a los ajustes del mapa; las cifras de la regresión integral anterior permanecen documentadas en el informe de cierre.
