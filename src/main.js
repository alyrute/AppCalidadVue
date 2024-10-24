import { createApp } from 'vue';
import App from './App.vue';
import router from './router'; // Asegúrate de que esta línea esté presente

createApp(App)
  .use(router) // No olvides usar el router
  .mount('#app');