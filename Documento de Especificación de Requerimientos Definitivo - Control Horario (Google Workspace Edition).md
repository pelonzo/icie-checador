# **Documento de Especificación de Requerimientos Definitivo**

**Sistema de Control Horario Web — Edición Integrada para el Ecosistema Google Workspace**  
**Estado del Documento:** Aprobado para Desarrollo (Línea Base)  
**Versión:** 3.0 (Fusión Completa)  
**Entorno de Destino:** Google Antigravity (Multi-Agente)  
**Fecha de Emisión:** Mayo, 2026

## **1\. Visión General del Proyecto Unificado**

Este documento consolida la especificación de requerimientos funcionales y técnicos para el desarrollo de la aplicación web de Control Horario. La arquitectura original basada en Supabase ha sido completamente reemplazada e integrada con los servicios de **Google Workspace** como plataforma central de servicios y persistencia. El sistema utilizará Google Sheets como base de datos estructurada, Google Apps Script como pasarela API/Backend de acceso seguro, y Google Identity Services para la gestión de identidad y autenticación de usuarios.

### **1.1 Objetivos del Sistema**

* Proporcionar una interfaz web reactiva, moderna y con enfoque *Mobile-First* para el registro de jornadas laborales.  
* Garantizar costo cero de infraestructura y máxima facilidad de auditoría mediante el almacenamiento directo en hojas de cálculo.  
* Soportar condiciones de conectividad inestable mediante una arquitectura de sincronización local (Offline-First).

### **1.2 Ajustes en el Alcance del MVP**

Al integrar la actualización de Google Workspace, el alcance experimenta modificaciones críticas para reducir la complejidad innecesaria en el frontend:

* **Inclusión Mandatoria:** Autenticación Single Sign-On (SSO) mediante "Login con Google".  
* **Exclusión por Delegación:** Se eliminan los formularios de registro manual, confirmaciones de correo electrónico, restablecimiento de contraseñas y hashing local, dado que la seguridad de las cuentas queda delegada por completo a la infraestructura de Google.  
* **Soberanía de Datos (Emulación RLS):** La privacidad se gestiona en el servidor de Apps Script, el cual filtra las filas de la hoja de cálculo por el correo electrónico del usuario autenticado antes de enviar cualquier respuesta.

## **2\. Matriz de Requerimientos Funcionales Adaptados**

### **2.1 Módulo de Identidad y Acceso**

* **RF-001: Autenticación Unificada (Google Login):** El sistema no expondrá campos de texto para contraseñas. Dispondrá de un botón nativo compatible con el SDK de Google Identity Services. Al autenticarse, se extraerá el correo electrónico, nombre completo y URL del avatar del usuario.  
* **RF-002: Sincronización Automática de Perfil:** Al iniciar sesión por primera vez, el sistema enviará los datos del usuario al endpoint de Google Apps Script para darlo de alta en la pestaña de perfiles. En inicios de sesión posteriores, actualizará el nombre o avatar si estos cambiaron en la cuenta de Google.  
* **RF-003: Cierre de Sesión Seguro:** El botón de cierre de sesión destruirá el token de sesión local de la aplicación. Si el usuario intenta cerrar sesión teniendo una jornada laboral activa (estado "En trabajo" o "En pausa"), el sistema desplegará un modal de advertencia obligando a confirmar la acción.

### **2.2 Módulo de Gestión de Jornada Laboral**

* **RF-004: Registro de Entrada (Clock In):** El usuario podrá iniciar su jornada con un único botón "Entrar". El sistema capturará automáticamente la marca de tiempo (timestamp) del cliente y la fecha del día en formato YYYY-MM-DD, bloqueando cualquier intento de enviar marcas duplicadas o en paralelo para el mismo día.  
* **RF-005: Registro de Salida (Clock Out):** Habilitado únicamente si existe una jornada activa. Calcula en tiempo real las horas trabajadas del día, restando la duración de todas las pausas completadas, y actualiza la fila correspondiente en la hoja de cálculo cambiando el estado a "completed".  
* **RF-006: Control Integral de Pausas:** Permite pausar la jornada de trabajo seleccionando obligatoriamente una categoría: *Comida*, *Descanso* o *Otra*. Al activar la pausa, la jornada general pasa a estado "paused" y se inicializa una nueva fila vinculada en la hoja de descansos.

### **2.3 Visualización, Reportes y Edición**

* **RF-007: Dashboard de Estado y Métricas Rápidas:** Pantalla principal que muestra el estado en tiempo real mediante indicadores visuales grandes. Computa el tiempo transcurrido acumulado del día y de la semana actual utilizando caché local para cumplir con tiempos de respuesta óptimos.  
* **RF-008: Historial y Calendario Personal:** Vista de calendario mensual y lista cronológica expandible. Debido a la emulación de Row Level Security, el frontend solo recibirá y renderizará los registros pertenecientes al correo electrónico del usuario activo.  
* **RF-009: Edición Manual con Auditoría:** El usuario podrá modificar las horas de registros pasados. Toda modificación guardada establecerá de forma irreversible el campo edited\_manually como TRUE en la fila de Google Sheets para fines de control de confianza.  
* **RF-010: Exportación Local CSV:** Generación de archivos tabulares descargables directamente desde el navegador, basados en el rango de fechas seleccionado por el usuario, sin sobrecargar la API de Google.

## **3\. Requerimientos No Funcionales Críticos**

| Código | Categoría | Especificación Métrica e Integración   |
| :---- | :---- | :---- |
| **RNF-001** | Rendimiento de UI | Respuesta a acciones en pantalla inferior a 200ms. Debido a que la escritura en Google Sheets mediante Apps Script demora entre 400ms y 1200ms, \*\*el frontend utilizará de forma obligatoria Actualizaciones Optimistas\*\* en el estado reactivo. |
| **RNF-002** | Disponibilidad / Red | Arquitectura Offline-First. Se implementará una base de datos local en el navegador utilizando \*\*IndexedDB (vía Dexie.js)\*\*. Todas las marcas de tiempo se grabarán localmente de forma inmediata y se sincronizarán de forma asíncrona con la Web App de Google. |
| **RNF-003** | Seguridad de Datos | Emulación de Privacidad del Servidor. Queda prohibido exponer las llaves de la API de Google Sheets o IDs de servicio en el cliente. La Web App de Apps Script se ejecutará bajo el rol del administrador y validará el correo del usuario antes de retornar datos. |
| **RNF-004** | Diseño Visual | Estilo *Vibe Coding* interactivo usando Tailwind CSS y componentes de shadcn/ui. El diseño debe dar absoluta prioridad a pantallas móviles, empleando tarjetas con efecto de desenfoque (glassmorphism) y botones de acción masivos. |

## **4\. Arquitectura de Software y Persistencia**

### **4.1 Estructura Estricta de Datos en Google Sheets**

El libro de cálculo central actuará como la base de datos relacional. Consiste en tres pestañas que deben mantener las siguientes cabeceras exactas en la fila 1:  
**Pestaña 1: Profiles**

| Columna | Tipo | Descripción |
| :---- | :---- | :---- |
| A: id (PK) | TEXT (Email) | Correo electrónico único del usuario de Google. |
| B: full\_name | TEXT | Nombre completo del usuario. |
| C: avatar\_url | TEXT (URL) | Enlace a la foto de perfil de Google. |
| D: created\_at | TIMESTAMP | Fecha y hora de alta en el sistema. |

**Pestaña 2: TimeEntries**

| Columna | Tipo | Descripción |
| :---- | :---- | :---- |
| A: id (PK) | TEXT (UUID) | Identificador único global de la jornada laboral. |
| B: user\_id (FK) | TEXT (Email) | Relación directa con la pestaña Profiles. |
| C: date | DATE | Fecha del registro (YYYY-MM-DD). |
| D: clock\_in | TIMESTAMP | Fecha y hora de entrada. |
| E: clock\_out | TIMESTAMP | Fecha y hora de salida (o vacío si está activa). |
| F: total\_hours | DECIMAL | Horas netas trabajadas (calculadas restando pausas). |
| G: status | TEXT | Restringido a: active, paused o completed. |
| H: edited\_manually | BOOLEAN | TRUE si el registro sufrió modificaciones en el historial. |

**Pestaña 3: Pauses**

| Columna | Tipo | Descripción |
| :---- | :---- | :---- |
| A: id (PK) | TEXT (UUID) | Identificador único del descanso. |
| B: time\_entry\_id (FK) | TEXT (UUID) | Relación jerárquica con la jornada en TimeEntries. |
| C: start\_time | TIMESTAMP | Hora de inicio de la pausa. |
| D: end\_time | TIMESTAMP | Hora de finalización de la pausa. |
| E: type | TEXT | Categoría: meal, break u other. |
| F: duration | INTEGER | Duración total computada en minutos. |

### **4.2 Código del Servidor: Motor en Google Apps Script (Gateway API)**

El siguiente script encapsula toda la lógica de negocio en el servidor y expone un único punto de entrada HTTP POST seguro:

const SPREADSHEET\_ID \= "ID\_COMPLETO\_DE\_TU\_HOJA\_DE\_CALCULO";

function doPost(e) {  
  const response \= ContentService.createTextOutput().setMimeType(ContentService.MimeType.JSON);  
  try {  
    const payload \= JSON.parse(e.postData.contents);  
    const action \= payload.action;  
    const userId \= payload.userId; // Identificador validado (Email)  
      
    if (\!userId) {  
      return response.setContent(JSON.stringify({ success: false, error: "No autorizado: ID de usuario ausente" }));  
    }  
      
    const ss \= SpreadsheetApp.openById(SPREADSHEET\_ID);  
      
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
  const sheet \= ss.getSheetByName("Profiles");  
  const rows \= sheet.getDataRange().getValues();  
  let foundIndex \= \-1;  
  for (let i \= 1; i \< rows.length; i++) {  
    if (rows\[i\]\[0\] \=== userId) { foundIndex \= i \+ 1; break; }  
  }  
  if (foundIndex \=== \-1) {  
    sheet.appendRow(\[userId, data.fullName, data.avatarUrl || "", new Date()\]);  
  } else {  
    sheet.getRange(foundIndex, 2).setValue(data.fullName);  
    if (data.avatarUrl) sheet.getRange(foundIndex, 3).setValue(data.avatarUrl);  
  }  
  return { success: true };  
}

function handleFetchUserData(ss, userId) {  
  const entriesSheet \= ss.getSheetByName("TimeEntries");  
  const entriesRows \= entriesSheet.getDataRange().getValues();  
  const userEntries \= \[\];  
  for (let i \= 1; i \< entriesRows.length; i++) {  
    if (entriesRows\[i\]\[1\] \=== userId) {  
      userEntries.push({  
        id: entriesRows\[i\]\[0\],  
        userId: entriesRows\[i\]\[1\],  
        date: entriesRows\[i\]\[2\],  
        clockIn: entriesRows\[i\]\[3\],  
        clockOut: entriesRows\[i\]\[4\] || null,  
        totalHours: entriesRows\[i\]\[5\] || null,  
        status: entriesRows\[i\]\[6\],  
        editedManually: entriesRows\[i\]\[7\]  
      });  
    }  
  }  
  return { success: true, entries: userEntries };  
}

function handleClockIn(ss, userId, data) {  
  const sheet \= ss.getSheetByName("TimeEntries");  
  sheet.appendRow(\[data.id, userId, data.date, new Date(), "", "", "active", false\]);  
  return { success: true };  
}

function handleClockOut(ss, userId, data) {  
  const sheet \= ss.getSheetByName("TimeEntries");  
  const rows \= sheet.getDataRange().getValues();  
  for (let i \= 1; i \< rows.length; i++) {  
    if (rows\[i\]\[0\] \=== data.id && rows\[i\]\[1\] \=== userId) {  
      const rowIndex \= i \+ 1;  
      sheet.getRange(rowIndex, 5).setValue(new Date());  
      sheet.getRange(rowIndex, 6).setValue(data.totalHours);  
      sheet.getRange(rowIndex, 7).setValue("completed");  
      return { success: true };  
    }  
  }  
  return { success: false, error: "Jornada no encontrada" };  
}

function handleStartPause(ss, userId, data) {  
  const entriesSheet \= ss.getSheetByName("TimeEntries");  
  const entriesRows \= entriesSheet.getDataRange().getValues();  
  let valid \= false;  
  for (let i \= 1; i \< entriesRows.length; i++) {  
    if (entriesRows\[i\]\[0\] \=== data.timeEntryId && entriesRows\[i\]\[1\] \=== userId) {  
      entriesSheet.getRange(i \+ 1, 7).setValue("paused");  
      valid \= true;  
      break;  
    }  
  }  
  if (\!valid) return { success: false, error: "Jornada no válida" };  
  const pausesSheet \= ss.getSheetByName("Pauses");  
  pausesSheet.appendRow(\[data.id, data.timeEntryId, new Date(), "", data.type, ""\]);  
  return { success: true };  
}

function handleEndPause(ss, userId, data) {  
  const entriesSheet \= ss.getSheetByName("TimeEntries");  
  const entriesRows \= entriesSheet.getDataRange().getValues();  
  for (let i \= 1; i \< entriesRows.length; i++) {  
    if (entriesRows\[i\]\[0\] \=== data.timeEntryId && entriesRows\[i\]\[1\] \=== userId) {  
      entriesSheet.getRange(i \+ 1, 7).setValue("active");  
      break;  
    }  
  }  
  const pausesSheet \= ss.getSheetByName("Pauses");  
  const pausesRows \= pausesSheet.getDataRange().getValues();  
  for (let j \= 1; j \< pausesRows.length; j++) {  
    if (pausesRows\[j\]\[0\] \=== data.id) {  
      const pRow \= j \+ 1;  
      pausesSheet.getRange(pRow, 4).setValue(new Date());  
      pausesSheet.getRange(pRow, 6).setValue(data.duration);  
      return { success: true };  
    }  
  }  
  return { success: false, error: "Pausa no encontrada" };  
}

### **4.3 Estructura Unificada de Carpetas del Proyecto Frontend**

Se reestructura el directorio de componentes eliminando la carpeta auth/ redundante y adaptando las utilidades para el consumo del API Gateway corporativo:

src/  
├── components/  
│   ├── layout/  
│   │   ├── Header.tsx  
│   │   ├── Sidebar.tsx  
│   │   └── Layout.tsx  
│   ├── time-tracking/  
│   │   ├── TimeClockControls.tsx  
│   │   ├── CurrentStatus.tsx  
│   │   └── PauseControls.tsx  
│   ├── dashboard/  
│   │   ├── StatsCard.tsx  
│   │   └── WeeklyChart.tsx  
│   └── ui/ \[Componentes de shadcn/ui\]  
├── hooks/  
│   ├── useAuth.ts  
│   ├── useTimeTracking.ts  
│   └── useGoogleApi.ts \[Reemplaza a useSupabase.ts\]  
├── lib/  
│   ├── googleApi.ts \[Cliente HTTP unificado Fetch\]  
│   └── db.ts \[Configuración de IndexedDB con Dexie.js\]  
├── pages/  
│   ├── Login.tsx \[Página simplificada con botón Google SSO\]  
│   ├── Dashboard.tsx  
│   ├── History.tsx  
│   └── Profile.tsx  
├── utils/  
│   └── calculations.ts \[Cálculos exactos de tiempo\]  
└── App.tsx

## **5\. Lógica de Negocio: Algoritmo de Cálculo de Jornada**

Para asegurar precisión absoluta al minuto en las auditorías de horas trabajadas de Google Sheets, la lógica del cliente (y la validación del backend) aplicará estrictamente la siguiente función matemática desarrollada en TypeScript:

import { differenceInMinutes } from 'date-fns';

interface Pause {  
  startTime: Date;  
  endTime: Date | null;  
}

interface TimeEntry {  
  clockIn: Date;  
  clockOut: Date | null;  
  pauses: Pause\[\];  
}

export function calculateWorkedHours(entry: TimeEntry): number {  
  if (\!entry.clockOut) return 0;  
    
  // 1\. Calcular el tiempo bruto transcurrido en minutos  
  const totalGrossMinutes \= differenceInMinutes(new Date(entry.clockOut), new Date(entry.clockIn));  
    
  // 2\. Sumar el tiempo total consumido por todas las pausas finalizadas  
  const totalPauseMinutes \= entry.pauses.reduce((sum, pause) \=\> {  
    if (pause.endTime) {  
      return sum \+ differenceInMinutes(new Date(pause.endTime), new Date(pause.startTime));  
    }  
    return sum;  
  }, 0);  
    
  // 3\. Restar pausas del tiempo bruto y convertir a formato decimal de horas  
  const netMinutes \= totalGrossMinutes \- totalPauseMinutes;  
  const hoursDecimal \= netMinutes / 60;  
    
  // Retornar redondeado a dos posiciones decimales (ej. 7.75 horas)  
  return Math.round((hoursDecimal \+ Number.EPSILON) \* 100\) / 100;  
}

## **6\. Plan de Sprints Ajustado a la Nueva Arquitectura**

1. **Sprint 1: Cimientos y Configuración del Workspace**   
   Creación del libro máster de Google Sheets, despliegue estructurado de Google Apps Script como Web App, configuración de variables de entorno frontend (VITE\_GOOGLE\_API\_GATEWAY\_URL) e inicialización del almacenamiento local con Dexie.js.  
2. **Sprint 2: Identidad Corporativa y Núcleo de Marcaje**   
   Integración de Google Identity Services, desarrollo del hook reactivo useAuth.ts, sincronización automática de perfiles e implementación de los controles visuales optimistas de entrada y salida (Clock In/Out).  
3. **Sprint 3: Descansos y Sincronización en Caliente**   
   Desarrollo del módulo relacional de pausas de trabajo, programación del worker de fondo para sincronización automática de IndexedDB a Google Sheets cuando retorna la conexión de red, y diseño del panel de control principal.  
4. **Sprint 4: Analíticas Locales, Auditoría y Despliegue**   
   Conexión de Recharts con el historial local del usuario, desarrollo de la exportación a archivos CSV locales, pulido final de interfaces con Tailwind CSS y paso a producción en servidor HTTPS.

## **7\. Criterios Mandatorios de Validación Multi-Agente**

**Regla de Oro para el Agente de Desarrollo en Antigravity:** Antes de dar por completado un ticket o sprint, simula mentalmente la ejecución del código concurrente. Ninguna función frontend debe consultar directamente las celdas de la hoja de cálculo de Google. Toda transferencia de información debe estar mediada por el API Gateway de Apps Script, enviando explícitamente el ID de usuario autenticado para validar el filtrado de privacidad en el servidor.