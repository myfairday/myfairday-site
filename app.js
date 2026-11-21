/* =====================================================================
   PAINEL DE ANOMALIAS GLOBAIS — app.js (Tempo Real · 19 Sensores · PT/EN)
   Feito por Thiago Mistery — https://www.youtube.com/@thiagomistery
   ===================================================================== */
'use strict';

/* ---------------------------------------------------------------------
   1. CONFIGURAÇÃO E INTERNACIONALIZAÇÃO (PT / EN)
   --------------------------------------------------------------------- */
const CONFIG = {
  maxHistorico: 60,
  maxLog: 40,
  limitePM25: 35,
  chaveCaos: 'painel_caos_live_v1',
  chaveHistorico: 'painel_hist_v1',
  chaveClimaBase: 'painel_clima_v1',
  chaveNasaNeo: 'painel_neo_v1',
  chaveIdioma: 'painel_idioma_v1',
  chaveVisitante: 'myfairday_vis_ok',
  chaveVisTotal: 'myfairday_vis_num'
};

let IDIOMA = 'pt';
try {
  const salvo = localStorage.getItem(CONFIG.chaveIdioma);
  if (salvo === 'en' || salvo === 'pt') IDIOMA = salvo;
} catch (_) { /* ignora */ }

const I18N = {
  pt: {
    aoVivo: 'ao vivo',
    visitantes: 'visitantes',
    tituloPrincipal: 'PAINEL DE ANOMALIAS GLOBAIS',
    lema: 'O mundo está sempre acontecendo. Você só não estava olhando.',
    verDetalhes: 'ver detalhes',
    voltar: '← VOLTAR AO PAINEL',
    fonte: 'FONTE',
    frequencia: 'FREQUÊNCIA',
    ultimaLeitura: 'ÚLTIMA LEITURA',
    historicoDado: 'HISTÓRICO DO DADO PRINCIPAL',
    registroEventos: 'REGISTRO DE EVENTOS',
    termometroCaos: 'Termômetro do Caos',
    legendaCaos: 'eventos anômalos detectados · só cresce',
    ultimaGeral: 'Última atualização geral: ',
    feitoPor: 'Feito por',
    atualizado: 'atualizado ',
    sincronizando: 'sincronizando…',
    aguardandoBusca: 'aguardando busca…',
    agoraMesmo: 'agora mesmo',
    aCada: 'a cada ',
    aguardandoLeituras: 'aguardando mais leituras em tempo real…',
    max: 'máx ',
    min: 'mín ',
    placeholderCidade: 'Digite uma cidade…',
    buscar: 'Buscar',
    niveis: { ok: 'normal', warn: 'atenção', crit: 'crítico' },
    sensores: {
      bolsa: 'BOLSA DE VALORES (B3)',
      microtremores: 'MICROTREMORES',
      incendios: 'FOCOS DE INCÊNDIO',
      temperaturas: 'TEMPERATURAS EXTREMAS',
      anomalias: 'ANOMALIAS CLIMÁTICAS',
      ar: 'QUALIDADE DO AR',
      manchetes: 'MANCHETES EM TEMPO REAL',
      palavras: 'PALAVRAS-CHAVE NOTÓRIAS',
      desastres: 'DESASTRES NATURAIS (ONU)',
      asteroides: 'ASTEROIDES PRÓXIMOS (NASA)',
      ciber: 'ALERTAS CIBERSEGURANÇA',
      mare: 'NÍVEL DO MAR & RESSACAS',
      uv: 'RADIAÇÃO UV EXTREMA',
      cidade: 'CLIMA POR CIDADE',
      cameras: 'CÂMERAS AO VIVO NO MUNDO',
      avioes: 'RADAR AÉREO · AIRNAV',
      trends: 'TENDÊNCIAS · GOOGLE TRENDS',
      internet: 'QUEDAS DE INTERNET (IODA)',
      rios: 'NÍVEL & VAZÃO DOS RIOS'
    }
  },
  en: {
    aoVivo: 'live',
    visitantes: 'visitors',
    tituloPrincipal: 'GLOBAL ANOMALY DASHBOARD',
    lema: 'The world is always happening. You just weren’t watching.',
    verDetalhes: 'view details',
    voltar: '← BACK TO DASHBOARD',
    fonte: 'SOURCE',
    frequencia: 'FREQUENCY',
    ultimaLeitura: 'LAST READING',
    historicoDado: 'PRIMARY METRIC HISTORY',
    registroEventos: 'EVENT LOG',
    termometroCaos: 'Chaos Thermometer',
    legendaCaos: 'anomalous events detected · only goes up',
    ultimaGeral: 'Last overall update: ',
    feitoPor: 'Created by',
    atualizado: 'updated ',
    sincronizando: 'syncing…',
    aguardandoBusca: 'waiting for search…',
    agoraMesmo: 'just now',
    aCada: 'every ',
    aguardandoLeituras: 'waiting for more real-time readings…',
    max: 'max ',
    min: 'min ',
    placeholderCidade: 'Enter a city…',
    buscar: 'Search',
    niveis: { ok: 'normal', warn: 'warning', crit: 'critical' },
    sensores: {
      bolsa: 'BRAZIL STOCK EXCHANGE (B3)',
      microtremores: 'MICROTREMORS',
      incendios: 'ACTIVE WILDFIRES',
      temperaturas: 'EXTREME TEMPERATURES',
      anomalias: 'CLIMATE ANOMALIES',
      ar: 'AIR QUALITY (PM2.5)',
      manchetes: 'BREAKING CRISIS HEADLINES',
      palavras: 'NOTABLE KEYWORDS',
      desastres: 'NATURAL DISASTERS (UN)',
      asteroides: 'NEAR-EARTH ASTEROIDS (NASA)',
      ciber: 'CYBERSECURITY ALERTS',
      mare: 'SEA LEVEL & STORM SURGES',
      uv: 'EXTREME UV RADIATION',
      cidade: 'WEATHER BY CITY',
      cameras: 'LIVE WORLD WEBCAMS',
      avioes: 'FLIGHT RADAR · AIRNAV',
      trends: 'TRENDING · GOOGLE TRENDS',
      internet: 'INTERNET OUTAGES (IODA)',
      rios: 'RIVER LEVELS & DISCHARGE'
    }
  }
};

const T = (chave) => I18N[IDIOMA][chave] ?? I18N.pt[chave] ?? chave;
const LOCALE = () => (IDIOMA === 'en' ? 'en-US' : 'pt-BR');

/* ---------------------------------------------------------------------
   2. UTILITÁRIOS E REDE (CORS-SAFE)
   --------------------------------------------------------------------- */
const NS_SVG = 'http://www.w3.org/2000/svg';

const U = {
  clamp: (v, a, b) => Math.min(b, Math.max(a, v)),
  num: (n) => Math.round(n).toLocaleString(LOCALE()),
  dec: (n, d = 1) => n.toLocaleString(LOCALE(), { minimumFractionDigits: d, maximumFractionDigits: d }),
  sinal(n, d = 1) {
    const a = Math.abs(n);
    const t = U.dec(a, d);
    if (a < 0.05 && d > 0) return t;
    return (n > 0 ? '+' : n < 0 ? '−' : '') + t;
  },
  hora: (ts) => new Date(ts).toLocaleTimeString(LOCALE(), { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
  relativo(ts) {
    if (!ts) return T('sincronizando');
    const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
    if (s < 10) return T('agoraMesmo');
    if (s < 60) return IDIOMA === 'en' ? `${s}s ago` : `há ${s} s`;
    const m = Math.floor(s / 60);
    if (m < 60) return IDIOMA === 'en' ? `${m}m ago` : `há ${m} min`;
    const hr = Math.floor(m / 60);
    return IDIOMA === 'en' ? `${hr}h ago` : `há ${hr} h`;
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

function registrarUnico(set, chave) {
  if (!chave || set.has(chave)) return false;
  if (set.size > 1500) {
    const primeiro = set.values().next().value;
    set.delete(primeiro);
  }
  set.add(chave);
  return true;
}

async function fetchSeguro(url, tipo = 'json', timeoutMs = 11000) {
  const tentar = async (targetUrl, unwrapAllOrigins = false) => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(targetUrl, { signal: ctrl.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      if (unwrapAllOrigins) {
        const wrapper = await res.json();
        if (!wrapper || typeof wrapper.contents !== 'string') throw new Error('Empty response');
        return tipo === 'text' ? wrapper.contents : JSON.parse(wrapper.contents);
      }
      return tipo === 'text' ? await res.text() : await res.json();
    } finally {
      clearTimeout(timer);
    }
  };

  try {
    return await tentar(url, false);
  } catch (_) {
    try {
      return await tentar(`https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`, false);
    } catch (__) {
      return await tentar(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`, true);
    }
  }
}

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
   3. CONTADOR DE VISITANTES ÚNICOS
   --------------------------------------------------------------------- */
const Visitantes = {
  total: 0,

  atualizarTexto() {
    const el = document.getElementById('visitantes');
    if (!el) return;
    el.textContent = this.total > 0 ? `${T('visitantes')}: ${U.num(this.total)}` : `${T('visitantes')}: —`;
  },

  async iniciar() {
    let jaContado = false;
    let cache = 0;
    try {
      jaContado = localStorage.getItem(CONFIG.chaveVisitante) === '1';
      cache = parseInt(localStorage.getItem(CONFIG.chaveVisTotal), 10) || 0;
    } catch (_) { /* ignora */ }

    if (cache > 0) {
      this.total = cache;
      this.atualizarTexto();
    }

    if (jaContado) {
      if (cache === 0) {
        try {
          const data = await fetchSeguro('https://api.counterapi.dev/v1/myfairday-org/visitas', 'json', 6000);
          this.total = Number(data?.count) || 1;
          localStorage.setItem(CONFIG.chaveVisTotal, String(this.total));
        } catch (_) {
          this.total = 1;
        }
        this.atualizarTexto();
      }
      return;
    }

    try {
      const data = await fetchSeguro('https://api.counterapi.dev/v1/myfairday-org/visitas/up', 'json', 7000);
      this.total = Number(data?.count) || (cache + 1);
      try {
        localStorage.setItem(CONFIG.chaveVisitante, '1');
        localStorage.setItem(CONFIG.chaveVisTotal, String(this.total));
      } catch (_) { /* ignora */ }
    } catch (_) {
      this.total = cache + 1;
      try {
        localStorage.setItem(CONFIG.chaveVisitante, '1');
        localStorage.setItem(CONFIG.chaveVisTotal, String(this.total));
      } catch (__) { /* ignora */ }
    }
    this.atualizarTexto();
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
  nomeExibicao() {
    return I18N[IDIOMA].sensores[this.id] || this.titulo;
  },
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
    carregado: false,
    erroMsg: ''
  }, Base, def);
}

/* ---------------------------------------------------------------------
   6. OS 19 SENSORES EM TEMPO REAL
   --------------------------------------------------------------------- */

/* ===== 01 · BOLSA DE VALORES (B3) — Brapi & AwesomeAPI — 1 min ======== */
const NOMES_B3 = {
  PETR4: 'Petrobras PN',
  VALE3: 'Vale ON',
  ITUB4: 'Itaú Unibanco PN',
  MGLU3: 'Magazine Luiza ON'
};

const bolsa = criarSensor({
  id: 'bolsa', num: '01', titulo: 'BOLSA DE VALORES (B3)', fonte: 'B3 · Brapi & AwesomeAPI', freq: 60,
  e: { ativos: [], mediaB3: 0, alertados: new Set() },

  async buscarAcoesB3() {
    try {
      const lote = await fetchSeguro('https://brapi.dev/api/quote/PETR4,VALE3,ITUB4,MGLU3', 'json', 9000);
      if (Array.isArray(lote?.results) && lote.results.length > 0) return lote.results;
    } catch (_) { /* fallback individual */ }

    const tickers = ['PETR4', 'VALE3', 'ITUB4', 'MGLU3'];
    const res = await Promise.allSettled(
      tickers.map((t) => fetchSeguro(`https://brapi.dev/api/quote/${t}`, 'json', 9000))
    );
    const lista = [];
    res.forEach((r) => {
      if (r.status === 'fulfilled' && Array.isArray(r.value?.results) && r.value.results[0]) {
        lista.push(r.value.results[0]);
      }
    });
    return lista;
  },

  async atualizar() {
    const [acoesRes, cambioRes] = await Promise.allSettled([
      this.buscarAcoesB3(),
      fetchSeguro('https://economia.awesomeapi.com.br/last/USD-BRL,EUR-BRL,BTC-BRL', 'json', 10000)
    ]);

    const ativos = [];
    const varsB3 = [];

    if (acoesRes.status === 'fulfilled' && Array.isArray(acoesRes.value)) {
      acoesRes.value.forEach((item) => {
        const ticker = item.symbol || '';
        const preco = Number(item.regularMarketPrice);
        const variacao = Number(item.regularMarketChangePercent);
        if (!ticker || Number.isNaN(preco)) return;

        const v = Number.isNaN(variacao) ? 0 : variacao;
        varsB3.push(v);
        ativos.push({
          codigo: ticker,
          nome: `${ticker} · ${NOMES_B3[ticker] || item.shortName || ticker}`,
          preco: `R$ ${U.dec(preco, 2)}`,
          variacao: v
        });
      });
    }

    if (cambioRes.status === 'fulfilled' && cambioRes.value) {
      const c = cambioRes.value;
      const moedas = [
        { key: 'USDBRL', codigo: 'USD/BRL', nomePt: 'Dólar Comercial', nomeEn: 'US Dollar', dec: 2 },
        { key: 'EURBRL', codigo: 'EUR/BRL', nomePt: 'Euro Comercial', nomeEn: 'Euro', dec: 2 },
        { key: 'BTCBRL', codigo: 'BTC/BRL', nomePt: 'Bitcoin Brasil', nomeEn: 'Bitcoin BRL', dec: 0 }
      ];
      moedas.forEach((m) => {
        const reg = c[m.key];
        if (!reg) return;
        const preco = Number(reg.bid);
        const variacao = Number(reg.pctChange);
        if (Number.isNaN(preco)) return;
        ativos.push({
          codigo: m.codigo,
          nomePt: `${m.codigo} · ${m.nomePt}`,
          nomeEn: `${m.codigo} · ${m.nomeEn}`,
          nome: `${m.codigo} · ${m.nomePt}`,
          preco: `R$ ${m.dec === 0 ? U.num(preco) : U.dec(preco, m.dec)}`,
          variacao: Number.isNaN(variacao) ? 0 : variacao
        });
      });
    }

    if (ativos.length === 0) throw new Error('Market unavailable');

    this.e.ativos = ativos;
    this.e.mediaB3 = varsB3.length > 0
      ? varsB3.reduce((s, v) => s + v, 0) / varsB3.length
      : ativos[0].variacao;

    const maiorOsc = [...ativos].sort((a, b) => Math.abs(b.variacao) - Math.abs(a.variacao))[0];
    if (maiorOsc) {
      const grave = Math.abs(maiorOsc.variacao) >= 3;
      this.logar(
        `B3: ${U.sinal(this.e.mediaB3, 2)}% · ${maiorOsc.codigo} (${maiorOsc.preco}, ${U.sinal(maiorOsc.variacao, 2)}%)`,
        grave ? 'alerta' : ''
      );

      const chaveChoque = `${maiorOsc.codigo}-${new Date().toISOString().slice(0, 10)}`;
      if (Math.abs(maiorOsc.variacao) >= 5 && registrarUnico(this.e.alertados, chaveChoque)) {
        Caos.registrar(1);
      }
    }
  },

  destaque() {
    if (this.e.ativos.length === 0) return null;
    return [...this.e.ativos].sort((a, b) => Math.abs(b.variacao) - Math.abs(a.variacao))[0];
  },
  metrica() { return Number(this.e.mediaB3.toFixed(2)); },
  principal() {
    if (!this.carregado || this.e.ativos.length === 0) return { texto: '—', nivel: 'ok' };
    const abs = Math.abs(this.e.mediaB3);
    return { texto: `${U.sinal(this.e.mediaB3, 2)}%`, nivel: abs >= 4 ? 'crit' : abs >= 2 ? 'warn' : 'ok' };
  },
  contexto() {
    if (!this.carregado || this.e.ativos.length === 0) {
      return IDIOMA === 'en' ? 'fetching B3 quotes & FX…' : 'consultando pregão B3 e câmbio…';
    }
    const d = this.destaque();
    return IDIOMA === 'en'
      ? `avg B3 blue chips · top mover: ${d.codigo} (${U.sinal(d.variacao, 2)}%)`
      : `variação média blue chips B3 · maior oscilação: ${d.codigo} (${U.sinal(d.variacao, 2)}%)`;
  },
  montarViz() {},
  renderViz(el) {
    if (this.e.ativos.length === 0) {
      el.replaceChildren(h('li', 'vazio', IDIOMA === 'en' ? 'waiting for quotes…' : 'aguardando cotações…'));
      return;
    }
    el.replaceChildren(...this.e.ativos.map((a) => {
      const abs = Math.abs(a.variacao);
      const cor = abs >= 4 ? 'verm' : abs >= 2 ? 'amb' : 'suave';
      const label = IDIOMA === 'en' && a.nomeEn ? a.nomeEn : a.nome;
      const li = h('li');
      li.append(
        h('span', 'nome', label),
        h('span', 'val', a.preco),
        h('span', 'val ' + cor, `${U.sinal(a.variacao, 2)}%`)
      );
      return li;
    }));
  },
  eventosIniciais() { return 0; }
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
      if (registrarUnico(this.e.vistosIds, f.id)) {
        novos++;
        const mag = Number(f.properties?.mag) || 2.0;
        const local = f.properties?.place || 'Unknown location';
        this.logar(`M${U.dec(mag)} · ${local}`, mag >= 2.7 ? 'alerta' : '', f.properties?.time || agora);
      }
    });

    if (novos > 0) Caos.registrar(novos);
    else this.logar(IDIOMA === 'en' ? 'No new microtremors in this cycle' : 'Nenhum novo microtremor neste ciclo');
  },

  maior() { return this.e.mags.length ? Math.max(...this.e.mags) : 0; },
  metrica() { return this.e.mags.length; },
  principal() {
    if (!this.carregado) return { texto: '—', nivel: 'ok' };
    const n = this.e.mags.length;
    return { texto: U.num(n), nivel: n >= 40 ? 'crit' : n >= 20 ? 'warn' : 'ok' };
  },
  contexto() {
    if (!this.carregado) return IDIOMA === 'en' ? 'querying USGS seismographs…' : 'consultando sismógrafos USGS…';
    const m = this.maior();
    return IDIOMA === 'en'
      ? `magnitude 2.0–3.0 in last 24h · ${m ? 'max: M' + U.dec(m) : 'none'} · bars = per 2h`
      : `magnitude 2,0–3,0 nas últimas 24h · ${m ? 'maior: M' + U.dec(m) : 'nenhum registro'} · barras = por 2h`;
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
    if (!this.barras) return;
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

      if (registrarUnico(this.e.vistosIds, ev.id)) {
        novos++;
        this.logar(ev.title || 'Active wildfire detected', ehRecente ? 'alerta' : '', ts || Date.now());
      }
    });

    this.e.ativos = events.length;
    this.e.h24 = recentes;
    this.e.pontos = pontos;

    if (novos > 0) Caos.registrar(novos);
    else this.logar(`${U.num(events.length)} active wildfires tracked by NASA`);
  },

  metrica() { return this.e.ativos; },
  principal() {
    if (!this.carregado) return { texto: '—', nivel: 'ok' };
    const n = this.e.ativos;
    return { texto: U.num(n), nivel: n > 80 ? 'crit' : n > 35 ? 'warn' : 'ok' };
  },
  contexto() {
    if (!this.carregado) return IDIOMA === 'en' ? 'scanning NASA satellites…' : 'varrendo satélites NASA…';
    return IDIOMA === 'en'
      ? `active wildfire events · ${U.num(this.e.h24)} active in last 48h`
      : `eventos ativos monitorados · ${U.num(this.e.h24)} com atividade nas últimas 48h`;
  },
  montarViz() {},
  renderViz(el) { renderizarMapaReal(el, this.e.pontos); },
  eventosIniciais() { return this.e.ativos; }
});

/* ===== 04 · TEMPERATURAS EXTREMAS — Open-Meteo — 1 h ================== */
const ESTACOES_EXTREMAS = [
  { nome: 'Kuwait City, KW', lat: 29.3759, lon: 47.9774 },
  { nome: 'Ahvaz, IR', lat: 31.3183, lon: 48.6706 },
  { nome: 'Jacobabad, PK', lat: 28.2819, lon: 68.4376 },
  { nome: 'Basra, IQ', lat: 30.5085, lon: 47.7804 },
  { nome: 'Death Valley, US', lat: 36.5054, lon: -117.0794 },
  { nome: 'Marble Bar, AU', lat: -21.1756, lon: 119.7447 },
  { nome: 'Timbuktu, ML', lat: 16.7666, lon: -3.0026 },
  { nome: 'Turbat, PK', lat: 26.0031, lon: 63.0544 },
  { nome: 'Riyadh, SA', lat: 24.7136, lon: 46.6753 },
  { nome: 'Ouargla, DZ', lat: 31.9493, lon: 5.3250 },
  { nome: 'Oymyakon, RU', lat: 63.4641, lon: 142.7737 },
  { nome: 'Yakutsk, RU', lat: 62.0355, lon: 129.6755 },
  { nome: 'Verkhoyansk, RU', lat: 67.5506, lon: 133.3993 },
  { nome: 'Eureka, CA', lat: 79.9889, lon: -85.9408 },
  { nome: 'Norilsk, RU', lat: 69.3558, lon: 88.1893 },
  { nome: 'Ulaanbaatar, MN', lat: 47.8864, lon: 106.9057 },
  { nome: 'Fairbanks, US', lat: 64.8378, lon: -147.7164 },
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
      if (Number.isNaN(temp) || !ESTACOES_EXTREMAS[i]) return;
      if (temp > 45 || temp < -20) {
        extremas.push({ nome: ESTACOES_EXTREMAS[i].nome, tipo: temp > 45 ? 'q' : 'f', temp });
      }
    });

    extremas.sort((a, b) => this.severidade(b) - this.severidade(a));
    this.e.lista = extremas;

    const top = extremas[0];
    this.logar(
      extremas.length === 0
        ? 'No monitored station above 45 °C or below −20 °C'
        : `${extremas.length} extreme station(s) · peak: ${top.nome} (${U.dec(top.temp)} °C)`,
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
    if (!this.carregado) return IDIOMA === 'en' ? 'reading weather stations…' : 'lendo estações meteorológicas…';
    const q = this.e.lista.filter((c) => c.tipo === 'q').length;
    return IDIOMA === 'en'
      ? `stations > 45 °C or < −20 °C · ${q} hot / ${this.e.lista.length - q} cold`
      : `estações acima de 45 °C ou abaixo de −20 °C · ${q} quente(s) / ${this.e.lista.length - q} fria(s)`;
  },
  montarViz() {},
  renderViz(el) {
    if (this.e.lista.length === 0) {
      el.replaceChildren(h('li', 'vazio', IDIOMA === 'en' ? 'no station in extreme range now' : 'nenhuma estação em faixa extrema agora'));
      return;
    }
    el.replaceChildren(...this.e.lista.map((c) => {
      const li = h('li');
      const grave = c.tipo === 'q' ? c.temp >= 49 : c.temp <= -35;
      const tag = IDIOMA === 'en' ? (c.tipo === 'q' ? 'HEAT' : 'COLD') : (c.tipo === 'q' ? 'CALOR' : 'FRIO');
      li.append(
        h('span', 'nome', c.nome),
        h('span', 'fonte-tag', tag),
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
  { nome: 'Moscow', lat: 55.7558, lon: 37.6173 },
  { nome: 'New Delhi', lat: 28.6139, lon: 77.2090 },
  { nome: 'Cairo', lat: 30.0444, lon: 31.2357 },
  { nome: 'Sydney', lat: -33.8688, lon: 151.2093 },
  { nome: 'New York', lat: 40.7128, lon: -74.0060 },
  { nome: 'Lagos', lat: 6.5244, lon: 3.3792 },
  { nome: 'Reykjavik', lat: 64.1466, lon: -21.9426 },
  { nome: 'Beijing', lat: 39.9042, lon: 116.4074 },
  { nome: 'Mexico City', lat: 19.4326, lon: -99.1332 }
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
    } catch (_) { /* segue */ }

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
      this.logar(`Peak anomaly: ${m.nome} ${U.sinal(m.d)} °C`, Math.abs(m.d) >= 5 ? 'alerta' : '');
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
    if (!this.carregado) return IDIOMA === 'en' ? 'comparing current temp vs. 8-yr avg…' : 'comparando temperatura atual vs. média histórica…';
    const acima = this.ordenadas().filter((c) => Math.abs(c.d) >= 5).length;
    return IDIOMA === 'en'
      ? `deviation vs. historical avg · ${acima} city(ies) beyond ±5 °C · peak: ${this.maior().nome}`
      : `desvio vs. média histórica · ${acima} cidade(s) além de ±5 °C · maior: ${this.maior().nome}`;
  },
  montarViz() {},
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
  { nome: 'New Delhi', lat: 28.6139, lon: 77.2090 },
  { nome: 'Lahore', lat: 31.5204, lon: 74.3587 },
  { nome: 'Dhaka', lat: 23.8103, lon: 90.4125 },
  { nome: 'Cairo', lat: 30.0444, lon: 31.2357 },
  { nome: 'Beijing', lat: 39.9042, lon: 116.4074 },
  { nome: 'Jakarta', lat: -6.2088, lon: 106.8456 },
  { nome: 'Mexico City', lat: 19.4326, lon: -99.1332 },
  { nome: 'Lima', lat: -12.0464, lon: -77.0428 },
  { nome: 'Santiago', lat: -33.4489, lon: -70.6693 },
  { nome: 'Cape Town', lat: -33.9249, lon: 18.4241 },
  { nome: 'London', lat: 51.5074, lon: -0.1278 },
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
      this.logar(`${n} cities > ${CONFIG.limitePM25} µg/m³ · worst: ${lista[0].nome} (${U.num(lista[0].pm)})`, n >= 6 ? 'alerta' : '');
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
    if (!this.carregado) return IDIOMA === 'en' ? 'measuring PM2.5 particulate matter…' : 'medindo material particulado PM2,5…';
    return IDIOMA === 'en'
      ? `of ${CIDADES_AR.length} cities above PM2.5 threshold (${CONFIG.limitePM25} µg/m³)`
      : `de ${CIDADES_AR.length} cidades acima do limite de PM2,5 (${CONFIG.limitePM25} µg/m³)`;
  },
  montarViz() {},
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
      if (registrarUnico(this.e.vistas, chave)) {
        novas++;
        this.e.lista.unshift(m);
        this.logar(`[${m.f}] ${m.t}`, 'alerta', m.ts);
      }
    });

    this.e.lista = this.e.lista.slice(0, 30);
    this.e.total24 = Math.max(this.e.lista.length, coletadas.length);

    if (novas > 0) Caos.registrar(novas);
    else this.logar('No new crisis headlines in this cycle');
  },

  metrica() { return this.e.total24; },
  principal() {
    if (!this.carregado) return { texto: '—', nivel: 'ok' };
    const n = this.e.total24;
    return { texto: U.num(n), nivel: n >= 30 ? 'crit' : n >= 15 ? 'warn' : 'ok' };
  },
  contexto() {
    if (!this.carregado) return IDIOMA === 'en' ? 'syncing international wire agencies…' : 'sincronizando agências internacionais…';
    return IDIOMA === 'en'
      ? 'crisis headlines in last 24h · BBC, Al Jazeera, Reuters/AP'
      : 'manchetes de crise nas últimas 24h · BBC, Al Jazeera, Reuters/AP';
  },
  montarViz() {},
  renderViz(el) {
    if (this.e.lista.length === 0) {
      el.replaceChildren(h('li', 'vazio', IDIOMA === 'en' ? 'no crisis headlines right now' : 'nenhuma manchete de crise no momento'));
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
  { pt: 'ataque terrorista', en: 'terrorist attack', q: '("terrorist attack" OR "ataque terrorista")' },
  { pt: 'guerra', en: 'war', q: '(war OR guerra)' },
  { pt: 'colapso', en: 'collapse', q: '(collapse OR colapso)' },
  { pt: 'crise', en: 'crisis', q: '(crisis OR crise)' },
  { pt: 'catástrofe', en: 'catastrophe', q: '(catastrophe OR "catástrofe")' },
  { pt: 'pandemia', en: 'pandemic', q: '(pandemic OR pandemia)' },
  { pt: 'golpe de estado', en: 'coup d’état', q: '("coup" OR "golpe de estado")' }
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

        return { pt: item.pt, en: item.en, hoje: Math.round(hoje), ontem: Math.round(ontem) };
      } catch (_) {
        const prev = this.e.termos.find((x) => x.pt === item.pt);
        return prev || { pt: item.pt, en: item.en, hoje: 0, ontem: 0 };
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
      top ? `Peak surge: "${top[IDIOMA]}" (${this.fmtVar(top)})` : '48h keyword monitoring synced',
      top && this.variacao(top) >= 40 ? 'alerta' : ''
    );
  },

  variacao(x) {
    if (x.ontem === 0) return x.hoje > 0 ? Infinity : 0;
    return ((x.hoje - x.ontem) / x.ontem) * 100;
  },
  fmtVar(x) {
    const v = this.variacao(x);
    return v === Infinity ? (IDIOMA === 'en' ? 'new' : 'novo') : `${U.sinal(v, 0)}%`;
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
    if (!this.carregado) return IDIOMA === 'en' ? 'indexing global GDELT mentions…' : 'indexando menções globais GDELT…';
    const top = this.maiorAlta();
    if (!top) return IDIOMA === 'en' ? '24h mentions · no major surges' : 'menções em 24h · sem altas relevantes';
    return IDIOMA === 'en'
      ? `24h mentions · top surge: "${top.en}" (${this.fmtVar(top)} vs. yesterday)`
      : `menções em 24h · maior alta: "${top.pt}" (${this.fmtVar(top)} vs. ontem)`;
  },
  montarViz() {},
  renderViz(el) {
    el.replaceChildren(...this.e.termos.map((x) => {
      const v = this.variacao(x);
      const li = h('li');
      li.append(
        h('span', 'nome', x[IDIOMA] || x.pt),
        h('span', 'val', U.num(x.hoje)),
        h('span', 'val ' + (v >= 100 ? 'verm' : v >= 40 ? 'amb' : 'suave'), this.fmtVar(x))
      );
      return li;
    }));
  },
  eventosIniciais() { return this.total(); }
});

/* ===== 09 · DESASTRES NATURAIS (ONU / GDACS) — 30 min =================== */
const TIPO_GDACS_PT = { EQ: 'Terremoto', TC: 'Ciclone', FL: 'Inundação', VO: 'Vulcão', DR: 'Seca', WF: 'Incêndio' };
const TIPO_GDACS_EN = { EQ: 'Earthquake', TC: 'Cyclone', FL: 'Flood', VO: 'Volcano', DR: 'Drought', WF: 'Wildfire' };

const desastres = criarSensor({
  id: 'desastres', num: '09', titulo: 'DESASTRES NATURAIS (ONU)', fonte: 'UN / GDACS', freq: 1800,
  e: { lista: [], vistosIds: new Set() },

  async atualizar() {
    const eventos = [];

    try {
      const url = 'https://www.gdacs.org/gdacsapi/api/Events/geteventlist/SEARCH?alertlevel=Green;Orange;Red';
      const dados = await fetchSeguro(url, 'json', 12000);
      const feats = Array.isArray(dados?.features) ? dados.features : [];
      feats.slice(0, 25).forEach((f) => {
        const p = f.properties || {};
        const nivelRaw = String(p.alertlevel || 'Green').toLowerCase();
        const nivel = nivelRaw === 'red' ? 'Red' : nivelRaw === 'orange' ? 'Orange' : 'Green';
        const code = p.eventtype || '';
        const pais = p.country || p.name || 'Global';
        const id = String(p.eventid || `${code}-${pais}`);
        eventos.push({ id, code, pais, nivel });
      });
    } catch (_) {
      const rssUrl = 'https://api.rss2json.com/v1/api.json?rss_url=' + encodeURIComponent('https://www.gdacs.org/xml/rss.xml');
      const dados = await fetchSeguro(rssUrl, 'json', 12000);
      const items = Array.isArray(dados?.items) ? dados.items : [];
      items.slice(0, 20).forEach((it, idx) => {
        const t = (it.title || '').trim();
        if (!t) return;
        const low = t.toLowerCase();
        const nivel = low.includes('red') ? 'Red' : low.includes('orange') ? 'Orange' : 'Green';
        eventos.push({ id: it.guid || String(idx), code: '', pais: t, nivel });
      });
    }

    const peso = { Red: 3, Orange: 2, Green: 1 };
    eventos.sort((a, b) => (peso[b.nivel] || 0) - (peso[a.nivel] || 0));
    this.e.lista = eventos;

    let novosGraves = 0;
    eventos.forEach((ev) => {
      if (registrarUnico(this.e.vistosIds, ev.id)) {
        const ehGrave = ev.nivel === 'Red' || ev.nivel === 'Orange';
        if (ehGrave) novosGraves++;
        const tipo = TIPO_GDACS_PT[ev.code] || ev.code;
        this.logar(`[${ev.nivel.toUpperCase()}] ${tipo ? tipo + ' · ' : ''}${ev.pais}`, ehGrave ? 'alerta' : '');
      }
    });

    if (novosGraves > 0) Caos.registrar(novosGraves);
    else if (eventos.length > 0) this.logar(`${eventos.length} active events monitored by UN/GDACS`);
  },

  graves() { return this.e.lista.filter((x) => x.nivel === 'Red' || x.nivel === 'Orange').length; },
  metrica() { return this.e.lista.length; },
  principal() {
    if (!this.carregado) return { texto: '—', nivel: 'ok' };
    const red = this.e.lista.filter((x) => x.nivel === 'Red').length;
    const orange = this.e.lista.filter((x) => x.nivel === 'Orange').length;
    return { texto: U.num(this.e.lista.length), nivel: red >= 1 ? 'crit' : orange >= 2 ? 'warn' : 'ok' };
  },
  contexto() {
    if (!this.carregado) return IDIOMA === 'en' ? 'querying UN/GDACS global alerts…' : 'consultando alertas globais GDACS/ONU…';
    const red = this.e.lista.filter((x) => x.nivel === 'Red').length;
    const orange = this.e.lista.filter((x) => x.nivel === 'Orange').length;
    return IDIOMA === 'en'
      ? `active events · ${red} red alert(s) / ${orange} orange`
      : `eventos ativos · ${red} alerta(s) vermelho(s) / ${orange} laranja(s)`;
  },
  montarViz() {},
  renderViz(el) {
    if (this.e.lista.length === 0) {
      el.replaceChildren(h('li', 'vazio', IDIOMA === 'en' ? 'no active alerts right now' : 'nenhum alerta ativo no momento'));
      return;
    }
    const mapaTipo = IDIOMA === 'en' ? TIPO_GDACS_EN : TIPO_GDACS_PT;
    el.replaceChildren(...this.e.lista.map((ev) => {
      const cor = ev.nivel === 'Red' ? 'vermelho' : ev.nivel === 'Orange' ? 'ambar' : 'verde';
      const tag = IDIOMA === 'en'
        ? (ev.nivel === 'Red' ? 'RED' : ev.nivel === 'Orange' ? 'ORANGE' : 'GREEN')
        : (ev.nivel === 'Red' ? 'VERMELHO' : ev.nivel === 'Orange' ? 'LARANJA' : 'VERDE');
      const valCor = ev.nivel === 'Red' ? 'verm' : ev.nivel === 'Orange' ? 'amb' : 'suave';
      const tipo = mapaTipo[ev.code] || ev.code;
      const titulo = tipo ? `${tipo} · ${ev.pais}` : ev.pais;
      const li = h('li');
      li.append(
        h('span', 'ponto-cor ' + cor),
        h('span', 'nome', titulo),
        h('span', 'val ' + valCor, tag)
      );
      return li;
    }));
  },
  eventosIniciais() { return this.graves(); }
});

/* ===== 10 · ASTEROIDES PRÓXIMOS (NASA NeoWs / JPL) — 1 h ============== */
const asteroides = criarSensor({
  id: 'asteroides', num: '10', titulo: 'ASTEROIDES PRÓXIMOS (NASA)', fonte: 'NASA NeoWs / JPL', freq: 3600,
  e: { lista: [], vistosIds: new Set() },

  async atualizar() {
    const hoje = new Date().toISOString().slice(0, 10);
    let objetos = [];

    try {
      const cache = JSON.parse(localStorage.getItem(CONFIG.chaveNasaNeo) || '{}');
      if (cache.data === hoje && Array.isArray(cache.objetos) && cache.objetos.length > 0) {
        objetos = cache.objetos;
      }
    } catch (_) { /* segue */ }

    if (objetos.length === 0) {
      try {
        const url = `https://api.nasa.gov/neo/rest/v1/feed?start_date=${hoje}&end_date=${hoje}&api_key=DEMO_KEY`;
        const dados = await fetchSeguro(url, 'json', 12000);
        const brutos = dados?.near_earth_objects?.[hoje] || [];
        objetos = brutos.map((o) => {
          const aproach = o.close_approach_data?.[0] || {};
          const distLunar = Number(aproach.miss_distance?.lunar) || 99;
          const velKmh = Number(aproach.relative_velocity?.kilometers_per_hour) || 0;
          return {
            id: String(o.id || o.name),
            nome: String(o.name || '').replace(/[()]/g, '').trim(),
            perigoso: Boolean(o.is_potentially_hazardous_asteroid),
            distLunar,
            velKmh
          };
        });
      } catch (_) {
        const amanha = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
        const urlJpl = `https://ssd-api.jpl.nasa.gov/cad.api?dist-max=0.05&date-min=${hoje}&date-max=${amanha}`;
        const dados = await fetchSeguro(urlJpl, 'json', 12000);
        const rows = Array.isArray(dados?.data) ? dados.data : [];
        objetos = rows.map((r) => {
          const distAU = Number(r[4]) || 0.05;
          const distLunar = distAU * 389.17;
          const velKmh = (Number(r[7]) || 0) * 3600;
          return {
            id: String(r[0]),
            nome: String(r[0]),
            perigoso: distLunar < 10,
            distLunar,
            velKmh
          };
        });
      }

      if (objetos.length > 0) {
        try {
          localStorage.setItem(CONFIG.chaveNasaNeo, JSON.stringify({ data: hoje, objetos }));
        } catch (_) { /* ignora */ }
      }
    }

    objetos.sort((a, b) => a.distLunar - b.distLunar);
    this.e.lista = objetos;

    let novosPerigosos = 0;
    objetos.forEach((o) => {
      if (registrarUnico(this.e.vistosIds, o.id)) {
        if (o.perigoso) novosPerigosos++;
        this.logar(`${o.nome} · ${U.dec(o.distLunar, 1)} LD (${U.num(o.velKmh)} km/h)`, o.perigoso ? 'alerta' : '');
      }
    });

    if (novosPerigosos > 0) Caos.registrar(novosPerigosos);
    else if (objetos.length > 0) this.logar(`${objetos.length} near-Earth objects tracked today`);
  },

  perigosos() { return this.e.lista.filter((o) => o.perigoso).length; },
  metrica() { return this.e.lista.length; },
  principal() {
    if (!this.carregado) return { texto: '—', nivel: 'ok' };
    const p = this.perigosos();
    return { texto: U.num(this.e.lista.length), nivel: p >= 3 ? 'crit' : p >= 1 ? 'warn' : 'ok' };
  },
  contexto() {
    if (!this.carregado) return IDIOMA === 'en' ? 'tracking near-Earth objects…' : 'rastreando objetos próximos da Terra…';
    const maisPerto = this.e.lista[0];
    if (!maisPerto) return IDIOMA === 'en' ? 'no close approaches today' : 'nenhum objeto em aproximação hoje';
    return IDIOMA === 'en'
      ? `objects today · ${this.perigosos()} hazardous · closest: ${U.dec(maisPerto.distLunar, 1)} LD`
      : `objetos hoje · ${this.perigosos()} potencialmente perigoso(s) · mais perto: ${U.dec(maisPerto.distLunar, 1)} LD`;
  },
  montarViz() {},
  renderViz(el) {
    if (this.e.lista.length === 0) {
      el.replaceChildren(h('li', 'vazio', IDIOMA === 'en' ? 'no asteroids logged today' : 'nenhum asteroide registrado hoje'));
      return;
    }
    el.replaceChildren(...this.e.lista.map((o) => {
      const li = h('li');
      const tag = IDIOMA === 'en' ? (o.perigoso ? 'HAZARD' : 'TRACKED') : (o.perigoso ? 'PERIGOSO' : 'MONITORADO');
      li.append(
        h('span', 'nome', o.nome),
        h('span', 'fonte-tag', tag),
        h('span', 'val ' + (o.perigoso ? 'amb' : 'suave'), `${U.dec(o.distLunar, 1)} LD`)
      );
      return li;
    }));
  },
  eventosIniciais() { return this.perigosos(); }
});

/* ===== 11 · ALERTAS DE SEGURANÇA CIBERNÉTICA — HN / CVE Feed — 15 min == */
const ciber = criarSensor({
  id: 'ciber', num: '11', titulo: 'ALERTAS CIBERSEGURANÇA', fonte: 'CVE / Security Feed', freq: 900,
  e: { lista: [], vistas: new Set() },

  async atualizar() {
    const ontemUnix = Math.floor((Date.now() - 24 * 3600 * 1000) / 1000);
    const q = '(CVE OR "zero-day" OR ransomware OR breach OR outage OR vulnerability)';
    const url = `https://hn.algolia.com/api/v1/search_by_date?query=${encodeURIComponent(q)}&tags=story&numericFilters=created_at_i>${ontemUnix}&hitsPerPage=25`;
    const dados = await fetchSeguro(url, 'json', 10000);
    const hits = Array.isArray(dados?.hits) ? dados.hits : [];

    const alertas = hits.map((item) => {
      const titulo = (item.title || '').trim();
      const ts = item.created_at_i ? item.created_at_i * 1000 : Date.now();
      const critico = /cve-|zero-day|0-day|ransomware|outage|breach/i.test(titulo);
      return { id: String(item.objectID), titulo, ts, critico };
    }).filter((a) => a.titulo);

    let novos = 0;
    alertas.forEach((a) => {
      if (registrarUnico(this.e.vistas, a.id)) {
        novos++;
        this.logar(a.titulo, a.critico ? 'alerta' : '', a.ts);
      }
    });

    this.e.lista = alertas;
    if (novos > 0) Caos.registrar(novos);
    else this.logar('No new cybersecurity incidents in this cycle');
  },

  metrica() { return this.e.lista.length; },
  principal() {
    if (!this.carregado) return { texto: '—', nivel: 'ok' };
    const n = this.e.lista.length;
    return { texto: U.num(n), nivel: n >= 20 ? 'crit' : n >= 10 ? 'warn' : 'ok' };
  },
  contexto() {
    if (!this.carregado) return IDIOMA === 'en' ? 'monitoring CVEs & outages…' : 'monitorando vulnerabilidades e incidentes…';
    const crit = this.e.lista.filter((a) => a.critico).length;
    return IDIOMA === 'en'
      ? `CVE, breach or outage alerts in last 24h · ${crit} critical`
      : `alertas de falha, CVE ou vazamento nas últimas 24h · ${crit} crítico(s)`;
  },
  montarViz() {},
  renderViz(el) {
    if (this.e.lista.length === 0) {
      el.replaceChildren(h('li', 'vazio', IDIOMA === 'en' ? 'no cyber alerts in last 24h' : 'nenhum alerta cibernético nas últimas 24h'));
      return;
    }
    el.replaceChildren(...this.e.lista.map((a) => {
      const li = h('li');
      li.append(
        h('span', 'fonte-tag', a.critico ? 'CVE/SEC' : 'INFO'),
        h('span', 'nome', a.titulo),
        h('span', 'hora', U.hora(a.ts).slice(0, 5))
      );
      return li;
    }));
  },
  eventosIniciais() { return this.e.lista.filter((a) => a.critico).length; }
});

/* ===== 12 · NÍVEL DO MAR & RESSACAS COSTEIRAS — NOAA — 30 min ========== */
const ESTACOES_MARE = [
  { id: '8518750', nome: 'New York (Battery)' },
  { id: '8724580', nome: 'Key West, FL' },
  { id: '8771450', nome: 'Galveston, TX' },
  { id: '8658120', nome: 'Wilmington, NC' },
  { id: '8443970', nome: 'Boston, MA' },
  { id: '9414290', nome: 'San Francisco, CA' },
  { id: '9447130', nome: 'Seattle, WA' },
  { id: '1612340', nome: 'Honolulu, HI' }
];

const mare = criarSensor({
  id: 'mare', num: '12', titulo: 'NÍVEL DO MAR & RESSACAS', fonte: 'NOAA Tides & Currents', freq: 1800,
  e: { estacoes: [], alertados: new Set() },

  async lerEstacao(est) {
    const base = `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?station=${est.id}&datum=MLLW&units=metric&time_zone=gmt&format=json`;
    const [obsRes, predRes] = await Promise.all([
      fetchSeguro(`${base}&product=water_level&date=latest`, 'json', 10000),
      fetchSeguro(`${base}&product=predictions&range=1`, 'json', 10000)
    ]);

    const obsArr = Array.isArray(obsRes?.data) ? obsRes.data : [];
    const predArr = Array.isArray(predRes?.predictions) ? predRes.predictions : [];
    if (obsArr.length === 0 || predArr.length === 0) return null;

    const obsVal = Number(obsArr[obsArr.length - 1].v);
    const predVal = Number(predArr[predArr.length - 1].v);
    if (Number.isNaN(obsVal) || Number.isNaN(predVal)) return null;

    return { id: est.id, nome: est.nome, cm: (obsVal - predVal) * 100 };
  },

  async atualizar() {
    const res = await Promise.allSettled(ESTACOES_MARE.map((e) => this.lerEstacao(e)));
    const validas = [];
    res.forEach((r) => {
      if (r.status === 'fulfilled' && r.value) validas.push(r.value);
    });

    if (validas.length === 0) throw new Error('Tide gauges temporarily unavailable');

    validas.sort((a, b) => Math.abs(b.cm) - Math.abs(a.cm));
    this.e.estacoes = validas;

    const top = validas[0];
    if (top) {
      const grave = Math.abs(top.cm) >= 30;
      this.logar(`Peak surge: ${top.nome} (${U.sinal(top.cm, 0)} cm vs. predicted)`, grave ? 'alerta' : '');

      const chave = `${top.id}-${new Date().toISOString().slice(0, 13)}`;
      if (Math.abs(top.cm) >= 40 && registrarUnico(this.e.alertados, chave)) {
        Caos.registrar(1);
      }
    }
  },

  maior() { return this.e.estacoes[0] || { nome: '—', cm: 0 }; },
  metrica() { return Math.round(Math.abs(this.maior().cm)); },
  principal() {
    if (!this.carregado || this.e.estacoes.length === 0) return { texto: '—', nivel: 'ok' };
    const m = this.maior();
    const abs = Math.abs(m.cm);
    return { texto: `${U.sinal(m.cm, 0)} cm`, nivel: abs >= 45 ? 'crit' : abs >= 25 ? 'warn' : 'ok' };
  },
  contexto() {
    if (!this.carregado || this.e.estacoes.length === 0) return IDIOMA === 'en' ? 'reading NOAA tide gauges…' : 'lendo marégrafos oceânicos NOAA…';
    const acima = this.e.estacoes.filter((e) => Math.abs(e.cm) >= 25).length;
    return IDIOMA === 'en'
      ? `anomaly vs. astronomical tide · ${acima} gauge(s) ±25 cm · peak: ${this.maior().nome}`
      : `anomalia vs. maré astronômica · ${acima} estação(ões) ±25 cm · maior: ${this.maior().nome}`;
  },
  montarViz() {},
  renderViz(el) {
    el.replaceChildren(...this.e.estacoes.map((c) => {
      const a = Math.abs(c.cm);
      const nivel = a >= 45 ? 'critico' : a >= 25 ? 'alerta' : '';
      const barra = h('span', 'barra-div');
      const i = h('i', `${c.cm >= 0 ? 'pos' : 'neg'} ${nivel}`.trim());
      i.style.width = (Math.min(a, 60) / 60 * 50).toFixed(1) + '%';
      barra.appendChild(i);
      const li = h('li');
      li.append(
        h('span', 'nome', c.nome),
        barra,
        h('span', 'val ' + (a >= 45 ? 'verm' : a >= 25 ? 'amb' : 'suave'), `${U.sinal(c.cm, 0)} cm`)
      );
      return li;
    }));
  },
  eventosIniciais() { return 0; }
});

/* ===== 13 · RADIAÇÃO UV EXTREMA — Open-Meteo — 30 min ================ */
const ESTACOES_UV = [
  { nome: 'Quito, EC', lat: -0.1807, lon: -78.4678 },
  { nome: 'La Paz, BO', lat: -16.4897, lon: -68.1193 },
  { nome: 'Cusco, PE', lat: -13.5319, lon: -71.9675 },
  { nome: 'Brasília, BR', lat: -15.7975, lon: -47.8919 },
  { nome: 'Nairobi, KE', lat: -1.2921, lon: 36.8219 },
  { nome: 'Darwin, AU', lat: -12.4634, lon: 130.8456 },
  { nome: 'Singapore, SG', lat: 1.3521, lon: 103.8198 },
  { nome: 'Bogotá, CO', lat: 4.7110, lon: -74.0721 },
  { nome: 'Honolulu, US', lat: 21.3069, lon: -157.8583 },
  { nome: 'São Paulo, BR', lat: -23.5505, lon: -46.6333 }
];

const uv = criarSensor({
  id: 'uv', num: '13', titulo: 'RADIAÇÃO UV EXTREMA', fonte: 'Open-Meteo UV Index', freq: 1800,
  e: { lista: [], alertados: new Set() },

  async atualizar() {
    const lats = ESTACOES_UV.map((c) => c.lat).join(',');
    const lons = ESTACOES_UV.map((c) => c.lon).join(',');
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}&current=uv_index`;
    const dados = await fetchSeguro(url, 'json', 12000);
    const arr = Array.isArray(dados) ? dados : [dados];

    const leituras = [];
    arr.forEach((item, i) => {
      const val = Number(item?.current?.uv_index);
      if (!Number.isNaN(val) && ESTACOES_UV[i]) {
        leituras.push({ nome: ESTACOES_UV[i].nome, uv: val });
      }
    });

    leituras.sort((a, b) => b.uv - a.uv);
    this.e.lista = leituras;

    const top = leituras[0];
    if (top) {
      const extremo = top.uv >= 11;
      this.logar(`Peak UV index: ${top.nome} (UV ${U.dec(top.uv, 1)})`, extremo ? 'alerta' : '');

      const chave = `${top.nome}-${new Date().toISOString().slice(0, 13)}`;
      if (top.uv >= 12 && registrarUnico(this.e.alertados, chave)) {
        Caos.registrar(1);
      }
    }
  },

  maior() { return this.e.lista[0] || { nome: '—', uv: 0 }; },
  metrica() { return Number(this.maior().uv.toFixed(1)); },
  principal() {
    if (!this.carregado || this.e.lista.length === 0) return { texto: '—', nivel: 'ok' };
    const m = this.maior();
    return { texto: `UV ${U.dec(m.uv, 1)}`, nivel: m.uv >= 11 ? 'crit' : m.uv >= 8 ? 'warn' : 'ok' };
  },
  contexto() {
    if (!this.carregado || this.e.lista.length === 0) return IDIOMA === 'en' ? 'measuring global UV index…' : 'medindo índice ultravioleta global…';
    const extremas = this.e.lista.filter((c) => c.uv >= 11).length;
    return IDIOMA === 'en'
      ? `current solar peak · ${extremas} city(ies) at extreme level (≥ 11) · peak: ${this.maior().nome}`
      : `pico solar atual · ${extremas} cidade(s) em nível extremo (≥ 11) · maior: ${this.maior().nome}`;
  },
  montarViz() {},
  renderViz(el) {
    el.replaceChildren(...this.e.lista.map((c) => {
      const cor = c.uv >= 11 ? 'vermelho' : c.uv >= 8 ? 'ambar' : 'verde';
      const valCor = c.uv >= 11 ? 'verm' : c.uv >= 8 ? 'amb' : 'suave';
      const li = h('li');
      li.append(
        h('span', 'ponto-cor ' + cor),
        h('span', 'nome', c.nome),
        h('span', 'val ' + valCor, `UV ${U.dec(c.uv, 1)}`)
      );
      return li;
    }));
  },
  eventosIniciais() { return 0; }
});

/* ===== 14 · CLIMA LOCAL POR CIDADE (INICIA EM BRANCO) — Open-Meteo ==== */
const WMO_DESC = {
  0: { pt: 'Céu limpo', en: 'Clear sky' },
  1: { pt: 'Predominantemente limpo', en: 'Mainly clear' },
  2: { pt: 'Parcialmente nublado', en: 'Partly cloudy' },
  3: { pt: 'Nublado', en: 'Overcast' },
  45: { pt: 'Nevoeiro', en: 'Fog' },
  48: { pt: 'Nevoeiro com geada', en: 'Depositing rime fog' },
  51: { pt: 'Garoa leve', en: 'Light drizzle' },
  53: { pt: 'Garoa moderada', en: 'Moderate drizzle' },
  55: { pt: 'Garoa intensa', en: 'Dense drizzle' },
  61: { pt: 'Chuva fraca', en: 'Slight rain' },
  63: { pt: 'Chuva moderada', en: 'Moderate rain' },
  65: { pt: 'Chuva forte', en: 'Heavy rain' },
  71: { pt: 'Neve fraca', en: 'Slight snow' },
  73: { pt: 'Neve moderada', en: 'Moderate snow' },
  75: { pt: 'Neve forte', en: 'Heavy snow' },
  80: { pt: 'Pancadas leves', en: 'Slight rain showers' },
  81: { pt: 'Pancadas moderadas', en: 'Moderate rain showers' },
  82: { pt: 'Pancadas violentas', en: 'Violent rain showers' },
  95: { pt: 'Tempestade com raios', en: 'Thunderstorm' },
  96: { pt: 'Tempestade com granizo', en: 'Thunderstorm with hail' },
  99: { pt: 'Tempestade severa', en: 'Severe thunderstorm' }
};

const cidade = criarSensor({
  id: 'cidade', num: '14', titulo: 'CLIMA POR CIDADE', fonte: 'Open-Meteo Geocoding & Weather', freq: 600,
  e: { local: null, dados: null, buscando: false, erroBusca: '' },

  async pesquisarCidade(termo) {
    const q = String(termo || '').trim();
    if (!q) return;
    this.e.buscando = true;
    this.e.erroBusca = '';
    UI.renderCard(this, false);

    try {
      const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=1&language=${IDIOMA}&format=json`;
      const geo = await fetchSeguro(geoUrl, 'json', 10000);
      const hit = Array.isArray(geo?.results) ? geo.results[0] : null;
      if (!hit) {
        this.e.erroBusca = IDIOMA === 'en' ? `City "${q}" not found` : `Cidade "${q}" não encontrada`;
        this.e.buscando = false;
        UI.renderCard(this, false);
        return;
      }

      this.e.local = {
        nome: hit.name,
        admin: hit.admin1 || '',
        pais: hit.country || '',
        lat: Number(hit.latitude),
        lon: Number(hit.longitude)
      };

      this.historico = [];
      salvarHistorico(this.id, this.historico);

      this.e.buscando = false;
      await executar(this, true);
    } catch (_) {
      this.e.buscando = false;
      this.e.erroBusca = IDIOMA === 'en' ? 'Error searching city · try again' : 'Erro ao buscar cidade · tente novamente';
      UI.renderCard(this, false);
    }
  },

  async atualizar() {
    // Se nenhuma cidade foi digitada pelo visitante ainda, mantém em branco
    if (!this.e.local) {
      this.e.dados = null;
      return;
    }

    const { lat, lon, nome, admin, pais } = this.e.local;
    const meteoUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,uv_index&daily=temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=1`;
    const arUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=pm2_5`;

    const [meteoRes, arRes] = await Promise.all([
      fetchSeguro(meteoUrl, 'json', 12000),
      fetchSeguro(arUrl, 'json', 10000).catch(() => null)
    ]);

    const cur = meteoRes?.current;
    if (!cur || typeof cur.temperature_2m !== 'number') throw new Error('Weather data unavailable');

    const code = Number(cur.weather_code) || 0;
    const pm25 = Number(arRes?.current?.pm2_5);

    this.e.dados = {
      temp: Number(cur.temperature_2m),
      sensacao: Number(cur.apparent_temperature),
      umidade: Number(cur.relative_humidity_2m),
      vento: Number(cur.wind_speed_10m),
      chuva: Number(cur.precipitation) || 0,
      uv: Number(cur.uv_index) || 0,
      max: Number(meteoRes?.daily?.temperature_2m_max?.[0]),
      min: Number(meteoRes?.daily?.temperature_2m_min?.[0]),
      code,
      pm25: Number.isNaN(pm25) ? null : pm25
    };

    const rotuloLocal = [nome, admin, pais].filter(Boolean).join(', ');
    const cond = WMO_DESC[code]?.pt || 'Monitorado';
    this.logar(
      `${rotuloLocal}: ${U.dec(this.e.dados.temp)} °C (${cond}) · sensação ${U.dec(this.e.dados.sensacao)} °C`,
      this.e.dados.temp >= 38 || this.e.dados.temp <= 0 || this.e.dados.code >= 95 ? 'alerta' : ''
    );
  },

  metrica() { return this.e.dados ? Number(this.e.dados.temp.toFixed(1)) : NaN; },
  principal() {
    if (this.e.buscando) return { texto: '…', nivel: 'ok' };
    if (!this.e.local || !this.e.dados) return { texto: '—', nivel: 'ok' };
    const d = this.e.dados;
    const crit = d.temp >= 40 || d.temp <= -5 || d.code >= 95 || d.vento >= 70;
    const warn = d.temp >= 34 || d.temp <= 3 || d.code >= 80 || d.vento >= 45 || d.uv >= 11;
    return { texto: `${U.dec(d.temp, 1)} °C`, nivel: crit ? 'crit' : warn ? 'warn' : 'ok' };
  },
  contexto() {
    if (this.e.erroBusca) return this.e.erroBusca;
    if (this.e.buscando) return IDIOMA === 'en' ? 'searching coordinates & stations…' : 'buscando coordenadas e estações…';
    if (!this.e.local) {
      return IDIOMA === 'en' ? 'type any city above to check live weather…' : 'digite qualquer cidade acima para consultar o clima…';
    }
    const { nome, admin, pais } = this.e.local;
    const lugar = [nome, admin, pais].filter(Boolean).join(', ');
    if (!this.e.dados) {
      return IDIOMA === 'en' ? `fetching weather for ${lugar}…` : `consultando clima de ${lugar}…`;
    }
    const cond = WMO_DESC[this.e.dados.code]?.[IDIOMA] || (IDIOMA === 'en' ? 'Monitored' : 'Monitorado');
    return `${lugar} · ${cond}`;
  },
  montarViz() {},
  renderViz(el) {
    if (!this.e.local || !this.e.dados) {
      el.replaceChildren(h('li', 'vazio', IDIOMA === 'en' ? 'enter a city name and click Search' : 'digite o nome de uma cidade e clique em Buscar'));
      return;
    }
    const d = this.e.dados;
    const en = IDIOMA === 'en';
    const itens = [
      { nome: en ? 'Feels like' : 'Sensação térmica', val: `${U.dec(d.sensacao, 1)} °C`, cor: d.sensacao >= 38 ? 'verm' : d.sensacao >= 32 ? 'amb' : 'suave' },
      { nome: en ? 'Min / Max today' : 'Mínima / Máxima hoje', val: `${U.dec(d.min, 0)}° / ${U.dec(d.max, 0)}°C`, cor: 'suave' },
      { nome: en ? 'Relative humidity' : 'Umidade relativa', val: `${U.num(d.umidade)}%`, cor: d.umidade <= 25 ? 'amb' : 'suave' },
      { nome: en ? 'Wind (10m)' : 'Vento (10m)', val: `${U.dec(d.vento, 0)} km/h`, cor: d.vento >= 60 ? 'verm' : d.vento >= 40 ? 'amb' : 'suave' },
      { nome: en ? 'UV Index / Rain' : 'Índice UV / Precipitação', val: `UV ${U.dec(d.uv, 1)} · ${U.dec(d.chuva, 1)} mm`, cor: d.uv >= 11 ? 'verm' : d.uv >= 8 ? 'amb' : 'suave' }
    ];

    if (d.pm25 !== null) {
      itens.push({
        nome: en ? 'Air quality (PM2.5)' : 'Qualidade do ar (PM2,5)',
        val: `${U.dec(d.pm25, 1)} µg/m³`,
        cor: d.pm25 >= 75 ? 'verm' : d.pm25 > CONFIG.limitePM25 ? 'amb' : 'suave'
      });
    }

    el.replaceChildren(...itens.map((it) => {
      const li = h('li');
      li.append(h('span', 'nome', it.nome), h('span', 'val ' + it.cor, it.val));
      return li;
    }));
  },
  eventosIniciais() { return 0; }
});

/* ===== 15 · CÂMERAS AO VIVO PELO MUNDO — Streams Públicos — Contínuo ==== */
const CAMERAS_MUNDO = [
  {
    id: 'iss',
    cidadePt: 'Órbita · Estação Espacial (ISS)',
    cidadeEn: 'Orbit · Space Station (ISS)',
    pais: 'NASA Live',
    embed: 'https://www.youtube.com/embed/xRPjKQtRXR8?autoplay=1&mute=1&playsinline=1&rel=0',
    link: 'https://www.youtube.com/watch?v=xRPjKQtRXR8'
  },
  {
    id: 'tokyo',
    cidadePt: 'Tóquio · Cruzamento Shibuya',
    cidadeEn: 'Tokyo · Shibuya Crossing',
    pais: 'Japão / JP',
    embed: 'https://www.youtube.com/embed/3kPH7kTphnE?autoplay=1&mute=1&playsinline=1&rel=0',
    link: 'https://www.youtube.com/watch?v=3kPH7kTphnE'
  },
  {
    id: 'nyc',
    cidadePt: 'Nova York · Times Square',
    cidadeEn: 'New York · Times Square',
    pais: 'EUA / US',
    embed: 'https://www.youtube.com/embed/AdUw5RdyZxI?autoplay=1&mute=1&playsinline=1&rel=0',
    link: 'https://www.youtube.com/watch?v=AdUw5RdyZxI'
  },
  {
    id: 'venice',
    cidadePt: 'Veneza · Grande Canal',
    cidadeEn: 'Venice · Grand Canal',
    pais: 'Itália / IT',
    embed: 'https://www.youtube.com/embed/vPbQcpf4-1w?autoplay=1&mute=1&playsinline=1&rel=0',
    link: 'https://www.youtube.com/watch?v=vPbQcpf4-1w'
  },
  {
    id: 'namibia',
    cidadePt: 'Deserto do Namibe · Oásis ao Vivo',
    cidadeEn: 'Namib Desert · Live Waterhole',
    pais: 'Namíbia / NA',
    embed: 'https://www.youtube.com/embed/ydYDqZQpim8?autoplay=1&mute=1&playsinline=1&rel=0',
    link: 'https://www.youtube.com/watch?v=ydYDqZQpim8'
  }
];

const cameras = criarSensor({
  id: 'cameras', num: '15', titulo: 'CÂMERAS AO VIVO NO MUNDO', fonte: 'Public Live Feeds (NASA / EarthCam)', freq: 3600,
  e: { atualIdx: 0, tocando: false },

  async atualizar() {
    const cam = CAMERAS_MUNDO[this.e.atualIdx];
    this.logar(`Feed ready: ${cam.cidadeEn} (${cam.pais})`);
  },

  metrica() { return CAMERAS_MUNDO.length; },
  principal() {
    return { texto: `${CAMERAS_MUNDO.length} CAMS`, nivel: 'ok' };
  },
  contexto() {
    const cam = CAMERAS_MUNDO[this.e.atualIdx];
    const nome = IDIOMA === 'en' ? cam.cidadeEn : cam.cidadePt;
    return `${nome} · ${cam.pais}`;
  },
  montarViz(el) {
    this.renderViz(el);
  },
  renderViz(el) {
    const cam = CAMERAS_MUNDO[this.e.atualIdx];
    el.replaceChildren();

    const seletor = h('div', 'cam-seletor');
    CAMERAS_MUNDO.forEach((c, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = idx === this.e.atualIdx ? 'cam-btn ativo' : 'cam-btn';
      btn.textContent = (IDIOMA === 'en' ? c.cidadeEn : c.cidadePt).split('·')[0].trim();
      btn.addEventListener('click', () => {
        this.e.atualIdx = idx;
        this.e.tocando = true;
        this.logar(`Switched camera: ${c.cidadeEn}`);
        UI.renderCard(this, false);
      });
      seletor.appendChild(btn);
    });
    el.appendChild(seletor);

    const palco = h('div', 'cam-palco');
    if (this.e.tocando) {
      const iframe = document.createElement('iframe');
      iframe.src = cam.embed;
      iframe.title = IDIOMA === 'en' ? cam.cidadeEn : cam.cidadePt;
      iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
      iframe.allowFullscreen = true;
      iframe.loading = 'lazy';
      palco.appendChild(iframe);
    } else {
      const btnPlay = document.createElement('button');
      btnPlay.type = 'button';
      btnPlay.className = 'cam-play';
      btnPlay.textContent = IDIOMA === 'en' ? '▶ WATCH LIVE STREAM' : '▶ ASSISTIR TRANSMISSÃO AO VIVO';
      btnPlay.addEventListener('click', () => {
        this.e.tocando = true;
        UI.renderCard(this, false);
      });

      const ext = document.createElement('a');
      ext.href = cam.link;
      ext.target = '_blank';
      ext.rel = 'noopener noreferrer';
      ext.className = 'cam-ext';
      ext.textContent = IDIOMA === 'en' ? 'open external ↗' : 'abrir externo ↗';

      palco.append(btnPlay, ext);
    }
    el.appendChild(palco);
  },
  eventosIniciais() { return 0; }
});

/* ===== 16 · RADAR AÉREO & EMERGÊNCIAS — ADS-B / AirNav Radar — 2 min === */
const avioes = criarSensor({
  id: 'avioes', num: '16', titulo: 'RADAR AÉREO · AIRNAV', fonte: 'ADS-B Live & pt.airnavradar.com', freq: 120,
  e: { voos: [], vistosIds: new Set() },

  async atualizar() {
    const [sq7700Res, sq7600Res] = await Promise.allSettled([
      fetchSeguro('https://api.adsb.lol/v2/sqk/7700', 'json', 10000),
      fetchSeguro('https://api.adsb.lol/v2/sqk/7600', 'json', 10000)
    ]);

    const brutos = [];
    if (sq7700Res.status === 'fulfilled' && Array.isArray(sq7700Res.value?.ac)) {
      sq7700Res.value.ac.forEach((a) => brutos.push({ ...a, squawk: '7700' }));
    }
    if (sq7600Res.status === 'fulfilled' && Array.isArray(sq7600Res.value?.ac)) {
      sq7600Res.value.ac.forEach((a) => brutos.push({ ...a, squawk: '7600' }));
    }

    const lista = brutos.map((a) => {
      const flight = (a.flight || a.r || a.hex || 'N/A').trim();
      const modelo = (a.t || 'Aeronave').trim();
      const altPes = Number(a.alt_baro);
      const altStr = Number.isNaN(altPes) ? 'solo' : `${U.num(altPes)} ft`;
      const hex = String(a.hex || flight);
      const linkAirNav = flight && flight !== 'N/A'
        ? `https://pt.airnavradar.com/data/flights/${encodeURIComponent(flight)}`
        : 'https://pt.airnavradar.com/';
      return { id: `${hex}-${a.squawk}`, flight, modelo, altStr, squawk: a.squawk, linkAirNav };
    });

    this.e.voos = lista;

    let novos = 0;
    lista.forEach((v) => {
      if (registrarUnico(this.e.vistosIds, v.id)) {
        novos++;
        this.logar(`SQUAWK ${v.squawk} · ${v.flight} (${v.modelo}, ${v.altStr})`, 'alerta');
      }
    });

    if (novos > 0) Caos.registrar(novos);
    else this.logar(lista.length > 0 ? `${lista.length} transponder(s) in emergency` : 'Zero active Squawk 7700/7600 globally');
  },

  metrica() { return this.e.voos.length; },
  principal() {
    if (!this.carregado) return { texto: '—', nivel: 'ok' };
    const n = this.e.voos.length;
    return { texto: U.num(n), nivel: n >= 2 ? 'crit' : n >= 1 ? 'warn' : 'ok' };
  },
  contexto() {
    if (!this.carregado) return IDIOMA === 'en' ? 'scanning global ADS-B transponders…' : 'varrendo transponders ADS-B globais…';
    return IDIOMA === 'en'
      ? `aircraft in emergency (Squawk 7700/7600) · click to track on AirNav Radar`
      : `aeronaves em emergência (Squawk 7700/7600) · clique para abrir no AirNav Radar`;
  },
  montarViz() {},
  renderViz(el) {
    if (this.e.voos.length === 0) {
      const li = h('li', 'vazio');
      const a = document.createElement('a');
      a.href = 'https://pt.airnavradar.com/';
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.className = 'link-lei';
      a.textContent = IDIOMA === 'en'
        ? 'no Squawk 7700/7600 right now · open live map on AirNav Radar ↗'
        : 'nenhum Squawk 7700/7600 agora · abrir radar ao vivo no AirNav Radar ↗';
      li.appendChild(a);
      el.replaceChildren(li);
      return;
    }

    el.replaceChildren(...this.e.voos.map((v) => {
      const li = h('li');
      const link = document.createElement('a');
      link.href = v.linkAirNav;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.className = 'nome link-lei';
      link.textContent = `${v.flight} · ${v.modelo}`;
      link.title = `Rastrear ${v.flight} no pt.airnavradar.com`;

      li.append(
        h('span', 'fonte-tag', `SQK ${v.squawk}`),
        link,
        h('span', 'val verm', v.altStr)
      );
      return li;
    }));
  },
  eventosIniciais() { return this.e.voos.length; }
});

/* ===== 17 · TENDÊNCIAS GLOBAIS — Google Trends RSS / rss2json — 15 min == */
const trends = criarSensor({
  id: 'trends', num: '17', titulo: 'TENDÊNCIAS · GOOGLE TRENDS', fonte: 'Google Trends Daily Feed', freq: 900,
  e: { itens: [], vistos: new Set() },

  lerTagXml(el, localName) {
    const nsNode = el.getElementsByTagNameNS('*', localName)[0];
    if (nsNode && nsNode.textContent) return nsNode.textContent.trim();
    const fallback = el.getElementsByTagName(`ht:${localName}`)[0] || el.getElementsByTagName(localName)[0];
    return fallback ? fallback.textContent.trim() : '';
  },

  extrairTrendsXml(xmlStr, regiao) {
    const doc = new DOMParser().parseFromString(xmlStr, 'text/xml');
    const items = [...doc.querySelectorAll('item')];
    return items.slice(0, 12).map((it) => {
      const termo = it.querySelector('title')?.textContent?.trim() || '';
      const trafego = this.lerTagXml(it, 'approx_traffic');
      const noticia = this.lerTagXml(it, 'news_item_title');
      const link = `https://trends.google.com/trends/explore?q=${encodeURIComponent(termo)}&geo=${regiao}`;
      return { termo, trafego, noticia, regiao, link };
    }).filter((x) => x.termo);
  },

  async buscarRegiao(regiao) {
    const feedUrl = `https://trends.google.com/trending/rss?geo=${regiao}`;
    try {
      const xml = await fetchSeguro(feedUrl, 'text', 9000);
      const parsed = this.extrairTrendsXml(xml, regiao);
      if (parsed.length > 0) return parsed;
    } catch (_) { /* fallback rss2json */ }

    const json = await fetchSeguro(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feedUrl)}`, 'json', 9000);
    const items = Array.isArray(json?.items) ? json.items : [];
    return items.slice(0, 12).map((it) => {
      const termo = (it.title || '').trim();
      return {
        termo,
        trafego: '',
        noticia: '',
        regiao,
        link: `https://trends.google.com/trends/explore?q=${encodeURIComponent(termo)}&geo=${regiao}`
      };
    }).filter((x) => x.termo);
  },

  async atualizar() {
    const [brRes, usRes] = await Promise.allSettled([
      this.buscarRegiao('BR'),
      this.buscarRegiao('US')
    ]);

    const br = brRes.status === 'fulfilled' ? brRes.value : [];
    const us = usRes.status === 'fulfilled' ? usRes.value : [];

    const misturados = [];
    const max = Math.max(br.length, us.length);
    for (let i = 0; i < max; i++) {
      if (br[i]) misturados.push(br[i]);
      if (us[i]) misturados.push(us[i]);
    }

    if (misturados.length === 0) throw new Error('Google Trends feed unavailable');

    this.e.itens = misturados.slice(0, 20);

    let novos = 0;
    this.e.itens.forEach((it) => {
      const chave = `${it.regiao}-${U.normalizar(it.termo)}`;
      if (registrarUnico(this.e.vistos, chave)) {
        novos++;
        this.logar(`[${it.regiao}] ${it.termo}${it.trafego ? ` (${it.trafego})` : ''}`);
      }
    });

    if (novos > 0 && this.carregado) Caos.registrar(novos);
  },

  metrica() { return this.e.itens.length; },
  principal() {
    if (!this.carregado || this.e.itens.length === 0) return { texto: '—', nivel: 'ok' };
    const top = this.e.itens[0];
    return { texto: top.trafego || `TOP ${this.e.itens.length}`, nivel: 'ok' };
  },
  contexto() {
    if (!this.carregado || this.e.itens.length === 0) {
      return IDIOMA === 'en' ? 'reading Google Trends surges…' : 'lendo picos de busca em tempo real…';
    }
    const top = this.e.itens[0];
    return IDIOMA === 'en'
      ? `top surge now: "${top.termo}" (${top.regiao}) · BR & US live trends`
      : `pico agora: "${top.termo}" (${top.regiao}) · tendências BR & EUA`;
  },
  montarViz() {},
  renderViz(el) {
    if (this.e.itens.length === 0) {
      el.replaceChildren(h('li', 'vazio', IDIOMA === 'en' ? 'no trends loaded right now' : 'nenhuma tendência carregada no momento'));
      return;
    }
    el.replaceChildren(...this.e.itens.map((it) => {
      const li = h('li');
      const link = document.createElement('a');
      link.href = it.link;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.className = 'nome link-lei';
      link.textContent = it.termo;
      if (it.noticia) link.title = it.noticia;

      li.append(
        h('span', 'fonte-tag', it.regiao),
        link,
        h('span', 'val amb', it.trafego || 'EM ALTA')
      );
      return li;
    }));
  },
  eventosIniciais() { return 0; }
});

/* ===== 18 · QUEDAS DE INTERNET & BLECAPES — IODA / BGP — 10 min ======== */
const internet = criarSensor({
  id: 'internet', num: '18', titulo: 'QUEDAS DE INTERNET (IODA)', fonte: 'Georgia Tech IODA / BGP', freq: 600,
  e: { alertas: [], vistosIds: new Set() },

  async atualizar() {
    const agoraSec = Math.floor(Date.now() / 1000);
    const ontemSec = agoraSec - 24 * 3600;
    const url = `https://api.ioda.inetintel.cc.gatech.edu/v2/outages/alerts?from=${ontemSec}&until=${agoraSec}&limit=25`;
    const dados = await fetchSeguro(url, 'json', 11000);
    const brutos = Array.isArray(dados?.data) ? dados.data : [];

    const lista = brutos.map((item, idx) => {
      const ent = item.entity || {};
      const nome = ent.name || ent.code || 'Rede / País';
      const tipo = ent.type === 'country' ? 'PAÍS' : 'ASN';
      const nivel = String(item.level || 'warning').toLowerCase();
      const critico = nivel === 'critical' || nivel === 'high';
      const ts = item.time ? item.time * 1000 : Date.now();
      const id = `${ent.code || nome}-${item.time || idx}`;
      return { id, nome, tipo, critico, ts };
    });

    this.e.alertas = lista;

    let novos = 0;
    lista.forEach((a) => {
      if (registrarUnico(this.e.vistosIds, a.id)) {
        novos++;
        this.logar(`[${a.tipo}] Queda de conectividade: ${a.nome}`, a.critico ? 'alerta' : '', a.ts);
      }
    });

    if (novos > 0 && this.carregado) Caos.registrar(novos);
    else if (lista.length === 0) this.logar('No major BGP/internet outages in the last 24h');
  },

  criticos() { return this.e.alertas.filter((a) => a.critico).length; },
  metrica() { return this.e.alertas.length; },
  principal() {
    if (!this.carregado) return { texto: '—', nivel: 'ok' };
    const c = this.criticos();
    const n = this.e.alertas.length;
    return { texto: U.num(n), nivel: c >= 2 ? 'crit' : n >= 4 ? 'warn' : 'ok' };
  },
  contexto() {
    if (!this.carregado) return IDIOMA === 'en' ? 'monitoring global BGP routing…' : 'monitorando roteamento BGP global…';
    return IDIOMA === 'en'
      ? `connectivity anomalies in 24h · ${this.criticos()} critical blackout(s)`
      : `anomalias de conectividade em 24h · ${this.criticos()} blecape(s) crítico(s)`;
  },
  montarViz() {},
  renderViz(el) {
    if (this.e.alertas.length === 0) {
      el.replaceChildren(h('li', 'vazio', IDIOMA === 'en' ? 'global routing normal right now' : 'roteamento global estável no momento'));
      return;
    }
    el.replaceChildren(...this.e.alertas.map((a) => {
      const li = h('li');
      li.append(
        h('span', 'fonte-tag', a.tipo),
        h('span', 'nome', a.nome),
        h('span', 'val ' + (a.critico ? 'verm' : 'amb'), a.critico ? 'CRÍTICO' : 'QUEDA')
      );
      return li;
    }));
  },
  eventosIniciais() { return this.criticos(); }
});

/* ===== 19 · RESERVAS HÍDRICAS & VAZÃO DOS RIOS — Open-Meteo Flood — 1 h = */
const BACIAS_RIOS = [
  { nome: 'Rio Amazonas (Óbidos)', lat: -1.919, lon: -55.515, ref: 170000 },
  { nome: 'Rio Paraná (Foz do Iguaçu)', lat: -25.547, lon: -54.588, ref: 12000 },
  { nome: 'Rio São Francisco (Juazeiro)', lat: -9.412, lon: -40.503, ref: 2800 },
  { nome: 'Rio Madeira (Porto Velho)', lat: -8.761, lon: -63.903, ref: 18000 },
  { nome: 'Rio Guaíba (Porto Alegre)', lat: -30.031, lon: -51.236, ref: 1500 },
  { nome: 'Rio Itajaí-Açu (Blumenau)', lat: -26.918, lon: -49.066, ref: 280 },
  { nome: 'Rio Cachoeira (Joinville)', lat: -26.304, lon: -48.846, ref: 45 },
  { nome: 'Rio Nilo (Cairo)', lat: 30.044, lon: 31.235, ref: 2800 }
];

const rios = criarSensor({
  id: 'rios', num: '19', titulo: 'NÍVEL & VAZÃO DOS RIOS', fonte: 'GloFAS / Open-Meteo Flood', freq: 3600,
  e: { lista: [] },

  async atualizar() {
    const lats = BACIAS_RIOS.map((b) => b.lat).join(',');
    const lons = BACIAS_RIOS.map((b) => b.lon).join(',');
    const url = `https://flood-api.open-meteo.com/v1/flood?latitude=${lats}&longitude=${lons}&daily=river_discharge&forecast_days=1`;
    const dados = await fetchSeguro(url, 'json', 12000);
    const arr = Array.isArray(dados) ? dados : [dados];

    const leituras = [];
    arr.forEach((item, i) => {
      const b = BACIAS_RIOS[i];
      const vazao = Number(item?.daily?.river_discharge?.[0]);
      if (!b || Number.isNaN(vazao)) return;
      const ratio = vazao / b.ref;
      leituras.push({ nome: b.nome, vazao, ratio });
    });

    leituras.sort((a, b) => b.ratio - a.ratio);
    this.e.lista = leituras;

    const top = leituras[0];
    if (top) {
      const cheia = top.ratio >= 1.8;
      this.logar(`Peak river flow: ${top.nome} (${U.num(top.vazao)} m³/s · ${U.dec(top.ratio * 100, 0)}% ref)`, cheia ? 'alerta' : '');
    }
  },

  cheias() { return this.e.lista.filter((r) => r.ratio >= 1.6).length; },
  secas() { return this.e.lista.filter((r) => r.ratio <= 0.4).length; },
  metrica() { return this.e.lista.length > 0 ? Math.round(this.e.lista[0].ratio * 100) : 100; },
  principal() {
    if (!this.carregado || this.e.lista.length === 0) return { texto: '—', nivel: 'ok' };
    const c = this.cheias();
    const s = this.secas();
    const alertas = c + s;
    return { texto: U.num(alertas), nivel: c >= 2 ? 'crit' : alertas >= 1 ? 'warn' : 'ok' };
  },
  contexto() {
    if (!this.carregado || this.e.lista.length === 0) return IDIOMA === 'en' ? 'reading river basins…' : 'lendo telemetria das bacias hidrográficas…';
    return IDIOMA === 'en'
      ? `basins in anomaly · ${this.cheias()} flood / ${this.secas()} drought alert(s)`
      : `bacias em anomalia · ${this.cheias()} alerta(s) de cheia / ${this.secas()} de seca`;
  },
  montarViz() {},
  renderViz(el) {
    el.replaceChildren(...this.e.lista.map((r) => {
      const cheia = r.ratio >= 1.6;
      const seca = r.ratio <= 0.4;
      const cor = cheia ? 'vermelho' : seca ? 'ambar' : 'verde';
      const valCor = cheia ? 'verm' : seca ? 'amb' : 'suave';
      const li = h('li');
      li.append(
        h('span', 'ponto-cor ' + cor),
        h('span', 'nome', r.nome),
        h('span', 'val ' + valCor, `${U.num(r.vazao)} m³/s`)
      );
      return li;
    }));
  },
  eventosIniciais() { return 0; }
});

// Ordem dos 19 cards no painel
const SENSORES = [
  bolsa, microtremores, incendios,
  temperaturas, anomalias, ar,
  manchetes, palavras, desastres,
  asteroides, ciber, mare,
  uv, cidade, cameras,
  avioes, trends, internet,
  rios
];
const SENSOR_POR_ID = Object.fromEntries(SENSORES.map((s) => [s.id, s]));

/* ---------------------------------------------------------------------
   7. INTERFACE, TROCA DE IDIOMA E SISMÓGRAFO
   --------------------------------------------------------------------- */
const estado = { ultima: Date.now(), rota: null };

const Sismografo = {
  n: 240,
  amostras: [],
  energia: 0,
  linha: null,
  caixa: null,

  iniciar() {
    const el = document.getElementById('sismo');
    if (!el) return;
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
    if (this.caixa) this.caixa.classList.toggle('agitado', this.energia > 0.25);
    this.desenhar();
  },

  desenhar() {
    if (!this.linha) return;
    const passoX = 1000 / (this.n - 1);
    this.linha.setAttribute('points',
      this.amostras.map((v, i) => `${(i * passoX).toFixed(1)},${(50 - U.clamp(v, -1, 1) * 46).toFixed(1)}`).join(' '));
  }
};

function relogio() {
  const el = document.getElementById('relogio');
  if (!el) return;
  const d = new Date();
  const dia = d.toLocaleDateString(LOCALE(), { weekday: 'short', day: '2-digit', month: 'short' }).replace(/\./g, '');
  el.textContent = `${dia} ${d.toLocaleTimeString(LOCALE())}`;
}

function aplicarIdioma(novoIdioma) {
  IDIOMA = novoIdioma === 'en' ? 'en' : 'pt';
  document.documentElement.lang = IDIOMA === 'en' ? 'en' : 'pt-BR';
  try { localStorage.setItem(CONFIG.chaveIdioma, IDIOMA); } catch (_) { /* ignora */ }

  document.querySelectorAll('.btn-lang').forEach((b) => {
    b.classList.toggle('ativo', b.dataset.lang === IDIOMA);
  });

  document.getElementById('txt-aovivo').textContent = T('aoVivo');
  document.getElementById('titulo-principal').textContent = T('tituloPrincipal');
  document.getElementById('lema-principal').textContent = T('lema');
  document.getElementById('btn-voltar').textContent = T('voltar');
  document.getElementById('lbl-fonte').textContent = T('fonte');
  document.getElementById('lbl-freq').textContent = T('frequencia');
  document.getElementById('lbl-ultima').textContent = T('ultimaLeitura');
  document.getElementById('lbl-historico').textContent = T('historicoDado');
  document.getElementById('lbl-registro').textContent = T('registroEventos');
  document.getElementById('caos-rotulo').textContent = T('termometroCaos');
  document.getElementById('caos-legenda').textContent = T('legendaCaos');
  const txtFeito = document.getElementById('txt-feito-por');
  if (txtFeito) txtFeito.textContent = T('feitoPor');

  const inputCidade = document.getElementById('input-cidade');
  const btnCidade = document.getElementById('btn-cidade');
  if (inputCidade) inputCidade.placeholder = T('placeholderCidade');
  if (btnCidade) btnCidade.textContent = T('buscar');

  Visitantes.atualizarTexto();
  relogio();
  UI.renderRodape();

  SENSORES.forEach((s) => {
    const c = UI.cards[s.id];
    if (!c) return;
    c.titulo.textContent = s.nomeExibicao();
    c.ver.textContent = T('verDetalhes');
    UI.renderCard(s, false);
  });

  if (estado.rota && SENSOR_POR_ID[estado.rota]) {
    Detalhe.render(SENSOR_POR_ID[estado.rota]);
  }
}

const UI = {
  cards: {},

  montar() {
    SENSORES.forEach((s) => {
      const raiz = document.querySelector(`[data-sensor="${s.id}"]`);
      if (!raiz) return;
      const campo = (nome) => raiz.querySelector(`[data-campo="${nome}"]`);
      const pe = raiz.querySelector('.card-pe');

      const nivel = h('span', 'nivel', T('niveis').ok);
      pe.insertBefore(nivel, pe.firstChild);

      const ciclo = h('div', 'ciclo');
      const preench = h('i');
      ciclo.appendChild(preench);
      raiz.insertBefore(ciclo, pe);

      this.cards[s.id] = {
        raiz,
        titulo: raiz.querySelector('.card-topo h2'),
        valor: campo('valor'),
        contexto: campo('contexto'),
        viz: campo('viz'),
        tempo: campo('tempo'),
        ver: raiz.querySelector('.ver'),
        nivel,
        ciclo: preench,
        pAnt: 0
      };
      s.montarViz(this.cards[s.id].viz);
    });

    const form = document.getElementById('form-cidade');
    const input = document.getElementById('input-cidade');
    if (form && input) {
      input.value = '';
      form.addEventListener('submit', (ev) => {
        ev.preventDefault();
        cidade.pesquisarCidade(input.value);
      });
    }

    document.querySelectorAll('.btn-lang').forEach((btn) => {
      btn.addEventListener('click', () => aplicarIdioma(btn.dataset.lang));
    });
  },

  renderCard(s, animar) {
    const c = this.cards[s.id];
    if (!c) return;
    const p = s.principal();
    c.valor.textContent = p.texto;
    c.raiz.dataset.nivel = p.nivel;
    c.nivel.textContent = T('niveis')[p.nivel];
    c.contexto.textContent = s.erroMsg && !s.carregado ? s.erroMsg : s.contexto();
    s.renderViz(c.viz);
    this.renderTempo(s);
    if (animar) {
      c.valor.classList.remove('pulsou');
      void c.valor.offsetWidth;
      c.valor.classList.add('pulsou');
    }
  },

  renderTempo(s) {
    const c = this.cards[s.id];
    if (!c) return;
    if (s.id === 'cidade' && !s.e.local) {
      c.tempo.textContent = T('aguardandoBusca');
      return;
    }
    c.tempo.textContent = s.ultima ? T('atualizado') + U.relativo(s.ultima) : T('sincronizando');
  },
  renderTempos() { SENSORES.forEach((s) => this.renderTempo(s)); },

  renderCiclos() {
    const agora = Date.now();
    SENSORES.forEach((s) => {
      const c = this.cards[s.id];
      if (!c || !s.proximo || !s.intervaloMs) return;
      const p = U.clamp(1 - (s.proximo - agora) / s.intervaloMs, 0, 1);
      c.ciclo.style.transition = p < c.pAnt ? 'none' : '';
      c.ciclo.style.width = (p * 100).toFixed(1) + '%';
      c.pAnt = p;
    });
  },

  renderRodape() {
    const data = new Date(estado.ultima).toLocaleString(LOCALE(), {
      weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
    document.getElementById('ultima').textContent = T('ultimaGeral') + data;
  }
};

// Página de detalhe de um sensor
const Detalhe = {
  render(s) {
    const p = s.principal();
    const raiz = document.getElementById('detalhe');
    raiz.dataset.nivel = p.nivel;
    document.getElementById('det-num').textContent = s.num;
    document.getElementById('det-titulo').textContent = s.nomeExibicao();
    document.getElementById('det-fonte').textContent = s.fonte;
    document.getElementById('det-freq').textContent = `${T('aCada')}${U.freq(s.freq)}`;
    document.getElementById('det-ultima').textContent = s.ultima ? `${U.hora(s.ultima)} (${U.relativo(s.ultima)})` : T('sincronizando');
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
      t.textContent = T('aguardandoLeituras');
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
    tMax.textContent = T('max') + fmt(max);
    const tMin = svg('text', { x: P, y: H - P + 16 });
    tMin.textContent = T('min') + fmt(min);
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
    s.erroMsg = '';
    s.carregado = true;
    s.registrarHistorico();
    if (s.id !== 'cidade' || s.e.local) {
      s.ultima = Date.now();
      estado.ultima = s.ultima;
    }
    UI.renderCard(s, animar);
    UI.renderRodape();
    if (estado.rota === s.id) Detalhe.render(s);
  } catch (err) {
    s.erroMsg = IDIOMA === 'en' ? 'feed temporarily unavailable · retrying…' : 'fonte temporariamente indisponível · reconectando…';
    s.logar(`Temporary read failure (${err?.message || 'network'})`);
    UI.renderCard(s, false);
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
  const m = location.hash.match(/^#\/sensor\/([a-z0-9_-]+)$/);
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
  aplicarIdioma(IDIOMA);
  Sismografo.iniciar();
  Visitantes.iniciar();

  Agendador.iniciar();

  setInterval(() => {
    UI.renderTempos();
    UI.renderCiclos();
    relogio();
    if (estado.rota) {
      const s = SENSOR_POR_ID[estado.rota];
      if (s) {
        document.getElementById('det-ultima').textContent = s.ultima
          ? `${U.hora(s.ultima)} (${U.relativo(s.ultima)})`
          : T('sincronizando');
      }
    }
  }, 1000);

  window.addEventListener('hashchange', rotear);
  rotear();

  await Promise.allSettled(SENSORES.map((s) => executar(s, false)));
  Caos.iniciar(SENSORES.reduce((soma, s) => soma + s.eventosIniciais(), 0));
}

document.addEventListener('DOMContentLoaded', iniciar);
