/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Set at launcher pack time. Pages leaves this unset so local seats stay off. */
  readonly VITE_LOCAL_SEATS?: string;
}
