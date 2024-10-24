// stores/index.js
import { createStore } from 'vuex';
import axios from 'axios';

const store = createStore({
  state: {
    datosProducto: null,
    loading: false,
    error: null,
  },
  mutations: {
    setDatosProducto(state, datos) {
      state.datosProducto = datos;
    },
    setLoading(state, loading) {
      state.loading = loading;
    },
    setError(state, error) {
      state.error = error;
    },
  },
  actions: {
    async updateDatosProducto({ commit }, codigoOF) {
      commit('setLoading', true);
      commit('setError', null);
      try {
        const response = await axios.get(`http://192.168.1.33:8080/productos/of/${codigoOF}`);
        commit('setDatosProducto', response.data);
      } catch (error) {
        commit('setError', 'Error al obtener los datos del producto');
      } finally {
        commit('setLoading', false);
      }
    },
    async registrarLecturaCalidad({ commit }, codigoOF) {
      commit('setLoading', true);
      commit('setError', null);
      try {
        const response = await axios.put(`http://192.168.1.33:8080/productos/of/${codigoOF}/calidad`);
        commit('setDatosProducto', response.data);
      } catch (error) {
        commit('setError', 'Error al registrar la lectura de calidad');
      } finally {
        commit('setLoading', false);
      }
    },
  },
});

export default store;