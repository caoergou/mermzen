/// <reference types="vite/client" />

interface Window {
  svgToPngBlob: (svgEl: SVGElement, scale?: number) => Promise<Blob>;
  downloadPng: () => Promise<void>;
}
