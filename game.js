/* ============================================
   TIC TAC TOE – Game Logic
   ============================================ */

(function () {
  'use strict';

  // ── State ─────────────────────────────────
  const state = {
    board: Array(9).fill(null),
    currentPlayer: 'X',
    gameOver: false,
    scores: { X: 0, O: 0, Draw: 0 },
  };

  // Win combinations [index, index, index]
  const WIN_COMBOS = [
    [0,1,2], [3,4,5], [6,7,8], // rows
    [0,3,6], [1,4,7], [2,5,8], // cols
    [0,4,8], [2,4,6],           // diagonals
  ];

  // SVG win-line coords for each combo [x1,y1,x2,y2] in a 300×300 viewBox
  // Board has 10px padding, 10px gap, 3 cells → each cell ~(300-20-20)/3 ≈ 86.7px
  const CELL_SIZE = (300 - 20 - 20) / 3; // ≈ 86.67
  const PAD       = 10;
  const GAP       = 10;

  function cellCenter(idx) {
    const col = idx % 3;
    const row = Math.floor(idx / 3);
    const x = PAD + col * (CELL_SIZE + GAP) + CELL_SIZE / 2;
    const y = PAD + row * (CELL_SIZE + GAP) + CELL_SIZE / 2;
    return { x, y };
  }

  // ── DOM References ────────────────────────
  const cells          = Array.from(document.querySelectorAll('.cell'));
  const board          = document.getElementById('board');
  const statusIndicator= document.getElementById('status-indicator');
  const turnSymbolEl   = document.getElementById('turn-symbol');
  const statusTextEl   = document.getElementById('status-text');
  const xScoreEl       = document.getElementById('x-score');
  const oScoreEl       = document.getElementById('o-score');
  const drawScoreEl    = document.getElementById('draw-score');
  const scoreX         = document.getElementById('score-x');
  const scoreO         = document.getElementById('score-o');
  const restartBtn     = document.getElementById('restart-btn');
  const resetScoreBtn  = document.getElementById('reset-score-btn');
  const overlay        = document.getElementById('overlay');
  const resultIcon     = document.getElementById('result-icon');
  const resultTitle    = document.getElementById('result-title');
  const resultSub      = document.getElementById('result-sub');
  const playAgainBtn   = document.getElementById('play-again-btn');
  const closeOverlayBtn= document.getElementById('close-overlay-btn');
  const winLineSvg     = document.getElementById('win-line-svg');
  const winLine        = document.getElementById('win-line');

  // ── Helpers ───────────────────────────────
  const symbolOf = (p) => p === 'X' ? '✕' : '○';

  function setTurnUI(player) {
    const sym = symbolOf(player);
    turnSymbolEl.textContent = sym;
    statusTextEl.textContent = `Player ${player}'s turn`;
    statusIndicator.className = 'status-indicator ' + (player === 'X' ? 'turn-x' : 'turn-o');

    // Active score card
    scoreX.classList.toggle('active', player === 'X');
    scoreO.classList.toggle('active', player === 'O');
  }

  function checkWinner() {
    for (const combo of WIN_COMBOS) {
      const [a, b, c] = combo;
      if (state.board[a] &&
          state.board[a] === state.board[b] &&
          state.board[a] === state.board[c]) {
        return { winner: state.board[a], combo };
      }
    }
    if (state.board.every(Boolean)) return { winner: 'Draw', combo: null };
    return null;
  }

  // ── Win Line ──────────────────────────────
  function drawWinLine(combo, player) {
    const start = cellCenter(combo[0]);
    const end   = cellCenter(combo[2]);

    // Reset animation
    winLine.style.animation = 'none';
    winLine.style.strokeDashoffset = '350';
    winLine.offsetHeight; // reflow

    winLine.setAttribute('x1', start.x);
    winLine.setAttribute('y1', start.y);
    winLine.setAttribute('x2', end.x);
    winLine.setAttribute('y2', end.y);
    winLine.className = player === 'X' ? 'x-line' : 'o-line';

    winLine.style.animation = '';
    winLine.classList.add('win-line-animate');
  }

  function clearWinLine() {
    winLine.classList.remove('win-line-animate', 'x-line', 'o-line');
    winLine.style.animation = 'none';
    winLine.style.strokeDashoffset = '350';
    winLine.setAttribute('x1', 0);
    winLine.setAttribute('y1', 0);
    winLine.setAttribute('x2', 0);
    winLine.setAttribute('y2', 0);
  }

  // ── Confetti ──────────────────────────────
  const CONFETTI_COLORS = [
    '#f472b6','#38bdf8','#8b5cf6','#fbbf24','#34d399','#f87171','#818cf8'
  ];

  function spawnConfetti() {
    const count = 60;
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        const el = document.createElement('div');
        el.className = 'confetti-particle';
        el.style.left = Math.random() * 100 + 'vw';
        el.style.top = '-10px';
        el.style.background = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
        el.style.width  = (6 + Math.random() * 8) + 'px';
        el.style.height = (6 + Math.random() * 8) + 'px';
        el.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
        el.style.animationDuration = (1.5 + Math.random() * 2) + 's';
        el.style.animationDelay = '0s';
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 4000);
      }, i * 30);
    }
  }

  // ── Show Result Overlay ───────────────────
  function showResult(result) {
    if (result.winner === 'Draw') {
      resultIcon.textContent = '🤝';
      resultTitle.textContent = "It's a Draw!";
      resultTitle.className = 'result-title';
      resultSub.textContent = 'Great game! Give it another shot.';
    } else {
      const sym = symbolOf(result.winner);
      resultIcon.textContent = result.winner === 'X' ? '🎉' : '✨';
      resultTitle.textContent = `Player ${result.winner} Wins!`;
      resultTitle.className = `result-title ${result.winner === 'X' ? 'x-win' : 'o-win'}`;
      resultSub.textContent = `${sym} dominates the board — outstanding!`;
      spawnConfetti();
    }

    setTimeout(() => {
      overlay.classList.add('visible');
    }, 700);
  }

  // ── Handle Cell Click ─────────────────────
  function handleCellClick(e) {
    const cell  = e.currentTarget;
    const index = parseInt(cell.dataset.index, 10);

    if (state.gameOver || state.board[index]) return;

    // Place move
    state.board[index] = state.currentPlayer;
    cell.setAttribute('data-symbol', symbolOf(state.currentPlayer));
    cell.classList.add('disabled');

    // Ripple effect
    const ripple = document.createElement('span');
    ripple.style.cssText = `
      position:absolute; border-radius:50%;
      width:200%; height:200%; top:-50%; left:-50%;
      background:radial-gradient(circle, rgba(255,255,255,0.12), transparent 70%);
      animation:ripple 0.4s ease-out forwards; pointer-events:none;
    `;
    cell.appendChild(ripple);
    setTimeout(() => ripple.remove(), 400);

    // Check result
    const result = checkWinner();

    if (result) {
      state.gameOver = true;
      board.classList.add('disabled');

      if (result.winner !== 'Draw') {
        // Highlight winning cells
        result.combo.forEach(i => cells[i].classList.add('winning'));
        drawWinLine(result.combo, result.winner);
        state.scores[result.winner]++;
      } else {
        state.scores.Draw++;
      }

      updateScoreUI(result.winner);
      showResult(result);

      // Status message
      statusTextEl.textContent = result.winner === 'Draw'
        ? "It's a draw!"
        : `Player ${result.winner} wins! 🎉`;
      scoreX.classList.remove('active');
      scoreO.classList.remove('active');

    } else {
      // Switch player
      state.currentPlayer = state.currentPlayer === 'X' ? 'O' : 'X';
      setTurnUI(state.currentPlayer);
    }
  }

  // ── Update Scores ─────────────────────────
  function updateScoreUI(lastWinner) {
    const bump = (el) => {
      el.classList.remove('bump');
      void el.offsetWidth; // reflow
      el.classList.add('bump');
    };

    xScoreEl.textContent = state.scores.X;
    oScoreEl.textContent = state.scores.O;
    drawScoreEl.textContent = state.scores.Draw;

    if (lastWinner === 'X')    bump(xScoreEl);
    else if (lastWinner === 'O') bump(oScoreEl);
    else                         bump(drawScoreEl);
  }

  // ── Restart Round ─────────────────────────
  function restartRound() {
    state.board.fill(null);
    state.gameOver = false;
    state.currentPlayer = 'X';

    cells.forEach(cell => {
      cell.removeAttribute('data-symbol');
      cell.classList.remove('winning', 'disabled');
    });

    board.classList.remove('disabled');
    clearWinLine();
    overlay.classList.remove('visible');
    setTurnUI('X');
  }

  // ── Reset Scores ──────────────────────────
  function resetScores() {
    state.scores = { X: 0, O: 0, Draw: 0 };
    xScoreEl.textContent = '0';
    oScoreEl.textContent = '0';
    drawScoreEl.textContent = '0';
    restartRound();
  }

  // ── Add ripple keyframe ───────────────────
  const style = document.createElement('style');
  style.textContent = `
    @keyframes ripple {
      from { opacity: 1; transform: scale(0); }
      to   { opacity: 0; transform: scale(1); }
    }
  `;
  document.head.appendChild(style);

  // ── Event Listeners ───────────────────────
  cells.forEach(cell => cell.addEventListener('click', handleCellClick));
  restartBtn.addEventListener('click', restartRound);
  resetScoreBtn.addEventListener('click', resetScores);
  playAgainBtn.addEventListener('click', restartRound);
  closeOverlayBtn.addEventListener('click', () => overlay.classList.remove('visible'));

  // Close overlay on backdrop click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.classList.remove('visible');
  });

  // Keyboard support
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') overlay.classList.remove('visible');
    if (e.key === 'r' || e.key === 'R') restartRound();
  });

  // ── Init ──────────────────────────────────
  setTurnUI('X');

})();
