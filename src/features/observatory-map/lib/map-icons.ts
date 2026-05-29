import type { Map as MapLibreMap } from "maplibre-gl";
import { aircraftIconId, boatIconId } from "../constants";

export function registerAircraftIcon(map: MapLibreMap) {
  if (map.hasImage(aircraftIconId)) {
    return;
  }

  const iconSize = 88;
  const canvas = document.createElement("canvas");
  canvas.width = iconSize;
  canvas.height = iconSize;

  const context = canvas.getContext("2d");

  if (!context) {
    return;
  }

  context.translate(iconSize / 2, iconSize / 2);
  context.shadowColor = "rgba(109, 255, 215, 0.45)";
  context.shadowBlur = 16;
  context.fillStyle = "#ecfff7";
  context.strokeStyle = "#7af3ce";
  context.lineWidth = 2.5;

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
  context.fill();
  context.stroke();

  map.addImage(aircraftIconId, context.getImageData(0, 0, iconSize, iconSize), {
    pixelRatio: 2,
  });
}

export function registerBoatIcon(map: MapLibreMap) {
  if (map.hasImage(boatIconId)) {
    return;
  }

  const iconSize = 72;
  const canvas = document.createElement("canvas");
  canvas.width = iconSize;
  canvas.height = iconSize;

  const context = canvas.getContext("2d");

  if (!context) {
    return;
  }

  context.translate(iconSize / 2, iconSize / 2);
  context.shadowColor = "rgba(126, 203, 255, 0.4)";
  context.shadowBlur = 12;
  context.fillStyle = "#eff8ff";
  context.strokeStyle = "#8fd0ff";
  context.lineWidth = 2.2;

  context.beginPath();
  context.moveTo(0, -24);
  context.lineTo(10, -2);
  context.lineTo(14, 12);
  context.lineTo(0, 26);
  context.lineTo(-14, 12);
  context.lineTo(-10, -2);
  context.closePath();
  context.fill();
  context.stroke();

  context.beginPath();
  context.moveTo(-18, 10);
  context.quadraticCurveTo(0, 20, 18, 10);
  context.stroke();

  map.addImage(boatIconId, context.getImageData(0, 0, iconSize, iconSize), {
    pixelRatio: 2,
  });
}
