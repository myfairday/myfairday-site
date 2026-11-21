/* =====================================================================
   APP.JS — ENQUETE 1 -> LABIRINTO -> INTRUSO + COFRE (SUBLIMINAR + SOM GLITCH 1s) -> MEMÓRIA -> ENQUETE 2 -> 10 CÁLCULOS -> 2030 -> FINAL
   ===================================================================== */
'use strict';

const CONFIG = {
  chaveTema: 'proto2030_tema_v9',
  chaveVisTotal: 'myfairday_vis_num_v2',
  chaveTriagem: 'proto2030_triagem_stats_v2',
  chaveEnquete1: 'proto2030_enquete1_v1',
  chaveEnquete2: 'proto2030_enquete2_v1',
  chaveEnquete: 'proto2030_enquete_v2'
};

/* ---------------------------------------------------------------------
   1. MOTOR DE ÁUDIO DE SUSPENSE + SOM DE FALHA / GLITCH (1 SEGUNDO)
   --------------------------------------------------------------------- */
const AudioSuspense = {
  ctx: null,
  ativo: false,
  mudo: false,
  streamEl: null,
  masterGain: null,

  iniciar() {
    if (this.ativo) return;
    this.ativo = true;

    try {
      this.streamEl = new Audio('https://ice1.somafm.com/dronezone-128-mp3');
      this.streamEl.volume = 0.35;
      this.streamEl.play().catch(() => {});
    } catch (_) { /* ignora */ }

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();

      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc1.type = 'sawtooth';
      osc1.frequency.value = 46.25;

      osc2.type = 'sine';
      osc2.frequency.value = 47.1;

      filter.type = 'lowpass';
      filter.frequency.value = 135;

      gain.gain.value = 0.08;

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start();
      osc2.start();
      this.masterGain = gain;
    } catch (_) { /* ignora */ }
  },

  alternar() {
    const btn = document.getElementById('btn-som');
    if (!this.ativo) {
      this.iniciar();
      this.mudo = false;
      if (btn) btn.textContent = '🔊';
      return;
    }

    this.mudo = !this.mudo;

    if (this.streamEl) {
      this.streamEl.muted = this.mudo;
    }
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.mudo ? 0 : 0.08, this.ctx.currentTime);
    }
    if (btn) btn.textContent = this.mudo ? '🔇' : '🔊';
  },

  tocarFalhaGlitch(duracaoSeg = 1.0) {
    if (this.mudo) return;

    try {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioCtx();
      }
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }

      const agora = this.ctx.currentTime;

      // 1. Camada de estática / chiado elétrico cortado (ruído branco filtrado)
      const tamanhoBuffer = Math.floor(this.ctx.sampleRate * duracaoSeg);
      const buffer = this.ctx.createBuffer(1, tamanhoBuffer, this.ctx.sampleRate);
      const dados = buffer.getChannelData(0);

      for (let i = 0; i < tamanhoBuffer; i++) {
        // Rajadas intermitentes para soar como mau contato elétrico
        const rajada = Math.sin(i * 0.008) > -0.25 ? 1 : 0.15;
        dados[i] = (Math.random() * 2 - 1) * rajada;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filtroGlitch = this.ctx.createBiquadFilter();
      filtroGlitch.type = 'bandpass';
      filtroGlitch.frequency.setValueAtTime(1100, agora);
      filtroGlitch.frequency.linearRampToValueAtTime(2400, agora + 0.25);
      filtroGlitch.frequency.linearRampToValueAtTime(650, agora + 0.65);
      filtroGlitch.frequency.linearRampToValueAtTime(1900, agora + duracaoSeg);
      filtroGlitch.Q.value = 3.2;

      const gainNoise = this.ctx.createGain();
      gainNoise.gain.setValueAtTime(0.01, agora);
      gainNoise.gain.linearRampToValueAtTime(0.32, agora + 0.03);
      gainNoise.gain.setValueAtTime(0.28, agora + duracaoSeg - 0.12);
      gainNoise.gain.exponentialRampToValueAtTime(0.001, agora + duracaoSeg);

      noise.connect(filtroGlitch);
      filtroGlitch.connect(gainNoise);
      gainNoise.connect(this.ctx.destination);

      // 2. Camada de impacto grave distorcido (pulso de susto)
      const oscImpacto = this.ctx.createOscillator();
      oscImpacto.type = 'sawtooth';
      oscImpacto.frequency.setValueAtTime(165, agora);
      oscImpacto.frequency.exponentialRampToValueAtTime(38, agora + 0.35);
      oscImpacto.frequency.setValueAtTime(110, agora + 0.52);
      oscImpacto.frequency.exponentialRampToValueAtTime(32, agora + duracaoSeg);

      const gainImpacto = this.ctx.createGain();
      gainImpacto.gain.setValueAtTime(0.26, agora);
      gainImpacto.gain.exponentialRampToValueAtTime(0.001, agora + duracaoSeg);

      oscImpacto.connect(gainImpacto);
      gainImpacto.connect(this.ctx.destination);

      noise.start(agora);
      noise.stop(agora + duracaoSeg);
      oscImpacto.start(agora);
      oscImpacto.stop(agora + duracaoSeg);
    } catch (_) { /* ignora caso bloqueado */ }
  }
};

/* ---------------------------------------------------------------------
   2. TEMA, VISITANTES E SISMÓGRAFO
   --------------------------------------------------------------------- */
function aplicarTema(novoTema) {
  const tema = ['verde', 'ambar', 'vermelho', 'ciano'].includes(novoTema) ? novoTema : 'verde';
  document.documentElement.setAttribute('data-tema', tema);
  try { localStorage.setItem(CONFIG.chaveTema, tema); } catch (_) { /* ignora */ }
  document.querySelectorAll('.btn-tema').forEach((b) => {
    b.classList.toggle('ativo', b.dataset.temaBtn === tema);
  });
}

function corAtualTema() {
  return getComputedStyle(document.documentElement).getPropertyValue('--ok').trim() || '#2ee59d';
}

const Visitantes = {
  total: 1,
  atualizarTexto() {
    const el = document.getElementById('visitantes');
    if (el) el.textContent = `visitantes: ${Math.max(1, this.total).toLocaleString('pt-BR')}`;
  },
  async iniciar() {
    let cache = 0;
    let jaContou = false;
    try {
      cache = parseInt(localStorage.getItem(CONFIG.chaveVisTotal), 10) || 0;
      jaContou = localStorage.getItem('myfairday_counted_permanent') === 'true' || document.cookie.includes('myfairday_counted=1');
    } catch (_) { /* ignora */ }

    this.total = cache > 0 ? cache : 1;
    this.atualizarTexto();
    if (jaContou) return;

    try {
      localStorage.setItem('myfairday_counted_permanent', 'true');
      document.cookie = 'myfairday_counted=1; max-age=31536000; path=/; SameSite=Lax';
    } catch (_) { /* ignora */ }

    try {
      const res = await fetch('https://api.visitorbadge.io/api/visitors?path=myfairday.org-dark-challenge&countColor=%232ee59d');
      const txt = await res.text();
      const matches = [...txt.matchAll(/<text[^>]*>([\d.,]+)<\/text>/gi)];
      if (matches.length > 0) {
        const num = parseInt(matches[matches.length - 1][1].replace(/[^\d]/g, ''), 10);
        if (num > 0) {
          this.total = Math.max(num, cache);
          try { localStorage.setItem(CONFIG.chaveVisTotal, String(this.total)); } catch (_) {}
          this.atualizarTexto();
          return;
        }
      }
    } catch (_) { /* fallback */ }

    this.total = cache + 1;
    try { localStorage.setItem(CONFIG.chaveVisTotal, String(this.total)); } catch (_) {}
    this.atualizarTexto();
  }
};

const Sismografo = {
  N: 120,
  pts: Array(120).fill(0),
  energia: 0.35,
  t: 0,
  faseMutante: false,
  poly: null,

  iniciar() {
    this.poly = document.querySelector('#sismo polyline');
    let ultimoPulso = Date.now();
    const passo = () => {
      this.t += 0.2;
      if (Date.now() - ultimoPulso > 2400) {
        ultimoPulso = Date.now();
        this.pico(1.3);
        this.faseMutante = !this.faseMutante;
      }
      const ruido = (Math.random() - 0.5) * 2.5;
      const sinal = Math.sin(this.t) * (1.8 + this.energia * 14) + ruido * (1 + this.energia * 4);
      this.pts.push(sinal);
      this.pts.shift();
      this.energia = Math.max(0.25, this.energia * 0.95);
      if (this.poly) {
        const dx = 1000 / (this.N - 1);
        let str = '';
        for (let i = 0; i < this.N; i++) {
          const y = Math.min(96, Math.max(4, 50 - this.pts[i]));
          str += `${(i * dx).toFixed(1)},${y.toFixed(1)} `;
        }
        this.poly.setAttribute('points', str);
      }
      requestAnimationFrame(passo);
    };
    requestAnimationFrame(passo);
  },

  pico(forca = 1.4) {
    this.energia = Math.min(2.8, this.energia + forca);
  }
};

const Estado = {
  inicioGeralTs: 0,
  ehInscrito: false,
  voto1Registrado: null,
  voto2Registrado: null,
  votoRegistrado: null,
  simbolosChave: ['☢', '👁']
};

/* ---------------------------------------------------------------------
   3. ENQUETE INICIAL
   --------------------------------------------------------------------- */
const EnqueteInicial = {
  votos: { sim: 782, nao: 114, perdoaria: 19, sofrer: 945 },

  iniciar() {
    const sec = document.getElementById('enquete-inicial');
    sec.hidden = false;

    try {
      const salvos = JSON.parse(localStorage.getItem(CONFIG.chaveEnquete1) || 'null');
      if (salvos && typeof salvos.sim === 'number') this.votos = salvos;
    } catch (_) { /* ignora */ }

    const totalInicial = this.votos.sim + this.votos.nao + this.votos.perdoaria + this.votos.sofrer;
    document.getElementById('enquete1-total').textContent = `VOTOS: ${totalInicial.toLocaleString('pt-BR')}`;

    document.querySelectorAll('.opcao-voto-1').forEach((btn) => {
      btn.addEventListener('click', () => this.votar(btn.dataset.opcao1));
    });

    document.getElementById('btn-entrar-jogo1').addEventListener('click', () => {
      sec.hidden = true;
      document.getElementById('fase-indicador').textContent = '01 / 04';
      Jogo1Labirinto.iniciar();
    });
  },

  votar(opcao) {
    if (Estado.voto1Registrado) return;
    Estado.voto1Registrado = opcao;
    this.votos[opcao] = (this.votos[opcao] || 0) + 1;

    try { localStorage.setItem(CONFIG.chaveEnquete1, JSON.stringify(this.votos)); } catch (_) {}

    const chaves = ['sim', 'nao', 'perdoaria', 'sofrer'];
    const total = chaves.reduce((acc, k) => acc + this.votos[k], 0);

    chaves.forEach((k) => {
      const pct = Math.round((this.votos[k] / total) * 100);
      document.getElementById(`pct1-${k}`).textContent = `${pct}%`;
      document.getElementById(`bar1-${k}`).style.width = `${pct}%`;
    });

    document.querySelectorAll('.opcao-voto-1').forEach((b) => {
      b.classList.toggle('votado', b.dataset.opcao1 === opcao);
    });

    document.getElementById('enquete1-total').textContent = `VOTOS: ${total.toLocaleString('pt-BR')}`;
    document.getElementById('enquete1-acoes').hidden = false;
    Sismografo.pico(1.8);
  }
};

/* ---------------------------------------------------------------------
   4. JOGO 01: LABIRINTO + EXTRAÇÃO DE FRAGMENTO SIMBÓLICO
   --------------------------------------------------------------------- */
const Jogo1Labirinto = {
  cols: 19,
  rows: 11,
  cellW: 40,
  cellH: 40,
  player: { c: 1, r: 1 },
  pontoFragmento: { c: 9, r: 5 },
  portaFinal: { c: 17, r: 9 },
  temFragmento: false,
  sonarRestante: 3,
  sonarAtivoAte: 0,
  inicioTs: 0,
  ativo: false,
  animId: null,

  mapa: [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,0,0,1],
    [1,0,1,0,1,0,1,1,1,0,1,0,1,1,1,1,1,0,1],
    [1,0,1,0,0,0,1,0,0,0,2,0,0,0,0,0,1,0,1],
    [1,0,1,1,1,1,1,0,1,1,1,1,1,0,1,0,1,0,1],
    [1,0,0,0,2,0,0,0,1,0,0,0,0,0,1,0,0,0,1],
    [1,1,1,0,1,1,1,0,1,1,1,1,1,0,1,1,1,0,1],
    [1,0,0,0,1,0,0,0,0,0,1,0,0,0,2,0,0,0,1],
    [1,0,1,1,1,0,1,1,1,1,1,0,1,1,1,1,1,0,1],
    [1,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
  ],

  iniciar() {
    document.getElementById('jogo-1').hidden = false;
    this.player = { c: 1, r: 1 };
    this.temFragmento = false;
    this.sonarRestante = 3;
    this.sonarAtivoAte = 0;
    this.inicioTs = Date.now();
    this.ativo = true;

    const pool = ['Ω', 'Δ', 'Ψ', 'Φ', 'Σ', 'Ж', '☢', '👁'];
    const s1 = pool[Math.floor(Math.random() * pool.length)];
    let s2 = pool[Math.floor(Math.random() * pool.length)];
    while (s2 === s1) s2 = pool[Math.floor(Math.random() * pool.length)];
    Estado.simbolosChave = [s1, s2];

    document.getElementById('status-chave').textContent = '🔑 FRAGMENTO: PENDENTE';
    document.getElementById('status-chave').classList.remove('obtida');
    this.atualizarSonarBtn();
    this.bindEventos();

    if (this.animId) cancelAnimationFrame(this.animId);
    this.loop();
  },

  atualizarSonarBtn() {
    const btn = document.getElementById('btn-sonar');
    btn.textContent = `📡 SONAR (${this.sonarRestante})`;
    btn.disabled = this.sonarRestante <= 0;
  },

  dispararSonar() {
    if (!this.ativo || this.sonarRestante <= 0) return;
    this.sonarRestante--;
    this.sonarAtivoAte = Date.now() + 1100;
    Sismografo.pico(1.6);
    this.atualizarSonarBtn();
  },

  ehParede(c, r) {
    if (c < 0 || r < 0 || c >= this.cols || r >= this.rows) return true;
    const cel = this.mapa[r][c];
    if (cel === 1) return true;
    if (cel === 2) return Sismografo.faseMutante;
    return false;
  },

  mover(dc, dr) {
    if (!this.ativo) return;
    const nc = this.player.c + dc;
    const nr = this.player.r + dr;
    if (!this.ehParede(nc, nr)) {
      this.player.c = nc;
      this.player.r = nr;
      this.checarEventos();
    }
  },

  guiarPonteiro(x, y) {
    if (!this.ativo) return;
    const tc = Math.floor(x / this.cellW);
    const tr = Math.floor(y / this.cellH);
    const dc = Math.sign(tc - this.player.c);
    const dr = Math.sign(tr - this.player.r);
    if (dc !== 0 && !this.ehParede(this.player.c + dc, this.player.r)) this.player.c += dc;
    else if (dr !== 0 && !this.ehParede(this.player.c, this.player.r + dr)) this.player.r += dr;
    this.checarEventos();
  },

  checarEventos() {
    if (!this.temFragmento && this.player.c === this.pontoFragmento.c && this.player.r === this.pontoFragmento.r) {
      this.temFragmento = true;
      const badge = document.getElementById('status-chave');
      badge.textContent = `🔑 SELOS: ${Estado.simbolosChave.join(' ')}`;
      badge.classList.add('obtida');
      document.getElementById('lab-instrucao').textContent =
        `✓ Selos [${Estado.simbolosChave.join(' ')}] extraídos! Siga até a porta no canto inferior direito.`;
      Sismografo.pico(2.2);
      return;
    }

    if (this.player.c === this.portaFinal.c && this.player.r === this.portaFinal.r) {
      if (!this.temFragmento) {
        document.getElementById('lab-instrucao').textContent =
          '🔒 PORTA TRANCADA! Colete o núcleo amarelo no centro do labirinto primeiro.';
        Sismografo.pico(1.8);
      } else {
        this.concluir();
      }
    }
  },

  concluir() {
    this.ativo = false;
    if (this.animId) cancelAnimationFrame(this.animId);
    document.getElementById('jogo-1').hidden = true;
    document.getElementById('fase-indicador').textContent = '02 / 04';
    Jogo2SeloCofre.iniciar();
  },

  eventosLigados: false,
  bindEventos() {
    if (this.eventosLigados) return;
    this.eventosLigados = true;

    const canvas = document.getElementById('canvas-labirinto');
    document.getElementById('btn-sonar').addEventListener('click', () => this.dispararSonar());
    canvas.addEventListener('click', () => this.dispararSonar());

    let ultimoPasso = 0;
    const moverPorEvento = (cx, cy) => {
      if (Date.now() - ultimoPasso < 75) return;
      ultimoPasso = Date.now();
      const rect = canvas.getBoundingClientRect();
      this.guiarPonteiro(
        (cx - rect.left) * (canvas.width / rect.width),
        (cy - rect.top) * (canvas.height / rect.height)
      );
    };

    canvas.addEventListener('mousemove', (e) => moverPorEvento(e.clientX, e.clientY));
    canvas.addEventListener('touchmove', (e) => {
      if (e.touches[0]) moverPorEvento(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });

    window.addEventListener('keydown', (e) => {
      if (!this.ativo) return;
      const teclas = {
        ArrowUp: [0, -1], w: [0, -1], W: [0, -1],
        ArrowDown: [0, 1], s: [0, 1], S: [0, 1],
        ArrowLeft: [-1, 0], a: [-1, 0], A: [-1, 0],
        ArrowRight: [1, 0], d: [1, 0], D: [1, 0]
      };
      if (teclas[e.key]) {
        e.preventDefault();
        this.mover(teclas[e.key][0], teclas[e.key][1]);
      }
    });

    document.querySelectorAll('[data-dir]').forEach((b) => {
      b.addEventListener('click', () => {
        const d = b.dataset.dir;
        if (d === 'up') this.mover(0, -1);
        if (d === 'down') this.mover(0, 1);
        if (d === 'left') this.mover(-1, 0);
        if (d === 'right') this.mover(1, 0);
      });
    });
  },

  loop() {
    if (!this.ativo) return;
    document.getElementById('lab-timer').textContent = `${((Date.now() - this.inicioTs) / 1000).toFixed(1)}s`;
    this.desenhar();
    this.animId = requestAnimationFrame(() => this.loop());
  },

  desenhar() {
    const canvas = document.getElementById('canvas-labirinto');
    const ctx = canvas.getContext('2d');
    const cor = corAtualTema();
    const px = this.player.c * this.cellW + this.cellW / 2;
    const py = this.player.r * this.cellH + this.cellH / 2;

    ctx.fillStyle = '#020305';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const cel = this.mapa[r][c];
        const x = c * this.cellW;
        const y = r * this.cellH;
        if (cel === 1) {
          ctx.fillStyle = '#141923';
          ctx.fillRect(x + 1, y + 1, this.cellW - 2, this.cellH - 2);
        } else if (cel === 2 && Sismografo.faseMutante) {
          ctx.fillStyle = 'rgba(255, 77, 94, 0.35)';
          ctx.fillRect(x + 2, y + 2, this.cellW - 4, this.cellH - 4);
        }
      }
    }

    if (!this.temFragmento) {
      ctx.fillStyle = '#f5b942';
      ctx.beginPath();
      ctx.arc(
        this.pontoFragmento.c * this.cellW + this.cellW / 2,
        this.pontoFragmento.r * this.cellH + this.cellH / 2,
        9, 0, Math.PI * 2
      );
      ctx.fill();
    }

    ctx.fillStyle = this.temFragmento ? cor : '#ff4d5e';
    ctx.fillRect(
      this.portaFinal.c * this.cellW + 7,
      this.portaFinal.r * this.cellH + 7,
      this.cellW - 14,
      this.cellH - 14
    );

    if (Date.now() > this.sonarAtivoAte) {
      const grad = ctx.createRadialGradient(px, py, 16, px, py, 92);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(0.75, 'rgba(0,0,0,0.88)');
      grad.addColorStop(1, 'rgba(0,0,0,0.99)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(px, py, 7, 0, Math.PI * 2);
    ctx.fill();
  }
};

/* ---------------------------------------------------------------------
   5. JOGO 02: QUEBRA-SELO (INTRUSO) + COFRE 4 DÍGITOS + SUBLIMINAR & SOM GLITCH (1s)
   --------------------------------------------------------------------- */
const Jogo2SeloCofre = {
  simbolosPool: ['Ω', 'Δ', 'Ψ', 'Φ', 'Σ', 'Ж', '☢', '👁'],
  tentativa: 1,
  tempoRestante: 10.0,
  timerId: null,
  ativo: false,
  etapaAtual: 'intruso',
  codigoAlvo: '',
  codigoDigitado: '',
  subliminarExibida: false,

  iniciar() {
    document.getElementById('jogo-2').hidden = false;
    document.getElementById('simbolos-herdados').textContent = Estado.simbolosChave.join(' ');
    this.tentativa = 1;
    this.bindTecladoCofre();
    this.prepararRodada(10.0);
  },

  prepararRodada(segundos) {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }

    this.tempoRestante = segundos;
    this.ativo = true;
    this.etapaAtual = 'intruso';
    this.codigoDigitado = '';
    this.subliminarExibida = false;

    const elTent = document.getElementById('selo-tentativa');
    elTent.textContent = `CHANCE: ${this.tentativa} / 2`;
    elTent.classList.toggle('perigo', this.tentativa === 2);

    document.getElementById('selo-subtitulo').textContent = 'PASSO 1: TOQUE NO SÍMBOLO INTRUSO';
    document.getElementById('bloco-intruso').hidden = false;
    document.getElementById('bloco-cofre').hidden = true;
    document.getElementById('flash-subliminar').hidden = true;

    this.montarGradeIntruso();
    this.iniciarCronometro();
  },

  montarGradeIntruso() {
    const grade = document.getElementById('grade-intruso');
    grade.innerHTML = '';

    const simboloBase = Estado.simbolosChave[0];
    const candidatosIntruso = this.simbolosPool.filter((s) => !Estado.simbolosChave.includes(s));
    const simboloIntruso = candidatosIntruso[Math.floor(Math.random() * candidatosIntruso.length)];
    const posIntruso = Math.floor(Math.random() * 9);

    for (let i = 0; i < 9; i++) {
      const ehIntruso = i === posIntruso;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn-carta-selo';
      btn.textContent = ehIntruso ? simboloIntruso : simboloBase;
      btn.addEventListener('click', () => {
        if (!this.ativo || this.etapaAtual !== 'intruso') return;
        if (ehIntruso) {
          Sismografo.pico(1.8);
          this.abrirCofre();
        } else {
          this.falharRodada();
        }
      });
      grade.appendChild(btn);
    }
  },

  abrirCofre() {
    this.etapaAtual = 'cofre';
    this.codigoAlvo = String(Math.floor(1000 + Math.random() * 9000));
    this.codigoDigitado = '';

    document.getElementById('selo-subtitulo').textContent = 'PASSO 2: DIGITE O CÓDIGO DO COFRE';
    document.getElementById('bloco-intruso').hidden = true;
    document.getElementById('bloco-cofre').hidden = false;
    document.getElementById('cofre-codigo-alvo').textContent = this.codigoAlvo;
    document.getElementById('cofre-digitado').textContent = '_ _ _ _';
  },

  dispararSubliminar1Seg() {
    if (this.subliminarExibida) return;
    this.subliminarExibida = true;

    const [s1, s2] = Estado.simbolosChave;
    const flash = document.getElementById('flash-subliminar');
    document.getElementById('texto-subliminar').textContent = `Você tem medo da ${s1}g ${s2}0 ?`;
    flash.hidden = false;

    // Dispara o som de falha elétrica / glitch de 1 segundo junto com o flash visual
    AudioSuspense.tocarFalhaGlitch(1.0);
    Sismografo.pico(2.8);

    setTimeout(() => {
      flash.hidden = true;
    }, 1000);
  },

  bindTecladoCofre() {
    if (this.ligado) return;
    this.ligado = true;

    document.querySelectorAll('.btn-num-cofre').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (!this.ativo || this.etapaAtual !== 'cofre') return;

        const digito = btn.dataset.num;
        const pos = this.codigoDigitado.length;

        if (digito === this.codigoAlvo[pos]) {
          this.codigoDigitado += digito;

          const exibicao = this.codigoDigitado
            .padEnd(4, '_')
            .split('')
            .join(' ');
          document.getElementById('cofre-digitado').textContent = exibicao;

          if (this.codigoDigitado.length === 2) {
            this.dispararSubliminar1Seg();
          }

          if (this.codigoDigitado.length === 4) {
            this.ativo = false;
            clearInterval(this.timerId);
            document.getElementById('flash-subliminar').hidden = true;
            Sismografo.pico(2.1);
            document.getElementById('jogo-2').hidden = true;
            document.getElementById('fase-indicador').textContent = '03 / 04';
            Jogo3Memoria.iniciar();
          }
        } else {
          this.falharRodada();
        }
      });
    });
  },

  iniciarCronometro() {
    const elTimer = document.getElementById('selo-timer');
    elTimer.textContent = `${this.tempoRestante.toFixed(1)}s`;

    this.timerId = setInterval(() => {
      if (!this.ativo) return;
      this.tempoRestante = Math.max(0, +(this.tempoRestante - 0.1).toFixed(1));
      elTimer.textContent = `${this.tempoRestante.toFixed(1)}s`;

      if (this.tempoRestante <= 0) {
        this.falharRodada();
      }
    }, 100);
  },

  falharRodada() {
    this.ativo = false;
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    document.getElementById('flash-subliminar').hidden = true;
    Sismografo.pico(2.8);

    if (this.tentativa === 1) {
      this.tentativa = 2;
      this.prepararRodada(5.0);
    } else {
      this.tentativa = 1;
      this.prepararRodada(10.0);
    }
  }
};

/* ---------------------------------------------------------------------
   6. JOGO 03: MEMÓRIA CRIPTOGRAFADA REVERSA
   --------------------------------------------------------------------- */
const Jogo3Memoria = {
  simbolos: ['Ω', 'Δ', 'Ψ', 'Φ', 'Σ', 'Ж', '☢', '👁'],
  sequencia: [],
  digitado: [],
  bloqueado: true,

  iniciar() {
    document.getElementById('jogo-3').hidden = false;
    const [s1, s2] = Estado.simbolosChave;
    document.getElementById('mem-conexao-texto').innerHTML =
      `A matriz incorpora os selos <strong>${s1}</strong> e <strong>${s2}</strong> do protocolo Ag 30. Memorize os 6 códigos e digite-os <strong>DE TRÁS PARA FRENTE</strong>.`;
    this.bindBotoes();
    this.novaRodada();
  },

  novaRodada() {
    this.bloqueado = true;
    this.digitado = [];
    this.sequencia = [...Estado.simbolosChave];
    while (this.sequencia.length < 6) {
      const s = this.simbolos[Math.floor(Math.random() * this.simbolos.length)];
      this.sequencia.push(s);
    }
    this.sequencia.sort(() => Math.random() - 0.5);

    this.setTeclado(false);
    document.getElementById('mem-status').textContent = 'TRANSMITINDO...';
    document.getElementById('mem-digitado').textContent = 'OBSERVE A ORDEM';

    const visor = document.getElementById('visor-sequencia');
    let idx = 0;

    const timer = setInterval(() => {
      if (idx < this.sequencia.length) {
        visor.textContent = `${idx + 1}: ${this.sequencia[idx]}`;
        idx++;
      } else {
        clearInterval(timer);
        visor.textContent = '???';
        this.bloqueado = false;
        this.setTeclado(true);
        document.getElementById('mem-status').textContent = 'DIGITE DE TRÁS PARA FRENTE';
        document.getElementById('mem-digitado').textContent = '_ _ _ _ _ _';
      }
    }, 680);
  },

  setTeclado(habilitar) {
    document.querySelectorAll('.btn-cripto').forEach((b) => {
      b.disabled = !habilitar;
    });
  },

  bindBotoes() {
    if (this.ligado) return;
    this.ligado = true;
    document.querySelectorAll('.btn-cripto').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (this.bloqueado) return;
        const sim = btn.dataset.simbolo;
        const esperada = [...this.sequencia].reverse();
        const pos = this.digitado.length;

        if (sim === esperada[pos]) {
          this.digitado.push(sim);
          document.getElementById('mem-digitado').textContent = this.digitado.join(' ');
          if (this.digitado.length === 6) {
            this.bloqueado = true;
            Sismografo.pico(2.2);
            document.getElementById('jogo-3').hidden = true;
            document.getElementById('fase-indicador').textContent = 'CONSULTA 02';
            EnqueteIntermediaria2.iniciar();
          }
        } else {
          Sismografo.pico(2.5);
          document.getElementById('mem-digitado').textContent = '✕ ERRO NA ORDEM REVERSA! REINICIANDO...';
          this.bloqueado = true;
          setTimeout(() => this.novaRodada(), 1100);
        }
      });
    });
  }
};

/* ---------------------------------------------------------------------
   6B. MINI ENQUETE APÓS O JOGO 03 (PEDRO ALONSO LÓPEZ)
   --------------------------------------------------------------------- */
const EnqueteIntermediaria2 = {
  votos: { filtrada: 142, contaminada: 618, rivotril: 894 },

  iniciar() {
    const sec = document.getElementById('enquete-intermediaria-2');
    sec.hidden = false;

    try {
      const salvos = JSON.parse(localStorage.getItem(CONFIG.chaveEnquete2) || 'null');
      if (salvos && typeof salvos.filtrada === 'number') this.votos = salvos;
    } catch (_) { /* ignora */ }

    const totalInicial = this.votos.filtrada + this.votos.contaminada + this.votos.rivotril;
    document.getElementById('enquete2-total').textContent = `VOTOS: ${totalInicial.toLocaleString('pt-BR')}`;

    document.querySelectorAll('.opcao-voto-2').forEach((btn) => {
      btn.addEventListener('click', () => this.votar(btn.dataset.opcao2));
    });

    document.getElementById('btn-entrar-jogo4').addEventListener('click', () => {
      sec.hidden = true;
      document.getElementById('fase-indicador').textContent = '04 / 04';
      Jogo4Matematica.iniciar();
    });
  },

  votar(opcao) {
    if (Estado.voto2Registrado) return;
    Estado.voto2Registrado = opcao;
    this.votos[opcao] = (this.votos[opcao] || 0) + 1;

    try { localStorage.setItem(CONFIG.chaveEnquete2, JSON.stringify(this.votos)); } catch (_) {}

    const chaves = ['filtrada', 'contaminada', 'rivotril'];
    const total = chaves.reduce((acc, k) => acc + this.votos[k], 0);

    chaves.forEach((k) => {
      const pct = Math.round((this.votos[k] / total) * 100);
      document.getElementById(`pct2-${k}`).textContent = `${pct}%`;
      document.getElementById(`bar2-${k}`).style.width = `${pct}%`;
    });

    document.querySelectorAll('.opcao-voto-2').forEach((b) => {
      b.classList.toggle('votado', b.dataset.opcao2 === opcao);
    });

    document.getElementById('enquete2-total').textContent = `VOTOS: ${total.toLocaleString('pt-BR')}`;
    document.getElementById('enquete2-acoes').hidden = false;
    Sismografo.pico(1.8);
  }
};

/* ---------------------------------------------------------------------
   7. JOGO 04: 10 CÁLCULOS (9º FRAÇÃO E 10º PORCENTAGEM; 2 ERROS = RESET)
   --------------------------------------------------------------------- */
const Jogo4Matematica = {
  indice: 1,
  total: 10,
  erros: 0,
  maxErros: 2,
  respostaAtual: 0,

  iniciar() {
    document.getElementById('jogo-4').hidden = false;
    this.resetarTudo();
    this.bindForm();
  },

  resetarTudo() {
    this.indice = 1;
    this.erros = 0;
    this.atualizarHUD();
    this.gerarCalculo();
  },

  atualizarHUD() {
    document.getElementById('math-progresso').textContent = `CÁLCULO: ${this.indice} / ${this.total}`;
    const elErros = document.getElementById('math-erros');
    elErros.textContent = `ERROS: ${this.erros} / ${this.maxErros}`;
    elErros.classList.toggle('perigo', this.erros >= 1);
  },

  gerarCalculo() {
    const nivel = this.indice;
    const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
    let texto = '';
    let res = 0;

    if (nivel <= 3) {
      const a = rand(24, 98);
      const b = rand(15, 79);
      if (Math.random() > 0.5) {
        texto = `${a} + ${b}`;
        res = a + b;
      } else {
        const maior = Math.max(a, b);
        const menor = Math.min(a, b);
        texto = `${maior} − ${menor}`;
        res = maior - menor;
      }
    } else if (nivel <= 6) {
      const a = rand(7, 16);
      const b = rand(6, 14);
      texto = `${a} × ${b}`;
      res = a * b;
    } else if (nivel <= 8) {
      const a = rand(6, 13);
      const b = rand(4, 11);
      const c = rand(10, 45);
      texto = `(${a} × ${b}) + ${c}`;
      res = a * b + c;
    } else if (nivel === 9) {
      const opcoesFracao = [
        { num: 3, den: 4, base: 80, ans: 60 },
        { num: 2, den: 5, base: 150, ans: 60 },
        { num: 3, den: 5, base: 120, ans: 72 },
        { num: 5, den: 8, base: 64, ans: 40 },
        { num: 2, den: 3, base: 90, ans: 60 },
        { num: 4, den: 5, base: 75, ans: 60 }
      ];
      const f = opcoesFracao[Math.floor(Math.random() * opcoesFracao.length)];
      texto = `${f.num}/${f.den} de ${f.base}`;
      res = f.ans;
    } else {
      const opcoesPct = [
        { pct: 25, base: 160, ans: 40 },
        { pct: 15, base: 200, ans: 30 },
        { pct: 35, base: 200, ans: 70 },
        { pct: 40, base: 150, ans: 60 },
        { pct: 75, base: 120, ans: 90 },
        { pct: 20, base: 350, ans: 70 }
      ];
      const p = opcoesPct[Math.floor(Math.random() * opcoesPct.length)];
      texto = `${p.pct}% de ${p.base}`;
      res = p.ans;
    }

    this.respostaAtual = res;
    document.getElementById('math-equacao').textContent = `${texto} = ?`;
    const inp = document.getElementById('input-math');
    inp.value = '';
    inp.focus();
  },

  bindForm() {
    if (this.ligado) return;
    this.ligado = true;

    const form = document.getElementById('form-math');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const inp = document.getElementById('input-math');
      const val = parseInt(inp.value, 10);
      const fb = document.getElementById('math-feedback');

      if (Number.isNaN(val)) return;

      if (val === this.respostaAtual) {
        Sismografo.pico(1.5);
        fb.style.color = corAtualTema();
        fb.textContent = '✓ CORRETO!';

        if (this.indice >= this.total) {
          document.getElementById('jogo-4').hidden = true;
          document.getElementById('fase-indicador').textContent = 'CONCLUÍDO';
          Interruptor2030.mostrar();
          return;
        }

        this.indice++;
        this.atualizarHUD();
        this.gerarCalculo();
      } else {
        this.erros++;
        Sismografo.pico(2.6);
        fb.style.color = '#ff4d5e';

        if (this.erros >= this.maxErros) {
          fb.textContent = `✕ 2º ERRO (Era ${this.respostaAtual})! REINICIANDO TODOS OS 10 CÁLCULOS...`;
          this.resetarTudo();
        } else {
          fb.textContent = `✕ INCORRETO (Era ${this.respostaAtual})! VOCÊ TEM APENAS MAIS 1 CHANCE.`;
          this.atualizarHUD();
          this.gerarCalculo();
        }
      }
    });
  }
};

/* ---------------------------------------------------------------------
   8. INTERRUPTOR DE MINUTOS ATÉ 2030
   --------------------------------------------------------------------- */
const Interruptor2030 = {
  mostrar() {
    const sec = document.getElementById('etapa-interruptor');
    sec.hidden = false;
    const tempoTotal = ((Date.now() - Estado.inicioGeralTs) / 1000).toFixed(1);
    document.getElementById('badge-rank-tempo').textContent = `TEMPO TOTAL: ${tempoTotal}s`;
    sec.scrollIntoView({ behavior: 'smooth', block: 'start' });

    const btn = document.getElementById('btn-interruptor');
    btn.addEventListener('click', () => {
      if (btn.classList.contains('ligado')) return;
      btn.classList.add('ligado');
      btn.setAttribute('aria-pressed', 'true');
      document.getElementById('switch-label').textContent = 'INTERRUPTOR ATIVADO';
      document.getElementById('box-2030').hidden = false;
      Sismografo.pico(2.4);

      const alvo2030 = Date.UTC(2030, 0, 1, 0, 0, 0);
      const elNum = document.getElementById('minutos-2030');
      const tick = () => {
        const min = Math.max(0, alvo2030 - Date.now()) / 60000;
        elNum.textContent = min.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      };
      tick();
      setInterval(tick, 100);

      EnqueteFinal.mostrar();
    });
  }
};

/* ---------------------------------------------------------------------
   9. ETAPA FINAL: TRIAGEM + ENQUETE THIAGO MISTERY + CRÉDITO
   --------------------------------------------------------------------- */
const EnqueteFinal = {
  votos: { deepweb: 412, conspiracao: 589, investigacoes: 619 },

  mostrar() {
    const sec = document.getElementById('etapa-final');
    sec.hidden = false;
    this.atualizarProvaSocial(null);

    try {
      const salvos = JSON.parse(localStorage.getItem(CONFIG.chaveEnquete) || 'null');
      if (salvos && typeof salvos.deepweb === 'number') this.votos = salvos;
    } catch (_) { /* ignora */ }

    document.getElementById('btn-sou-inscrito').addEventListener('click', () => {
      Estado.ehInscrito = true;
      this.atualizarProvaSocial(true);
      this.liberarEnquete();
    });

    document.getElementById('btn-nao-inscrito').addEventListener('click', () => {
      Estado.ehInscrito = false;
      this.atualizarProvaSocial(false);
      document.getElementById('bloqueio-inscricao').hidden = false;
      Sismografo.pico(1.8);
    });

    document.getElementById('btn-confirmar-inscricao').addEventListener('click', () => {
      Estado.ehInscrito = true;
      this.atualizarProvaSocial(true);
      document.getElementById('bloqueio-inscricao').hidden = true;
      this.liberarEnquete();
    });

    document.querySelectorAll('[data-opcao]').forEach((btn) => {
      btn.addEventListener('click', () => this.votar(btn.dataset.opcao));
    });
  },

  atualizarProvaSocial(novoStatus) {
    let dados = { inscritos: 84, naoInscritos: 16 };
    try {
      const salvo = JSON.parse(localStorage.getItem(CONFIG.chaveTriagem) || 'null');
      if (salvo && typeof salvo.inscritos === 'number') dados = salvo;
    } catch (_) { /* ignora */ }

    if (novoStatus === true) dados.inscritos++;
    if (novoStatus === false) dados.naoInscritos++;
    try { localStorage.setItem(CONFIG.chaveTriagem, JSON.stringify(dados)); } catch (_) {}

    const total = Math.max(1, dados.inscritos + dados.naoInscritos);
    const pctIns = Math.round((dados.inscritos / total) * 100);
    document.getElementById('prova-social-texto').textContent =
      `Comunidade: ${pctIns}% Inscritos · ${100 - pctIns}% Externos`;
  },

  liberarEnquete() {
    document.getElementById('bloco-triagem-final').hidden = true;
    document.getElementById('bloco-enquete').hidden = false;
    Sismografo.pico(1.6);
  },

  votar(opcao) {
    if (!Estado.ehInscrito || Estado.votoRegistrado) return;
    Estado.votoRegistrado = opcao;
    this.votos[opcao] = (this.votos[opcao] || 0) + 1;
    try { localStorage.setItem(CONFIG.chaveEnquete, JSON.stringify(this.votos)); } catch (_) {}

    const total = this.votos.deepweb + this.votos.conspiracao + this.votos.investigacoes;
    ['deepweb', 'conspiracao', 'investigacoes'].forEach((k) => {
      const pct = Math.round((this.votos[k] / total) * 100);
      document.getElementById(`pct-${k}`).textContent = `${pct}%`;
      document.getElementById(`bar-${k}`).style.width = `${pct}%`;
    });

    document.querySelectorAll('[data-opcao]').forEach((b) => {
      b.classList.toggle('votado', b.dataset.opcao === opcao);
    });

    document.getElementById('enquete-feedback').textContent =
      `✓ Voto computado (${total.toLocaleString('pt-BR')} votos totais).`;

    const rodape = document.getElementById('rodape-final');
    rodape.hidden = false;
    rodape.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }
};

/* ---------------------------------------------------------------------
   10. INICIALIZAÇÃO A PARTIR DA TELA PRETA
   --------------------------------------------------------------------- */
function iniciar() {
  try {
    const salvoTema = localStorage.getItem(CONFIG.chaveTema);
    if (salvoTema) aplicarTema(salvoTema);
  } catch (_) {}

  document.querySelectorAll('.btn-tema').forEach((btn) => {
    btn.addEventListener('click', () => aplicarTema(btn.dataset.temaBtn));
  });

  document.getElementById('btn-som').addEventListener('click', () => AudioSuspense.alternar());

  setInterval(() => {
    const el = document.getElementById('relogio');
    if (el) el.textContent = new Date().toLocaleTimeString('pt-BR');
  }, 1000);

  Visitantes.iniciar();

  document.getElementById('btn-iniciar-tudo').addEventListener('click', () => {
    const telaPreta = document.getElementById('tela-preta');
    telaPreta.classList.add('apagando');
    document.body.classList.remove('estado-escuro');

    AudioSuspense.iniciar();
    Estado.inicioGeralTs = Date.now();

    document.getElementById('topo-sistema').hidden = false;
    document.getElementById('area-principal').hidden = false;

    Sismografo.iniciar();
    EnqueteInicial.iniciar();

    setTimeout(() => { telaPreta.hidden = true; }, 900);
  });
}

iniciar();
