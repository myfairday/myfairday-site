/* =====================================================================
   APP.JS — TELA PRETA + ÁUDIO SUSPENSE + 4 JOGOS + CONTADOR 2030 + ENQUETE
   ===================================================================== */
'use strict';

const CONFIG = {
  chaveTema: 'proto2030_tema_v2',
  chaveVisTotal: 'myfairday_vis_num_v2',
  chaveTriagem: 'proto2030_triagem_stats_v2',
  chaveEnquete: 'proto2030_enquete_v2'
};

/* ---------------------------------------------------------------------
   1. MOTOR DE ÁUDIO DE SUSPENSE (STREAM + SINTETIZADOR AMBIENTE)
   --------------------------------------------------------------------- */
const AudioSuspense = {
  ctx: null,
  ativo: false,
  streamEl: null,

  iniciar() {
    if (this.ativo) return;
    this.ativo = true;

    // 1. Tenta tocar stream público de ambient dark/space (SomaFM Drone Zone)
    try {
      this.streamEl = new Audio('https://ice1.somafm.com/dronezone-128-mp3');
      this.streamEl.volume = 0.35;
      this.streamEl.play().catch(() => {});
    } catch (_) { /* ignora */ }

    // 2. Gera simultaneamente um drone grave de tensão via Web Audio API (garante som imediato)
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();

      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc1.type = 'sawtooth';
      osc1.frequency.value = 46.25; // F#1 grave sombrio

      osc2.type = 'sine';
      osc2.frequency.value = 47.1;  // Batimento binaural tenso

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
      if (btn) btn.textContent = '🔊';
      return;
    }

    if (this.streamEl) {
      this.streamEl.muted = !this.streamEl.muted;
    }
    if (this.masterGain && this.ctx) {
      const mudo = this.masterGain.gain.value === 0;
      this.masterGain.gain.setValueAtTime(mudo ? 0.08 : 0, this.ctx.currentTime);
      if (btn) btn.textContent = mudo ? '🔊' : '🔇';
    }
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
  votoRegistrado: null
};

/* ---------------------------------------------------------------------
   3. JOGO 01: LABIRINTO + PERGUNTA DE 1 CHANCE + CHAVE DA PORTA
   --------------------------------------------------------------------- */
const Jogo1Labirinto = {
  cols: 19,
  rows: 11,
  cellW: 40,
  cellH: 40,
  player: { c: 1, r: 1 },
  pontoPergunta: { c: 9, r: 5 },
  portaFinal: { c: 17, r: 9 },
  temChave: false,
  perguntaAberta: false,
  sonarRestante: 3,
  sonarAtivoAte: 0,
  inicioTs: 0,
  ativo: false,
  animId: null,

  // 1 = parede, 0 = livre, 2 = parede mutante
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
    this.player = { c: 1, r: 1 };
    this.temChave = false;
    this.perguntaAberta = false;
    this.sonarRestante = 3;
    this.sonarAtivoAte = 0;
    this.inicioTs = Date.now();
    this.ativo = true;

    document.getElementById('status-chave').textContent = '🔑 CHAVE: AUSENTE';
    document.getElementById('status-chave').classList.remove('obtida');
    document.getElementById('lab-instrucao').textContent =
      'Encontre o terminal amarelo no escuro para responder à pergunta e pegar a chave.';
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
    if (!this.ativo || this.perguntaAberta || this.sonarRestante <= 0) return;
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
    if (!this.ativo || this.perguntaAberta) return;
    const nc = this.player.c + dc;
    const nr = this.player.r + dr;
    if (!this.ehParede(nc, nr)) {
      this.player.c = nc;
      this.player.r = nr;
      this.checarEventos();
    }
  },

  guiarPonteiro(x, y) {
    if (!this.ativo || this.perguntaAberta) return;
    const tc = Math.floor(x / this.cellW);
    const tr = Math.floor(y / this.cellH);
    const dc = Math.sign(tc - this.player.c);
    const dr = Math.sign(tr - this.player.r);
    if (dc !== 0 && !this.ehParede(this.player.c + dc, this.player.r)) this.player.c += dc;
    else if (dr !== 0 && !this.ehParede(this.player.c, this.player.r + dr)) this.player.r += dr;
    this.checarEventos();
  },

  checarEventos() {
    // 1. Chegou no local da pergunta para pegar a chave
    if (!this.temChave && this.player.c === this.pontoPergunta.c && this.player.r === this.pontoPergunta.r) {
      this.abrirPergunta();
      return;
    }

    // 2. Chegou na porta final do labirinto
    if (this.player.c === this.portaFinal.c && this.player.r === this.portaFinal.r) {
      if (!this.temChave) {
        document.getElementById('lab-instrucao').textContent =
          '🔒 PORTA TRANCADA! Você precisa encontrar o terminal amarelo e pegar a chave primeiro.';
        Sismografo.pico(1.8);
      } else {
        this.concluir();
      }
    }
  },

  abrirPergunta() {
    this.perguntaAberta = true;
    const modal = document.getElementById('modal-pergunta');
    const fb = document.getElementById('modal-feedback');
    fb.textContent = '';
    modal.hidden = false;
  },

  responderPergunta(letra) {
    const modal = document.getElementById('modal-pergunta');
    const fb = document.getElementById('modal-feedback');

    if (letra === 'c') {
      // Acertou: ganha a chave
      this.temChave = true;
      this.perguntaAberta = false;
      modal.hidden = true;

      const badge = document.getElementById('status-chave');
      badge.textContent = '🔑 CHAVE: OBTIDA';
      badge.classList.add('obtida');
      document.getElementById('lab-instrucao').textContent =
        '✓ Chave obtida! Agora siga até a porta no canto inferior direito para avançar.';
      Sismografo.pico(2.2);
    } else {
      // Errou: punição — fecha o modal e joga o jogador de volta para o início do labirinto
      fb.textContent = '✕ RESPOSTA INCORRETA! Reiniciando posição no labirinto...';
      Sismografo.pico(2.8);
      setTimeout(() => {
        modal.hidden = true;
        this.perguntaAberta = false;
        this.player = { c: 1, r: 1 };
      }, 1200);
    }
  },

  concluir() {
    this.ativo = false;
    if (this.animId) cancelAnimationFrame(this.animId);
    document.getElementById('jogo-1').hidden = true;
    document.getElementById('fase-indicador').textContent = '02 / 04';
    Jogo2Sintonia.iniciar();
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
      if (!this.ativo || this.perguntaAberta) return;
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

    document.querySelectorAll('.btn-alt').forEach((b) => {
      b.addEventListener('click', () => this.responderPergunta(b.dataset.resp));
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

    // Ponto da Pergunta / Chave (amarelo pulsante)
    if (!this.temChave) {
      ctx.fillStyle = '#f5b942';
      ctx.beginPath();
      ctx.arc(
        this.pontoPergunta.c * this.cellW + this.cellW / 2,
        this.pontoPergunta.r * this.cellH + this.cellH / 2,
        9, 0, Math.PI * 2
      );
      ctx.fill();
    }

    // Porta Final (vermelha se trancada, verde/tema se destrancada)
    ctx.fillStyle = this.temChave ? cor : '#ff4d5e';
    ctx.fillRect(
      this.portaFinal.c * this.cellW + 7,
      this.portaFinal.r * this.cellH + 7,
      this.cellW - 14,
      this.cellH - 14
    );

    // Escuridão com raio de lanterna apertado
    if (Date.now() > this.sonarAtivoAte) {
      const grad = ctx.createRadialGradient(px, py, 16, px, py, 86);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(0.75, 'rgba(0,0,0,0.88)');
      grad.addColorStop(1, 'rgba(0,0,0,0.99)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Jogador
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(px, py, 7, 0, Math.PI * 2);
    ctx.fill();
  }
};

/* ---------------------------------------------------------------------
   4. JOGO 02: SINTONIA DE FREQUÊNCIA INSTÁVEL (OSCILOSCÓPIO)
   --------------------------------------------------------------------- */
const Jogo2Sintonia = {
  ativo: false,
  alvoFreq: 68,
  alvoFase: 34,
  estabilidade: 0,
  t: 0,

  iniciar() {
    const sec = document.getElementById('jogo-2');
    sec.hidden = false;
    this.ativo = true;
    this.estabilidade = 0;
    this.alvoFreq = Math.floor(25 + Math.random() * 55);
    this.alvoFase = Math.floor(20 + Math.random() * 60);
    this.loop();
  },

  loop() {
    if (!this.ativo) return;
    this.t += 0.08;

    const uFreq = Number(document.getElementById('slider-freq').value);
    const uFase = Number(document.getElementById('slider-fase').value);

    // Alvo oscila levemente para aumentar a dificuldade
    const freqDinamica = this.alvoFreq + Math.sin(this.t * 0.4) * 6;
    const diffFreq = Math.abs(uFreq - freqDinamica);
    const diffFase = Math.abs(uFase - this.alvoFase);

    if (diffFreq < 4.5 && diffFase < 6) {
      this.estabilidade = Math.min(100, this.estabilidade + 1.1);
    } else {
      this.estabilidade = Math.max(0, this.estabilidade - 0.8);
    }

    document.getElementById('sintonia-progresso').textContent =
      `ESTABILIDADE: ${Math.round(this.estabilidade)}%`;

    this.desenhar(uFreq, uFase, freqDinamica, this.alvoFase);

    if (this.estabilidade >= 100) {
      this.ativo = false;
      Sismografo.pico(2.0);
      document.getElementById('jogo-2').hidden = true;
      document.getElementById('fase-indicador').textContent = '03 / 04';
      Jogo3Memoria.iniciar();
      return;
    }

    requestAnimationFrame(() => this.loop());
  },

  desenhar(uFreq, uFase, tFreq, tFase) {
    const canvas = document.getElementById('canvas-onda');
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;
    const cor = corAtualTema();

    ctx.fillStyle = '#020305';
    ctx.fillRect(0, 0, W, H);

    // Onda Alvo (vermelha)
    ctx.strokeStyle = '#ff4d5e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = 0; x < W; x += 4) {
      const y = H / 2 + Math.sin((x * tFreq * 0.002) + (tFase * 0.1) + this.t) * 68;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Onda do Jogador
    ctx.strokeStyle = cor;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let x = 0; x < W; x += 4) {
      const y = H / 2 + Math.sin((x * uFreq * 0.002) + (uFase * 0.1) + this.t) * 68;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
};

/* ---------------------------------------------------------------------
   5. JOGO 03: MEMÓRIA CRIPTOGRAFADA REVERSA (6 SÍMBOLOS INVERTIDOS)
   --------------------------------------------------------------------- */
const Jogo3Memoria = {
  simbolos: ['Ω', 'Δ', 'Ψ', 'Φ', 'Σ', 'Ж', '☢', '👁'],
  sequencia: [],
  digitado: [],
  bloqueado: true,

  iniciar() {
    document.getElementById('jogo-3').hidden = false;
    this.bindBotoes();
    this.novaRodada();
  },

  novaRodada() {
    this.bloqueado = true;
    this.digitado = [];
    this.sequencia = [];
    for (let i = 0; i < 6; i++) {
      const s = this.simbolos[Math.floor(Math.random() * this.simbolos.length)];
      this.sequencia.push(s);
    }

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
            document.getElementById('fase-indicador').textContent = '04 / 04';
            Jogo4Nucleo.iniciar();
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
   6. JOGO 04: TRAVA DE NÚCLEO GIRATÓRIO (4 ACERTOS PRECISOS)
   --------------------------------------------------------------------- */
const Jogo4Nucleo = {
  ativo: false,
  angulo: 0,
  velocidade: 0.055,
  alvoAngulo: 1.2,
  larguraAlvo: 0.42,
  travas: 0,

  iniciar() {
    document.getElementById('jogo-4').hidden = false;
    this.ativo = true;
    this.travas = 0;
    this.velocidade = 0.055;
    this.sortearAlvo();
    this.bindEventos();
    this.loop();
  },

  sortearAlvo() {
    this.alvoAngulo = Math.random() * Math.PI * 2;
    this.larguraAlvo = Math.max(0.24, 0.44 - this.travas * 0.05);
    this.velocidade = (0.055 + this.travas * 0.018) * (this.travas % 2 === 0 ? 1 : -1);
  },

  tentarTravar() {
    if (!this.ativo) return;
    const norm = (a) => ((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const a1 = norm(this.angulo);
    const a2 = norm(this.alvoAngulo);
    let diff = Math.abs(a1 - a2);
    if (diff > Math.PI) diff = Math.PI * 2 - diff;

    if (diff <= this.larguraAlvo / 2) {
      this.travas++;
      Sismografo.pico(1.8);
      document.getElementById('nucleo-travas').textContent = `TRAVAS: ${this.travas} / 4`;
      if (this.travas >= 4) {
        this.ativo = false;
        document.getElementById('jogo-4').hidden = true;
        document.getElementById('fase-indicador').textContent = 'CONCLUÍDO';
        Interruptor2030.mostrar();
        return;
      }
      this.sortearAlvo();
    } else {
      // Erro perde 1 trava
      this.travas = Math.max(0, this.travas - 1);
      Sismografo.pico(2.4);
      document.getElementById('nucleo-travas').textContent = `TRAVAS: ${this.travas} / 4 (FALHA)`;
      this.sortearAlvo();
    }
  },

  bindEventos() {
    if (this.ligado) return;
    this.ligado = true;
    document.getElementById('btn-travar-nucleo').addEventListener('click', () => this.tentarTravar());
    window.addEventListener('keydown', (e) => {
      if (this.ativo && e.code === 'Space') {
        e.preventDefault();
        this.tentarTravar();
      }
    });
  },

  loop() {
    if (!this.ativo) return;
    this.angulo += this.velocidade;
    this.desenhar();
    requestAnimationFrame(() => this.loop());
  },

  desenhar() {
    const canvas = document.getElementById('canvas-nucleo');
    const ctx = canvas.getContext('2d');
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const r = 115;
    const cor = corAtualTema();

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Anel base
    ctx.strokeStyle = '#1e2533';
    ctx.lineWidth = 18;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();

    // Zona alvo
    ctx.strokeStyle = cor;
    ctx.lineWidth = 18;
    ctx.beginPath();
    ctx.arc(cx, cy, r, this.alvoAngulo - this.larguraAlvo / 2, this.alvoAngulo + this.larguraAlvo / 2);
    ctx.stroke();

    // Ponteiro giratório
    ctx.strokeStyle = '#ff4d5e';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(this.angulo) * (r + 14), cy + Math.sin(this.angulo) * (r + 14));
    ctx.stroke();
  }
};

/* ---------------------------------------------------------------------
   7. INTERRUPTOR DE MINUTOS ATÉ 2030
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
   8. ETAPA FINAL: TRIAGEM (INSCRITO / NÃO INSCRITO) + ENQUETE + CRÉDITO
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

    document.querySelectorAll('.opcao-voto').forEach((btn) => {
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

    document.querySelectorAll('.opcao-voto').forEach((b) => {
      b.classList.toggle('votado', b.dataset.opcao === opcao);
    });

    document.getElementById('enquete-feedback').textContent =
      `✓ Voto computado (${total.toLocaleString('pt-BR')} votos totais).`;

    // Revela o rodapé com "Criado por Thiago Mistery" somente no final de tudo
    const rodape = document.getElementById('rodape-final');
    rodape.hidden = false;
    rodape.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }
};

/* ---------------------------------------------------------------------
   9. INICIALIZAÇÃO A PARTIR DA TELA PRETA
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

  // Clique na tela preta inicial acende o site, inicia o áudio e abre o Jogo 1
  document.getElementById('btn-iniciar-tudo').addEventListener('click', () => {
    const telaPreta = document.getElementById('tela-preta');
    telaPreta.classList.add('apagando');
    document.body.classList.remove('estado-escuro');

    AudioSuspense.iniciar();
    Estado.inicioGeralTs = Date.now();

    document.getElementById('topo-sistema').hidden = false;
    document.getElementById('area-principal').hidden = false;

    Sismografo.iniciar();
    Jogo1Labirinto.iniciar();

    setTimeout(() => { telaPreta.hidden = true; }, 900);
  });
}

iniciar();
