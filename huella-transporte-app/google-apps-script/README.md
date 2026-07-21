# Conectar RutaCO₂ con Google Sheets

Esta integración está pensada para una encuesta interna de tamaño moderado. La web permanece en GitHub Pages y Google Apps Script actúa como intermediario: valida y recalcula cada resultado antes de escribirlo en una hoja privada.

## 1. Crear y preparar la hoja

1. Crea una hoja de cálculo vacía en la cuenta institucional que vaya a custodiar los datos.
2. Ponle, por ejemplo, `RutaCO2_IRNAS_respuestas`.
3. Abre **Extensiones → Apps Script**.
4. Sustituye el contenido de `Code.gs` por el del archivo `Code.gs` incluido en esta carpeta.
5. Guarda el proyecto y ejecuta manualmente `setupRutaCO2` una vez.
6. Acepta los permisos solicitados. Se creará la pestaña `respuestas` con las columnas correctas.

No cambies el nombre ni el orden de las columnas. La hoja debe mantenerse privada y compartirse únicamente con las personas responsables del estudio.

## 2. Publicar Apps Script

1. En el editor de Apps Script, pulsa **Implementar → Nueva implementación**.
2. Selecciona **Aplicación web**.
3. Configura **Ejecutar como: yo**.
4. Para una encuesta sin inicio de sesión, selecciona **Quién tiene acceso: cualquier usuario**.
5. Implementa y copia la URL que termina en `/exec`.

El código publicado solo permite guardar o actualizar un registro y devolver estadísticas agregadas. No incluye ninguna operación para leer filas individuales.

## 3. Conectar la web

Abre `config.js` y pega la URL:

```js
window.RUTACO2_CONFIG = Object.freeze({
  apiUrl: "https://script.google.com/macros/s/IDENTIFICADOR/exec",
  minimumSampleSize: 5,
});
```

La URL de Apps Script no es una contraseña. No añadas claves, tokens ni datos de la cuenta de Google al repositorio.

## 4. Probar antes de publicar

1. Sirve la carpeta localmente con `python3 -m http.server 8080`.
2. Calcula una ruta, completa el perfil y pulsa **Guardar y ver mi posición**.
3. Comprueba que aparece una fila en `respuestas`.
4. Cambia algún dato y vuelve a guardar: debe actualizarse la misma fila desde ese navegador.
5. Confirma que no aparecen direcciones ni coordenadas en la hoja.

Las medias, medianas y posiciones globales y por grupo solo se muestran desde 5 respuestas. La posición se ordena de menor a mayor huella: `1` es la menor huella de la muestra.

## Datos almacenados

- Identificador aleatorio generado por el navegador, sin nombre ni correo asociados.
- Sexo, tramo de edad y grupo/unidad.
- Medio, distancia de ida, ida/vuelta, días anuales y ocupación.
- Factor aplicado, distancia anual, emisiones anuales y calidad.
- Tipo de distancia (ruta, estimación o dato manual) y versión de factores.
- Fechas de creación y actualización.

No se almacenan nombre, correo, domicilio, origen, destino ni coordenadas.

## Límites y mantenimiento

- Apps Script tiene cuotas de ejecución; es suficiente para un piloto del tamaño del IRNAS, pero no es un backend para tráfico público elevado.
- Una URL pública puede recibir intentos de spam. Para una difusión abierta fuera del IRNAS conviene añadir CAPTCHA o migrar a un backend con autenticación y limitación de peticiones.
- El identificador anónimo se conserva en `localStorage`. Si una persona cambia de dispositivo o borra los datos del navegador, se generará otro registro.
- Antes de iniciar la encuesta, define responsable, finalidad, periodo de conservación y fecha de eliminación de los datos.
