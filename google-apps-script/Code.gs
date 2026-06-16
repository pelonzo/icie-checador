// ===========================================================
// Google Apps Script - Motor del API Gateway para Control Horario
// ===========================================================
// INSTRUCCIONES:
// 1. Reemplaza el ID de tu hoja de cálculo debajo.
// 2. Despliega como Web App: Implementar > Nuevo despliegue > Aplicación Web
//    - Ejecutar como: Tu cuenta
//    - Quién tiene acceso: Cualquiera
// 3. Copia la URL del despliegue y pégala en tu archivo .env
// ===========================================================

const SPREADSHEET_ID = "1BvDolmbbuAb6Dm_p-u7tc-jIMMZWLpBq5Qy3ewEm5Fo";

function doPost(e) {
  const response = ContentService.createTextOutput().setMimeType(ContentService.MimeType.JSON);
  try {
    const payload = JSON.parse(e.postData.contents);
    const action = payload.action;
    const userId = payload.userId; // Identificador validado (Email)

    if (!userId) {
      return response.setContent(JSON.stringify({ success: false, error: "No autorizado: ID de usuario ausente" }));
    }

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    switch (action) {
      case "syncProfile":
        return response.setContent(JSON.stringify(handleSyncProfile(ss, userId, payload.data)));
      case "clockIn":
        return response.setContent(JSON.stringify(handleClockIn(ss, userId, payload.data)));
      case "clockOut":
        return response.setContent(JSON.stringify(handleClockOut(ss, userId, payload.data)));
      case "startPause":
        return response.setContent(JSON.stringify(handleStartPause(ss, userId, payload.data)));
      case "endPause":
        return response.setContent(JSON.stringify(handleEndPause(ss, userId, payload.data)));
      case "fetchUserData":
        return response.setContent(JSON.stringify(handleFetchUserData(ss, userId)));
      default:
        return response.setContent(JSON.stringify({ success: false, error: "Acción no reconocida" }));
    }
  } catch (err) {
    return response.setContent(JSON.stringify({ success: false, error: err.toString() }));
  }
}

function handleSyncProfile(ss, userId, data) {
  const sheet = ss.getSheetByName("Profiles");
  const rows = sheet.getDataRange().getValues();
  let foundIndex = -1;
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === userId) { foundIndex = i + 1; break; }
  }
  if (foundIndex === -1) {
    sheet.appendRow([userId, data.fullName, data.avatarUrl || "", new Date()]);
  } else {
    sheet.getRange(foundIndex, 2).setValue(data.fullName);
    if (data.avatarUrl) sheet.getRange(foundIndex, 3).setValue(data.avatarUrl);
  }
  return { success: true };
}

function handleFetchUserData(ss, userId) {
  const entriesSheet = ss.getSheetByName("TimeEntries");
  const entriesRows = entriesSheet.getDataRange().getValues();
  const userEntries = [];
  for (let i = 1; i < entriesRows.length; i++) {
    if (entriesRows[i][1] === userId) {
      userEntries.push({
        id: entriesRows[i][0],
        userId: entriesRows[i][1],
        date: entriesRows[i][2],
        clockIn: entriesRows[i][3],
        clockOut: entriesRows[i][4] || null,
        totalHours: entriesRows[i][5] || null,
        status: entriesRows[i][6],
        editedManually: entriesRows[i][7]
      });
    }
  }
  return { success: true, entries: userEntries };
}

function handleClockIn(ss, userId, data) {
  const sheet = ss.getSheetByName("TimeEntries");
  sheet.appendRow([data.id, userId, data.date, new Date(), "", "", "active", false]);
  return { success: true };
}

function handleClockOut(ss, userId, data) {
  const sheet = ss.getSheetByName("TimeEntries");
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === data.id && rows[i][1] === userId) {
      const rowIndex = i + 1;
      sheet.getRange(rowIndex, 5).setValue(new Date());
      sheet.getRange(rowIndex, 6).setValue(data.totalHours);
      sheet.getRange(rowIndex, 7).setValue("completed");
      return { success: true };
    }
  }
  return { success: false, error: "Jornada no encontrada" };
}

function handleStartPause(ss, userId, data) {
  const entriesSheet = ss.getSheetByName("TimeEntries");
  const entriesRows = entriesSheet.getDataRange().getValues();
  let valid = false;
  for (let i = 1; i < entriesRows.length; i++) {
    if (entriesRows[i][0] === data.timeEntryId && entriesRows[i][1] === userId) {
      entriesSheet.getRange(i + 1, 7).setValue("paused");
      valid = true;
      break;
    }
  }
  if (!valid) return { success: false, error: "Jornada no válida" };
  const pausesSheet = ss.getSheetByName("Pauses");
  pausesSheet.appendRow([data.id, data.timeEntryId, new Date(), "", data.type, ""]);
  return { success: true };
}

function handleEndPause(ss, userId, data) {
  const entriesSheet = ss.getSheetByName("TimeEntries");
  const entriesRows = entriesSheet.getDataRange().getValues();
  for (let i = 1; i < entriesRows.length; i++) {
    if (entriesRows[i][0] === data.timeEntryId && entriesRows[i][1] === userId) {
      entriesSheet.getRange(i + 1, 7).setValue("active");
      break;
    }
  }
  const pausesSheet = ss.getSheetByName("Pauses");
  const pausesRows = pausesSheet.getDataRange().getValues();
  for (let j = 1; j < pausesRows.length; j++) {
    if (pausesRows[j][0] === data.id) {
      const pRow = j + 1;
      pausesSheet.getRange(pRow, 4).setValue(new Date());
      pausesSheet.getRange(pRow, 6).setValue(data.duration);
      return { success: true };
    }
  }
  return { success: false, error: "Pausa no encontrada" };
}

