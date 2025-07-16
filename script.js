let historyStack = [];
let tileElements = []; // Cache for tile DOM elements
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
let soundEnabled = true;

let lockedTiles = [];
let rotatableTiles = [];
let bombTiles = [];
let bombTimers = {};
window.bombInterval = null;

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
    const level = parseInt(document.getElementById("levelSelect").value);
    currentTheme = document.getElementById("themeSelect")?.value || currentTheme;
    soundEnabled = document.getElementById("soundToggle").value === "on";
    localStorage.setItem("soundEnabled", soundEnabled);
    showPage("gamePage");
    init(level);
    applyVariants();
    render();
}

function showTutorial() {
    showPage("tutorialOverlay");
}

function hideTutorial() {
    goToWelcome();
}

function showLastBest() {
    let bestTime = localStorage.getItem("bestTime_3") || "--";
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

    // 🧩 Create tile elements once
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
    let best = localStorage.getItem(bestKey);
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

        // 🔒 Locked
        if (lockedTiles.includes(i) && value !== null) {
            tile.classList.add("locked");
            tile.innerHTML += " 🔒";
            tile.onclick = null;
        }

        // 🔄 Rotatable
        if (rotatableTiles.includes(i) && value !== null) {
            tile.classList.add("rotatable");
            tile.innerHTML += " 🔄";
            tile.onclick = () => rotateTile(i);
        }

        // ⏱️ Bomb
        if (bombTiles.includes(i) && value !== null) {
            tile.classList.add("bomb");
            tile.innerHTML += ` ⏱️${bombTimers[i]}`;
        }

        // 🧠 Normal move
        if (!lockedTiles.includes(i) && !rotatableTiles.includes(i)) {
            tile.onclick = () => move(i);
        }
    });
}

// 🔙 Undo
function undoMove() {
    if (historyStack.length > 0) {
        tiles = historyStack.pop();
        moveCount = Math.max(0, moveCount - 1);
        render();
    }
}


// 🌙 Dark Mode
function toggleDarkMode() {
    document.body.classList.toggle("dark-mode");
    localStorage.setItem("darkMode", document.body.classList.contains("dark-mode"));
}

// 🔄 Rotate
function rotateTile(i) {
    const tileDiv = puzzle.children[i];
    tileDiv.classList.add("rotate");
    setTimeout(() => tileDiv.classList.remove("rotate"), 300);
}

// 🧠 Move
function move(i) {
    if (lockedTiles.includes(i)) return;

    const empty = tiles.indexOf(null);
    const rowI = Math.floor(i / gridSize), colI = i % gridSize;
    const rowE = Math.floor(empty / gridSize), colE = empty % gridSize;

    const isAdjacent = Math.abs(rowI - rowE) + Math.abs(colI - colE) === 1;
    if (isAdjacent) {
        // 🧠 Save current state
        historyStack.push([...tiles]);

        if (soundEnabled) document.getElementById("moveSound").play();
        [tiles[i], tiles[empty]] = [tiles[empty], tiles[i]];
        moveCount++;
        render();
        checkWin();
    }
}

}

// 🔀 Shuffle
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
function isTooEasy(arr) {
    let correct = 0;
    for (let i = 0; i < arr.length - 1; i++) {
        if (arr[i] === i + 1) correct++;
    }
    return correct >= arr.length - 4; // Too close to solved
}
    do {
    shuffled = [...Array(total - 1).keys()].map(i => i + 1);
    shuffled.push(null);

    for (let i = total - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
        
} while (!isSolvable(shuffled) || isTooEasy(shuffled));

    } while (!isSolvable(shuffled));

    tiles = shuffled;
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
function isSolvable(arr) {
    let inv = 0;
    for (let i = 0; i < arr.length - 1; i++) {
        for (let j = i + 1; j < arr.length - 1; j++) {
            if (arr[i] && arr[j] && arr[i] > arr[j]) inv++;
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

    let bestKey = `bestTime_${gridSize}`;
    let bestTime = localStorage.getItem(bestKey);
    if (!bestTime || seconds < bestTime) {
        localStorage.setItem(bestKey, seconds);
    }

    updateScoreHistory(gridSize, seconds);
    setTimeout(() => alert(`🎉 Puzzle solved in ${moveCount} moves and ${seconds} seconds!`), 100);
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
    const message = `I just solved a ${gridSize}×${gridSize} slide puzzle in ${moveCount} moves and ${seconds} seconds! 🎉`;
    if (navigator.share) {
        navigator.share({
            title: "Slide Puzzle Challenge",
            text: message,
            url: window.location.href
        });
    } else {
        alert("Sharing not supported. Copy and share manually:\n\n" + message);
    }
}

// 🎨 Visual Challenge Mode
function selectVisualMode() {
    const mode = document.getElementById("visualMode").value;

    // Hide all optional inputs and reset preview
    document.getElementById("flagSelect").style.display = "none";
    document.getElementById("customImage").style.display = "none";
    document.getElementById("imagePreview").style.display = "none";
    document.getElementById("flagFact").textContent = "";

    if (mode === "emoji") {
        currentTheme = "emoji";
        customImageURL = "";
        init(gridSize); // ✅ Start emoji puzzle
    } else if (mode === "flag") {
        document.getElementById("flagSelect").style.display = "inline-block";
        // ✅ Wait for user to select a flag before initializing
    } else if (mode === "image") {
        document.getElementById("customImage").style.display = "inline-block";
        // ✅ Wait for user to upload image before initializing
    }
}


// 🌍 Flag Loader
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

    customImageURL = flagMap[flag];         // ✅ Set image URL
    currentTheme = "custom";                // ✅ Use image slicing logic
    document.getElementById("flagFact").textContent = factMap[flag];
    showImagePreview();                     // ✅ Show preview
    init(gridSize);                         // ✅ Rebuild puzzle with new image
}


// 🖼️ Image Upload
function loadCustomImage(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            customImageURL = e.target.result;  // ✅ Set uploaded image
            currentTheme = "custom";           // ✅ Use image slicing logic
            showImagePreview();                // ✅ Show preview
            init(gridSize);                    // ✅ Rebuild puzzle
        };
        reader.readAsDataURL(file);
    }
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

// 👁️ Preview
function showImagePreview() {
    const preview = document.getElementById("imagePreview");
    if (customImageURL) {
        preview.innerHTML = `<img src="${customImageURL}" alt="Preview" />`;
        preview.style.display = "block";
    }
}

// 🚀 Start Game
if (localStorage.getItem("darkMode") === "true") {
    document.body.classList.add("dark-mode");
}
soundEnabled = localStorage.getItem("soundEnabled") !== "false";
showLastBest();
