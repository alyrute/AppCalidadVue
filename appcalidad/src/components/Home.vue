<template>
    <div>
      <h1>Bienvenido a la página de inicio</h1>
      <p>Aquí hay algunos datos:</p>
      <ul>
        <li v-for="item in items" :key="item.id">{{ item.name }}</li>
      </ul>
    </div>
  </template>
  
  <script>
  export default {
    name: 'HomePage', // Cambiar "Home" a "HomePage"
  
    
  };
  </script>
  

