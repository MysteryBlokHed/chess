'use strict';

/**
 * ICS4UC Final Project
 *
 * Author: Adam Thompson-Sharpe
 * Description: Chess!!
 */

/** @type {HTMLCanvasElement} */
const canvas = document.querySelector('#canvas');
const ctx = canvas.getContext('2d');
const rect = canvas.getBoundingClientRect();

const width = canvas.width;
const height = canvas.height;
const cellSize = width / 8;

// Sprite size is 4/5 of a cell
const spriteSize = 0.8 * cellSize;
const offset = (cellSize - spriteSize) / 2;

const darkColour = '#773f1a';
const lightColour = '#c6a992';
const highlightColour = 'rgba(230, 126, 34, 0.8)';

/** Whether the board has been rotated */
let flipped = false;
/** Boolean to track active turn */
let whiteTurn = true;

/** The ID of the active timer, returned by `setInterval` */
let activeTimer = 0;
let activeTimerColour = 'white';
let lastTimerUpdate = 0;

// Player timers, in seconds
let whiteTime = 600;
let blackTime = 600;

/** Whether a piece is currently selected */
let pieceHighlighted = false;

let highlightedRow = -1;
let highlightedCol = -1;

/** Whether an important dialog is open */
let dialogOpen = false;

// --- Types for IntelliSense ---
/** @typedef {"white" | "black"} Team */
/** @typedef {(Piece | null)[][]} BoardArray */
/** @typedef {[row: number, col: number]} Move */

/**
 * Convert seconds to a minutes:seconds format
 * @param {number} fullSeconds 
 */
function secondsToTime(fullSeconds) {
  fullSeconds = Math.ceil(fullSeconds);
  if (fullSeconds <= 0) return '0:00';

  const minutes = Math.floor(fullSeconds / 60);
  // Round up to avoid the appearance of the timer suddenly skipping a second
  const seconds = (fullSeconds % 60)
    // Make sure that seconds are always two digits
    .toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

/**
 * Start the timer for a given player
 * @param {TeamName} colour
 */
function startTimer(colour) {
  const now = Date.now();
  // Clear any old timers
  if (activeTimer) {
    clearInterval(activeTimer);
    activeTimer = 0;
  }

  // Take into account untracked milliseconds since last update
  if (lastTimerUpdate) {
    if (activeTimerColour === 'white') whiteTime -= (now - lastTimerUpdate) / 1000;
    else blackTime -= (now - lastTimerUpdate) / 1000;
  }

  activeTimerColour = colour;

  const topTime = document.querySelector(`.player-bar.top .player-bar__time`);
  const bottomTime = document.querySelector(`.player-bar.bottom .player-bar__time`);

  // Set timer content for both players with respect to board flip
  if (flipped) {
    topTime.innerText = secondsToTime(whiteTime);
    bottomTime.innerText = secondsToTime(blackTime);
  } else {
    topTime.innerText = secondsToTime(blackTime);
    bottomTime.innerText = secondsToTime(whiteTime);
  }

  // Start ticking new timer for the relevant player  
  if (colour === 'white') {
    // This is a function so that if the board flips in the middle of a timeout,
    // the correct new timer will always be returned
    const timer = () => flipped ? topTime : bottomTime;

    // If there is a non-round amount of time left, wait that time before starting the timer
    const timeLeft = whiteTime % 1;

    setTimeout(() => {
      // Round off time
      whiteTime = Math.floor(whiteTime);
      timer().innerText = secondsToTime(whiteTime);
      lastTimerUpdate = Date.now();
      // Start regular timer if there is not another one
      if (!activeTimer) activeTimer = setInterval(() => {
        whiteTime--;
        timer().innerText = secondsToTime(whiteTime);
        lastTimerUpdate = Date.now();
        checkTimer();
      }, 1000);
    }, timeLeft * 1000);

  } else {
    // This is a function so that if the board flips in the middle of a timeout,
    // the correct new timer will always be returned
    const timer = () => flipped ? bottomTime : topTime;

    // If there is a non-round amount of time left, wait that time before starting the timer
    const timeLeft = blackTime % 1;

    setTimeout(() => {
      // Round off time
      blackTime = Math.floor(blackTime);
      timer().innerText = secondsToTime(blackTime);
      lastTimerUpdate = Date.now();
      // Start regular timer if there is not another active one
      if (!activeTimer) activeTimer = setInterval(() => {
        blackTime--;
        timer().innerText = secondsToTime(blackTime);
        lastTimerUpdate = Date.now();
        checkTimer();
      }, 1000);
    }, timeLeft * 1000);
  }
}

/** Stop the active timers */
function stopTimer() {
  clearInterval(activeTimer);
  activeTimer = 0;
  lastTimerUpdate = 0;
  const topTimer = document.querySelector('.player-bar.top .player-bar__time');
  const bottomTimer = document.querySelector('.player-bar.bottom .player-bar__time');

  // Update timer contents
  if (!flipped) {
    topTimer.innerText = secondsToTime(blackTime);
    bottomTimer.innerText = secondsToTime(whiteTime);
  } else {
    topTimer.innerText = secondsToTime(whiteTime);
    bottomTimer.innerText = secondsToTime(blackTime);
  }
}

/** Stop and reset the active timers */
function resetTimer() {
  whiteTime = 600;
  blackTime = 600;
  stopTimer();
}

/** Check if the game should end by time */
function checkTimer() {
  if (whiteTime <= 0) endGame('black', 'time');
  else if (blackTime <= 0) endGame('white', 'time');
}

function flipBoard() {
  flipped = !flipped;

  // Swap the player names
  const topPlayer = document.querySelector('.player-bar.top .player-bar__name');
  const bottomPlayer = document.querySelector('.player-bar.bottom .player-bar__name');

  const topName = topPlayer.innerText;
  topPlayer.innerText = bottomPlayer.innerText;
  bottomPlayer.innerText = topName;

  // Swap the timer contents (can otherwise temporarily show the wrong timer if the board is flipped twice in the same second)
  const topTimer = document.querySelector('.player-bar.top .player-bar__time');
  const bottomTimer = document.querySelector('.player-bar.bottom .player-bar__time');

  const topTimerText = topTimer.innerText;
  topTimer.innerText = bottomTimer.innerText;
  bottomTimer.innerText = topTimerText;

  // Fix timer
  if (activeTimer) startTimer(whiteTurn ? 'white' : 'black');
}

function updateTurnIndicator() {
  const activeTeam = whiteTurn ? 'white' : 'black';

  const indicator = document.querySelector('.turn-indicator');
  const indicatorText = document.querySelector('.turn-indicator__text');

  // Remove old classes
  indicator.classList.remove('turn-white');
  indicator.classList.remove('turn-black');
  indicatorText.classList.remove('turn-white');
  indicatorText.classList.remove('turn-black');

  // Add new classes and update text
  indicator.classList.add(`turn-${activeTeam}`);
  indicatorText.classList.add(`turn-${activeTeam}`);
  // Capitalize the first letter of the colour
  indicatorText.innerText = `${activeTeam[0].toUpperCase()}${activeTeam.slice(1)} to move`;
}

/**
 * Utility function to check whether a given location is the same team.
 * Only used in areas where it gets difficult to read
 * by rewriting the check manually
 * @param {readonly Board} board
 * @param {number} row
 * @param {number} col
 * @param {Team} team
 */
function checkTeam(board, row, col, team) {
  return board[row][col]?.colour === team;
}

/**
 * Get the opposite team of the input
 * @param {Team} team
 * @returns {Team}
 */
function opposite(team) {
  if (team === 'black') return 'white';
  return 'black';
}

/** 
 * Get the direction a team's pawn should move.
 * -1 (upwards) for white, 1 (downwards) for black
 * @param {Team} team
 */
function movementDirection(team) {
  if (team === 'black') return 1;
  return -1;
}

/**
 * Convert a row and column to (x, y) coordinates.
 * @param {number} row 
 * @param {number} col
 */
function indexToCoords(row, col) {
  return [col * cellSize, row * cellSize];
}

function offsetIndexToCoords(row, col) {
  return indexToCoords(row, col).map(coord => coord + offset);
}

/**
 * Convert (x, y) coordinates to a row and column
 * @param {number} x
 * @param {number} y
 */
function coordsToIndex(x, y) {
  return [Math.floor(y / cellSize), Math.floor(x / cellSize)];
}

/**
 * Recursive function!  
 * Get valid coordinates in a given direction.
 * Returns valid coords for empty pieces until either the end of the board
 * or an enemy piece is reached (including the enemy piece as a valid move)
 * @param {BoardArray} board
 * @param {number} startRow Where to start movement
 * @param {number} startCol Where to start movement
 * @param {number} rowDirection The direction of travel (i.e. +/- 1)
 * @param {number} colDirection The direction of travel (i.e. +/- 1)
 * @param {Team} team
 */
function coordsInLine(board, startRow, startCol, rowDirection, colDirection, team) {
  // Move in the direction indicated by parameters
  startRow += rowDirection;
  startCol += colDirection;

  // Check if location is out of bounds
  if (startRow < 0 || startRow > 7 || startCol < 0 || startCol > 7) return [];

  // Check if location is empty
  if (!board[startRow][startCol]) {
    // Return the found location as valid and recuse to find more
    return [[startRow, startCol], ...coordsInLine(board, startRow, startCol, rowDirection, colDirection, team)];
  }

  // Check if there is an enemy piece
  if (board[startRow][startCol].colour !== team) {
    // Return *only* the found location (cannot go past this piece)
    return [[startRow, startCol]];
  }

  // No moves found
  return [];
}

/** 
 * Given a piece, return the moves that would be possible for a rook (horizontals)
 * @param {Piece} piece
 * @param {BoardArray} board
 * @param {number} row
 * @param {number} col
 * @return {Move[]}
 */
function getRookMoves(piece, board, row, col) {
  // Get valid moves for each horizontal direction
  const moves = [
    ...coordsInLine(board, row, col, 1, 0, piece.colour),
    ...coordsInLine(board, row, col, -1, 0, piece.colour),
    ...coordsInLine(board, row, col, 0, 1, piece.colour),
    ...coordsInLine(board, row, col, 0, -1, piece.colour),
  ];
  return moves;
}

/** 
 * Given a piece, return the moves that would be possible for a bishop (diagonals)
 * @param {Piece} piece
 * @param {BoardArray} board
 * @param {number} row
 * @param {number} col
 * @return {Move[]}
 */
function getBishopMoves(piece, board, row, col) {
  // Get valid moves for each horizontal direction
  const moves = [
    ...coordsInLine(board, row, col, 1, 1, piece.colour),
    ...coordsInLine(board, row, col, -1, 1, piece.colour),
    ...coordsInLine(board, row, col, 1, -1, piece.colour),
    ...coordsInLine(board, row, col, -1, -1, piece.colour),
  ];
  return moves;
}

/** Draw the chess board's squares */
function drawSquares() {
  // Draw the squares
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      if ((i + j) % 2 === 0) ctx.fillStyle = lightColour;
      else ctx.fillStyle = darkColour;

      ctx.fillRect(i * cellSize, j * cellSize, cellSize, cellSize);
    }
  }

  ctx.font = '600 20px Arial';
  ctx.fillStyle = '#ffffff';

  // Add row labels
  for (let i = 0; i <= 8; i++) {
    // Make the colour the opposite of the current square
    if (i % 2 === 0) ctx.fillStyle = darkColour;
    else ctx.fillStyle = lightColour;

    // Invert row numbering if required
    const text = flipped ? i + 1 : 8 - i;
    ctx.fillText(text, 10, (i * cellSize) + 25);
  }

  // Add column labels
  for (let j = 0; j <= 8; j++) {
    // Make the colour the opposite of the current square
    if (j % 2 === 0) ctx.fillStyle = lightColour;
    else ctx.fillStyle = darkColour;

    // Invert letters of columns if required
    const charCode = flipped ? 97 + 7 - j : 97 + j;
    ctx.fillText(String.fromCharCode(charCode), (j * cellSize) + 80, height - 10);
  }
}

/**
 * Convert the canvas click location to a row and column.
 * Passed coordinates should be relative to the canvas, not the entire page
 */
function canvasToIndex(x, y) {
  return [Math.floor(y / cellSize), Math.floor(x / cellSize)];
}

/**
 * Check whether a row and column is out of bounds on the board
 * @param {number} row
 * @param {number} col
 */
function outOfBounds(row, col) {
  return row < 0 || row > 7 || col < 0 || col > 7;
}

/**
 * Takes in an array of pairs and returns a list with only one occurence of each.
 * Required since two different arrays are not equal (`===`) to each other
 * @param {readonly T[]} arr
 * @returns {T[]}
 * @template {[any, any]} T Array type
 */
function uniquePairs(arr) {
  return arr.filter(([left, right], index) =>
    // Find the (first) index of the pair in the original array that contains these two points.
    // If that index matches this one, keep the item
    arr.findIndex(([otherLeft, otherRight]) => left === otherLeft && right === otherRight) === index);
}

/**
 * Convert a row index to the chess notation number.
 * This also happens to work the other way around
 */
function rowToNotation(row) {
  return 8 - row;
}

/** Convert a column index to the chess notation letter */
function colToNotation(col) {
  return String.fromCharCode(97 + col);
}

/** Convert a chess notation letter to the column index */
function notationToCol(notation) {
  return notation.charCodeAt(0) - 97;
}

/** Convert a row and column to the notation for it (i.e. 0, 0 -> a1) */
function moveToNotation(row, col) {
  return `${colToNotation(col)}${rowToNotation(row)}`;
}

/** 
 * The opposite of {@link moveToNotation}
 * @returns {Move}
 */
function notationToMove(notation) {
  const col = notation[0];
  const row = notation[1];

  return [rowToNotation(parseInt(row)), notationToCol(col)];
}

/**
 * Find the location and value of a piece on the board of a given class
 * @param {BoardArray} board
 * @param {TeamName} colour The colour to match
 * @param {T} baseClass The class that must be extended, such as {@link King}
 * @returns {[piece: InstanceType<T>, row: number, col: number]}
 * @template {typeof Piece} T Class type
 */
function findPiece(board, colour, baseClass = King) {
  const isPiece = piece => piece instanceof baseClass && piece.colour === colour;

  const row = board.findIndex(row => row.some(isPiece));
  const col = board[row].findIndex(isPiece);
  const piece = board[row][col];

  return [piece, row, col];
}

/**
 * Get a reference to all pieces on the board of a given class and colour.
 * This function, unlike {@link findPiece}, does not return coordinates
 * @param {BoardArray} board
 * @param {TeamName} colour The colour to match
 * @param {T} baseClass The class that must be extended, such as {@link King}
 * @returns {Array<[piece: InstanceType<T>, row: number, col: number]>}
 * @template {typeof Piece} T Class type
 */
function findPieces(board, colour, baseClass) {
  const isPiece = piece => piece instanceof baseClass && piece.colour === colour;

  return Array.from(board.entries())
    // Filter out rows without the target piece
    .filter(([, row]) => row.some(isPiece))
    // Iterate over rows and flatten the final array
    .flatMap(([i, row]) =>
      // Iterate over pieces in the row
      Array.from(row.entries())
        // Only include target pieces
        .filter(([, piece]) => isPiece(piece))
        // Pair pieces with their row and column
        .map(([j, piece]) => [piece, i, j]));
}

/** 
 * Convert a moves list to an HTML table
 * @param {readonly string[]} moves
 */
function movesToTable(moves) {
  let table = '<table class="moves__table"><tbody>';

  let firstMove;
  let moveNumber = 1;

  for (const [i, move] of moves.entries()) {
    if (i % 2 === 0) {
      firstMove = move;
      continue;
    }

    // Add each move to the table
    table += `<tr class="moves__row"><td class="moves__number">${moveNumber}.</td><td class="moves__move">${firstMove}</td><td class="moves__move">${move}</td></tr>`;
    moveNumber++;

    firstMove = null;
  }

  // If there is a lone white move, add it without a black move
  if (firstMove) table += `<tr class="moves__row"><td class="moves__number">${moveNumber}.</td><td class="moves__move">${firstMove}</td><td class="moves__move"></td></tr>`;

  // Close the table
  table += '</tbody></table>';

  return table;
}

/** 
 * Set the colour of the pieces in the promotion box
 * @param {Team} colour
 */
function setPromotionTeam(colour) {
  const queenImage = document.querySelector('#promote-queen > img');
  const rookImage = document.querySelector('#promote-rook > img');
  const knightImage = document.querySelector('#promote-knight > img');
  const bishopImage = document.querySelector('#promote-bishop > img');

  queenImage.src = `images/queen_${colour}.png`;
  rookImage.src = `images/rook_${colour}.png`;
  knightImage.src = `images/knight_${colour}.png`;
  bishopImage.src = `images/bishop_${colour}.png`;
}

/** 
 * Open the pawn promotion dialog.
 * This is an **asynchronous function**, and returns a {@link Promise}
 * which resolves when a button is selected
 */
function getPromotion() {
  return new Promise(resolve => {
    // Show dialog
    dialogOpen = true;
    document.querySelector('#promotion-dialog').showModal();

    // Set up listeners
    const queenBtn = document.querySelector('#promote-queen');
    const rookBtn = document.querySelector('#promote-rook');
    const knightBtn = document.querySelector('#promote-knight');
    const bishopBtn = document.querySelector('#promote-bishop');

    let queenListener = null;
    let rookListener = null;
    let knightListener = null;
    let bishopListener = null;

    /** 
     * Create an event listener that calls the callback for a provided piece.
     * After it's called, it will also clear the listeners for the other buttons
     * to avoid any unintended glitches
     * @param {typeof Piece} piece Piece to construct
     */
    const createButtonListener = piece => () => {
      // Clear listeners
      queenBtn.removeEventListener('click', queenListener);
      rookBtn.removeEventListener('click', rookListener);
      knightBtn.removeEventListener('click', knightListener);
      bishopBtn.removeEventListener('click', bishopListener);

      // Close dialog
      dialogOpen = false;
      document.querySelector('#promotion-dialog').close();

      // Return the piece to construct
      resolve(piece);
    }

    // Register listeners
    queenListener = createButtonListener(Queen);
    queenBtn.addEventListener('click', queenListener);
    rookListener = createButtonListener(Rook);
    rookBtn.addEventListener('click', rookListener);
    knightListener = createButtonListener(Knight);
    knightBtn.addEventListener('click', knightListener);
    bishopListener = createButtonListener(Bishop);
    bishopBtn.addEventListener('click', bishopListener);
  });
}

/** 
 * Get a list of potential valid moves in a square around a given row and column
 * @param {BoardArray} board
 * @param {number} row
 * @param {number} col
 * @param {Team} colour The colour of the active piece
 */
function movesAround(board, row, col, colour) {
  /** @type {Move[]} */
  const moves = [];

  for (let checkRow = row - 1; checkRow <= row + 1; checkRow++) {
    for (let checkCol = col - 1; checkCol <= col + 1; checkCol++) {
      // Don't bother checking the active square
      if (checkRow === row && checkCol === col) continue;
      // Make sure that the coordinate is on the board
      if (outOfBounds(checkRow, checkCol)) continue;

      // If the square is empty or taken by an *enemy* piece, allow the move
      if (!board[checkRow][checkCol] || board[checkRow][checkCol].colour !== colour) {
        moves.push([checkRow, checkCol]);
      }
    }
  }

  return moves;
}

/** 
 * Check if a piece is neighbouring a piece of a given type.
 * Used for {@link King#getMoves}
 * @param {BoardArray} board
 * @param {number} row
 * @param {number} col
 * @param {Team} colour The colour of the active piece
 * @param {typeof Piece} piece The piece to check against
 */
function nextToPiece(board, row, col, colour, piece) {
  const moves = movesAround(board, row, col, colour);
  return moves.some(([row, col]) => board[row][col] instanceof piece)
}

/** 
 * End the game for a provided reason (i.e. checkmate, stalemate, or time)
 * @param {Team | null} winner
 * @param {string} reason
 */
function endGame(winner, reason) {
  stopTimer();

  const whitePfp = document.querySelector('#end-white-img');
  const blackPfp = document.querySelector('#end-black-img');

  whitePfp.classList.remove('winner');
  blackPfp.classList.remove('winner');

  if (winner) {
    document.querySelector('#end-winner').innerText = `${winner[0].toUpperCase()}${winner.slice(1)} wins`;

    // Update green outline on the icon of the winner
    if (winner === 'white') whitePfp.classList.add('winner');
    else blackPfp.classList.add('winner');
  } else {
    document.querySelector('#end-winner').innerText = 'Draw';
  }

  // Update win reason and show dialog
  document.querySelector('#end-reason').innerText = reason;
  dialogOpen = true;
  document.querySelector('#end-dialog').showModal();
}

async function resetGame(updateTurn = true) {
  // Rest timers and board state
  resetTimer();
  flipped = false;
  board = new Board();
  await redraw();
  // Reset turn if desired
  if (updateTurn) whiteTurn = true;
  updateTurnIndicator();
  // Deselect pieces
  pieceHighlighted = false;
  highlightedRow = -1;
  highlightedCol = -1;
  // Clear movelist
  document.querySelector('.moves').innerHTML = '';
  // Close all dialogs
  dialogOpen = false;
  document.querySelectorAll('dialog').forEach(dialog => dialog.close());
}

class Board {
  /** @type {BoardArray} */
  pieces;
  /** @type {string[]} */
  moves = [];

  constructor() {
    this.pieces = [
      [new Rook('black'), new Knight('black'), new Bishop('black'), new Queen('black'), new King('black'), new Bishop('black'), new Knight('black'), new Rook('black')],
      [new Pawn('black'), new Pawn('black'), new Pawn('black'), new Pawn('black'), new Pawn('black'), new Pawn('black'), new Pawn('black'), new Pawn('black')],
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      [new Pawn('white'), new Pawn('white'), new Pawn('white'), new Pawn('white'), new Pawn('white'), new Pawn('white'), new Pawn('white'), new Pawn('white')],
      [new Rook('white'), new Knight('white'), new Bishop('white'), new Queen('white'), new King('white'), new Bishop('white'), new Knight('white'), new Rook('white')],
    ];
  }

  /**
   * Load a board from FEN
   * @param {string} fen
   * @see {@link <https://en.wikipedia.org/wiki/Forsyth%E2%80%93Edwards_Notation>}
   */
  static fromFen(fen) {
    const board = new this();
    // Empty 8x8 board
    board.pieces = [];

    const split = fen.split(' ');
    if (split.length !== 6) throw new TypeError('FEN notation should have six parts');

    // Separate each piece of the FEN string
    let [pieces, colour, castling, enPassant, halfMoves, fullMoves] = split;

    // (halfmoves are unused)
    // halfMoves = parseInt(halfMoves);
    fullMoves = parseInt(fullMoves);

    // Determine whose turn it is
    colour = colour === 'w' ? 'white' : 'black';
    whiteTurn = (colour === 'white');

    // Previous moves cannot be known from a loaded FEN string
    board.moves = new Array((fullMoves - 1) * 2).fill('--');

    // If it is black to move, add one more unknown move for white
    if (colour === 'black') board.moves.push('--');

    const ranks = pieces.split('/');

    // Place the pieces on the board according to the state
    for (const [i, rank] of ranks.entries()) {
      board.pieces.push([]);
      let offset = 0;

      for (const [j, piece] of rank.split('').entries()) {
        // If the letter is uppercase, then the team is white
        const team = (piece.toUpperCase() === piece) ? 'white' : 'black';
        const col = j + offset;

        switch (piece.toUpperCase()) {
          case 'R':
            board.pieces[i][col] = new Rook(team);
            break;
          case 'N':
            board.pieces[i][col] = new Knight(team);
            break;
          case 'B':
            board.pieces[i][col] = new Bishop(team);
            break;
          case 'Q':
            board.pieces[i][col] = new Queen(team);
            break;
          case 'K':
            board.pieces[i][col] = new King(team);
            break;
          case 'P':
            board.pieces[i][col] = new Pawn(team);
            break;
          default:
            // See if this is a number
            if ('1' > piece || piece > '8')
              throw new TypeError('Unknown piece ' + piece);
            const empty = parseInt(piece);
            // Variable `i` is already taken
            for (let count = 0; count < empty; count++) {
              board.pieces[i].push(null);
            }

            offset += empty - 1;
        }
      }
    }

    // Update whether pawns have moved
    const whitePawns = findPieces(board.pieces, 'white', Pawn);
    const blackPawns = findPieces(board.pieces, 'black', Pawn);

    // If the pawns are not in their starting row, they have moved
    whitePawns.filter(([, row]) => row !== 6).forEach(([pawn]) => pawn.hasMoved = true);
    blackPawns.filter(([, row]) => row !== 1).forEach(([pawn]) => pawn.hasMoved = true);

    // Update pawn for en passant square
    if (enPassant !== '-') {
      const [row, col] = notationToMove(enPassant);
      // Figure out where the target piece must be based on the active player
      const epPawn = whiteTurn ? board.pieces[row + 1][col] : board.pieces[row - 1][col];
      if (!epPawn) throw new Error('Failed to find en passant pawn from FEN');
      // Mark the pawn as just having moved two, allowing en passant
      epPawn.movedTwo = true;
    }

    // ----- Whether castling is allowed -----
    const whiteKingside = castling.includes('K');
    const whiteQueenside = castling.includes('Q');
    const blackKingside = castling.includes('k');
    const blackQueenside = castling.includes('q');

    const [whiteKing] = findPiece(board.pieces, 'white');
    const [blackKing] = findPiece(board.pieces, 'black');

    const whiteRooks = findPieces(board.pieces, 'white', Rook);
    const blackRooks = findPieces(board.pieces, 'black', Rook);

    // If a king can't castle in any direction, then we can't be sure what the reason is.
    // This code just assumes that all pieces have moved, which will invalidate later castling availability checks
    // --- White ---
    if (!whiteKingside && !whiteQueenside) {
      whiteKing.hasMoved = true;
      whiteRooks.forEach(([rook]) => rook.hasMoved = true);
    }

    if (!whiteKingside) {
      // Make sure that the kingside rook is not marked as able to castle
      const kingsideRook = board.pieces[7][7];
      if (kingsideRook && kingsideRook instanceof Rook) {
        kingsideRook.hasMoved = true;
      }
    }

    if (!whiteQueenside) {
      // Make sure that the queenside rook is not marked as able to castle
      const queensideRook = board.pieces[7][0];
      if (queensideRook && queensideRook instanceof Rook) {
        queensideRook.hasMoved = true;
      }
    }

    // --- Black ---
    if (!blackKingside && !blackQueenside) {
      blackKing.hasMoved = true;
      blackRooks.forEach(([rook]) => rook.hasMoved = true);
    }

    if (!blackKingside) {
      // Make sure that the kingside rook is not marked as able to castle
      const kingsideRook = board.pieces[0][7];
      if (kingsideRook && kingsideRook instanceof Rook) {
        kingsideRook.hasMoved = true;
      }
    }

    if (!blackQueenside) {
      // Make sure that the queenside rook is not marked as able to castle
      const queensideRook = board.pieces[0][0];
      if (queensideRook && queensideRook instanceof Rook) {
        queensideRook.hasMoved = true;
      }
    }

    return board;
  }

  /**
   * Get the FEN description of the current board.
   * Note that the halfmove counter is not properly changed since this game does not use it
   * @see {@link <https://en.wikipedia.org/wiki/Forsyth%E2%80%93Edwards_Notation>}
   */
  toFen() {
    const fenRows = [];
    let fenTurn = whiteTurn ? 'w' : 'b';
    let whiteKingside = true;
    let whiteQueenside = true;
    let blackKingside = true;
    let blackQueenside = true;

    // Get the FEN description of each row
    for (const row of this.pieces) {
      let currentRow = '';
      let currentEmpty = 0;

      // Add the number for empty columns to the currentRow
      const addEmptyCols = () => {
        if (currentEmpty) {
          currentRow += currentEmpty;
          currentEmpty = 0;
        }
      };

      // Iterate over pieces and add their respective letters to the row
      for (const piece of row) {
        if (!piece) {
          currentEmpty++;
          continue;
        }

        addEmptyCols();

        let letter = piece.letter || 'P';
        if (piece.colour === 'black') letter = letter.toLowerCase();
        currentRow += letter;
      }
      addEmptyCols();
      fenRows.push(currentRow);
    }

    // Check castling availability
    const [whiteKing, whiteRow, whiteCol] = findPiece(board.pieces, 'white');
    const [blackKing, blackRow, blackCol] = findPiece(board.pieces, 'black');

    // If the king has moved, no castling is possible
    if (whiteKing.hasMoved || whiteRow !== 7 || whiteCol !== 4) {
      whiteKingside = false;
      whiteQueenside = false;
    } else {
      // Kingside castle
      const kingsideRook = this.pieces[7][7];
      if (!kingsideRook || !(kingsideRook instanceof Rook) || kingsideRook.hasMoved) {
        whiteKingside = false;
      }
      // Queenside castle
      const queensideRook = this.pieces[7][0];
      if (!queensideRook || !(queensideRook instanceof Rook) || queensideRook.hasMoved) {
        whiteQueenside = false;
      }
    }

    // If the king has moved, no castling is possible
    if (blackKing.hasMoved || blackRow !== 0 || blackCol !== 4) {
      blackKingside = false;
      blackQueenside = false;
    } else {
      // Kingside castle
      const kingsideRook = this.pieces[0][7];
      if (!kingsideRook || !(kingsideRook instanceof Rook) || kingsideRook.hasMoved) {
        blackKingside = false;
      }
      // Queenside castle
      const queensideRook = this.pieces[0][0];
      if (!queensideRook || !(queensideRook instanceof Rook) || queensideRook.hasMoved) {
        blackQueenside = false;
      }
    }

    // Check en passant
    let epSquare = '-';
    const pawns = findPieces(this.pieces, whiteTurn ? 'white' : 'black', Pawn);

    // Label to allow for breaking out of this for loop
    epCheck:
    for (const [pawn, row, col] of pawns) {
      const moves = pawn.getMovesChecked(this.pieces, row, col);
      // If a pawn can move diagonally to an empty square, it must be doing en passant
      for (const [moveRow, moveCol] of moves) {
        if (Math.abs(moveRow - row) === 1 && Math.abs(moveCol - col) === 1 && !this.pieces[moveRow][moveCol]) {
          // Set the en passant square and break out of the outer loop
          epSquare = moveToNotation(moveRow, moveCol);
          break epCheck;
        }
      }
    }

    let castlingFen = '';
    if (whiteKingside) castlingFen += 'K';
    if (whiteQueenside) castlingFen += 'Q';
    if (blackKingside) castlingFen += 'k';
    if (blackQueenside) castlingFen += 'q';
    if (!castlingFen) castlingFen = '-';

    const fullMoves = Math.floor((this.moves.length) / 2 + 1);

    return `${fenRows.join('/')} ${fenTurn} ${castlingFen} ${epSquare} 0 ${fullMoves}`;
  }

  /**
   * Draw the pieces to the board.
   * Asynchronous because of {@link Piece#draw}
   * @param {CanvasRenderingContext2D} ctx
   */
  async drawPieces(ctx) {
    // Iterate backwards over rows if the board is flipped
    const rowEntries = flipped
      ? this.pieces.slice().reverse().entries()
      : this.pieces.entries();

    // A list of async promises for pieces that are queued for drawing
    const drawPromises = [];

    for (const [i, row] of rowEntries) {
      // Iterate backwards over columns if the board is flipped
      const colEntries = flipped
        ? row.slice().reverse().entries()
        : row.entries();

      for (const [j, piece] of colEntries) {
        if (!piece) continue;
        drawPromises.push(piece.draw(ctx, ...offsetIndexToCoords(i, j)));
      }
    }

    await Promise.all(drawPromises);
  }

  highlightSquare(ctx, row, col) {
    if (flipped) {
      row = 7 - row;
      col = 7 - col;
    }
    ctx.fillStyle = highlightColour;
    ctx.fillRect(...indexToCoords(row, col), cellSize, cellSize);
  }

  /** 
   * Display a piece's valid moves on the canvas
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} row
   * @param {number} col
   */
  showValidMoves(ctx, row, col) {
    const piece = this.pieces[row][col];
    if (!piece) throw new TypeError(`No piece at row ${row} and col ${col}`);

    const moves = piece.getMovesChecked(this.pieces, row, col);
    ctx.fillStyle = highlightColour;
    ctx.strokeStyle = highlightColour;
    ctx.lineWidth = 8;

    for (const [moveRow, moveCol] of moves) {
      // Account for flipped board
      const drawRow = flipped ? 7 - moveRow : moveRow;
      const drawCol = flipped ? 7 - moveCol : moveCol;

      // Get the (x, y) coords to draw the next move,
      // modified to be centered on the square for drawing a circle
      const [x, y] = indexToCoords(drawRow, drawCol).map(coord => coord + (cellSize / 2));

      ctx.beginPath();

      // If a piece exists on the target square, circle it instead of placing a dot
      if (this.pieces[moveRow][moveCol]) {
        ctx.arc(x, y, cellSize / 2.5, 0, Math.PI * 2, false);
        ctx.closePath();
        ctx.stroke();
      } else {
        ctx.arc(x, y, cellSize / 5, 0, Math.PI * 2);
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  /** 
   * Move a piece on the board.
   * It is assumed that the provided move is valid,
   * i.e. it is the responsibility of the caller to validate the move beforehand.
   * This is an **asynchronous function** specifically because of pawn promotions
   * and the need to wait for a button press on the dialog
   * @param {number} sourceRow
   * @param {number} sourceCol
   * @param {number} destRow
   * @param {number} destCol
   * @throws {TypeError} If the source piece does not exist
   */
  async movePiece(sourceRow, sourceCol, destRow, destCol) {
    let toMove = this.pieces[sourceRow][sourceCol];
    if (!toMove)
      throw new TypeError(`Piece does not exist at row ${sourceRow} and column ${sourceCol}`);

    // This is a capture if there is a piece in the destination
    let capture = !!this.pieces[destRow][destCol];
    // If a special move happened, then this variable will be used for the move notation instead of trying to generate it
    let notationOverride = null;
    // Whether to still add suffixes for check, checkmate, etc. when notationOverride is defined
    let keepSuffixes = true;

    // ----- Special move considerations -----
    // --- En passant ---
    // If the piece is a pawn and it moved diagonally to an empty square, it must have been en passant
    if (!capture && toMove instanceof Pawn && Math.abs(sourceRow - destRow) === 1 && Math.abs(sourceCol - destCol) === 1 && this.pieces[sourceRow][destCol] instanceof Pawn) {
      // Remove en passant piece
      this.pieces[sourceRow][destCol] = null;
      capture = true;
    }

    // --- Castling ---
    // If the piece is a king and it moved more than one square, it must have castled
    if (!capture && toMove instanceof King && Math.abs(sourceCol - destCol) > 1) {
      // Find castle direction
      const kingside = destCol - sourceCol > 0;

      if (kingside) {
        // Move the king rook to the left of the king
        const rook = this.pieces[sourceRow][sourceCol + 3];
        rook.hasMoved = true;
        this.pieces[sourceRow][sourceCol + 3] = null;
        this.pieces[sourceRow][sourceCol + 1] = rook;
        notationOverride = 'O-O';
      } else {
        // Move the queen rook to the right of the king
        const rook = this.pieces[sourceRow][sourceCol - 4];
        rook.hasMoved = true;
        this.pieces[sourceRow][sourceCol - 4] = null;
        this.pieces[sourceRow][sourceCol - 1] = rook;
        notationOverride = 'O-O-O';
      }

      keepSuffixes = false;
    }

    // ----- Disambugation for the movelist -----
    // (Checking if any other piece of the same type could have made the move)
    // Here's a summary of how it works:
    // 1. Check if any other pieces could have made the target move
    // 2. If true, check if any of the other pieces share a row and column with the actual source piece
    // 3. If they do, then disambiguate by appending either the file, rank, or both
    // to the letter of the source piece (in that order of priority) until the move
    // is no longer ambiguous. In a situation where the file or rank could be used,
    // the file is preferred
    // The actual logic to add the rank and file to the movelist entry is later on in this function

    /** Whether the move is ambiguous */
    let ambiguous = false;
    /** Whether the row **cannot** be used to discriminate */
    let ambiguousRow = false;
    /** Whether the column **cannot** be used to discriminate */
    let ambiguousCol = false;

    // Not necessary for pawns
    if (!(toMove instanceof Pawn)) {
      /**
       * A list of other pieces of this colour and type, along with their moves.
       * If another piece could move to the same location, then use a rank, file,
       * or both to disambiguate
       */
      const otherPieceMoves =
        // Pieces of this colour and type
        findPieces(this.pieces, toMove.colour, toMove.constructor)
          // Ignore the active piece
          .filter(([piece]) => piece !== toMove)
          // Only include pieces that could also move to the destination square
          .filter(([piece, row, col]) => {
            const moves = piece.getMovesChecked(this.pieces, row, col);
            return moves.some(([row, col]) => row === destRow && col === destCol);
          });

      // If there are ambiguous moves
      if (otherPieceMoves.length) {
        ambiguous = true;
        for (const [, row, col] of otherPieceMoves) {
          if (row === sourceRow) ambiguousRow = true;
          if (col === sourceCol) ambiguousCol = true;
        }
      }
    }

    // ----- Check for pawn promotion -----
    if (toMove instanceof Pawn) {
      if (
        // At edge of board
        (toMove.colour === 'white' && destRow === 0)
        || (toMove.colour === 'black' && destRow === 7)
      ) {
        // Update the piece name and team colour
        const move = moveToNotation(destRow, destCol);
        document.querySelector('#promotion-square').innerText = move;
        setPromotionTeam(toMove.colour);
        // Get the new piece choice from the player
        const piece = await getPromotion();
        toMove = new piece(toMove.colour);
        // Override notation
        notationOverride = `${move}=${toMove.letter}`;
      }
    }

    // ----- Actually executing the move -----
    this.pieces[destRow][destCol] = toMove;
    this.pieces[sourceRow][sourceCol] = null;
    toMove.hasMoved = true;

    // Call pseudo-listeners
    for (const row of this.pieces) {
      for (const piece of row.filter(piece => piece)) {
        piece.onGlobalMove();
      }
    }
    toMove.onMove(sourceRow, sourceCol, destRow, destCol);

    // ----- Representing the move in chess notation and checking for check/chekmate/stalemate -----
    if (notationOverride && !keepSuffixes) {
      this.moves.push(notationOverride);
    } else {
      // Find the enemy king and see if they are put in check
      const [enemyKing, enemyKingRow, enemyKingCol] = findPiece(this.pieces, opposite(toMove.colour));

      const checked = enemyKing.isChecked(this.pieces, enemyKingRow, enemyKingCol);
      const mate = enemyKing.isCheckmated(this.pieces, enemyKingRow, enemyKingCol);
      const stalemate = !mate && enemyKing.isStalemated(this.pieces, enemyKingRow, enemyKingCol);

      if (mate) endGame(toMove.colour, 'checkmate');
      else if (stalemate) endGame(null, 'stalemate');

      // $ if stalemated, # if checkmated, + if checked, nothing otherwise
      const suffix = stalemate ? '$' : mate ? '#' : checked ? '+' : '';

      if (notationOverride && keepSuffixes) {
        // If the move notation was overridden but the suffix should be kept (i.e. pawn promotion)
        this.moves.push(`${notationOverride}${suffix}`);
      } else {
        let disambiguator = '';

        // Adds ranks/files to disambiguate, as described above in this function
        if (ambiguous) {
          if (!ambiguousCol) disambiguator += colToNotation(sourceCol);
          else if (!ambiguousRow) disambiguator += rowToNotation(sourceRow);
          else disambiguator += `${colToNotation(sourceCol)}${rowToNotation(sourceRow)}`;
        }

        if (!capture) {
          this.moves.push(`${toMove.letter}${disambiguator}${moveToNotation(destRow, destCol)}${suffix}`);
        } else {
          // If the piece moving has no letter set (pawns), use its starting file as the letter
          // instead of something like `N` or `K`
          const letter = toMove.letter || colToNotation(sourceCol);

          this.moves.push(`${letter}${disambiguator}x${moveToNotation(destRow, destCol)}${suffix}`);
        }
      }
    }

    // Switch turn
    whiteTurn = !whiteTurn;
    const activeTeam = whiteTurn ? 'white' : 'black';

    // Start the relevant player's timer
    startTimer(activeTeam);

    // Redraw the board
    await redraw();

    // Update movelist and turn indicator
    document.querySelector('.moves').innerHTML = movesToTable(this.moves);
    updateTurnIndicator();
  }
}

class Piece {
  imageBasename = 'images/pawn';
  letter = '';

  /** @type {boolean} */
  hasMoved = false;
  /** @type {Team} */
  colour;
  #image;

  constructor(colour) {
    this.colour = colour;
  }

  /**
   * Get the piece's image.
   * This is an **asynchronous function**, done to ensure that the function
   * only returns when the image is actually loaded.
   * It's important that this is outside the constructor,
   * since otherwise the default image (the pawn's) would always be used
   * since the constructor would use the `imageBasename` value of the base `Piece` class
   * @returns {Promise<HTMLImageElement>}
   */
  get image() {
    if (!this.#image) {
      return new Promise(resolve => {
        this.#image = new Image(cellSize, cellSize);
        // Resolve the Promise (asynchronous return) when the image loads
        this.#image.onload = () => resolve(this.#image);
        this.#image.src = `${this.imageBasename}_${this.colour}.png`;
      })
    }

    // Image is already loaded; return an already-resolved Promise
    return Promise.resolve(this.#image);
  }

  /**
   * @abstract
   * To be implemented by children
   * @param {BoardArray} board
   * @param {number} row
   * @param {number} col
   * @return {Move[]}
   */
  getMoves(board, row, col) {
    return [];
  }

  /** 
   * Get moves, but consider whether they would put the king in/out of check.
   * **This is the function to call in most cases**
   * @param {BoardArray} board
   * @param {number} row
   * @param {number} col
   * @param {Piece | null} ignore A piece to ignore in the valid move check for kings.
   * Done to fix infinite loop problems when kings keep checking each other's valid moves.
   * @see {@link King#getMoves}
   * @return {Move[]}
   */
  getMovesChecked(board, row, col, ignore = null) {
    const [king, kingRow, kingCol] = findPiece(board, this.colour);

    const moves = this.getMoves(board, row, col, ignore);

    // If we are the king, then the king has already checked which moves will threaten it
    if (this === king) return moves;

    // Check the moves that will put the king *out* of check
    const validMoves = [];

    // Temporarily remove this piece
    board[row][col] = null;

    for (const [moveRow, moveCol] of moves) {
      // Temporarily execute this move
      const oldPiece = board[moveRow][moveCol];
      board[moveRow][moveCol] = this;
      // Check if the king is now unchecked
      if (!king.isChecked(board, kingRow, kingCol, ignore))
        validMoves.push([moveRow, moveCol]);
      // Revert move
      board[moveRow][moveCol] = oldPiece;
    }

    // Put this piece back
    board[row][col] = this;

    return validMoves;
  }

  /**
   * @abstract
   * Called when this piece moves
   * @param {number} oldRow
   * @param {number} oldCol
   * @param {number} newRow
   * @param {number} newCol
   */
  onMove(oldRow, oldCol, newRow, newCol) { }

  /**
   * @abstract
   * Called when any piece on the board moves
   */
  onGlobalMove() { }

  async draw(ctx, x, y) {
    ctx.drawImage(await this.image, x, y, spriteSize, spriteSize);
  }
}

class Pawn extends Piece {
  /** Whether the pawn has just moved two squares */
  movedTwo = false;

  /** @override */
  getMoves(board, row, col) {
    const moves = [];
    const direction = movementDirection(this.colour);

    // No moves can be valid if we are at the edge of the board
    // In the future, this will lead to promotion
    if (row + direction < 0 || row + direction > 7) return moves;

    // Check if the pawn can move forward
    if (!board[row + direction][col]) {
      moves.push([row + direction, col]);
      // Check if the pawn can move 2 forward (its first move)
      if (!this.hasMoved && (row + 2 * direction) >= 0 && (row + 2 * direction) <= 7 && !board[row + 2 * direction][col]) moves.push([row + 2 * direction, col]);
    }

    // Check if a piece can be taken to the left or right
    if (checkTeam(board, row + direction, col - 1, opposite(this.colour)))
      moves.push([row + direction, col - 1]);
    if (checkTeam(board, row + direction, col + 1, opposite(this.colour)))
      moves.push([row + direction, col + 1]);

    // Check if a nearby pawn can be taken with en passant
    if (!board[row + direction][col - 1] && checkTeam(board, row, col - 1, opposite(this.colour)) && board[row][col - 1].movedTwo)
      moves.push([row + direction, col - 1]);
    if (!board[row + direction][col + 1] && checkTeam(board, row, col + 1, opposite(this.colour)) && board[row][col + 1].movedTwo)
      moves.push([row + direction, col + 1]);

    return moves;
  }

  onGlobalMove() {
    // Turn off the movedTwo property as soon as another piece moves.
    // Used for the en passant check
    this.movedTwo = false;
  }

  onMove(oldRow, oldCol, newRow, newCol) {
    // Check if the pawn moved two squares
    if (oldCol === newCol && Math.abs(oldRow - newRow) === 2)
      this.movedTwo = true;
  }
}

class Rook extends Piece {
  imageBasename = 'images/rook';
  letter = 'R';

  /** @override */
  getMoves(board, row, col) {
    return getRookMoves(this, board, row, col);
  }
}

class Bishop extends Piece {
  imageBasename = 'images/bishop';
  letter = 'B';

  /** @override */
  getMoves(board, row, col) {
    return getBishopMoves(this, board, row, col);
  }
}

class Knight extends Piece {
  imageBasename = 'images/knight';
  letter = 'N';

  /** @override */
  getMoves(board, row, col) {
    // Potentially possible knight moves
    const moves = [
      [row - 2, col + 1],
      [row - 1, col + 2],
      [row + 1, col + 2],
      [row + 2, col + 1],
      [row - 2, col - 1],
      [row - 1, col - 2],
      [row + 1, col - 2],
      [row + 2, col - 1],
    ];

    // Filter out invalid moves
    return moves.filter(([moveRow, moveCol]) =>
      // Move exists on the board
      !outOfBounds(moveRow, moveCol)
      // Move is not onto a friendly piece
      && board[moveRow][moveCol]?.colour !== this.colour
    );
  }
}

class Queen extends Piece {
  imageBasename = 'images/queen';
  letter = 'Q';

  /** @override */
  getMoves(board, row, col) {
    return [
      // Horizontal movement
      ...getRookMoves(this, board, row, col),
      // Diagonal movement
      ...getBishopMoves(this, board, row, col),
    ];
  }
}

class King extends Piece {
  imageBasename = 'images/king';
  letter = 'K';

  /**
   * @override
   * @param {Piece | null} ignore A piece to ignore in the valid move check for kings.
   * Done to fix infinite loop problems when kings keep checking each other's
   * valid moves
   */
  getMoves(board, row, col, ignore = null) {
    /** @type {Move[]} */
    const moves = movesAround(board, row, col, this.colour);

    /** Whether a given row and column touch an enemy king */
    const touchingKing = (row, col) => nextToPiece(board, row, col, this.colour, King);

    // Iterate over possible king moves
    // Temporarily remove the king from its actual place
    board[row][col] = null;

    // Label to skip a move if it's shown to be invalid
    movesLoop:
    // Iterating over a copy of moves so as not to modify the array while iterating over it
    for (const move of moves.slice()) {
      const [moveRow, moveCol] = move;
      // const moveNumber = moveToNumber([moveRow, moveCol]);
      // enemyMoves[moveNumber] = [];

      // Temporarily move the king to the new spot on the board
      // This is required in case the king's new position changes the valid moves for another piece,
      // such as a pawn (can only move diagonally if there is a piece to take)
      const oldPiece = board[moveRow][moveCol];
      board[moveRow][moveCol] = this;

      // Check if the king's new position would put it in check
      let shouldContinue = false;

      if (this.isChecked(board, moveRow, moveCol, ignore)
        // Check if the king's new position puts it next to the enemy king.
        // This extra check is required since the tests for check assume
        // that a king cannot put another king into check,
        // as that is an invalid move
        || touchingKing(moveRow, moveCol)
      ) {
        moves.splice(moves.indexOf(move), 1);
        shouldContinue = true;
      }

      // Put the old piece back
      board[moveRow][moveCol] = oldPiece;

      if (shouldContinue) continue movesLoop;
    }

    // Put the king back
    board[row][col] = this;

    // Check for castling
    if (!this.hasMoved && !this.isChecked(board, row, col, ignore)) {
      // Label to allow breaking out early.
      // Done in favour of several nested if statements,
      // since it makes the code far easier to read and edit
      kingside: {
        // --- Check kingside castle ---
        // Make sure that the rook hasn't moved
        const kingRook = board[row][col + 3];
        if (!kingRook || !(kingRook instanceof Rook) || kingRook.hasMoved) break kingside;
        // Make sure that the squares along the way are empty
        if (board[row][col + 1] || board[row][col + 2]) break kingside;
        // Make sure that the squares are not threatened
        // First square checks
        board[row][col] = null;
        board[row][col + 1] = this;
        if (
          this.isChecked(board, row, col + 1, ignore)
          || touchingKing(row, col + 1)
        ) {
          board[row][col + 1] = null;
          board[row][col] = this;
          break kingside;
        }
        // Second square checks
        board[row][col + 1] = null;
        board[row][col + 2] = this;
        if (
          this.isChecked(board, row, col + 2, ignore)
          || touchingKing(row, col + 2)
        ) {
          board[row][col + 2] = null;
          board[row][col] = this;
          break kingside;
        }

        // At this point, castling must be valid
        moves.push([row, col + 2]);
        board[row][col + 2] = null;
        board[row][col] = this;
      }

      // Label to allow breaking out early.
      // Done in favour of several nested if statements,
      // since it makes the code far easier to read and edit
      queenside: {
        // --- Check queenside castle ---
        const queenRook = board[row][col - 4];
        if (!queenRook || !(queenRook instanceof Rook) || queenRook.hasMoved) break queenside;
        // Make sure that the squares along the way are empty
        if (board[row][col - 1] || board[row][col - 2] || board[row][col - 3]) break queenside;
        // Make sure that the squares are not threatened
        // First square checks
        board[row][col] = null;
        board[row][col - 1] = this;
        if (
          this.isChecked(board, row, col - 1, ignore)
          || touchingKing(row, col - 1)
        ) {
          board[row][col - 1] = null;
          board[row][col] = this;
          break queenside;
        }
        // Second square checks
        board[row][col - 1] = null;
        board[row][col - 2] = this;
        if (
          this.isChecked(board, row, col - 2, ignore)
          || touchingKing(row, col - 2)
        ) {
          board[row][col - 2] = null;
          board[row][col] = this;
          break queenside;
        }
        // Third square checks
        board[row][col - 2] = null;
        board[row][col - 3] = this;
        if (
          this.isChecked(board, row, col - 3, ignore)
          || touchingKing(row, col - 3)
        ) {
          board[row][col - 3] = null;
          board[row][col] = this;
          break queenside;
        }

        // At this point, castling must be valid
        moves.push([row, col - 2]);
        board[row][col - 3] = null;
        board[row][col] = this;
      }
    }

    return moves;
  }

  /** 
   * Check whether this king is checked (being threatened by one or more pieces)
   * @param {BoardArray} board
   * @param {number} row
   * @param {number} col
   * @param {Piece | null} ignore
   */
  isChecked(board, row, col, ignore = null) {
    // Iterate over enemy pieces
    for (const [i, boardRow] of board.entries()) {
      for (const [j, piece] of boardRow.entries()) {
        // Filter out empty squares, friendly pieces, and (if it exists) the ignored piece
        if (!piece || piece.colour === this.colour || piece === ignore) continue;

        // Find valid moves for this piece
        const enemyMoves = piece.getMoves(board, i, j, this);
        // If any moves overlap with the king's position, the king is checked
        if (enemyMoves.some(([enemyRow, enemyCol]) => row === enemyRow && col === enemyCol)) {
          return true;
        }
      }
    }

    return false;
  }

  /** Whether the king can be defended (if there exist any valid moves on the board) */
  canBeDefended(board) {
    // Check if any friendly pieces have valid moves (including the king itself)
    for (const [i, boardRow] of board.entries()) {
      for (const [j, piece] of boardRow.entries()) {
        // Filter out empty squares and enemy pieces
        if (!piece || piece.colour !== this.colour) continue;

        // Find valid moves for this piece
        const moves = piece.getMovesChecked(board, i, j, this);
        if (moves.length) return true;
      }
    }

    return false;
  }

  /** Whether the king is **not** in check, but there are no valid moves on the board (tie) */
  isStalemated(board, row, col, ignore = null) {
    return !this.isChecked(board, row, col, ignore) && !this.canBeDefended(board);
  }

  /** Whether the king is being threatened and no moves can defend it (game over) */
  isCheckmated(board, row, col, ignore = null) {
    return this.isChecked(board, row, col, ignore) && !this.canBeDefended(board);
  }
}

drawSquares();
let board = new Board();

async function redraw() {
  drawSquares();
  if (pieceHighlighted) board.highlightSquare(ctx, highlightedRow, highlightedCol);
  await board.drawPieces(ctx);
  if (pieceHighlighted) board.showValidMoves(ctx, highlightedRow, highlightedCol);

  // Update FEN for board
  document.querySelector("#fen-entry").value = board.toFen();
}

redraw();

/**
 * @param {MouseEvent} ev 
 */
function canvasClick(ev) {
  if (dialogOpen) return;

  // Find click location relative to the canvas
  const rect = canvas.getBoundingClientRect();
  const x = ev.clientX - rect.left;
  const y = ev.clientY - rect.top;

  // Translate the click into a row and column
  let [row, col] = canvasToIndex(x, y);

  if (flipped) {
    row = 7 - row;
    col = 7 - col;
  }

  // Figure out what to do based on this click
  if (pieceHighlighted) {
    // Different piece clicked
    if (row !== highlightedRow || col !== highlightedCol) {
      // If the target location is a valid move for the highlighted piece, then go there
      const movingPiece = board.pieces[highlightedRow][highlightedCol];
      if (!movingPiece) throw new TypeError('Non-existant piece highlighted');

      if (movingPiece.getMovesChecked(board.pieces, highlightedRow, highlightedCol).some(([moveRow, moveCol]) => moveRow === row && moveCol === col)) {
        // Move piece
        board.movePiece(highlightedRow, highlightedCol, row, col);
      }
    }

    // Unhighlight the piece no matter what happens
    pieceHighlighted = false;
    highlightedRow = -1;
    highlightedCol = -1;

    redraw();
  } else {
    // Highlight the clicked piece if it was valid
    const piece = board.pieces[row][col];

    if (
      // Piece exists
      piece
      // If the piece's colour is white, check whether it's white to move.
      // Otherwise, do the same thing but for black
      && (piece.colour === 'white' ? whiteTurn : !whiteTurn)
    ) {
      pieceHighlighted = true;
      highlightedRow = row;
      highlightedCol = col;

      redraw();
    }
  }
}

canvas.addEventListener('click', canvasClick);

document.querySelector('#flip-board').addEventListener('click', () => {
  flipBoard();
  redraw();
});

document.querySelector('#load-fen').addEventListener('click', async () => {
  // Add confirmation prompt if the game was started before pressing this
  if (lastTimerUpdate) {
    const proceed = confirm('Are you sure you want to load a new board state? This will clear the current timers.');
    if (!proceed) return;
  }

  const fenEntry = document.querySelector("#fen-entry");
  // Create new board if the FEN is valid
  const newBoard = Board.fromFen(fenEntry.value);
  if (newBoard) {
    await resetGame(false);
    board = newBoard;
    await redraw();
    // Update movelist
    document.querySelector('.moves').innerHTML = movesToTable(board.moves);
  }
});

// Stop the user from dismissing the promotion dialog with Escape
document.querySelector('#promotion-dialog').addEventListener('cancel', ev => ev.preventDefault());

document.querySelector('#welcome-dismiss').addEventListener('click', () => {
  document.querySelector('#welcome-dialog').close();
});

// Sidebar button to reopen the welcome dialog
document.querySelector('#open-welcome').addEventListener('click', () => {
  document.querySelector('#welcome-dialog').showModal();
});

// Play again button in the end-of-game dialog
document.querySelector('#play-again').addEventListener('click', resetGame);

// Restart button in the sidebar
document.querySelector('#restart').addEventListener('click', () => {
  if (confirm('Are you sure you want to restart?'))
    resetGame();
});

// The modal is shown on load because it defaults to a werid position
// if it starts as open in the HTML
window.addEventListener('load', () => {
  document.querySelector('#welcome-dialog').showModal();
});
