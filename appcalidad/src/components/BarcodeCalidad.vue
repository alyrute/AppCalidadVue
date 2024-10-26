#Cambios de 25/10/2024
<template>
  <div id="app">
    <header class="header-grid">
      <img src="../assets/logoMC.png" alt="Logo de la empresa" class="logo" width="200" />
      <h1 class="titulo">Registro de Lectura de Calidad</h1>
    </header>
    <main>
      <section class="input-section">
        <input
          ref="codigoInput" 
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

      <section v-if="producto" class="producto-detalles">
        <h2>Detalles del Producto</h2>
        <p><strong>Código OF:</strong> {{ producto.codigoof }}</p>
        <p><strong>Código Producto:</strong> {{ producto.codigoproducto }}</p>
        <p><strong>Descripción:</strong> {{ producto.descripcion }}</p>      
        <p>Largo:  <strong>{{ producto.largo }}</strong></p>
        <p>Ancho: <strong>{{ producto.ancho }}</strong></p> 
      </section>

      <section v-if="historial.length > 0" class="historial-cajas">
        <h2>Últimos Códigos OF Leídos</h2>
        <div class="historial-grid">
          <div 
            v-for="(histProducto, index) in historial.filter(p => p.codigoof !== producto?.codigoof)" 
            :key="index" 
            class="codigo-card"
          >
            <p>Código OF: <strong>{{ histProducto.codigoof }}</strong></p>
            <p>Código Producto: <strong>{{ histProducto.codigoproducto }}</strong></p>
            <p>Descripción: <strong>{{ histProducto.descripcion }}</strong></p>
            <p>Largo:  <strong>{{ histProducto.largo }}</strong></p>
            <p>Ancho: <strong>{{ histProducto.ancho }}</strong></p>
            <p>Fecha de Creación: <strong>{{ histProducto.fechacreacion }}</strong></p>
          </div>        
        </div>
      </section>

      <!-- Popup de confirmación con códigos de barras -->
      <div v-if="showConfirmPopup" class="popup">
          <div class="popup-content">
            <!-- Mostrar el código OF -->
            <p>Este código OF ya ha sido leído por calidad.</p>
            <p>¿Quiere sacar de la línea este producto?</p>
            <p>Escanee "Sí" para sacar o "No" para cancelar.</p>

            <!-- Códigos de barras -->
            <div class="barcode-container">
              <svg id="barcodeSi"></svg>
              <svg id="barcodeNo"></svg>
            </div>
          </div>
      </div>
    </main>
  </div>
</template>

<script>
import JsBarcode from 'jsbarcode';

export default {
  data() {
    return {
      codigo: '',
      producto: null,
      historial: [],
      error: null,
      loading: false,
      socket: null,
      showConfirmPopup: false,
      productoParaEliminar: null,
      isConfirming: false,
      messageQueue: [], // Cola de mensajes
    };
  },
  created() {
    this.connectWebSocket();
  },
  mounted() {
    window.addEventListener('keyup', this.detectarEscaneo);
  },
  beforeUnmount() {
    window.removeEventListener('keyup', this.detectarEscaneo);
    if (this.socket) {
      this.socket.close();
    }
  },
  methods: {
    connectWebSocket() {
      const wsUrl = 'ws://192.168.1.33:7979/ws';
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        console.log("Conexión WebSocket establecida");
        // Enviar mensajes en cola
        while (this.messageQueue.length > 0) {
          this.socket.send(this.messageQueue.shift());
        }
      };

      this.socket.onerror = (error) => {
        console.error("Error en WebSocket:", error);
      };

      this.socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'update') {
          if (!this.producto || this.producto.codigoof !== data.producto.codigoof) {
            const exists = this.historial.some(p => p.codigoof === data.producto.codigoof);
            if (!exists) {
              this.historial.unshift(data.producto);
              if (this.historial.length > 4) {
                this.historial.pop();
              }
            }
          }
        }
      };

      this.socket.onclose = () => {
        console.log("Conexión WebSocket cerrada, intentando reconectar...");
        setTimeout(this.connectWebSocket, 5000);
      };
    },
    sendMessage(message) {
      if (this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(message);
      } else {
        this.messageQueue.push(message);
      }
    },
    async registrarLectura() {
      this.error = null;
      this.loading = true;
      try {
        const valorEscaneado = this.codigo.toUpperCase().trim();

        if (valorEscaneado === "SI") {
          await this.confirmarEliminacion();
          return;
        } else if (valorEscaneado === "NO") {
          this.cancelarEliminacion();
          return;
        }

        if (!this.codigo) {
          throw new Error("Por favor ingrese un código OF válido.");
        }

        const getResponse = await fetch(`http://192.168.1.33:8081/productos/${this.codigo}`);
        
        if (!getResponse.ok) {
          throw new Error("Producto no encontrado.");
        }

        const producto = await getResponse.json();

        if (producto.lecturacalidadactiva) {
          this.productoParaEliminar = producto;
          this.showConfirmPopup = true;
          this.codigo = '';
          this.$nextTick(() => this.generateBarcodes());
          this.loading = false;
          return;
        }

        const putResponse = await fetch(`http://192.168.1.33:8081/productos/${this.codigo}/calidad`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (!putResponse.ok) {
          throw new Error("No se pudo registrar la lectura.");
        }

        if (this.producto && this.producto.codigoof !== producto.codigoof) {
          const exists = this.historial.some(p => p.codigoof === this.producto.codigoof);
          if (!exists) {
            this.historial.unshift(this.producto);
            if (this.historial.length > 4) {
              this.historial.pop();
            }
          }
        }
        
        this.producto = producto;
        this.codigo = '';
        this.sendMessage(JSON.stringify({ type: 'update', producto: this.producto })); // Enviar actualización por WebSocket
      } catch (err) {
        this.error = err.message;
      } finally {
        this.loading = false;
      }
    },
    detectarEscaneo() {
      if (!this.showConfirmPopup) return;

      const valorEscaneado = this.codigo.toUpperCase().trim();
      if (valorEscaneado === "SI") {
        this.confirmarEliminacion();
      } else if (valorEscaneado === "NO") {
        this.cancelarEliminacion();
      }
    },
    generateBarcodes() {
      JsBarcode("#barcodeSi", "SI", { format: "CODE128", lineColor: "#000", width: 2, height: 60, displayValue: true });
      JsBarcode("#barcodeNo", "NO", { format: "CODE128", lineColor: "#000", width: 2, height: 60, displayValue: true });
    },
    async confirmarEliminacion() {
      if (this.isConfirming) return;

      this.isConfirming = true;

      try {
        const response = await fetch(`http://192.168.1.33:8081/productos/${this.productoParaEliminar.codigoof}/reset`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        if (!response.ok) {
          throw new Error("No se pudo eliminar el producto.");
        }

        this.historial = this.historial.filter(p => p.codigoof !== this.productoParaEliminar.codigoof);

        if (this.producto?.codigoof === this.productoParaEliminar.codigoof) {
          this.producto = null;
        }

        this.sendMessage(JSON.stringify({ type: 'delete', codigoof: this.productoParaEliminar.codigoof }));

        this.productoParaEliminar = null;
        this.showConfirmPopup = false;
        this.codigo = '';
      } catch (err) {
        this.error = err.message;
      } finally {
        this.isConfirming = false;
      }
    },
    cancelarEliminacion() {
      this.showConfirmPopup = false;
      this.productoParaEliminar = null;
      this.codigo = '';
    }
  }
};
</script>




<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap');

* {
  font-family: 'Roboto', sans-serif;
  box-sizing: border-box;
}

.popup {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 40px;
}

.popup-content {
  background: white;
  padding: 20px;
  border-radius: 8px;
  text-align: center;
}

.barcode-container {
  margin-top: 30px;
  display: flex;
  justify-content: space-around;
}

.barcode-container svg {
  width: 250px;
  height: 100px;
}

.loading {
  font-style: italic;
  color: #9ec4ec;
}

.error {
  color: red;
  margin-top: 10px;
  text-align: center;
  font-size: 35px;
}

.producto-detalles {
  background-color: rgb(155, 230, 230);
  padding: 20px;
  border-radius: 8px;
  border: 1px solid #ccc;
  margin-bottom: 20px;
  font-size: 30px;
  line-height: 1.6;
}

#app {
  background-color: #f5f5f5;
  padding: 40px;
  border-radius: 12px;
  max-width: 1800px;
  margin: 0 auto;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
}

header {
  text-align: center;
  margin-bottom: 20px;
}

h1 {
  font-size: 38px;
  color: #333;
}

.input-section {
  margin-bottom: 20px;
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

input:focus {
  border-color: #a4ccf7;
}

.historial-cajas {
  margin-top: 20px;
  background-color: #ffffff;
  border: 1px solid #ccc;
  border-radius: 8px;
  padding: 20px;
}

.historial-cajas h2 {
  font-size: 24px;
  margin-bottom: 10px;
}

.historial-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
}

.codigo-card {
  background-color: #f9f9f9;
  border: 1px solid #ccc;
  border-radius: 8px;
  padding: 15px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s, box-shadow 0.3s;
}

.codigo-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
}

.header-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr); /* 12 columnas en total */
  align-items: center; /* Alinea verticalmente el logo y el título */
  gap: 10px; /* Espacio entre elementos */
}

.logo {
  grid-column: span 4; /* El logo ocupa 4 columnas */
  justify-self: start; /* Alinea el logo a la izquierda */
}

.titulo {
  grid-column: span 8; /* El título ocupa 8 columnas */
  justify-self: start; /* Alinea el título a la izquierda */
}

.popup-buttons {
  display: flex;
  justify-content: space-around;
  margin-top: 20px;
}

.btn-yes {
  background-color: red;
  color: white;
  border: none;
  padding: 10px 50px;
  border-radius: 5px;
  cursor: pointer;
  font-size: 25px;
}

.btn-no {
  background-color: green;
  color: white;
  border: none;
  padding: 10px 50px;
  border-radius: 5px;
  cursor: pointer;
  font-size: 25px;
}
</style>
