const path = require('path');

module.exports = {
  // Indica explícitamente la raíz para Turbopack (evita la advertencia sobre múltiples lockfiles)
  turbopack: {
    root: path.resolve(__dirname)
  }
};
