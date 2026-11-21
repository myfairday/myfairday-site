/* =====================================================================
   PAINEL DE ANOMALIAS GLOBAIS — app.js (Tempo Real)
   JavaScript puro, sem dependências, conectado a APIs abertas globais.
   ===================================================================== */
'use strict';

/* ---------------------------------------------------------------------
   1. CONFIGURAÇÃO
   --------------------------------------------------------------------- */
const CONFIG = {
  maxHistorico: 60,                   // pontos guardados para o gráfico da página de detalhe
  maxLog: 40,                         // eventos guardados no registro de cada sensor
  limitePM25: 35,                     // µg/m³ — acima disso a cidade conta como "ruim" (qualidade do ar)
  chaveCaos: 'painel_caos_live_v1',   // chave do localStorage para o contador nunca "voltar atrás"
  chaveHistorico: 'painel_hist_v1',   // histórico persistente das leituras reais por sensor
  chaveClimaBase: 'painel_clima_v1',  // cache diário da média histórica (8 anos) do Open-Meteo
  chaveVisitante: 'myfairday_vis_ok', // marca visitante já contabilizado (não muda no F5)
  chaveVisTotal: 'myfairday_vis_num'  // último valor exibido de visitantes
};

/* ---------------------------------------------------------------------
   2. UTILITÁRIOS E REDE
   --------------------------------------------------------------------- */
const NS_SVG = 'http://www.w3.org/2000/svg';

const U = {
  clamp: (v, a, b) => Math.min(b, Math.max(a, v)),
  num: (n) => Math.round(n).toLocaleString('pt-BR'),
  dec: (n, d = 1) => n.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d }),
  sinal(n, d = 1) {
    const a = Math.abs(n);
    const t = U.dec(a, d);
    if (a < 0.05 && d > 0) return t;
    return (n > 0 ? '+' : n < 0 ? '−' : '') + t;
  },
  hora: (ts) => new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
  relativo(ts) {
    if (!ts) return 'sincronizando…';
    const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
    if (s < 10) return 'agora mesmo';
    if (s < 60) return `há ${s} s`;
    const m = Math.floor(s / 60);
    if (m < 60) return `há ${m} min`;
    return `há ${Math.floor(m / 60)} h`;
  },
  freq(seg) {
    if (seg < 60) return `${seg} s`;
    if (seg < 3600) return `${seg / 60} min`;
    return `${seg / 3600} h`;
  },
  normalizar: (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
};

function h(tag, classe, texto) {
  const e = document.createElement(tag);
  if (classe) e.className = classe;
  if (texto !== undefined) e.textContent = texto;
  return e;
}

function svg(tag, attrs = {}) {
  const e = document.createElementNS(NS_SVG, tag);
  Object.keys(attrs).forEach((k) => e.setAttribute(k, attrs[k]));
  return e;
}

// Fetch com timeout e cadeia de relays CORS gratuitos (sem chave)
async function fetchSeguro(url, tipo = 'json', timeoutMs = 14000) {
  const tentar = async (targetUrl, unwrapAllOrigins = false) => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(targetUrl, { signal: ctrl.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      if (unwrapAllOrigins) {
        const wrapper = await res.json();
        if (!wrapper || typeof wrapper.contents !== 'string') throw new Error('Resposta vazia');
        return tipo === 'text' ? wrapper.contents : JSON.parse(wrapper.contents);
      }
      return tipo === 'text' ? await res.text() : await res.json();
    } finally {
      clearTimeout(timer);
    }
  };

  // 1. Direto
  try {
    return await tentar(url, false);
  } catch (_) { /* segue para relays CORS */ }

  // 2. CodeTabs
  try {
    return await tentar(`https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`, false);
  } catch (_) { /* próximo relay */ }

  // 3. AllOrigins (/get)
  return await tentar(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`, true);
}

// Plota pontos reais (coordenadas lat/lon normalizadas em %) no mapa do card
function renderizarMapaReal(el, pontos) {
  el.replaceChildren();
  pontos.forEach((pt, idx) => {
    const p = h('span', pt.hot ? 'ponto hot' : 'ponto');
    const x = U.clamp(((pt.lon + 180) / 360) * 100, 3, 97);
    const y = U.clamp(((90 - pt.lat) / 180) * 100, 5, 95);
    p.style.left = x.toFixed(1) + '%';
    p.style.top = y.toFixed(1) + '%';
    p.style.animationDelay = (-((idx * 0.37) % 3)).toFixed(2) + 's';
    el.appendChild(p);
  });
}

/* ---------------------------------------------------------------------
   3. CONTADOR DE VISITANTES ÚNICOS (NÃO MUDA AO APERTAR F5)
   --------------------------------------------------------------------- */
const Visitantes = {
  async iniciar() {
    const el = document.getElementById('visitantes');
    if (!el) return;

    let jaContado = false;
    let cache = 0;
    try {
      jaContado = localStorage.getItem(CONFIG.chaveVisitante) === '1';
      cache = parseInt(localStorage.getItem(CONFIG.chaveVisTotal), 10) || 0;
    } catch (_) { /* storage indisponível */ }

    if (cache > 0) {
      el.textContent = `visitantes: ${U.num(cache)}`;
    }

    if (jaContado) {
      if (cache === 0) {
        try {
          const data = await fetchSeguro('https://api.counterapi.dev/v1/myfairday-org/visitas', 'json', 6000);
          const total = Number(data?.count) || 1;
          el.textContent = `visitantes: ${U.num(total)}`;
          localStorage.setItem(CONFIG.chaveVisTotal, String(total));
        } catch (_) {
          el.textContent = 'visitantes: 1';
        }
      }
      return;
    }

    try {
      const data = await fetchSeguro('https://api.counterapi.dev/v1/myfairday-org/visitas/up', 'json', 7000);
      const total = Number(data?.count) || (cache + 1);
      el.textContent = `visitantes: ${U.num(total)}`;
      try {
        localStorage.setItem(CONFIG.chaveVisitante, '1');
        localStorage.setItem(CONFIG.chaveVisTotal, String(total));
      } catch (_) { /* ignora */ }
    } catch (_) {
      const fallback = cache + 1;
      el.textContent = `visitantes: ${U.num(fallback)}`;
      try {
        localStorage.setItem(CONFIG.chaveVisitante, '1');
        localStorage.setItem(CONFIG.chaveVisTotal, String(fallback));
      } catch (__) { /* ignora */ }
    }
  }
};

/* ---------------------------------------------------------------------
   4. TERMÔMETRO DO CAOS
   --------------------------------------------------------------------- */
const Caos = {
  valor: 0,
  inicializado: false,

  iniciar(base) {
    let salvo = 0;
    try { salvo = parseInt(localStorage.getItem(CONFIG.chaveCaos), 10) || 0; } catch (_) { /* ignora */ }
    this.valor = Math.max(salvo, Math.floor(base));
    this.inicializado = true;
    try { localStorage.setItem(CONFIG.chaveCaos, String(this.valor)); } catch (_) { /* ignora */ }
    this.render(false);
  },

  registrar(n) {
    n = Math.floor(n);
    if (!this.inicializado || !(n > 0)) return;
    this.valor += n;
    try { localStorage.setItem(CONFIG.chaveCaos, String(this.valor)); } catch (_) { /* ignora */ }
    this.render(true, n);
    Sismografo.pico(n);
  },

  render(flash, n) {
    const el = document.getElementById('caos-valor');
    el.textContent = U.num(this.valor);
    if (flash) {
      el.classList.remove('flash');
      void el.offsetWidth;
      el.classList.add('flash');
      const delta = document.getElementById('caos-delta');
      delta.textContent = `+${U.num(n)}`;
      delta.classList.remove('sobe');
      void delta.offsetWidth;
      delta.classList.add('sobe');
    }
  }
};

/* ---------------------------------------------------------------------
   5. BASE COMUM DOS SENSORES
   --------------------------------------------------------------------- */
function carregarHistoricoSalvo(id) {
  try {
    const bruto = JSON.parse(localStorage.getItem(CONFIG.chaveHistorico) || '{}');
    return Array.isArray(bruto[id]) ? bruto[id].slice(-CONFIG.maxHistorico) : [];
  } catch (_) {
    return [];
  }
}

function salvarHistorico(id, lista) {
  try {
    const bruto = JSON.parse(localStorage.getItem(CONFIG.chaveHistorico) || '{}');
    bruto[id] = lista.slice(-CONFIG.maxHistorico);
    localStorage.setItem(CONFIG.chaveHistorico, JSON.stringify(bruto));
  } catch (_) { /* ignora */ }
}

const Base = {
  registrarHistorico() {
    const v = this.metrica();
    if (typeof v !== 'number' || Number.isNaN(v)) return;
    this.historico.push(v);
    if (this.historico.length > CONFIG.maxHistorico) this.historico.shift();
    salvarHistorico(this.id, this.historico);
  },
  logar(texto, nivel = '', ts = Date.now()) {
    this.log.unshift({ ts, texto, nivel });
    if (this.log.length > CONFIG.maxLog) this.log.pop();
  }
};

function criarSensor(def) {
  return Object.assign({
    historico: carregarHistoricoSalvo(def.id),
    log: [],
    ultima: 0,
    carregado: false
  }, Base, def);
}

/* ---------------------------------------------------------------------
   6. OS 8 SENSORES EM TEMPO REAL
   --------------------------------------------------------------------- */

/* ===== 01 · AVIÕES NO AR — Rede ADS-B Global / OpenSky — 30 s =========== */
const SETORES_AEREOS = [
  { lat: 39.8, lon: -98.5, dist: 250 },  // América do Norte
  { lat: -23.5, lon: -46.6, dist: 250 }, // América do Sul
  { lat: 50.1, lon: 8.6, dist: 250 },    // Europa Central
  { lat: 25.2, lon: 55.3, dist: 250 },   // Oriente Médio
  { lat: 28.6, lon: 77.2, dist: 250 },   // Sul da Ásia
  { lat: 35.6, lon: 139.7, dist: 250 },  // Leste Asiático
  { lat: -33.8, lon: 151.2, dist: 250 }  // Oceania
];

const aviacao = criarSensor({
  id: 'aviacao', num: '01', titulo: 'AVIÕES NO AR', fonte: 'ADSB Exchange / OpenSky', freq: 30,
  e: { total: 0, desvios: [], pontos: [], vistosDesvios: new Set() },

  async atualizar() {
    let total = 0;
    const desvios = [];
    const pontos = [];

    // 1) Consulta setores aéreos globais na rede aberta ADSB.lol (respostas leves e rápidas)
    const resultadosSetores = await Promise.allSettled([
      ...SETORES_AEREOS.map((s) =>
        fetchSeguro(`https://api.adsb.lol/v2/point/${s.lat}/${s.lon}/${s.dist}`, 'json', 10000)
      ),
      fetchSeguro('https://api.adsb.lol/v2/mil', 'json', 10000)
    ]);

    const aeronavesMap = new Map();
    resultadosSetores.forEach((res) => {
      if (res.status === 'fulfilled' && Array.isArray(res.value?.ac)) {
        res.value.ac.forEach((a) => {
          if (a && a.hex && a.alt_baro !== 'ground') {
            aeronavesMap.set(a.hex, a);
          }
        });
      }
    });

    if (aeronavesMap.size > 0) {
      const lista = [...aeronavesMap.values()];
      total = lista.length;

      lista.forEach((a) => {
        const call = (a.flight || a.r || a.hex || 'N/A').trim();
        const sq = String(a.squawk || '');
        const baroRate = Number(a.baro_rate) || 0;
        const lat = Number(a.lat);
        const lon = Number(a.lon);

        let motivo = '';
        if (sq === '7700') motivo = 'Squawk 7700 (emergência geral)';
        else if (sq === '7600') motivo = 'Squawk 7600 (falha de comunicação)';
        else if (sq === '7500') motivo = 'Squawk 7500 (interferência ilícita)';
        else if (Math.abs(baroRate) > 6000) motivo = `Razão vertical extrema (${U.sinal(baroRate, 0)} ft/min)`;

        if (motivo) {
          desvios.push({ id: `${call}-${motivo}`, indicativo: call, motivo, lon, lat });
        }
      });

      const passo = Math.max(1, Math.floor(lista.length / 55));
      for (let i = 0; i < lista.length && pontos.length < 55; i += passo) {
        const a = lista[i];
        if (typeof a.lat === 'number' && typeof a.lon === 'number') {
          pontos.push({ lon: a.lon, lat: a.lat, hot: false });
        }
      }
      desvios.slice(0, 8).forEach((d) => {
        if (!Number.isNaN(d.lon) && !Number.isNaN(d.lat)) {
          pontos.push({ lon: d.lon, lat: d.lat, hot: true });
        }
      });
      this.fonte = 'Rede ADS-B Global';
    } else {
      // 2) Fallback secundário: OpenSky Network
      const dados = await fetchSeguro('https://opensky-network.org/api/states/all', 'json', 14000);
      const states = Array.isArray(dados?.states) ? dados.states : [];
      if (states.length === 0) throw new Error('Radares temporariamente indisponíveis');

      const noAr = states.filter((s) => s && s[8] === false);
      total = noAr.length;
      noAr.forEach((s) => {
        const call = (s[1] || s[0] || 'N/A').trim();
        const sq = String(s[14] || '');
        if (sq === '7700' || sq === '7600' || sq === '7500') {
          desvios.push({ id: `${call}-${sq}`, indicativo: call, motivo: `Squawk ${sq}`, lon: s[5], lat: s[6] });
        }
      });
      const passo = Math.max(1, Math.floor(noAr.length / 55));
      for (let i = 0; i < noAr.length && pontos.length < 55; i += passo) {
        const s = noAr[i];
        if (typeof s[5] === 'number' && typeof s[6] === 'number') {
          pontos.push({ lon: s[5], lat: s[6], hot: false });
        }
      }
      this.fonte = 'OpenSky Network';
    }

    this.e.total = total;
    this.e.desvios = desvios.slice(0, 8);
    this.e.pontos = pontos;

    let novos = 0;
    this.e.desvios.forEach((d) => {
      if (!this.e.vistosDesvios.has(d.id)) {
        this.e.vistosDesvios.add(d.id);
        novos++;
        this.logar(`${d.indicativo}: ${d.motivo}`, 'alerta');
      }
    });

    if (novos > 0) Caos.registrar(novos);
    else this.logar(`${U.num(total)} aeronaves monitoradas nos corredores globais`);
  },

  metrica() { return this.e.total; },
  principal() {
    if (!this.carregado) return { texto: '—', nivel: 'ok' };
    const d = this.e.desvios.length;
    return { texto: U.num(this.e.total), nivel: d >= 5 ? 'crit' : d >= 2 ? 'warn' : 'ok' };
  },
  contexto() {
    if (!this.carregado) return 'sincronizando radar aéreo…';
    return `${this.e.desvios.length} alerta(s) de squawk/rota ativo(s) · pontos vermelhos = alertas`;
  },
  montarViz() { /* preenchido após primeira leitura real */ },
  renderViz(el) { renderizarMapaReal(el, this.e.pontos); },
  eventosIniciais() { return this.e.desvios.length; }
});

/* ===== 02 · MICROTREMORES — USGS Earthquake Feed — 5 min ============== */
const microtremores = criarSensor({
  id: 'microtremores', num: '02', titulo: 'MICROTREMORES', fonte: 'USGS Earthquake Feed', freq: 300,
  e: { mags: [], serie: Array(12).fill(0), vistosIds: new Set() },

  async atualizar() {
    const agora = Date.now();
    const ontemISO = new Date(agora - 24 * 3600 * 1000).toISOString();
    const url = `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&minmagnitude=2&maxmagnitude=3&starttime=${ontemISO}`;
    const dados = await fetchSeguro(url, 'json', 12000);
    const features = Array.isArray(dados?.features) ? dados.features : [];

    this.e.mags = features.map((f) => Number(f.properties?.mag) || 2.0);

    const bins = Array(12).fill(0);
    features.forEach((f) => {
      const t = Number(f.properties?.time) || agora;
      const horasAtras = (agora - t) / (3600 * 1000);
      if (horasAtras >= 0 && horasAtras < 24) {
        const idx = 11 - Math.min(11, Math.floor(horasAtras / 2));
        bins[idx]++;
      }
    });
    this.e.serie = bins;

    const ordenados = [...features].sort((a, b) => (a.properties?.time || 0) - (b.properties?.time || 0));
    let novos = 0;
    ordenados.forEach((f) => {
      if (f.id && !this.e.vistosIds.has(f.id)) {
        this.e.vistosIds.add(f.id);
        novos++;
        const mag = Number(f.properties?.mag) || 2.0;
        const local = f.properties?.place || 'Local não especificado';
        this.logar(`M${U.dec(mag)} · ${local}`, mag >= 2.7 ? 'alerta' : '', f.properties?.time || agora);
      }
    });

    if (novos > 0) Caos.registrar(novos);
    else this.logar('Nenhum novo microtremor neste ciclo');
  },

  maior() { return this.e.mags.length ? Math.max(...this.e.mags) : 0; },
  metrica() { return this.e.mags.length; },
  principal() {
    if (!this.carregado) return { texto: '—', nivel: 'ok' };
    const n = this.e.mags.length;
    return { texto: U.num(n), nivel: n >= 40 ? 'crit' : n >= 20 ? 'warn' : 'ok' };
  },
  contexto() {
    if (!this.carregado) return 'consultando sismógrafos USGS…';
    const m = this.maior();
    return `magnitude 2,0–3,0 nas últimas 24h · ${m ? 'maior: M' + U.dec(m) : 'nenhum registro'} · barras = por 2h`;
  },
  montarViz(el) {
    el.querySelectorAll('rect').forEach((r) => r.remove());
    this.barras = [];
    for (let i = 0; i < 12; i++) {
      const r = svg('rect', { x: i * 20 + 3, width: 14, class: 'barra' });
      el.appendChild(r);
      this.barras.push(r);
    }
  },
  renderViz() {
    const maxBin = Math.max(3, ...this.e.serie);
    this.barras.forEach((r, i) => {
      const v = this.e.serie[i] ?? 0;
      const alt = v === 0 ? 2 : Math.round(10 + (v / maxBin) * 80);
      r.setAttribute('height', alt);
      r.setAttribute('y', 96 - alt);
      r.setAttribute('class', v >= maxBin * 0.75 && v > 0 ? 'barra alta' : 'barra');
    });
  },
  eventosIniciais() { return this.e.mags.length; }
});

/* ===== 03 · FOCOS DE INCÊNDIO — NASA EONET — 30 min =================== */
const incendios = criarSensor({
  id: 'incendios', num: '03', titulo: 'FOCOS DE INCÊNDIO', fonte: 'NASA EONET', freq: 1800,
  e: { ativos: 0, h24: 0, pontos: [], vistosIds: new Set() },

  async atualizar() {
    const url = 'https://eonet.gsfc.nasa.gov/api/v3/events?category=wildfires&status=open&days=30';
    const dados = await fetchSeguro(url, 'json', 12000);
    const events = Array.isArray(dados?.events) ? dados.events : [];
    const limite48h = Date.now() - 48 * 3600 * 1000;

    let recentes = 0;
    const pontos = [];
    let novos = 0;

    events.forEach((ev) => {
      const geoms = Array.isArray(ev.geometry) ? ev.geometry : [];
      const ultimaGeom = geoms[geoms.length - 1];
      const coords = ultimaGeom?.coordinates;
      const ts = ultimaGeom?.date ? Date.parse(ultimaGeom.date) : 0;
      const ehRecente = ts >= limite48h;
      if (ehRecente) recentes++;

      if (Array.isArray(coords) && coords.length >= 2 && pontos.length < 65) {
        pontos.push({ lon: Number(coords[0]), lat: Number(coords[1]), hot: ehRecente });
      }

      if (ev.id && !this.e.vistosIds.has(ev.id)) {
        this.e.vistosIds.add(ev.id);
        novos++;
        this.logar(ev.title || 'Foco ativo detectado por satélite', ehRecente ? 'alerta' : '', ts || Date.now());
      }
    });

    this.e.ativos = events.length;
    this.e.h24 = recentes;
    this.e.pontos = pontos;

    if (novos > 0) Caos.registrar(novos);
    else this.logar(`${U.num(events.length)} incêndios ativos monitorados pela NASA`);
  },

  metrica() { return this.e.ativos; },
  principal() {
    if (!this.carregado) return { texto: '—', nivel: 'ok' };
    const n = this.e.ativos;
    return { texto: U.num(n), nivel: n > 80 ? 'crit' : n > 35 ? 'warn' : 'ok' };
  },
  contexto() {
    if (!this.carregado) return 'varrendo satélites NASA…';
    return `eventos ativos monitorados · ${U.num(this.e.h24)} com atividade nas últimas 48h`;
  },
  montarViz() { /* preenchido após leitura real */ },
  renderViz(el) { renderizarMapaReal(el, this.e.pontos); },
  eventosIniciais() { return this.e.ativos; }
});

/* ===== 04 · TEMPERATURAS EXTREMAS — Open-Meteo — 1 h ================== */
const ESTACOES_EXTREMAS = [
  { nome: 'Kuwait City, KW', lat: 29.3759, lon: 47.9774 },
  { nome: 'Ahvaz, IR', lat: 31.3183, lon: 48.6706 },
  { nome: 'Jacobabad, PK', lat: 28.2819, lon: 68.4376 },
  { nome: 'Basra, IQ', lat: 30.5085, lon: 47.7804 },
  { nome: 'Vale da Morte, EUA', lat: 36.5054, lon: -117.0794 },
  { nome: 'Marble Bar, AU', lat: -21.1756, lon: 119.7447 },
  { nome: 'Timbuctu, ML', lat: 16.7666, lon: -3.0026 },
  { nome: 'Turbat, PK', lat: 26.0031, lon: 63.0544 },
  { nome: 'Riad, SA', lat: 24.7136, lon: 46.6753 },
  { nome: 'Ouargla, DZ', lat: 31.9493, lon: 5.3250 },
  { nome: 'Oymyakon, RU', lat: 63.4641, lon: 142.7737 },
  { nome: 'Yakutsk, RU', lat: 62.0355, lon: 129.6755 },
  { nome: 'Verkhoyansk, RU', lat: 67.5506, lon: 133.3993 },
  { nome: 'Eureka, CA', lat: 79.9889, lon: -85.9408 },
  { nome: 'Norilsk, RU', lat: 69.3558, lon: 88.1893 },
  { nome: 'Ulan Bator, MN', lat: 47.8864, lon: 106.9057 },
  { nome: 'Fairbanks, EUA', lat: 64.8378, lon: -147.7164 },
  { nome: 'Resolute, CA', lat: 74.6973, lon: -94.8297 },
  { nome: 'Yellowknife, CA', lat: 62.4540, lon: -114.3718 },
  { nome: 'Vostok, AQ', lat: -78.4645, lon: 106.8340 }
];

const temperaturas = criarSensor({
  id: 'temperaturas', num: '04', titulo: 'TEMPERATURAS EXTREMAS', fonte: 'Open-Meteo', freq: 3600,
  e: { lista: [] },

  async atualizar() {
    const lats = ESTACOES_EXTREMAS.map((c) => c.lat).join(',');
    const lons = ESTACOES_EXTREMAS.map((c) => c.lon).join(',');
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}&current=temperature_2m`;
    const dados = await fetchSeguro(url, 'json', 12000);
    const arr = Array.isArray(dados) ? dados : [dados];

    const extremas = [];
    arr.forEach((item, i) => {
      const temp = Number(item?.current?.temperature_2m);
      if (Number.isNaN(temp)) return;
      if (temp > 45 || temp < -20) {
        extremas.push({
          nome: ESTACOES_EXTREMAS[i].nome,
          tipo: temp > 45 ? 'q' : 'f',
          temp
        });
      }
    });

    extremas.sort((a, b) => this.severidade(b) - this.severidade(a));
    this.e.lista = extremas;

    const top = extremas[0];
    this.logar(
      extremas.length === 0
        ? 'Nenhuma estação monitorada acima de 45 °C ou abaixo de −20 °C'
        : `${extremas.length} estação(ões) em faixa extrema · mais severa: ${top.nome} (${U.dec(top.temp)} °C)`,
      extremas.length >= 3 ? 'alerta' : ''
    );
  },

  severidade(c) { return c.tipo === 'q' ? c.temp - 45 : -20 - c.temp; },
  metrica() { return this.e.lista.length; },
  principal() {
    if (!this.carregado) return { texto: '—', nivel: 'ok' };
    const n = this.e.lista.length;
    return { texto: U.num(n), nivel: n >= 6 ? 'crit' : n >= 3 ? 'warn' : 'ok' };
  },
  contexto() {
    if (!this.carregado) return 'lendo estações meteorológicas…';
    const q = this.e.lista.filter((c) => c.tipo === 'q').length;
    return `estações acima de 45 °C ou abaixo de −20 °C · ${q} quente(s) / ${this.e.lista.length - q} fria(s)`;
  },
  montarViz() { /* lista */ },
  renderViz(el) {
    if (this.e.lista.length === 0) {
      el.replaceChildren(h('li', 'vazio', 'nenhuma estação em faixa extrema agora'));
      return;
    }
    el.replaceChildren(...this.e.lista.map((c) => {
      const li = h('li');
      const grave = c.tipo === 'q' ? c.temp >= 49 : c.temp <= -35;
      li.append(
        h('span', 'nome', c.nome),
        h('span', 'fonte-tag', c.tipo === 'q' ? 'CALOR' : 'FRIO'),
        h('span', 'val ' + (grave ? 'verm' : 'amb'), `${U.dec(c.temp)} °C`)
      );
      return li;
    }));
  },
  eventosIniciais() { return 0; }
});

/* ===== 05 · ANOMALIAS CLIMÁTICAS — Open-Meteo — 1 h =================== */
const CIDADES_CLIMA = [
  { nome: 'São Paulo', lat: -23.5505, lon: -46.6333 },
  { nome: 'Moscou', lat: 55.7558, lon: 37.6173 },
  { nome: 'Nova Délhi', lat: 28.6139, lon: 77.2090 },
  { nome: 'Cairo', lat: 30.0444, lon: 31.2357 },
  { nome: 'Sydney', lat: -33.8688, lon: 151.2093 },
  { nome: 'Nova York', lat: 40.7128, lon: -74.0060 },
  { nome: 'Lagos', lat: 6.5244, lon: 3.3792 },
  { nome: 'Reykjavik', lat: 64.1466, lon: -21.9426 },
  { nome: 'Pequim', lat: 39.9042, lon: 116.4074 },
  { nome: 'Cidade do México', lat: 19.4326, lon: -99.1332 }
];

const anomalias = criarSensor({
  id: 'anomalias', num: '05', titulo: 'ANOMALIAS CLIMÁTICAS', fonte: 'Open-Meteo', freq: 3600,
  e: { d: {} },

  async obterMediasHistoricas(lats, lons) {
    const hoje = new Date();
    const mm = String(hoje.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(hoje.getUTCDate()).padStart(2, '0');
    const chaveDia = `${mm}-${dd}`;

    try {
      const cache = JSON.parse(localStorage.getItem(CONFIG.chaveClimaBase) || '{}');
      if (cache.dia === chaveDia && Array.isArray(cache.medias) && cache.medias.length === CIDADES_CLIMA.length) {
        return cache.medias;
      }
    } catch (_) { /* segue para busca */ }

    const anoAtual = hoje.getUTCFullYear();
    const anos = [1, 2, 3, 4, 5, 6, 7, 8].map((k) => anoAtual - k);
    const somas = Array(CIDADES_CLIMA.length).fill(0);
    const conts = Array(CIDADES_CLIMA.length).fill(0);

    await Promise.allSettled(anos.map(async (ano) => {
      const dataStr = `${ano}-${mm}-${dd}`;
      const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lats}&longitude=${lons}&start_date=${dataStr}&end_date=${dataStr}&daily=temperature_2m_mean`;
      const res = await fetchSeguro(url, 'json', 10000);
      const arr = Array.isArray(res) ? res : [res];
      arr.forEach((item, idx) => {
        const val = Number(item?.daily?.temperature_2m_mean?.[0]);
        if (!Number.isNaN(val)) {
          somas[idx] += val;
          conts[idx]++;
        }
      });
    }));

    const medias = somas.map((s, idx) => (conts[idx] > 0 ? s / conts[idx] : 20));
    try {
      localStorage.setItem(CONFIG.chaveClimaBase, JSON.stringify({ dia: chaveDia, medias }));
    } catch (_) { /* ignora */ }
    return medias;
  },

  async atualizar() {
    const lats = CIDADES_CLIMA.map((c) => c.lat).join(',');
    const lons = CIDADES_CLIMA.map((c) => c.lon).join(',');

    const [atuaisRes, medias] = await Promise.all([
      fetchSeguro(`https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}&current=temperature_2m`, 'json', 12000),
      this.obterMediasHistoricas(lats, lons)
    ]);

    const arr = Array.isArray(atuaisRes) ? atuaisRes : [atuaisRes];
    CIDADES_CLIMA.forEach((c, i) => {
      const atual = Number(arr[i]?.current?.temperature_2m);
      const base = medias[i];
      this.e.d[c.nome] = !Number.isNaN(atual) ? atual - base : 0;
    });

    const m = this.maior();
    if (m) {
      this.logar(`Maior desvio: ${m.nome} ${U.sinal(m.d)} °C`, Math.abs(m.d) >= 5 ? 'alerta' : '');
    }
  },

  ordenadas() {
    return CIDADES_CLIMA
      .map((c) => ({ nome: c.nome, d: this.e.d[c.nome] ?? 0 }))
      .sort((a, b) => Math.abs(b.d) - Math.abs(a.d));
  },
  maior() { return this.ordenadas()[0]; },
  metrica() { return Math.abs(this.maior()?.d || 0); },
  principal() {
    if (!this.carregado) return { texto: '—', nivel: 'ok' };
    const m = this.maior();
    const a = Math.abs(m.d);
    return { texto: `${U.sinal(m.d)} °C`, nivel: a >= 8 ? 'crit' : a >= 5 ? 'warn' : 'ok' };
  },
  contexto() {
    if (!this.carregado) return 'comparando temperatura atual vs. média histórica…';
    const acima = this.ordenadas().filter((c) => Math.abs(c.d) >= 5).length;
    return `desvio vs. média histórica · ${acima} cidade(s) além de ±5 °C · maior: ${this.maior().nome}`;
  },
  montarViz() { /* lista */ },
  renderViz(el) {
    el.replaceChildren(...this.ordenadas().map((c) => {
      const a = Math.abs(c.d);
      const nivel = a >= 8 ? 'critico' : a >= 5 ? 'alerta' : '';
      const barra = h('span', 'barra-div');
      const i = h('i', `${c.d >= 0 ? 'pos' : 'neg'} ${nivel}`.trim());
      i.style.width = (Math.min(a, 12) / 12 * 50).toFixed(1) + '%';
      barra.appendChild(i);
      const li = h('li');
      li.append(
        h('span', 'nome', c.nome),
        barra,
        h('span', 'val ' + (a >= 8 ? 'verm' : a >= 5 ? 'amb' : 'suave'), `${U.sinal(c.d)} °C`)
      );
      return li;
    }));
  },
  eventosIniciais() { return 0; }
});

/* ===== 06 · QUALIDADE DO AR — Open-Meteo Air Quality — 1 h ============== */
const CIDADES_AR = [
  { nome: 'Nova Délhi', lat: 28.6139, lon: 77.2090 },
  { nome: 'Lahore', lat: 31.5204, lon: 74.3587 },
  { nome: 'Daca', lat: 23.8103, lon: 90.4125 },
  { nome: 'Cairo', lat: 30.0444, lon: 31.2357 },
  { nome: 'Pequim', lat: 39.9042, lon: 116.4074 },
  { nome: 'Jacarta', lat: -6.2088, lon: 106.8456 },
  { nome: 'Cidade do México', lat: 19.4326, lon: -99.1332 },
  { nome: 'Lima', lat: -12.0464, lon: -77.0428 },
  { nome: 'Santiago', lat: -33.4489, lon: -70.6693 },
  { nome: 'Cidade do Cabo', lat: -33.9249, lon: 18.4241 },
  { nome: 'Londres', lat: 51.5074, lon: -0.1278 },
  { nome: 'Sydney', lat: -33.8688, lon: 151.2093 }
];

const ar = criarSensor({
  id: 'ar', num: '06', titulo: 'QUALIDADE DO AR', fonte: 'Open-Meteo / CAMS', freq: 3600,
  e: { pm: {} },

  async atualizar() {
    const lats = CIDADES_AR.map((c) => c.lat).join(',');
    const lons = CIDADES_AR.map((c) => c.lon).join(',');
    const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lats}&longitude=${lons}&current=pm2_5`;
    const dados = await fetchSeguro(url, 'json', 12000);
    const arr = Array.isArray(dados) ? dados : [dados];

    CIDADES_AR.forEach((c, i) => {
      const val = Number(arr[i]?.current?.pm2_5);
      this.e.pm[c.nome] = !Number.isNaN(val) ? val : 0;
    });

    const lista = this.ordenadas();
    const n = this.acima();
    if (lista.length > 0) {
      this.logar(`${n} cidade(s) acima de ${CONFIG.limitePM25} µg/m³ · pior: ${lista[0].nome} (${U.num(lista[0].pm)})`, n >= 6 ? 'alerta' : '');
    }
  },

  ordenadas() {
    return CIDADES_AR
      .map((c) => ({ nome: c.nome, pm: this.e.pm[c.nome] ?? 0 }))
      .sort((a, b) => b.pm - a.pm);
  },
  acima() { return this.ordenadas().filter((c) => c.pm > CONFIG.limitePM25).length; },
  metrica() { return this.acima(); },
  principal() {
    if (!this.carregado) return { texto: '—', nivel: 'ok' };
    const n = this.acima();
    return { texto: U.num(n), nivel: n >= 8 ? 'crit' : n >= 5 ? 'warn' : 'ok' };
  },
  contexto() {
    if (!this.carregado) return 'medindo material particulado PM2,5…';
    return `de ${CIDADES_AR.length} cidades acima do limite de PM2,5 (${CONFIG.limitePM25} µg/m³)`;
  },
  montarViz() { /* lista */ },
  renderViz(el) {
    el.replaceChildren(...this.ordenadas().map((c) => {
      const cor = c.pm >= 100 ? 'vermelho' : c.pm > CONFIG.limitePM25 ? 'ambar' : 'verde';
      const li = h('li');
      li.append(
        h('span', 'ponto-cor ' + cor),
        h('span', 'nome', c.nome),
        h('span', 'val ' + (cor === 'vermelho' ? 'verm' : cor === 'ambar' ? 'amb' : 'suave'), `${U.num(c.pm)} µg/m³`)
      );
      return li;
    }));
  },
  eventosIniciais() { return 0; }
});

/* ===== 07 · MANCHETES EM TEMPO REAL — BBC, Al Jazeera, GDELT — 10 min = */
const PALAVRAS_CRISE = [
  'crise', 'crisis', 'ataque', 'attack', 'colapso', 'collapse',
  'guerra', 'war', 'catastrofe', 'catastrophe', 'pandemia', 'pandemic',
  'golpe', 'coup', 'explosao', 'explosion', 'desastre', 'disaster',
  'emergencia', 'emergency', 'evacuacao', 'evacuation', 'terremoto', 'earthquake'
];

const ehCrise = (titulo) => {
  const n = U.normalizar(titulo);
  return PALAVRAS_CRISE.some((p) => n.includes(p));
};

const manchetes = criarSensor({
  id: 'manchetes', num: '07', titulo: 'MANCHETES EM TEMPO REAL', fonte: 'BBC, Al Jazeera & GDELT', freq: 600,
  e: { lista: [], total24: 0, vistas: new Set() },

  extrairRss(xmlStr, fonte) {
    const doc = new DOMParser().parseFromString(xmlStr, 'text/xml');
    const itens = [...doc.querySelectorAll('item')];
    return itens.map((it) => {
      const t = it.querySelector('title')?.textContent?.trim() || '';
      const pub = it.querySelector('pubDate')?.textContent?.trim() || '';
      const ts = pub ? Date.parse(pub) : Date.now();
      return { f: fonte, t, ts: Number.isNaN(ts) ? Date.now() : ts };
    }).filter((m) => m.t && ehCrise(m.t));
  },

  async atualizar() {
    const coletadas = [];

    const [bbcRes, ajRes, gdeltRes] = await Promise.allSettled([
      fetchSeguro('https://feeds.bbci.co.uk/news/world/rss.xml', 'text', 10000),
      fetchSeguro('https://www.aljazeera.com/xml/rss/all.xml', 'text', 10000),
      fetchSeguro('https://api.gdeltproject.org/api/v2/doc/doc?query=(crisis%20OR%20attack%20OR%20collapse%20OR%20war%20OR%20disaster%20OR%20explosion)%20(domain:reuters.com%20OR%20domain:apnews.com%20OR%20domain:bbc.co.uk)&mode=artlist&maxrecords=30&timespan=24h&format=json', 'json', 10000)
    ]);

    if (bbcRes.status === 'fulfilled' && bbcRes.value) {
      coletadas.push(...this.extrairRss(bbcRes.value, 'BBC'));
    }
    if (ajRes.status === 'fulfilled' && ajRes.value) {
      coletadas.push(...this.extrairRss(ajRes.value, 'Al Jazeera'));
    }
    if (gdeltRes.status === 'fulfilled' && Array.isArray(gdeltRes.value?.articles)) {
      gdeltRes.value.articles.forEach((a) => {
        const titulo = (a.title || '').trim();
        if (titulo && ehCrise(titulo)) {
          const dom = (a.domain || 'Reuters').replace(/^www\./, '');
          const fonte = dom.includes('reuters') ? 'Reuters' : dom.includes('apnews') ? 'AP' : dom;
          coletadas.push({ f: fonte, t: titulo, ts: Date.now() });
        }
      });
    }

    coletadas.sort((a, b) => b.ts - a.ts);
    let novas = 0;

    coletadas.forEach((m) => {
      const chave = U.normalizar(m.t).slice(0, 70);
      if (!this.e.vistas.has(chave)) {
        this.e.vistas.add(chave);
        novas++;
        this.e.lista.unshift(m);
        this.logar(`[${m.f}] ${m.t}`, 'alerta', m.ts);
      }
    });

    this.e.lista = this.e.lista.slice(0, 30);
    this.e.total24 = Math.max(this.e.lista.length, coletadas.length);

    if (novas > 0) Caos.registrar(novas);
    else this.logar('Nenhuma nova manchete de crise neste ciclo');
  },

  metrica() { return this.e.total24; },
  principal() {
    if (!this.carregado) return { texto: '—', nivel: 'ok' };
    const n = this.e.total24;
    return { texto: U.num(n), nivel: n >= 30 ? 'crit' : n >= 15 ? 'warn' : 'ok' };
  },
  contexto() {
    if (!this.carregado) return 'sincronizando agências internacionais…';
    return 'manchetes de crise nas últimas 24h · BBC, Al Jazeera, Reuters/AP';
  },
  montarViz() { /* lista */ },
  renderViz(el) {
    if (this.e.lista.length === 0) {
      el.replaceChildren(h('li', 'vazio', 'nenhuma manchete de crise no momento'));
      return;
    }
    el.replaceChildren(...this.e.lista.map((m) => {
      const li = h('li');
      li.append(h('span', 'fonte-tag', m.f), h('span', 'nome', m.t), h('span', 'hora', U.hora(m.ts).slice(0, 5)));
      return li;
    }));
  },
  eventosIniciais() { return this.e.total24; }
});

/* ===== 08 · PALAVRAS-CHAVE NOTÓRIAS — GDELT Project — 15 min ========= */
const TERMOS_MONITORADOS = [
  { t: 'ataque terrorista', q: '("terrorist attack" OR "ataque terrorista")' },
  { t: 'guerra', q: '(war OR guerra)' },
  { t: 'colapso', q: '(collapse OR colapso)' },
  { t: 'crise', q: '(crisis OR crise)' },
  { t: 'catástrofe', q: '(catastrophe OR "catástrofe")' },
  { t: 'pandemia', q: '(pandemic OR pandemia)' },
  { t: 'golpe de estado', q: '("coup" OR "golpe de estado")' }
];

const palavras = criarSensor({
  id: 'palavras', num: '08', titulo: 'PALAVRAS-CHAVE NOTÓRIAS', fonte: 'GDELT Project', freq: 900,
  e: { termos: [], ultimoTotal: 0 },

  async atualizar() {
    const resultados = await Promise.all(TERMOS_MONITORADOS.map(async (item) => {
      try {
        const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(item.q)}&mode=timelinevolraw&timespan=48h&format=json`;
        const dados = await fetchSeguro(url, 'json', 10000);
        const serie = dados?.timeline?.[0]?.data || [];
        const meio = Math.floor(serie.length / 2);

        let ontem = 0;
        let hoje = 0;
        serie.forEach((pt, idx) => {
          const val = Number(pt?.value) || 0;
          if (idx < meio) ontem += val;
          else hoje += val;
        });

        return { t: item.t, hoje: Math.round(hoje), ontem: Math.round(ontem) };
      } catch (_) {
        const prev = this.e.termos.find((x) => x.t === item.t);
        return prev || { t: item.t, hoje: 0, ontem: 0 };
      }
    }));

    const totalAnterior = this.e.ultimoTotal;
    this.e.termos = resultados;
    const totalAtual = this.total();
    this.e.ultimoTotal = totalAtual;

    if (totalAnterior > 0 && totalAtual > totalAnterior) {
      Caos.registrar(totalAtual - totalAnterior);
    }

    const top = this.maiorAlta();
    this.logar(
      top ? `Maior alta: "${top.t}" (${this.fmtVar(top)})` : 'Monitoramento de 48h sincronizado',
      top && this.variacao(top) >= 40 ? 'alerta' : ''
    );
  },

  variacao(x) {
    if (x.ontem === 0) return x.hoje > 0 ? Infinity : 0;
    return ((x.hoje - x.ontem) / x.ontem) * 100;
  },
  fmtVar(x) {
    const v = this.variacao(x);
    return v === Infinity ? 'novo' : `${U.sinal(v, 0)}%`;
  },
  maiorAlta() {
    const candidatos = this.e.termos.filter((x) => x.hoje >= 5);
    if (candidatos.length === 0) return null;
    return candidatos.sort((a, b) => this.variacao(b) - this.variacao(a))[0];
  },
  total() { return this.e.termos.reduce((s, x) => s + x.hoje, 0); },
  metrica() { return this.total(); },
  principal() {
    if (!this.carregado) return { texto: '—', nivel: 'ok' };
    const top = this.maiorAlta();
    const v = top ? this.variacao(top) : 0;
    return { texto: U.num(this.total()), nivel: v >= 100 ? 'crit' : v >= 40 ? 'warn' : 'ok' };
  },
  contexto() {
    if (!this.carregado) return 'indexando menções globais GDELT…';
    const top = this.maiorAlta();
    return top ? `menções em 24h · maior alta: "${top.t}" (${this.fmtVar(top)} vs. ontem)` : 'menções em 24h · sem altas relevantes';
  },
  montarViz() { /* lista */ },
  renderViz(el) {
    el.replaceChildren(...this.e.termos.map((x) => {
      const v = this.variacao(x);
      const li = h('li');
      li.append(
        h('span', 'nome', x.t),
        h('span', 'val', U.num(x.hoje)),
        h('span', 'val ' + (v >= 100 ? 'verm' : v >= 40 ? 'amb' : 'suave'), this.fmtVar(x))
      );
      return li;
    }));
  },
  eventosIniciais() { return this.total(); }
});

// Ordem dos cards no painel
const SENSORES = [aviacao, microtremores, incendios, temperaturas, anomalias, ar, manchetes, palavras];
const SENSOR_POR_ID = Object.fromEntries(SENSORES.map((s) => [s.id, s]));

/* ---------------------------------------------------------------------
   7. INTERFACE E SISMÓGRAFO
   --------------------------------------------------------------------- */
const estado = { ultima: Date.now(), rota: null };
const NIVEIS = { ok: 'normal', warn: 'atenção', crit: 'crítico' };

const Sismografo = {
  n: 240,
  amostras: [],
  energia: 0,
  linha: null,
  caixa: null,

  iniciar() {
    const el = document.getElementById('sismo');
    this.linha = el.querySelector('polyline');
    this.caixa = document.getElementById('sismografo');
    this.amostras = Array.from({ length: this.n }, () => (Math.random() * 2 - 1) * 0.05);
    this.desenhar();
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    setInterval(() => this.passo(), 50);
  },

  pico(n) {
    this.energia = Math.min(1, this.energia + 0.35 + Math.log10(n + 1) * 0.25);
  },

  passo() {
    const anterior = this.amostras[this.amostras.length - 1];
    const ruido = (Math.random() * 2 - 1) * (0.04 + this.energia);
    this.amostras.push(anterior * 0.5 + ruido * 0.5 * 2);
    this.amostras.shift();
    this.energia = this.energia < 0.01 ? 0 : this.energia * 0.96;
    this.caixa.classList.toggle('agitado', this.energia > 0.25);
    this.desenhar();
  },

  desenhar() {
    const passoX = 1000 / (this.n - 1);
    this.linha.setAttribute('points',
      this.amostras.map((v, i) => `${(i * passoX).toFixed(1)},${(50 - U.clamp(v, -1, 1) * 46).toFixed(1)}`).join(' '));
  }
};

function relogio() {
  const d = new Date();
  const dia = d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' }).replace(/\./g, '');
  document.getElementById('relogio').textContent = `${dia} ${d.toLocaleTimeString('pt-BR')}`;
}

const UI = {
  cards: {},

  montar() {
    SENSORES.forEach((s) => {
      const raiz = document.querySelector(`[data-sensor="${s.id}"]`);
      const campo = (nome) => raiz.querySelector(`[data-campo="${nome}"]`);
      const pe = raiz.querySelector('.card-pe');

      const nivel = h('span', 'nivel', NIVEIS.ok);
      pe.insertBefore(nivel, pe.firstChild);

      const ciclo = h('div', 'ciclo');
      const preench = h('i');
      ciclo.appendChild(preench);
      raiz.insertBefore(ciclo, pe);

      this.cards[s.id] = {
        raiz,
        valor: campo('valor'),
        contexto: campo('contexto'),
        viz: campo('viz'),
        tempo: campo('tempo'),
        nivel,
        ciclo: preench,
        pAnt: 0
      };
      s.montarViz(this.cards[s.id].viz);
    });
  },

  renderCard(s, animar) {
    const c = this.cards[s.id];
    const p = s.principal();
    c.valor.textContent = p.texto;
    c.raiz.dataset.nivel = p.nivel;
    c.nivel.textContent = NIVEIS[p.nivel];
    c.contexto.textContent = s.contexto();
    s.renderViz(c.viz);
    this.renderTempo(s);
    if (animar) {
      c.valor.classList.remove('pulsou');
      void c.valor.offsetWidth;
      c.valor.classList.add('pulsou');
    }
  },

  renderTempo(s) {
    this.cards[s.id].tempo.textContent = s.ultima ? 'atualizado ' + U.relativo(s.ultima) : 'sincronizando…';
  },
  renderTempos() { SENSORES.forEach((s) => this.renderTempo(s)); },

  renderCiclos() {
    const agora = Date.now();
    SENSORES.forEach((s) => {
      const c = this.cards[s.id];
      if (!s.proximo || !s.intervaloMs) return;
      const p = U.clamp(1 - (s.proximo - agora) / s.intervaloMs, 0, 1);
      c.ciclo.style.transition = p < c.pAnt ? 'none' : '';
      c.ciclo.style.width = (p * 100).toFixed(1) + '%';
      c.pAnt = p;
    });
  },

  renderRodape() {
    const data = new Date(estado.ultima).toLocaleString('pt-BR', {
      weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
    document.getElementById('ultima').textContent = 'Última atualização geral: ' + data;
  }
};

// Página de detalhe de um sensor
const Detalhe = {
  render(s) {
    const p = s.principal();
    const raiz = document.getElementById('detalhe');
    raiz.dataset.nivel = p.nivel;
    document.getElementById('det-num').textContent = s.num;
    document.getElementById('det-titulo').textContent = s.titulo;
    document.getElementById('det-fonte').textContent = s.fonte;
    document.getElementById('det-freq').textContent = `a cada ${U.freq(s.freq)}`;
    document.getElementById('det-ultima').textContent = s.ultima ? `${U.hora(s.ultima)} (${U.relativo(s.ultima)})` : 'sincronizando…';
    document.getElementById('det-valor').textContent = p.texto;
    document.getElementById('det-contexto').textContent = s.contexto();
    this.grafico(document.getElementById('det-grafico'), s.historico);

    const log = document.getElementById('det-log');
    log.replaceChildren(...s.log.map((l) => {
      const li = h('li', l.nivel);
      li.append(h('span', 'hora', U.hora(l.ts)), h('span', 'nome texto', l.texto));
      return li;
    }));
  },

  grafico(el, dados) {
    el.replaceChildren();
    const W = 600, H = 160, P = 26;
    if (dados.length < 2) {
      const t = svg('text', { x: W / 2, y: H / 2, 'text-anchor': 'middle' });
      t.textContent = 'aguardando mais leituras em tempo real…';
      el.appendChild(t);
      return;
    }
    const min = Math.min(...dados);
    const max = Math.max(...dados);
    const faixa = (max - min) || 1;
    const fmt = (v) => (Number.isInteger(v) ? U.num(v) : U.dec(v, 1));
    const pts = dados.map((v, i) => [
      P + i * (W - 2 * P) / (dados.length - 1),
      H - P - (v - min) / faixa * (H - 2 * P)
    ]);
    el.appendChild(svg('line', { class: 'grade', x1: P, y1: P, x2: W - P, y2: P }));
    el.appendChild(svg('line', { class: 'grade', x1: P, y1: H - P, x2: W - P, y2: H - P }));
    el.appendChild(svg('polyline', { class: 'linha', points: pts.map((q) => q.join(',')).join(' ') }));
    const ultimo = pts[pts.length - 1];
    el.appendChild(svg('circle', { class: 'ponto-final', cx: ultimo[0], cy: ultimo[1], r: 3.5 }));
    const tMax = svg('text', { x: P, y: P - 8 });
    tMax.textContent = 'máx ' + fmt(max);
    const tMin = svg('text', { x: P, y: H - P + 16 });
    tMin.textContent = 'mín ' + fmt(min);
    el.append(tMax, tMin);
  }
};

/* ---------------------------------------------------------------------
   8. AGENDADOR EM TEMPO REAL E ROTEADOR
   --------------------------------------------------------------------- */
async function executar(s, animar = true) {
  if (s.ocupado) return;
  s.ocupado = true;
  try {
    await s.atualizar();
    s.carregado = true;
    s.registrarHistorico();
    s.ultima = Date.now();
    estado.ultima = s.ultima;
    UI.renderCard(s, animar);
    UI.renderRodape();
    if (estado.rota === s.id) Detalhe.render(s);
  } catch (err) {
    s.logar(`Falha temporária na leitura (${err?.message || 'rede'})`);
    if (estado.rota === s.id) Detalhe.render(s);
  } finally {
    s.proximo = Date.now() + s.intervaloMs;
    s.ocupado = false;
  }
}

const Agendador = {
  timers: [],

  iniciar() {
    this.parar();
    SENSORES.forEach((s) => {
      const ms = s.freq * 1000;
      s.intervaloMs = ms;
      s.proximo = Date.now() + ms;
      this.timers.push(setInterval(() => executar(s, true), ms));
    });
  },

  parar() {
    this.timers.forEach(clearInterval);
    this.timers = [];
  }
};

function rotear() {
  const m = location.hash.match(/^#\/sensor\/([a-z]+)$/);
  const s = m ? SENSOR_POR_ID[m[1]] : null;
  const home = document.getElementById('vista-home');
  const detalhe = document.getElementById('vista-detalhe');
  if (s) {
    estado.rota = s.id;
    home.hidden = true;
    detalhe.hidden = false;
    Detalhe.render(s);
    window.scrollTo(0, 0);
  } else {
    estado.rota = null;
    detalhe.hidden = true;
    home.hidden = false;
  }
}

/* ---------------------------------------------------------------------
   9. INICIALIZAÇÃO
   --------------------------------------------------------------------- */
async function iniciar() {
  UI.montar();
  SENSORES.forEach((s) => UI.renderCard(s, false));
  Sismografo.iniciar();
  relogio();
  Visitantes.iniciar();

  Agendador.iniciar();

  setInterval(() => {
    UI.renderTempos();
    UI.renderCiclos();
    relogio();
    if (estado.rota) {
      const s = SENSOR_POR_ID[estado.rota];
      document.getElementById('det-ultima').textContent = s.ultima
        ? `${U.hora(s.ultima)} (${U.relativo(s.ultima)})`
        : 'sincronizando…';
    }
  }, 1000);

  window.addEventListener('hashchange', rotear);
  rotear();

  await Promise.allSettled(SENSORES.map((s) => executar(s, false)));
  Caos.iniciar(SENSORES.reduce((soma, s) => soma + s.eventosIniciais(), 0));
}

document.addEventListener('DOMContentLoaded', iniciar);
