/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_F1_SERVICE_URL: string;
  readonly VITE_F2_SERVICE_URL: string;
  readonly VITE_F3_SERVICE_URL: string;
  readonly VITE_F4_SERVICE_URL: string;
  readonly VITE_MAP_TILE_URL: string;
  readonly VITE_DEFAULT_MAP_CENTER: string;
  readonly VITE_DEFAULT_MAP_ZOOM: string;
  readonly VITE_ENABLE_F1_MODULE: string;
  readonly VITE_ENABLE_F2_MODULE: string;
  readonly VITE_ENABLE_F3_MODULE: string;
  readonly VITE_ENABLE_F4_MODULE: string;
  readonly VITE_AUTH_ENABLED: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
