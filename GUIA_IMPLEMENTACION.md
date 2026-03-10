# Guía de Implementación: Sistema de Firmas Digitales
## Acta de Coformación — Make + Google Apps Script + GitHub Pages

---

## Arquitectura del flujo completo

```
[Google Forms] → [Sheets] → [Make: envía links de firma por email]
                                      ↓
                          [Tutor / Profesor / Estudiante]
                          [firman en página web (GitHub Pages)]
                                      ↓
                          [Google Apps Script recibe firmas]
                          [guarda PNGs en Drive]
                          [cuando las 3 están listas → webhook]
                                      ↓
                          [Make: descarga firmas + genera documento]
                          [envía PDF final por Gmail]
```

---

## PARTE 1 — Subir la página de firma a GitHub Pages

### Paso 1.1 — Preparar el repositorio

1. Ve a **github.com** e inicia sesión
2. Crea un nuevo repositorio: botón **"New"** → nombre: `firma-acta` → **Public** → **Create repository**
3. Haz clic en **"creating a new file"**
4. Nombre del archivo: `index.html`
5. Pega el contenido del archivo `firma.html` entregado
6. Haz clic en **"Commit changes"**

### Paso 1.2 — Activar GitHub Pages

1. En el repositorio, ve a **Settings** → **Pages** (menú lateral izquierdo)
2. En *Source*, selecciona **Deploy from a branch**
3. En *Branch*, selecciona **main** y carpeta **/ (root)**
4. Haz clic en **Save**
5. Espera 2-3 minutos. La URL de tu página será:
   ```
   https://TU_USUARIO.github.io/firma-acta/
   ```

---

## PARTE 2 — Configurar Google Apps Script

### Paso 2.1 — Crear la hoja de control de firmas

1. Abre **Google Sheets** → crea un nuevo documento
2. Nómbralo: `Control de Firmas`
3. Copia el **ID** de la URL:
   ```
   https://docs.google.com/spreadsheets/d/  →ESTE_ES_EL_ID←  /edit
   ```

### Paso 2.2 — Crear carpeta en Drive para las firmas

1. Abre **Google Drive** → crea carpeta llamada `Firmas Digitales`
2. Copia el **ID** de la URL:
   ```
   https://drive.google.com/drive/folders/  →ESTE_ES_EL_ID←
   ```

### Paso 2.3 — Desplegar el script

1. Ve a **script.google.com** → **Nuevo proyecto**
2. Elimina el código existente y pega el contenido de `apps_script_firmas.js`
3. Reemplaza los 3 valores en la parte superior:
   ```javascript
   const CARPETA_FIRMAS_ID = "ID_DE_TU_CARPETA_FIRMAS";
   const SHEET_CONTROL_ID  = "ID_DE_TU_HOJA_CONTROL";
   // El webhook de Make lo agregas en el Paso 4
   ```
4. Haz clic en **Implementar** → **Nueva implementación**
5. Tipo: **Aplicación web**
6. Configuración:
   - *Ejecutar como:* **Yo**
   - *Quién tiene acceso:* **Cualquier persona**
7. Haz clic en **Implementar** → autoriza los permisos
8. **Copia la URL** que aparece — la necesitas en dos lugares:
   - En `firma.html` (línea `const APPS_SCRIPT_URL = "..."`)
   - Para probar que funciona: ábrela en el navegador, debe mostrar `✅ Script de firmas activo`

### Paso 2.4 — Actualizar la URL en firma.html

1. Abre el archivo `index.html` en GitHub
2. Haz clic en el ícono de lápiz (editar)
3. Busca la línea:
   ```javascript
   const APPS_SCRIPT_URL = "https://script.google.com/macros/s/TU_SCRIPT_ID_AQUI/exec";
   ```
4. Reemplaza con tu URL real del paso anterior
5. Haz clic en **Commit changes**

---

## PARTE 3 — Configurar el flujo en Make

### Módulo A — Enviar links de firma (después del Forms)

Agrega este módulo **después del módulo 1 (Watch New Rows)**:

**Gmail → Send an email**
- **To:** correos del estudiante, tutor y profesor (igual que el módulo 52 actual)
- **Subject:** `Firma requerida — Acta de Coformación {{nombre_estudiante}}`
- **Body:**
  ```
  Estimado/a {{nombre}},

  Se requiere tu firma digital para el Acta de Coformación.

  Ingresa al siguiente enlace y completa el proceso:
  https://TU_USUARIO.github.io/firma-acta/

  Usa el código de acta: {{CODIGO_ACTA}}

  Este proceso toma menos de 2 minutos.
  ```

> **¿Cómo generar el CODIGO_ACTA?**
> En Make, usa el módulo **Tools → Set Variable** antes de este email, y crea una variable combinando:
> `{{1.Nombre del estudiante (B)}}` + timestamp → esto identifica cada acta de forma única.
> O más simple: usa el número de fila del Sheets como código.

---

### Módulo B — Webhook que espera las 3 firmas

1. En Make, crea un **nuevo escenario separado**
2. Primer módulo: **Webhooks → Custom Webhook**
3. Copia la URL del webhook → **pégala en el Apps Script** (variable `MAKE_WEBHOOK_URL`)
4. El webhook recibirá este JSON cuando las 3 firmas estén listas:
   ```json
   {
     "codigoActa":      "...",
     "firmaEstudiante": "FILE_ID_de_Drive",
     "firmaTutor":      "FILE_ID_de_Drive",
     "firmaProfesor":   "FILE_ID_de_Drive"
   }
   ```

---

### Módulo C — Descargar las 3 firmas desde Drive

Agrega **3 módulos Google Drive → Download a File** (uno por firma):

| Módulo | File ID a usar |
|--------|----------------|
| Descarga firma estudiante | `{{firmaEstudiante}}` del webhook |
| Descarga firma tutor | `{{firmaTutor}}` del webhook |
| Descarga firma profesor | `{{firmaProfesor}}` del webhook |

---

### Módulo D — Recuperar datos del Forms

Necesitas los datos originales del estudiante. Opciones:

**Opción recomendada:** Google Sheets → Search Rows
- Busca por `codigoActa` en la hoja de control
- Esto te da nombre, programa, semestre, etc.

---

### Módulo E — Crear el documento desde plantilla

Igual que tu módulo 50 actual (Google Sheets → Create a Spreadsheet from a Template), pero ahora **agrega los campos de firma** a tu plantilla:

En tu plantilla de Google Sheets/Docs, agrega etiquetas:
```
{{FirmaEstudiante}}
{{FirmaTutor}}
{{FirmaProfesor}}
```

En el módulo de Make, mapea estos campos con las imágenes descargadas en el Módulo C.

---

### Módulo F — Guardar en Drive y enviar por Gmail

Igual que tus módulos 51 y 52 actuales. El flujo final queda:

```
[Webhook] → [Drive ×3: descargar firmas] → [Sheets: recuperar datos]
          → [Sheets: crear doc desde plantilla] → [Drive: guardar]
          → [Gmail: enviar a todos]
```

---

## PARTE 4 — Prueba completa

1. Llena el Google Forms con datos reales de prueba
2. Verifica que llegue el email con el link de firma
3. Abre el link → selecciona rol **Estudiante** → dibuja firma → envía
4. Repite con rol **Tutor** y rol **Profesor**
5. Revisa la hoja `Control de Firmas` — debe mostrar las 3 filas con `SI` en "Completado"
6. Verifica que Make se disparó y el documento final llegó por correo

---

## Resumen de archivos entregados

| Archivo | Descripción |
|---------|-------------|
| `firma.html` | Página web de firma — subir a GitHub Pages |
| `apps_script_firmas.js` | Script de Google — recibe firmas, guarda en Drive, dispara Make |
| `GUIA_IMPLEMENTACION.md` | Este documento |

---

## Soporte rápido

**La firma no se guarda en Drive**
→ Verifica que el Apps Script tiene permisos de Drive. Re-implementa y vuelve a autorizar.

**El webhook de Make no se dispara**
→ Revisa que pegaste la URL correcta en el Apps Script. Prueba manualmente llamando el webhook desde Postman con el JSON de ejemplo.

**La página dice "TU_SCRIPT_ID_AQUI"**
→ Olvidaste actualizar la URL en `index.html`. Edita en GitHub y commitea.

**Los File IDs de las firmas llegan vacíos a Make**
→ El código de acta en el Forms no coincide con el que se usó al firmar. Asegúrate de que el código que envías por email sea exactamente el mismo que el estudiante/tutor copian en la página.
