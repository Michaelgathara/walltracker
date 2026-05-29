import type { Map as MapLibreMap } from "maplibre-gl";
import { aircraftIconId, boatIconId } from "../constants";

export function registerAircraftIcon(map: MapLibreMap) {
  if (map.hasImage(aircraftIconId)) {
    return;
  }

  addAircraftIcon(map, aircraftIconId, {
    fill: "#e9fff8",
    stroke: "#35c4a7",
    outline: "rgba(3, 18, 24, 0.82)",
    shadow: "rgba(3, 10, 14, 0.32)",
  });
}

export function registerAircraftDayIcon(map: MapLibreMap) {
  const imageId = `${aircraftIconId}-day`;

  if (map.hasImage(imageId)) {
    return;
  }

  addAircraftIcon(map, imageId, {
    fill: "#177568",
    stroke: "#f6fffb",
    outline: "rgba(14, 66, 61, 0.56)",
    shadow: "rgba(28, 67, 74, 0.2)",
  });
}

function addAircraftIcon(
  map: MapLibreMap,
  imageId: string,
  colors: {
    fill: string;
    stroke: string;
    outline: string;
    shadow: string;
  },
) {
  const iconSize = 88;
  const canvas = document.createElement("canvas");
  canvas.width = iconSize;
  canvas.height = iconSize;

  const context = canvas.getContext("2d");

  if (!context) {
    return;
  }

  context.translate(iconSize / 2, iconSize / 2);
  context.lineJoin = "round";
  context.shadowColor = colors.shadow;
  context.shadowBlur = 8;
  context.fillStyle = colors.fill;

  context.beginPath();
  context.moveTo(0, -28);
  context.lineTo(5, -8);
  context.lineTo(23, -2);
  context.lineTo(23, 6);
  context.lineTo(5, 4);
  context.lineTo(1, 26);
  context.lineTo(8, 31);
  context.lineTo(8, 37);
  context.lineTo(0, 33);
  context.lineTo(-8, 37);
  context.lineTo(-8, 31);
  context.lineTo(-1, 26);
  context.lineTo(-5, 4);
  context.lineTo(-23, 6);
  context.lineTo(-23, -2);
  context.lineTo(-5, -8);
  context.closePath();
  context.strokeStyle = colors.outline;
  context.lineWidth = 4.8;
  context.stroke();
  context.fill();
  context.strokeStyle = colors.stroke;
  context.lineWidth = 2.5;
  context.stroke();

  map.addImage(imageId, context.getImageData(0, 0, iconSize, iconSize), {
    pixelRatio: 2,
  });
}

export function registerBoatIcon(map: MapLibreMap) {
  if (map.hasImage(boatIconId)) {
    return;
  }

  addBoatIcon(map, boatIconId, {
    fill: "#eff8ff",
    stroke: "#4caee4",
    outline: "rgba(4, 16, 26, 0.78)",
    shadow: "rgba(4, 13, 21, 0.3)",
  });
}

export function registerBoatDayIcon(map: MapLibreMap) {
  const imageId = `${boatIconId}-day`;

  if (map.hasImage(imageId)) {
    return;
  }

  addBoatIcon(map, imageId, {
    fill: "#2c6f91",
    stroke: "#f6fbff",
    outline: "rgba(26, 74, 101, 0.48)",
    shadow: "rgba(28, 67, 86, 0.18)",
  });
}

function addBoatIcon(
  map: MapLibreMap,
  imageId: string,
  colors: {
    fill: string;
    stroke: string;
    outline: string;
    shadow: string;
  },
) {
  const iconSize = 72;
  const canvas = document.createElement("canvas");
  canvas.width = iconSize;
  canvas.height = iconSize;

  const context = canvas.getContext("2d");

  if (!context) {
    return;
  }

  context.translate(iconSize / 2, iconSize / 2);
  context.lineJoin = "round";
  context.shadowColor = colors.shadow;
  context.shadowBlur = 7;
  context.fillStyle = colors.fill;

  context.beginPath();
  context.moveTo(0, -24);
  context.lineTo(10, -2);
  context.lineTo(14, 12);
  context.lineTo(0, 26);
  context.lineTo(-14, 12);
  context.lineTo(-10, -2);
  context.closePath();
  context.strokeStyle = colors.outline;
  context.lineWidth = 4.8;
  context.stroke();
  context.fill();
  context.strokeStyle = colors.stroke;
  context.lineWidth = 2.2;
  context.stroke();

  context.beginPath();
  context.moveTo(-18, 10);
  context.quadraticCurveTo(0, 20, 18, 10);
  context.strokeStyle = colors.outline;
  context.lineWidth = 4.2;
  context.stroke();
  context.strokeStyle = colors.stroke;
  context.lineWidth = 2.2;
  context.stroke();

  map.addImage(imageId, context.getImageData(0, 0, iconSize, iconSize), {
    pixelRatio: 2,
  });
}
