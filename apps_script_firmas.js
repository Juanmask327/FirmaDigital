function crearEstructuraEstudiante(codigoActa, nombreEstudiante,
                                   correoEstudiante, correoTutor, correoProfesor) {

  // 1. Crear carpeta del estudiante dentro de "Fase Inicial"
  const carpetaFase       = DriveApp.getFolderById(CARPETA_FASE_ID);
  const carpetaEstudiante = carpetaFase.createFolder(nombreEstudiante);
  const idCarpeta         = carpetaEstudiante.getId();

  // 2. Copiar la plantilla dentro de la carpeta del estudiante
  const archivoCopia = DriveApp.getFileById(PLANTILLA_ID).makeCopy(
    `Acta de Coformación - ${nombreEstudiante}`,
    carpetaEstudiante
  );
  const idSheets = archivoCopia.getId();

  // 3. Llenar datos del estudiante en la copia recién creada
  try {
    const ssResp   = SpreadsheetApp.openById(SHEET_RESPUESTAS_ID);
    const hojaResp = ssResp.getSheets()[0];
    const fila     = hojaResp.getRange(Number(codigoActa), 1, 1, 26).getValues()[0];

    const datos = {
      nombreEstudiante : fila[1],  // B
      documento        : fila[2],  // C
      programa         : fila[3],  // D
      semestre         : fila[4],  // E
      correoEstudiante : fila[5],  // F
      razonSocial      : fila[8],  // I
      nombreTutor      : fila[11], // L
      correoTutor      : fila[12], // M
      nombreProfesor   : fila[14], // O
      correoProfesor   : fila[15], // P
    };

    const ss         = SpreadsheetApp.openById(idSheets);
    const actaInicio = ss.getSheetByName("Acta de Inicio");

    if (actaInicio) {
      actaInicio.getRange("A6").setValue(datos.nombreEstudiante);
      actaInicio.getRange("C6").setValue(datos.documento);
      actaInicio.getRange("D6").setValue(datos.programa);
      actaInicio.getRange("H6").setValue(datos.semestre);
      actaInicio.getRange("A9").setValue(datos.razonSocial);
      actaInicio.getRange("D9").setValue(datos.nombreTutor);
      actaInicio.getRange("G9").setValue(datos.nombreProfesor);
      actaInicio.getRange("E15").setValue(datos.correoEstudiante);
      actaInicio.getRange("E16").setValue(datos.correoTutor);
      actaInicio.getRange("E17").setValue(datos.correoProfesor);
    }

    // Llenar también las otras hojas que tienen el encabezado del estudiante
    ["Acta de Seguimiento", "Acta de Cierre"].forEach(nombreHoja => {
      const hoja = ss.getSheetByName(nombreHoja);
      if (hoja) {
        hoja.getRange("A6").setValue(datos.nombreEstudiante);
        hoja.getRange("C6").setValue(datos.documento);
        hoja.getRange("D6").setValue(datos.programa);
        hoja.getRange("H6").setValue(datos.semestre);
        hoja.getRange("A9").setValue(datos.razonSocial);
        hoja.getRange("D9").setValue(datos.nombreTutor);
        hoja.getRange("G9").setValue(datos.nombreProfesor);
      }
    });

    SpreadsheetApp.flush();

  } catch (err) {
    Logger.log("Error llenando datos en la copia: " + err.message);
  }

  // 4. Compartir carpeta — en try-catch para que no bloquee el return
  try {
    if (correoEstudiante && correoEstudiante.includes("@")) {
      carpetaEstudiante.addEditor(correoEstudiante);
    }
    if (correoTutor && correoTutor.includes("@")) {
      carpetaEstudiante.addViewer(correoTutor);
    }
    if (correoProfesor && correoProfesor.includes("@")) {
      carpetaEstudiante.addViewer(correoProfesor);
    }
  } catch (err) {
    Logger.log("Error compartiendo carpeta: " + err.message);
  }

  // 5. Registrar en hoja "Registro de Actas"
  try {
    registrarEnHojaMapeo(codigoActa, nombreEstudiante, idCarpeta,
                         idSheets, correoEstudiante, correoTutor, correoProfesor);
  } catch (err) {
    Logger.log("Error registrando en hoja mapeo: " + err.message);
  }

  // 6. Devolver los links siempre, aunque algún paso anterior haya fallado
  return {
    status      : "ok",
    idCarpeta   : idCarpeta,
    idSheets    : idSheets,
    linkCarpeta : `https://drive.google.com/drive/folders/${idCarpeta}`,
    linkSheets  : `https://docs.google.com/spreadsheets/d/${idSheets}/edit`,
  };
}
