module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
    "postcss-preset-env": {
      browsers: ["last 2 versions", "> 5%"],
    },
    ...(process.env.NODE_ENV === "production" ? { cssnano: {} } : {}),
  },
};
