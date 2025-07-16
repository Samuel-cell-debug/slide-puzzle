let puzzle = document.getElementById("puzzle");
let moveDisplay = document.getElementById("moveDisplay");
let timerDisplay = document.getElementById("timerDisplay");
let bestDisplay = document.getElementById("bestDisplay");
let scoreHistory = document.getElementById("scoreHistory");
let historyIndicator = document.getElementById("historyIndicator");

let tiles = [];
let tileElements = [];
let moveCount = 0;
let timer;
let seconds = 0;
let gridSize = 3;

let currentTheme = "classic";
let customImageURL = "";
let soundEnabled = true;

let lockedTiles = [];
let rotatableTiles = [];
let bombTiles = [];
let bombTimers = {};
window.bombInterval = null;

let historyStack = [];
let redoStack = [];

// 🧠 Safe localStorage access
function safeSetItem(key, value) {
    try {
        const serialized = JSON.stringify(value);
        localStorage.setItem(key, serialized);
    } catch (error) {
        console.error("localStorage error:", error);
    }
}

function safeGetItem(key) {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : null;
    } catch (error) {
        console.error("localStorage read error:", error);
        return null;
    }
}

// 🌟 Page Navigation
function showPage(id) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}

function goToWelcome() {
    showPage("welcomePage");
    showLastBest();
}

function goToSettings() {
    showPage("settingsPage");
}

function quickStart() {
    gridSize = 3;
    currentTheme = "classic";
    soundEnabled = true;
    showPage("gamePage");
    init(gridSize);
}

function applySettings() {
    const levelValue = document.getElementById("levelSelect").value;
    const level = parseInt(levelValue, 10);

    if (isNaN(level) || level < 3 || level > 6) {
        alert("Invalid level selected. Please choose a valid difficulty.");
        return;
    }

    currentTheme = document.getElementById("themeSelect")?.value || currentTheme;
    soundEnabled = document.getElementById("soundToggle").value === "on";
    safeSetItem("soundEnabled", soundEnabled);

    showPage("gamePage");
    init(level);
    applyVariants();
    render();
}

function resetToDefault() {
    document.getElementById("visualMode").value = "";
    document.getElementById("flagSelect").style.display = "none";
    document.getElementById("customImage").style.display = "none";
    document.getElementById("imagePreview").style.display = "none";
    document.getElementById("flagFact").textContent = "";
    document.getElementById("imageWarning").style.display = "none";

    currentTheme = "classic";
    customImageURL = "";
    init(gridSize);
}

function showLastBest() {
    let bestTime = safeGetItem("bestTime_3") || "--";
    document.getElementById("lastBest").textContent = bestTime + "s";
}

// 🧩 Puzzle Initialization
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

    puzzle.innerHTML = '';
    tileElements = [];

    const tileSize = gridSize === 3 ? 100 : gridSize === 4 ? 80 : 60;
    puzzle.style.gridTemplateColumns = `repeat(${gridSize}, ${tileSize}px)`;
    puzzle.style.gridTemplateRows = `repeat(${gridSize}, ${tileSize}px)`;

    for (let i = 0; i < total; i++) {
        const tile = document.createElement("div");
        tile.className = "title";
        tile.tabIndex = 0;
        tile.style.width = `${tileSize}px`;
        tile.style.height = `${tileSize}px`;
        tile.style.lineHeight = `${tileSize}px`;
        tile.style.fontSize = `${tileSize / 3}px`;
        puzzle.appendChild(tile);
        tileElements.push(tile);
    }

    render();
    displayScoreHistory(gridSize);
}

// 🎨 Render Puzzle
function render() {
    moveDisplay.textContent = "Move: " + moveCount;
    timerDisplay.textContent = "Time: " + seconds + "s";

    let bestKey = `bestTime_${gridSize}`;
    let best = safeGetItem(bestKey);
    bestDisplay.textContent = "Best: " + (best ? best + "s" : "--");

    tiles.forEach((value, i) => {
        const tile = tileElements[i];
        tile.className = "title" + (value === null ? " empty" : "");
        tile.innerHTML = "";
        tile.style.backgroundImage = "";
        tile.style.color = "";

        if (value !== null) {
            if (currentTheme === "custom" && customImageURL) {
                const row = Math.floor((value - 1) / gridSize);
                const col = (value - 1) % gridSize;
                const percentX = (col / (gridSize - 1)) * 100;
                const percentY = (row / (gridSize - 1)) * 100;

                tile.style.backgroundImage = `url(${customImageURL})`;
                tile.style.backgroundSize = `${gridSize * 100}% ${gridSize * 100}%`;
                tile.style.backgroundPosition = `${percentX}% ${percentY}%`;
                tile.textContent = "";
                tile.style.color = "transparent";
            } else if (currentTheme === "emoji") {
                const emojiGrid = [
                    "😃", "🍕", "🐶", "🚀", "🎵", "🌍", "📚", "🏆", "💡",
                    "🎨", "🧠", "🔥", "🍀", "🎯", "🕹️", "🎉", "🌈", "📸"
                ];
                tile.textContent = emojiGrid[value - 1] || "❓";
            } else {
                tile.textContent = value;
            }
        }

        if (lockedTiles.includes(i) && value !== null) {
            tile.classList.add("locked");
            tile.innerHTML += " 🔒";
            tile.onclick = null;
        }

        if (rotatableTiles.includes(i) && value !== null) {
            tile.classList.add("rotatable");
            tile.innerHTML += " 🔄";
            tile.onclick = () => rotateTile(i);
        }

        if (bombTiles.includes(i) && value !== null) {
            tile.classList.add("bomb");
            tile.innerHTML += ` ⏱️${bombTimers[i]}`;
        }

        if (!lockedTiles.includes(i) && !rotatableTiles.includes(i)) {
            tile.onclick = () => move(i);
        }
    });

    historyIndicator.textContent = `Undo: ${historyStack.length} | Redo: ${redoStack.length}`;
}
function move(i) {
    if (lockedTiles.includes(i)) return;

    const empty = tiles.indexOf(null);
    const rowI = Math.floor(i / gridSize), colI = i % gridSize;
    const rowE = Math.floor(empty / gridSize), colE = empty % gridSize;

    const isAdjacent = Math.abs(rowI - rowE) + Math.abs(colI - colE) === 1;
    if (isAdjacent) {
        historyStack.push([...tiles]);
        redoStack = [];

        if (soundEnabled) document.getElementById("moveSound").play();
        [tiles[i], tiles[empty]] = [tiles[empty], tiles[i]];
        moveCount++;
        render();
        checkWin();
    }
}

function undoMove() {
    if (historyStack.length > 0) {
        redoStack.push([...tiles]);
        tiles = historyStack.pop();
        moveCount = Math.max(0, moveCount - 1);
        render();
    }
}

function redoMove() {
    if (redoStack.length > 0) {
        historyStack.push([...tiles]);
        tiles = redoStack.pop();
        moveCount++;
        render();
    }
}

function shuffle() {
    const total = gridSize * gridSize;
    let shuffled;

    do {
        shuffled = [...Array(total - 1).keys()].map(i => i + 1);
        shuffled.push(null);

        for (let i = total - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
    } while (!isSolvable(shuffled) || isTooEasy(shuffled));

    tiles = shuffled;
    moveCount = 0;
    seconds = 0;
    historyStack = [];
    redoStack = [];

    clearInterval(timer);
    timer = setInterval(() => {
        seconds++;
        timerDisplay.textContent = "Time: " + seconds + "s";
    }, 1000);

    render();
}

function isSolvable(arr) {
    let inv = 0;
    for (let i = 0; i < arr.length - 1; i++) {
        for (let j = i + 1; j < arr.length - 1; j++) {
            if (arr[i] && arr[j] && arr[i] > arr[j]) inv++;
        }
    }
    return inv % 2 === 0;
}

function isTooEasy(arr) {
    let correct = 0;
    for (let i = 0; i < arr.length - 1; i++) {
        if (arr[i] === i + 1) correct++;
    }
    return correct >= arr.length - 4;
}

function checkWin() {
    for (let i = 0; i < tiles.length - 1; i++) {
        if (tiles[i] !== i + 1) return;
    }
    clearInterval(timer);
    clearInterval(window.bombInterval);
    puzzle.classList.add("solved");
    if (soundEnabled) document.getElementById("winSound").play();

    let bestKey = `bestTime_${gridSize}`;
    let bestTime = safeGetItem(bestKey);
    if (!bestTime || seconds < bestTime) {
        safeSetItem(bestKey, seconds);
    }

    updateScoreHistory(gridSize, seconds);
    setTimeout(() => alert(`🎉 Puzzle solved in ${moveCount} moves and ${seconds} seconds!`), 100);
}

function updateScoreHistory(level, time) {
    const historyKey = `scoreHistory_${level}`;
    let history = safeGetItem(historyKey) || [];
    history.push({ time, date: new Date().toLocaleString() });
    history = history.slice(-5);
    safeSetItem(historyKey, history);
    displayScoreHistory(level);
}

function displayScoreHistory(level) {
    const historyKey = `scoreHistory_${level}`;
    let history = safeGetItem(historyKey) || [];
    let html = `<h3>Recent Scores (${level}×${level})</h3><ul>`;
    history.forEach(score => {
        html += `<li>${score.time}s on ${score.date}</li>`;
    });
    html += `</ul>`;
    scoreHistory.innerHTML = html;
}

function applyVariants() {
    const mode = document.getElementById("variantSelect")?.value || "none";
    const total = gridSize * gridSize;
    const allIndices = [...Array(total - 1).keys()];

    lockedTiles = [];
    rotatableTiles = [];
    bombTiles = [];
    bombTimers = {};

    if (mode === "locked" || mode === "all") {
        lockedTiles = allIndices.slice(0, 2);
    }
    if (mode === "rotate" || mode === "all") {
        rotatableTiles = allIndices.slice(2, 4);
    }
    if (mode === "bomb" || mode === "all") {
        bombTiles = [allIndices[4]];
        bombTimers[bombTiles[0]] = 15;
        startBombCountdown();
    }
}

function startBombCountdown() {
    clearInterval(window.bombInterval);
    window.bombInterval = setInterval(() => {
        bombTiles.forEach(i => {
            if (bombTimers[i] !== undefined) {
                bombTimers[i]--;
                if (bombTimers[i] === 0) {
                    if (!lockedTiles.includes(i)) {
                        lockedTiles.push(i);
                        alert("💣 A bomb tile has locked!");
                        render();
                    }
                }
         } else {
                console.warn(`Bomb timer missing for tile ${i}`);
            }
        });
    }, 1000);
}

function rotateTile(i) {
    const tileDiv = tileElements[i];
    let rotation = 0;

    function animate() {
        rotation += 20;
        tileDiv.style.transform = `rotate(${rotation}deg)`;
        if (rotation < 360) {
            requestAnimationFrame(animate);
        } else {
            tileDiv.style.transform = "";
        }
    }
    animate();
}

function shareScore() {
    const message = `I just solved a ${gridSize}×${gridSize} slide puzzle in ${moveCount} moves and ${seconds} seconds! 🎉`;

    if (navigator.share) {
        navigator.share({
            title: "Slide Puzzle Challenge",
            text: message,
            url: window.location.href
        }).catch(error => {
            console.error("Error sharing:", error);
            alert("Sharing failed. Please try again or copy manually.");
        });
    } else {
        alert("Sharing not supported. Copy and share manually:\n\n" + message);
    }
}

function selectVisualMode() {
    const mode = document.getElementById("visualMode").value;

    document.getElementById("flagSelect").style.display = "none";
    document.getElementById("customImage").style.display = "none";
    document.getElementById("imagePreview").style.display = "none";
    document.getElementById("flagFact").textContent = "";
    document.getElementById("imageWarning").style.display = "none";

    if (mode === "emoji") {
        currentTheme = "emoji";
        customImageURL = "";
        init(gridSize);
    } else if (mode === "flag") {
        document.getElementById("flagSelect").style.display = "inline-block";
    } else if (mode === "image") {
        document.getElementById("customImage").style.display = "inline-block";
    }
}

function loadFlagImage() {
    const flag = document.getElementById("flagSelect").value;
    if (!flag) return;

    const flagMap = {
        ghana: "flags/ghana.png",
        nigeria: "flags/nigeria.png",
        kenya: "flags/kenya.png",
        south_africa: "flags/south_africa.png",
        usa: "flags/usa.png"
    };

    const factMap = {
        ghana: "🇬🇭 Ghana's flag symbolizes freedom and justice.",
        nigeria: "🇳🇬 Nigeria's green represents agriculture.",
        kenya: "🇰🇪 Kenya's shield stands for defense of freedom.",
        south_africa: "🇿🇦 South Africa's colors represent unity.",
        usa: "🇺🇸 USA's stars represent the 50 states."
    };

    customImageURL = flagMap[flag];
    currentTheme = "custom";
    document.getElementById("flagFact").textContent = factMap[flag];
    showImagePreview();
    init(gridSize);
}

function loadCustomImage(event) {
    const file = event.target.files[0];
    if (!file) {
        document.getElementById("imageWarning").textContent = "⚠️ No image selected.";
        document.getElementById("imageWarning").style.display = "block";
        return;
    }

    const reader = new FileReader();

    reader.onload = function(e) {
        try {
            customImageURL = e.target.result;
            currentTheme = "custom";
            showImagePreview();
            init(gridSize);
        } catch (error) {
            console.error("Error loading image:", error);
            document.getElementById("imageWarning").textContent = "⚠️ Failed to load image
