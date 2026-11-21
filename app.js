/* =====================================================================
   PAINEL DE ANOMALIAS GLOBAIS — PARTE 3 DE 3: app.js
   JavaScript puro, sem dependências. Todos os dados são SIMULADOS.

   Organização do arquivo:
     1. Configuração
     2. Utilitários
     3. Termômetro do Caos (contador global, só cresce)
     4. Base comum dos sensores
     5. Os 9 sensores (cada um com comentário de integração real)
     6. Interface (cards, rodapé, detalhe)
     7. Agendador (setInterval por sensor) e roteador (âncoras)
     8. Inicialização
   ===================================================================== */
'use strict';

/* ---------------------------------------------------------------------
   1. CONFIGURAÇÃO
   --------------------------------------------------------------------- */
const CONFIG = {
  velocidadeNormal: 1,      // 1 = intervalos reais (30 s, 5 min, 30 min, 1 h...)
  velocidadeDemo: 60,       // 60 = tudo 60x mais rápido (botão do cabeçalho)
  maxHistorico: 60,         // pontos guardados para o gráfico da página de detalhe
  maxLog: 40,               // eventos guardados no registro de cada sensor
  limitePM25: 35,           // µg/m³ — acima disso a cidade conta como "ruim" (qualidade do ar)
  aquecimento: 15,          // ciclos simulados antes de abrir, para já haver histórico
  chaveCaos: 'painel_caos_v1' // chave do localStorage para o contador nunca "voltar atrás"
};

/* ---------------------------------------------------------------------
   2. UTILITÁRIOS
   --------------------------------------------------------------------- */
const NS_SVG = 'http://www.w3.org/2000/svg';

const U = {
  // Número decimal aleatório entre a e b
  rand: (a, b) => Math.random() * (b - a) + a,
  // Inteiro aleatório entre a e b (inclusive)
  int: (a, b) => Math.floor(Math.random() * (b - a + 1)) + a,
  // Item aleatório de uma lista
  pick: (arr) => arr[Math.floor(Math.random() * arr.length)],
  // Limita v ao intervalo [a, b]
  clamp: (v, a, b) => Math.min(b, Math.max(a, v)),
  // "Passeio aleatório": move v por até ±amp, sem sair de [min, max]
  passo: (v, min, max, amp) => U.clamp(v + U.rand(-amp, amp), min, max),
  // Cópia embaralhada de uma lista
  embaralhar(arr) {
    const c = [...arr];
    for (let i = c.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [c[i], c[j]] = [c[j], c[i]];
    }
    return c;
  },
  // Formatação em pt-BR
  num: (n) => Math.round(n).toLocaleString('pt-BR'),
  dec: (n, d = 1) => n.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d }),
  // Número com sinal explícito (+3,2 / −1,4)
  sinal(n, d = 1) {
    const a = Math.abs(n);
    const t = U.dec(a, d);
    if (a < 0.05 && d > 0) return t;
    return (n > 0 ? '+' : n < 0 ? '−' : '') + t;
  },
  hora: (ts) => new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
  // "há 12 s", "há 5 min", "há 2 h"
  relativo(ts) {
    const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
    if (s < 10) return 'agora mesmo';
    if (s < 60) return `há ${s} s`;
    const m = Math.floor(s / 60);
    if (m < 60) return `há ${m} min`;
    return `há ${Math.floor(m / 60)} h`;
  },
  // 30 -> "30 s", 300 -> "5 min", 3600 -> "1 h"
  freq(seg) {
    if (seg < 60) return `${seg} s`;
    if (seg < 3600) return `${seg / 60} min`;
    return `${seg / 3600} h`;
  },
  // Remove acentos e põe em minúsculas (para comparar palavras-chave)
  normalizar: (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
};

// Cria um elemento HTML. Sempre usa textContent (nada de innerHTML com dados).
function h(tag, classe, texto) {
  const e = document.createElement(tag);
  if (classe) e.className = classe;
  if (texto !== undefined) e.textContent = texto;
  return e;
}

// Cria um elemento SVG com atributos
function svg(tag, attrs = {}) {
  const e = document.createElementNS(NS_SVG, tag);
  Object.keys(attrs).forEach((k) => e.setAttribute(k, attrs[k]));
  return e;
}

// Mapa quadrado com pontos que piscam (usado em aviões e incêndios)
function montarMapa(el, quantidade) {
  el.replaceChildren();
  for (let i = 0; i < quantidade; i++) {
    const p = h('span', 'ponto');
    p.style.left = U.rand(3, 96).toFixed(1) + '%';
    p.style.top = U.rand(5, 94).toFixed(1) + '%';
    p.style.animationDelay = (-U.rand(0, 3)).toFixed(2) + 's'; // cada ponto pisca em um ritmo diferente
    el.appendChild(p);
  }
}

// Marca k pontos aleatórios do mapa como "quentes" (alerta)
function marcarQuentes(el, k) {
  const pontos = [...el.children];
  pontos.forEach((p) => p.classList.remove('hot'));
  U.embaralhar(pontos).slice(0, k).forEach((p) => p.classList.add('hot'));
}

/* ---------------------------------------------------------------------
   3. TERMÔMETRO DO CAOS
   Soma todos os eventos anômalos: focos de incêndio + microtremores +
   desvios de avião + manchetes de crise + palavras-chave notórias.
   Nunca diminui: só recebe incrementos positivos e é salvo no navegador.
   --------------------------------------------------------------------- */
const Caos = {
  valor: 0,
  silencioso: false, // true durante o aquecimento inicial (não conta eventos)

  iniciar(base) {
    let salvo = 0;
    try { salvo = parseInt(localStorage.getItem(CONFIG.chaveCaos), 10) || 0; } catch (e) { /* sem storage: segue */ }
    this.valor = Math.max(salvo, base); // nunca começa abaixo do que já foi visto
    this.render(false);
  },

  // Chamado por cada sensor sempre que detecta novos eventos anômalos
  registrar(n) {
    n = Math.floor(n);
    if (this.silencioso || !(n > 0)) return; // ignora zero e negativos: o número só cresce
    this.valor += n;
    try { localStorage.setItem(CONFIG.chaveCaos, String(this.valor)); } catch (e) { /* ignora */ }
    this.render(true, n);
    Sismografo.pico(n); // o sismógrafo do cabeçalho reage aos novos eventos
  },

  render(flash, n) {
    const el = document.getElementById('caos-valor');
    el.textContent = U.num(this.valor);
    if (flash) {
      el.classList.remove('flash');
      void el.offsetWidth; // força reiniciar a animação
      el.classList.add('flash');
      // "+N" que sobe e some
      const delta = document.getElementById('caos-delta');
      delta.textContent = `+${U.num(n)}`;
      delta.classList.remove('sobe');
      void delta.offsetWidth;
      delta.classList.add('sobe');
    }
  }
};

/* ---------------------------------------------------------------------
   4. BASE COMUM DOS SENSORES
   Cada sensor guarda: estado (e), histórico do dado principal, registro
   de eventos (log) e a hora da última atualização.
   Métodos que cada sensor implementa:
     init()            -> valores iniciais
     tick()            -> UM ciclo de atualização (aqui simulado)
     metrica()         -> número principal (para o gráfico de histórico)
     principal()       -> { texto, nivel }  nivel: 'ok' | 'warn' | 'crit'
     contexto()        -> linha de contexto
     montarViz(el)     -> prepara o indicador visual do card
     renderViz(el)     -> atualiza o indicador visual
     eventosIniciais() -> quantos eventos anômalos já existem (base do Caos)
   --------------------------------------------------------------------- */
const Base = {
  registrarHistorico() {
    this.historico.push(this.metrica());
    if (this.historico.length > CONFIG.maxHistorico) this.historico.shift();
  },
  logar(texto, nivel = '') {
    this.log.unshift({ ts: Date.now() - this.deslocamento, texto, nivel });
    if (this.log.length > CONFIG.maxLog) this.log.pop();
  }
};

function criarSensor(def) {
  return Object.assign({ historico: [], log: [], ultima: Date.now(), deslocamento: 0 }, Base, def);
}

/* ---------------------------------------------------------------------
   5. OS 9 SENSORES
   --------------------------------------------------------------------- */

/* ===== 01 · AVIÕES NO AR — OpenSky Network — 30 s ===================== */
const MOTIVOS_DESVIO = [
  'Squawk 7700 (emergência geral)',
  'Desvio lateral > 40 km da rota',
  'Mudança brusca de altitude',
  'Rota alternativa por espaço aéreo restrito',
  'Retorno ao aeródromo de origem',
  'Espera prolongada sobre ponto de aproximação'
];

const aviacao = criarSensor({
  id: 'aviacao', num: '01', titulo: 'AVIÕES NO AR', fonte: 'OpenSky Network', freq: 30,
  endpoint: 'https://opensky-network.org/api/states/all',
  integracao: 'INTEGRAÇÃO REAL: faça fetch em /api/states/all (aceita autenticação OAuth para limites maiores). ' +
    'Conte os itens de "states" com on_ground = false para obter os aviões no ar. Para detectar desvios, compare a ' +
    'posição/rota de cada voo com a rota esperada (ex.: via API de planos de voo) ou filtre o código squawk 7700/7600/7500.',
  e: { total: 0, desvios: [] },

  novoDesvio() {
    return { indicativo: U.pick(['BRZ', 'XQA', 'TLX', 'NVO', 'AUR', 'KZP']) + U.int(100, 9999), motivo: U.pick(MOTIVOS_DESVIO) };
  },

  init() {
    this.e.total = U.int(8000, 15000);
    const n = U.int(0, 4);
    for (let i = 0; i < n; i++) this.e.desvios.push(this.novoDesvio());
  },

  tick() {
    /* >>> INTEGRAÇÃO REAL (substituir o bloco simulado abaixo) <<<
       const r = await fetch('https://opensky-network.org/api/states/all');
       const { states } = await r.json();
       this.e.total = states.filter(s => s[8] === false).length; // s[8] = on_ground
       // desvios: s[14] = squawk ('7700', '7600', '7500') ou comparação com a rota esperada
    */
    const e = this.e;
    e.total = Math.round(U.passo(e.total, 8000, 15000, 350));
    e.desvios = e.desvios.filter(() => Math.random() > 0.25); // alguns desvios se resolvem
    const novos = Math.random() < 0.45 ? U.int(1, 2) : 0;
    for (let i = 0; i < novos; i++) {
      const d = this.novoDesvio();
      e.desvios.unshift(d);
      this.logar(`${d.indicativo}: ${d.motivo}`, 'alerta');
    }
    e.desvios = e.desvios.slice(0, 8);
    if (novos > 0) Caos.registrar(novos);
    else this.logar(`${U.num(e.total)} aeronaves rastreadas, sem novos desvios`);
  },

  metrica() { return this.e.total; },
  principal() {
    const d = this.e.desvios.length;
    return { texto: U.num(this.e.total), nivel: d >= 5 ? 'crit' : d >= 2 ? 'warn' : 'ok' };
  },
  contexto() { return `${this.e.desvios.length} desvio(s) de rota ativo(s) · pontos vermelhos = desvios`; },
  montarViz(el) { montarMapa(el, 56); },
  renderViz(el) { marcarQuentes(el, this.e.desvios.length); },
  eventosIniciais() { return this.e.desvios.length; }
});

/* ===== 02 · MICROTREMORES — USGS Earthquake Feed — 5 min ============== */
const LOCAIS_TREMOR = [
  'Falha de San Andreas, EUA', 'Reykjanes, Islândia', 'Costa de Honshu, Japão', 'Valparaíso, Chile',
  'Ilha Norte, Nova Zelândia', 'Sumatra, Indonésia', 'Anatólia, Turquia', 'Mindanao, Filipinas'
];

const microtremores = criarSensor({
  id: 'microtremores', num: '02', titulo: 'MICROTREMORES', fonte: 'USGS Earthquake Feed', freq: 300,
  endpoint: 'https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&minmagnitude=2&maxmagnitude=3&starttime=<ontem>',
  integracao: 'INTEGRAÇÃO REAL: use a API FDSN do USGS (gratuita, sem chave) com minmagnitude=2 e maxmagnitude=3 e ' +
    'starttime = agora − 24 h. O tamanho de "features" é o número de microtremores; "properties.mag" e "properties.place" ' +
    'dão magnitude e local. A API permite CORS.',
  e: { mags: [], serie: [] }, // mags: magnitudes das últimas 24 h; serie: novos eventos por ciclo

  init() {
    const n = U.int(0, 12);
    this.e.mags = Array.from({ length: n }, () => +U.rand(2.0, 3.0).toFixed(1));
    this.e.serie = Array.from({ length: 12 }, () => U.int(0, 3));
  },

  tick() {
    /* >>> INTEGRAÇÃO REAL <<<
       const r = await fetch(URL_USGS);
       const { features } = await r.json();
       this.e.mags = features.map(f => f.properties.mag);
    */
    const e = this.e;
    const novos = U.pick([0, 0, 1, 1, 2, 3]);
    for (let i = 0; i < novos; i++) {
      const mag = +U.rand(2.0, 3.0).toFixed(1);
      e.mags.push(mag);
      this.logar(`M${U.dec(mag)} · ${U.pick(LOCAIS_TREMOR)}`, 'alerta');
    }
    // Eventos com mais de 24 h saem da janela
    for (let i = 0, sai = U.int(0, 2); i < sai && e.mags.length > 0; i++) e.mags.shift();
    while (e.mags.length > 12) e.mags.shift();
    e.serie.push(novos);
    if (e.serie.length > 12) e.serie.shift();
    if (novos > 0) Caos.registrar(novos);
    else this.logar('Nenhum novo microtremor neste ciclo');
  },

  maior() { return this.e.mags.length ? Math.max(...this.e.mags) : 0; },
  metrica() { return this.e.mags.length; },
  principal() {
    const n = this.e.mags.length;
    return { texto: U.num(n), nivel: n >= 10 ? 'warn' : 'ok' };
  },
  contexto() {
    const m = this.maior();
    return `magnitude 2,0–3,0 nas últimas 24h · ${m ? 'maior: M' + U.dec(m) : 'nenhum registro'} · barras = novos por ciclo`;
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
    this.barras.forEach((r, i) => {
      const v = this.e.serie[i] ?? 0;
      const alt = v === 0 ? 2 : 10 + v * 26; // 0 -> traço fino; 3 -> barra alta
      r.setAttribute('height', alt);
      r.setAttribute('y', 96 - alt);
      r.setAttribute('class', v >= 3 ? 'barra alta' : 'barra');
    });
  },
  eventosIniciais() { return this.e.mags.length; }
});

/* ===== 03 · FOCOS DE INCÊNDIO — NASA FIRMS — 30 min =================== */
const incendios = criarSensor({
  id: 'incendios', num: '03', titulo: 'FOCOS DE INCÊNDIO', fonte: 'NASA FIRMS', freq: 1800,
  endpoint: 'https://firms.modaps.eosdis.nasa.gov/api/area/csv/<MAP_KEY>/VIIRS_SNPP_NRT/world/1',
  integracao: 'INTEGRAÇÃO REAL: solicite uma MAP_KEY gratuita no site do NASA FIRMS e chame a Area API ' +
    '(/api/area/csv/<MAP_KEY>/VIIRS_SNPP_NRT/world/1 para as últimas 24 h). Cada linha do CSV é um foco; ' +
    'conte as linhas e use latitude/longitude para plotar. Para "ativos agora", filtre as detecções das últimas horas ' +
    '(acq_date + acq_time). Se o CORS bloquear no navegador, use um proxy próprio.',
  e: { ativos: 0, h24: 0 },

  init() {
    this.e.h24 = U.int(500, 2000);
    this.e.ativos = Math.round(this.e.h24 * U.rand(0.18, 0.35));
  },

  tick() {
    /* >>> INTEGRAÇÃO REAL <<<
       const csv = await (await fetch(URL_FIRMS)).text();
       const linhas = csv.trim().split('\n').slice(1);
       this.e.h24 = linhas.length;
    */
    const e = this.e;
    const novos = U.int(5, 60);
    const expirados = U.int(0, 50);
    e.h24 = U.clamp(e.h24 + novos - expirados, 500, 2000);
    e.ativos = Math.round(U.clamp(e.ativos + U.rand(-40, 40), 80, e.h24));
    Caos.registrar(novos);
    this.logar(`+${novos} novos focos detectados (VIIRS)`, novos >= 45 ? 'alerta' : '');
  },

  metrica() { return this.e.ativos; },
  principal() {
    const h24 = this.e.h24;
    return { texto: U.num(this.e.ativos), nivel: h24 > 1600 ? 'crit' : h24 > 1200 ? 'warn' : 'ok' };
  },
  contexto() { return `focos ativos agora · ${U.num(this.e.h24)} detectados nas últimas 24h`; },
  montarViz(el) { montarMapa(el, 60); },
  renderViz(el) { marcarQuentes(el, U.clamp(Math.round(this.e.h24 / 2000 * 30), 3, 30)); },
  eventosIniciais() { return this.e.h24; }
});

/* ===== 04 · TEMPERATURAS EXTREMAS — Open-Meteo — 1 h ================== */
const CIDADES_QUENTES = [
  'Kuwait City, KW', 'Ahvaz, IR', 'Jacobabad, PK', 'Basra, IQ',
  'Vale da Morte, EUA', 'Marble Bar, AU', 'Timbuctu, ML', 'Turbat, PK'
];
const CIDADES_FRIAS = [
  'Oymyakon, RU', 'Yakutsk, RU', 'Verkhoyansk, RU', 'Eureka, CA',
  'Norilsk, RU', 'Ulan Bator, MN', 'Fairbanks, EUA', 'Resolute, CA'
];

const temperaturas = criarSensor({
  id: 'temperaturas', num: '04', titulo: 'TEMPERATURAS EXTREMAS', fonte: 'Open-Meteo', freq: 3600,
  endpoint: 'https://api.open-meteo.com/v1/forecast?latitude=<lat>&longitude=<lon>&current=temperature_2m',
  integracao: 'INTEGRAÇÃO REAL: mantenha uma lista de cidades (nome + latitude/longitude) e consulte a API ' +
    'Open-Meteo (sem chave): /v1/forecast?latitude=..&longitude=..&current=temperature_2m. Aceita várias coordenadas ' +
    'separadas por vírgula numa só chamada. Filtre temperatura > 45 °C ou < −20 °C. A API permite CORS.',
  e: { lista: [] },

  init() { /* a lista é montada no primeiro tick */ },

  tick() {
    /* >>> INTEGRAÇÃO REAL <<<
       const r = await fetch('https://api.open-meteo.com/v1/forecast?latitude=29.37,62.03&longitude=47.98,129.7&current=temperature_2m');
       const dados = await r.json();   // um item por coordenada
       this.e.lista = dados.filter(d => d.current.temperature_2m > 45 || d.current.temperature_2m < -20);
    */
    const todas = [
      ...CIDADES_QUENTES.map((nome) => ({ nome, tipo: 'q' })),
      ...CIDADES_FRIAS.map((nome) => ({ nome, tipo: 'f' }))
    ];
    const n = U.int(0, 6);
    this.e.lista = U.embaralhar(todas).slice(0, n).map((c) => ({
      nome: c.nome,
      tipo: c.tipo,
      temp: c.tipo === 'q' ? U.rand(45, 52) : -U.rand(20, 48)
    }));
    // Mais extremas primeiro
    this.e.lista.sort((a, b) => this.severidade(b) - this.severidade(a));
    const top = this.e.lista[0];
    this.logar(n === 0 ? 'Nenhuma cidade em faixa extrema' : `${n} cidade(s) em faixa extrema · mais severa: ${top.nome} ${U.dec(top.temp)} °C`, n >= 3 ? 'alerta' : '');
  },

  severidade(c) { return c.tipo === 'q' ? c.temp - 45 : -20 - c.temp; },
  metrica() { return this.e.lista.length; },
  principal() {
    const n = this.e.lista.length;
    return { texto: U.num(n), nivel: n >= 5 ? 'crit' : n >= 3 ? 'warn' : 'ok' };
  },
  contexto() {
    const q = this.e.lista.filter((c) => c.tipo === 'q').length;
    return `cidades acima de 45 °C ou abaixo de −20 °C · ${q} quente(s) / ${this.e.lista.length - q} fria(s)`;
  },
  montarViz() { /* lista: nada a preparar */ },
  renderViz(el) {
    if (this.e.lista.length === 0) {
      el.replaceChildren(h('li', 'vazio', 'nenhuma cidade em faixa extrema'));
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
  eventosIniciais() { return 0; } // este sensor não entra na soma do Caos
});

/* ===== 05 · ANOMALIAS CLIMÁTICAS — Open-Meteo — 1 h =================== */
const CIDADES_CLIMA = [
  'São Paulo', 'Moscou', 'Nova Délhi', 'Cairo', 'Sydney',
  'Nova York', 'Lagos', 'Reykjavik', 'Pequim', 'Cidade do México'
];

const anomalias = criarSensor({
  id: 'anomalias', num: '05', titulo: 'ANOMALIAS CLIMÁTICAS', fonte: 'Open-Meteo', freq: 3600,
  endpoint: 'https://archive-api.open-meteo.com/v1/archive?latitude=<lat>&longitude=<lon>&start_date=<ini>&end_date=<fim>&daily=temperature_2m_mean',
  integracao: 'INTEGRAÇÃO REAL: pegue a temperatura atual em /v1/forecast (current=temperature_2m) e compare com a média ' +
    'histórica da mesma data (ex.: 1991–2020) calculada a partir da API de arquivo histórico (archive-api.open-meteo.com), ' +
    'tirando a média de temperature_2m_mean nos mesmos dia/mês de cada ano. A anomalia = atual − média. ' +
    'Dica: guarde a média histórica em cache, ela quase não muda.',
  e: { d: {} },

  init() { CIDADES_CLIMA.forEach((c) => { this.e.d[c] = U.rand(-6, 6); }); },

  tick() {
    /* >>> INTEGRAÇÃO REAL <<<
       anomalia = temperaturaAtual(cidade) - mediaHistorica(cidade, hoje);
    */
    CIDADES_CLIMA.forEach((c) => { this.e.d[c] = U.passo(this.e.d[c], -12, 12, 1.2); });
    const m = this.maior();
    this.logar(`Maior desvio: ${m.nome} ${U.sinal(m.d)} °C`, Math.abs(m.d) >= 5 ? 'alerta' : '');
  },

  ordenadas() {
    return CIDADES_CLIMA.map((nome) => ({ nome, d: this.e.d[nome] })).sort((a, b) => Math.abs(b.d) - Math.abs(a.d));
  },
  maior() { return this.ordenadas()[0]; },
  metrica() { return Math.abs(this.maior().d); },
  principal() {
    const m = this.maior();
    const a = Math.abs(m.d);
    return { texto: `${U.sinal(m.d)} °C`, nivel: a >= 8 ? 'crit' : a >= 5 ? 'warn' : 'ok' };
  },
  contexto() {
    const acima = this.ordenadas().filter((c) => Math.abs(c.d) >= 5).length;
    return `desvio vs. média histórica · ${acima} cidade(s) além de ±5 °C · maior: ${this.maior().nome}`;
  },
  montarViz() { /* lista: nada a preparar */ },
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
  eventosIniciais() { return 0; } // não entra na soma do Caos
});

/* ===== 06 · QUALIDADE DO AR — OpenAQ — 1 h ============================ */
// Valor típico de PM2,5 (µg/m³) de cada cidade; a simulação oscila em torno dele
const CIDADES_AR = {
  'Nova Délhi': 110, 'Lahore': 130, 'Daca': 90, 'Cairo': 60, 'Pequim': 45, 'Jacarta': 55,
  'Cidade do México': 30, 'Lima': 28, 'Santiago': 22, 'Cidade do Cabo': 12, 'Londres': 9, 'Sydney': 6
};

const ar = criarSensor({
  id: 'ar', num: '06', titulo: 'QUALIDADE DO AR', fonte: 'OpenAQ', freq: 3600,
  endpoint: 'https://api.openaq.org/v3/locations?parameters_id=2&coordinates=<lat>,<lon>&radius=25000',
  integracao: 'INTEGRAÇÃO REAL: a API v3 do OpenAQ exige uma chave gratuita (cabeçalho X-API-Key). Busque as estações de cada ' +
    'cidade (/v3/locations) e a última medição de PM2.5 (parameters_id=2, /v3/locations/{id}/latest). Compare com o limite ' +
    'configurado em CONFIG.limitePM25. Ajuste o limite conforme a referência que quiser usar (OMS, EPA etc.).',
  e: { pm: {} },

  init() { Object.keys(CIDADES_AR).forEach((c) => { this.e.pm[c] = CIDADES_AR[c] * U.rand(0.8, 1.2); }); },

  tick() {
    /* >>> INTEGRAÇÃO REAL <<<
       // para cada cidade: GET /v3/locations/{id}/latest e ler o valor de PM2.5
    */
    Object.keys(CIDADES_AR).forEach((c) => {
      const base = CIDADES_AR[c];
      this.e.pm[c] = U.clamp(this.e.pm[c] + U.rand(-1, 1) * base * 0.15, base * 0.4, base * 1.8);
    });
    const lista = this.ordenadas();
    const n = this.acima();
    this.logar(`${n} cidade(s) acima de ${CONFIG.limitePM25} µg/m³ · pior: ${lista[0].nome} (${U.num(lista[0].pm)})`, n >= 6 ? 'alerta' : '');
  },

  ordenadas() {
    return Object.keys(this.e.pm).map((nome) => ({ nome, pm: this.e.pm[nome] })).sort((a, b) => b.pm - a.pm);
  },
  acima() { return this.ordenadas().filter((c) => c.pm > CONFIG.limitePM25).length; },
  metrica() { return this.acima(); },
  principal() {
    const n = this.acima();
    return { texto: U.num(n), nivel: n >= 8 ? 'crit' : n >= 5 ? 'warn' : 'ok' };
  },
  contexto() { return `de ${Object.keys(this.e.pm).length} cidades acima do limite de PM2,5 (${CONFIG.limitePM25} µg/m³)`; },
  montarViz() { /* lista: nada a preparar */ },
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
  eventosIniciais() { return 0; } // não entra na soma do Caos
});

/* ===== 07 · MANCHETES EM TEMPO REAL — BBC, Reuters, Al Jazeera — 10 min == */
// Manchetes FICTÍCIAS e genéricas, só para a simulação. Algumas não têm palavra de crise de propósito,
// para demonstrar o filtro funcionando.
const MANCHETES = [
  { f: 'BBC', t: 'Crise energética se aprofunda e governos discutem racionamento' },
  { f: 'Reuters', t: 'Ataque cibernético atinge rede de hospitais em país europeu' },
  { f: 'Al Jazeera', t: 'Colapso de ponte deixa região isolada após tempestade' },
  { f: 'BBC', t: 'Líderes regionais tentam evitar nova escalada de guerra' },
  { f: 'Reuters', t: 'Bancos centrais sinalizam cautela diante de crise de crédito' },
  { f: 'Al Jazeera', t: 'Ataque aéreo atinge área residencial, dizem autoridades locais' },
  { f: 'Reuters', t: 'Catástrofe climática força evacuação de milhares de pessoas' },
  { f: 'BBC', t: 'Governo denuncia tentativa de golpe de estado e convoca o exército' },
  { f: 'Al Jazeera', t: 'Explosão em fábrica deixa dezenas de feridos' },
  { f: 'BBC', t: 'Novo surto levanta temor de pandemia em países vizinhos' },
  { f: 'Reuters', t: 'Desastre ambiental contamina rio e interrompe abastecimento' },
  { f: 'Al Jazeera', t: 'Crise humanitária se agrava com chegada do inverno' },
  { f: 'BBC', t: 'Colapso do sistema elétrico provoca apagão em várias cidades' },
  { f: 'Reuters', t: 'Ataque a petroleiro eleva preço do barril' },
  { f: 'BBC', t: 'Seleção estreia com vitória em torneio internacional' },
  { f: 'Reuters', t: 'Empresa de tecnologia apresenta novo chip de baixo consumo' },
  { f: 'Al Jazeera', t: 'Festival de cinema anuncia programação de abertura' },
  { f: 'BBC', t: 'Cientistas descrevem nova espécie de peixe de águas profundas' },
  { f: 'Reuters', t: 'Safra de café deve crescer na próxima temporada' },
  { f: 'Al Jazeera', t: 'Museu reabre ala dedicada à arte contemporânea' }
];
const PALAVRAS_CRISE = ['crise', 'ataque', 'colapso', 'guerra', 'catástrofe', 'pandemia', 'golpe', 'explosão', 'desastre'];
// Filtro: a manchete só entra se contiver alguma palavra de crise
const ehCrise = (titulo) => {
  const n = U.normalizar(titulo);
  return PALAVRAS_CRISE.some((p) => n.includes(U.normalizar(p)));
};

const manchetes = criarSensor({
  id: 'manchetes', num: '07', titulo: 'MANCHETES EM TEMPO REAL', fonte: 'RSS: BBC, Reuters, Al Jazeera', freq: 600,
  endpoint: 'https://feeds.bbci.co.uk/news/world/rss.xml · https://www.aljazeera.com/xml/rss/all.xml · (Reuters: agregador)',
  integracao: 'INTEGRAÇÃO REAL: baixe os feeds RSS/Atom (BBC World e Al Jazeera têm feeds públicos; a Reuters não oferece RSS ' +
    'oficial aberto, então use um agregador ou outra fonte). Navegadores bloqueiam esses feeds por CORS: use um proxy próprio ' +
    '(ex.: uma função serverless). Converta o XML com DOMParser, pegue <item><title> e aplique o mesmo filtro de ' +
    'palavras (ehCrise) usado aqui. Guarde os links já vistos para não contar a mesma manchete duas vezes.',
  e: { lista: [], total24: 0 },

  init() { this.e.total24 = U.int(40, 90); },

  tick() {
    /* >>> INTEGRAÇÃO REAL <<<
       const xml = await (await fetch(PROXY + FEED_URL)).text();
       const itens = new DOMParser().parseFromString(xml, 'text/xml').querySelectorAll('item');
       const novas = [...itens].map(i => i.querySelector('title').textContent).filter(ehCrise);
    */
    const e = this.e;
    const sorteio = Array.from({ length: U.int(0, 5) }, () => U.pick(MANCHETES));
    const novas = sorteio.filter((m) => ehCrise(m.t)); // aplica o filtro por palavras
    novas.forEach((m) => {
      e.lista.unshift({ f: m.f, t: m.t, ts: Date.now() - this.deslocamento });
      this.logar(`[${m.f}] ${m.t}`, 'alerta');
    });
    e.lista = e.lista.slice(0, 30);
    e.total24 = Math.max(20, e.total24 + novas.length - U.int(0, 2));
    if (novas.length > 0) Caos.registrar(novas.length);
    else this.logar('Nenhuma manchete de crise neste ciclo');
  },

  metrica() { return this.e.total24; },
  principal() {
    const n = this.e.total24;
    return { texto: U.num(n), nivel: n >= 110 ? 'crit' : n >= 80 ? 'warn' : 'ok' };
  },
  contexto() { return 'manchetes de crise nas últimas 24h · BBC, Reuters, Al Jazeera (simuladas)'; },
  montarViz() { /* lista: nada a preparar */ },
  renderViz(el) {
    if (this.e.lista.length === 0) {
      el.replaceChildren(h('li', 'vazio', 'aguardando manchetes…'));
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

/* ===== 08 · MERCADOS DE PREVISÃO — Polymarket/Kalshi — 30 min ========= */
// Mercados FICTÍCIOS e genéricos, só para a simulação
const MERCADOS = [
  'Cessar-fogo em conflito regional até o fim do trimestre',
  'Banco central dos EUA reduz juros na próxima reunião',
  'Recessão nos EUA nos próximos 12 meses',
  'OMS declara nova emergência de saúde global em 2027',
  'Furacão de categoria 5 atinge a costa dos EUA este ano',
  'Reabertura de rota marítima estratégica até março',
  'Novo recorde de calor global anual em 2027',
  'Acordo comercial entre grandes economias até junho'
];

const mercados = criarSensor({
  id: 'mercados', num: '08', titulo: 'MERCADOS DE PREVISÃO', fonte: 'Polymarket / Kalshi', freq: 1800,
  endpoint: 'https://gamma-api.polymarket.com/markets · https://api.elections.kalshi.com/trade-api/v2/markets',
  integracao: 'INTEGRAÇÃO REAL: tanto a Polymarket (Gamma API) quanto a Kalshi expõem listas de mercados com o preço atual ' +
    'de cada resultado, que equivale à probabilidade implícita (0,63 = 63%). Para a variação, guarde o preço de 24 h atrás ' +
    '(ou use o campo de variação diária, se a API oferecer) e ordene pelo módulo da diferença em pontos percentuais. ' +
    'Confira a documentação de cada API: os campos e as regras de acesso mudam com o tempo.',
  e: { m: [] },

  init() {
    this.e.m = MERCADOS.map((nome) => {
      const base = U.rand(10, 85);
      const variacao = U.rand(-8, 8);
      return { nome, base, variacao, p: U.clamp(base + variacao, 2, 98) };
    });
  },

  tick() {
    /* >>> INTEGRAÇÃO REAL <<<
       // variacao = precoAtual*100 - preco24hAtras*100  (em pontos percentuais)
    */
    this.e.m.forEach((x) => {
      x.variacao = U.passo(x.variacao, -25, 25, 2.5);
      x.p = U.clamp(x.base + x.variacao, 2, 98);
    });
    const t = this.ordenados()[0];
    this.logar(`Maior variação: ${t.nome} (${U.sinal(t.variacao)} pp, agora ${U.num(t.p)}%)`, Math.abs(t.variacao) >= 8 ? 'alerta' : '');
  },

  ordenados() { return [...this.e.m].sort((a, b) => Math.abs(b.variacao) - Math.abs(a.variacao)); },
  metrica() { return Math.abs(this.ordenados()[0].variacao); },
  principal() {
    const t = this.ordenados()[0];
    const a = Math.abs(t.variacao);
    return { texto: `${U.sinal(t.variacao)} pp`, nivel: a >= 15 ? 'crit' : a >= 8 ? 'warn' : 'ok' };
  },
  contexto() { return `maior variação em 24h: ${this.ordenados()[0].nome}`; },
  montarViz() { /* lista: nada a preparar */ },
  renderViz(el) {
    el.replaceChildren(...this.ordenados().map((x) => {
      const a = Math.abs(x.variacao);
      const li = h('li');
      li.append(
        h('span', 'nome', x.nome),
        h('span', 'val', `${U.num(x.p)}%`),
        h('span', 'val ' + (a >= 15 ? 'verm' : a >= 8 ? 'amb' : 'suave'), `${U.sinal(x.variacao)} pp`)
      );
      li.title = x.nome;
      return li;
    }));
  },
  eventosIniciais() { return 0; } // não entra na soma do Caos
});

/* ===== 09 · PALAVRAS-CHAVE NOTÓRIAS — monitor dedicado — 15 min ======= */
const TERMOS = [
  { t: 'ataque terrorista', min: 0, max: 20 },
  { t: 'guerra', min: 150, max: 600 },
  { t: 'colapso', min: 40, max: 200 },
  { t: 'crise', min: 300, max: 900 },
  { t: 'catástrofe', min: 20, max: 120 },
  { t: 'pandemia', min: 30, max: 150 },
  { t: 'golpe de estado', min: 2, max: 40 }
];

const palavras = criarSensor({
  id: 'palavras', num: '09', titulo: 'PALAVRAS-CHAVE NOTÓRIAS', fonte: 'Monitor de termos (ex.: GDELT)', freq: 900,
  endpoint: 'https://api.gdeltproject.org/api/v2/doc/doc?query="<termo>"&mode=timelinevol&timespan=2d&format=json',
  integracao: 'INTEGRAÇÃO REAL: uma opção gratuita é a API DOC do GDELT (mode=timelinevol ou artlist com timespan=2d) para ' +
    'contar menções de cada termo nas últimas 24 h e nas 24 h anteriores (a variação é a diferença percentual entre os dois ' +
    'períodos). Também dá para contar ocorrências nos feeds do sensor 07 ou em outra fonte de notícias. ' +
    'Respeite os limites de requisição da API escolhida.',
  e: { termos: [] },

  init() {
    this.e.termos = TERMOS.map((x) => ({
      t: x.t, min: x.min, max: x.max,
      hoje: U.int(x.min, x.max),    // menções nas últimas 24 h
      ontem: U.int(x.min, x.max)    // menções nas 24 h anteriores
    }));
  },

  tick() {
    /* >>> INTEGRAÇÃO REAL <<<
       // para cada termo: contar menções nas últimas 24 h (hoje) e nas 24 h anteriores (ontem)
    */
    let novos = 0;
    this.e.termos.forEach((x) => {
      const passo = Math.max(1, Math.ceil(x.max * 0.03));
      const entram = U.int(0, passo);
      const saem = U.int(0, passo);
      x.hoje = U.clamp(x.hoje + entram - saem, x.min, x.max);
      novos += entram;
    });
    Caos.registrar(novos);
    const top = this.maiorAlta();
    this.logar(top ? `Maior alta: "${top.t}" ${this.fmtVar(top)}` : 'Sem altas relevantes neste ciclo', top && this.variacao(top) >= 40 ? 'alerta' : '');
  },

  // Variação percentual de hoje em relação a ontem
  variacao(x) {
    if (x.ontem === 0) return x.hoje > 0 ? Infinity : 0;
    return (x.hoje - x.ontem) / x.ontem * 100;
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
    const top = this.maiorAlta();
    const v = top ? this.variacao(top) : 0;
    return { texto: U.num(this.total()), nivel: v >= 100 ? 'crit' : v >= 40 ? 'warn' : 'ok' };
  },
  contexto() {
    const top = this.maiorAlta();
    return top ? `menções em 24h · maior alta: "${top.t}" (${this.fmtVar(top)} vs. ontem)` : 'menções em 24h · sem altas relevantes';
  },
  montarViz() { /* lista: nada a preparar */ },
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
const SENSORES = [aviacao, microtremores, incendios, temperaturas, anomalias, ar, manchetes, mercados, palavras];
const SENSOR_POR_ID = Object.fromEntries(SENSORES.map((s) => [s.id, s]));

/* ---------------------------------------------------------------------
   6. INTERFACE
   --------------------------------------------------------------------- */
const estado = { ultima: Date.now(), rota: null };

// Rótulos do estado de cada sensor
const NIVEIS = { ok: 'normal', warn: 'atenção', crit: 'crítico' };

// Sismógrafo do cabeçalho: traço que rola da direita para a esquerda.
// Em repouso fica quase reto; cada evento novo do Termômetro do Caos o agita.
const Sismografo = {
  n: 240,           // quantidade de amostras na tela
  amostras: [],
  energia: 0,       // 0 = calmo, 1 = muito agitado (decai sozinha)
  linha: null,
  caixa: null,

  iniciar() {
    const el = document.getElementById('sismo');
    this.linha = el.querySelector('polyline');
    this.caixa = document.getElementById('sismografo');
    // Começa com um ruído leve, para o traço já aparecer "vivo" ao abrir a página
    this.amostras = Array.from({ length: this.n }, () => (Math.random() * 2 - 1) * 0.05);
    this.desenhar();
    // Quem prefere menos movimento recebe o traço parado
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    setInterval(() => this.passo(), 50);
  },

  // Chamado pelo Termômetro do Caos: quanto mais eventos, maior o pico
  pico(n) {
    this.energia = Math.min(1, this.energia + 0.35 + Math.log10(n + 1) * 0.25);
  },

  passo() {
    const anterior = this.amostras[this.amostras.length - 1];
    const ruido = (Math.random() * 2 - 1) * (0.04 + this.energia);
    this.amostras.push(anterior * 0.5 + ruido * 0.5 * 2); // mistura com a amostra anterior: traço mais contínuo
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

// Relógio do cabeçalho (hora local do navegador)
function relogio() {
  const d = new Date();
  const dia = d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' }).replace(/\./g, '');
  document.getElementById('relogio').textContent = `${dia} ${d.toLocaleTimeString('pt-BR')}`;
}

const UI = {
  cards: {},

  // Liga cada sensor ao seu card no HTML e prepara o indicador visual
  montar() {
    SENSORES.forEach((s) => {
      const raiz = document.querySelector(`[data-sensor="${s.id}"]`);
      const campo = (nome) => raiz.querySelector(`[data-campo="${nome}"]`);
      const pe = raiz.querySelector('.card-pe');

      // Estado do sensor (normal / atenção / crítico) no pé do card
      const nivel = h('span', 'nivel', NIVEIS.ok);
      pe.insertBefore(nivel, pe.firstChild);

      // Régua de ciclo: os traços acendem até a próxima atualização do sensor
      const ciclo = h('div', 'ciclo');
      const preench = h('i');
      ciclo.appendChild(preench);
      raiz.insertBefore(ciclo, pe);

      this.cards[s.id] = { raiz, valor: campo('valor'), contexto: campo('contexto'), viz: campo('viz'), tempo: campo('tempo'), nivel, ciclo: preench, pAnt: 0 };
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

  renderTempo(s) { this.cards[s.id].tempo.textContent = 'atualizado ' + U.relativo(s.ultima); },
  renderTempos() { SENSORES.forEach((s) => this.renderTempo(s)); },

  // Atualiza a régua de ciclo de cada card (0% logo após atualizar, 100% perto da próxima)
  renderCiclos() {
    const agora = Date.now();
    SENSORES.forEach((s) => {
      const c = this.cards[s.id];
      const p = U.clamp(1 - (s.proximo - agora) / s.intervaloMs, 0, 1);
      c.ciclo.style.transition = p < c.pAnt ? 'none' : ''; // ao reiniciar, volta direto para zero
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

// Página de detalhe de um sensor (vista aberta por âncora)
const Detalhe = {
  render(s) {
    const p = s.principal();
    const raiz = document.getElementById('detalhe');
    raiz.dataset.nivel = p.nivel;
    document.getElementById('det-num').textContent = s.num;
    document.getElementById('det-titulo').textContent = s.titulo;
    document.getElementById('det-fonte').textContent = s.fonte;
    document.getElementById('det-freq').textContent = `a cada ${U.freq(s.freq)}`;
    document.getElementById('det-ultima').textContent = `${U.hora(s.ultima)} (${U.relativo(s.ultima)})`;
    document.getElementById('det-endpoint').textContent = s.endpoint;
    document.getElementById('det-valor').textContent = p.texto;
    document.getElementById('det-contexto').textContent = s.contexto();
    document.getElementById('det-integracao').textContent = s.integracao;
    this.grafico(document.getElementById('det-grafico'), s.historico);

    const log = document.getElementById('det-log');
    log.replaceChildren(...s.log.map((l) => {
      const li = h('li', l.nivel);
      li.append(h('span', 'hora', U.hora(l.ts)), h('span', 'nome texto', l.texto));
      return li;
    }));
  },

  // Gráfico de linha simples em SVG com o histórico do dado principal
  grafico(el, dados) {
    el.replaceChildren();
    const W = 600, H = 160, P = 26;
    if (dados.length < 2) {
      const t = svg('text', { x: W / 2, y: H / 2, 'text-anchor': 'middle' });
      t.textContent = 'aguardando mais leituras…';
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
   7. AGENDADOR E ROTEADOR
   --------------------------------------------------------------------- */

// Executa UM ciclo de um sensor e atualiza a tela
function executar(s) {
  s.tick();
  s.registrarHistorico();
  s.ultima = Date.now();
  estado.ultima = s.ultima;
  s.proximo = s.ultima + s.intervaloMs;
  UI.renderCard(s, true);
  UI.renderRodape();
  if (estado.rota === s.id) Detalhe.render(s); // se a página de detalhe deste sensor está aberta, atualiza
}

// Um setInterval por sensor, no intervalo indicado (dividido pela velocidade)
const Agendador = {
  velocidade: 1,
  timers: [],

  iniciar(velocidade) {
    this.parar();
    this.velocidade = velocidade;
    SENSORES.forEach((s) => {
      const ms = Math.max(500, s.freq * 1000 / velocidade);
      s.intervaloMs = ms;
      s.proximo = Date.now() + ms; // usado pela régua de ciclo do card
      this.timers.push(setInterval(() => executar(s), ms));
    });
  },

  parar() {
    this.timers.forEach(clearInterval);
    this.timers = [];
  }
};

// Roteador por âncora: "#/" = home, "#/sensor/<id>" = detalhe
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
   8. INICIALIZAÇÃO
   --------------------------------------------------------------------- */
function iniciar() {
  // 1) Valores iniciais + "aquecimento": roda alguns ciclos silenciosos para já existir histórico e registro
  Caos.silencioso = true;
  SENSORES.forEach((s) => {
    s.init();
    for (let i = 0; i < CONFIG.aquecimento; i++) {
      s.deslocamento = (CONFIG.aquecimento - i) * s.freq * 1000; // espalha os eventos no passado
      s.tick();
      s.registrarHistorico();
    }
    s.deslocamento = 0;
    // A última leitura de cada sensor aconteceu "há alguns instantes"
    s.ultima = Date.now() - U.int(0, Math.floor(s.freq * 1000 * 0.8));
  });
  Caos.silencioso = false;

  // 2) Termômetro do Caos começa com o que já foi detectado e daí só cresce
  Caos.iniciar(SENSORES.reduce((soma, s) => soma + s.eventosIniciais(), 0));

  // 3) Desenha os cards
  UI.montar();
  SENSORES.forEach((s) => UI.renderCard(s, false));
  estado.ultima = Date.now();
  UI.renderRodape();

  // 4) Liga os sensores nos intervalos reais
  Agendador.iniciar(CONFIG.velocidadeNormal);
  Sismografo.iniciar();
  relogio();
  UI.renderCiclos();

  // 5) Atualiza os "atualizado há X" a cada segundo
  setInterval(() => {
    UI.renderTempos();
    UI.renderCiclos();
    relogio();
    if (estado.rota) {
      const s = SENSOR_POR_ID[estado.rota];
      document.getElementById('det-ultima').textContent = `${U.hora(s.ultima)} (${U.relativo(s.ultima)})`;
    }
  }, 1000);

  // 6) Botão de velocidade (1x <-> 60x)
  const btn = document.getElementById('btn-velocidade');
  btn.addEventListener('click', () => {
    const v = Agendador.velocidade === CONFIG.velocidadeNormal ? CONFIG.velocidadeDemo : CONFIG.velocidadeNormal;
    Agendador.iniciar(v);
    btn.textContent = `VELOCIDADE: ${v}x`;
    btn.setAttribute('aria-pressed', String(v !== CONFIG.velocidadeNormal));
  });

  // 7) Navegação por âncoras
  window.addEventListener('hashchange', rotear);
  rotear();
}

document.addEventListener('DOMContentLoaded', iniciar);
