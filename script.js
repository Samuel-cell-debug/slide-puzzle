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

let currentTheme = "classic";
let customImageURL = "";

let lockedTiles = [];
let rotatableTiles = [];
let bombTiles = [];
let bombTimers = {};
window.bombInterval = null;

let soundEnabled = true;

// 🚀 Splash screen start
function startGame() {
    document.getElementById("splashScreen").style.display = "none";
    document.getElementById("settingsContainer").style.display = "block";
    document.getElementById("puzzle").style.display = "grid";
    init();
}

// ⚙️ Toggle settings panel
function toggleSettingsPanel() {
    const panel = document.getElementById("settingsContainer");
    panel.style.display = panel.style.display === "none" ? "block" : "none";
}

// 🎛️ Apply settings
function applySettings() {
    const level = parseInt(document.getElementById("levelSelect").value);
    currentTheme = document.getElementById("themeSelect").value;
    const variant = document.getElementById("variantSelect").value;

    document.getElementById("customImage").style.display = currentTheme === "custom" ? "inline-block" : "none";
    document.getElementById("soundToggle").value = soundEnabled ? "on" : "off";

    init(level);
    applyVariants();
    render();
}

// 🧩 Initialize puzzle
function init(size = 3) {
    gridSize = size;
    const total = gridSize * gridSize;
    tiles = [...Array(total - 1).keys()].map(i => i + 1);
    tiles.push(null);
    moveCount = 0;
    seconds = 0;
    clearInterval(timer);
    clearInterval(window.bombInterval);
    puzzle.classList.remove("solved");

    applyVariants();
    render();
    displayScoreHistory(gridSize);
}

// 🎨 Render puzzle
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
        tile.tabIndex = 0;
        tile.style.lineHeight = `${tileSize}px`;
        tile.style.fontSize = `${tileSize / 3}px`;

        // 🎨 Theme rendering
        if (num !== null) {
            if (currentTheme === "classic") {
                tile.textContent = num;
            } else if (currentTheme === "emoji") {
                const emojis = ["😃", "🍕", "🐶", "🚀", "🎵", "🌍", "📚", "🏆", "💡", "🎨", "🧠", "🔥", "🍀", "🎯", "🕹️"];
                tile.textContent = emojis[num - 1] || "❓";
            } else if (currentTheme === "flag") {
                const flags = ["🇬🇭", "🇳🇬", "🇺🇸", "🇬🇧", "🇿🇦", "🇰🇪", "🇨🇦", "🇩🇪", "🇯🇵", "🇧🇷", "🇫🇷", "🇮🇳", "🇨🇳", "🇪🇬", "🇲🇽"];
                tile.textContent = flags[num - 1] || "🏳️";
            } else if (currentTheme === "custom" && customImageURL) {
                tile.textContent = "";
                tile.style.backgroundImage = `url(${customImageURL})`;
                tile.style.backgroundSize = "cover";
                tile.style.color = "transparent";
            }
        } else {
            tile.textContent = "";
            tile.style.backgroundImage = "";
            tile.style.color = "";
        }

        // 🔒 Locked
        if (lockedTiles.includes(i) && tiles[i] !== null) {
            tile.classList.add("locked");
            tile.innerHTML += " 🔒";
            tile.onclick = null;
        }

        // 🔄 Rotatable
        if (rotatableTiles.includes(i) && tiles[i] !== null) {
            tile.classList.add("rotatable");
            tile.innerHTML += " 🔄";
            tile.onclick = () => rotateTile(i);
        }

        // ⏱️ Bomb
        if (bombTiles.includes(i) && tiles[i] !== null) {
            tile.classList.add("bomb");
            tile.innerHTML += ` ⏱️${bombTimers[i]}`;
        }

        // 🧠 Normal move
        if (!lockedTiles.includes(i) && !rotatableTiles.includes(i)) {
            tile.onclick = () => move(i);
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

// 🔙 Undo
function undoMove() {
    if (previousTiles.length === tiles.length) {
        tiles = [...previousTiles];
        moveCount--;
        render();
    }
}

// 🌙 Dark Mode
function toggleDarkMode() {
    document.body.classList.toggle("dark-mode");
    localStorage.setItem("darkMode", document.body.classList.contains("dark-mode"));
}

// 🎨 Theme
function changeTheme() {
    currentTheme = document.getElementById("themeSelect").value;
    document.getElementById("customImage").style.display = currentTheme === "custom" ? "inline-block" : "none";

    const preview = document.getElementById("themePreview");
    let sample = document.createElement("div");
    sample.className = "title";
    sample.style.width = "60px";
    sample.style.height = "60px";
    sample.style.lineHeight = "60px";
    sample.style.margin = "auto";
    sample.style.fontSize = "20px";

    if (currentTheme === "classic") sample.textContent = "1";
    else if (currentTheme === "emoji") sample.textContent = "😃";
    else if (currentTheme === "flag") sample.textContent = "🇬🇭";
    else if (currentTheme === "custom" && customImageURL) {
        sample.textContent = "";
        sample.style.backgroundImage = `url(${customImageURL})`;
        sample.style.backgroundSize = "cover";
    }

    preview.innerHTML = "<strong>Theme Preview:</strong><br/>";
    preview.appendChild(sample);
}

function loadCustomImage(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            customImageURL = e.target.result;
            changeTheme();
            render();
        };
        reader.readAsDataURL(file);
    }
}

// 🔄 Rotate
function rotateTile(i) {
    const tileDiv = puzzle.children[i];
    tileDiv.classList.add("rotate");
    setTimeout(() => tileDiv.classList.remove("rotate"), 300);
}

// 📱 Swipe
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

// 🧠 Move
function move(i) {
    if (lockedTiles.includes(i)) return;
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
        if (soundEnabled) document.getElementById("moveSound").play();

        setTimeout(() => {
            tileDivs[i].classList.remove(direction);
            [tiles[i], tiles[empty]] = [tiles[empty], tiles[i]];
            moveCount++;
            render();
            checkWin();
        }, 200);
    }
}

// 🔀 Shuffle
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

// ✅ Solvable
function isSolvable() {
    let inv = 0;
    for (let i = 0; i < tiles.length - 1; i++) {
        for (let j = i + 1; j < tiles.length - 1; j++) {
            if (tiles[i] && tiles[j] && tiles[i] > tiles[j]) inv++;
        }
    }
    return inv % 2 === 0;
}

// 🏆 Win
function checkWin() {
    for (let i = 0; i < tiles.length - 1; i++) {
        if (tiles[i] !== i + 1) return;
    }
    clearInterval(timer);
    clearInterval(window.bombInterval);
    puzzle.classList.add("solved");
    if (soundEnabled) document.getElementById("winSound").play();

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

// 🎯 Challenge Mode
function applyVariants() {
    const mode = document.getElementById("variantSelect")?.value || "none";
    const total = gridSize * gridSize;

    lockedTiles = [];
    rotatableTiles = [];
    bombTiles = [];
    bombTimers = {};

    if (mode === "locked" || mode === "all") {
        while (lockedTiles.length < 2) {
            let i = Math.floor(Math.random() * (total - 1));
            if (!lockedTiles.includes(i)) lockedTiles.push(i);
        }
    }
    if (mode === "rotate" || mode === "all") {
        while (rotatableTiles.length < 2) {
            let i = Math.floor(Math.random() * (total - 1));
            if (!rotatableTiles.includes(i) && !lockedTiles.includes(i)) rotatableTiles.push(i);
        }
    }
    if (mode === "bomb" || mode === "all") {
        while (bombTiles.length < 1) {
            let i = Math.floor(Math.random() * (total - 1));
            if (!lockedTiles.includes(i) && !rotatableTiles.includes(i)) {
                bombTiles.push(i);
                bombTimers[i] = 15;
            }
        }
        startBombCountdown();
    }
}

// ⏱️ Bomb Countdown
function startBombCountdown() {
    clearInterval(window.bombInterval);
    window.bombInterval = setInterval(() => {
        bombTiles.forEach(i => {
            if (bombTimers[i] > 0) {
                bombTimers[i]--;
                if (bombTimers[i] === 0) {
                    if (!lockedTiles.includes(i)) lockedTiles.push(i);
                    alert("💣 A bomb tile has locked!");
                    render();
                }
            }
        });
    }, 1000);
}

// 🔊 Sound Toggle
function toggleSound() {
    const value = document.getElementById("soundToggle").value;
    soundEnabled = value === "on";
    localStorage.setItem("soundEnabled", soundEnabled);
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
if (localStorage.getItem("darkMode") === "true") {
    document.body.classList.add("dark-mode");
}
soundEnabled = localStorage.getItem("soundEnabled") !== "false";
