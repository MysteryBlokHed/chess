# Pseudocode

## Data Structures

### The Board

The board can be represented by a class, which will contain a 2D array of Pieces
as well as some other data about the board.

#### Properties

| Name     | Type                   | Description                                                                                              |
| -------: | ---------------------- | -------------------------------------------------------------------------------------------------------- |
| `moves`  | `string[]`             | A history of moves made by each player. This will just be a list of strings (i.e. `g4`, `e6`, and so on) |
| `turn`   | `"white"` or `"black"` | The player whose turn it is                                                                              |
| `pieces` | `Piece[][]`            | The state of the board (8x8 2D array)                                                                    |

#### Methods

##### `movePiece(sourceRow: number, sourceCol: number, destRow: number, destCol: number): boolean`

Move a piece from one location on the board to another.
Returns whether or not the move was successful.
This method should also check for whether the target move is valid,
using the source piece's `getMoves` function.

- `sourceRow`: The row of the source piece
- `sourceCol`: The column of the source piece
- `destRow`: The row of the destination on the board
- `destCol`: The column of the destination on the board

##### `isThreatened(row: number, col: number): boolean`

Checks whether a piece at a given coordinate is threatened (i.e. an enemy piece can move to capture it).
This will be most useful for determining if the King is in check.

##### `isMated(row: number, col: number): boolean`

Check if a piece is in checkmate (is currently threatened and no valid moves will stop it from being threatened).

### Pieces

Each piece on the board will be represented by a class.
A base `Piece` class will be made from which other pieces will inerhit.
Child classes will override the base methods,
providing their own logic to determine valid moves.

#### Properties

Properties will vary based on the specific class.

Some properties that might exist:

|       Name | Type                   | Description                                                                                            |
| ---------: | ---------------------- | ------------------------------------------------------------------------------------------------------ |
| `hasMoved` | `boolean`              | Whether the piece has moved yet. Can be used to determine valid pawn moves or whether kings can castle |
| `colour`   | `"white"` or `"black"` | The colour of the piece                                                                                |

#### Methods

##### `getMoves(board: Board, row: number, col: number): Array<[row: number, col: number]>`

> **Note**  
> It also might make more sense to just take the pieces as an array `Piece[][]`,
> since it's unlikely that the pieces will need to know other data about the board.

Get a list of valid moves, formatted as an array of valid rows and columns
(indices in the board array).

- `board`: The board the game is being played on
- `row`: The row of the piece
- `col`: The column of the piece

## Global Variables

### `board: Board`

Self-explanatory; stores an instance of the `Board` class.

### Elements

Global variables should be made for different UI components (canvas, buttons, dropdowns, etc.).

## Helper Functions

### `coordsInLine(board: Board, startRow: number, startCol:, rowDirection: number, colDirection: number, team: "white" | "black"): Array<[row: number, col: number]>`

The name might be changed if I can think of a better one.

This method will return all the valid moves in a straight path in a given direction,
until it encounters a piece blocking its path.

This will be used to find valid moves for pieces such as the rook, bishop, and queen.

### `resetGame(): void`

This function will be responsible for resetting the board.
This should include resetting the pieces to their default positions,
resetting the timers for both players,
resetting the orientation for both players,
and any other changes that need to be made between games.

## Interface

The visuals can be found in the `Storyboards.draw` file.

The board will be drawn with the HTML canvas.
Other UI elements, such as the timers and popups,
will be made with regular HTML and styled with CSS.

### Inputs

Pieces will be moved by first clicking on a piece to select it,
then clicking on one of the highlighted valid locations.
Clicking and dragging to move pieces is not a priority.

A `click` event listener can be added to the canvas element,
which will be used to find the locations of clicks.

Buttons and other UI elements can be made with their relevant listeners,
such as `click` for buttons or `change` for certain `<input>` elements.
