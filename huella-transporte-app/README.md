# RutaCO₂

Aplicación web para estimar las emisiones de los desplazamientos de trabajadores del IRNAS a partir de una ruta, un medio de transporte y la frecuencia anual. Puede guardar respuestas minimizadas en una hoja privada de Google Sheets y devolver media, mediana y posición en la muestra.

## Puesta en marcha

No necesita compilación ni dependencias locales. Desde esta carpeta:

```bash
python3 -m http.server 8080
```

Después, abre `http://localhost:8080`.

También puede publicarse en GitHub Pages o en cualquier alojamiento de archivos estáticos que sirva HTTPS.

Sin configurar `config.js`, la calculadora funciona normalmente pero el botón de guardado permanece desactivado.

## Qué calcula

- Geocodifica el origen y el destino solo cuando se pulsa **Calcular ruta**.
- Obtiene rutas por la red de OpenStreetMap mediante Valhalla para carretera, bicicleta y desplazamientos peatonales.
- Emplea distancia ortodrómica con corrección documentada para avión, ferrocarril y transporte marítimo cuando no existe un itinerario público fiable.
- Permite sustituir la distancia por un dato de billete, operador u odómetro.
- Aplica ocupación a los factores expresados por vehículo-kilómetro.
- Calcula emisiones por trabajador y año.
- Muestra un intervalo orientativo y la calidad del dato.
- Exporta el resultado como CSV.
- Solicita sexo, tramo de edad y grupo o unidad del IRNAS sin nombre ni correo.
- Guarda o actualiza un único registro por navegador mediante un identificador aleatorio.
- Recalcula el resultado en Apps Script antes de incorporarlo a la muestra.
- Compara la huella con la media, la mediana y la posición global y del grupo.

Fórmula básica:

```text
kg CO2e/año = distancia de ida × viajes diarios × días/año × factor por persona-km / 1000
```

Para factores por vehículo-kilómetro:

```text
factor por persona-km = factor por vehículo-km / ocupantes
```

## Criterios de calidad

- **A:** factor oficial español o dato equivalente de alta calidad.
- **B:** factor calculado y localizado a España, o asimilación cercana.
- **C:** proxy oficial de otro país, benchmark europeo o distancia aproximada.
- **D:** requiere un dato específico para no generar una cifra engañosa.
- **M:** factor introducido por el usuario.

La calidad final empeora automáticamente cuando la distancia solo puede aproximarse geográficamente.

## Uso corporativo

Los servicios públicos de Nominatim, Valhalla y las teselas estándar de OpenStreetMap son adecuados para probar el prototipo, pero no para una implantación corporativa de alto volumen. Para producción:

1. Contrata un proveedor con acuerdo de nivel de servicio o despliega internamente geocodificación, rutas y cartografía.
2. Evita guardar direcciones domiciliarias; conserva únicamente distancia agregada, centro de trabajo, modo y emisiones.
3. Sustituye proxies por datos de operadores y consumos reales.
4. Versiona los factores por año de inventario.
5. Valida una muestra de rutas con billetes, odómetros o planificadores de los operadores.

## Google Sheets

La integración se encuentra en `google-apps-script/Code.gs`. Para activarla:

1. Crea una hoja de cálculo privada.
2. Copia el código en **Extensiones → Apps Script**.
3. Ejecuta `setupRutaCO2` y despliega el script como aplicación web.
4. Pega la URL terminada en `/exec` en `config.js`.

Consulta `google-apps-script/README.md` para ver los pasos completos. La aplicación web no lee la hoja ni puede descargar respuestas individuales: el servicio únicamente acepta un registro validado y devuelve estadísticas agregadas.

### Privacidad estadística

- La edad se guarda por tramos.
- No se envían a la hoja origen, destino, coordenadas, nombre, correo ni número de empleado.
- La comparación de un grupo se oculta mientras haya menos de 5 respuestas.
- El identificador aleatorio solo permite actualizar la fila desde el mismo navegador; no contiene información personal.
- Aunque se han eliminado identificadores directos, la combinación de categorías puede permitir inferencias en grupos pequeños. La hoja debe mantenerse privada, con acceso limitado y un periodo de conservación definido.

## Archivos

- `index.html`: estructura y contenido de la aplicación.
- `styles.css`: diseño adaptable y accesible.
- `factors.js`: catálogo de 35 medios, factores y metadatos.
- `config.js`: URL pública de la aplicación web de Apps Script.
- `app.js`: geocodificación, rutas, cálculos, mapa y exportación.
- `REFERENCIAS.md`: fuentes, límites y decisiones metodológicas.
- `google-apps-script/Code.gs`: validación, cálculo, escritura y estadísticas.
- `google-apps-script/README.md`: despliegue paso a paso en Google Sheets.

## Límites

La herramienta produce estimaciones trazables, no mediciones. Las emisiones reales solo pueden conocerse a partir de combustible, electricidad o datos de operación medidos. El resultado no debe combinarse con factores de ciclo de vida sin declarar el cambio de alcance.

## Historial de cambios

- **1.2 — 21/07/2026:** añadido perfil estadístico minimizado, guardado privado en Google Sheets, recálculo del lado servidor, actualización mediante identificador aleatorio y comparación con media, mediana y posición global y por grupo.
- **1.1 — 20/07/2026:** corregida la carga de los estilos de Leaflet y añadido aislamiento de sus capas para impedir que el mapa se superponga a los formularios o resultados.
