import { setWorkerUrl } from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';

// O Vite pré-empacota o maplibre-gl e o caminho relativo do worker deixa de existir (404 → "Worker failed to load").
setWorkerUrl(workerUrl);
