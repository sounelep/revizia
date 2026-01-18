/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_GEMINI_API_KEY: string;
    // Tu peux ajouter d'autres variables ici si besoin
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}