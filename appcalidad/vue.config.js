const { defineConfig } = require('@vue/cli-service');

module.exports = defineConfig({
  publicPath: process.env.NODE_ENV === 'production'
    ? (process.env.VUE_APP_ENV === 'calidad' ? '/calidad/' : '/empaquetado/')
    : '/'
});



