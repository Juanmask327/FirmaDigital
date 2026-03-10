// ============================================================
// GOOGLE APPS SCRIPT — Receptor de Firmas Digitales
// Pega este código en script.google.com (nuevo proyecto)
// ============================================================

// ID de la carpeta en Google Drive donde se guardarán las firmas
// Ej: en la URL https://drive.google.com/drive/folders/1ABC...XYZ
// el ID es: 1ABC...XYZ
const CARPETA_FIRMAS_ID = "PON_AQUI_EL_ID_DE_TU_CARPETA_FIRMAS";

// ID del Google Sheet donde se registrará el estado de firmas
const SHEET_CONTROL_ID = "PON_AQUI_EL_ID_DE_TU_HOJA_DE_CONTROL";

// Nombre de la hoja dentro del Sheet de control
const NOMBRE_HOJA_CONTROL = "Control de Firmas";

// ─────────────────────────────────────────────────────────────
// PUNTO DE ENTRADA — recibe el POST desde la página web
// ─────────────────────────────────────────────────────────────
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    const rol         = data.rol;         // "estudiante" | "tutor" | "profesor"
    const nombre      = data.nombre;
    const correo      = data.correo;
    const codigoActa  = data.codigoActa;  // identificador único del acta
    const firmaBase64 = data.firma;       // "data:image/png;base64,..."
    const timestamp   = data.timestamp;

    // 1. Guardar imagen de firma en Drive
    const nombreArchivo = `firma_${codigoActa}_${rol}.png`;
    const base64Data    = firmaBase64.replace(/^data:image\/png;base64,/, "");
    const blob          = Utilities.newBlob(
      Utilities.base64Decode(base64Data), "image/png", nombreArchivo
    );
    const carpeta       = DriveApp.getFolderById(CARPETA_FIRMAS_ID);
    const archivo       = carpeta.createFile(blob);
    const fileId        = archivo.getId();

    // 2. Registrar en hoja de control
    registrarFirma(codigoActa, rol, nombre, correo, fileId, timestamp);

    // 3. Verificar si ya firmaron todos → disparar Make si corresponde
    verificarCompletitud(codigoActa);

    return ContentService
      .createTextOutput(JSON.stringify({ status: "ok", fileId: fileId }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: "error", message: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ─────────────────────────────────────────────────────────────
// Registra la firma en la hoja de control
// ─────────────────────────────────────────────────────────────
function registrarFirma(codigoActa, rol, nombre, correo, fileId, timestamp) {
  const ss    = SpreadsheetApp.openById(SHEET_CONTROL_ID);
  let sheet   = ss.getSheetByName(NOMBRE_HOJA_CONTROL);

  // Crear hoja si no existe
  if (!sheet) {
    sheet = ss.insertSheet(NOMBRE_HOJA_CONTROL);
    sheet.appendRow([
      "Código Acta", "Rol", "Nombre", "Correo",
      "File ID Firma", "Timestamp", "Completado"
    ]);
  }

  // Buscar si ya existe una fila para este acta+rol (actualizar en lugar de duplicar)
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === codigoActa && data[i][1] === rol) {
      sheet.getRange(i + 1, 5).setValue(fileId);
      sheet.getRange(i + 1, 6).setValue(timestamp);
      return;
    }
  }

  // Si no existe, agregar nueva fila
  sheet.appendRow([codigoActa, rol, nombre, correo, fileId, timestamp, "NO"]);
}

// ─────────────────────────────────────────────────────────────
// Verifica si las 3 firmas están listas y avisa a Make
// ─────────────────────────────────────────────────────────────
function verificarCompletitud(codigoActa) {
  const ss    = SpreadsheetApp.openById(SHEET_CONTROL_ID);
  const sheet = ss.getSheetByName(NOMBRE_HOJA_CONTROL);
  if (!sheet) return;

  const data = sheet.getDataRange().getValues();
  const roles = ["estudiante", "tutor", "profesor"];
  const firmasActa = {};

  // Recopilar firmas de este acta
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === codigoActa && data[i][4]) {
      firmasActa[data[i][1]] = data[i][4]; // rol → fileId
    }
  }

  const todasListas = roles.every(r => firmasActa[r]);

  if (todasListas) {
    // Marcar como completado en la hoja
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === codigoActa) {
        sheet.getRange(i + 1, 7).setValue("SI");
      }
    }

    // ── Disparar el webhook de Make ──────────────────────────
    // Pega aquí la URL del webhook de Make (módulo "Watch" o "Webhook")
    const MAKE_WEBHOOK_URL = "PON_AQUI_TU_WEBHOOK_URL_DE_MAKE";

    const payload = {
      codigoActa:      codigoActa,
      firmaEstudiante: firmasActa["estudiante"],
      firmaTutor:      firmasActa["tutor"],
      firmaProfesor:   firmasActa["profesor"]
    };

    UrlFetchApp.fetch(MAKE_WEBHOOK_URL, {
      method:      "post",
      contentType: "application/json",
      payload:     JSON.stringify(payload)
    });
  }
}

// ─────────────────────────────────────────────────────────────
// GET para verificar que el script está activo (opcional)
// ─────────────────────────────────────────────────────────────
function doGet() {
  return ContentService
    .createTextOutput("✅ Script de firmas activo")
    .setMimeType(ContentService.MimeType.TEXT);
}
