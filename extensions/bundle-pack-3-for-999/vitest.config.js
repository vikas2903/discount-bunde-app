export default {
  test: {
    setupFiles: ["./tests/setup-env.js"],
    forceRerunTriggers: [
      '**/tests/fixtures/**',
      '**/src/**',
    ],
  },
};
