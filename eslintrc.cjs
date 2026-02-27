module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true,
    node: true
  },
  ignores: [
    "assets/**",
    "**/*.min.js"
  ],
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "script"
  },
  rules: {
    "no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
    "no-undef": "error",
    "no-redeclare": "error",
    "eqeqeq": ["error", "always"],
    "curly": ["error", "all"],
    "semi": ["error", "always"]
  }
};
