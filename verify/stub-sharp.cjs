'use strict';
/* Preload for verify: stubs the native 'sharp' module so backend modules can be
   load-tested on machines without the platform binary (e.g. win32 node_modules
   mounted into Linux). Never used in production. */
const Module = require('module');
const origLoad = Module._load;
Module._load = function (request) {
  if (request === 'sharp') {
    const fake = () => ({ resize: () => fake(), webp: () => fake(), toFile: async () => ({}), toBuffer: async () => Buffer.alloc(0), metadata: async () => ({ width: 1, height: 1 }) });
    return fake;
  }
  return origLoad.apply(this, arguments);
};
