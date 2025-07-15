let puzzle = document.getElementById("puzzle");
let moveDisplay = document.getElementById("moveDisplay");
let timerDisplay = document.getElementById("timerDisplay");
let bestDisplay = document.getElementById("bestDisplay");

let tiles = [];
let moveCount = 0;
let timer;
let seconds = 0;
let gridSize = 3;

// 🧩 Initialize puzzle with level
function init(size = 3) {
    gridSize = size;
    const total = gridSize * gridSize;
    tiles = [...Array(total - 1).keys()].map(i => i + 1);
    tiles.push(null);
    moveCount = 0;
    seconds = 0;
    clearInterval(timer);
    puzzle.classList.remove("solved");
    render();
}

// 🎨 Render puzzle tiles
function render() {
    puzzle.innerHTML = '';
    puzzle.style.gridTemplateColumns = `repeat(${gridSize}, 100px)`;
    puzzle.style.gridTemplateRows = `repeat(${gridSize}, 100px)`;

    moveDisplay.textContent = "Move: " + moveCount;
    timerDisplay.textContent = "Time: " + seconds + "s";

    let bestKey = `bestTime_${gridSize}`;
    let best = localStorage.getItem(bestKey);
    bestDisplay.textContent = "Best: " + (best ? best + "s" : "--");

    tiles.forEach((num, i) => {
        let tile = document.createElement("div");
        tile.className = "title" + (num === null ? " empty" : "");
        tile.textContent = num !== null ? num : "";
        tile.tabIndex = 0;
        tile.onclick = () => move(i);
        puzzle.appendChild(tile);
    });
}

// 🧠 Move tile if adjacent to empty
function move(i) {
    const empty = tiles.indexOf(null);
    const rowI = Math.floor(i / gridSize), colI = i % gridSize;
    const rowE = Math.floor(empty / gridSize), colE = empty % gridSize;

    const isAdjacent = Math.abs(rowI - rowE) + Math.abs(colI - colE) === 1;
    if (isAdjacent) {
        const tileDivs = puzzle.children;
        const direction =
            rowI === rowE
                ? (colI < colE ? "slide-right" : "slide-left")
                : (rowI < rowE ? "slide-down" : "slide-up");

        tileDivs[i].classList.add(direction);
        document.getElementById("moveSound").play();

        setTimeout(() => {
            tileDivs[i].classList.remove(direction);
            [tiles[i], tiles[empty]] = [tiles[empty], tiles[i]];
            moveCount++;
            render();
            checkWin();
        }, 200);
    }
}

// 🔀 Shuffle puzzle
function shuffle() {
    do {
        for (let i = tiles.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
        }
    } while (!isSolvable());

    moveCount = 0;
    seconds = 0;
    clearInterval(timer);
    timer = setInterval(() => {
        seconds++;
        timerDisplay.textContent = "Time: " + seconds + "s";
    }, 1000);
    render();
}

// ✅ Check if puzzle is solvable
function isSolvable() {
    let inv = 0;
    for (let i = 0; i < tiles.length - 1; i++) {
        for (let j = i + 1; j < tiles.length - 1; j++) {
            if (tiles[i] && tiles[j] && tiles[i] > tiles[j]) inv++;
        }
    }
    return inv % 2 === 0;
}

// 🏆 Check if puzzle is solved
function checkWin() {
    for (let i = 0; i < tiles.length - 1; i++) {
        if (tiles[i] !== i + 1) return;
    }
    clearInterval(timer);
    puzzle.classList.add("solved");
    document.getElementById("winSound").play();

    // 🎯 Challenge Mode (adaptive)
    let timeLimit = gridSize === 3 ? 60 : gridSize === 4 ? 120 : 180;
    let moveLimit = gridSize === 3 ? 50 : gridSize === 4 ? 100 : 150;
    let challengePassed = seconds <= timeLimit && moveCount <= moveLimit;

    let message = challengePassed
        ? `🎉 You beat the challenge! ${moveCount} moves in ${seconds} seconds!`
        : `✅ Puzzle solved, but challenge not met. ${moveCount} moves in ${seconds} seconds.`;

    // 🏅 Leaderboard
    let bestKey = `bestTime_${gridSize}`;
    let bestTime = localStorage.getItem(bestKey);
    if (!bestTime || seconds < bestTime) {
        localStorage.setItem(bestKey, seconds);
        message += `\n🏅 New best time for ${gridSize}×${gridSize}: ${seconds} seconds!`;
    }

    setTimeout(() => alert(message), 100);
}

// 🚀 Start game
init();
