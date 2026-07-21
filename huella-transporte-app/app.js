(function () {
  "use strict";

  const data = window.TRANSPORT_DATA;
  const config = window.RUTACO2_CONFIG || {};
  if (!data) {
    document.body.innerHTML = "<p>No se han podido cargar los factores de emisión.</p>";
    return;
  }

  const $ = (selector) => document.querySelector(selector);
  const byId = (id) => document.getElementById(id);
  const numberEs = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 1 });
  const numberEsPrecise = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 2 });
  const geocodeCache = new Map();

  const elements = {
    form: byId("route-form"),
    sex: byId("sex"),
    ageBand: byId("age-band"),
    researchGroup: byId("research-group"),
    origin: byId("origin"),
    destination: byId("destination"),
    roundTrip: byId("round-trip"),
    swapRoute: byId("swap-route"),
    routeButton: byId("route-button"),
    routeButtonLabel: byId("route-button-label"),
    routeStatus: byId("route-status"),
    mode: byId("transport-mode"),
    airFields: byId("air-fields"),
    cabinClass: byId("cabin-class"),
    radiativeForcing: byId("radiative-forcing"),
    occupancyField: byId("occupancy-field"),
    occupancy: byId("occupancy"),
    customFields: byId("custom-factor-fields"),
    customFactor: byId("custom-factor"),
    customFactorUnit: byId("custom-factor-unit"),
    customSource: byId("custom-source"),
    qualityBadge: byId("quality-badge"),
    factorName: byId("factor-name"),
    factorDetail: byId("factor-detail"),
    factorSource: byId("factor-source"),
    distance: byId("distance-km"),
    workDays: byId("work-days"),
    mapRouteLabel: byId("map-route-label"),
    routeMethod: byId("route-method"),
    annualEmissions: byId("annual-emissions"),
    resultQuality: byId("result-quality"),
    uncertaintyRange: byId("uncertainty-range"),
    rangeFill: byId("range-fill"),
    rangeMarker: byId("range-marker"),
    resultExplanation: byId("result-explanation"),
    annualDistance: byId("annual-distance"),
    appliedFactor: byId("applied-factor"),
    appliedUnit: byId("applied-unit"),
    comparisonChart: byId("comparison-chart"),
    downloadResult: byId("download-result"),
    dataConsent: byId("data-consent"),
    saveResult: byId("save-result"),
    storageState: byId("storage-state"),
    storageStatus: byId("storage-status"),
    benchmarkResults: byId("benchmark-results"),
    savedEmissions: byId("saved-emissions"),
    globalMean: byId("global-mean"),
    globalDifference: byId("global-difference"),
    globalPosition: byId("global-position"),
    globalSample: byId("global-sample"),
    groupMean: byId("group-mean"),
    groupPosition: byId("group-position"),
  };

  const state = {
    map: null,
    tileLayer: null,
    routeLayer: null,
    endpointLayers: [],
    originPoint: null,
    destinationPoint: null,
    routeDistanceKm: null,
    routeMethod: "none",
    routeApproximate: false,
    manualDistance: false,
    internalDistanceUpdate: false,
    result: null,
    routeRequestId: 0,
    responseId: getResponseId(),
    saving: false,
    savedFingerprint: null,
  };

  init();

  function init() {
    populateModes();
    initMap();
    attachEvents();
    updateModeUI();
    updateResults();
    updateStorageUI();
  }

  function populateModes() {
    const categories = [];
    for (const mode of data.modes) {
      if (!categories.includes(mode.category)) categories.push(mode.category);
    }

    for (const category of categories) {
      const group = document.createElement("optgroup");
      group.label = category;
      for (const mode of data.modes.filter((item) => item.category === category)) {
        const option = document.createElement("option");
        option.value = mode.id;
        option.textContent = `${mode.name} · ${mode.propulsion}`;
        if (mode.id === "T09") option.selected = true;
        group.appendChild(option);
      }
      elements.mode.appendChild(group);
    }
  }

  function initMap() {
    if (typeof window.L === "undefined") {
      byId("map").innerHTML = '<p class="map-error">No se pudo cargar el mapa. Puedes introducir la distancia manualmente.</p>';
      return;
    }

    state.map = window.L.map("map", {
      zoomControl: true,
      scrollWheelZoom: true,
    }).setView([40.25, -3.7], 6);

    state.tileLayer = window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(state.map);
  }

  function attachEvents() {
    elements.form.addEventListener("submit", handleRouteSubmit);
    elements.origin.addEventListener("input", invalidateRouteAfterAddressChange);
    elements.destination.addEventListener("input", invalidateRouteAfterAddressChange);
    elements.swapRoute.addEventListener("click", handleSwap);
    elements.mode.addEventListener("change", handleModeChange);
    elements.roundTrip.addEventListener("change", updateResults);
    elements.occupancy.addEventListener("input", updateResults);
    elements.workDays.addEventListener("input", updateResults);
    elements.customFactor.addEventListener("input", () => {
      updateFactorSummary();
      updateResults();
    });
    elements.customSource.addEventListener("input", updateResults);
    elements.cabinClass.addEventListener("change", () => {
      updateFactorSummary();
      updateResults();
    });
    elements.radiativeForcing.addEventListener("change", () => {
      updateFactorSummary();
      updateResults();
    });
    elements.distance.addEventListener("input", () => {
      if (!state.internalDistanceUpdate) state.manualDistance = true;
      updateFactorSummary();
      updateResults();
    });
    elements.downloadResult.addEventListener("click", downloadCsv);
    elements.saveResult.addEventListener("click", saveSurveyResult);
    elements.dataConsent.addEventListener("change", updateStorageUI);
    for (const field of [elements.sex, elements.ageBand, elements.researchGroup]) {
      field.addEventListener("change", () => {
        invalidateBenchmark();
        updateStorageUI();
      });
    }
  }

  async function handleRouteSubmit(event) {
    event.preventDefault();
    const originText = elements.origin.value.trim();
    const destinationText = elements.destination.value.trim();

    if (!originText || !destinationText) {
      setRouteStatus("Introduce un origen y un destino.", true);
      (!originText ? elements.origin : elements.destination).focus();
      return;
    }

    if (originText.toLocaleLowerCase("es") === destinationText.toLocaleLowerCase("es")) {
      setRouteStatus("El origen y el destino deben ser distintos.", true);
      return;
    }

    const requestId = ++state.routeRequestId;
    setLoading(true, "Localizando direcciones…");

    try {
      const origin = await geocode(originText);
      await wait(1100);
      const destination = await geocode(destinationText);
      if (requestId !== state.routeRequestId) return;

      state.originPoint = origin;
      state.destinationPoint = destination;
      elements.mapRouteLabel.textContent = `${shortPlace(origin.displayName)} → ${shortPlace(destination.displayName)}`;
      await calculateRouteForCurrentMode(requestId);
      setRouteStatus("Ruta calculada. Puedes corregir la distancia si dispones de un dato mejor.");
    } catch (error) {
      if (requestId !== state.routeRequestId) return;
      setRouteStatus(humanizeError(error), true);
    } finally {
      if (requestId === state.routeRequestId) setLoading(false);
    }
  }

  function handleSwap() {
    const oldOrigin = elements.origin.value;
    elements.origin.value = elements.destination.value;
    elements.destination.value = oldOrigin;

    const oldPoint = state.originPoint;
    state.originPoint = state.destinationPoint;
    state.destinationPoint = oldPoint;

    if (state.originPoint && state.destinationPoint) {
      elements.mapRouteLabel.textContent = `${shortPlace(state.originPoint.displayName)} → ${shortPlace(state.destinationPoint.displayName)}`;
      drawExistingRouteReversed();
    }
  }

  function invalidateRouteAfterAddressChange() {
    if (!state.originPoint && !state.destinationPoint) return;
    state.routeRequestId += 1;
    state.originPoint = null;
    state.destinationPoint = null;
    state.routeDistanceKm = null;
    state.routeMethod = "none";
    state.routeApproximate = false;
    state.manualDistance = false;
    setDistance("");
    clearMapRoute();
    elements.mapRouteLabel.textContent = "La dirección ha cambiado";
    elements.routeMethod.textContent = "Pendiente";
    setRouteStatus("Vuelve a calcular para actualizar la ruta.");
    updateResults();
  }

  async function handleModeChange() {
    elements.customFactor.value = "";
    elements.customSource.value = "";
    updateModeUI();
    if (state.originPoint && state.destinationPoint) {
      const requestId = ++state.routeRequestId;
      setLoading(true, "Adaptando la ruta al transporte…");
      try {
        await calculateRouteForCurrentMode(requestId);
        setRouteStatus("Ruta actualizada para el medio seleccionado.");
      } catch (error) {
        setRouteStatus(humanizeError(error), true);
      } finally {
        if (requestId === state.routeRequestId) setLoading(false);
      }
    }
  }

  function updateModeUI() {
    const mode = getMode();
    const isAir = Boolean(mode.airType);
    const needsCustom = Boolean(mode.customRequired || mode.allowOverride);

    elements.airFields.hidden = !isAir;
    elements.cabinClass.disabled = mode.airType === "domestic";
    if (mode.airType === "domestic") elements.cabinClass.value = "average";

    elements.occupancyField.hidden = mode.unitType !== "vehicle";
    elements.customFields.hidden = !needsCustom;
    elements.customFactor.required = Boolean(mode.customRequired);
    elements.customFactor.placeholder = mode.allowOverride ? "Opcional" : "Dato requerido";
    elements.customFactorUnit.textContent = mode.unitType === "vehicle" ? "g CO₂e/veh·km" : "g CO₂e/p·km";

    if (!needsCustom) {
      elements.customFactor.value = "";
      elements.customSource.value = "";
    }

    updateFactorSummary();
    updateResults();
  }

  function getMode() {
    return data.modes.find((mode) => mode.id === elements.mode.value) || data.modes[0];
  }

  async function geocode(query) {
    const cacheKey = query.toLocaleLowerCase("es");
    const cached = geocodeCache.get(cacheKey);
    if (cached) return cached;

    const params = new URLSearchParams({
      q: query,
      format: "jsonv2",
      limit: "1",
      addressdetails: "0",
    });

    const response = await fetchWithTimeout(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
      headers: { "Accept-Language": "es" },
    }, 20000);

    if (!response.ok) throw new Error("geocoding-service");
    const results = await response.json();
    if (!Array.isArray(results) || !results.length) throw new Error("place-not-found");

    const point = {
      lat: Number(results[0].lat),
      lon: Number(results[0].lon),
      displayName: results[0].display_name || query,
    };
    geocodeCache.set(cacheKey, point);
    return point;
  }

  async function calculateRouteForCurrentMode(requestId) {
    const mode = getMode();
    const start = state.originPoint;
    const end = state.destinationPoint;
    if (!start || !end) return;

    let route;
    if (["air", "rail", "sea"].includes(mode.routeProfile)) {
      route = approximateRoute(start, end, mode);
    } else {
      try {
        route = await requestValhallaRoute(start, end, mode.routeProfile);
      } catch (error) {
        route = approximateRoute(start, end, mode);
        route.fallbackReason = error.message;
      }
    }

    if (requestId !== state.routeRequestId) return;
    state.routeDistanceKm = route.distanceKm;
    state.routeMethod = route.method;
    state.routeApproximate = route.approximate;
    state.manualDistance = false;
    setDistance(route.distanceKm);
    drawRoute(route.coordinates, start, end, route.approximate);
    elements.routeMethod.textContent = route.method;
    elements.routeMethod.dataset.approximate = String(route.approximate);
    updateFactorSummary();
    updateResults();
  }

  async function requestValhallaRoute(start, end, costing) {
    const payload = {
      locations: [
        { lat: start.lat, lon: start.lon, type: "break" },
        { lat: end.lat, lon: end.lon, type: "break" },
      ],
      costing: costing,
      units: "kilometers",
      language: "es-ES",
      directions_options: { units: "kilometers" },
    };

    const response = await fetchWithTimeout("https://valhalla1.openstreetmap.de/route", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Client-Id": "rutaco2-prototipo-local",
      },
      body: JSON.stringify(payload),
    }, 25000);

    if (!response.ok) throw new Error("routing-service");
    const result = await response.json();
    const summary = result && result.trip && result.trip.summary;
    const legs = result && result.trip && result.trip.legs;
    if (!summary || !Array.isArray(legs) || !legs.length) throw new Error("route-not-found");

    const coordinates = [];
    for (const leg of legs) {
      const decoded = decodePolyline(leg.shape, 6);
      if (coordinates.length && decoded.length) decoded.shift();
      coordinates.push(...decoded);
    }

    return {
      distanceKm: Number(summary.length),
      coordinates: coordinates,
      approximate: false,
      method: routeMethodLabel(costing),
    };
  }

  function approximateRoute(start, end, mode) {
    const directKm = haversineKm(start.lat, start.lon, end.lat, end.lon);
    const stretch = mode.distanceStretch || fallbackStretch(mode.routeProfile);
    const label = mode.routeProfile === "air"
      ? "Gran círculo + 8 %"
      : mode.routeProfile === "rail"
        ? `Estimación ferroviaria ×${numberEsPrecise.format(stretch)}`
        : mode.routeProfile === "sea"
          ? `Estimación marítima ×${numberEsPrecise.format(stretch)}`
          : `Estimación geográfica ×${numberEsPrecise.format(stretch)}`;

    return {
      distanceKm: directKm * stretch,
      coordinates: greatCirclePoints(start, end, 72),
      approximate: true,
      method: label,
    };
  }

  function fallbackStretch(profile) {
    if (profile === "pedestrian" || profile === "bicycle") return 1.25;
    if (profile === "air") return 1.08;
    if (profile === "rail") return 1.15;
    if (profile === "sea") return 1.08;
    return 1.2;
  }

  function routeMethodLabel(profile) {
    const labels = {
      pedestrian: "Ruta peatonal",
      bicycle: "Ruta ciclista",
      motor_scooter: "Ruta de micromovilidad",
      motorcycle: "Ruta de motocicleta",
      auto: "Ruta por carretera",
      taxi: "Ruta por carretera",
      bus: "Ruta de autobús",
    };
    return labels[profile] || "Ruta calculada";
  }

  function drawRoute(coordinates, start, end, approximate) {
    if (!state.map || typeof window.L === "undefined") return;
    clearMapRoute();

    state.routeLayer = window.L.polyline(coordinates, {
      color: approximate ? "#447aa1" : "#0d7557",
      weight: 5,
      opacity: 0.88,
      dashArray: approximate ? "9 9" : null,
      lineCap: "round",
    }).addTo(state.map);

    const startMarker = window.L.circleMarker([start.lat, start.lon], {
      radius: 7,
      color: "#ffffff",
      weight: 3,
      fillColor: "#0d7557",
      fillOpacity: 1,
    }).bindPopup(`<strong>Origen</strong><br>${escapeHtml(shortPlace(start.displayName))}`).addTo(state.map);

    const endMarker = window.L.circleMarker([end.lat, end.lon], {
      radius: 7,
      color: "#ffffff",
      weight: 3,
      fillColor: "#d69d24",
      fillOpacity: 1,
    }).bindPopup(`<strong>Destino</strong><br>${escapeHtml(shortPlace(end.displayName))}`).addTo(state.map);

    state.endpointLayers = [startMarker, endMarker];
    const bounds = state.routeLayer.getBounds();
    if (bounds.isValid()) state.map.fitBounds(bounds, { padding: [38, 38], maxZoom: 15 });
  }

  function drawExistingRouteReversed() {
    if (!state.routeLayer || !state.map) return;
    const coordinates = state.routeLayer.getLatLngs().slice().reverse().map((point) => [point.lat, point.lng]);
    drawRoute(coordinates, state.originPoint, state.destinationPoint, state.routeApproximate);
  }

  function clearMapRoute() {
    if (!state.map) return;
    if (state.routeLayer) state.map.removeLayer(state.routeLayer);
    state.routeLayer = null;
    for (const layer of state.endpointLayers) state.map.removeLayer(layer);
    state.endpointLayers = [];
  }

  function setDistance(value) {
    state.internalDistanceUpdate = true;
    elements.distance.value = value === "" || value === null ? "" : Number(value).toFixed(2);
    state.internalDistanceUpdate = false;
  }

  function resolveFactor(mode) {
    const customValue = parseOptionalNumber(elements.customFactor.value);
    const hasCustom = customValue !== null && (mode.customRequired || mode.allowOverride);

    if (hasCustom) {
      return {
        factorG: customValue,
        baseFactorG: customValue,
        quality: "M",
        uncertainty: elements.customSource.value.trim() ? 0.1 : 0.25,
        sourceLabel: elements.customSource.value.trim() || "Factor introducido por el usuario",
        sourceUrl: "",
        boundary: mode.boundary,
        custom: true,
      };
    }

    if (mode.airType) {
      const cabin = mode.airType === "domestic" ? "average" : elements.cabinClass.value;
      const group = mode.airType === "domestic" ? "domestic" : "international";
      const factorSet = data.airFactorsKg[group][cabin] || data.airFactorsKg[group].average;
      const flightKg = elements.radiativeForcing.checked ? factorSet.withRf : factorSet.withoutRf;
      const totalKg = flightKg + factorSet.wtt;
      const source = data.sources[mode.source];
      return {
        factorG: totalKg * 1000,
        baseFactorG: totalKg * 1000,
        quality: mode.quality,
        uncertainty: mode.uncertainty,
        sourceLabel: source.label,
        sourceUrl: source.url,
        boundary: elements.radiativeForcing.checked
          ? "Vuelo + energía aguas arriba + efectos no-CO₂"
          : "Vuelo + energía aguas arriba, sin efectos no-CO₂",
        custom: false,
      };
    }

    if (mode.factorG === null) return null;
    const source = data.sources[mode.source];
    return {
      factorG: mode.factorG,
      baseFactorG: mode.factorG,
      quality: mode.quality,
      uncertainty: mode.uncertainty,
      rangeG: mode.rangeG || null,
      sourceLabel: source ? source.label : "Referencia documentada",
      sourceUrl: source ? source.url : "",
      boundary: mode.boundary,
      custom: false,
    };
  }

  function updateFactorSummary() {
    const mode = getMode();
    const factor = resolveFactor(mode);
    const source = data.sources[mode.source];

    elements.qualityBadge.textContent = factor ? factor.quality : mode.quality;
    elements.qualityBadge.dataset.quality = factor ? factor.quality : mode.quality;
    elements.factorName.textContent = factor
      ? factor.custom ? "Dato específico" : qualityLabel(factor.quality)
      : "Dato específico necesario";

    if (factor) {
      const unit = mode.unitType === "vehicle" ? "vehículo·km" : "persona·km";
      const range = factor.rangeG ? ` · rango ${factor.rangeG[0]}–${factor.rangeG[1]}` : "";
      elements.factorDetail.textContent = `${numberEsPrecise.format(factor.baseFactorG)} g CO₂e/${unit}${range} · ${factor.boundary}`;
    } else {
      elements.factorDetail.textContent = mode.note || "Introduzca un factor documentado para calcular.";
    }

    const url = factor && factor.sourceUrl ? factor.sourceUrl : source ? source.url : "";
    elements.factorSource.hidden = !url;
    elements.factorSource.href = url || "#";
  }

  function updateResults() {
    const mode = getMode();
    const factor = resolveFactor(mode);
    const distanceKm = parseOptionalNumber(elements.distance.value);
    const days = parseOptionalNumber(elements.workDays.value);
    const occupancy = Math.max(1, parseOptionalNumber(elements.occupancy.value) || 1);
    const journeyMultiplier = elements.roundTrip.checked ? 2 : 1;

    if (!factor || distanceKm === null || distanceKm < 0 || days === null || days <= 0) {
      resetResults(factor ? "Introduce o calcula la distancia para obtener el resultado." : "Este medio necesita un factor específico documentado.");
      return;
    }

    const annualKm = distanceKm * journeyMultiplier * days;
    const personFactorG = mode.unitType === "vehicle" ? factor.factorG / occupancy : factor.factorG;
    const annualKg = annualKm * personFactorG / 1000;
    const range = emissionRange(mode, factor, annualKm, occupancy, annualKg);
    const quality = resultQuality(factor.quality, mode);

    state.result = {
      mode,
      factor,
      distanceKm,
      annualKm,
      annualKg,
      personFactorG,
      range,
      days,
      occupancy,
      roundTrip: elements.roundTrip.checked,
      origin: elements.origin.value.trim(),
      destination: elements.destination.value.trim(),
      routeMethod: state.manualDistance ? "Distancia corregida manualmente" : state.routeMethod,
    };

    elements.annualEmissions.textContent = formatEmission(annualKg);
    elements.annualDistance.textContent = numberEs.format(annualKm);
    elements.appliedFactor.textContent = numberEsPrecise.format(personFactorG);
    elements.appliedUnit.textContent = "g CO₂e/persona·km";
    elements.resultQuality.textContent = quality === "M" ? "Dato específico" : `${quality} · ${qualityLabel(quality)}`;
    elements.resultQuality.dataset.quality = quality;
    elements.uncertaintyRange.textContent = `${formatEmission(range.low)}–${formatEmission(range.high)} kg`;
    elements.rangeFill.style.left = `${range.trackLeft}%`;
    elements.rangeFill.style.width = `${range.trackWidth}%`;
    elements.rangeMarker.style.left = `${range.marker}%`;

    const occupancyText = mode.unitType === "vehicle" ? ` y ${occupancy} ${occupancy === 1 ? "ocupante" : "ocupantes"}` : "";
    const distanceText = state.manualDistance ? "distancia corregida por el usuario" : state.routeApproximate ? "distancia aproximada" : "ruta calculada";
    const specialNote = mode.note ? ` ${mode.note}` : "";
    elements.resultExplanation.textContent = `Resultado con ${distanceText}, ${days} días/año${occupancyText}. Alcance del factor: ${factor.boundary}.${specialNote}`;
    elements.downloadResult.disabled = false;

    renderComparison(annualKm, mode.id, occupancy);
    updateStorageUI();
  }

  function emissionRange(mode, factor, annualKm, occupancy, annualKg) {
    let low;
    let high;
    if (factor.rangeG && !factor.custom) {
      const divider = mode.unitType === "vehicle" ? occupancy : 1;
      low = annualKm * (factor.rangeG[0] / divider) / 1000;
      high = annualKm * (factor.rangeG[1] / divider) / 1000;
    } else {
      const uncertainty = Number.isFinite(factor.uncertainty) ? factor.uncertainty : 0.3;
      low = Math.max(0, annualKg * (1 - uncertainty));
      high = annualKg * (1 + uncertainty);
    }

    if (state.routeApproximate && !state.manualDistance && mode.routeProfile !== "air") {
      low = Math.max(0, low * 0.85);
      high *= 1.15;
    }

    if (high === 0) return { low: 0, high: 0, trackLeft: 0, trackWidth: 0, marker: 0 };
    const visualMax = Math.max(high * 1.08, annualKg * 1.25, 0.001);
    return {
      low,
      high,
      trackLeft: (low / visualMax) * 100,
      trackWidth: ((high - low) / visualMax) * 100,
      marker: (annualKg / visualMax) * 100,
    };
  }

  function resetResults(message) {
    state.result = null;
    elements.annualEmissions.textContent = "—";
    elements.annualDistance.textContent = "—";
    elements.appliedFactor.textContent = "—";
    elements.resultQuality.textContent = "Sin calcular";
    delete elements.resultQuality.dataset.quality;
    elements.uncertaintyRange.textContent = "—";
    elements.rangeFill.style.left = "0";
    elements.rangeFill.style.width = "0";
    elements.rangeMarker.style.left = "0";
    elements.resultExplanation.textContent = message;
    elements.downloadResult.disabled = true;
    elements.comparisonChart.innerHTML = '<p class="empty-state">El gráfico aparecerá cuando haya una distancia y un factor válidos.</p>';
    invalidateBenchmark();
    updateStorageUI();
  }

  function renderComparison(annualKm, selectedId, occupancy) {
    const preferredIds = ["T01", "T02", "T03", "T04", "T25", "T27", "T20", "T15", "T09"];
    if (!preferredIds.includes(selectedId)) preferredIds.push(selectedId);

    const rows = [];
    for (const id of preferredIds) {
      const mode = data.modes.find((item) => item.id === id);
      if (!mode) continue;
      if (id === selectedId && state.result) {
        rows.push({ id, name: mode.name, kg: state.result.annualKg });
        continue;
      }
      if (mode.airType || mode.factorG === null) continue;
      const divider = mode.unitType === "vehicle" ? occupancy : 1;
      const kg = annualKm * (mode.factorG / divider) / 1000;
      rows.push({ id, name: mode.name, kg });
    }

    rows.sort((a, b) => a.kg - b.kg);
    const max = Math.max(...rows.map((row) => row.kg), 0.001);
    const fragment = document.createDocumentFragment();

    for (const row of rows) {
      const wrapper = document.createElement("div");
      wrapper.className = `comparison-row${row.id === selectedId ? " selected" : ""}`;
      wrapper.setAttribute("aria-label", `${row.name}: ${formatEmission(row.kg)} kilogramos de CO2 equivalente al año`);

      const name = document.createElement("span");
      name.className = "comparison-name";
      name.textContent = row.name;

      const track = document.createElement("span");
      track.className = "comparison-track";
      const bar = document.createElement("i");
      bar.className = "comparison-bar";
      bar.style.width = `${Math.max(row.kg === 0 ? 0 : 1.5, (row.kg / max) * 100)}%`;
      track.appendChild(bar);

      const value = document.createElement("strong");
      value.className = "comparison-value";
      value.textContent = `${formatEmission(row.kg)} kg`;

      wrapper.append(name, track, value);
      fragment.appendChild(wrapper);
    }

    elements.comparisonChart.replaceChildren(fragment);
  }

  function downloadCsv() {
    if (!state.result) return;
    const result = state.result;
    const rows = [
      ["Campo", "Valor"],
      ["Sexo", labelForSelect(elements.sex)],
      ["Tramo de edad", labelForSelect(elements.ageBand)],
      ["Grupo o unidad", labelForSelect(elements.researchGroup)],
      ["Medio", result.mode.name],
      ["Propulsión", result.mode.propulsion],
      ["Método de distancia", result.routeMethod || "Distancia manual"],
      ["Distancia de ida (km)", result.distanceKm.toFixed(2)],
      ["Ida y vuelta", result.roundTrip ? "Sí" : "No"],
      ["Días al año", String(result.days)],
      ["Ocupantes", result.mode.unitType === "vehicle" ? String(result.occupancy) : "No aplica"],
      ["Factor aplicado (g CO2e/persona-km)", result.personFactorG.toFixed(4)],
      ["Emisiones anuales (kg CO2e)", result.annualKg.toFixed(4)],
      ["Intervalo inferior (kg CO2e)", result.range.low.toFixed(4)],
      ["Intervalo superior (kg CO2e)", result.range.high.toFixed(4)],
      ["Calidad", result.factor.quality === "M" ? "Dato específico" : result.factor.quality],
      ["Fuente", result.factor.sourceLabel],
      ["Alcance", result.factor.boundary],
    ];
    const csv = rows.map((row) => row.map(csvEscape).join(";")).join("\r\n");
    const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `huella-${result.mode.id.toLowerCase()}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function updateStorageUI() {
    const configured = isStorageConfigured();
    const fingerprint = currentFingerprint();
    const resultChanged = Boolean(state.savedFingerprint && fingerprint !== state.savedFingerprint);
    if (resultChanged) {
      state.savedFingerprint = null;
      elements.benchmarkResults.hidden = true;
    }
    const hasProfile = Boolean(elements.sex.value && elements.ageBand.value && elements.researchGroup.value);
    const alreadySaved = Boolean(fingerprint && fingerprint === state.savedFingerprint);

    elements.storageState.textContent = configured ? "Google Sheets conectado" : "Pendiente de conectar";
    elements.storageState.dataset.connected = String(configured);
    elements.saveResult.disabled = !configured || !state.result || !hasProfile || !elements.dataConsent.checked || state.saving || alreadySaved;
    elements.saveResult.textContent = state.saving
      ? "Guardando…"
      : alreadySaved
        ? "Resultado guardado"
        : "Guardar y ver mi posición";

    if (!configured) {
      setStorageStatus("Configura la URL de Google Apps Script en config.js para activar el guardado.");
    } else if (!state.result) {
      setStorageStatus("Calcula primero tu huella.");
    } else if (!hasProfile) {
      setStorageStatus("Completa sexo, tramo de edad y grupo o unidad.");
    } else if (!elements.dataConsent.checked) {
      setStorageStatus("Marca la casilla de aceptación para guardar el resultado.");
    } else if (!alreadySaved && !state.saving) {
      setStorageStatus(resultChanged
        ? "El cálculo ha cambiado. Guarda de nuevo para actualizar la comparación."
        : "Todo listo. La hoja no recibirá direcciones ni coordenadas.");
    }
  }

  function isStorageConfigured() {
    return /^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec(?:\?.*)?$/.test(String(config.apiUrl || "").trim());
  }

  async function saveSurveyResult() {
    if (!state.result || state.saving) return;

    const invalidField = [elements.sex, elements.ageBand, elements.researchGroup].find((field) => !field.value);
    if (invalidField) {
      invalidField.focus();
      setStorageStatus("Completa los tres campos estadísticos.", true);
      return;
    }
    if (!elements.dataConsent.checked) {
      elements.dataConsent.focus();
      setStorageStatus("Necesitamos tu aceptación antes de guardar.", true);
      return;
    }
    if (!isStorageConfigured()) {
      setStorageStatus("La conexión con Google Sheets todavía no está configurada.", true);
      return;
    }

    state.saving = true;
    updateStorageUI();
    setStorageStatus("Guardando el resultado y calculando la comparación…");

    let failureMessage = "";
    try {
      const payload = buildSurveyPayload();
      const response = await fetchWithTimeout(String(config.apiUrl).trim(), {
        method: "POST",
        redirect: "follow",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload),
      }, 30000);
      const responseText = await response.text();
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (error) {
        throw new Error("storage-response");
      }
      if (!response.ok || !result.ok) throw new Error(result.error || "storage-failed");

      state.savedFingerprint = currentFingerprint();
      renderBenchmark(result);
      setStorageStatus(result.updated
        ? "Registro actualizado. La comparación ya refleja el nuevo cálculo."
        : "Resultado guardado. Ya puedes ver tu posición en la muestra.");
    } catch (error) {
      failureMessage = storageErrorMessage(error);
    } finally {
      state.saving = false;
      updateStorageUI();
      if (failureMessage) setStorageStatus(failureMessage, true);
    }
  }

  function buildSurveyPayload() {
    const result = state.result;
    return {
      action: "save",
      schemaVersion: "1.0",
      responseId: state.responseId,
      sex: elements.sex.value,
      ageBand: elements.ageBand.value,
      researchGroup: elements.researchGroup.value,
      modeId: result.mode.id,
      distanceKm: roundNumber(result.distanceKm, 4),
      roundTrip: result.roundTrip,
      workDays: result.days,
      occupancy: result.mode.unitType === "vehicle" ? result.occupancy : 1,
      customFactorG: result.factor.custom ? roundNumber(result.factor.baseFactorG, 6) : null,
      cabinClass: result.mode.airType === "domestic" ? "average" : elements.cabinClass.value,
      radiativeForcing: elements.radiativeForcing.checked,
      routeType: state.manualDistance ? "manual" : state.routeApproximate ? "estimated" : "routed",
      clientAnnualKg: roundNumber(result.annualKg, 6),
    };
  }

  function renderBenchmark(result) {
    elements.benchmarkResults.hidden = false;
    elements.savedEmissions.textContent = formatEmission(result.annualKg);
    renderPopulationStats(result.global, false);
    renderPopulationStats(result.group, true);
  }

  function renderPopulationStats(stats, isGroup) {
    if (!stats || !stats.available) {
      const minimum = Number(stats && stats.minimum) || Number(config.minimumSampleSize) || 5;
      if (isGroup) {
        elements.groupMean.textContent = "Aún no disponible";
        elements.groupPosition.textContent = `Se muestra desde ${minimum} respuestas`;
      } else {
        elements.globalMean.textContent = "—";
        elements.globalDifference.textContent = "Muestra insuficiente";
        elements.globalPosition.textContent = "—";
        elements.globalSample.textContent = `Se muestra desde ${minimum} respuestas`;
      }
      return;
    }

    if (isGroup) {
      elements.groupMean.textContent = `${formatEmission(stats.mean)} kg`;
      elements.groupPosition.textContent = `Posición ${stats.rank} de ${stats.n} · ${formatDifference(stats.differencePercent)}`;
      return;
    }

    elements.globalMean.textContent = `${formatEmission(stats.mean)} kg`;
    elements.globalDifference.textContent = formatDifference(stats.differencePercent);
    elements.globalPosition.textContent = `${stats.rank} de ${stats.n}`;
    elements.globalSample.textContent = `Mediana ${formatEmission(stats.median)} kg · menor huella = mejor`;
  }

  function formatDifference(value) {
    const difference = Number(value);
    if (!Number.isFinite(difference) || Math.abs(difference) < 0.05) return "En la media";
    return `${numberEs.format(Math.abs(difference))} % ${difference < 0 ? "por debajo" : "por encima"} de la media`;
  }

  function currentFingerprint() {
    if (!state.result) return "";
    const result = state.result;
    return JSON.stringify([
      elements.sex.value,
      elements.ageBand.value,
      elements.researchGroup.value,
      result.mode.id,
      roundNumber(result.distanceKm, 4),
      result.roundTrip,
      result.days,
      result.occupancy,
      roundNumber(result.personFactorG, 6),
    ]);
  }

  function invalidateBenchmark() {
    const fingerprint = currentFingerprint();
    if (state.savedFingerprint && fingerprint !== state.savedFingerprint) {
      state.savedFingerprint = null;
      elements.benchmarkResults.hidden = true;
    }
  }

  function setStorageStatus(message, isError) {
    elements.storageStatus.textContent = message;
    elements.storageStatus.classList.toggle("error", Boolean(isError));
  }

  function storageErrorMessage(error) {
    const messages = {
      "invalid-payload": "El servicio rechazó algún dato. Revisa el formulario.",
      "calculation-mismatch": "El cálculo de la web no coincide con el del servidor. Actualiza ambos archivos a la misma versión.",
      "not-configured": "Apps Script todavía no está vinculado a la hoja. Ejecuta setupRutaCO2 desde su editor.",
      "sheet-structure-changed": "La estructura de la pestaña de respuestas ha cambiado. Restaura sus columnas originales.",
      "storage-busy": "Hay varias respuestas guardándose a la vez. Inténtalo de nuevo.",
      "storage-response": "La respuesta de Google no tiene el formato esperado. Revisa el despliegue de Apps Script.",
      "storage-failed": "Google Sheets no pudo guardar el resultado.",
      timeout: "El guardado ha tardado demasiado. Comprueba la conexión e inténtalo de nuevo.",
    };
    return messages[error && error.message] || "No se pudo guardar. Comprueba que Apps Script esté desplegado para cualquier usuario con la URL correcta.";
  }

  function getResponseId() {
    const key = "rutaco2.irnas.response-id";
    try {
      const existing = window.localStorage.getItem(key);
      if (existing) return existing;
      const value = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `anon-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 14)}`;
      window.localStorage.setItem(key, value);
      return value;
    } catch (error) {
      return `anon-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 14)}`;
    }
  }

  function labelForSelect(select) {
    const option = select.options[select.selectedIndex];
    return option && option.value ? option.textContent.trim() : "No indicado";
  }

  function roundNumber(value, decimals) {
    const scale = 10 ** decimals;
    return Math.round(Number(value) * scale) / scale;
  }

  function setLoading(loading, label) {
    elements.routeButton.disabled = loading;
    elements.routeButtonLabel.textContent = loading ? label : "Calcular ruta";
  }

  function setRouteStatus(message, isError) {
    elements.routeStatus.textContent = message;
    elements.routeStatus.classList.toggle("error", Boolean(isError));
  }

  function humanizeError(error) {
    const messages = {
      "place-not-found": "No se ha encontrado una de las direcciones. Añade municipio, provincia o país.",
      "geocoding-service": "El servicio de direcciones no está disponible. Puedes introducir la distancia manualmente.",
      "routing-service": "El servicio de rutas no está disponible. Se usará una distancia geográfica aproximada si vuelves a calcular.",
      "route-not-found": "No se ha encontrado una ruta válida entre esos puntos para el medio seleccionado.",
      timeout: "La consulta ha tardado demasiado. Inténtalo de nuevo o introduce la distancia manualmente.",
    };
    return messages[error && error.message] || "No se pudo calcular la ruta. Revisa las direcciones o introduce una distancia manual.";
  }

  async function fetchWithTimeout(url, options, timeoutMs) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, { ...options, signal: controller.signal });
    } catch (error) {
      if (error.name === "AbortError") throw new Error("timeout");
      throw error;
    } finally {
      window.clearTimeout(timeout);
    }
  }

  function decodePolyline(encoded, precision) {
    if (!encoded) return [];
    const factor = 10 ** precision;
    const coordinates = [];
    let index = 0;
    let lat = 0;
    let lon = 0;

    while (index < encoded.length) {
      let shift = 0;
      let result = 0;
      let byte;
      do {
        byte = encoded.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20 && index < encoded.length);
      lat += (result & 1) ? ~(result >> 1) : (result >> 1);

      shift = 0;
      result = 0;
      do {
        byte = encoded.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20 && index < encoded.length);
      lon += (result & 1) ? ~(result >> 1) : (result >> 1);

      coordinates.push([lat / factor, lon / factor]);
    }
    return coordinates;
  }

  function haversineKm(lat1, lon1, lat2, lon2) {
    const radius = 6371.0088;
    const phi1 = toRadians(lat1);
    const phi2 = toRadians(lat2);
    const deltaPhi = toRadians(lat2 - lat1);
    const deltaLambda = toRadians(lon2 - lon1);
    const a = Math.sin(deltaPhi / 2) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) ** 2;
    return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function greatCirclePoints(start, end, count) {
    const phi1 = toRadians(start.lat);
    const lambda1 = toRadians(start.lon);
    const phi2 = toRadians(end.lat);
    const lambda2 = toRadians(end.lon);
    const delta = 2 * Math.asin(Math.sqrt(
      Math.sin((phi2 - phi1) / 2) ** 2
      + Math.cos(phi1) * Math.cos(phi2) * Math.sin((lambda2 - lambda1) / 2) ** 2,
    ));

    if (delta === 0) return [[start.lat, start.lon], [end.lat, end.lon]];
    const points = [];
    for (let index = 0; index <= count; index += 1) {
      const fraction = index / count;
      const a = Math.sin((1 - fraction) * delta) / Math.sin(delta);
      const b = Math.sin(fraction * delta) / Math.sin(delta);
      const x = a * Math.cos(phi1) * Math.cos(lambda1) + b * Math.cos(phi2) * Math.cos(lambda2);
      const y = a * Math.cos(phi1) * Math.sin(lambda1) + b * Math.cos(phi2) * Math.sin(lambda2);
      const z = a * Math.sin(phi1) + b * Math.sin(phi2);
      points.push([toDegrees(Math.atan2(z, Math.sqrt(x * x + y * y))), toDegrees(Math.atan2(y, x))]);
    }
    return points;
  }

  function qualityLabel(quality) {
    const labels = {
      A: "Oficial / alta",
      B: "Calculado / media-alta",
      C: "Proxy / media",
      D: "Dato específico requerido",
      M: "Dato específico",
    };
    return labels[quality] || "Factor documentado";
  }

  function resultQuality(factorQuality, mode) {
    if (factorQuality === "M" || state.manualDistance || !state.routeApproximate || mode.routeProfile === "air") {
      return factorQuality;
    }
    const rank = { A: 1, B: 2, C: 3, D: 4 };
    return (rank[factorQuality] || 3) < rank.C ? "C" : factorQuality;
  }

  function formatEmission(value) {
    if (!Number.isFinite(value)) return "—";
    if (value === 0) return "0";
    if (value < 0.1) return numberEsPrecise.format(value);
    if (value >= 10000) return new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 }).format(value);
    return numberEs.format(value);
  }

  function parseOptionalNumber(value) {
    if (value === null || value === undefined || String(value).trim() === "") return null;
    const parsed = Number(String(value).replace(",", "."));
    return Number.isFinite(parsed) ? parsed : null;
  }

  function shortPlace(value) {
    return String(value || "").split(",").slice(0, 3).join(",").trim();
  }

  function toRadians(value) {
    return value * Math.PI / 180;
  }

  function toDegrees(value) {
    return value * 180 / Math.PI;
  }

  function wait(milliseconds) {
    return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"]/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
    })[character]);
  }

  function csvEscape(value) {
    const stringValue = String(value ?? "");
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
})();
