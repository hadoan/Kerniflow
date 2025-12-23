import base from "./base.js";
import typescript from "./typescript.js";
import node from "./node.js";
import react from "./react.js";
import test from "./test.js";

/**
 * Default export: full config with all presets
 * Use this for a batteries-included config
 */
export default {
  base,
  typescript,
  node,
  react,
  test,
};

// Named exports for composability
export { base, typescript, node, react, test };
