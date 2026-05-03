import { defineConfig } from "vite";

export default defineConfig({
  base: "/card-reader/",
  test: {
    environment: "node",
    globals: true
  }
});

