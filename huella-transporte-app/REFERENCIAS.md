# Referencias y criterios metodológicos

Consulta realizada y actualizada el 21 de julio de 2026. Los factores deben revisarse para cada nuevo año de inventario.

## Metodología general

1. **GHG Protocol, Scope 3, categoría 7:** los desplazamientos domicilio-trabajo se calculan mediante datos de actividad —por ejemplo, persona-kilómetro— y factores de emisión documentados.  
   <https://ghgprotocol.org/scope-3-calculation-guidance-2>

2. **MITECO, guía para desplazamientos in itinere:** referencia española para la clasificación y los factores simplificados de movilidad activa, automóvil, autobús, metro y ferrocarril.  
   <https://www.miteco.gob.es/content/dam/miteco/es/cambio-climatico/temas/mitigacion-politicas-y-medidas/viajesinitinere_tcm30-508472.pdf>

3. **MITECO, factores de emisión 2007–2025:** factores por kilómetro de turismos, motocicletas y ciclomotores; también se utiliza el factor de electricidad de España para localizar vehículos eléctricos.  
   <https://www.miteco.gob.es/content/dam/miteco/es/cambio-climatico/temas/mitigacion-politicas-y-medidas/factoresemision_tcm30-542746.xlsx>

4. **MITECO, viajes por motivos de trabajo:** jerarquía de datos y tratamiento de carretera, ferrocarril, avión y barco.  
   <https://www.miteco.gob.es/content/dam/miteco/es/cambio-climatico/temas/mitigacion-politicas-y-medidas/viajespormotivosdetrabajo_tcm30-486205.pdf>

## Proxies y transporte aéreo

5. **UK Government GHG Conversion Factors 2025, conjunto completo:** proxies de híbrido, taxi, autocar, tranvía y factores de aviación por pasajero-kilómetro. En avión se suma el componente *well-to-tank* y el usuario puede incluir o excluir los efectos climáticos no-CO₂.  
   <https://www.gov.uk/government/publications/greenhouse-gas-reporting-conversion-factors-2025>  
   <https://assets.publishing.service.gov.uk/media/6846a4f55e92539572806125/ghg-conversion-factors-2025-full-set.xlsx>

6. **ICAO Carbon Emissions Calculator:** referencia de contraste para cálculos por ruta, tipo de aeronave, ocupación y carga.  
   <https://www.icao.int/environmental-protection/environmental-tools/icec>

La distancia aérea se estima como gran círculo entre los puntos geocodificados y se incrementa un 8 % para representar desvíos respecto a la ruta ideal. Los factores 2025 utilizados son:

| Tipo | Clase | Con efectos no-CO₂ | Sin efectos no-CO₂ | WTT adicional | Unidad |
|---|---|---:|---:|---:|---|
| Nacional | Pasajero medio | 0,22928 | 0,13552 | 0,03350 | kg CO₂e/pasajero·km |
| Internacional | Pasajero medio | 0,14253 | 0,08420 | 0,02162 | kg CO₂e/pasajero·km |
| Internacional | Turista | 0,10916 | 0,06449 | 0,01656 | kg CO₂e/pasajero·km |
| Internacional | Turista premium | 0,17465 | 0,10318 | 0,02649 | kg CO₂e/pasajero·km |
| Internacional | Business | 0,31656 | 0,18701 | 0,04802 | kg CO₂e/pasajero·km |
| Internacional | Primera | 0,43663 | 0,25794 | 0,06623 | kg CO₂e/pasajero·km |

## Patinetes eléctricos

7. **ADEME Impact CO₂:** para un patinete eléctrico privado, 24,9 g CO₂e/km de ciclo de vida, de los que 2 g corresponden al uso en el contexto francés. La aplicación principal utiliza un consumo eléctrico localizado a España y conserva el valor de ciclo de vida como referencia complementaria.  
   <https://impactco2.fr/outils/transport/trottinette>

8. **Baumgartner et al. (2024):** análisis de ciclo de vida y consumo de patinetes eléctricos privados.  
   <https://doi.org/10.1186/s12302-024-00920-x>

9. **Jia y Gao (2025), 100 ciudades de la UE:** el patinete compartido presenta entre 30 y 124 g CO₂e/km en ciclo de vida. El trabajo publica para España un promedio país de 50,17 g CO₂e/km, utilizado como escenario predeterminado. La fabricación, vida útil, utilización, electricidad y operación explican la amplitud del intervalo.  
   <https://doi.org/10.1016/j.trd.2025.105009>

El factor del patinete compartido no es directamente comparable con factores limitados a la fase de uso, porque incluye ciclo de vida. La interfaz lo declara expresamente y permite reemplazarlo por un dato del operador.

## Cartografía y cálculo de rutas

10. **Leaflet:** representación del mapa y de geometrías GeoJSON/polilíneas.  
    <https://leafletjs.com/reference.html>

11. **OpenStreetMap / Nominatim:** cartografía y geocodificación. La aplicación consulta Nominatim únicamente después de una acción del usuario, sin autocompletado.  
    <https://nominatim.org/release-docs/latest/api/Search/>

12. **Valhalla / FOSSGIS:** motor de rutas para perfiles peatonal, bicicleta, micromovilidad, motocicleta, coche, taxi y autobús. El servidor público es de demostración y está sujeto a uso razonable.  
    <https://valhalla.github.io/valhalla/start/introduction/>  
    <https://valhalla.github.io/valhalla/api/turn-by-turn/api-reference/>

## Consistencia del inventario

- La aplicación muestra el alcance de cada factor y evita describir una estimación como medición.
- Los factores por vehículo-kilómetro se dividen por la ocupación declarada.
- Las distancias de ferrocarril y barco se marcan como aproximadas si no se introducen datos del operador.
- Para híbridos enchufables, autobuses eléctricos, ferris, barcos rápidos y medios no incluidos se exige un factor específico.
- El intervalo mostrado es orientativo: procede del rango publicado o de una banda asociada a la calidad del dato, no de una simulación estadística completa.

## Encuesta, grupos y almacenamiento

13. **IRNAS-CSIC, estructura de investigación:** relación vigente de los 14 grupos utilizada para el desplegable de la encuesta.  
    <https://www.irnas.csic.es/es/>

14. **Google Apps Script, aplicaciones web:** publicación de funciones `doGet` y `doPost` como intermediario entre GitHub Pages y una hoja privada.  
    <https://developers.google.com/apps-script/guides/web>

15. **Google Apps Script, servicio Spreadsheet:** acceso, creación y modificación de hojas de cálculo desde el script.  
    <https://developers.google.com/apps-script/reference/spreadsheet>

16. **AEPD, guía básica de anonimización:** la eliminación de identificadores directos no garantiza por sí sola la anonimización; se debe valorar el riesgo de reidentificación y aplicar salvaguardas.  
    <https://www.aepd.es/documento/guia-basica-anonimizacion.pdf>

17. **AEPD, principios de protección de datos:** minimización, limitación de la finalidad, exactitud, conservación limitada y seguridad.  
    <https://www.aepd.es/derechos-y-deberes/cumple-tus-deberes/principios>

Por este motivo, la herramienta almacena la edad por tramos, no envía direcciones ni coordenadas y oculta comparaciones de grupos con menos de cinco respuestas. La hoja sigue requiriendo control de acceso, finalidad documentada y plazo de eliminación.
