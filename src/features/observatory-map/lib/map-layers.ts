import type { Map as MapLibreMap } from "maplibre-gl";

import { boatIconId } from "../constants";

export function addProjectionLayers(map: MapLibreMap) {
  map.addLayer({
    id: "receiver-radius-fill",
    type: "fill",
    source: "receiver-radius",
    paint: {
      "fill-color": "#7dd6ff",
      "fill-opacity": 0.018,
    },
  });

  map.addLayer({
    id: "receiver-guide-radials-minor",
    type: "line",
    source: "receiver-guides",
    filter: ["all", ["==", ["get", "guide"], "radial"], ["==", ["get", "emphasis"], "minor"]],
    paint: {
      "line-color": "#7cd8ff",
      "line-opacity": 0.08,
      "line-width": 0.75,
      "line-dasharray": [1, 5],
    },
  });

  map.addLayer({
    id: "receiver-guide-radials-major",
    type: "line",
    source: "receiver-guides",
    filter: ["all", ["==", ["get", "guide"], "radial"], ["==", ["get", "emphasis"], "major"]],
    paint: {
      "line-color": "#8adfff",
      "line-opacity": 0.14,
      "line-width": 0.9,
      "line-dasharray": [2, 6],
    },
  });

  map.addLayer({
    id: "receiver-guide-rings-minor",
    type: "line",
    source: "receiver-guides",
    filter: ["all", ["==", ["get", "guide"], "ring"], ["==", ["get", "emphasis"], "minor"]],
    paint: {
      "line-color": "#7cd8ff",
      "line-opacity": 0.12,
      "line-width": 0.9,
      "line-dasharray": [1, 4],
    },
  });

  map.addLayer({
    id: "receiver-guide-rings-major",
    type: "line",
    source: "receiver-guides",
    filter: ["all", ["==", ["get", "guide"], "ring"], ["==", ["get", "emphasis"], "major"]],
    paint: {
      "line-color": "#a8ecff",
      "line-opacity": 0.2,
      "line-width": 1.1,
      "line-dasharray": [3, 3],
    },
  });

  map.addLayer({
    id: "receiver-radius-line",
    type: "line",
    source: "receiver-radius",
    paint: {
      "line-color": "#d8f7ff",
      "line-opacity": 0.4,
      "line-width": 1.2,
      "line-dasharray": [4, 3],
    },
  });

  map.addLayer({
    id: "receiver-position-halo",
    type: "circle",
    source: "receiver-position",
    paint: {
      "circle-color": "#c9f7ff",
      "circle-radius": 34,
      "circle-opacity": 0.18,
      "circle-blur": 1.2,
    },
  });

  map.addLayer({
    id: "receiver-position-core",
    type: "circle",
    source: "receiver-position",
    paint: {
      "circle-color": "#f8fdff",
      "circle-radius": 6,
      "circle-stroke-color": "#7ee8ff",
      "circle-stroke-width": 2,
      "circle-opacity": 1,
    },
  });

  map.addLayer({
    id: "aircraft-trails",
    type: "line",
    source: "aircraft-trails",
    layout: {
      "line-cap": "round",
      "line-join": "round",
    },
    paint: {
      "line-gradient": [
        "interpolate",
        ["linear"],
        ["line-progress"],
        0,
        "rgba(125, 213, 255, 0.02)",
        0.45,
        "rgba(125, 213, 255, 0.16)",
        0.82,
        "rgba(159, 232, 255, 0.5)",
        1,
        "rgba(244, 255, 255, 0.96)",
      ],
      "line-opacity": 0.95,
      "line-width": [
        "interpolate",
        ["linear"],
        ["zoom"],
        6,
        1.2,
        10,
        2.1,
        13,
        2.8,
      ],
      "line-blur": 0.55,
    },
  });

  map.addLayer({
    id: "aircraft-halo",
    type: "circle",
    source: "aircraft",
    paint: {
      "circle-color": "#8df4d2",
      "circle-radius": [
        "interpolate",
        ["linear"],
        ["get", "altitudeFeet"],
        0,
        8,
        45000,
        14,
      ],
      "circle-opacity": 0.14,
      "circle-blur": 1.1,
    },
  });

  map.addLayer({
    id: "aircraft-symbols",
    type: "symbol",
    source: "aircraft",
    layout: {
      "icon-image": "aircraft-marker",
      "icon-size": 0.66,
      "icon-rotate": ["get", "headingDegrees"],
      "icon-rotation-alignment": "map",
      "icon-allow-overlap": true,
      "icon-ignore-placement": true,
    },
    paint: {
      "icon-opacity": 0.95,
    },
  });

  map.addLayer({
    id: "aircraft-labels",
    type: "symbol",
    source: "aircraft",
    layout: {
      "text-field": buildResponsiveLabelField(),
      "text-font": ["Open Sans Regular"],
      "text-size": [
        "interpolate",
        ["linear"],
        ["zoom"],
        6,
        9.5,
        10,
        10.5,
        13,
        11,
      ],
      "text-line-height": 1.25,
      "text-anchor": "top",
      "text-variable-anchor": [
        "top",
        "bottom",
        "left",
        "right",
        "top-left",
        "top-right",
        "bottom-left",
        "bottom-right",
      ],
      "text-radial-offset": 1.55,
      "text-justify": "auto",
      "text-max-width": 10,
      "text-padding": 3,
      "text-allow-overlap": false,
      "text-ignore-placement": false,
      "symbol-sort-key": ["get", "distanceNauticalMiles"],
    },
    paint: {
      "text-color": "#eefcf7",
      "text-halo-color": "rgba(4, 17, 29, 0.92)",
      "text-halo-width": 2,
      "text-opacity": 0.92,
    },
  });

  map.addLayer({
    id: "animal-halo",
    type: "circle",
    source: "animal-observations",
    paint: {
      "circle-color": "#ffd58a",
      "circle-radius": 9,
      "circle-opacity": 0.1,
      "circle-blur": 1,
    },
  });

  map.addLayer({
    id: "animal-observations",
    type: "circle",
    source: "animal-observations",
    paint: {
      "circle-color": [
        "match",
        ["get", "iconicTaxon"],
        "Aves",
        "#ffd07a",
        "Mammalia",
        "#f4a6ff",
        "Reptilia",
        "#92df8d",
        "Amphibia",
        "#7de5c5",
        "Actinopterygii",
        "#7db9ff",
        "Mollusca",
        "#f3b6a0",
        "#f6d9a4",
      ],
      "circle-radius": 4.8,
      "circle-stroke-color": "#fdf7ea",
      "circle-stroke-width": 1.4,
      "circle-opacity": 0.92,
    },
  });

  map.addLayer({
    id: "animal-labels",
    type: "symbol",
    source: "animal-observations",
    layout: {
      "text-field": buildResponsiveLabelField(),
      "text-font": ["Open Sans Regular"],
      "text-size": [
        "interpolate",
        ["linear"],
        ["zoom"],
        6,
        9,
        10,
        9.5,
        13,
        10,
      ],
      "text-line-height": 1.2,
      "text-anchor": "left",
      "text-variable-anchor": ["left", "right", "top-left", "bottom-left"],
      "text-radial-offset": 0.95,
      "text-justify": "auto",
      "text-max-width": 10,
      "text-padding": 2,
      "text-allow-overlap": false,
      "text-ignore-placement": false,
      "symbol-sort-key": ["get", "title"],
    },
    paint: {
      "text-color": "#f7f0e2",
      "text-halo-color": "rgba(24, 18, 9, 0.92)",
      "text-halo-width": 2,
      "text-opacity": 0.88,
    },
  });

  map.addLayer({
    id: "boat-halo",
    type: "circle",
    source: "boats",
    paint: {
      "circle-color": "#91d7ff",
      "circle-radius": 8.5,
      "circle-opacity": 0.1,
      "circle-blur": 1,
    },
  });

  map.addLayer({
    id: "boat-symbols",
    type: "symbol",
    source: "boats",
    layout: {
      "icon-image": boatIconId,
      "icon-size": 0.64,
      "icon-rotate": ["get", "headingDegrees"],
      "icon-rotation-alignment": "map",
      "icon-allow-overlap": true,
      "icon-ignore-placement": true,
    },
    paint: {
      "icon-opacity": 0.92,
    },
  });

  map.addLayer({
    id: "boat-labels",
    type: "symbol",
    source: "boats",
    layout: {
      "text-field": buildResponsiveLabelField(),
      "text-font": ["Open Sans Regular"],
      "text-size": [
        "interpolate",
        ["linear"],
        ["zoom"],
        6,
        9,
        10,
        9.75,
        13,
        10.5,
      ],
      "text-line-height": 1.2,
      "text-anchor": "top",
      "text-variable-anchor": [
        "top",
        "bottom",
        "left",
        "right",
        "top-left",
        "top-right",
      ],
      "text-radial-offset": 1.35,
      "text-justify": "auto",
      "text-max-width": 10,
      "text-padding": 3,
      "text-allow-overlap": false,
      "text-ignore-placement": false,
      "symbol-sort-key": ["get", "distanceNauticalMiles"],
    },
    paint: {
      "text-color": "#e9f6ff",
      "text-halo-color": "rgba(8, 20, 31, 0.92)",
      "text-halo-width": 2,
      "text-opacity": 0.88,
    },
  });
}

type ResponsiveLabelField = [
  "step",
  ["zoom"],
  ["get", "title"],
  number,
  ["concat", ["get", "title"], "\n", ["get", "detail"]],
];

function buildResponsiveLabelField() {
  return [
    "step",
    ["zoom"],
    ["get", "title"],
    10,
    ["concat", ["get", "title"], "\n", ["get", "detail"]],
  ] satisfies ResponsiveLabelField;
}
