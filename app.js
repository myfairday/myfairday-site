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
   2. UTILITÁRIOS E REDE (com fallback automático de CORS sem chave)
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
async function fetchSeguro(url, tipo = 'json', timeoutMs = 15000) {
  const tentar = async (targetUrl, unwrapAllOrigins = false) => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(targetUrl, { signal: ctrl.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      if (unwrapAllOrigins) {
        const wrapper = await res.json();
        if (!wrapper || typeof wrapper.contents !== 'string') throw new Error('Resposta inválida');
        return tipo === 'text' ? wrapper.contents : JSON.parse(wrapper.contents);
      }
      return tipo === 'text' ? await res.text() : await res.json();
    } finally {
      clearTimeout(timer);
    }
  };

  // 1. Direto (funciona para APIs com CORS aberto: USGS, NASA, Open-Meteo, GDELT, Manifold)
  try {
    return await tentar(url, false);
  } catch (_) { /* segue para os relays CORS */ }

  // 2. Relay CORS.lol (gratuito, suporta até 10 MB — ideal para OpenSky)
  try {
    return await tentar(`https://api.cors.lol/?url=${encodeURIComponent(url)}`, false);
  } catch (_) { /* próximo relay */ }

  // 3. Relay CodeTabs
  try {
    return await tentar(`https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`, false);
  } catch (_) { /* próximo relay */ }

  // 4. Relay AllOrigins (/get encapsula em JSON e lida melhor com respostas comprimidas)
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
   6. OS 9 SENSORES EM TEMPO REAL
   --------------------------------------------------------------------- */

/* ===== 01 · AVIÕES NO AR — OpenSky Network / ADSB.fi — 30 s ============ */
const aviacao = criarSensor({
  id: 'aviacao', num: '01', titulo: 'AVIÕES NO AR', fonte: 'OpenSky Network', freq: 30,
  e: { total: 0, desvios: [], pontos: [], vistosDesvios: new Set() },

  async atualizar() {
    let total = 0;
    const desvios = [];
    const pontos = [];

    try {
      const dados = await fetchSeguro('https://opensky-network.org/api/states/all', 'json', 18000);
      const states = Array.isArray(dados?.states) ? dados.states : [];
      if (states.length === 0) throw new Error('Sem estados retornados');

      const noAr = states.filter((s) => s && s[8] === false);
      total = noAr.length;

      for (let i = 0; i < noAr.length; i++) {
        const s = noAr[i];
        const callsign = (s[1] || s[0] || 'N/A').trim();
        const lon = Number(s[5]);
        const lat = Number(s[6]);
        const vRate = Number(s[11]) || 0;
        const squawk = String(s[14] || '');

        let motivo = '';
        if (squawk === '7700') motivo = 'Squawk 7700 (emergência geral)';
        else if (squawk === '7600') motivo = 'Squawk 7600 (falha de comunicação)';
        else if (squawk === '7500') motivo = 'Squawk 7500 (interferência ilícita)';
        else if (Math.abs(vRate) > 32) motivo = `Variação vertical brusca (${U.sinal(vRate, 0)} m/s)`;

        if (motivo) {
          desvios.push({ id: `${callsign}-${motivo}`, indicativo: callsign, motivo, lon, lat });
        }
      }

      const passo = Math.max(1, Math.floor(noAr.length / 55));
      for (let i = 0; i < noAr.length && pontos.length < 55; i += passo) {
        const s = noAr[i];
        if (typeof s[5] === 'number' && typeof s[6] === 'number') {
          pontos.push({ lon: s[5], lat: s[6], hot: false });
        }
      }
      desvios.slice(0, 8).forEach((d) => {
        if (!Number.isNaN(d.lon) && !Number.isNaN(d.lat)) {
          pontos.push({ lon: d.lon, lat: d.lat, hot: true });
        }
      });
      this.fonte = 'OpenSky Network';
    } catch (_) {
      // Fallback via rede aberta ADSB.fi / ADSB.lol (payload leve)
      let dados;
      try {
        dados = await fetchSeguro('https://opendata.adsb.fi/api/v2/mil', 'json', 12000);
        this.fonte = 'ADSB.fi (Rede Aberta)';
      } catch (__) {
        dados = await fetchSeguro('https://api.adsb.lol/v2/mil', 'json', 12000);
        this.fonte = 'ADSB.lol (Rede Aberta)';
      }

      const ac = Array.isArray(dados?.ac) ? dados.ac : [];
      total = ac.length;
      ac.forEach((a) => {
        const sq = String(a.squawk || '');
        const call = (a.flight || a.hex || 'N/A').trim();
        if (sq === '7700' || sq === '7600' || sq === '7500') {
          desvios.push({ id: `${call}-${sq}`, indicativo: call, motivo: `Squawk ${sq}`, lon: a.lon, lat: a.lat });
        }
        if (typeof a.lon === 'number' && typeof a.lat === 'number' && pontos.length < 55) {
          pontos.push({ lon: a.lon, lat: a.lat, hot: sq === '7700' });
        }
      });
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
    else this.logar(`${U.num(total)} aeronaves rastreadas em tempo real`);
  },

  metrica() { return this.e.total; },
  principal() {
    if (!this.carregado) return { texto: '—', nivel: 'ok' };
    const d = this.e.desvios.length;
    return { texto: U.num(this.e.total), nivel: d >= 5 ? 'crit' : d >= 2 ? 'warn' : 'ok' };
  },
  contexto() {
    if (!this.carregado) return 'conectando ao radar aéreo…';
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
      li.append(h('span', 'fonte-tag', m.f), h('span', 'nome', m.t), h('span', 'hora', U.hora(
