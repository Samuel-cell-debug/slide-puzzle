let puzzle = document.getElementById("puzzle");
let moveDisplay = document.getElementById("moveDisplay");
let timerDisplay = document.getElementById("timerDisplay");
let bestDisplay = document.getElementById("bestDisplay");
let scoreHistory = document.getElementById("scoreHistory");

let tiles = [];
let previousTiles = [];
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
    displayScoreHistory(gridSize);
}

// 🎨 Render puzzle tiles
function render() {
    puzzle.innerHTML = '';

    const tileSize = gridSize === 3 ? 100 : gridSize === 4 ? 80 : 60;
    puzzle.style.gridTemplateColumns = `repeat(${gridSize}, ${tileSize}px)`;
    puzzle.style.gridTemplateRows = `repeat(${gridSize}, ${tileSize}px)`;

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
        tile.style.lineHeight = `${tileSize}px`;
        tile.style.fontSize = `${tileSize / 3}px`;
        tile.onclick = () => move(i);

        // 🎞️ Shuffle animation
        if (moveCount === 0 && seconds === 0) {
            tile.classList.add("shuffle");
            setTimeout(() => tile.classList.remove("shuffle"), 300);
        }

        // 📱 Swipe gestures
        let startX, startY;
        tile.addEventListener("touchstart", e => {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
        });
        tile.addEventListener("touchend", e => {
            let endX = e.changedTouches[0].clientX;
            let endY = e.changedTouches[0].clientY;
            let dx = endX - startX;
            let dy = endY - startY;

            if (Math.abs(dx) > Math.abs(dy)) {
                if (dx > 30) moveSwipe(i, "right");
                else if (dx < -30) moveSwipe(i, "left");
            } else {
                if (dy > 30) moveSwipe(i, "down");
                else if (dy < -30) moveSwipe(i, "up");
            }
        });

        puzzle.appendChild(tile);
    });
}

// 🔙 Undo last move
function undoMove() {
    if (previousTiles.length === tiles.length) {
        tiles = [...previousTiles];
        moveCount--;
        render();
    }
}

// 📱 Swipe movement logic
function moveSwipe(i, direction) {
    const empty = tiles.indexOf(null);
    const rowI = Math.floor(i / gridSize), colI = i % gridSize;
    const rowE = Math.floor(empty / gridSize), colE = empty % gridSize;

    let valid = false;
    if (direction === "left" && colI > 0 && i - 1 === empty) valid = true;
    if (direction === "right" && colI < gridSize - 1 && i + 1 === empty) valid = true;
    if (direction === "up" && rowI > 0 && i - gridSize === empty) valid = true;
    if (direction === "down" && rowI < gridSize - 1 && i + gridSize === empty) valid = true;

    if (valid) move(i);
}

// 🌙 Dark mode toggle
function toggleDarkMode() {
    document.body.classList.toggle("dark-mode");
    const isDark = document.body.classList.contains("dark-mode");
    localStorage.setItem("darkMode", isDark ? "true" : "false");
}

// 🧠 Move tile if adjacent to empty
function move(i) {
    previousTiles = [...tiles];

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

    let timeLimit = gridSize === 3 ? 60 : gridSize === 4 ? 120 : 180;
    let moveLimit = gridSize === 3 ? 50 : gridSize === 4 ? 100 : 150;
    let challengePassed = seconds <= timeLimit && moveCount <= moveLimit;

    let message = challengePassed
        ? `🎉 You beat the challenge! ${moveCount} moves in ${seconds} seconds!`
        : `✅ Puzzle solved, but challenge not met. ${moveCount} moves in ${seconds} seconds.`;

    let bestKey = `bestTime_${gridSize}`;
    let bestTime = localStorage.getItem(bestKey);
    if (!bestTime || seconds < bestTime) {
        localStorage.setItem(bestKey, seconds);
        message += `\n🏅 New best time for ${gridSize}×${gridSize}: ${seconds} seconds!`;
    }

    updateScoreHistory(gridSize, seconds);
    setTimeout(() => alert(message), 100);
}

// 📜 Score History
function updateScoreHistory(level, time) {
    let historyKey = `scoreHistory_${level}`;
    let history = JSON.parse(localStorage.getItem(historyKey)) || [];
    history.push({ time, date: new Date().toLocaleString() });
    history = history.slice(-5);
    localStorage.setItem(historyKey, JSON.stringify(history));
    displayScoreHistory(level);
}

function displayScoreHistory(level) {
    let historyKey = `scoreHistory_${level}`;
    let history = JSON.parse(localStorage.getItem(historyKey)) || [];
    let html = `<h3>Recent Scores (${level}×${level})</h3><ul>`;
    history.forEach(score => {
        html += `<li>${score.time}s on ${score.date}</li>`;
    });
    html += `</ul>`;
    scoreHistory.innerHTML = html;
}

// 🎛️ Level Selector
function changeLevel() {
    const level = parseInt(document.getElementById("levelSelect").value);
    init(level);
}

// 📤 Share Score
function shareScore() {
    const message = `I just solved a ${gridSize}×${gridSize} slide puzzle in ${moveCount} moves and ${seconds} seconds! 🎉
Can you beat my score? Try it here: https://your-username.github.io/slide-puzzle`;

    if (navigator.share) {
        navigator.share({
            title: "Slide Puzzle Challenge",
            text: message,
            url: "https://your-username.github.io/slide-puzzle"
        });
    } else {
        alert("Sharing not supported. Copy and share manually:\n\n" + message);
    }
}

// 🚀 Start game
init();

// 🌙 Apply saved dark mode
if (localStorage.getItem("darkMode") === "true") {
    document.body.classList.add("dark-mode");
}
