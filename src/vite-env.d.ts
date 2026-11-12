/// <reference types="vite/client" />

declare module "*.json" {
  const value: { version: string; name?: string };
  export default value;
}
