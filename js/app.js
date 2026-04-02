import { Router } from './router.js';
import { loadData } from './data.js';
import { renderHome } from './views/home.js';
import { renderCategories } from './views/categories.js';
import { renderCarrera } from './views/carrera.js';
import { renderCompaneros } from './views/companeros.js';
import { renderPasaporte } from './views/pasaporte.js';
import { renderQuienSoy } from './views/quiensoy.js';
import { renderConexion } from './views/conexion.js';
import { renderLinea } from './views/linea.js';
import { renderResult } from './views/result.js';

const app = document.getElementById('app');

async function init() {
  app.innerHTML = '<div class="home"><div class="home-logo">⚽</div><p style="color:var(--gray-600)">Cargando...</p></div>';

  try {
    await loadData();
  } catch (e) {
    app.innerHTML = `<div class="home"><p style="color:var(--red)">Error cargando datos: ${e.message}</p></div>`;
    return;
  }

  const router = new Router({
    '#/': () => renderHome(app),
    '#/categorias/:modo': (params) => renderCategories(app, params),
    '#/jugar/carrera/:catId': (params) => renderCarrera(app, params),
    '#/jugar/companeros/:catId': (params) => renderCompaneros(app, params),
    '#/jugar/pasaporte/:catId': (params) => renderPasaporte(app, params),
    '#/jugar/quiensoy/:catId': (params) => renderQuienSoy(app, params),
    '#/jugar/conexion/:catId': (params) => renderConexion(app, params),
    '#/jugar/linea/:catId': (params) => renderLinea(app, params),
    '#/resultado': () => renderResult(app),
  });

  router.start();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
}

init();
