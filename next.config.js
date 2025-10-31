const path = require('path');

module.exports = {
  // ...existing config...
  // Indica explícitamente la raíz para Turbopack (evita la advertencia sobre múltiples lockfiles)
  turbopack: {
    root: path.resolve(__dirname)
  }
};
