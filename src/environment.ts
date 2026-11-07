/* Set by the app's bundler; read at runtime so the library build keeps it */
declare const process: { env: { NODE_ENV?: string } };

/** The app runs a production build, where development warnings stay quiet */
export const isProduction = () => process.env.NODE_ENV === "production";
