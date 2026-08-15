// =====================================================
// IMPORTS
// =====================================================

const express =
    require("express");

const http =
    require("http");

const path =
    require("path");

const { Server } =
    require("socket.io");


// =====================================================
// APP
// =====================================================

const app =
    express();

const server =
    http.createServer(app);

const io =
    new Server(server);


// =====================================================
// STATIC FILES
// =====================================================

const publicPath = path.join(__dirname, "public");

app.use(express.static(publicPath));


// =====================================================
// HOME PAGE
// =====================================================

app.get("/", (req, res) => {
    res.sendFile(
        path.join(publicPath, "index.html")
    );
});


// =====================================================
// ROOMS
// =====================================================

const rooms =
    new Map();


// =====================================================
// CREATE ROOM CODE
// =====================================================

function generateRoomCode() {

    const characters =
        "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";


    let code = "";


    do {

        code = "";


        for (
            let i = 0;
            i < 6;
            i++
        ) {

            code +=
                characters[
                    Math.floor(
                        Math.random() *
                        characters.length
                    )
                ];

        }

    } while (
        rooms.has(code)
    );


    return code;

}


// =====================================================
// CREATE RANDOM BOARD
// =====================================================

function createBoard() {

    const numbers =
        [];


    for (
        let i = 1;
        i <= 25;
        i++
    ) {

        numbers.push(i);

    }


    // Fisher-Yates shuffle

    for (
        let i = numbers.length - 1;
        i > 0;
        i--
    ) {

        const j =
            Math.floor(
                Math.random() *
                (i + 1)
            );


        [
            numbers[i],
            numbers[j]
        ] =
        [
            numbers[j],
            numbers[i]
        ];

    }


    const board = [];


    for (
        let row = 0;
        row < 5;
        row++
    ) {

        board.push(
            numbers.slice(
                row * 5,
                row * 5 + 5
            )
        );

    }


    return board;

}


// =====================================================
// GET PLAYER
// =====================================================

function getPlayer(
    room,
    socketId
) {

    return room.players.find(
        player =>
            player.id === socketId
    );

}


// =====================================================
// GET PUBLIC PLAYERS
// =====================================================

function getPublicPlayers(room) {

    return room.players.map(
        player => ({

            id:
                player.id,

            name:
                player.name

        })
    );

}


// =====================================================
// CALCULATE COMPLETED LINES
// =====================================================

function getCompletedLines(
    board,
    calledNumbers
) {

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
                !calledNumbers.has(
                    board[row][col]
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
                !calledNumbers.has(
                    board[row][col]
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
            !calledNumbers.has(
                board[i][i]
            )
        ) {

            diagonal1 = false;

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
            !calledNumbers.has(
                board[i][4 - i]
            )
        ) {

            diagonal2 = false;

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
// SEND GAME STATE TO PLAYER
// =====================================================

function sendGameState(
    socket,
    room
) {

    const player =
        getPlayer(
            room,
            socket.id
        );


    if (!player) {

        return;

    }


    socket.emit(
        "gameState",
        {

            roomCode:
                room.code,

            yourBoard:
                player.board,

            calledNumbers:
                [...room.calledNumbers],

            turnPlayerId:
                room.players[
                    room.turn
                ]
                    ? room.players[
                        room.turn
                    ].id
                    : null,

            players:
                getPublicPlayers(
                    room
                ),

            winner:
                room.winner
                    ? room.winner.id
                    : null,

            winnerName:
                room.winner
                    ? room.winner.name
                    : null

        }
    );

}


// =====================================================
// BROADCAST PLAYERS
// =====================================================

function broadcastPlayers(room) {

    io.to(room.code).emit(
        "playersUpdated",
        getPublicPlayers(room)
    );

}


// =====================================================
// SOCKET CONNECTION
// =====================================================

io.on(
    "connection",
    (socket) => {

        console.log(
            "Connected:",
            socket.id
        );


        // =================================================
        // CREATE ROOM
        // =================================================

        socket.on(
            "createRoom",
            ({ playerName }) => {

                const name =
                    String(
                        playerName || ""
                    ).trim();


                if (!name) {

                    socket.emit(
                        "errorMessage",
                        "Please enter your name."
                    );

                    return;

                }


                const roomCode =
                    generateRoomCode();


                const player = {

                    id:
                        socket.id,

                    name:
                        name,

                    board:
                        createBoard(),

                    pendingNumber:
                        null

                };


                const room = {

                    code:
                        roomCode,

                    players:
                        [player],

                    turn:
                        0,

                    calledNumbers:
                        new Set(),

                    winner:
                        null

                };


                rooms.set(
                    roomCode,
                    room
                );


                socket.join(
                    roomCode
                );


                socket.emit(
                    "roomCreated",
                    {

                        roomCode:
                            roomCode

                    }
                );


                broadcastPlayers(
                    room
                );


                sendGameState(
                    socket,
                    room
                );


                console.log(
                    `Room ${roomCode} created by ${name}`
                );

            }
        );


        // =================================================
        // JOIN ROOM
        // =================================================

        socket.on(
            "joinRoom",
            ({ roomCode, playerName }) => {

                const code =
                    String(
                        roomCode || ""
                    )
                    .trim()
                    .toUpperCase();


                const name =
                    String(
                        playerName || ""
                    ).trim();


                if (!name) {

                    socket.emit(
                        "errorMessage",
                        "Please enter your name."
                    );

                    return;

                }


                const room =
                    rooms.get(code);


                if (!room) {

                    socket.emit(
                        "errorMessage",
                        "Room not found."
                    );

                    return;

                }


                if (
                    room.players.length >= 2
                ) {

                    socket.emit(
                        "errorMessage",
                        "Room is already full."
                    );

                    return;

                }


                if (room.winner) {

                    socket.emit(
                        "errorMessage",
                        "This game is already finished."
                    );

                    return;

                }


                const player = {

                    id:
                        socket.id,

                    name:
                        name,

                    board:
                        createBoard(),

                    pendingNumber:
                        null

                };


                room.players.push(
                    player
                );


                socket.join(
                    code
                );


                socket.emit(
                    "roomJoined",
                    {

                        roomCode:
                            code

                    }
                );


                broadcastPlayers(
                    room
                );


                // Send state to BOTH players

                room.players.forEach(
                    player => {

                        const playerSocket =
                            io.sockets.sockets.get(
                                player.id
                            );


                        if (playerSocket) {

                            sendGameState(
                                playerSocket,
                                room
                            );

                        }

                    }
                );


                io.to(code).emit(
                    "turnChanged",
                    {

                        playerId:
                            room.players[
                                room.turn
                            ].id,

                        playerName:
                            room.players[
                                room.turn
                            ].name

                    }
                );


                console.log(
                    `${name} joined room ${code}`
                );

            }
        );


        // =================================================
        // SELECT NUMBER
        // =================================================
        //
        // IMPORTANT:
        // This is PRIVATE.
        // The opponent does NOT receive the number.
        //

        socket.on(
            "selectNumber",
            ({ roomCode, number }) => {

                const room =
                    rooms.get(
                        roomCode
                    );


                if (!room) {

                    socket.emit(
                        "errorMessage",
                        "Room not found."
                    );

                    return;

                }


                if (room.winner) {

                    return;

                }


                const player =
                    getPlayer(
                        room,
                        socket.id
                    );


                if (!player) {

                    return;

                }


                const currentPlayer =
                    room.players[
                        room.turn
                    ];


                // Not player's turn

                if (
                    !currentPlayer ||
                    currentPlayer.id !== socket.id
                ) {

                    socket.emit(
                        "errorMessage",
                        "It is not your turn."
                    );

                    return;

                }


                // Already selected but not READY

                if (
                    player.pendingNumber !== null
                ) {

                    socket.emit(
                        "errorMessage",
                        "Click READY before selecting another number."
                    );

                    return;

                }


                const selected =
                    Number(number);


                // Validate number

                if (
                    !Number.isInteger(selected) ||
                    selected < 1 ||
                    selected > 25
                ) {

                    socket.emit(
                        "errorMessage",
                        "Invalid number."
                    );

                    return;

                }


                // Number already called

                if (
                    room.calledNumbers.has(
                        selected
                    )
                ) {

                    socket.emit(
                        "errorMessage",
                        "That number has already been called."
                    );

                    return;

                }


                // Save private selection

                player.pendingNumber =
                    selected;


                // ONLY current player receives this

                socket.emit(
                    "selectionPending",
                    {

                        number:
                            selected

                    }
                );


                console.log(
                    `${player.name} privately selected ${selected}`
                );

            }
        );


        // =================================================
        // READY
        // =================================================

        socket.on(
            "playerReady",
            ({ roomCode }) => {

                const room =
                    rooms.get(
                        roomCode
                    );


                if (!room) {

                    return;

                }


                if (room.winner) {

                    return;

                }


                const player =
                    getPlayer(
                        room,
                        socket.id
                    );


                if (!player) {

                    return;

                }


                const currentPlayer =
                    room.players[
                        room.turn
                    ];


                if (
                    !currentPlayer ||
                    currentPlayer.id !== socket.id
                ) {

                    socket.emit(
                        "errorMessage",
                        "It is not your turn."
                    );

                    return;

                }


                // Must have selected a number

                if (
                    player.pendingNumber === null
                ) {

                    socket.emit(
                        "errorMessage",
                        "Please select a number first."
                    );

                    return;

                }


                const number =
                    player.pendingNumber;


                // =================================================
                // CONFIRM NUMBER
                // =================================================

                room.calledNumbers.add(
                    number
                );


                player.pendingNumber =
                    null;


                // =================================================
                // SEND TO BOTH PLAYERS
                // =================================================
                //
                // THIS is the important part.
                //
                // The opponent sees the number ONLY now.
                //

                io.to(room.code).emit(
                    "numberConfirmed",
                    {

                        number:
                            number,

                        playerId:
                            player.id,

                        playerName:
                            player.name,

                        calledNumbers:
                            [
                                ...room.calledNumbers
                            ]

                    }
                );


                // =================================================
                // CHECK BINGO
                // =================================================

                let winner = null;


                // Check players in turn order,
                // current player first

                const checkOrder =
                    [
                        player,
                        ...room.players.filter(
                            p =>
                                p.id !== player.id
                        )
                    ];


                for (
                    const checkedPlayer
                    of checkOrder
                ) {

                    const lines =
                        getCompletedLines(
                            checkedPlayer.board,
                            room.calledNumbers
                        );


                    if (
                        lines.length >= 5
                    ) {

                        winner =
                            checkedPlayer;

                        break;

                    }

                }


                // =================================================
                // WINNER FOUND
                // =================================================

                if (winner) {

                    room.winner =
                        winner;


                    const winningLines =
                        getCompletedLines(
                            winner.board,
                            room.calledNumbers
                        );


                    io.to(room.code).emit(
                        "winner",
                        {

                            winnerId:
                                winner.id,

                            winnerName:
                                winner.name,

                            lines:
                                winningLines.length

                        }
                    );


                    console.log(
                        `🏆 ${winner.name} won room ${room.code}`
                    );


                    return;

                }


                // =================================================
                // CHANGE TURN
                // =================================================

                room.turn =
                    room.turn === 0
                        ? 1
                        : 0;


                const nextPlayer =
                    room.players[
                        room.turn
                    ];


                if (nextPlayer) {

                    io.to(room.code).emit(
                        "turnChanged",
                        {

                            playerId:
                                nextPlayer.id,

                            playerName:
                                nextPlayer.name

                        }
                    );

                }


                // Send updated state

                room.players.forEach(
                    player => {

                        const playerSocket =
                            io.sockets.sockets.get(
                                player.id
                            );


                        if (playerSocket) {

                            sendGameState(
                                playerSocket,
                                room
                            );

                        }

                    }
                );

            }
        );


        // =================================================
        // DISCONNECT
        // =================================================

        socket.on(
            "disconnect",
            () => {

                console.log(
                    "Disconnected:",
                    socket.id
                );


                for (
                    const [code, room]
                    of rooms
                ) {

                    const index =
                        room.players.findIndex(
                            player =>
                                player.id === socket.id
                        );


                    if (
                        index === -1
                    ) {

                        continue;

                    }


                    const disconnectedPlayer =
                        room.players[index];


                    room.players.splice(
                        index,
                        1
                    );


                    if (
                        room.players.length === 0
                    ) {

                        rooms.delete(
                            code
                        );

                        continue;

                    }


                    // If someone leaves before game ends,
                    // keep the room but reset turn.

                    if (
                        room.turn >=
                        room.players.length
                    ) {

                        room.turn = 0;

                    }


                    io.to(code).emit(
                        "playerDisconnected",
                        {

                            message:
                                `${disconnectedPlayer.name} disconnected.`,

                            players:
                                getPublicPlayers(
                                    room
                                )

                        }
                    );


                    broadcastPlayers(
                        room
                    );


                    const remaining =
                        room.players[0];


                    if (remaining) {

                        sendGameState(
                            io.sockets.sockets.get(
                                remaining.id
                            ),
                            room
                        );

                    }

                }

            }
        );

    }
);


// =====================================================
// START SERVER
// =====================================================

// const PORT =
//     3000;


// server.listen(
//     PORT,
//     () => {

//         console.log(
//             `🎱 BINGO server running at http://localhost:${PORT}`
//         );

//     }
// );

const PORT = process.env.PORT || 3000;

server.listen(PORT, "0.0.0.0", () => {
    console.log(`BINGO server running on port ${PORT}`);
});