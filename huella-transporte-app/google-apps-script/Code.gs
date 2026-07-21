/**
 * RutaCO2 IRNAS - backend mínimo para Google Sheets.
 *
 * La hoja recibe únicamente categorías demográficas y datos derivados del
 * desplazamiento. No recibe origen, destino ni coordenadas.
 */

const SETTINGS = Object.freeze({
  SHEET_NAME: "respuestas",
  SPREADSHEET_PROPERTY: "RUTACO2_SPREADSHEET_ID",
  MIN_SAMPLE_SIZE: 5,
  FACTOR_VERSION: "rutaco2-1.2_2026-07",
});

const HEADERS = Object.freeze([
  "created_at_utc",
  "response_id",
  "sex",
  "age_band",
  "research_group",
  "transport_mode_id",
  "distance_one_way_km",
  "round_trip",
  "work_days_year",
  "occupancy",
  "factor_g_co2e_person_km",
  "annual_distance_km",
  "annual_kg_co2e",
  "route_type",
  "data_quality",
  "factor_version",
  "updated_at_utc",
]);

const COLUMN = Object.freeze({
  CREATED_AT: 0,
  RESPONSE_ID: 1,
  GROUP: 4,
  ANNUAL_KG: 12,
});

const ALLOWED_SEX = Object.freeze(["mujer", "hombre", "otra", "no_responde"]);
const ALLOWED_AGE_BANDS = Object.freeze(["18-24", "25-34", "35-44", "45-54", "55-64", "65+", "no_responde"]);
const ALLOWED_GROUPS = Object.freeze([
  "AGROCHEM", "SOILPLANT", "BIOREM", "CONSOWAT",
  "DIVEX", "MAPC", "MOSS", "BIOGEOCOM",
  "SEMBIO", "BIOVALOR", "RIH", "BIOFUNLAB", "SIFOMED", "ECOVER",
  "SCT", "GESTION", "OTRA", "NO_RESPONDE",
]);
const ALLOWED_ROUTE_TYPES = Object.freeze(["routed", "estimated", "manual"]);
const ALLOWED_CABINS = Object.freeze(["average", "economy", "premium", "business", "first"]);

const MODE_FACTORS = Object.freeze({
  T01: { factorG: 0, unit: "person", quality: "A" },
  T02: { factorG: 0, unit: "person", quality: "A" },
  T03: { factorG: 2.58, unit: "person", quality: "B" },
  T04: { factorG: 3.7668, unit: "person", quality: "B" },
  T05: { factorG: 50.17, unit: "person", quality: "C", allowOverride: true },
  T06: { factorG: 58, unit: "vehicle", quality: "A" },
  T07: { factorG: 99, unit: "vehicle", quality: "A" },
  T08: { factorG: 15.48, unit: "vehicle", quality: "B" },
  T09: { factorG: 183, unit: "vehicle", quality: "A" },
  T10: { factorG: 159, unit: "vehicle", quality: "A" },
  T11: { factorG: 186, unit: "vehicle", quality: "A" },
  T12: { factorG: 181, unit: "vehicle", quality: "A" },
  T13: { factorG: 129.61, unit: "vehicle", quality: "C" },
  T14: { factorG: null, unit: "vehicle", quality: "D", customRequired: true },
  T15: { factorG: 52.92, unit: "vehicle", quality: "B" },
  T16: { factorG: 99, unit: "person", quality: "A" },
  T17: { factorG: 148.61, unit: "person", quality: "C" },
  T18: { factorG: 148.61, unit: "person", quality: "C" },
  T19: { factorG: 52.92, unit: "vehicle", quality: "B" },
  T20: { factorG: 48, unit: "person", quality: "A" },
  T21: { factorG: 48, unit: "person", quality: "B" },
  T22: { factorG: 39.48, unit: "person", quality: "C" },
  T23: { factorG: 39.48, unit: "person", quality: "C", allowOverride: true },
  T24: { factorG: null, unit: "person", quality: "D", customRequired: true },
  T25: { factorG: 2, unit: "person", quality: "A" },
  T26: { factorG: 21.21, unit: "person", quality: "C" },
  T27: { factorG: 4, unit: "person", quality: "A" },
  T28: { factorG: 4, unit: "person", quality: "B" },
  T29: { factorG: 4, unit: "person", quality: "B" },
  T30: { factorG: 4, unit: "person", quality: "B" },
  T31: { factorG: null, unit: "person", quality: "D", customRequired: true },
  T32: { factorG: null, unit: "person", quality: "D", customRequired: true },
  T33: { factorG: null, unit: "person", quality: "C", airType: "domestic" },
  T34: { factorG: null, unit: "person", quality: "C", airType: "international" },
  T35: { factorG: null, unit: "person", quality: "D", customRequired: true },
});

const AIR_FACTORS_KG = Object.freeze({
  domestic: {
    average: { withRf: 0.22928, withoutRf: 0.13552, wtt: 0.0335 },
  },
  international: {
    average: { withRf: 0.14253, withoutRf: 0.0842, wtt: 0.02162 },
    economy: { withRf: 0.10916, withoutRf: 0.06449, wtt: 0.01656 },
    premium: { withRf: 0.17465, withoutRf: 0.10318, wtt: 0.02649 },
    business: { withRf: 0.31656, withoutRf: 0.18701, wtt: 0.04802 },
    first: { withRf: 0.43663, withoutRf: 0.25794, wtt: 0.06623 },
  },
});

/** Ejecutar una sola vez desde el editor vinculado a la hoja. */
function setupRutaCO2() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) throw new Error("Abre Apps Script desde una hoja de cálculo.");

  PropertiesService.getScriptProperties().setProperty(
    SETTINGS.SPREADSHEET_PROPERTY,
    spreadsheet.getId(),
  );

  let sheet = spreadsheet.getSheetByName(SETTINGS.SHEET_NAME);
  if (!sheet) sheet = spreadsheet.insertSheet(SETTINGS.SHEET_NAME);
  ensureHeaders_(sheet);
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, HEADERS.length)
    .setFontWeight("bold")
    .setBackground("#dff3e9")
    .setFontColor("#075940");
  sheet.autoResizeColumns(1, HEADERS.length);
  return `RutaCO2 configurado en ${spreadsheet.getName()}`;
}

/** Respuesta de salud; nunca expone filas ni estadísticas. */
function doGet() {
  return json_({ ok: true, service: "RutaCO2 IRNAS", version: SETTINGS.FACTOR_VERSION });
}

function doPost(event) {
  let lock;
  try {
    const payload = parsePayload_(event);
    const normalized = validatePayload_(payload);
    const calculation = calculateResult_(normalized);

    lock = LockService.getScriptLock();
    if (!lock.tryLock(10000)) throw new Error("storage-busy");

    const sheet = getResponseSheet_();
    ensureHeaders_(sheet);
    const now = new Date();
    const existing = findResponse_(sheet, normalized.responseId);
    const row = buildRow_(normalized, calculation, existing.createdAt || now, now);

    if (existing.rowNumber) {
      sheet.getRange(existing.rowNumber, 1, 1, HEADERS.length).setValues([row]);
    } else {
      sheet.appendRow(row);
    }
    SpreadsheetApp.flush();

    const stats = calculateStoredStats_(sheet, calculation.annualKg, normalized.researchGroup);
    return json_({
      ok: true,
      updated: Boolean(existing.rowNumber),
      annualKg: round_(calculation.annualKg, 4),
      global: stats.global,
      group: stats.group,
      factorVersion: SETTINGS.FACTOR_VERSION,
    });
  } catch (error) {
    const allowedErrors = [
      "invalid-payload", "calculation-mismatch", "not-configured",
      "storage-busy", "sheet-structure-changed",
    ];
    const message = error && allowedErrors.includes(error.message) ? error.message : "storage-failed";
    return json_({ ok: false, error: message });
  } finally {
    if (lock && lock.hasLock()) lock.releaseLock();
  }
}

function parsePayload_(event) {
  if (!event || !event.postData || !event.postData.contents) throw new Error("invalid-payload");
  let payload;
  try {
    payload = JSON.parse(event.postData.contents);
  } catch (error) {
    throw new Error("invalid-payload");
  }
  if (!payload || payload.action !== "save") throw new Error("invalid-payload");
  return payload;
}

function validatePayload_(payload) {
  const responseId = String(payload.responseId || "");
  const sex = String(payload.sex || "");
  const ageBand = String(payload.ageBand || "");
  const researchGroup = String(payload.researchGroup || "");
  const modeId = String(payload.modeId || "");
  const routeType = String(payload.routeType || "");

  if (!/^[A-Za-z0-9-]{20,64}$/.test(responseId)) throw new Error("invalid-payload");
  if (!ALLOWED_SEX.includes(sex)) throw new Error("invalid-payload");
  if (!ALLOWED_AGE_BANDS.includes(ageBand)) throw new Error("invalid-payload");
  if (!ALLOWED_GROUPS.includes(researchGroup)) throw new Error("invalid-payload");
  if (!Object.prototype.hasOwnProperty.call(MODE_FACTORS, modeId)) throw new Error("invalid-payload");
  if (!ALLOWED_ROUTE_TYPES.includes(routeType)) throw new Error("invalid-payload");

  const distanceKm = boundedNumber_(payload.distanceKm, 0.001, 20000);
  const workDays = boundedNumber_(payload.workDays, 1, 366);
  const occupancy = boundedNumber_(payload.occupancy, 1, 99);
  const clientAnnualKg = boundedNumber_(payload.clientAnnualKg, 0, 10000000);
  const customFactorG = payload.customFactorG === null || payload.customFactorG === ""
    ? null
    : boundedNumber_(payload.customFactorG, 0, 5000);
  const cabinClass = String(payload.cabinClass || "average");
  if (!ALLOWED_CABINS.includes(cabinClass)) throw new Error("invalid-payload");
  if (typeof payload.roundTrip !== "boolean" || typeof payload.radiativeForcing !== "boolean") {
    throw new Error("invalid-payload");
  }

  return {
    responseId,
    sex,
    ageBand,
    researchGroup,
    modeId,
    routeType,
    distanceKm,
    workDays,
    occupancy,
    clientAnnualKg,
    customFactorG,
    cabinClass,
    roundTrip: payload.roundTrip,
    radiativeForcing: payload.radiativeForcing,
  };
}

function calculateResult_(payload) {
  const mode = MODE_FACTORS[payload.modeId];
  const factor = resolveServerFactor_(payload, mode);
  const occupancy = mode.unit === "vehicle" ? payload.occupancy : 1;
  const personFactorG = mode.unit === "vehicle" ? factor.factorG / occupancy : factor.factorG;
  const annualDistanceKm = payload.distanceKm * (payload.roundTrip ? 2 : 1) * payload.workDays;
  const annualKg = annualDistanceKm * personFactorG / 1000;
  const tolerance = Math.max(0.05, annualKg * 0.005);

  if (Math.abs(annualKg - payload.clientAnnualKg) > tolerance) {
    throw new Error("calculation-mismatch");
  }

  let quality = factor.quality;
  if (payload.routeType === "estimated" && !mode.airType && ["A", "B"].includes(quality)) quality = "C";

  return { annualDistanceKm, annualKg, personFactorG, occupancy, quality };
}

function resolveServerFactor_(payload, mode) {
  if (mode.airType) {
    const cabin = mode.airType === "domestic" ? "average" : payload.cabinClass;
    const set = AIR_FACTORS_KG[mode.airType][cabin] || AIR_FACTORS_KG[mode.airType].average;
    const flightKg = payload.radiativeForcing ? set.withRf : set.withoutRf;
    return { factorG: (flightKg + set.wtt) * 1000, quality: mode.quality };
  }

  const canUseCustom = mode.customRequired || mode.allowOverride;
  if (canUseCustom && payload.customFactorG !== null) {
    return { factorG: payload.customFactorG, quality: "M" };
  }
  if (mode.customRequired || mode.factorG === null) throw new Error("invalid-payload");
  return { factorG: mode.factorG, quality: mode.quality };
}

function buildRow_(payload, calculation, createdAt, updatedAt) {
  return [
    createdAt,
    payload.responseId,
    payload.sex,
    payload.ageBand,
    payload.researchGroup,
    payload.modeId,
    round_(payload.distanceKm, 4),
    payload.roundTrip,
    round_(payload.workDays, 0),
    round_(calculation.occupancy, 2),
    round_(calculation.personFactorG, 6),
    round_(calculation.annualDistanceKm, 4),
    round_(calculation.annualKg, 6),
    payload.routeType,
    calculation.quality,
    SETTINGS.FACTOR_VERSION,
    updatedAt,
  ];
}

function findResponse_(sheet, responseId) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return { rowNumber: 0, createdAt: null };
  const values = sheet.getRange(2, COLUMN.RESPONSE_ID + 1, lastRow - 1, 1).getValues();
  for (let index = 0; index < values.length; index += 1) {
    if (String(values[index][0]) === responseId) {
      const rowNumber = index + 2;
      const createdAt = sheet.getRange(rowNumber, COLUMN.CREATED_AT + 1).getValue();
      return { rowNumber, createdAt };
    }
  }
  return { rowNumber: 0, createdAt: null };
}

function calculateStoredStats_(sheet, currentAnnualKg, researchGroup) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return { global: unavailableStats_(0), group: unavailableStats_(0) };
  }

  const rows = sheet.getRange(2, 1, lastRow - 1, HEADERS.length).getValues();
  const globalValues = rows
    .map((row) => Number(row[COLUMN.ANNUAL_KG]))
    .filter((value) => Number.isFinite(value) && value >= 0);
  const groupValues = rows
    .filter((row) => String(row[COLUMN.GROUP]) === researchGroup)
    .map((row) => Number(row[COLUMN.ANNUAL_KG]))
    .filter((value) => Number.isFinite(value) && value >= 0);

  return {
    global: populationStats_(globalValues, currentAnnualKg),
    group: populationStats_(groupValues, currentAnnualKg),
  };
}

function populationStats_(values, current) {
  if (values.length < SETTINGS.MIN_SAMPLE_SIZE) return unavailableStats_(values.length);
  const sorted = values.slice().sort((a, b) => a - b);
  const total = sorted.reduce((sum, value) => sum + value, 0);
  const mean = total / sorted.length;
  const middle = Math.floor(sorted.length / 2);
  const median = sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
  const rank = sorted.filter((value) => value < current - 0.000001).length + 1;
  const differencePercent = mean === 0 ? 0 : ((current - mean) / mean) * 100;
  return {
    available: true,
    n: sorted.length,
    mean: round_(mean, 4),
    median: round_(median, 4),
    rank,
    differencePercent: round_(differencePercent, 2),
  };
}

function unavailableStats_(count) {
  return { available: false, n: count, minimum: SETTINGS.MIN_SAMPLE_SIZE };
}

function getResponseSheet_() {
  const spreadsheetId = PropertiesService.getScriptProperties().getProperty(SETTINGS.SPREADSHEET_PROPERTY);
  if (!spreadsheetId) throw new Error("not-configured");
  const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName(SETTINGS.SHEET_NAME);
  if (!sheet) throw new Error("not-configured");
  return sheet;
}

function ensureHeaders_(sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    return;
  }
  const current = sheet.getRange(1, 1, 1, HEADERS.length).getValues()[0];
  if (current.join("|") !== HEADERS.join("|")) throw new Error("sheet-structure-changed");
}

function boundedNumber_(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < min || number > max) throw new Error("invalid-payload");
  return number;
}

function round_(value, decimals) {
  const scale = 10 ** decimals;
  return Math.round(Number(value) * scale) / scale;
}

function json_(value) {
  return ContentService
    .createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}

