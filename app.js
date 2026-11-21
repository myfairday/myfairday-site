/* =====================================================================
   PAINEL DE ANOMALIAS GLOBAIS — app.js (19 Sensores + UX + Satélite)
   Criado por Thiago Mistery — https://www.youtube.com/@thiagomistery
   ===================================================================== */
'use strict';

/* ---------------------------------------------------------------------
   1. CONFIGURAÇÃO, TEMAS E INTERNACIONALIZAÇÃO (PT / EN)
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
  chaveTema: 'painel_tema_v1',
  chaveVisitante: 'myfairday_vis_sess_v2',
  chaveVisTotal: 'myfairday_vis_num_v2'
};

let IDIOMA = 'pt';
let TEMA = 'verde';

try {
  const salvoIdioma = localStorage.getItem(CONFIG.chaveIdioma);
  if (salvoIdioma === 'en' || salvoIdioma === 'pt') IDIOMA = salvoIdioma;
  const salvoTema = localStorage.getItem(CONFIG.chaveTema);
  if (['verde', 'ambar', 'vermelho', 'ciano'].includes(salvoTema)) TEMA = salvoTema;
} catch (_) { /* ignora */ }

const AJUDA_SENSORES = {
  globo: {
    pt: 'Planeta Terra interativo em 3D com ocorrências da NASA/USGS e mapa de satélite (Google Maps) com zoom até nível de rua.',
    en: 'Interactive 3D Earth showing live NASA/USGS events plus Google Maps satellite view down to street level.'
  },
  bolsa: {
    pt: 'Acompanha as principais ações da B3 (Petrobras, Vale, Itaú, Magalu) e a cotação do Dólar, Euro e Bitcoin em Reais.',
    en: 'Tracks major Brazilian B3 stocks alongside USD, EUR, and Bitcoin exchange rates in BRL.'
  },
  microtremores: {
    pt: 'Conta tremores leves (magnitude 2,0 a 3,0) detectados pelos sismógrafos do USGS nas últimas 24 horas.',
    en: 'Counts minor tremors (magnitude 2.0–3.0) detected by USGS seismographs over the last 24 hours.'
  },
  incendios: {
    pt: 'Monitora queimadas e incêndios florestais ativos identificados por satélites da NASA no mundo todo.',
    en: 'Monitors active wildfires detected globally by NASA Earth-observing satellites.'
  },
  temperaturas: {
    pt: 'Lista estações meteorológicas que registraram calor extremo (acima de 45 °C) ou frio severo (abaixo de −20 °C).',
    en: 'Lists weather stations recording extreme heat (above 45 °C) or severe cold (below −20 °C).'
  },
  anomalias: {
    pt: 'Compara a temperatura atual de 10 capitais globais com a média climática histórica de 30 anos (1991–2020).',
    en: 'Compares current temperatures in 10 global capitals against their 30-year historical baseline (1991–2020).'
  },
  manchetes: {
    pt: 'Busca notícias em tempo real direto no Google Notícias sobre qualquer palavra, pessoa ou assunto digitado.',
    en: 'Searches live news headlines directly on Google News for any keyword, person, or topic.'
  },
  ar: {
    pt: 'Mede a concentração de partículas finas (PM2.5). Acima de 35 µg/m³ já indica ar poluído; acima de 150 é crítico.',
    en: 'Measures fine particulate matter (PM2.5). Above 35 µg/m³ indicates polluted air; above 150 is hazardous.'
  },
  desastres: {
    pt: 'Alertas oficiais da ONU (GDACS) para terremotos, ciclones, inundações, erupções vulcânicas e secas graves.',
    en: 'Official UN (GDACS) alerts for major earthquakes, cyclones, floods, volcanic eruptions, and droughts.'
  },
  asteroides: {
    pt: 'Asteroides passando perto da Terra hoje. 1 LD (Distância Lunar) equivale a cerca de 384.400 km.',
    en: 'Asteroids passing near Earth today. 1 LD (Lunar Distance) equals roughly 384,400 km.'
  },
  mare: {
    pt: 'Diferença em centímetros entre o nível real do mar medido por bóias da NOAA e a maré prevista (indica ressacas).',
    en: 'Difference in centimeters between actual sea level measured by NOAA gauges and predicted tide (storm surge).'
  },
  uv: {
    pt: 'Índice de radiação ultravioleta solar. Valores iguais ou acima de 11 representam risco extremo à pele e olhos.',
    en: 'Solar ultraviolet radiation index. Values of 11 or higher represent extreme risk.'
  },
  cidade: {
    pt: 'Digite qualquer cidade do mundo para ver temperatura, sensação térmica, umidade, vento e índice UV agora.',
    en: 'Type any city worldwide to check live temperature, feels-like, humidity, wind speed, and UV index.'
  },
  raios: {
    pt: 'Estima descargas elétricas por minuto no planeta com base na energia convectiva atmosférica (CAPE).',
    en: 'Estimates global lightning strikes per minute based on atmospheric convective energy (CAPE).'
  },
  populacao: {
    pt: 'Relógio demográfico estimado com base nas projeções da ONU (~4,3 nascimentos e ~2,05 óbitos por segundo).',
    en: 'Estimated world population clock based on UN projections (~4.3 births and ~2.05 deaths per second).'
  },
  ondas: {
    pt: 'Altura das ondas e período do swell em picos oceânicos famosos como Nazaré, Pipeline, Florianópolis e Santos.',
    en: 'Wave height and swell period at major ocean spots including Nazaré, Pipeline, Florianópolis, and Santos.'
  },
  radiomusica: {
    pt: 'Ouça estações gratuitas ao vivo ou cole o link direto (MP3/AAC) de qualquer rádio online para sintonizar.',
    en: 'Listen to free live stations or paste the direct stream link (MP3/AAC) of any online radio.'
  },
  internet: {
    pt: 'Detecta quedas regionais de internet e falhas de roteamento BGP monitoradas pelo projeto IODA (Georgia Tech).',
    en: 'Detects regional internet outages and BGP routing anomalies tracked by Georgia Tech IODA.'
  },
  rios: {
    pt: 'Vazão atual dos maiores rios do mundo (em m³/s) comparada à média normal para identificar risco de cheias.',
    en: 'Current river discharge (in m³/s) compared to normal averages to spot flood risks.'
  }
};

const I18N = {
  pt: {
    aoVivo: 'ao vivo',
    badgeCriador: 'CRIADO POR THIAGO MISTERY',
    visitantes: 'visitantes',
    telaCheia: '⛶ Tela Cheia',
    sairTelaCheia: '✕ Sair Tela Cheia',
    tituloPrincipal: 'PAINEL DE ANOMALIAS GLOBAIS',
    lema: 'O mundo está sempre acontecendo. Você só não estava olhando.',
    destaqueTag: 'DESTAQUE AGORA',
    filtroTodos: 'Todos (19)',
    filtroAlertas: '⚠️ Alertas Ativos',
    filtroTerra: '🌍 Clima & Terra',
    filtroInterativos: '🎛️ Interativos',
    buscaGlobal: 'Filtrar sensor, país ou dado…',
    vazioFiltro: 'Nenhum sensor encontrado para este filtro.',
    tabGlobo: '🌍 Globo 3D',
    tabMaps: '🗺️ Satélite Maps',
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
    feitoPor: 'Criado por',
    atualizado: 'atualizado ',
    sincronizando: 'sincronizando…',
    aguardandoBusca: 'aguardando busca…',
    agoraMesmo: 'agora mesmo',
    aCada: 'a cada ',
    aguardandoLeituras: 'aguardando mais leituras em tempo real…',
    max: 'máx ',
    min: 'mín ',
    placeholderCidade: 'Digite uma cidade…',
    placeholderGoogleNews: 'Pesquisar no Google Notícias…',
    buscar: 'Buscar',
    placeholderRadio: 'Cole o link da rádio (MP3/AAC)…',
    ouvir: 'Ouvir',
    niveis: { ok: 'normal', warn: 'atenção', crit: 'crítico' },
    sensores: {
      globo: 'GOOGLE EARTH · TERRA & SATÉLITE',
      bolsa: 'BOLSA DE VALORES (B3)',
      microtremores: 'MICROTREMORES',
      incendios: 'FOCOS DE INCÊNDIO',
      temperaturas: 'TEMPERATURAS EXTREMAS',
      anomalias: 'ANOMALIAS CLIMÁTICAS',
      manchetes: 'NOTÍCIAS · GOOGLE',
      ar: 'QUALIDADE DO AR',
      desastres: 'DESASTRES NATURAIS (ONU)',
      asteroides: 'ASTEROIDES PRÓXIMOS (NASA)',
      mare: 'NÍVEL DO MAR & RESSACAS',
      uv: 'RADIAÇÃO UV EXTREMA',
      cidade: 'CLIMA POR CIDADE',
      raios: 'OBSERVATÓRIO DE RAIOS',
      populacao: 'POPULAÇÃO MUNDIAL AO VIVO',
      ondas: 'ONDAS, SWELL & MARÉ',
      radiomusica: 'RÁDIO · SINTONIZADOR AO VIVO',
      internet: 'QUEDAS DE INTERNET (IODA)',
      rios: 'NÍVEL & VAZÃO DOS RIOS'
    }
  },
  en: {
    aoVivo: 'live',
    badgeCriador: 'CREATED BY THIAGO MISTERY',
    visitantes: 'visitors',
    telaCheia: '⛶ Fullscreen',
    sairTelaCheia: '✕ Exit Fullscreen',
    tituloPrincipal: 'GLOBAL ANOMALY DASHBOARD',
    lema: 'The world is always happening. You just weren’t watching.',
    destaqueTag: 'LIVE HIGHLIGHT',
    filtroTodos: 'All (19)',
    filtroAlertas: '⚠️ Active Alerts',
    filtroTerra: '🌍 Climate & Earth',
    filtroInterativos: '🎛️ Interactive',
    buscaGlobal: 'Filter sensor, country, or metric…',
    vazioFiltro: 'No sensors match the current filter.',
    tabGlobo: '🌍 3D Globe',
    tabMaps: '🗺️ Satellite Maps',
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
    placeholderGoogleNews: 'Search Google News…',
    buscar: 'Search',
    placeholderRadio: 'Paste radio stream URL (MP3/AAC)…',
    ouvir: 'Tune',
    niveis: { ok: 'normal', warn: 'warning', crit: 'critical' },
    sensores: {
      globo: 'GOOGLE EARTH · 3D & SATELLITE',
      bolsa: 'BRAZIL STOCK EXCHANGE (B3)',
      microtremores: 'MICROTREMORS',
      incendios: 'ACTIVE WILDFIRES',
      temperaturas: 'EXTREME TEMPERATURES',
      anomalias: 'CLIMATE ANOMALIES',
      manchetes: 'NEWS · GOOGLE',
      ar: 'AIR QUALITY (PM2.5)',
      desastres: 'NATURAL DISASTERS (UN)',
      asteroides: 'NEAR-EARTH ASTEROIDS (NASA)',
      mare: 'SEA LEVEL & STORM SURGES',
      uv: 'EXTREME UV RADIATION',
      cidade: 'WEATHER BY CITY',
      raios: 'GLOBAL LIGHTNING OBSERVATORY',
      populacao: 'LIVE WORLD POPULATION',
      ondas: 'OCEAN WAVES, SWELL & TIDE',
      radiomusica: 'LIVE RADIO TUNER',
      internet: 'INTERNET OUTAGES (IODA)',
      rios: 'RIVER LEVELS & DISCHARGE'
    }
  }
};

const T = (chave) => I18N[IDIOMA][chave] ?? I18N.pt[chave] ?? chave;
const LOCALE = () => (IDIOMA === 'en' ? 'en-US' : 'pt-BR');

function aplicarTema(novoTema) {
  TEMA = ['verde', 'ambar', 'vermelho', 'ciano'].includes(novoTema) ? novoTema : 'verde';
  document.documentElement.setAttribute('data-tema', TEMA);
  try { localStorage.setItem(CONFIG.chaveTema, TEMA); } catch (_) { /* ignora */ }
  document.querySelectorAll('.btn-tema').forEach((b) => {
    b.classList.toggle('ativo', b.dataset.temaBtn === TEMA);
  });
}

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
  }
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
   3. CONTADOR DE VISITANTES (CONTAGEM GLOBAL GENUÍNA + FALLBACK CORS)
   --------------------------------------------------------------------- */
const Visitantes = {
  total: 0,

  atualizarTexto() {
    const el = document.getElementById('visitantes');
    if (!el) return;
    el.textContent = this.total > 0 ? `${T('visitantes')}: ${U.num(this.total)}` : `${T('visitantes')}: —`;
  },

  async consultarContador(url) {
    // Tenta requisição direta primeiro (mais rápido)
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 6000);
      const res = await fetch(url, { signal: ctrl.signal, cache: 'no-store' });
      clearTimeout(timer);
      if (res.ok) return await res.json();
    } catch (_) { /* cai para o proxy CORS abaixo */ }

    // Fallback usando o fetchSeguro do próprio painel caso haja bloqueio de CORS
    return await fetchSeguro(url, 'json', 8000);
  },

  async iniciar() {
    const namespace = 'thiagomistery-painel-anomalias';
    const key = 'visitantes-unicos-v1';
    let cache = 0;
    let jaContouSessao = false;

    try {
      cache = parseInt(localStorage.getItem(CONFIG.chaveVisTotal), 10) || 0;
      jaContouSessao = sessionStorage.getItem(CONFIG.chaveVisitante) === '1';
    } catch (_) { /* ignora */ }

    if (cache > 0) {
      this.total = cache;
      this.atualizarTexto();
    }

    // Se já contou nesta aba/sessão, apenas lê o total atual (/get).
    // Se for um novo acesso/sessão, incrementa +1 no servidor global (/up).
    const baseUrl = `https://api.counterapi.dev/v1/${namespace}/${key}`;
    const endpoint = jaContouSessao ? baseUrl : `${baseUrl}/up`;

    try {
      const data = await this.consultarContador(endpoint);
      const val = Number(data?.count ?? data?.value);

      if (!Number.isNaN(val) && val > 0) {
        this.total = Math.max(val, cache);
        try {
          sessionStorage.setItem(CONFIG.chaveVisitante, '1');
          localStorage.setItem(CONFIG.chaveVisTotal, String(this.total));
        } catch (_) { /* ignora */ }
      }
    } catch (_) {
      // Só usa incremento local se ambos (direto e proxy) falharem
      if (!jaContouSessao) {
        this.total = cache + 1;
        try {
          sessionStorage.setItem(CONFIG.chaveVisitante, '1');
          localStorage.setItem(CONFIG.chaveVisTotal, String(this.total));
        } catch (__) { /* ignora */ }
      }
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

/* ===== 01 · GOOGLE EARTH 3D + GOOGLE MAPS SATÉLITE =================== */
const globo = criarSensor({
  id: 'globo', num: '01', titulo: 'GOOGLE EARTH · TERRA & SATÉLITE', fonte: 'NASA Blue Marble 3D + Google Maps Satellite', freq: 300,
  e: {
    modo: 'globo',
    pontos: [],
    selecionado: null,
    mapLat: -14.2350,
    mapLng: -51.9253,
    mapZoom: 4,
    instanciaCard: null,
    instanciaDetalhe: null,
    wrapCard: null
  },

  alternarModo(novoModo) {
    if (novoModo !== 'globo' && novoModo !== 'maps') return;
    this.e.modo = novoModo;
    document.querySelectorAll('.btn-earth-tab').forEach((b) => {
      b.classList.toggle('ativo', b.dataset.earthMode === novoModo);
    });
    if (this.e.wrapCard) {
      this.renderizarContainerCard(this.e.wrapCard);
    }
    UI.renderCard(this, false);
  },

  urlGoogleMaps(lat, lng, zoom) {
    return `https://maps.google.com/maps?q=${lat},${lng}&t=k&z=${zoom}&output=embed`;
  },

  async atualizar() {
    const agora = Date.now();
    const ontemISO = new Date(agora - 24 * 3600 * 1000).toISOString();

    const [eqRes, fireRes] = await Promise.allSettled([
      fetchSeguro(`https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&minmagnitude=3.5&starttime=${ontemISO}&limit=50`, 'json', 10000),
      fetchSeguro('https://eonet.gsfc.nasa.gov/api/v3/events?category=wildfires,volcanoes,severeStorms&status=open&days=15&limit=40', 'json', 10000)
    ]);

    const pts = [];

    if (eqRes.status === 'fulfilled' && Array.isArray(eqRes.value?.features)) {
      eqRes.value.features.forEach((f) => {
        const c = f.geometry?.coordinates;
        if (!Array.isArray(c) || c.length < 2) return;
        const mag = Number(f.properties?.mag) || 3.5;
        pts.push({
          tipo: 'EQ',
          titulo: `M${U.dec(mag)} · ${f.properties?.place || 'Terremoto'}`,
          lng: Number(c[0]),
          lat: Number(c[1]),
          cor: mag >= 5.2 ? '#ff4d5e' : '#f5b942',
          raio: mag >= 5.2 ? 0.65 : 0.42
        });
      });
    }

    if (fireRes.status === 'fulfilled' && Array.isArray(fireRes.value?.events)) {
      fireRes.value.events.forEach((ev) => {
        const g = Array.isArray(ev.geometry) ? ev.geometry[ev.geometry.length - 1] : null;
        const c = g?.coordinates;
        if (!Array.isArray(c) || c.length < 2) return;
        pts.push({
          tipo: 'NASA',
          titulo: ev.title || 'Evento NASA EONET',
          lng: Number(c[0]),
          lat: Number(c[1]),
          cor: '#ff4d5e',
          raio: 0.6
        });
      });
    }

    if (pts.length > 0) {
      this.e.pontos = pts;
      if (!this.e.selecionado) {
        this.e.selecionado = pts[0];
        this.e.mapLat = pts[0].lat;
        this.e.mapLng = pts[0].lng;
        this.e.mapZoom = 7;
      }
      this.logar(`${pts.length} eventos ativos no Globo 3D & Satélite`);
      this.atualizarPontosGlobos();
    }
  },

  atualizarPontosGlobos() {
    [this.e.instanciaCard, this.e.instanciaDetalhe].forEach((g) => {
      if (g && typeof g.pointsData === 'function') {
        g.pointsData(this.e.pontos);
      }
    });
  },

  criarInstanciaTerra(container, largura, altura, altitudeInicial = 2.1) {
    if (typeof window.Globe !== 'function') return null;

    container.replaceChildren();
    const mundo = window.Globe()(container)
      .width(largura)
      .height(altura)
      .globeImageUrl('https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg')
      .bumpImageUrl('https://unpkg.com/three-globe/example/img/earth-topology.png')
      .backgroundImageUrl('https://unpkg.com/three-globe/example/img/night-sky.png')
      .showAtmosphere(true)
      .atmosphereColor('#4da6ff')
      .atmosphereAltitude(0.18)
      .pointsData(this.e.pontos)
      .pointLat('lat')
      .pointLng('lng')
      .pointColor('cor')
      .pointRadius('raio')
      .pointAltitude(0.035)
      .pointLabel((d) => `<div style="background:#08090c;border:1px solid #2ee59d;padding:4px 8px;border-radius:3px;font-family:monospace;font-size:11px;color:#fff;">${d.titulo}</div>`)
      .onPointClick((pt) => {
        if (!pt) return;
        this.e.selecionado = pt;
        this.e.mapLat = pt.lat;
        this.e.mapLng = pt.lng;
        this.e.mapZoom = 9;
        this.logar(`Selecionado: ${pt.titulo} (${U.dec(pt.lat, 2)}°, ${U.dec(pt.lng, 2)}°)`);
        mundo.pointOfView({ lat: pt.lat, lng: pt.lng, altitude: 1.35 }, 900);
        UI.renderCard(this, false);
      });

    mundo.pointOfView({ lat: -14, lng: -48, altitude: altitudeInicial });

    const controls = mundo.controls();
    if (controls) {
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.55;
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;
    }

    const barra = h('div', 'globo-ctrl');

    const btnMais = document.createElement('button');
    btnMais.type = 'button';
    btnMais.textContent = '+';
    btnMais.title = 'Zoom +';
    btnMais.addEventListener('click', (ev) => {
      ev.stopPropagation();
      const pov = mundo.pointOfView();
      mundo.pointOfView({ altitude: Math.max(0.45, pov.altitude * 0.72) }, 400);
    });

    const btnMenos = document.createElement('button');
    btnMenos.type = 'button';
    btnMenos.textContent = '−';
    btnMenos.title = 'Zoom −';
    btnMenos.addEventListener('click', (ev) => {
      ev.stopPropagation();
      const pov = mundo.pointOfView();
      mundo.pointOfView({ altitude: Math.min(3.8, pov.altitude * 1.35) }, 400);
    });

    const btnSat = document.createElement('button');
    btnSat.type = 'button';
    btnSat.textContent = '🛰';
    btnSat.title = 'Abrir este ponto no Satélite Google Maps';
    btnSat.addEventListener('click', (ev) => {
      ev.stopPropagation();
      this.alternarModo('maps');
    });

    barra.append(btnMais, btnMenos, btnSat);
    container.appendChild(barra);
    return mundo;
  },

  renderizarContainerCard(wrap) {
    wrap.replaceChildren();
    if (this.e.modo === 'maps') {
      const iframe = document.createElement('iframe');
      iframe.className = 'gmaps-iframe';
      iframe.src = this.urlGoogleMaps(this.e.mapLat, this.e.mapLng, this.e.mapZoom);
      iframe.loading = 'lazy';
      iframe.referrerPolicy = 'no-referrer-when-downgrade';
      iframe.title = 'Google Maps Satélite Interativo';
      wrap.appendChild(iframe);
    } else {
      requestAnimationFrame(() => {
        const w = wrap.clientWidth || 310;
        const hBox = wrap.clientHeight || 170;
        this.e.instanciaCard = this.criarInstanciaTerra(wrap, w, hBox, 2.15);
      });
    }
  },

  metrica() { return this.e.pontos.length; },
  principal() {
    if (this.e.modo === 'maps') {
      return { texto: 'SATÉLITE', nivel: 'ok' };
    }
    return { texto: `${this.e.pontos.length} PTS`, nivel: 'ok' };
  },
  contexto() {
    if (this.e.modo === 'maps') {
      const alvo = this.e.selecionado ? this.e.selecionado.titulo : 'Terra · Visão Satélite';
      return IDIOMA === 'en'
        ? `Google Maps Satellite (${alvo}) · zoom & pan`
        : `Google Maps Satélite (${alvo}) · arraste e dê zoom`;
    }
    if (this.e.selecionado) {
      const s = this.e.selecionado;
      return `${s.titulo} (${U.dec(s.lat, 1)}°, ${U.dec(s.lng, 1)}°)`;
    }
    return IDIOMA === 'en'
      ? '3D Earth events or switch to Google Maps Satellite'
      : 'ocorrências no Globo 3D ou alterne para Satélite Maps';
  },
  montarViz(el) {
    el.replaceChildren();
    const wrap = h('div', 'globo-wrap');
    el.appendChild(wrap);
    this.e.wrapCard = wrap;
    this.renderizarContainerCard(wrap);
  },
  renderViz() {
    if (this.e.modo === 'globo') {
      this.atualizarPontosGlobos();
    }
  },
  eventosIniciais() { return 0; }
});

/* ===== 02 · BOLSA DE VALORES (B3) — Brapi & AwesomeAPI — 1 min ======== */
const NOMES_B3 = {
  PETR4: 'Petrobras PN',
  VALE3: 'Vale ON',
  ITUB4: 'Itaú Unibanco PN',
  MGLU3: 'Magazine Luiza ON'
};

const bolsa = criarSensor({
  id: 'bolsa', num: '02', titulo: 'BOLSA DE VALORES (B3)', fonte: 'B3 · Brapi & AwesomeAPI', freq: 60,
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

/* ===== 03 · MICROTREMORES — USGS Earthquake Feed — 5 min ============== */
const microtremores = criarSensor({
  id: 'microtremores', num: '03', titulo: 'MICROTREMORES', fonte: 'USGS Earthquake Feed', freq: 300,
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

/* ===== 04 · FOCOS DE INCÊNDIO — NASA EONET — 30 min =================== */
const incendios = criarSensor({
  id: 'incendios', num: '04', titulo: 'FOCOS DE INCÊNDIO', fonte: 'NASA EONET', freq: 1800,
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

/* ===== 05 · TEMPERATURAS EXTREMAS — Open-Meteo — 1 h ================== */
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
  id: 'temperaturas', num: '05', titulo: 'TEMPERATURAS EXTREMAS', fonte: 'Open-Meteo', freq: 3600,
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
      el.replaceChildren(h('li', 'vazio', IDIOMA === 'en' ? 'no station outside threshold right now' : 'nenhuma estação fora da faixa agora'));
      return;
    }
    el.replaceChildren(...this.e.lista.map((c) => {
      const li = h('li');
      const sev = this.severidade(c);
      const cor = sev > 8 ? 'verm' : sev > 3 ? 'amb' : 'suave';
      li.append(h('span', 'nome', c.nome), h('span', 'val ' + cor, `${U.dec(c.temp)} °C`));
      return li;
    }));
  },
  eventosIniciais() { return this.e.lista.length; }
});

/* ===== 06 · ANOMALIAS CLIMÁTICAS — Open-Meteo — 1 h =================== */
const CAPITAIS_CLIMA = [
  { nome: 'São Paulo, BR', lat: -23.5505, lon: -46.6333 },
  { nome: 'New York, US', lat: 40.7128, lon: -74.0060 },
  { nome: 'London, UK', lat: 51.5074, lon: -0.1278 },
  { nome: 'Tokyo, JP', lat: 35.6762, lon: 139.6503 },
  { nome: 'Sydney, AU', lat: -33.8688, lon: 151.2093 },
  { nome: 'Cairo, EG', lat: 30.0444, lon: 31.2357 },
  { nome: 'Moscow, RU', lat: 55.7558, lon: 37.6173 },
  { nome: 'New Delhi, IN', lat: 28.6139, lon: 77.2090 },
  { nome: 'Reykjavik, IS', lat: 64.1466, lon: -21.9426 },
  { nome: 'Buenos Aires, AR', lat: -34.6037, lon: -58.3816 }
];

const anomalias = criarSensor({
  id: 'anomalias', num: '06', titulo: 'ANOMALIAS CLIMÁTICAS', fonte: 'Open-Meteo (30-yr baseline)', freq: 3600,
  e: { desvios: [], media: 0, alertados: new Set() },

  async obterBaselines() {
    const mes = new Date().getUTCMonth();
    let cache = {};
    try { cache = JSON.parse(localStorage.getItem(CONFIG.chaveClimaBase) || '{}'); } catch (_) { /* ignora */ }
    if (cache.mes === mes && Array.isArray(cache.medias) && cache.medias.length === CAPITAIS_CLIMA.length) {
      return cache.medias;
    }

    const lats = CAPITAIS_CLIMA.map((c) => c.lat).join(',');
    const lons = CAPITAIS_CLIMA.map((c) => c.lon).join(',');
    const url = `https://climate-api.open-meteo.com/v1/climate?latitude=${lats}&longitude=${lons}&start_date=1991-01-01&end_date=2020-12-31&models=EC_Earth3P_HR&daily=temperature_2m_mean`;
    const dados = await fetchSeguro(url, 'json', 15000);
    const arr = Array.isArray(dados) ? dados : [dados];

    const medias = arr.map((item) => {
      const datas = item?.daily?.time || [];
      const temps = item?.daily?.temperature_2m_mean || [];
      let soma = 0;
      let cont = 0;
      for (let i = 0; i < datas.length; i++) {
        if (Number(datas[i].slice(5, 7)) - 1 === mes && typeof temps[i] === 'number') {
          soma += temps[i];
          cont++;
        }
      }
      return cont > 0 ? soma / cont : null;
    });

    try { localStorage.setItem(CONFIG.chaveClimaBase, JSON.stringify({ mes, medias })); } catch (_) { /* ignora */ }
    return medias;
  },

  async atualizar() {
    const medias = await this.obterBaselines();
    const lats = CAPITAIS_CLIMA.map((c) => c.lat).join(',');
    const lons = CAPITAIS_CLIMA.map((c) => c.lon).join(',');
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}&current=temperature_2m`;
    const dados = await fetchSeguro(url, 'json', 12000);
    const arr = Array.isArray(dados) ? dados : [dados];

    const desvios = [];
    arr.forEach((item, i) => {
      const atual = Number(item?.current?.temperature_2m);
      const base = medias[i];
      if (Number.isNaN(atual) || typeof base !== 'number') return;
      const desvio = atual - base;
      desvios.push({ nome: CAPITAIS_CLIMA[i].nome, desvio, atual, base });
    });

    desvios.sort((a, b) => Math.abs(b.desvio) - Math.abs(a.desvio));
    this.e.desvios = desvios;
    this.e.media = desvios.length ? desvios.reduce((s, d) => s + d.desvio, 0) / desvios.length : 0;

    let anomaliasNovas = 0;
    const hoje = new Date().toISOString().slice(0, 10);
    desvios.forEach((d) => {
      if (Math.abs(d.desvio) >= 4 && registrarUnico(this.e.alertados, `${d.nome}-${hoje}`)) {
        anomaliasNovas++;
      }
    });

    const top = desvios[0];
    this.logar(
      top
        ? `Global avg: ${U.sinal(this.e.media)} °C · peak: ${top.nome} (${U.sinal(top.desvio)} °C)`
        : 'Baseline comparison updated',
      Math.abs(this.e.media) >= 2 ? 'alerta' : ''
    );
    if (anomaliasNovas > 0) Caos.registrar(anomaliasNovas);
  },

  destaque() { return this.e.desvios[0] || { nome: '—', desvio: 0 }; },
  metrica() { return Number(this.e.media.toFixed(1)); },
  principal() {
    if (!this.carregado) return { texto: '—', nivel: 'ok' };
    const abs = Math.abs(this.e.media);
    return { texto: `${U.sinal(this.e.media)} °C`, nivel: abs >= 3.5 ? 'crit' : abs >= 2.0 ? 'warn' : 'ok' };
  },
  contexto() {
    if (!this.carregado) return IDIOMA === 'en' ? 'comparing 1991–2020 baseline…' : 'comparando média histórica 1991–2020…';
    const d = this.destaque();
    return IDIOMA === 'en'
      ? `mean deviation across 10 capitals · peak: ${d.nome} (${U.sinal(d.desvio)} °C)`
      : `desvio médio em 10 capitais · maior: ${d.nome} (${U.sinal(d.desvio)} °C)`;
  },
  montarViz() {},
  renderViz(el) {
    const limite = 8;
    el.replaceChildren(...this.e.desvios.map((c) => {
      const li = h('li');
      const pct = U.clamp(Math.abs(c.desvio) / limite * 50, 2, 50);
      const pos = c.desvio >= 0;
      const grave = Math.abs(c.desvio) >= 4;
      const barra = h('div', 'barra-bi');
      const fill = h('span', 'fill ' + (pos ? 'pos' : 'neg'));
      fill.style.width = pct + '%';
      if (pos) fill.style.left = '50%';
      else fill.style.right = '50%';
      barra.appendChild(fill);
      li.append(
        h('span', 'nome', c.nome),
        barra,
        h('span', 'val ' + (grave ? (pos ? 'verm' : 'amb') : 'suave'), `${U.sinal(c.desvio)} °C`)
      );
      return li;
    }));
  },
  eventosIniciais() { return this.e.desvios.filter((d) => Math.abs(d.desvio) >= 4).length; }
});

/* ===== 07 · NOTÍCIAS · GOOGLE NEWS (BUSCA POR QUALQUER ASSUNTO) ======= */
const manchetes = criarSensor({
  id: 'manchetes', num: '07', titulo: 'NOTÍCIAS · GOOGLE', fonte: 'Google News Search (Tempo Real)', freq: 600,
  e: { itens: [], termoBusca: '', buscando: false, vistas: new Set() },

  async buscarAssunto(termo) {
    this.e.termoBusca = String(termo || '').trim();
    this.e.buscando = true;
    UI.renderCard(this, false);
    try {
      await this.atualizar();
      this.ultima = Date.now();
      this.carregado = true;
    } catch (_) {
      this.e.itens = [];
    } finally {
      this.e.buscando = false;
      UI.renderCard(this, true);
    }
  },

  async atualizar() {
    const q = this.e.termoBusca;
    const rssUrl = q
      ? `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=pt-BR&gl=BR&ceid=BR:pt-419`
      : 'https://news.google.com/rss?hl=pt-BR&gl=BR&ceid=BR:pt-419';

    const xmlStr = await fetchSeguro(rssUrl, 'text', 12000);
    const doc = new DOMParser().parseFromString(xmlStr, 'text/xml');
    const items = Array.from(doc.querySelectorAll('item'));

    const lista = [];
    items.slice(0, 30).forEach((node) => {
      const tituloRaw = (node.querySelector('title')?.textContent || '').trim();
      const link = (node.querySelector('link')?.textContent || '').trim();
      const pubDate = (node.querySelector('pubDate')?.textContent || '').trim();
      const fonteEl = node.querySelector('source');
      const fonte = (fonteEl?.textContent || 'Google News').trim();
      const ts = pubDate ? Date.parse(pubDate) : Date.now();

      if (!tituloRaw || !link) return;

      const tituloLimpo = tituloRaw.replace(/\s+-\s+[^-]+$/, '').trim() || tituloRaw;

      lista.push({
        titulo: tituloLimpo,
        link,
        fonte,
        ts: Number.isNaN(ts) ? Date.now() : ts
      });

      if (registrarUnico(this.e.vistas, link)) {
        this.logar(`[${fonte}] ${tituloLimpo}`, '', Number.isNaN(ts) ? Date.now() : ts);
      }
    });

    this.e.itens = lista;
  },

  metrica() { return this.e.itens.length; },
  principal() {
    if (this.e.buscando) return { texto: '…', nivel: 'ok' };
    if (!this.carregado) return { texto: '—', nivel: 'ok' };
    return { texto: U.num(this.e.itens.length), nivel: 'ok' };
  },
  contexto() {
    if (this.e.buscando) {
      return IDIOMA === 'en'
        ? `searching Google News for "${this.e.termoBusca}"…`
        : `pesquisando "${this.e.termoBusca}" no Google Notícias…`;
    }
    if (!this.carregado) {
      return IDIOMA === 'en' ? 'syncing Google News…' : 'sincronizando Google Notícias…';
    }
    if (this.e.termoBusca) {
      return IDIOMA === 'en'
        ? `Google News results for "${this.e.termoBusca}" · click to open`
        : `resultados no Google para "${this.e.termoBusca}" · clique para ler`;
    }
    return IDIOMA === 'en'
      ? 'top headlines on Google News · type any topic above'
      : 'principais notícias no Google · digite qualquer assunto acima';
  },
  montarViz() {},
  renderViz(el) {
    if (this.e.buscando) {
      el.replaceChildren(h('li', 'vazio', IDIOMA === 'en' ? 'searching Google…' : 'buscando no Google…'));
      return;
    }
    if (this.e.itens.length === 0) {
      const li = h('li', 'vazio');
      const linkGoogle = document.createElement('a');
      const query = this.e.termoBusca || 'notícias hoje';
      linkGoogle.href = `https://www.google.com/search?q=${encodeURIComponent(query)}&tbm=nws`;
      linkGoogle.target = '_blank';
      linkGoogle.rel = 'noopener noreferrer';
      linkGoogle.className = 'link-lei';
      linkGoogle.textContent = this.e.termoBusca
        ? `Abrir pesquisa "${this.e.termoBusca}" direto no Google ↗`
        : 'Abrir Google Notícias ↗';
      li.appendChild(linkGoogle);
      el.replaceChildren(li);
      return;
    }
    el.replaceChildren(...this.e.itens.map((m) => {
      const li = h('li');
      const link = document.createElement('a');
      link.href = m.link;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.className = 'nome link-lei';
      link.textContent = m.titulo;

      li.append(
        h('span', 'fonte-tag', m.fonte.slice(0, 14)),
        link,
        h('span', 'val suave', U.relativo(m.ts))
      );
      return li;
    }));
  },
  eventosIniciais() { return 0; }
});

/* ===== 08 · QUALIDADE DO AR — Open-Meteo Air Quality — 1 h ============ */
const CIDADES_AR = [
  { nome: 'Delhi, IN', lat: 28.6139, lon: 77.2090 },
  { nome: 'Lahore, PK', lat: 31.5204, lon: 74.3587 },
  { nome: 'Dhaka, BD', lat: 23.8103, lon: 90.4125 },
  { nome: 'Beijing, CN', lat: 39.9042, lon: 116.4074 },
  { nome: 'Jakarta, ID', lat: -6.2088, lon: 106.8456 },
  { nome: 'Cairo, EG', lat: 30.0444, lon: 31.2357 },
  { nome: 'São Paulo, BR', lat: -23.5505, lon: -46.6333 },
  { nome: 'Mexico City, MX', lat: 19.4326, lon: -99.1332 },
  { nome: 'Los Angeles, US', lat: 34.0522, lon: -118.2437 },
  { nome: 'Tokyo, JP', lat: 35.6762, lon: 139.6503 },
  { nome: 'London, UK', lat: 51.5074, lon: -0.1278 },
  { nome: 'Stockholm, SE', lat: 59.3293, lon: 18.0686 }
];

const ar = criarSensor({
  id: 'ar', num: '08', titulo: 'QUALIDADE DO AR', fonte: 'Open-Meteo Air Quality (CAMS)', freq: 3600,
  e: { cidades: [], alertados: new Set() },

  async atualizar() {
    const lats = CIDADES_AR.map((c) => c.lat).join(',');
    const lons = CIDADES_AR.map((c) => c.lon).join(',');
    const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lats}&longitude=${lons}&current=pm2_5`;
    const dados = await fetchSeguro(url, 'json', 12000);
    const arr = Array.isArray(dados) ? dados : [dados];

    const lista = [];
    arr.forEach((item, i) => {
      const pm = Number(item?.current?.pm2_5);
      if (!Number.isNaN(pm) && CIDADES_AR[i]) {
        lista.push({ nome: CIDADES_AR[i].nome, pm: Math.round(pm) });
      }
    });

    lista.sort((a, b) => b.pm - a.pm);
    this.e.cidades = lista;

    let novasAlertas = 0;
    const hoje = new Date().toISOString().slice(0, 10);
    lista.forEach((c) => {
      if (c.pm >= 150 && registrarUnico(this.e.alertados, `${c.nome}-${hoje}`)) novasAlertas++;
    });

    const pior = lista[0];
    if (pior) {
      this.logar(
        `${this.acimaLimite()} cities above ${CONFIG.limitePM25} µg/m³ · worst: ${pior.nome} (${pior.pm})`,
        pior.pm >= 150 ? 'alerta' : ''
      );
    }
    if (novasAlertas > 0) Caos.registrar(novasAlertas);
  },

  acimaLimite() { return this.e.cidades.filter((c) => c.pm > CONFIG.limitePM25).length; },
  pior() { return this.e.cidades[0] || { nome: '—', pm: 0 }; },
  metrica() { return this.acimaLimite(); },
  principal() {
    if (!this.carregado) return { texto: '—', nivel: 'ok' };
    const n = this.acimaLimite();
    return { texto: U.num(n), nivel: n >= 7 ? 'crit' : n >= 4 ? 'warn' : 'ok' };
  },
  contexto() {
    if (!this.carregado) return IDIOMA === 'en' ? 'measuring particulate matter…' : 'medindo material particulado…';
    const p = this.pior();
    return IDIOMA === 'en'
      ? `monitored cities with PM2.5 > ${CONFIG.limitePM25} µg/m³ · worst: ${p.nome} (${p.pm})`
      : `cidades monitoradas com PM2.5 > ${CONFIG.limitePM25} µg/m³ · pior: ${p.nome} (${p.pm})`;
  },
  montarViz() {},
  renderViz(el) {
    const topo = Math.max(180, this.pior().pm || 180);
    el.replaceChildren(...this.e.cidades.map((c) => {
      const li = h('li');
      const ruim = c.pm >= 150;
      const med = c.pm > CONFIG.limitePM25;
      const barra = h('div', 'barra-h');
      const fill = h('span', 'fill ' + (ruim ? 'crit' : med ? 'warn' : 'ok'));
      fill.style.width = U.clamp(c.pm / topo * 100, 3, 100) + '%';
      barra.appendChild(fill);
      li.append(
        h('span', 'nome', c.nome),
        barra,
        h('span', 'val ' + (ruim ? 'verm' : med ? 'amb' : 'suave'), `${c.pm} µg`)
      );
      return li;
    }));
  },
  eventosIniciais() { return this.e.cidades.filter((c) => c.pm >= 150).length; }
});

/* ===== 09 · DESASTRES NATURAIS (ONU / GDACS) — 30 min ================== */
const TIPO_GDACS = {
  EQ: { pt: 'Terremoto', en: 'Earthquake' },
  TC: { pt: 'Ciclone', en: 'Cyclone' },
  FL: { pt: 'Inundação', en: 'Flood' },
  VO: { pt: 'Vulcão', en: 'Volcano' },
  DR: { pt: 'Seca', en: 'Drought' },
  WF: { pt: 'Incêndio', en: 'Wildfire' }
};

const desastres = criarSensor({
  id: 'desastres', num: '09', titulo: 'DESASTRES NATURAIS (ONU)', fonte: 'UN OCHA / GDACS', freq: 1800,
  e: { eventos: [], vistosIds: new Set() },

  async atualizar() {
    const url = 'https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?eventlist=EQ;TC;FL;VO;DR;WF&alertlevel=Green;Orange;Red';
    const dados = await fetchSeguro(url, 'json', 13000);
    const features = Array.isArray(dados?.features) ? dados.features : [];

    const lista = [];
    let novos = 0;

    features.slice(0, 30).forEach((f) => {
      const p = f.properties || {};
      const id = `${p.eventtype || 'EV'}-${p.eventid || p.name || Math.random()}`;
      const tipo = p.eventtype || 'EV';
      const nivel = String(p.alertlevel || 'Green').toLowerCase();
      const pais = (p.country || p.name || 'Global').trim();
      const titulo = (p.name || p.description || pais).trim();

      lista.push({ id, tipo, nivel, pais, titulo });

      if (registrarUnico(this.e.vistosIds, id)) {
        novos++;
        this.logar(
          `[${nivel.toUpperCase()}] ${TIPO_GDACS[tipo]?.pt || tipo} · ${titulo}`,
          nivel === 'red' || nivel === 'orange' ? 'alerta' : ''
        );
      }
    });

    const peso = { red: 3, orange: 2, green: 1 };
    lista.sort((a, b) => (peso[b.nivel] || 0) - (peso[a.nivel] || 0));
    this.e.eventos = lista;

    if (novos > 0) Caos.registrar(novos);
  },

  graves() {
    return this.e.eventos.filter((e) => e.nivel === 'red' || e.nivel === 'orange').length;
  },
  metrica() { return this.e.eventos.length; },
  principal() {
    if (!this.carregado) return { texto: '—', nivel: 'ok' };
    const n = this.e.eventos.length;
    const red = this.e.eventos.filter((e) => e.nivel === 'red').length;
    return { texto: U.num(n), nivel: red > 0 ? 'crit' : this.graves() > 0 ? 'warn' : 'ok' };
  },
  contexto() {
    if (!this.carregado) return IDIOMA === 'en' ? 'querying UN GDACS alerts…' : 'consultando alertas da ONU / GDACS…';
    const red = this.e.eventos.filter((e) => e.nivel === 'red').length;
    const org = this.e.eventos.filter((e) => e.nivel === 'orange').length;
    return IDIOMA === 'en'
      ? `active alerts · ${red} red / ${org} orange`
      : `eventos ativos · ${red} alerta(s) vermelho(s) / ${org} laranja(s)`;
  },
  montarViz() {},
  renderViz(el) {
    if (this.e.eventos.length === 0) {
      el.replaceChildren(h('li', 'vazio', IDIOMA === 'en' ? 'no active UN disaster alerts' : 'nenhum desastre ativo reportado'));
      return;
    }
    el.replaceChildren(...this.e.eventos.map((ev) => {
      const cor = ev.nivel === 'red' ? 'verm' : ev.nivel === 'orange' ? 'amb' : 'suave';
      const tipoNome = TIPO_GDACS[ev.tipo]?.[IDIOMA] || ev.tipo;
      const badge = ev.nivel === 'red'
        ? (IDIOMA === 'en' ? 'RED' : 'VERMELHO')
        : ev.nivel === 'orange'
          ? (IDIOMA === 'en' ? 'ORANGE' : 'LARANJA')
          : (IDIOMA === 'en' ? 'GREEN' : 'VERDE');
      const li = h('li');
      li.append(
        h('span', 'nome', `${tipoNome} · ${ev.pais}`),
        h('span', 'val ' + cor, badge)
      );
      return li;
    }));
  },
  eventosIniciais() { return this.graves(); }
});

/* ===== 10 · ASTEROIDES PRÓXIMOS DA TERRA — NASA NeoWs — 1 h ============ */
const asteroides = criarSensor({
  id: 'asteroides', num: '10', titulo: 'ASTEROIDES PRÓXIMOS (NASA)', fonte: 'NASA JPL NeoWs', freq: 3600,
  e: { objetos: [], vistosIds: new Set() },

  async atualizar() {
    const hoje = new Date().toISOString().slice(0, 10);
    let dados = null;

    try {
      const cache = JSON.parse(localStorage.getItem(CONFIG.chaveNasaNeo) || '{}');
      if (cache.data === hoje && cache.payload) dados = cache.payload;
    } catch (_) { /* ignora */ }

    if (!dados) {
      const url = `https://api.nasa.gov/neo/rest/v1/feed?start_date=${hoje}&end_date=${hoje}&api_key=DEMO_KEY`;
      dados = await fetchSeguro(url, 'json', 13000);
      try {
        localStorage.setItem(CONFIG.chaveNasaNeo, JSON.stringify({ data: hoje, payload: dados }));
      } catch (_) { /* ignora */ }
    }

    const neos = dados?.near_earth_objects?.[hoje] || [];
    const lista = neos.map((o) => {
      const aprox = o.close_approach_data?.[0] || {};
      const distLd = Number(aprox.miss_distance?.lunar) || 999;
      const velKmh = Number(aprox.relative_velocity?.kilometers_per_hour) || 0;
      const diamMax = Number(o.estimated_diameter?.meters?.estimated_diameter_max) || 0;
      const perigoso = Boolean(o.is_potentially_hazardous_asteroid);
      const nome = String(o.name || '').replace(/[()]/g, '').trim();

      if (registrarUnico(this.e.vistosIds, o.id)) {
        this.logar(
          `${nome} · ${U.dec(distLd, 1)} LD · ${U.num(velKmh)} km/h`,
          perigoso || distLd < 5 ? 'alerta' : ''
        );
      }

      return { id: o.id, nome, distLd, velKmh, diamMax, perigoso };
    });

    lista.sort((a, b) => a.distLd - b.distLd);
    this.e.objetos = lista;
  },

  perigosos() { return this.e.objetos.filter((o) => o.perigoso).length; },
  maisPerto() { return this.e.objetos[0] || null; },
  metrica() { return this.e.objetos.length; },
  principal() {
    if (!this.carregado) return { texto: '—', nivel: 'ok' };
    const perto = this.maisPerto();
    const minLd = perto ? perto.distLd : 99;
    return {
      texto: U.num(this.e.objetos.length),
      nivel: minLd < 2 ? 'crit' : (this.perigosos() > 0 || minLd < 10) ? 'warn' : 'ok'
    };
  },
  contexto() {
    if (!this.carregado) return IDIOMA === 'en' ? 'tracking near-Earth objects…' : 'rastreando objetos próximos da Terra…';
    const perto = this.maisPerto();
    const distTxt = perto ? `${U.dec(perto.distLd, 1)} LD` : '—';
    return IDIOMA === 'en'
      ? `objects today · ${this.perigosos()} potentially hazardous · closest: ${distTxt}`
      : `objetos hoje · ${this.perigosos()} potencialmente perigoso(s) · mais perto: ${distTxt}`;
  },
  montarViz() {},
  renderViz(el) {
    if (this.e.objetos.length === 0) {
      el.replaceChildren(h('li', 'vazio', IDIOMA === 'en' ? 'no close approaches today' : 'nenhuma aproximação registrada hoje'));
      return;
    }
    el.replaceChildren(...this.e.objetos.map((o) => {
      const cor = o.distLd < 5 || o.perigoso ? 'verm' : o.distLd < 20 ? 'amb' : 'suave';
      const tag = o.perigoso
        ? (IDIOMA === 'en' ? 'HAZARD' : 'PERIGOSO')
        : (IDIOMA === 'en' ? 'TRACKED' : 'MONITORADO');
      const li = h('li');
      li.append(
        h('span', 'nome', o.nome),
        h('span', 'fonte-tag', tag),
        h('span', 'val ' + cor, `${U.dec(o.distLd, 1)} LD`)
      );
      return li;
    }));
  },
  eventosIniciais() { return this.perigosos(); }
});

/* ===== 11 · NÍVEL DO MAR & RESSACAS COSTEIRAS — NOAA CO-OPS — 30 min ==== */
const ESTACOES_MARE = [
  { id: '8518750', nome: 'New York (Battery), NY' },
  { id: '9414290', nome: 'San Francisco, CA' },
  { id: '8724580', nome: 'Key West, FL' },
  { id: '8771450', nome: 'Galveston, TX' },
  { id: '8443970', nome: 'Boston, MA' },
  { id: '9447130', nome: 'Seattle, WA' },
  { id: '1612340', nome: 'Honolulu, HI' },
  { id: '8720218', nome: 'Mayport (Jacksonville), FL' }
];

const mare = criarSensor({
  id: 'mare', num: '11', titulo: 'NÍVEL DO MAR & RESSACAS', fonte: 'NOAA CO-OPS Tide Gauges', freq: 1800,
  e: { estacoes: [], maxAnomaliaCm: 0, vistos: new Set() },

  async lerEstacao(est) {
    const base = `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?date=latest&station=${est.id}&datum=MLLW&time_zone=gmt&units=metric&format=json`;
    const [obsRes, predRes] = await Promise.all([
      fetchSeguro(`${base}&product=water_level`, 'json', 9000),
      fetchSeguro(`${base}&product=predictions`, 'json', 9000)
    ]);

    const obs = Number(obsRes?.data?.[0]?.v);
    const pred = Number(predRes?.predictions?.[0]?.v);
    if (Number.isNaN(obs) || Number.isNaN(pred)) return null;

    const anomaliaCm = Math.round((obs - pred) * 100);
    return { id: est.id, nome: est.nome, obs, pred, anomaliaCm };
  },

  async atualizar() {
    const resultados = await Promise.allSettled(ESTACOES_MARE.map((e) => this.lerEstacao(e)));
    const lista = [];
    resultados.forEach((r) => {
      if (r.status === 'fulfilled' && r.value) lista.push(r.value);
    });

    if (lista.length === 0) throw new Error('NOAA tide gauges unavailable');

    lista.sort((a, b) => Math.abs(b.anomaliaCm) - Math.abs(a.anomaliaCm));
    this.e.estacoes = lista;
    this.e.maxAnomaliaCm = lista[0].anomaliaCm;

    let novasRessacas = 0;
    const hoje = new Date().toISOString().slice(0, 10);
    lista.forEach((s) => {
      if (Math.abs(s.anomaliaCm) >= 35 && registrarUnico(this.e.vistos, `${s.id}-${hoje}`)) {
        novasRessacas++;
      }
    });

    const top = lista[0];
    this.logar(
      `Sea level surge: ${top.nome} (${U.sinal(top.anomaliaCm, 0)} cm vs astron. tide)`,
      Math.abs(top.anomaliaCm) >= 35 ? 'alerta' : ''
    );
    if (novasRessacas > 0) Caos.registrar(novasRessacas);
  },

  ressacas() { return this.e.estacoes.filter((s) => Math.abs(s.anomaliaCm) >= 25).length; },
  metrica() { return this.e.maxAnomaliaCm; },
  principal() {
    if (!this.carregado || this.e.estacoes.length === 0) return { texto: '—', nivel: 'ok' };
    const abs = Math.abs(this.e.maxAnomaliaCm);
    return {
      texto: `${U.sinal(this.e.maxAnomaliaCm, 0)} cm`,
      nivel: abs >= 45 ? 'crit' : abs >= 25 ? 'warn' : 'ok'
    };
  },
  contexto() {
    if (!this.carregado || this.e.estacoes.length === 0) {
      return IDIOMA === 'en' ? 'reading coastal tide gauges…' : 'lendo marégrafos oceânicos…';
    }
    const top = this.e.estacoes[0];
    return IDIOMA === 'en'
      ? `anomaly vs. predicted tide · ${this.ressacas()} station(s) ≥ ±25 cm · peak: ${top.nome}`
      : `anomalia vs. maré astronômica · ${this.ressacas()} estação(ões) ±25 cm · maior: ${top.nome}`;
  },
  montarViz() {},
  renderViz(el) {
    if (this.e.estacoes.length === 0) {
      el.replaceChildren(h('li', 'vazio', IDIOMA === 'en' ? 'waiting for tide gauges…' : 'aguardando leitura de marégrafos…'));
      return;
    }
    const limite = 60;
    el.replaceChildren(...this.e.estacoes.map((s) => {
      const li = h('li');
      const abs = Math.abs(s.anomaliaCm);
      const pct = U.clamp((abs / limite) * 50, 2, 50);
      const pos = s.anomaliaCm >= 0;
      const cor = abs >= 45 ? 'verm' : abs >= 25 ? 'amb' : 'suave';

      const barra = h('div', 'barra-bi');
      const fill = h('span', 'fill ' + (pos ? 'pos' : 'neg'));
      fill.style.width = pct + '%';
      if (pos) fill.style.left = '50%';
      else fill.style.right = '50%';
      barra.appendChild(fill);

      li.append(
        h('span', 'nome', s.nome),
        barra,
        h('span', 'val ' + cor, `${U.sinal(s.anomaliaCm, 0)} cm`)
      );
      return li;
    }));
  },
  eventosIniciais() { return this.ressacas(); }
});

/* ===== 12 · RADIAÇÃO UV EXTREMA — Open-Meteo — 30 min ================ */
const CIDADES_UV = [
  { nome: 'Quito, EC', lat: -0.1807, lon: -78.4678 },
  { nome: 'La Paz, BO', lat: -16.4897, lon: -68.1193 },
  { nome: 'Cusco, PE', lat: -13.5320, lon: -71.9675 },
  { nome: 'Nairobi, KE', lat: -1.2921, lon: 36.8219 },
  { nome: 'Darwin, AU', lat: -12.4634, lon: 130.8456 },
  { nome: 'Singapore, SG', lat: 1.3521, lon: 103.8198 },
  { nome: 'Brasília, BR', lat: -15.7975, lon: -47.8919 },
  { nome: 'Bogotá, CO', lat: 4.7110, lon: -74.0721 },
  { nome: 'Addis Ababa, ET', lat: 9.0320, lon: 38.7469 },
  { nome: 'Phoenix, US', lat: 33.4484, lon: -112.0740 }
];

const uv = criarSensor({
  id: 'uv', num: '12', titulo: 'RADIAÇÃO UV EXTREMA', fonte: 'Open-Meteo Solar / UV', freq: 1800,
  e: { cidades: [], pico: 0, vistos: new Set() },

  async atualizar() {
    const lats = CIDADES_UV.map((c) => c.lat).join(',');
    const lons = CIDADES_UV.map((c) => c.lon).join(',');
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}&current=uv_index`;
    const dados = await fetchSeguro(url, 'json', 11000);
    const arr = Array.isArray(dados) ? dados : [dados];

    const lista = [];
    arr.forEach((item, i) => {
      const val = Number(item?.current?.uv_index);
      if (!Number.isNaN(val) && CIDADES_UV[i]) {
        lista.push({ nome: CIDADES_UV[i].nome, uv: val });
      }
    });

    if (lista.length === 0) throw new Error('UV data unavailable');

    lista.sort((a, b) => b.uv - a.uv);
    this.e.cidades = lista;
    this.e.pico = lista[0].uv;

    let novosExtremos = 0;
    const hoje = new Date().toISOString().slice(0, 10);
    lista.forEach((c) => {
      if (c.uv >= 11 && registrarUnico(this.e.vistos, `${c.nome}-${hoje}`)) {
        novosExtremos++;
      }
    });

    const top = lista[0];
    this.logar(
      `Peak UV index: ${top.nome} (UV ${U.dec(top.uv, 1)}) · ${this.extremas()} extreme cities`,
      top.uv >= 11 ? 'alerta' : ''
    );
    if (novosExtremos > 0) Caos.registrar(novosExtremos);
  },

  extremas() { return this.e.cidades.filter((c) => c.uv >= 11).length; },
  metrica() { return Number(this.e.pico.toFixed(1)); },
  principal() {
    if (!this.carregado || this.e.cidades.length === 0) return { texto: '—', nivel: 'ok' };
    const p = this.e.pico;
    return {
      texto: `UV ${U.dec(p, 1)}`,
      nivel: p >= 11 ? 'crit' : p >= 8 ? 'warn' : 'ok'
    };
  },
  contexto() {
    if (!this.carregado || this.e.cidades.length === 0) {
      return IDIOMA === 'en' ? 'measuring solar UV index…' : 'medindo índice ultravioleta…';
    }
    const top = this.e.cidades[0];
    return IDIOMA === 'en'
      ? `current solar peak · ${this.extremas()} city(ies) at extreme level (≥ 11) · top: ${top.nome}`
      : `pico solar atual · ${this.extremas()} cidade(s) em nível extremo (≥ 11) · maior: ${top.nome}`;
  },
  montarViz() {},
  renderViz(el) {
    if (this.e.cidades.length === 0) {
      el.replaceChildren(h('li', 'vazio', IDIOMA === 'en' ? 'waiting for UV readings…' : 'aguardando leitura solar…'));
      return;
    }
    const topo = Math.max(14, this.e.pico);
    el.replaceChildren(...this.e.cidades.map((c) => {
      const li = h('li');
      const crit = c.uv >= 11;
      const warn = c.uv >= 8;
      const barra = h('div', 'barra-h');
      const fill = h('span', 'fill ' + (crit ? 'crit' : warn ? 'warn' : 'ok'));
      fill.style.width = U.clamp((c.uv / topo) * 100, 2, 100) + '%';
      barra.appendChild(fill);

      li.append(
        h('span', 'nome', c.nome),
        barra,
        h('span', 'val ' + (crit ? 'verm' : warn ? 'amb' : 'suave'), `UV ${U.dec(c.uv, 1)}`)
      );
      return li;
    }));
  },
  eventosIniciais() { return this.extremas(); }
});

/* ===== 13 · CLIMA POR CIDADE — Open-Meteo Geocoding + Forecast ======== */
function descreverWMO(code) {
  const mapa = {
    0: { pt: 'Céu limpo', en: 'Clear sky' },
    1: { pt: 'Predominantemente limpo', en: 'Mainly clear' },
    2: { pt: 'Parcialmente nublado', en: 'Partly cloudy' },
    3: { pt: 'Encoberto', en: 'Overcast' },
    45: { pt: 'Nevoeiro', en: 'Fog' },
    48: { pt: 'Nevoeiro com geada', en: 'Rime fog' },
    51: { pt: 'Garoa leve', en: 'Light drizzle' },
    53: { pt: 'Garoa moderada', en: 'Moderate drizzle' },
    55: { pt: 'Garoa densa', en: 'Dense drizzle' },
    61: { pt: 'Chuva fraca', en: 'Slight rain' },
    63: { pt: 'Chuva moderada', en: 'Moderate rain' },
    65: { pt: 'Chuva forte', en: 'Heavy rain' },
    71: { pt: 'Neve fraca', en: 'Slight snow' },
    73: { pt: 'Neve moderada', en: 'Moderate snow' },
    75: { pt: 'Neve intensa', en: 'Heavy snow' },
    80: { pt: 'Pancadas de chuva', en: 'Rain showers' },
    81: { pt: 'Pancadas moderadas', en: 'Moderate showers' },
    82: { pt: 'Pancadas violentas', en: 'Violent showers' },
    95: { pt: 'Tempestade', en: 'Thunderstorm' },
    96: { pt: 'Tempestade com granizo', en: 'Thunderstorm with hail' },
    99: { pt: 'Tempestade severa', en: 'Severe thunderstorm' }
  };
  const item = mapa[code] || { pt: 'Condição variável', en: 'Variable weather' };
  return item[IDIOMA] || item.pt;
}

const cidade = criarSensor({
  id: 'cidade', num: '13', titulo: 'CLIMA POR CIDADE', fonte: 'Open-Meteo Geocoding & Weather', freq: 600,
  e: {
    buscada: false,
    buscando: false,
    naoEncontrada: false,
    termo: '',
    nome: '',
    pais: '',
    lat: 0,
    lon: 0,
    temp: 0,
    sensacao: 0,
    umidade: 0,
    vento: 0,
    uv: 0,
    condicaoCode: 0
  },

  async buscarPorNome(query) {
    const q = String(query || '').trim();
    if (!q) return;

    this.e.buscando = true;
    this.e.naoEncontrada = false;
    this.e.termo = q;
    UI.renderCard(this, false);

    try {
      const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=1&language=pt&format=json`;
      const geo = await fetchSeguro(geoUrl, 'json', 10000);
      const lugar = geo?.results?.[0];

      if (!lugar) {
        this.e.buscando = false;
        this.e.buscada = false;
        this.e.naoEncontrada = true;
        UI.renderCard(this, false);
        return;
      }

      this.e.nome = lugar.admin1 ? `${lugar.name}, ${lugar.admin1}` : lugar.name;
      this.e.pais = lugar.country || '';
      this.e.lat = Number(lugar.latitude);
      this.e.lon = Number(lugar.longitude);

      await this.atualizar();
      this.e.buscando = false;
      this.e.buscada = true;
      this.ultima = Date.now();
      this.carregado = true;
      this.registrarHistorico();
      UI.renderCard(this, true);
    } catch (_) {
      this.e.buscando = false;
      this.e.naoEncontrada = true;
      UI.renderCard(this, false);
    }
  },

  async atualizar() {
    if (!this.e.nome && !this.e.lat) return;
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${this.e.lat}&longitude=${this.e.lon}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,uv_index,weather_code`;
    const dados = await fetchSeguro(url, 'json', 10000);
    const cur = dados?.current;
    if (!cur) throw new Error('City weather unavailable');

    this.e.temp = Number(cur.temperature_2m) || 0;
    this.e.sensacao = Number(cur.apparent_temperature) || this.e.temp;
    this.e.umidade = Number(cur.relative_humidity_2m) || 0;
    this.e.vento = Number(cur.wind_speed_10m) || 0;
    this.e.uv = Number(cur.uv_index) || 0;
    this.e.condicaoCode = Number(cur.weather_code) || 0;

    this.logar(`${this.e.nome}: ${U.dec(this.e.temp, 1)} °C · ${descreverWMO(this.e.condicaoCode)}`);
  },

  metrica() { return this.e.buscada ? Number(this.e.temp.toFixed(1)) : NaN; },
  principal() {
    if (this.e.buscando) return { texto: '…', nivel: 'ok' };
    if (!this.e.buscada) return { texto: '—', nivel: 'ok' };
    const t = this.e.temp;
    return {
      texto: `${U.dec(t, 1)} °C`,
      nivel: t >= 38 || t <= 0 ? 'crit' : t >= 33 || t <= 5 ? 'warn' : 'ok'
    };
  },
  contexto() {
    if (this.e.buscando) {
      return IDIOMA === 'en' ? `searching "${this.e.termo}"…` : `buscando "${this.e.termo}"…`;
    }
    if (this.e.naoEncontrada) {
      return IDIOMA === 'en' ? `city "${this.e.termo}" not found` : `cidade "${this.e.termo}" não encontrada`;
    }
    if (!this.e.buscada) {
      return IDIOMA === 'en'
        ? 'type any city above to check live weather…'
        : 'digite qualquer cidade acima para consultar o clima…';
    }
    return `${this.e.nome} (${this.e.pais}) · ${descreverWMO(this.e.condicaoCode)}`;
  },
  montarViz() {},
  renderViz(el) {
    if (!this.e.buscada) {
      el.replaceChildren(
        h('li', 'vazio', IDIOMA === 'en' ? 'enter a city name and click Search' : 'digite o nome da cidade e clique em Buscar')
      );
      return;
    }

    const en = IDIOMA === 'en';
    const linhas = [
      { nome: en ? 'Feels like' : 'Sensação térmica', val: `${U.dec(this.e.sensacao, 1)} °C`, cor: 'suave' },
      { nome: en ? 'Relative humidity' : 'Umidade relativa', val: `${U.num(this.e.umidade)}%`, cor: this.e.umidade < 25 ? 'amb' : 'suave' },
      { nome: en ? 'Wind speed' : 'Velocidade do vento', val: `${U.dec(this.e.vento, 1)} km/h`, cor: this.e.vento >= 50 ? 'verm' : 'suave' },
      { nome: en ? 'UV index' : 'Índice UV', val: `UV ${U.dec(this.e.uv, 1)}`, cor: this.e.uv >= 11 ? 'verm' : this.e.uv >= 8 ? 'amb' : 'suave' }
    ];

    el.replaceChildren(...linhas.map((l) => {
      const li = h('li');
      li.append(h('span', 'nome', l.nome), h('span', 'val ' + l.cor, l.val));
      return li;
    }));
  },
  eventosIniciais() { return 0; }
});

/* ===== 14 · OBSERVATÓRIO DE RAIOS GLOBAIS — 15 min ==================== */
const ZONAS_RAIOS = [
  { nome: 'Catatumbo, VE', lat: 9.35, lon: -71.75 },
  { nome: 'Kifuka, CD', lat: -2.85, lon: 28.05 },
  { nome: 'Singapore, SG', lat: 1.35, lon: 103.82 },
  { nome: 'Manaus, BR', lat: -3.11, lon: -60.02 },
  { nome: 'Tampa, US', lat: 27.95, lon: -82.45 },
  { nome: 'Darwin, AU', lat: -12.46, lon: 130.84 },
  { nome: 'Kolkata, IN', lat: 22.57, lon: 88.36 },
  { nome: 'Kuala Lumpur, MY', lat: 3.13, lon: 101.68 },
  { nome: 'São Paulo, BR', lat: -23.55, lon: -46.63 },
  { nome: 'Kampala, UG', lat: 0.34, lon: 32.58 },
  { nome: 'Bogotá, CO', lat: 4.71, lon: -74.07 },
  { nome: 'Jakarta, ID', lat: -6.20, lon: 106.84 }
];

const raios = criarSensor({
  id: 'raios', num: '14', titulo: 'OBSERVATÓRIO DE RAIOS', fonte: 'Global Convective CAPE Telemetry', freq: 900,
  e: { pontos: [], ativas: 0, estimativaMin: 0 },

  async atualizar() {
    const lats = ZONAS_RAIOS.map((z) => z.lat).join(',');
    const lons = ZONAS_RAIOS.map((z) => z.lon).join(',');
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}&current=cape,weather_code`;
    const dados = await fetchSeguro(url, 'json', 11000);
    const arr = Array.isArray(dados) ? dados : [dados];

    const pts = [];
    let zonasAtivas = 0;
    let descargasMin = 2400;

    arr.forEach((item, i) => {
      const z = ZONAS_RAIOS[i];
      const cape = Number(item?.current?.cape) || 0;
      const code = Number(item?.current?.weather_code) || 0;
      if (!z) return;
      const severo = cape >= 1500 || code >= 95;
      if (cape >= 600 || code >= 80) {
        zonasAtivas++;
        descargasMin += Math.round(cape * 0.25);
        pts.push({ lon: z.lon, lat: z.lat, hot: severo });
      }
    });

    this.e.pontos = pts;
    this.e.ativas = zonasAtivas;
    this.e.estimativaMin = descargasMin;
    this.logar(`${zonasAtivas} zonas convectivas ativas · ~${U.num(descargasMin)} raios/min globais`);
  },

  metrica() { return this.e.estimativaMin; },
  principal() {
    if (!this.carregado) return { texto: '—', nivel: 'ok' };
    return { texto: `${U.num(this.e.estimativaMin)}/m`, nivel: this.e.ativas >= 6 ? 'crit' : this.e.ativas >= 3 ? 'warn' : 'ok' };
  },
  contexto() {
    if (!this.carregado) return IDIOMA === 'en' ? 'detecting global lightning storms…' : 'detectando tempestades elétricas globais…';
    return IDIOMA === 'en'
      ? `estimated global lightning/min · ${this.e.ativas} active storm hotspot(s)`
      : `descargas elétricas/min estimadas · ${this.e.ativas} foco(s) de tempestade`;
  },
  montarViz() {},
  renderViz(el) { renderizarMapaReal(el, this.e.pontos); },
  eventosIniciais() { return 0; }
});

/* ===== 15 · POPULAÇÃO MUNDIAL AO VIVO — 1 s ============================ */
const populacao = criarSensor({
  id: 'populacao', num: '15', titulo: 'POPULAÇÃO MUNDIAL AO VIVO', fonte: 'UN DESA / World Population Clock', freq: 3600,
  e: { inicioSessao: Date.now(), nascimentosSessao: 0, mortesSessao: 0 },

  calcularAtual() {
    const refTs = Date.UTC(2026, 0, 1, 0, 0, 0);
    const segDesdeRef = (Date.now() - refTs) / 1000;
    const total = Math.floor(8215000000 + segDesdeRef * 2.25);
    const segSessao = Math.max(0, (Date.now() - this.e.inicioSessao) / 1000);
    this.e.nascimentosSessao = Math.floor(segSessao * 4.3);
    this.e.mortesSessao = Math.floor(segSessao * 2.05);
    return total;
  },

  async atualizar() {
    this.logar(`População mundial: ${U.num(this.calcularAtual())} habitantes`);
  },

  metrica() { return this.calcularAtual(); },
  principal() {
    return { texto: U.num(this.calcularAtual()), nivel: 'ok' };
  },
  contexto() {
    return IDIOMA === 'en'
      ? 'live global human population estimate (+2.25 people/sec)'
      : 'estimativa da população humana agora (+2,25 pessoas/seg)';
  },
  montarViz() {},
  renderViz(el) {
    const en = IDIOMA === 'en';
    const saldo = this.e.nascimentosSessao - this.e.mortesSessao;
    const linhas = [
      { nome: en ? 'Births since you opened page' : 'Nascimentos desde que você abriu', val: `+${U.num(this.e.nascimentosSessao)}`, cor: 'suave' },
      { nome: en ? 'Deaths since you opened page' : 'Óbitos desde que você abriu', val: `−${U.num(this.e.mortesSessao)}`, cor: 'amb' },
      { nome: en ? 'Net human growth (session)' : 'Crescimento líquido (sessão)', val: `+${U.num(saldo)}`, cor: 'suave' },
      { nome: en ? 'Global birth rate' : 'Taxa mundial de nascimentos', val: '4,3 / seg', cor: 'suave' }
    ];
    el.replaceChildren(...linhas.map((l) => {
      const li = h('li');
      li.append(h('span', 'nome', l.nome), h('span', 'val ' + l.cor, l.val));
      return li;
    }));
  },
  eventosIniciais() { return 0; }
});

/* ===== 16 · ONDAS, SWELL & MARÉ — Open-Meteo Marine — 1 h ============= */
const PRAIAS_SWELL = [
  { nome: 'Nazaré, PT', lat: 39.6012, lon: -9.0715 },
  { nome: 'Pipeline, HI', lat: 21.6656, lon: -158.0539 },
  { nome: 'Florianópolis, BR', lat: -27.5969, lon: -48.4450 },
  { nome: 'Santos, BR', lat: -23.9822, lon: -46.3089 },
  { nome: 'Rio de Janeiro, BR', lat: -22.9847, lon: -43.2048 },
  { nome: 'Gold Coast, AU', lat: -28.0167, lon: 153.4333 },
  { nome: 'Jeffreys Bay, ZA', lat: -34.0507, lon: 24.9102 },
  { nome: 'Teahupo’o, PF', lat: -17.8667, lon: -149.2500 }
];

const ondas = criarSensor({
  id: 'ondas', num: '16', titulo: 'ONDAS, SWELL & MARÉ', fonte: 'Open-Meteo Marine Telemetry', freq: 3600,
  e: { lista: [], maiorOnda: 0 },

  async atualizar() {
    const lats = PRAIAS_SWELL.map((p) => p.lat).join(',');
    const lons = PRAIAS_SWELL.map((p) => p.lon).join(',');
    const url = `https://marine-api.open-meteo.com/v1/marine?latitude=${lats}&longitude=${lons}&current=wave_height,wave_period`;
    const dados = await fetchSeguro(url, 'json', 11000);
    const arr = Array.isArray(dados) ? dados : [dados];

    const lista = [];
    arr.forEach((item, i) => {
      const hOnda = Number(item?.current?.wave_height);
      const periodo = Number(item?.current?.wave_period);
      if (!Number.isNaN(hOnda) && PRAIAS_SWELL[i]) {
        lista.push({
          nome: PRAIAS_SWELL[i].nome,
          altura: hOnda,
          periodo: Number.isNaN(periodo) ? 0 : Math.round(periodo)
        });
      }
    });

    if (lista.length === 0) throw new Error('Marine data unavailable');
    lista.sort((a, b) => b.altura - a.altura);
    this.e.lista = lista;
    this.e.maiorOnda = lista[0].altura;

    const top = lista[0];
    this.logar(`Maior swell: ${top.nome} (${U.dec(top.altura, 1)} m · ${top.periodo}s)`, top.altura >= 4.0 ? 'alerta' : '');
  },

  metrica() { return Number(this.e.maiorOnda.toFixed(1)); },
  principal() {
    if (!this.carregado || this.e.lista.length === 0) return { texto: '—', nivel: 'ok' };
    const m = this.e.maiorOnda;
    return { texto: `${U.dec(m, 1)} m`, nivel: m >= 4.5 ? 'crit' : m >= 2.8 ? 'warn' : 'ok' };
  },
  contexto() {
    if (!this.carregado || this.e.lista.length === 0) return IDIOMA === 'en' ? 'measuring ocean swell…' : 'medindo altura de ondulação…';
    const top = this.e.lista[0];
    return IDIOMA === 'en'
      ? `max coastal swell · peak: ${top.nome} (${top.periodo}s period)`
      : `maior ondulação costeira · pico: ${top.nome} (período ${top.periodo}s)`;
  },
  montarViz() {},
  renderViz(el) {
    if (this.e.lista.length === 0) {
      el.replaceChildren(h('li', 'vazio', IDIOMA === 'en' ? 'waiting for marine buoys…' : 'aguardando bóias oceânicas…'));
      return;
    }
    el.replaceChildren(...this.e.lista.map((p) => {
      const cor = p.altura >= 4.5 ? 'verm' : p.altura >= 2.8 ? 'amb' : 'suave';
      const li = h('li');
      li.append(
        h('span', 'nome', p.nome),
        h('span', 'fonte-tag', `${p.periodo}s`),
        h('span', 'val ' + cor, `${U.dec(p.altura, 1)} m`)
      );
      return li;
    }));
  },
  eventosIniciais() { return 0; }
});

/* ===== 17 · RÁDIO · SINTONIZADOR LIVRE & ESTAÇÕES AO VIVO ============== */
const ESTACOES_MUSICA = [
  { nome: 'Lofi Beats 24/7', genero: 'Chill / Study', dial: '18%', url: 'https://play.streamafrica.net/lofiradio' },
  { nome: 'SomaFM · Groove Salad', genero: 'Ambient / Downtempo', dial: '42%', url: 'https://ice1.somafm.com/groovesalad-128-mp3' },
  { nome: 'SomaFM · Drone Zone', genero: 'Space / Deep', dial: '66%', url: 'https://ice1.somafm.com/dronezone-128-mp3' },
  { nome: 'Jazz24 Live', genero: 'Jazz / Instrumental', dial: '86%', url: 'https://live.wostreaming.net/direct/ppm-jazz24mp3-ibc1' }
];

const radiomusica = criarSensor({
  id: 'radiomusica', num: '17', titulo: 'RÁDIO · SINTONIZADOR AO VIVO', fonte: 'Sintonizador Livre + SomaFM / Jazz24', freq: 3600,
  e: {
    idx: 0,
    tocando: false,
    erroAudio: false,
    customAtiva: false,
    customNome: '',
    customUrl: '',
    audio: null
  },

  garantirAudio() {
    if (!this.e.audio) {
      this.e.audio = new Audio();
      this.e.audio.preload = 'none';
      this.e.audio.addEventListener('error', () => {
        this.e.erroAudio = true;
        this.e.tocando = false;
        UI.renderCard(this, false);
      });
    }
    return this.e.audio;
  },

  atualizarAgulha(porcentagem) {
    const agulha = document.getElementById('radio-agulha');
    if (agulha) agulha.style.left = porcentagem;
  },

  tocarUrl(url, titulo, dialPos = '50%', ehCustom = false) {
    const audio = this.garantirAudio();
    this.e.erroAudio = false;
    this.e.customAtiva = ehCustom;
    if (ehCustom) {
      this.e.customUrl = url;
      this.e.customNome = titulo;
    }
    this.atualizarAgulha(dialPos);
    audio.src = url;
    audio.play().then(() => {
      this.e.tocando = true;
      this.logar(`Sintonizado: ${titulo}`);
      UI.renderCard(this, false);
    }).catch(() => {
      this.e.erroAudio = true;
      this.e.tocando = false;
      UI.renderCard(this, false);
    });
    UI.renderCard(this, false);
  },

  sintonizarCustom(urlDigitada) {
    const u = String(urlDigitada || '').trim();
    if (!u) return;
    let titulo = 'Rádio Personalizada';
    try {
      const parsed = new URL(u);
      titulo = parsed.hostname.replace(/^www\./, '');
    } catch (_) { /* mantém padrão */ }
    this.tocarUrl(u, titulo, '52%', true);
  },

  alternar(novoIdx = null) {
    const audio = this.garantirAudio();
    if (novoIdx !== null && (novoIdx !== this.e.idx || this.e.customAtiva)) {
      this.e.idx = novoIdx;
      this.e.customAtiva = false;
      this.e.tocando = false;
    }
    const est = ESTACOES_MUSICA[this.e.idx];
    if (this.e.tocando) {
      audio.pause();
      audio.src = '';
      this.e.tocando = false;
      UI.renderCard(this, false);
    } else {
      this.tocarUrl(est.url, est.nome, est.dial, false);
    }
  },

  async atualizar() {},
  metrica() { return ESTACOES_MUSICA.length; },
  principal() {
    return { texto: this.e.tocando ? 'ON AIR' : 'STANDBY', nivel: 'ok' };
  },
  contexto() {
    if (this.e.erroAudio) {
      return IDIOMA === 'en'
        ? 'stream unavailable · check URL or pick another station'
        : 'stream indisponível · verifique o link ou escolha outra estação';
    }
    if (this.e.customAtiva) {
      return `${this.e.customNome} · ${IDIOMA === 'en' ? 'custom stream' : 'sintonia personalizada'}`;
    }
    const est = ESTACOES_MUSICA[this.e.idx];
    return `${est.nome} · ${est.genero}`;
  },
  montarViz(el) {
    this.atualizarAgulha(ESTACOES_MUSICA[0].dial);
    this.renderViz(el);
  },
  renderViz(el) {
    el.replaceChildren();
    const lista = h('div', 'radio-lista');
    ESTACOES_MUSICA.forEach((est, i) => {
      const selecionada = !this.e.customAtiva && i === this.e.idx;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = selecionada ? 'radio-item ativo' : 'radio-item';
      btn.textContent = `${selecionada && this.e.tocando ? '■' : '▶'} ${est.nome}`;
      btn.addEventListener('click', () => this.alternar(i));
      lista.appendChild(btn);
    });
    el.appendChild(lista);
  },
  eventosIniciais() { return 0; }
});

/* ===== 18 · QUEDAS DE INTERNET & BLECAPES — Georgia Tech IODA — 10 min === */
const internet = criarSensor({
  id: 'internet', num: '18', titulo: 'QUEDAS DE INTERNET (IODA)', fonte: 'Georgia Tech IODA · BGP & Active Probing', freq: 600,
  e: { alertas: [], vistos: new Set() },

  async atualizar() {
    const agoraSec = Math.floor(Date.now() / 1000);
    const ontemSec = agoraSec - 24 * 3600;
    const url = `https://api.ioda.inetintel.cc.gatech.edu/v2/outages/alerts?from=${ontemSec}&until=${agoraSec}&limit=25`;
    const dados = await fetchSeguro(url, 'json', 11000);
    const raw = Array.isArray(dados?.data) ? dados.data : [];

    const lista = [];
    let novos = 0;

    raw.forEach((a) => {
      const entidade = a.entity?.name || a.entity?.code || 'Rede Global';
      const tipo = a.entity?.type || 'country';
      const nivel = String(a.level || 'warning').toLowerCase();
      const datasource = a.datasource || 'bgp';
      const id = `${entidade}-${a.time || Math.random()}`;

      lista.push({ id, entidade, tipo, nivel, datasource });

      if (registrarUnico(this.e.vistos, id)) {
        novos++;
        this.logar(
          `IODA [${nivel.toUpperCase()}]: ${entidade} (${datasource})`,
          nivel === 'critical' ? 'alerta' : ''
        );
      }
    });

    this.e.alertas = lista;
    if (novos > 0) Caos.registrar(Math.min(3, novos));
  },

  criticos() { return this.e.alertas.filter((a) => a.nivel === 'critical').length; },
  metrica() { return this.e.alertas.length; },
  principal() {
    if (!this.carregado) return { texto: '—', nivel: 'ok' };
    const n = this.e.alertas.length;
    return {
      texto: U.num(n),
      nivel: this.criticos() > 0 ? 'crit' : n >= 5 ? 'warn' : 'ok'
    };
  },
  contexto() {
    if (!this.carregado) return IDIOMA === 'en' ? 'monitoring global BGP routing…' : 'monitorando roteamento BGP global…';
    return IDIOMA === 'en'
      ? `connectivity anomalies in 24h · ${this.criticos()} critical blackout(s)`
      : `anomalias de conectividade em 24h · ${this.criticos()} blecaute(s) crítico(s)`;
  },
  montarViz() {},
  renderViz(el) {
    if (this.e.alertas.length === 0) {
      el.replaceChildren(h('li', 'vazio', IDIOMA === 'en' ? 'no major BGP outages detected' : 'nenhuma queda grave de BGP detectada'));
      return;
    }
    el.replaceChildren(...this.e.alertas.slice(0, 15).map((a) => {
      const crit = a.nivel === 'critical';
      const li = h('li');
      li.append(
        h('span', 'fonte-tag', a.datasource.toUpperCase()),
        h('span', 'nome', a.entidade),
        h('span', 'val ' + (crit ? 'verm' : 'amb'), crit ? 'CRÍTICO' : 'ALERTA')
      );
      return li;
    }));
  },
  eventosIniciais() { return this.criticos(); }
});

/* ===== 19 · NÍVEL & VAZÃO DOS RIOS — Open-Meteo Flood (GloFAS) — 1 h ==== */
const BACIAS_RIOS = [
  { nome: 'Rio Amazonas (Manaus)', lat: -3.13, lon: -59.98 },
  { nome: 'Rio Paraná (Foz)', lat: -25.51, lon: -54.58 },
  { nome: 'Rio Guaíba (Porto Alegre)', lat: -30.03, lon: -51.23 },
  { nome: 'Rio Nilo (Cairo)', lat: 30.04, lon: 31.23 },
  { nome: 'Rio Mississippi (Baton Rouge)', lat: 30.45, lon: -91.19 },
  { nome: 'Rio Danúbio (Budapeste)', lat: 47.49, lon: 19.04 },
  { nome: 'Rio Ganges (Varanasi)', lat: 25.31, lon: 83.01 },
  { nome: 'Rio Yangtzé (Wuhan)', lat: 30.59, lon: 114.30 }
];

const rios = criarSensor({
  id: 'rios', num: '19', titulo: 'NÍVEL & VAZÃO DOS RIOS', fonte: 'Open-Meteo Flood / GloFAS', freq: 3600,
  e: { bacias: [], maiorVazao: 0 },

  async atualizar() {
    const lats = BACIAS_RIOS.map((b) => b.lat).join(',');
    const lons = BACIAS_RIOS.map((b) => b.lon).join(',');
    const url = `https://flood-api.open-meteo.com/v1/flood?latitude=${lats}&longitude=${lons}&daily=river_discharge,river_discharge_mean&forecast_days=1`;
    const dados = await fetchSeguro(url, 'json', 12000);
    const arr = Array.isArray(dados) ? dados : [dados];

    const lista = [];
    arr.forEach((item, i) => {
      const atual = Number(item?.daily?.river_discharge?.[0]);
      const media = Number(item?.daily?.river_discharge_mean?.[0]);
      if (!Number.isNaN(atual) && BACIAS_RIOS[i]) {
        const razao = media > 0 ? (atual / media) : 1;
        lista.push({
          nome: BACIAS_RIOS[i].nome,
          vazao: Math.round(atual),
          razao
        });
      }
    });

    if (lista.length === 0) throw new Error('Flood GloFAS unavailable');

    lista.sort((a, b) => b.razao - a.razao);
    this.e.bacias = lista;
    this.e.maiorVazao = lista[0].vazao;

    const top = lista[0];
    this.logar(
      `GloFAS peak: ${top.nome} (${U.num(top.vazao)} m³/s · ${U.dec(top.razao, 1)}x normal)`,
      top.razao >= 1.8 ? 'alerta' : ''
    );
  },

  cheias() { return this.e.bacias.filter((b) => b.razao >= 1.5).length; },
  metrica() { return this.cheias(); },
  principal() {
    if (!this.carregado || this.e.bacias.length === 0) return { texto: '—', nivel: 'ok' };
    const c = this.cheias();
    return {
      texto: U.num(c),
      nivel: c >= 3 ? 'crit' : c >= 1 ? 'warn' : 'ok'
    };
  },
  contexto() {
    if (!this.carregado || this.e.bacias.length === 0) {
      return IDIOMA === 'en' ? 'reading river basins (GloFAS)…' : 'lendo vazão das bacias hidrográficas…';
    }
    const top = this.e.bacias[0];
    return IDIOMA === 'en'
      ? `major basins above 1.5x normal discharge · peak: ${top.nome}`
      : `grandes bacias acima de 1,5x a vazão normal · maior: ${top.nome}`;
  },
  montarViz() {},
  renderViz(el) {
    if (this.e.bacias.length === 0) {
      el.replaceChildren(h('li', 'vazio', IDIOMA === 'en' ? 'waiting for GloFAS data…' : 'aguardando telemetria fluvial…'));
      return;
    }
    el.replaceChildren(...this.e.bacias.map((b) => {
      const cor = b.razao >= 2.0 ? 'verm' : b.razao >= 1.5 ? 'amb' : 'suave';
      const li = h('li');
      li.append(
        h('span', 'nome', b.nome),
        h('span', 'fonte-tag', `${U.dec(b.razao, 1)}x`),
        h('span', 'val ' + cor, `${U.num(b.vazao)} m³/s`)
      );
      return li;
    }));
  },
  eventosIniciais() { return this.cheias(); }
});

/* Lista ordenada dos 19 sensores ativos */
const SENSORES = [
  globo, bolsa, microtremores, incendios, temperaturas, anomalias,
  manchetes, ar, desastres, asteroides, mare, uv, cidade,
  raios, populacao, ondas, radiomusica, internet, rios
];
const POR_ID = Object.fromEntries(SENSORES.map((s) => [s.id, s]));

/* ---------------------------------------------------------------------
   7. SISMÓGRAFO DO TOPO
   --------------------------------------------------------------------- */
const Sismografo = {
  N: 120,
  pts: Array(120).fill(0),
  energia: 0,
  t: 0,
  poly: null,

  iniciar() {
    this.poly = document.querySelector('#sismo polyline');
    const passo = () => {
      this.t += 0.22;
      const ruido = (Math.random() - 0.5) * 2.2;
      const sinal = Math.sin(this.t) * (1.2 + this.energia * 16) + ruido * (1 + this.energia * 5);
      this.pts.push(sinal);
      this.pts.shift();
      this.energia *= 0.94;
      this.desenhar();
      requestAnimationFrame(passo);
    };
    requestAnimationFrame(passo);
  },

  pico(n = 1) {
    this.energia = Math.min(2.6, this.energia + 0.55 + Math.min(n, 10) * 0.14);
  },

  desenhar() {
    const dx = 1000 / (this.N - 1);
    let str = '';
    for (let i = 0; i < this.N; i++) {
      const y = U.clamp(50 - this.pts[i], 4, 96);
      str += `${(i * dx).toFixed(1)},${y.toFixed(1)} `;
    }
    this.poly.setAttribute('points', str);
  }
};

/* ---------------------------------------------------------------------
   8. INTERFACE, FILTROS UX, AJUDA (?) E ROTEAMENTO
   --------------------------------------------------------------------- */
const UI = {
  cards: {},
  ativo: null,
  ultimaGeral: 0,
  filtroAtivo: 'todos',
  termoBuscaGlobal: '',

  iniciar() {
    SENSORES.forEach((s) => {
      const el = document.querySelector(`.card[data-sensor="${s.id}"]`);
      if (!el) return;

      // Injeta botão de Ajuda (?) no topo do card + caixa explicativa (Item 3)
      const topoEl = el.querySelector('.card-topo');
      const btnAjuda = document.createElement('button');
      btnAjuda.type = 'button';
      btnAjuda.className = 'btn-ajuda';
      btnAjuda.textContent = '?';
      btnAjuda.title = 'O que este sensor monitora?';

      const boxAjuda = h('div', 'card-ajuda-box');
      boxAjuda.hidden = true;
      boxAjuda.textContent = AJUDA_SENSORES[s.id]?.[IDIOMA] || '';

      btnAjuda.addEventListener('click', (ev) => {
        ev.stopPropagation();
        boxAjuda.hidden = !boxAjuda.hidden;
        btnAjuda.classList.toggle('ativo', !boxAjuda.hidden);
      });

      if (topoEl) {
        topoEl.appendChild(btnAjuda);
        topoEl.insertAdjacentElement('afterend', boxAjuda);
      }

      const vizEl = el.querySelector('[data-campo="viz"]');
      this.cards[s.id] = {
        el,
        h2: el.querySelector('h2'),
        ajudaBox: boxAjuda,
        valor: el.querySelector('[data-campo="valor"]'),
        contexto: el.querySelector('[data-campo="contexto"]'),
        viz: vizEl,
        tempo: el.querySelector('[data-campo="tempo"]'),
        ver: el.querySelector('.ver')
      };
      s.montarViz(vizEl);
    });

    // Alternador Globo 3D vs Satélite Google Maps (Sensor 01)
    document.querySelectorAll('.btn-earth-tab').forEach((btn) => {
      btn.addEventListener('click', () => globo.alternarModo(btn.dataset.earthMode));
    });

    // Filtros Rápidos no Topo (Item 1)
    document.querySelectorAll('.btn-filtro').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.filtroAtivo = btn.dataset.filtro || 'todos';
        document.querySelectorAll('.btn-filtro').forEach((b) => {
          b.classList.toggle('ativo', b === btn);
        });
        this.aplicarFiltros();
      });
    });

    // Busca Global nos Cards (Item 2)
    const inpGlobal = document.getElementById('input-busca-global');
    if (inpGlobal) {
      inpGlobal.addEventListener('input', () => {
        this.termoBuscaGlobal = inpGlobal.value.trim().toLowerCase();
        this.aplicarFiltros();
      });
    }

    // Modo TV / Tela Cheia (Item 9)
    const btnTv = document.getElementById('btn-tela-cheia');
    if (btnTv) {
      btnTv.addEventListener('click', () => {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen?.().catch(() => {});
        } else {
          document.exitFullscreen?.().catch(() => {});
        }
      });
      document.addEventListener('fullscreenchange', () => {
        btnTv.textContent = document.fullscreenElement ? T('sairTelaCheia') : T('telaCheia');
      });
    }

    // Formulário de busca no Google Notícias (Sensor 07)
    const formGoogleNews = document.getElementById('form-google-news');
    const inputGoogleNews = document.getElementById('input-google-news');
    if (formGoogleNews && inputGoogleNews) {
      formGoogleNews.addEventListener('submit', (ev) => {
        ev.preventDefault();
        manchetes.buscarAssunto(inputGoogleNews.value);
      });
    }

    // Formulário de busca por cidade (Sensor 13)
    const formCidade = document.getElementById('form-cidade');
    const inputCidade = document.getElementById('input-cidade');
    if (formCidade && inputCidade) {
      formCidade.addEventListener('submit', (ev) => {
        ev.preventDefault();
        cidade.buscarPorNome(inputCidade.value);
      });
    }

    // Formulário de sintonizador livre de rádio (Sensor 17)
    const formRadioCustom = document.getElementById('form-radio-custom');
    const inputRadioUrl = document.getElementById('input-radio-url');
    if (formRadioCustom && inputRadioUrl) {
      formRadioCustom.addEventListener('submit', (ev) => {
        ev.preventDefault();
        radiomusica.sintonizarCustom(inputRadioUrl.value);
      });
    }

    // Seletor de cores / tema tático no topo
    aplicarTema(TEMA);
    document.querySelectorAll('.btn-tema').forEach((btn) => {
      btn.addEventListener('click', () => aplicarTema(btn.dataset.temaBtn));
    });

    // Seletor de idioma PT / EN
    document.querySelectorAll('.btn-lang').forEach((btn) => {
      btn.addEventListener('click', () => this.mudarIdioma(btn.dataset.lang));
    });
    this.aplicarIdioma();
  },

  aplicarFiltros() {
    let visiveis = 0;
    SENSORES.forEach((s) => {
      const c = this.cards[s.id];
      if (!c) return;
      const el = c.el;
      const nivel = el.dataset.nivel || 'ok';
      const cats = (el.dataset.cat || '').split(' ');

      let passaCat = true;
      if (this.filtroAtivo === 'alertas') {
        passaCat = (nivel === 'crit' || nivel === 'warn');
      } else if (this.filtroAtivo === 'terra') {
        passaCat = cats.includes('terra');
      } else if (this.filtroAtivo === 'interativos') {
        passaCat = cats.includes('interativos');
      }

      let passaBusca = true;
      if (this.termoBuscaGlobal) {
        const textoCard = el.textContent.toLowerCase();
        passaBusca = textoCard.includes(this.termoBuscaGlobal);
      }

      const mostrar = passaCat && passaBusca;
      el.hidden = !mostrar;
      if (mostrar) visiveis++;
    });

    const msgVazio = document.getElementById('msg-vazio-filtro');
    if (msgVazio) msgVazio.hidden = visiveis > 0;
  },

  atualizarDestaqueMomento() {
    const banner = document.getElementById('banner-destaque');
    const txtEl = document.getElementById('destaque-texto');
    if (!banner || !txtEl) return;

    // Prioriza sensores em estado crítico ou atenção
    let escolhido = SENSORES.find((s) => s.carregado && s.principal().nivel === 'crit');
    if (!escolhido) {
      escolhido = SENSORES.find((s) => s.carregado && s.principal().nivel === 'warn');
    }
    if (!escolhido) {
      escolhido = SENSORES.find((s) => s.carregado && s.id === 'desastres') || SENSORES[0];
    }

    if (escolhido && escolhido.carregado) {
      const p = escolhido.principal();
      banner.hidden = false;
      banner.href = `#/sensor/${escolhido.id}`;
      banner.dataset.nivel = p.nivel;
      txtEl.textContent = `${escolhido.nomeExibicao()}: ${p.texto} — ${escolhido.contexto()}`;
    }
  },

  mudarIdioma(lang) {
    if (lang !== 'pt' && lang !== 'en') return;
    IDIOMA = lang;
    try { localStorage.setItem(CONFIG.chaveIdioma, lang); } catch (_) { /* ignora */ }
    this.aplicarIdioma();
    SENSORES.forEach((s) => this.renderCard(s, false));
    if (this.ativo) this.renderDetalhe(this.ativo);
  },

  aplicarIdioma() {
    document.documentElement.lang = IDIOMA === 'en' ? 'en' : 'pt-BR';
    document.querySelectorAll('.btn-lang').forEach((b) => {
      b.classList.toggle('ativo', b.dataset.lang === IDIOMA);
    });

    const setTxt = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };

    setTxt('txt-aovivo', T('aoVivo'));
    setTxt('txt-badge-criador', T('badgeCriador'));
    setTxt('titulo-principal', T('tituloPrincipal'));
    setTxt('lema-principal', T('lema'));
    setTxt('destaque-tag', T('destaqueTag'));
    setTxt('filtro-todos', T('filtroTodos'));
    setTxt('filtro-alertas', T('filtroAlertas'));
    setTxt('filtro-terra', T('filtroTerra'));
    setTxt('filtro-interativos', T('filtroInterativos'));
    setTxt('msg-vazio-filtro', T('vazioFiltro'));
    setTxt('tab-earth-globo', T('tabGlobo'));
    setTxt('tab-earth-maps', T('tabMaps'));
    setTxt('btn-voltar', T('voltar'));
    setTxt('lbl-fonte', T('fonte'));
    setTxt('lbl-freq', T('frequencia'));
    setTxt('lbl-ultima', T('ultimaLeitura'));
    setTxt('lbl-historico', T('historicoDado'));
    setTxt('lbl-registro', T('registroEventos'));
    setTxt('caos-rotulo', T('termometroCaos'));
    setTxt('caos-legenda', T('legendaCaos'));
    setTxt('txt-feito-por', T('feitoPor'));

    const btnTv = document.getElementById('btn-tela-cheia');
    if (btnTv) btnTv.textContent = document.fullscreenElement ? T('sairTelaCheia') : T('telaCheia');

    const inpGlobal = document.getElementById('input-busca-global');
    if (inpGlobal) inpGlobal.placeholder = T('buscaGlobal');

    const inpCidade = document.getElementById('input-cidade');
    if (inpCidade) inpCidade.placeholder = T('placeholderCidade');
    setTxt('btn-cidade', T('buscar'));

    const inpGoogle = document.getElementById('input-google-news');
    if (inpGoogle) inpGoogle.placeholder = T('placeholderGoogleNews');
    setTxt('btn-google-news', T('buscar'));

    const inpRadio = document.getElementById('input-radio-url');
    if (inpRadio) inpRadio.placeholder = T('placeholderRadio');
    setTxt('btn-radio-sintonizar', T('ouvir'));

    SENSORES.forEach((s) => {
      const c = this.cards[s.id];
      if (!c) return;
      if (c.h2) c.h2.textContent = s.nomeExibicao();
      if (c.ver) c.ver.textContent = T('verDetalhes');
      if (c.ajudaBox) c.ajudaBox.textContent = AJUDA_SENSORES[s.id]?.[IDIOMA] || '';
    });

    Visitantes.atualizarTexto();
    this.atualizarDestaqueMomento();
    this.atualizarTempos();
  },

  renderCard(s, pulsar = false) {
    const c = this.cards[s.id];
    if (!c) return;
    const p = s.principal();
    c.el.dataset.nivel = p.nivel;
    c.valor.textContent = p.texto;
    c.contexto.textContent = s.contexto();

    if (s.id === 'cidade' && !s.e.buscada && !s.e.buscando) {
      c.tempo.textContent = T('aguardandoBusca');
    } else if (s.id === 'populacao' || s.id === 'radiomusica') {
      c.tempo.textContent = T('aoVivo');
    } else {
      c.tempo.textContent = s.ultima ? T('atualizado') + U.relativo(s.ultima) : T('sincronizando');
    }

    s.renderViz(c.viz);
    if (pulsar) {
      c.el.classList.remove('pulso');
      void c.el.offsetWidth;
      c.el.classList.add('pulso');
    }
    this.atualizarDestaqueMomento();
    this.aplicarFiltros();
    if (this.ativo === s.id) this.renderDetalhe(s.id);
  },

  atualizarTempos() {
    document.getElementById('relogio').textContent = U.hora(Date.now());
    SENSORES.forEach((s) => {
      const c = this.cards[s.id];
      if (!c) return;
      if (s.id === 'cidade' && !s.e.buscada && !s.e.buscando) {
        c.tempo.textContent = T('aguardandoBusca');
      } else if (s.id === 'populacao' || s.id === 'radiomusica') {
        c.tempo.textContent = T('aoVivo');
      } else {
        c.tempo.textContent = s.ultima ? T('atualizado') + U.relativo(s.ultima) : T('sincronizando');
      }
    });
    document.getElementById('ultima').textContent =
      T('ultimaGeral') + (this.ultimaGeral ? `${U.hora(this.ultimaGeral)} (${U.relativo(this.ultimaGeral)})` : T('sincronizando'));
    if (this.ativo) {
      const s = POR_ID[this.ativo];
      document.getElementById('det-ultima').textContent =
        s.ultima ? `${U.hora(s.ultima)} · ${U.relativo(s.ultima)}` : T('sincronizando');
    }
  },

  abrir(id) {
    const s = POR_ID[id];
    if (!s) return this.fechar();
    this.ativo = id;
    document.getElementById('vista-home').hidden = true;
    document.getElementById('vista-detalhe').hidden = false;
    this.renderDetalhe(id);
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  },

  fechar() {
    this.ativo = null;
    document.getElementById('vista-detalhe').hidden = true;
    document.getElementById('vista-home').hidden = false;
  },

  renderDetalhe(id) {
    const s = POR_ID[id];
    const p = s.principal();
    const det = document.getElementById('detalhe');
    det.dataset.nivel = p.nivel;
    document.getElementById('det-num').textContent = s.num;
    document.getElementById('det-titulo').textContent = s.nomeExibicao();
    document.getElementById('det-fonte').textContent = s.fonte;
    document.getElementById('det-freq').textContent = T('aCada') + U.freq(s.freq);
    document.getElementById('det-ultima').textContent =
      s.ultima ? `${U.hora(s.ultima)} · ${U.relativo(s.ultima)}` : T('sincronizando');
    document.getElementById('det-valor').textContent = p.texto;
    document.getElementById('det-contexto').textContent = s.contexto();

    const detGloboBox = document.getElementById('det-globo-box');
    if (detGloboBox) {
      if (id === 'globo') {
        detGloboBox.hidden = false;
        detGloboBox.className = 'det-earth-duplo';
        detGloboBox.replaceChildren();

        const colGlobo = h('div', 'det-globo-grande');
        const colMaps = h('div', 'det-globo-grande');
        const iframe = document.createElement('iframe');
        iframe.className = 'gmaps-iframe';
        iframe.src = globo.urlGoogleMaps(globo.e.mapLat, globo.e.mapLng, globo.e.mapZoom);
        iframe.loading = 'lazy';
        iframe.title = 'Google Maps Satélite Expandido';
        colMaps.appendChild(iframe);

        detGloboBox.append(colGlobo, colMaps);
        requestAnimationFrame(() => {
          const w = colGlobo.clientWidth || 480;
          globo.e.instanciaDetalhe = globo.criarInstanciaTerra(colGlobo, w, 400, 1.85);
        });
      } else {
        detGloboBox.hidden = true;
        detGloboBox.replaceChildren();
        globo.e.instanciaDetalhe = null;
      }
    }

    this.desenharGrafico(document.getElementById('det-grafico'), s.historico);

    const logEl = document.getElementById('det-log');
    if (s.log.length === 0) {
      logEl.replaceChildren(h('li', 'vazio', T('sincronizando')));
    } else {
      logEl.replaceChildren(...s.log.map((item) => {
        const li = h('li', item.nivel);
        li.append(h('span', 'ts', U.hora(item.ts)), h('span', 'nome', item.texto));
        return li;
      }));
    }
  },

  desenharGrafico(el, serie) {
    el.replaceChildren();
    const W = 600, H = 160, pL = 52, pR = 14, pT = 18, pB = 22;
    const gW = W - pL - pR, gH = H - pT - pB;

    if (serie.length < 2) {
      const txt = svg('text', { x: W / 2, y: H / 2, 'text-anchor': 'middle', class: 'rotulo' });
      txt.textContent = T('aguardandoLeituras');
      el.appendChild(txt);
      return;
    }

    let min = Math.min(...serie), max = Math.max(...serie);
    if (min === max) { min -= 1; max += 1; }
    const pad = (max - min) * 0.1;
    min -= pad; max += pad;

    const xOf = (i) => pL + (i / (serie.length - 1)) * gW;
    const yOf = (v) => pT + (1 - (v - min) / (max - min)) * gH;

    [0, 0.5, 1].forEach((f) => {
      const y = pT + f * gH;
      el.appendChild(svg('line', { x1: pL, y1: y, x2: W - pR, y2: y, class: 'grade' }));
      const rot = svg('text', { x: pL - 8, y: y + 3, 'text-anchor': 'end', class: 'rotulo' });
      rot.textContent = U.dec(max - f * (max - min), 1);
      el.appendChild(rot);
    });

    const pts = serie.map((v, i) => `${xOf(i).toFixed(1)},${yOf(v).toFixed(1)}`);
    el.appendChild(svg('polygon', {
      points: `${pL},${pT + gH} ${pts.join(' ')} ${W - pR},${pT + gH}`,
      class: 'area'
    }));
    el.appendChild(svg('polyline', { points: pts.join(' '), class: 'linha' }));

    const ux = xOf(serie.length - 1), uy = yOf(serie[serie.length - 1]);
    el.appendChild(svg('circle', { cx: ux, cy: uy, r: 3.5, class: 'ponto-atual' }));

    const leg = svg('text', { x: W - pR, y: H - 5, 'text-anchor': 'end', class: 'rotulo' });
    leg.textContent = `${serie.length} · ${T('max')}${U.dec(Math.max(...serie), 1)} · ${T('min')}${U.dec(Math.min(...serie), 1)}`;
    el.appendChild(leg);
  }
};

function rotear() {
  const m = location.hash.match(/^#\/sensor\/([a-z0-9-]+)$/);
  if (m && POR_ID[m[1]]) UI.abrir(m[1]);
  else UI.fechar();
}

/* ---------------------------------------------------------------------
   9. CICLO DE ATUALIZAÇÃO EM TEMPO REAL
   --------------------------------------------------------------------- */
async function executarSensor(s) {
  try {
    await s.atualizar();
    s.ultima = Date.now();
    s.carregado = true;
    s.erroMsg = '';
    s.registrarHistorico();
    UI.ultimaGeral = s.ultima;
    UI.renderCard(s, true);
  } catch (err) {
    s.erroMsg = err?.message || 'Erro de rede';
    s.logar(
      IDIOMA === 'en' ? 'Connection hiccup · retrying next cycle' : 'Oscilação de rede · nova tentativa no próximo ciclo',
      'alerta'
    );
    UI.renderCard(s, false);
  }
}

async function iniciar() {
  Sismografo.iniciar();
  UI.iniciar();
  Visitantes.iniciar();

  window.addEventListener('hashchange', rotear);
  rotear();

  const promessas = SENSORES.map((s) => executarSensor(s));
  await Promise.allSettled(promessas);

  const somaInicial = SENSORES.reduce((acc, s) => acc + (s.eventosIniciais() || 0), 0);
  Caos.iniciar(somaInicial);

  SENSORES.forEach((s) => {
    setInterval(() => executarSensor(s), s.freq * 1000);
  });

  // Atualização de 1 segundo: relógio do topo e contador demográfico mundial
  setInterval(() => {
    UI.atualizarTempos();
    UI.renderCard(populacao, false);
  }, 1000);
}

iniciar();
