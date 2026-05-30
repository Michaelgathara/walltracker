import type { Map as MapLibreMap } from "maplibre-gl";

import { aircraftIconId, boatIconId } from "../constants";

export function addProjectionLayers(map: MapLibreMap) {
  addContextualBuildingsLayer(map);

  if (map.getLayer("receiver-radius-fill")) {
    return;
  }

  map.addLayer({
    id: "receiver-radius-fill",
    type: "fill",
    source: "receiver-radius",
    paint: {
      "fill-color": "#88c9ff",
      "fill-opacity": 0.05,
    },
  });

  map.addLayer({
    id: "receiver-radius-line",
    type: "line",
    source: "receiver-radius",
    paint: {
      "line-color": "#b7dfff",
      "line-opacity": 0.28,
      "line-width": 1,
      "line-dasharray": [2, 3],
    },
  });

  map.addLayer({
    id: "receiver-position-halo",
    type: "circle",
    source: "receiver-position",
    paint: {
      "circle-color": "#c9f7ff",
      "circle-radius": 28,
      "circle-opacity": 0.24,
      "circle-blur": 1,
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
      "circle-opacity": 0.98,
    },
  });

  map.addLayer({
    id: "aircraft-trails",
    type: "line",
    source: "aircraft-trails",
    paint: {
      "line-color": "#9fe8ff",
      "line-opacity": [
        "case",
        ["==", ["get", "themeMode"], "day"],
        0.34,
        0.52,
      ],
      "line-width": 2.1,
      "line-blur": 1.2,
    },
  });

  map.addLayer({
    id: "aircraft-halo",
    type: "circle",
    source: "aircraft",
    paint: {
      "circle-color": [
        "case",
        ["==", ["get", "themeMode"], "day"],
        "#1a7469",
        "#8df4d2",
      ],
      "circle-radius": [
        "interpolate",
        ["linear"],
        ["get", "altitudeFeet"],
        0,
        12,
        45000,
        20,
      ],
      "circle-opacity": [
        "case",
        ["==", ["get", "themeMode"], "day"],
        0.1,
        0.2,
      ],
      "circle-blur": 1.3,
    },
  });

  map.addLayer({
    id: "aircraft-symbols",
    type: "symbol",
    source: "aircraft",
    layout: {
      "icon-image": [
        "case",
        ["==", ["get", "themeMode"], "day"],
        `${aircraftIconId}-day`,
        aircraftIconId,
      ],
      "icon-size": 0.7,
      "icon-rotate": ["get", "headingDegrees"],
      "icon-rotation-alignment": "map",
      "icon-allow-overlap": true,
      "icon-ignore-placement": true,
    },
    paint: {
      "icon-opacity": [
        "case",
        ["==", ["get", "themeMode"], "day"],
        0.9,
        0.98,
      ],
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
      "text-color": [
        "case",
        ["==", ["get", "themeMode"], "day"],
        "#162d34",
        "#f4fff9",
      ],
      "text-halo-color": [
        "case",
        ["==", ["get", "themeMode"], "day"],
        "rgba(255, 255, 255, 0.86)",
        "rgba(4, 17, 29, 0.92)",
      ],
      "text-halo-width": [
        "case",
        ["==", ["get", "themeMode"], "day"],
        1.35,
        2,
      ],
      "text-opacity": [
        "case",
        ["==", ["get", "themeMode"], "day"],
        0.82,
        0.98,
      ],
    },
  });

  map.addLayer({
    id: "animal-halo",
    type: "circle",
    source: "animal-observations",
    paint: {
      "circle-color": "#ffd58a",
      "circle-radius": 13,
      "circle-opacity": 0.16,
      "circle-blur": 1.1,
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
      "circle-opacity": 0.96,
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
      "text-opacity": 0.94,
    },
  });

  map.addLayer({
    id: "boat-halo",
    type: "circle",
    source: "boats",
    paint: {
      "circle-color": [
        "case",
        ["==", ["get", "themeMode"], "day"],
        "#336b89",
        "#91d7ff",
      ],
      "circle-radius": 11,
      "circle-opacity": [
        "case",
        ["==", ["get", "themeMode"], "day"],
        0.1,
        0.16,
      ],
      "circle-blur": 1.1,
    },
  });

  map.addLayer({
    id: "boat-symbols",
    type: "symbol",
    source: "boats",
    layout: {
      "icon-image": [
        "case",
        ["==", ["get", "themeMode"], "day"],
        `${boatIconId}-day`,
        boatIconId,
      ],
      "icon-size": 0.7,
      "icon-rotate": ["get", "headingDegrees"],
      "icon-rotation-alignment": "map",
      "icon-allow-overlap": true,
      "icon-ignore-placement": true,
    },
    paint: {
      "icon-opacity": [
        "case",
        ["==", ["get", "themeMode"], "day"],
        0.88,
        0.96,
      ],
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
      "text-color": [
        "case",
        ["==", ["get", "themeMode"], "day"],
        "#173244",
        "#e9f6ff",
      ],
      "text-halo-color": [
        "case",
        ["==", ["get", "themeMode"], "day"],
        "rgba(255, 255, 255, 0.88)",
        "rgba(8, 20, 31, 0.92)",
      ],
      "text-halo-width": [
        "case",
        ["==", ["get", "themeMode"], "day"],
        1.35,
        2,
      ],
      "text-opacity": [
        "case",
        ["==", ["get", "themeMode"], "day"],
        0.8,
        0.94,
      ],
    },
  });
}

type StyleLayerLike = {
  id: string;
  type: string;
  source?: string;
  "source-layer"?: string;
};

type BuildingLayerLike = StyleLayerLike & {
  source: string;
  "source-layer": string;
};

type ResponsiveLabelField = [
  "step",
  ["zoom"],
  ["get", "title"],
  number,
  ["concat", ["get", "title"], "\n", ["get", "detail"]],
];

function addContextualBuildingsLayer(map: MapLibreMap) {
  const styleLayers = (map.getStyle().layers ?? []) as StyleLayerLike[];
  const buildingLayer = styleLayers.find(
    (layer): layer is BuildingLayerLike =>
      layer.source === "composite" && layer["source-layer"] === "building",
  );

  if (!buildingLayer || map.getLayer("contextual-buildings")) {
    return;
  }

  const firstSymbolLayerId = styleLayers.find((layer) => layer.type === "symbol")?.id;

  map.addLayer(
    {
      id: "contextual-buildings",
      type: "fill-extrusion",
      source: buildingLayer.source,
      "source-layer": buildingLayer["source-layer"],
      minzoom: 9,
      filter: ["==", ["get", "extrude"], "true"],
      paint: {
        "fill-extrusion-color": [
          "interpolate",
          ["linear"],
          ["coalesce", ["get", "height"], 0],
          0,
          "#102535",
          120,
          "#18384c",
          320,
          "#2b5a74",
        ],
        "fill-extrusion-base": [
          "interpolate",
          ["linear"],
          ["zoom"],
          9,
          0,
          11,
          ["coalesce", ["get", "min_height"], 0],
        ],
        "fill-extrusion-height": [
          "interpolate",
          ["linear"],
          ["zoom"],
          9,
          0,
          11,
          ["coalesce", ["get", "height"], 0],
        ],
        "fill-extrusion-opacity": [
          "interpolate",
          ["linear"],
          ["zoom"],
          9,
          0,
          10,
          0.08,
          12,
          0.22,
        ],
        "fill-extrusion-vertical-gradient": true,
      },
    },
    firstSymbolLayerId,
  );
}

function buildResponsiveLabelField() {
  return [
    "step",
    ["zoom"],
    ["get", "title"],
    10,
    ["concat", ["get", "title"], "\n", ["get", "detail"]],
  ] satisfies ResponsiveLabelField;
}
