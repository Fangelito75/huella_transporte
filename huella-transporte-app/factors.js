(function () {
  "use strict";

  const SOURCES = {
    R02: {
      label: "MITECO · Desplazamientos in itinere",
      url: "https://www.miteco.gob.es/content/dam/miteco/es/cambio-climatico/temas/mitigacion-politicas-y-medidas/viajesinitinere_tcm30-508472.pdf",
    },
    R03: {
      label: "MITECO · Factores de emisión 2007–2025",
      url: "https://www.miteco.gob.es/content/dam/miteco/es/cambio-climatico/temas/mitigacion-politicas-y-medidas/factoresemision_tcm30-542746.xlsx",
    },
    R05: {
      label: "UK Government · GHG Conversion Factors 2025",
      url: "https://www.gov.uk/government/publications/greenhouse-gas-reporting-conversion-factors-2025",
    },
    R06: {
      label: "UK Government · Factores completos 2025",
      url: "https://assets.publishing.service.gov.uk/media/6846a4f55e92539572806125/ghg-conversion-factors-2025-full-set.xlsx",
    },
    R07: {
      label: "ADEME · Impact CO₂, patinete eléctrico",
      url: "https://impactco2.fr/outils/transport/trottinette",
    },
    R09: {
      label: "Jia y Gao (2025) · Patinete compartido en 100 ciudades",
      url: "https://doi.org/10.1016/j.trd.2025.105009",
    },
    R10: {
      label: "ICAO · Carbon Emissions Calculator",
      url: "https://www.icao.int/environmental-protection/environmental-tools/icec",
    },
    R12: {
      label: "MITECO · Viajes de trabajo",
      url: "https://www.miteco.gob.es/content/dam/miteco/es/cambio-climatico/temas/mitigacion-politicas-y-medidas/viajespormotivosdetrabajo_tcm30-486205.pdf",
    },
  };

  const modes = [
    {
      id: "T01", category: "Movilidad activa", name: "A pie", propulsion: "Sin propulsión",
      factorG: 0, unitType: "person", quality: "A", uncertainty: 0, source: "R02",
      geography: "España", year: "2022", routeProfile: "pedestrian", boundary: "Fase de uso",
    },
    {
      id: "T02", category: "Movilidad activa", name: "Bicicleta convencional", propulsion: "Mecánica",
      factorG: 0, unitType: "person", quality: "A", uncertainty: 0, source: "R02",
      geography: "España", year: "2022", routeProfile: "bicycle", boundary: "Fase de uso",
    },
    {
      id: "T03", category: "Micromovilidad", name: "Bicicleta eléctrica", propulsion: "Eléctrica",
      factorG: 2.58, unitType: "person", quality: "B", uncertainty: 0.2, source: "R03",
      geography: "España", year: "2025", routeProfile: "bicycle", boundary: "Electricidad de uso",
      note: "Consumo provisional de 1,0 kWh/100 km y mix eléctrico español de 0,258 kg CO₂e/kWh.",
    },
    {
      id: "T04", category: "Micromovilidad", name: "Patinete eléctrico privado", propulsion: "Eléctrica",
      factorG: 3.7668, unitType: "person", quality: "B", uncertainty: 0.25, source: "R07",
      geography: "España", year: "2024/2025", routeProfile: "motor_scooter", boundary: "Electricidad de uso",
      note: "Consumo de 1,46 kWh/100 km localizado con el mix español. Ciclo de vida ADEME: 24,9 g CO₂e/km.",
    },
    {
      id: "T05", category: "Micromovilidad", name: "Patinete eléctrico compartido", propulsion: "Servicio compartido",
      factorG: 50.17, unitType: "person", quality: "C", uncertainty: null, rangeG: [30, 124], source: "R09",
      geography: "España / 100 ciudades de la UE", year: "2025", routeProfile: "motor_scooter", boundary: "Ciclo de vida",
      note: "Promedio país publicado para España; el estudio observa 30–124 g CO₂e/km en Europa según uso, vida útil y electricidad. Sustituir por dato del operador.",
      allowOverride: true,
    },
    {
      id: "T06", category: "Dos ruedas", name: "Ciclomotor de gasolina", propulsion: "Gasolina",
      factorG: 58, unitType: "vehicle", quality: "A", uncertainty: 0.1, source: "R03",
      geography: "España", year: "2025", routeProfile: "motor_scooter", boundary: "Fase de uso",
    },
    {
      id: "T07", category: "Dos ruedas", name: "Motocicleta de gasolina", propulsion: "Gasolina",
      factorG: 99, unitType: "vehicle", quality: "A", uncertainty: 0.1, source: "R03",
      geography: "España", year: "2025", routeProfile: "motorcycle", boundary: "Fase de uso",
    },
    {
      id: "T08", category: "Dos ruedas", name: "Motocicleta eléctrica", propulsion: "Eléctrica",
      factorG: 15.48, unitType: "vehicle", quality: "B", uncertainty: 0.25, source: "R03",
      geography: "España", year: "2025", routeProfile: "motorcycle", boundary: "Electricidad de uso",
      note: "Consumo provisional de 6,0 kWh/100 km; sustituir por el consumo del modelo cuando se conozca.",
    },
    {
      id: "T09", category: "Turismo", name: "Coche de gasolina", propulsion: "Gasolina",
      factorG: 183, unitType: "vehicle", quality: "A", uncertainty: 0.1, source: "R03",
      geography: "España", year: "2025", routeProfile: "auto", boundary: "Fase de uso",
    },
    {
      id: "T10", category: "Turismo", name: "Coche diésel", propulsion: "Gasóleo",
      factorG: 159, unitType: "vehicle", quality: "A", uncertainty: 0.1, source: "R03",
      geography: "España", year: "2025", routeProfile: "auto", boundary: "Fase de uso",
    },
    {
      id: "T11", category: "Turismo", name: "Coche GLP", propulsion: "GLP",
      factorG: 186, unitType: "vehicle", quality: "A", uncertainty: 0.1, source: "R03",
      geography: "España", year: "2025", routeProfile: "auto", boundary: "Fase de uso",
    },
    {
      id: "T12", category: "Turismo", name: "Coche GNC", propulsion: "Gas natural comprimido",
      factorG: 181, unitType: "vehicle", quality: "A", uncertainty: 0.1, source: "R03",
      geography: "España", year: "2025", routeProfile: "auto", boundary: "Fase de uso",
    },
    {
      id: "T13", category: "Turismo", name: "Coche híbrido no enchufable", propulsion: "Híbrido",
      factorG: 129.61, unitType: "vehicle", quality: "C", uncertainty: 0.35, source: "R06",
      geography: "Reino Unido (proxy)", year: "2025", routeProfile: "auto", boundary: "Fase de uso",
    },
    {
      id: "T14", category: "Turismo", name: "Coche híbrido enchufable", propulsion: "PHEV",
      factorG: null, unitType: "vehicle", quality: "D", uncertainty: 0.3, source: "R03",
      geography: "Dato del vehículo", year: "Actual", routeProfile: "auto", boundary: "Combustible + electricidad",
      customRequired: true,
      note: "Introduzca un factor específico obtenido del consumo real de combustible y electricidad.",
    },
    {
      id: "T15", category: "Turismo", name: "Coche eléctrico", propulsion: "BEV",
      factorG: 52.92, unitType: "vehicle", quality: "B", uncertainty: 0.25, source: "R03",
      geography: "España", year: "2025", routeProfile: "auto", boundary: "Electricidad de uso",
      note: "Consumo medio de 20,51 kWh/100 km y mix eléctrico español de 0,258 kg CO₂e/kWh.",
    },
    {
      id: "T16", category: "Turismo", name: "Coche — combustible desconocido", propulsion: "Flota media",
      factorG: 99, unitType: "person", quality: "A", uncertainty: 0.15, source: "R02",
      geography: "España", year: "2022", routeProfile: "auto", boundary: "Fase de uso",
      note: "Factor simplificado por persona-km; no se divide de nuevo entre ocupantes.",
    },
    {
      id: "T17", category: "Transporte contratado", name: "Taxi convencional", propulsion: "Flota media",
      factorG: 148.61, unitType: "person", quality: "C", uncertainty: 0.35, source: "R06",
      geography: "Reino Unido (proxy)", year: "2025", routeProfile: "taxi", boundary: "Fase de uso",
    },
    {
      id: "T18", category: "Transporte contratado", name: "VTC", propulsion: "Flota media",
      factorG: 148.61, unitType: "person", quality: "C", uncertainty: 0.4, source: "R06",
      geography: "Proxy de taxi", year: "2025", routeProfile: "taxi", boundary: "Fase de uso",
    },
    {
      id: "T19", category: "Transporte contratado", name: "Taxi o VTC eléctrico", propulsion: "BEV",
      factorG: 52.92, unitType: "vehicle", quality: "B", uncertainty: 0.35, source: "R03",
      geography: "España", year: "2025", routeProfile: "taxi", boundary: "Electricidad de uso",
      note: "No incluye kilómetros recorridos en vacío; añádalos mediante un factor del operador si se conocen.",
    },
    {
      id: "T20", category: "Transporte colectivo", name: "Autobús urbano", propulsion: "Flota media",
      factorG: 48, unitType: "person", quality: "A", uncertainty: 0.15, source: "R02",
      geography: "España", year: "2022", routeProfile: "bus", boundary: "Fase de uso",
    },
    {
      id: "T21", category: "Transporte colectivo", name: "Autobús interurbano", propulsion: "Flota media",
      factorG: 48, unitType: "person", quality: "B", uncertainty: 0.25, source: "R02",
      geography: "España (asimilado)", year: "2022", routeProfile: "bus", boundary: "Fase de uso",
    },
    {
      id: "T22", category: "Transporte colectivo", name: "Autocar", propulsion: "Flota media",
      factorG: 39.48, unitType: "person", quality: "C", uncertainty: 0.35, source: "R06",
      geography: "Reino Unido (proxy)", year: "2025", routeProfile: "bus", boundary: "Fase de uso",
    },
    {
      id: "T23", category: "Transporte colectivo", name: "Lanzadera de empresa", propulsion: "Autocar",
      factorG: 39.48, unitType: "person", quality: "C", uncertainty: 0.4, source: "R06",
      geography: "Proxy de autocar", year: "2025", routeProfile: "bus", boundary: "Fase de uso",
      allowOverride: true,
    },
    {
      id: "T24", category: "Transporte colectivo", name: "Autobús eléctrico", propulsion: "Eléctrica",
      factorG: null, unitType: "person", quality: "D", uncertainty: 0.35, source: "R03",
      geography: "Dato del operador", year: "Actual", routeProfile: "bus", boundary: "Electricidad de uso",
      customRequired: true,
      note: "Introduzca el factor por pasajero-km del operador o calcúlelo con kWh, kilómetros y pasajeros-km.",
    },
    {
      id: "T25", category: "Ferrocarril", name: "Metro", propulsion: "Eléctrica",
      factorG: 2, unitType: "person", quality: "A", uncertainty: 0.15, source: "R02",
      geography: "España", year: "2022", routeProfile: "rail", distanceStretch: 1.2, boundary: "Fase de uso",
    },
    {
      id: "T26", category: "Ferrocarril", name: "Tranvía o metro ligero", propulsion: "Eléctrica",
      factorG: 21.21, unitType: "person", quality: "C", uncertainty: 0.35, source: "R06",
      geography: "Reino Unido (proxy)", year: "2025", routeProfile: "rail", distanceStretch: 1.2, boundary: "Fase de uso",
    },
    {
      id: "T27", category: "Ferrocarril", name: "Tren de cercanías", propulsion: "Eléctrica/diésel",
      factorG: 4, unitType: "person", quality: "A", uncertainty: 0.15, source: "R02",
      geography: "España", year: "2023", routeProfile: "rail", distanceStretch: 1.12, boundary: "Fase de uso",
    },
    {
      id: "T28", category: "Ferrocarril", name: "Tren regional", propulsion: "Eléctrica/diésel",
      factorG: 4, unitType: "person", quality: "B", uncertainty: 0.25, source: "R02",
      geography: "España (asimilado)", year: "2023", routeProfile: "rail", distanceStretch: 1.12, boundary: "Fase de uso",
    },
    {
      id: "T29", category: "Ferrocarril", name: "Tren de larga distancia", propulsion: "Eléctrica",
      factorG: 4, unitType: "person", quality: "B", uncertainty: 0.25, source: "R02",
      geography: "España (asimilado)", year: "2023", routeProfile: "rail", distanceStretch: 1.1, boundary: "Fase de uso",
    },
    {
      id: "T30", category: "Ferrocarril", name: "Alta velocidad / AVE", propulsion: "Eléctrica",
      factorG: 4, unitType: "person", quality: "B", uncertainty: 0.25, source: "R02",
      geography: "España (asimilado)", year: "2023", routeProfile: "rail", distanceStretch: 1.08, boundary: "Fase de uso",
    },
    {
      id: "T31", category: "Marítimo", name: "Ferry de pasajeros", propulsion: "Combustible variable",
      factorG: null, unitType: "person", quality: "D", uncertainty: 0.45, source: "R12",
      geography: "Dato del operador/ruta", year: "Actual", routeProfile: "sea", distanceStretch: 1.08, boundary: "Fase de uso",
      customRequired: true,
    },
    {
      id: "T32", category: "Marítimo", name: "Barco rápido", propulsion: "Combustible variable",
      factorG: null, unitType: "person", quality: "D", uncertainty: 0.5, source: "R12",
      geography: "Dato del operador/ruta", year: "Actual", routeProfile: "sea", distanceStretch: 1.08, boundary: "Fase de uso",
      customRequired: true,
    },
    {
      id: "T33", category: "Aéreo", name: "Avión nacional", propulsion: "Aviación",
      factorG: null, unitType: "person", quality: "C", uncertainty: 0.3, source: "R06",
      geography: "Ruta", year: "2025", routeProfile: "air", airType: "domestic", distanceStretch: 1.08,
      boundary: "CO₂e del vuelo + WTT; efectos no-CO₂ configurables",
    },
    {
      id: "T34", category: "Aéreo", name: "Avión internacional", propulsion: "Aviación",
      factorG: null, unitType: "person", quality: "C", uncertainty: 0.3, source: "R06",
      geography: "Ruta", year: "2025", routeProfile: "air", airType: "international", distanceStretch: 1.08,
      boundary: "CO₂e del vuelo + WTT; efectos no-CO₂ configurables",
    },
    {
      id: "T35", category: "Otros", name: "Medio no incluido", propulsion: "Definido por usuario",
      factorG: null, unitType: "person", quality: "D", uncertainty: 0.4, source: "R12",
      geography: "Definido por usuario", year: "Actual", routeProfile: "auto", boundary: "Definido por usuario",
      customRequired: true,
    },
  ];

  const airFactorsKg = {
    domestic: {
      average: { withRf: 0.22928, withoutRf: 0.13552, wtt: 0.0335 },
    },
    short: {
      average: { withRf: 0.12786, withoutRf: 0.07559, wtt: 0.02286 },
      economy: { withRf: 0.12576, withoutRf: 0.07435, wtt: 0.02249 },
      business: { withRf: 0.18863, withoutRf: 0.11152, wtt: 0.03373 },
    },
    long: {
      average: { withRf: 0.15282, withoutRf: 0.09043, wtt: 0.03213 },
      economy: { withRf: 0.11704, withoutRf: 0.06926, wtt: 0.02461 },
      premium: { withRf: 0.18726, withoutRf: 0.11081, wtt: 0.03937 },
      business: { withRf: 0.3394, withoutRf: 0.20083, wtt: 0.07137 },
      first: { withRf: 0.46814, withoutRf: 0.27701, wtt: 0.09844 },
    },
    international: {
      average: { withRf: 0.14253, withoutRf: 0.0842, wtt: 0.02162 },
      economy: { withRf: 0.10916, withoutRf: 0.06449, wtt: 0.01656 },
      premium: { withRf: 0.17465, withoutRf: 0.10318, wtt: 0.02649 },
      business: { withRf: 0.31656, withoutRf: 0.18701, wtt: 0.04802 },
      first: { withRf: 0.43663, withoutRf: 0.25794, wtt: 0.06623 },
    },
  };

  window.TRANSPORT_DATA = Object.freeze({
    sources: SOURCES,
    modes: modes,
    airFactorsKg: airFactorsKg,
  });
})();
