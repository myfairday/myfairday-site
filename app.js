/* =====================================================================
   PROTOCOLO 2030 · APP.JS
   Triagem -> Labirinto (Lanterna + Sismógrafo + Vantagem + Armadilha)
   -> Interruptor Minutos até 2030 -> Enquete Gamificada -> Crédito Final
   ===================================================================== */
'use strict';

const CONFIG = {
  chaveTema: 'proto2030_tema_v1',
  chaveVisTotal: 'myfairday_vis_num_v2',
  chaveTriagem: 'proto2030_triagem_stats_v1',
  chaveEnquete: 'proto2030_enquete_v1'
};

/* ---------------------------------------------------------------------
   1. TEMAS E RELÓGIO
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

/* ---------------------------------------------------------------------
   2. CONTADOR DE VISITANTES ÚNICOS (SEM CONTAR F5)
   --------------------------------------------------------------------- */
const Visitantes = {
  total: 1,

  atualizarTexto() {
    const el = document.getElementById('visitantes');
    if (el) el.textContent = `visitantes: ${Math.max(1, this.total).toLocaleString('pt-BR')}`;
  },

  jaVisitouAntes() {
    let porStorage = false;
    let porCookie = false;
    try { porStorage = localStorage.getItem('myfairday_counted_permanent') === 'true'; } catch (_) { /* ignora */ }
    try { porCookie = document.cookie.includes('myfairday_counted=1'); } catch (_) { /* ignora */ }
    return porStorage || porCookie;
  },

  marcarComoVisitado(val) {
    try {
      localStorage.setItem('myfairday_counted_permanent', 'true');
      if (val > 0) localStorage.setItem(CONFIG.chaveVisTotal, String(val));
    } catch (_) { /* ignora */ }
    try {
      document.cookie = 'myfairday_counted=1; max-age=31536000; path=/; SameSite=Lax';
      if (val > 0) document.cookie = `myfairday_total=${val}; max-age=31536000; path=/; SameSite=Lax`;
    } catch (_) { /* ignora */ }
  },

  lerTotalSalvo() {
    let val = 0;
    try { val = parseInt(localStorage.getItem(CONFIG.chaveVisTotal), 10) || 0; } catch (_) { /* ignora */ }
    if (val === 0) {
      try {
        const m = document.cookie.match(/myfairday_total=(\d+)/);
        if (m) val = parseInt(m[1], 10) || 0;
      } catch (_) { /* ignora */ }
    }
    return val;
  },

  async iniciar() {
    const pageId = 'myfairday.org-protocolo-2030';
    const cache = this.lerTotalSalvo();
    const jaContou = this.jaVisitouAntes();

    this.total = cache > 0 ? cache : 1;
    this.atualizarTexto();

    if (jaContou) return;
    this.marcarComoVisitado(this.total);

    try {
      const res = await fetch(`https://api.visitorbadge.io/api/visitors?path=${encodeURIComponent(pageId)}&countColor=%232ee59d`);
      const svgText = await res.text();
      const matches = [...svgText.matchAll(/<text[^>]*>([\d.,]+)<\/text>/gi)];
      if (matches.length > 0) {
        const num = parseInt(matches[matches.length - 1][1].replace(/[^\d]/g, ''), 10);
        if (!Number.isNaN(num) && num > 0) {
          this.total = Math.max(num, cache);
          this.marcarComoVisitado(this.total);
          this.atualizarTexto();
          return;
        }
      }
    } catch (_) { /* fallback */ }

    this.total = cache + 1;
    this.marcarComoVisitado(this.total);
    this.atualizarTexto();
  }
};

/* ---------------------------------------------------------------------
   3. SISMÓGRAFO DO TOPO (SINCRONIZADO COM PAREDES DO LABIRINTO)
   --------------------------------------------------------------------- */
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
      const agora = Date.now();
      // A cada 2.4 segundos dispara um pico sísmico que alterna paredes mutantes no labirinto
      if (agora - ultimoPulso > 2400) {
        ultimoPulso = agora;
        this.pico(1.4);
        this.faseMutante = !this.faseMutante;
      }

      const ruido = (Math.random() - 0.5) * 2.5;
      const sinal = Math.sin(this.t) * (1.8 + this.energia * 14) + ruido * (1 + this.energia * 4);
      this.pts.push(sinal);
      this.pts.shift();
      this.energia = Math.max(0.25, this.energia * 0.95);
      this.desenhar();
      requestAnimationFrame(passo);
    };
    requestAnimationFrame(passo);
  },

  pico(forca = 1.2) {
    this.energia = Math.min(2.8, this.energia + forca);
  },

  desenhar() {
    if (!this.poly) return;
    const dx = 1000 / (this.N - 1);
    let str = '';
    for (let i = 0; i < this.N; i++) {
      const y = Math.min(96, Math.max(4, 50 - this.pts[i]));
      str += `${(i * dx).toFixed(1)},${y.toFixed(1)} `;
    }
    this.poly.setAttribute('points', str);
  }
};

/* ---------------------------------------------------------------------
   4. ESTADO DO DESAFIO E TRIAGEM
   --------------------------------------------------------------------- */
const Estado = {
  ehInscrito: false,
  tempoLabirintoSeg: 0,
  interruptorLigado: false,
  votoRegistrado: null
};

const Triagem = {
  iniciar() {
    this.atualizarProvaSocial(null);

    document.getElementById('btn-sou-inscrito').addEventListener('click', () => {
      this.selecionar(true);
    });

    document.getElementById('btn-nao-inscrito').addEventListener('click', () => {
      this.selecionar(false);
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

    try { localStorage.setItem(CONFIG.chaveTriagem, JSON.stringify(dados)); } catch (_) { /* ignora */ }

    const total = Math.max(1, dados.inscritos + dados.naoInscritos);
    const pctIns = Math.round((dados.inscritos / total) * 100);
    const pctNao = 100 - pctIns;

    document.getElementById('prova-social-texto').textContent =
      `Comunidade: ${pctIns}% Inscritos · ${pctNao}% Externos`;
  },

  selecionar(ehInscrito) {
    Estado.ehInscrito = ehInscrito;
    this.atualizarProvaSocial(ehInscrito);

    document.getElementById('btn-sou-inscrito').classList.toggle('selecionado', ehInscrito);
    document.getElementById('btn-nao-inscrito').classList.toggle('selecionado', !ehInscrito);

    document.getElementById('lema-principal').textContent = ehInscrito
      ? 'Credencial Nível 2 reconhecida. Radar auxiliar ativado.'
      : 'Acesso externo detectado. Névoa densa ativada.';

    Sismografo.pico(1.8);
    Labirinto.iniciar(ehInscrito);
  }
};

/* ---------------------------------------------------------------------
   5. LABIRINTO DISRUPTIVO (LANTERNA + SISMÓGRAFO + VANTAGEM + ARMADILHA)
   --------------------------------------------------------------------- */
const Labirinto = {
  cols: 19,
  rows: 11,
  cellW: 40,
  cellH: 40,
  grid: [],
  mutantes: [],
  player: { c: 1, r: 1 },
  saidaFalsa: { c: 17, r: 1 },
  saidaReal: { c: 17, r: 9 },
  armadilhaAtivada: false,
  sonarRestante: 3,
  sonarAtivoAte: 0,
  inicioTs: 0,
  ativo: false,
  animId: null,

  // Mapa base: 1 = parede fixa, 0 = corredor, 2 = parede mutante (abre/fecha com sismógrafo)
  mapaBase: [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,0,0,1],
    [1,0,1,0,1,0,1,1,1,0,1,0,1,1,1,1,1,1,1],
    [1,0,1,0,0,0,1,0,0,0,2,0,0,0,0,0,0,0,1],
    [1,0,1,1,1,1,1,0,1,1,1,1,1,0,1,1,1,0,1],
    [1,0,0,0,2,0,0,0,1,0,0,0,0,0,1,0,0,0,1],
    [1,1,1,0,1,1,1,0,1,0,1,1,1,1,1,0,1,1,1],
    [1,0,0,0,1,0,0,0,0,0,1,0,0,0,2,0,0,0,1],
    [1,0,1,1,1,0,1,1,1,1,1,0,1,1,1,1,1,0,1],
    [1,0,0,0,0,0,0,0,2,0,0,0,0,0,1,1,1,0,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
  ],

  iniciar(ehInscrito) {
    const sec = document.getElementById('etapa-labirinto');
    sec.hidden = false;
    sec.scrollIntoView({ behavior: 'smooth', block: 'start' });

    this.grid = this.mapaBase.map((linha) => [...linha]);
    this.player = { c: 1, r: 1 };
    this.saidaFalsa = { c: 17, r: 1 };
    this.saidaReal = { c: 17, r: 9 };
    this.armadilhaAtivada = false;
    this.sonarRestante = ehInscrito ? 4 : 2;
    this.sonarAtivoAte = 0;
    this.inicioTs = Date.now();
    this.ativo = true;

    document.getElementById('lab-armadilha').hidden = true;
    document.getElementById('lab-modo-info').textContent = ehInscrito
      ? 'MODO INSCRITO: Lanterna Ampla + Bússola de Saída Ativa'
      : 'MODO NÃO INSCRITO: Sobrevivência (Névoa Densa)';

    this.atualizarBotaoSonar();
    this.bindEventos();

    if (this.animId) cancelAnimationFrame(this.animId);
    this.loop();
  },

  atualizarBotaoSonar() {
    const btn = document.getElementById('btn-sonar');
    btn.textContent = `📡 PULSO DE SONAR (${this.sonarRestante})`;
    btn.disabled = this.sonarRestante <= 0;
  },

  dispararSonar() {
    if (!this.ativo || this.sonarRestante <= 0) return;
    this.sonarRestante--;
    this.sonarAtivoAte = Date.now() + 1200; // Ilumina todo o labirinto por 1.2s
    Sismografo.pico(1.5);
    this.atualizarBotaoSonar();
  },

  ehParede(c, r) {
    if (c < 0 || r < 0 || c >= this.cols || r >= this.rows) return true;
    const celula = this.grid[r][c];
    if (celula === 1) return true;
    // Célula 2 alterna entre aberta e fechada conforme a onda do sismógrafo
    if (celula === 2) return Sismografo.faseMutante;
    return false;
  },

  moverJogador(dc, dr) {
    if (!this.ativo) return;
    const nc = this.player.c + dc;
    const nr = this.player.r + dr;
    if (!this.ehParede(nc, nr)) {
      this.player.c = nc;
      this.player.r = nr;
      this.verificarSaidas();
    }
  },

  guiarParaPonto(canvasX, canvasY) {
    if (!this.ativo) return;
    const targetC = Math.floor(canvasX / this.cellW);
    const targetR = Math.floor(canvasY / this.cellH);
    const dc = Math.sign(targetC - this.player.c);
    const dr = Math.sign(targetR - this.player.r);

    if (dc !== 0 && !this.ehParede(this.player.c + dc, this.player.r)) {
      this.player.c += dc;
    } else if (dr !== 0 && !this.ehParede(this.player.c, this.player.r + dr)) {
      this.player.r += dr;
    }
    this.verificarSaidas();
  },

  verificarSaidas() {
    // 1. Chegou na SAÍDA FALSA (Plot Twist - Item 8)
    if (!this.armadilhaAtivada && this.player.c === this.saidaFalsa.c && this.player.r === this.saidaFalsa.r) {
      this.armadilhaAtivada = true;
      Sismografo.pico(2.6);
      document.getElementById('lab-armadilha').hidden = false;
      // Abre uma passagem secreta na parede lateral que antes estava bloqueada (linha 9, cols 14-16)
      this.grid[9][14] = 0;
      this.grid[9][15] = 0;
      this.grid[9][16] = 0;
      this.sonarAtivoAte = Date.now() + 1400; // Dá um flash rápido mostrando que o mapa mudou
      return;
    }

    // 2. Chegou na SAÍDA VERDADEIRA
    if (this.player.c === this.saidaReal.c && this.player.r === this.saidaReal.r) {
      this.concluir();
    }
  },

  concluir() {
    this.ativo = false;
    if (this.animId) cancelAnimationFrame(this.animId);
    Estado.tempoLabirintoSeg = Number(((Date.now() - this.inicioTs) / 1000).toFixed(1));
    document.getElementById('lab-status-tag').textContent = 'ETAPA 02 // LABIRINTO SUPERADO ✓';
    Sismografo.pico(2.2);
    Interruptor2030.mostrar();
  },

  eventosLigados: false,
  bindEventos() {
    if (this.eventosLigados) return;
    this.eventosLigados = true;

    const canvas = document.getElementById('canvas-labirinto');
    document.getElementById('btn-sonar').addEventListener('click', () => this.dispararSonar());

    // Clique no canvas também dispara sonar
    canvas.addEventListener('click', () => this.dispararSonar());

    // Movimento seguindo o cursor / toque suavemente
    let ultimoPasso = 0;
    const processarPonteiro = (clientX, clientY) => {
      const agora = Date.now();
      if (agora - ultimoPasso < 75) return;
      ultimoPasso = agora;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      this.guiarParaPonto((clientX - rect.left) * scaleX, (clientY - rect.top) * scaleY);
    };

    canvas.addEventListener('mousemove', (e) => processarPonteiro(e.clientX, e.clientY));
    canvas.addEventListener('touchmove', (e) => {
      if (e.touches[0]) processarPonteiro(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });

    // Teclado (Setas e WASD)
    window.addEventListener('keydown', (e) => {
      if (!this.ativo) return;
      const mapa = {
        ArrowUp: [0, -1], w: [0, -1], W: [0, -1],
        ArrowDown: [0, 1], s: [0, 1], S: [0, 1],
        ArrowLeft: [-1, 0], a: [-1, 0], A: [-1, 0],
        ArrowRight: [1, 0], d: [1, 0], D: [1, 0]
      };
      if (mapa[e.key]) {
        e.preventDefault();
        this.moverJogador(mapa[e.key][0], mapa[e.key][1]);
      }
    });

    // Botões direcionais mobile
    document.querySelectorAll('[data-dir]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const d = btn.dataset.dir;
        if (d === 'up') this.moverJogador(0, -1);
        if (d === 'down') this.moverJogador(0, 1);
        if (d === 'left') this.moverJogador(-1, 0);
        if (d === 'right') this.moverJogador(1, 0);
      });
    });
  },

  loop() {
    if (!this.ativo) return;
    const elapsed = ((Date.now() - this.inicioTs) / 1000).toFixed(1);
    document.getElementById('lab-timer').textContent = `${elapsed}s`;

    this.desenhar();
    this.animId = requestAnimationFrame(() => this.loop());
  },

  desenhar() {
    const canvas = document.getElementById('canvas-labirinto');
    const ctx = canvas.getContext('2d');
    const corTema = corAtualTema();
    const px = this.player.c * this.cellW + this.cellW / 2;
    const py = this.player.r * this.cellH + this.cellH / 2;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Fundo escuro
    ctx.fillStyle = '#040508';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Desenha paredes e saídas
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const cel = this.grid[r][c];
        const x = c * this.cellW;
        const y = r * this.cellH;

        if (cel === 1) {
          ctx.fillStyle = '#151a24';
          ctx.fillRect(x + 1, y + 1, this.cellW - 2, this.cellH - 2);
          ctx.strokeStyle = '#263042';
          ctx.strokeRect(x + 1, y + 1, this.cellW - 2, this.cellH - 2);
        } else if (cel === 2) {
          // Parede mutante sincronizada com o sismógrafo
          if (Sismografo.faseMutante) {
            ctx.fillStyle = 'rgba(245, 185, 66, 0.32)';
            ctx.fillRect(x + 2, y + 2, this.cellW - 4, this.cellH - 4);
            ctx.strokeStyle = '#f5b942';
            ctx.strokeRect(x + 2, y + 2, this.cellW - 4, this.cellH - 4);
          } else {
            ctx.strokeStyle = 'rgba(245, 185, 66, 0.25)';
            ctx.setLineDash([4, 4]);
            ctx.strokeRect(x + 4, y + 4, this.cellW - 8, this.cellH - 8);
            ctx.setLineDash([]);
          }
        }
      }
    }

    // Saída Falsa (antes de ativar a armadilha parece uma saída comum)
    if (!this.armadilhaAtivada) {
      ctx.fillStyle = corTema;
      ctx.fillRect(
        this.saidaFalsa.c * this.cellW + 8,
        this.saidaFalsa.r * this.cellH + 8,
        this.cellW - 16,
        this.cellH - 16
      );
    }

    // Saída Verdadeira
    ctx.fillStyle = this.armadilhaAtivada ? '#ff4d5e' : corTema;
    ctx.beginPath();
    ctx.arc(
      this.saidaReal.c * this.cellW + this.cellW / 2,
      this.saidaReal.r * this.cellH + this.cellH / 2,
      11, 0, Math.PI * 2
    );
    ctx.fill();

    // Máscara de Escuridão (Lanterna maior para Inscrito, névoa fechada para Não Inscrito)
    const sonarAtivo = Date.now() < this.sonarAtivoAte;
    if (!sonarAtivo) {
      const raioLuz = Estado.ehInscrito ? 135 : 72;
      const grad = ctx.createRadialGradient(px, py, raioLuz * 0.2, px, py, raioLuz);
      grad.addColorStop(0, 'rgba(2, 3, 5, 0)');
      grad.addColorStop(0.75, 'rgba(2, 3, 5, 0.85)');
      grad.addColorStop(1, 'rgba(2, 3, 5, 0.985)');

      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Bússola direcional exclusiva para quem clicou em "Inscrito no Canal"
    if (Estado.ehInscrito) {
      const alvo = this.armadilhaAtivada ? this.saidaReal : this.saidaFalsa;
      const tx = alvo.c * this.cellW + this.cellW / 2;
      const ty = alvo.r * this.cellH + this.cellH / 2;
      const ang = Math.atan2(ty - py, tx - px);

      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(ang);
      ctx.fillStyle = corTema;
      ctx.beginPath();
      ctx.moveTo(22, 0);
      ctx.lineTo(14, -4);
      ctx.lineTo(14, 4);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // Ponto luminoso do visitante
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = corTema;
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(px, py, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
};

/* ---------------------------------------------------------------------
   6. INTERRUPTOR E CONTADOR DE MINUTOS ATÉ 2030
   --------------------------------------------------------------------- */
const Interruptor2030 = {
  intervalo: null,

  mostrar() {
    const sec = document.getElementById('etapa-interruptor');
    sec.hidden = false;
    document.getElementById('badge-rank-tempo').textContent = `TRAVESSIA: ${Estado.tempoLabirintoSeg}s`;
    sec.scrollIntoView({ behavior: 'smooth', block: 'start' });

    const btn = document.getElementById('btn-interruptor');
    btn.addEventListener('click', () => {
      if (Estado.interruptorLigado) return;
      Estado.interruptorLigado = true;
      btn.classList.add('ligado');
      btn.setAttribute('aria-pressed', 'true');
      document.getElementById('switch-label').textContent = 'SISTEMA ATIVADO — CONTAGEM TEMPORAL EXPOSTA';
      document.getElementById('box-2030').hidden = false;
      Sismografo.pico(2.4);

      this.iniciarContagemMinutos();
      EnqueteFinal.mostrar();
    });
  },

  iniciarContagemMinutos() {
    const alvo2030 = Date.UTC(2030, 0, 1, 0, 0, 0);
    const elNum = document.getElementById('minutos-2030');

    const atualizar = () => {
      const diffMs = Math.max(0, alvo2030 - Date.now());
      // Converte tudo exclusivamente em minutos com 2 casas decimais correndo ao vivo
      const minutosExatos = diffMs / 60000;
      elNum.textContent = minutosExatos.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    };

    atualizar();
    this.intervalo = setInterval(atualizar, 100);
  }
};

/* ---------------------------------------------------------------------
   7. ENQUETE GAMIFICADA + BLOQUEIO DE INSCRIÇÃO + CRÉDITO FINAL
   --------------------------------------------------------------------- */
const EnqueteFinal = {
  votos: { deepweb: 412, truecrime: 538, investigacoes: 619 },

  mostrar() {
    const sec = document.getElementById('etapa-enquete');
    sec.hidden = false;

    try {
      const salvos = JSON.parse(localStorage.getItem(CONFIG.chaveEnquete) || 'null');
      if (salvos && typeof salvos.deepweb === 'number') this.votos = salvos;
    } catch (_) { /* ignora */ }

    // Define o Crachá Gamificado com base no tempo do labirinto
    const t = Estado.tempoLabirintoSeg;
    let tituloRank = 'AGENTE DE CAMPO';
    if (t <= 15) tituloRank = 'MESTRE DO MISTÉRIO (ELITE)';
    else if (t <= 30) tituloRank = 'INVESTIGADOR OCULTO';
    else tituloRank = 'SOBREVIVENTE DA NÉVOA';
    document.getElementById('cracha-investigador').textContent = `CRACHÁ: ${tituloRank}`;

    // Se entrou como "Não Inscrito", força a inscrição antes de liberar o voto
    const boxBloqueio = document.getElementById('bloqueio-inscricao');
    const listaOpcoes = document.getElementById('enquete-opcoes');

    if (!Estado.ehInscrito) {
      boxBloqueio.hidden = false;
      listaOpcoes.classList.add('bloqueado');

      document.getElementById('btn-confirmar-inscricao').addEventListener('click', () => {
        Estado.ehInscrito = true;
        Triagem.atualizarProvaSocial(true);
        boxBloqueio.hidden = true;
        listaOpcoes.classList.remove('bloqueado');
        document.getElementById('enquete-feedback').textContent =
          '✓ Inscrição confirmada! Agora escolha abaixo o tema do próximo vídeo:';
        Sismografo.pico(1.8);
      });
    }

    document.querySelectorAll('.opcao-voto').forEach((btn) => {
      btn.addEventListener('click', () => this.registrarVoto(btn.dataset.opcao));
    });
  },

  registrarVoto(opcao) {
    if (!Estado.ehInscrito || Estado.votoRegistrado) return;
    Estado.votoRegistrado = opcao;
    this.votos[opcao] = (this.votos[opcao] || 0) + 1;

    try { localStorage.setItem(CONFIG.chaveEnquete, JSON.stringify(this.votos)); } catch (_) { /* ignora */ }

    const total = this.votos.deepweb + this.votos.truecrime + this.votos.investigacoes;
    ['deepweb', 'truecrime', 'investigacoes'].forEach((k) => {
      const pct = Math.round((this.votos[k] / total) * 100);
      document.getElementById(`pct-${k}`).textContent = `${pct}%`;
      document.getElementById(`bar-${k}`).style.width = `${pct}%`;
    });

    document.querySelectorAll('.opcao-voto').forEach((b) => {
      b.classList.toggle('votado', b.dataset.opcao === opcao);
    });

    document.getElementById('enquete-feedback').textContent =
      `✓ Voto registrado com sucesso (${total.toLocaleString('pt-BR')} votos computados).`;

    Sismografo.pico(2.0);

    // Revela o rodapé com "Criado por Thiago Mistery" apenas quando todo o desafio termina
    const rodape = document.getElementById('rodape-final');
    rodape.hidden = false;
    rodape.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }
};

/* ---------------------------------------------------------------------
   8. INICIALIZAÇÃO
   --------------------------------------------------------------------- */
function iniciar() {
  try {
    const salvoTema = localStorage.getItem(CONFIG.chaveTema);
    if (salvoTema) aplicarTema(salvoTema);
  } catch (_) { /* ignora */ }

  document.querySelectorAll('.btn-tema').forEach((btn) => {
    btn.addEventListener('click', () => aplicarTema(btn.dataset.temaBtn));
  });

  setInterval(() => {
    const el = document.getElementById('relogio');
    if (el) el.textContent = new Date().toLocaleTimeString('pt-BR');
  }, 1000);

  Visitantes.iniciar();
  Sismografo.iniciar();
  Triagem.iniciar();
}

iniciar();
