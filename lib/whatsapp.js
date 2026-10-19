import { createRequire } from "node:module";

let service;

export function getWhatsAppService() {
  if (service) return service;

  const requireFromNextProject = createRequire(import.meta.url);
  service = requireFromNextProject("./wp-config.cjs");
  return service;
}
