#Cambios 25/10/2024
<template>
  <div id="app">
    <header class="header-grid">
      <img src="../assets/logoMC.png" alt="Logo de la empresa" class="logo" width="200" />
      <h1 class="titulo">Registro de Lectura de Empaquetado</h1>
    </header>
    <main>
      <section class="input-section">
        <input
          type="text"
          v-model="codigo"
          @keyup.enter="registrarLectura"
          placeholder="Escanea el código OF"
          aria-label="Código OF"
        />
        <div v-if="loading" class="loading">Cargando...</div>
        <div v-if="error" class="error">
          <p>{{ error }}</p>
        </div>
      </section>

      <section v-if="historialFiltrado.length > 0" class="historial-cajas">
        <h2>Códigos OF Leídos por Calidad</h2>
        <div class="historial-grid">
          <div 
            v-for="(producto, index) in historialFiltrado.slice(0, 10)" 
            :key="index" 
            :class="['codigo-card', { 'madera-card': /(cajón madera maciza|hibrido madera \+ cartón|pallet box|cartón propio)/i.test(producto.nombre_embalaje || '') }]">
            <p>Código OF: <strong>{{ producto.codigoof }}</strong></p>
            <p>Código Producto: <strong>{{ producto.codigoproducto }}</strong></p>
            <p>Descripción: <strong>{{ producto.descripcion }}</strong></p>
            <p>Tipo Embalaje: <strong>{{ producto.nombre_embalaje || 'N/A' }}</strong></p>
            <vue-barcode v-if="producto.nombre_embalaje === 'CARTÓN PANOTEC'" :value="producto.codigopanotec"></vue-barcode>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<script>
import VueBarcode from '@chenfengyuan/vue-barcode';

export default {
  components: {
    VueBarcode
  },
  data() {
    return {
      codigo: '',
      historial: [],
      socket: null,
      loading: false,
      error: null,
    };
  },
  computed: {
    historialFiltrado() {
      return this.historial
        .filter(producto => producto.lecturacalidadactiva && !producto.lecturaempaquetadoactiva)
        .reverse();
    }
  },
  methods: {
    async registrarLectura() {
      this.loading = true;
      this.error = null;
      try {
        const url = `http://127.0.0.1:8000/productos/${this.codigo}/empaquetado`;
        const options = {
          method: 'PUT',
        };
        const response = await fetch(url, options);

        if (!response.ok) {
          throw new Error('Error al registrar la lectura de empaquetado');
        }

        // Eliminar el producto del historial local en la pantalla de empaquetado
        this.historial = this.historial.filter(producto => producto.matricula !== this.codigo);
      } catch (error) {
        this.error = error.message;
      } finally {
        this.loading = false;
        this.codigo = '';
      }
    }
  },
  created() {
    this.socket = new WebSocket("ws://127.0.0.1:8000/ws");
    this.socket.onopen = () => {
      console.log("Conexión WebSocket establecida");
    };
    this.socket.onerror = (error) => {
      console.error("Error en WebSocket:", error);
    };
    this.socket.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  console.log('Mensaje recibido del WebSocket:', data);  // Depuración
    
    if (data.type === 'update') {
      const productoExistente = this.historial.find(producto => producto.matricula === data.producto.matricula);
      
      if (!productoExistente) {
        this.historial.unshift(data.producto);
        
        if (this.historial.length > 10) {
          this.historial.pop();
        }
      }
    } else if (data.type === 'delete') {
      console.log('Producto a eliminar:', data.matricula);  // Depuración
      
      // Eliminar el producto de la lista de historial
      this.historial = this.historial.filter(producto => producto.matricula !== data.matricula);
      console.log("Producto eliminado del historial:", data.matricula);
    }
  };
  }
};
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap');

* {
  font-family: 'Roboto', sans-serif;
  box-sizing: border-box;
}

#app {
  background-color: #f5f5f5;
  padding: 40px;
  border-radius: 12px;
  margin: 0 auto;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
}

header {
  text-align: center;
  margin-bottom: 10px;
}

h1 {
  font-size: 30px;
  color: #333;
}

.madera-card {
  background-color: rgb(155, 230, 230);
  color: rgb(0, 0, 0);
  font-size: 25px;
}

input {
  width: 100%;
  padding: 15px;
  margin-bottom: 10px;
  border: 2px solid #ccc;
  border-radius: 8px;
  font-size: 20px;
  transition: border-color 0.3s;
}

.error {
  color: red;
  margin-top: 10px;
  font-size: 10px;
  text-align: center;
  font-size: 35px;
}

.historial-cajas {
  border: 1px solid #ccc;
  border-radius: 8px;
  padding: 20px;
  margin-top: 10px;
}

.historial-cajas h2 {
  font-size: 25px;
  margin-top: 0;
  
}

.historial-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
}

.codigo-card {
  border: 1px solid #ccc;
  font-size: 25px;
  border-radius: 8px;
  padding: 10px; /* Reduce el padding */
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s, box-shadow 0.3s;
  min-height: 400px; /* Altura mínima asegurada */
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.codigo-card p {
  margin: 5px 0; /* Reduce el margen entre los párrafos */
}

.codigo-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
}

.header-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  align-items: center;
  gap: 10px;
}

.logo {
  grid-column: span 4;
  justify-self: start;
}

.titulo {
  grid-column: span 8;
  justify-self: start;
}
</style>
