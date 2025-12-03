// imports our dependencies 
import express from 'express';
import http from "http"; 
import { Server } from "socket.io"; 

const PORT = 3000; 
const MAX_ROUNDS = 6;

const app = express(); 
const server = http.createServer(app); 
const io = new Server(server, {
    cors: {
      origin: "*",             // you can restrict this later
      methods: ["GET", "POST"]
    }
  }); 
app.use(express.static("docs")); 
app.use(express.static("public"));

// Store active color matching games
const games = new Map();

io.on("connection", socket => {
    console.log("User connected: ", socket.id); 

    // Create a new game
    socket.on("createGame", (playerName) => {
        const gameId = Math.random().toString(36).substr(2, 6).toUpperCase();
        games.set(gameId, {
            id: gameId,
            host: socket.id,
            players: [{ id: socket.id, name: playerName, score: 0 }],
            currentRound: null,
            roundNumber: 0,
            targetColor: null,
            submissions: []
        });
        // sending back the game data to host, the amount of players joined, etc
        socket.join(gameId);
        socket.emit('gameCreated', { 
            gameId, 
            players: games.get(gameId).players,
            roundNumber: 0,
            maxRounds: MAX_ROUNDS
        });
        console.log(`Game created: ${gameId} by ${playerName}`);
    });

    // Join an existing game
    socket.on("joinGame", ({ gameId, playerName }) => {
        const game = games.get(gameId);
        if (!game) {
            socket.emit('error', 'Game not found');
            return;
        }
        
        // Check if player already joined (same socket ID)
        const alreadyJoined = game.players.find(p => p.id === socket.id);
        if (alreadyJoined) {
            socket.emit('error', 'You have already joined this game');
            return;
        }

        // Check if player name already exists
        const nameExists = game.players.find(p => p.name === playerName);
        if (nameExists) {
            socket.emit('error', 'This name is already taken. Please choose a different name.');
            return;
        }

        game.players.push({ id: socket.id, name: playerName, score: 0 });
        socket.join(gameId);
        
        const updateData = {
            players: game.players,
            roundNumber: game.roundNumber,
            maxRounds: MAX_ROUNDS
        };
        
        console.log(`${playerName} joined game ${gameId}, sending data:`, updateData);
        io.to(gameId).emit('playerJoined', updateData);
    });

    // Start a new round
    socket.on("startRound", (gameId) => {
        const game = games.get(gameId);
        if (!game || game.host !== socket.id) return;

        // Check if game is complete
        if (game.roundNumber >= MAX_ROUNDS) {
            io.to(gameId).emit('gameComplete', {
                players: game.players,
                totalRounds: MAX_ROUNDS
            });
            return;
        }

        // Increment round number
        game.roundNumber++;

        // Generate random target color card per round, but the same for all players so matching accuracy
        const targetColor = {
            r: Math.floor(Math.random() * 256),
            g: Math.floor(Math.random() * 256),
            b: Math.floor(Math.random() * 256)
        };

        game.targetColor = targetColor;
        game.submissions = [];
        game.currentRound = Date.now();

        io.to(gameId).emit('roundStarted', {
            targetColor,
            roundNumber: game.roundNumber,
            maxRounds: MAX_ROUNDS
        });
        console.log(`Round ${game.roundNumber} started in game ${gameId}`, targetColor);
    });

    // Submit color match
    socket.on("submitColor", ({ gameId, color }) => {
        const game = games.get(gameId);
        if (!game || !game.currentRound) return;

        const player = game.players.find(p => p.id === socket.id);
        if (!player) return;

        // Check if player already submitted for this round
        const alreadySubmitted = game.submissions.find(s => s.playerId === socket.id);
        if (alreadySubmitted) return;

        // Calculate color difference using Euclidean distance
        const diff = Math.sqrt(
            Math.pow(game.targetColor.r - color.r, 2) +
            Math.pow(game.targetColor.g - color.g, 2) +
            Math.pow(game.targetColor.b - color.b, 2)
        );

        // Convert to percentage (max distance is sqrt(3 * 255^2))
        const maxDiff = Math.sqrt(3 * Math.pow(255, 2));
        const accuracy = Math.round((1 - diff / maxDiff) * 100);
        const points = Math.max(0, accuracy);

        player.score += points;

        game.submissions.push({
            playerId: socket.id,
            playerName: player.name,
            color,
            accuracy,
            points
        });

        console.log(`${player.name} submitted: ${accuracy}% accurate`);

        // Notify all players of submission progress
        io.to(gameId).emit('submissionReceived', {
            playerName: player.name,
            count: game.submissions.length,
            total: game.players.length
        });

        // Check if all players have submitted
        if (game.submissions.length === game.players.length) {
            game.currentRound = null;
            
            // Check if this was the last round
            const isGameComplete = game.roundNumber >= MAX_ROUNDS;
            
            io.to(gameId).emit('roundEnded', {
                submissions: game.submissions,
                players: game.players,
                roundNumber: game.roundNumber,
                maxRounds: MAX_ROUNDS,
                isGameComplete
            });
            console.log(`Round ${game.roundNumber} ended in game ${gameId}`);
        }
    });

    // Restart game
    socket.on("restartGame", (gameId) => {
        const game = games.get(gameId);
        if (!game || game.host !== socket.id) return;

        // Reset all player scores and round number
        game.players.forEach(p => p.score = 0);
        game.roundNumber = 0;
        game.currentRound = null;
        game.submissions = [];

        io.to(gameId).emit('gameRestarted', {
            players: game.players,
            roundNumber: 0,
            maxRounds: MAX_ROUNDS
        });
        console.log(`Game ${gameId} restarted`);
    });

    // Handle disconnection
    socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);
        
        // Remove player from any games they're in
        games.forEach((game, gameId) => {
            const playerIndex = game.players.findIndex(p => p.id === socket.id);
            if (playerIndex !== -1) {
                const playerName = game.players[playerIndex].name;
                game.players.splice(playerIndex, 1);
                
                // Delete game if empty
                if (game.players.length === 0) {
                    games.delete(gameId);
                    console.log(`Game ${gameId} deleted (empty)`);
                } else {
                    // Transfer host if needed
                    if (game.host === socket.id) {
                        game.host = game.players[0].id;
                        console.log(`Host transferred in game ${gameId}`);
                    }
                    io.to(gameId).emit('playerLeft', {
                        players: game.players,
                        roundNumber: game.roundNumber,
                        maxRounds: MAX_ROUNDS
                    });
                    console.log(`${playerName} left game ${gameId}`);
                }
            }
        });
    });
});

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));