// =====================================================
// CONNECT SOCKET.IO
// =====================================================

const socket = io();

// =====================================================
// HTML ELEMENTS
// =====================================================

const home =
    document.getElementById("home");

const game =
    document.getElementById("game");

const playerNameInput =
    document.getElementById("playerName");

const roomInput =
    document.getElementById("roomInput");

const createBtn =
    document.getElementById("createBtn");

const joinBtn =
    document.getElementById("joinBtn");

const roomCodeElement =
    document.getElementById("roomCode");

const numberBoard =
    document.getElementById("numberBoard");

const selectedText =
    document.getElementById("selectedText");

const readyBtn =
    document.getElementById("readyBtn");

const gameMessages =
    document.getElementById("gameMessages");

const player1 =
    document.getElementById("player1");

const player2 =
    document.getElementById("player2");

const status =
    document.getElementById("status");

const winnerBox =
    document.getElementById("winnerBox");

const winnerText =
    document.getElementById("winnerText");

const playAgainBtn =
    document.getElementById("playAgainBtn");

const leaveGameBtn =
    document.getElementById("leaveGameBtn");

// =====================================================
// GAME VARIABLES
// =====================================================

let currentRoom = "";

let myBoard = [];

let selectedNumbers =
    new Set();

let pendingNumber = null;

let isMyTurn = false;

let gameOver = false;

let rematchRequested = false;

// =====================================================
// PLAY AGAIN
// =====================================================

if (playAgainBtn) {

    playAgainBtn.addEventListener(
        "click",
        () => {

            if (!gameOver) {
                return;
            }

            if (rematchRequested) {
                return;
            }

            rematchRequested = true;

            playAgainBtn.disabled =
                true;

            playAgainBtn.textContent =
                "⏳ WAITING...";

            status.textContent =
                "⏳ WAITING FOR OPPONENT...";

            socket.emit(
                "playAgain",
                {
                    roomCode:
                        currentRoom
                }
            );
        }
    );
}

// =====================================================
// LEAVE GAME
// =====================================================

if (leaveGameBtn) {

    leaveGameBtn.addEventListener(
        "click",
        () => {

            window.location.reload();

        }
    );
}

// =====================================================
// CREATE ROOM
// =====================================================

createBtn.addEventListener(
    "click",
    () => {

        const name =
            playerNameInput.value.trim();

        if (!name) {

            alert(
                "Please enter your name!"
            );

            return;
        }

        socket.emit(
            "createRoom",
            {
                playerName:
                    name
            }
        );
    }
);

// =====================================================
// ROOM CREATED
// =====================================================

socket.on(
    "roomCreated",
    data => {

        currentRoom =
            data.roomCode;

        showGame();

        addMessage(
            `🎮 Room created! Room code: ${currentRoom}`
        );
    }
);

// =====================================================
// JOIN ROOM
// =====================================================

joinBtn.addEventListener(
    "click",
    () => {

        const name =
            playerNameInput.value.trim();

        const code =
            roomInput.value
                .trim()
                .toUpperCase();

        if (!name) {

            alert(
                "Please enter your name!"
            );

            return;
        }

        if (!code) {

            alert(
                "Please enter room code!"
            );

            return;
        }

        socket.emit(
            "joinRoom",
            {
                roomCode:
                    code,

                playerName:
                    name
            }
        );
    }
);

// =====================================================
// ROOM JOINED
// =====================================================

socket.on(
    "roomJoined",
    data => {

        currentRoom =
            data.roomCode;

        showGame();

        addMessage(
            `🚪 Joined room ${currentRoom}`
        );
    }
);

// =====================================================
// SHOW GAME
// =====================================================

function showGame() {

    home.style.display =
        "none";

    game.style.display =
        "block";

    roomCodeElement.textContent =
        currentRoom;
}

// =====================================================
// GAME STATE
// =====================================================

socket.on(
    "gameState",
    data => {

        currentRoom =
            data.roomCode;

        myBoard =
            data.yourBoard;

        selectedNumbers =
            new Set(
                data.calledNumbers
            );

        isMyTurn =
            data.turnPlayerId ===
            socket.id;

        gameOver =
            Boolean(data.winner);

        roomCodeElement.textContent =
            currentRoom;

        createBoard();

        updatePlayers(
            data.players
        );

        updateTurn();

        updateBingo();

        // Game finished
        if (data.winner) {

            showWinner(
                data.winnerName
            );

        } else {

            // New game
            hideWinner();
        }
    }
);

// =====================================================
// CREATE BOARD
// =====================================================

function createBoard() {

    numberBoard.innerHTML =
        "";

    for (
        let row = 0;
        row < 5;
        row++
    ) {

        for (
            let col = 0;
            col < 5;
            col++
        ) {

            const number =
                myBoard[row][col];

            const button =
                document.createElement(
                    "button"
                );

            button.className =
                "number";

            button.textContent =
                number;

            button.dataset.number =
                number;

            button.addEventListener(
                "click",
                () => {

                    selectNumber(
                        number
                    );
                }
            );

            numberBoard.appendChild(
                button
            );
        }
    }

    updateBoard();
}

// =====================================================
// SELECT NUMBER
// =====================================================

function selectNumber(number) {

    if (gameOver) {
        return;
    }

    if (!isMyTurn) {

        addMessage(
            "⏳ Wait for your turn!"
        );

        return;
    }

    if (
        selectedNumbers.has(number)
    ) {

        addMessage(
            `❌ ${number} is already called!`
        );

        return;
    }

    if (
        pendingNumber !== null
    ) {

        addMessage(
            "⚠️ Click READY before selecting another number!"
        );

        return;
    }

    socket.emit(
        "selectNumber",
        {
            roomCode:
                currentRoom,

            number:
                number
        }
    );
}

// =====================================================
// PRIVATE SELECTION
// =====================================================

socket.on(
    "selectionPending",
    data => {

        pendingNumber =
            Number(
                data.number
            );

        selectedText.textContent =
            `Selected: ${pendingNumber}`;

        readyBtn.disabled =
            false;

        updateBoard();
    }
);

// =====================================================
// READY BUTTON
// =====================================================

readyBtn.addEventListener(
    "click",
    () => {

        if (gameOver) {
            return;
        }

        if (!isMyTurn) {

            addMessage(
                "⏳ It is not your turn!"
            );

            return;
        }

        if (
            pendingNumber === null
        ) {

            alert(
                "Please select a number first!"
            );

            return;
        }

        readyBtn.disabled =
            true;

        socket.emit(
            "playerReady",
            {
                roomCode:
                    currentRoom
            }
        );
    }
);

// =====================================================
// NUMBER CONFIRMED
// =====================================================

socket.on(
    "numberConfirmed",
    data => {

        const number =
            Number(
                data.number
            );

        selectedNumbers.add(
            number
        );

        if (
            data.playerId ===
            socket.id
        ) {

            pendingNumber =
                null;

            selectedText.textContent =
                `Confirmed: ${number}`;

        } else {

            addMessage(
                `🎯 ${data.playerName} called ${number}`
            );
        }

        updateBoard();

        updateBingo();
    }
);

// =====================================================
// TURN CHANGED
// =====================================================

socket.on(
    "turnChanged",
    data => {

        isMyTurn =
            data.playerId ===
            socket.id;

        pendingNumber =
            null;

        readyBtn.disabled =
            true;

        updateTurn();

        updateBoard();

        addMessage(
            `🎯 ${data.playerName}'s turn`
        );
    }
);

// =====================================================
// UPDATE TURN
// =====================================================

function updateTurn() {

    if (gameOver) {

        status.textContent =
            "🏆 GAME OVER";

        return;
    }

    if (isMyTurn) {

        status.textContent =
            "🟢 YOUR TURN — Select a number";

    } else {

        status.textContent =
            "🔴 OPPONENT'S TURN — Please wait";
    }
}

// =====================================================
// UPDATE BOARD
// =====================================================

function updateBoard() {

    const buttons =
        document.querySelectorAll(
            ".number"
        );

    buttons.forEach(
        button => {

            const number =
                Number(
                    button.dataset.number
                );

            button.classList.remove(
                "pending"
            );

            button.classList.remove(
                "bingo-line"
            );

            // Confirmed number
            if (
                selectedNumbers.has(
                    number
                )
            ) {

                button.classList.add(
                    "selected"
                );

                button.disabled =
                    true;

                return;
            }

            // Temporary number
            if (
                pendingNumber ===
                number
            ) {

                button.classList.add(
                    "pending"
                );

                button.disabled =
                    false;

                return;
            }

            // Available number
            button.classList.remove(
                "selected"
            );

            button.disabled =
                !isMyTurn ||
                pendingNumber !== null;
        }
    );

    highlightBingoLines();
}

// =====================================================
// BINGO LINE DETECTION
// =====================================================

function getCompletedLines() {

    const lines = [];

    // =================================================
    // HORIZONTAL
    // =================================================

    for (
        let row = 0;
        row < 5;
        row++
    ) {

        let complete = true;

        for (
            let col = 0;
            col < 5;
            col++
        ) {

            if (
                !selectedNumbers.has(
                    myBoard[row][col]
                )
            ) {

                complete = false;

                break;
            }
        }

        if (complete) {

            lines.push(
                `row-${row}`
            );
        }
    }

    // =================================================
    // VERTICAL
    // =================================================

    for (
        let col = 0;
        col < 5;
        col++
    ) {

        let complete = true;

        for (
            let row = 0;
            row < 5;
            row++
        ) {

            if (
                !selectedNumbers.has(
                    myBoard[row][col]
                )
            ) {

                complete = false;

                break;
            }
        }

        if (complete) {

            lines.push(
                `col-${col}`
            );
        }
    }

    // =================================================
    // MAIN DIAGONAL
    // =================================================

    let diagonal1 = true;

    for (
        let i = 0;
        i < 5;
        i++
    ) {

        if (
            !selectedNumbers.has(
                myBoard[i][i]
            )
        ) {

            diagonal1 =
                false;

            break;
        }
    }

    if (diagonal1) {

        lines.push(
            "diagonal-main"
        );
    }

    // =================================================
    // OTHER DIAGONAL
    // =================================================

    let diagonal2 = true;

    for (
        let i = 0;
        i < 5;
        i++
    ) {

        if (
            !selectedNumbers.has(
                myBoard[i][4 - i]
            )
        ) {

            diagonal2 =
                false;

            break;
        }
    }

    if (diagonal2) {

        lines.push(
            "diagonal-other"
        );
    }

    return lines;
}

// =====================================================
// HIGHLIGHT BINGO LINES
// =====================================================

function highlightBingoLines() {

    const lines =
        getCompletedLines();

    const buttons =
        document.querySelectorAll(
            ".number"
        );

    buttons.forEach(
        button => {

            button.classList.remove(
                "bingo-line"
            );
        }
    );

    lines.forEach(
        line => {

            if (
                line.startsWith("row-")
            ) {

                const row =
                    Number(
                        line.split("-")[1]
                    );

                for (
                    let col = 0;
                    col < 5;
                    col++
                ) {

                    markNumber(
                        myBoard[row][col]
                    );
                }

            } else if (
                line.startsWith("col-")
            ) {

                const col =
                    Number(
                        line.split("-")[1]
                    );

                for (
                    let row = 0;
                    row < 5;
                    row++
                ) {

                    markNumber(
                        myBoard[row][col]
                    );
                }

            } else if (
                line ===
                "diagonal-main"
            ) {

                for (
                    let i = 0;
                    i < 5;
                    i++
                ) {

                    markNumber(
                        myBoard[i][i]
                    );
                }

            } else if (
                line ===
                "diagonal-other"
            ) {

                for (
                    let i = 0;
                    i < 5;
                    i++
                ) {

                    markNumber(
                        myBoard[i][4 - i]
                    );
                }
            }
        }
    );
}

// =====================================================
// MARK NUMBER AS BINGO LINE
// =====================================================

function markNumber(number) {

    const button =
        document.querySelector(
            `.number[data-number="${number}"]`
        );

    if (button) {

        button.classList.add(
            "bingo-line"
        );
    }
}

// =====================================================
// UPDATE BINGO LETTERS
// =====================================================

function updateBingo() {

    const lines =
        getCompletedLines();

    const letters = [
        "B",
        "I",
        "N",
        "G",
        "O"
    ];

    letters.forEach(
        (letter, index) => {

            const element =
                document.getElementById(
                    `letter-${letter}`
                );

            if (!element) {
                return;
            }

            if (
                index < lines.length
            ) {

                element.classList.add(
                    "completed"
                );

            } else {

                element.classList.remove(
                    "completed"
                );
            }
        }
    );

    highlightBingoLines();
}

// =====================================================
// WINNER
// =====================================================

socket.on(
    "winner",
    data => {

        gameOver = true;

        isMyTurn = false;

        pendingNumber = null;

        readyBtn.disabled = true;

        showWinner(
            data.winnerName
        );

        if (
            data.winnerId ===
            socket.id
        ) {

            status.textContent =
                "🏆 YOU WON!";

        } else {

            status.textContent =
                `🏆 ${data.winnerName} WON!`;
        }

        updateBoard();

        updateBingo();
    }
);

// =====================================================
// SHOW WINNER
// =====================================================

function showWinner(name) {

    winnerBox.style.display =
        "block";

    winnerText.textContent =
        `🏆 ${name} WINS! 🎉`;

    rematchRequested =
        false;

    playAgainBtn.disabled =
        false;

    playAgainBtn.textContent =
        "🔄 PLAY AGAIN";
}

// =====================================================
// HIDE WINNER
// =====================================================

function hideWinner() {

    winnerBox.style.display =
        "none";

    rematchRequested =
        false;

    playAgainBtn.disabled =
        false;

    playAgainBtn.textContent =
        "🔄 PLAY AGAIN";
}

// =====================================================
// REMATCH WAITING
// =====================================================

socket.on(
    "rematchWaiting",
    data => {

        rematchRequested =
            true;

        playAgainBtn.disabled =
            true;

        playAgainBtn.textContent =
            "⏳ WAITING...";

        status.textContent =
            "⏳ WAITING FOR OPPONENT...";

        addMessage(
            data.message
        );
    }
);

// =====================================================
// OPPONENT READY FOR REMATCH
// =====================================================

socket.on(
    "opponentRematchReady",
    data => {

        addMessage(
            `🔄 ${data.playerName} is ready for another game!`
        );
    }
);

// =====================================================
// GAME RESTARTED
// =====================================================

socket.on(
    "gameRestarted",
    data => {

        // Reset local game variables
        gameOver = false;

        pendingNumber = null;

        selectedNumbers =
            new Set();

        isMyTurn = false;

        rematchRequested =
            false;

        // Reset selected text
        selectedText.textContent =
            "Selected: -";

        // Reset READY
        readyBtn.disabled =
            true;

        // Hide winner
        hideWinner();

        // Message
        addMessage(
            data.message
        );

        // Update UI
        updateTurn();

        updateBoard();

        updateBingo();
    }
);

// =====================================================
// PLAYERS UPDATED
// =====================================================

socket.on(
    "playersUpdated",
    players => {

        updatePlayers(
            players
        );
    }
);

// =====================================================
// UPDATE PLAYER NAMES
// =====================================================

function updatePlayers(players) {

    player1.textContent =
        players[0]
            ? `👤 ${players[0].name}`
            : "Player 1: Waiting...";

    player2.textContent =
        players[1]
            ? `👤 ${players[1].name}`
            : "Player 2: Waiting...";
}

// =====================================================
// ERROR
// =====================================================

socket.on(
    "errorMessage",
    message => {

        // If Play Again failed,
        // allow the button to be clicked again.
        if (
            gameOver &&
            rematchRequested
        ) {

            rematchRequested =
                false;

            playAgainBtn.disabled =
                false;

            playAgainBtn.textContent =
                "🔄 PLAY AGAIN";
        }

        addMessage(
            `❌ ${message}`
        );
    }
);

// =====================================================
// PLAYER DISCONNECTED
// =====================================================

socket.on(
    "playerDisconnected",
    data => {

        // If opponent leaves during rematch
        rematchRequested =
            false;

        if (gameOver) {

            playAgainBtn.disabled =
                false;

            playAgainBtn.textContent =
                "🔄 PLAY AGAIN";
        }

        addMessage(
            `⚠️ ${data.message}`
        );

        updatePlayers(
            data.players
        );
    }
);

// =====================================================
// ADD MESSAGE
// =====================================================

function addMessage(message) {

    const p =
        document.createElement(
            "p"
        );

    p.textContent =
        message;

    gameMessages.appendChild(
        p
    );

    gameMessages.scrollTop =
        gameMessages.scrollHeight;
}