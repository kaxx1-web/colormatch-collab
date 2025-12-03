const socket = io();
let gameId = null;
let playerName = null;
let isHost = false;

// Background music using HTML5 Audio
const backgroundMusic = new Audio('background-music.mp3');
backgroundMusic.loop = true;
backgroundMusic.volume = 0.2; 

let isMusicPlaying = false;

function startBackgroundMusic() {
  backgroundMusic.play().catch(err => {
    console.log('Music autoplay prevented:', err);
  });
  isMusicPlaying = true;
  const musicToggle = document.getElementById('musicToggle');
  if (musicToggle) {
    musicToggle.textContent = '🎵';
    musicToggle.classList.remove('muted');
  }
}

function stopBackgroundMusic() {
  backgroundMusic.pause();
  backgroundMusic.currentTime = 0;
  isMusicPlaying = false;
  const musicToggle = document.getElementById('musicToggle');
  if (musicToggle) {
    musicToggle.textContent = '🔇';
    musicToggle.classList.add('muted');
  }
}

// Flying object animation with multiple images and patterns
function createFlyingObject() {
    // List all your flying object images here
    const flyingImages = [
      'flying-object.png',
      'flying-object2.png',
      'flying-object3.png',
      'flying-object4.png',
      'flying-object5.png'
    ];
    
    // Different animation patterns
    const patterns = [
      'fly-wave',
      'fly-bounce',
      'fly-zigzag',
      'fly-spiral',
      'fly-diagonal-down',
      'fly-diagonal-up'
    ];
    
    // Randomly select image and pattern
    const randomImage = flyingImages[Math.floor(Math.random() * flyingImages.length)];
    const randomPattern = patterns[Math.floor(Math.random() * patterns.length)];
    
    const flyingObj = document.createElement('img');
    flyingObj.className = 'flying-object';
    flyingObj.src = randomImage;
    
    // Apply random animation pattern
    flyingObj.style.animation = `${randomPattern} ${(Math.random() * 4 + 6)}s linear forwards`;
    
    // Random starting height (only for horizontal patterns)
    if (!randomPattern.includes('diagonal')) {
      flyingObj.style.top = Math.random() * 80 + 10 + '%';
    }
    
    // Random size variation
    const size = Math.random() * 40 + 40; // Between 40-80px
    flyingObj.style.width = size + 'px';
    flyingObj.style.height = size + 'px';
    
    document.body.appendChild(flyingObj);
    
    // Remove after animation completes
    setTimeout(() => flyingObj.remove(), 12000);
  }
   
// Start flying objects periodically with random intervals
function startFlyingObjects() {
  function scheduleNextObject() {
    createFlyingObject();
    // Random interval between 2-5 seconds
    const nextInterval = Math.random() * 3000 + 2000;
    setTimeout(scheduleNextObject, nextInterval);
  }
  scheduleNextObject();
}

// Screen management
function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(screenId).classList.add('active');
}

function showWelcomeScreen() { 
  showScreen('welcomeScreen'); 
  // Reset state
  gameId = null;
  playerName = null;
  isHost = false;
}

function showJoinScreen() { 
  showScreen('joinScreen'); 
}

// Game actions
function createGame() {
  playerName = document.getElementById('playerName').value.trim();
  if (!playerName) {
    alert('Please enter your name');
    return;
  }
  socket.emit('createGame', playerName);
  isHost = true;
}

function joinGame() {
  // Prevent multiple join attempts
  const joinBtn = document.getElementById('joinBtn');
  if (joinBtn.disabled) return;
  
  const joinPlayerName = document.getElementById('playerName').value.trim();
  const joinGameId = document.getElementById('joinGameId').value.trim().toUpperCase();
  
  if (!joinPlayerName || !joinGameId) {
    alert('Please enter your name and game ID');
    return;
  }
  
  // Disable join button immediately
  joinBtn.disabled = true;
  joinBtn.textContent = 'Joining...';
  
  playerName = joinPlayerName;
  gameId = joinGameId;
  
  socket.emit('joinGame', { gameId, playerName });
}

function startRound() {
  socket.emit('startRound', gameId);
}

function restartGame() {
  socket.emit('restartGame', gameId);
}

function updateColorPicker() {
  const r = document.getElementById('rSlider').value;
  const g = document.getElementById('gSlider').value;
  const b = document.getElementById('bSlider').value;
  
  document.getElementById('rValue').textContent = r;
  document.getElementById('gValue').textContent = g;
  document.getElementById('bValue').textContent = b;
  document.getElementById('userColor').style.backgroundColor = `rgb(${r},${g},${b})`;
}

function submitColor() {
  const color = {
    r: parseInt(document.getElementById('rSlider').value),
    g: parseInt(document.getElementById('gSlider').value),
    b: parseInt(document.getElementById('bSlider').value)
  };
  socket.emit('submitColor', { gameId, color });
  document.getElementById('submitBtn').disabled = true;
}

function updatePlayersList(players) {
  const list = document.getElementById('playersList');
  if (!list || !players || !Array.isArray(players)) {
    console.error('Invalid players data:', players);
    return;
  }
  
  list.innerHTML = players.map(p => `
    <div class="player-item">
      <span>${p.name || 'Unknown'}</span>
      <span>${p.score || 0} pts</span>
    </div>
  `).join('');

  console.log('Updated players list:', players); // Debug log
}

function updateRoundInfo(roundNumber, maxRounds) {
  // Only update if we have valid numbers
  if (roundNumber === undefined || maxRounds === undefined) {
    console.warn('Invalid round info:', roundNumber, maxRounds);
    return;
  }
  
  // Update all round info displays
  const lobbyRoundInfo = document.getElementById('lobbyRoundInfo');
  const gameRoundInfo = document.getElementById('gameRoundInfo');
  const resultsRoundInfo = document.getElementById('resultsRoundInfo');
  
  const text = `Round ${roundNumber} / ${maxRounds}`;
  
  if (lobbyRoundInfo) {
    lobbyRoundInfo.textContent = text;
    lobbyRoundInfo.style.display = 'block';
  }
  if (gameRoundInfo) {
    gameRoundInfo.textContent = text;
    gameRoundInfo.style.display = 'block';
  }
  if (resultsRoundInfo) {
    resultsRoundInfo.textContent = text;
    resultsRoundInfo.style.display = 'block';
  }
  
  console.log('Updated round info:', text); // Debug log
}

// Notification system
function showNotification(message) {
  // Remove any existing notification
  const existingNotif = document.querySelector('.notification');
  if (existingNotif) {
    existingNotif.remove();
  }
  
  // Create notification
  const notification = document.createElement('div');
  notification.className = 'notification';
  notification.textContent = message;
  document.body.appendChild(notification);
  
  // Trigger animation
  setTimeout(() => notification.classList.add('show'), 10);
  
  // Remove after 3 seconds
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Event listeners - Set up after DOM loads
document.addEventListener('DOMContentLoaded', () => {
  // Title click to return home
  const gameTitle = document.getElementById('gameTitle');
  if (gameTitle) {
    gameTitle.addEventListener('click', showWelcomeScreen);
  }
  
  // Music toggle
  const musicToggle = document.getElementById('musicToggle');
  if (musicToggle) {
    musicToggle.addEventListener('click', () => {
      if (!isMusicPlaying) {
        startBackgroundMusic();
      } else {
        stopBackgroundMusic();
      }
    });
  }
  
  // Optional: Auto-start on first user interaction with page
  document.addEventListener('click', () => {
    if (!isMusicPlaying) {
      startBackgroundMusic();
    }
  }, { once: true });
  
  // Start the flying objects
  startFlyingObjects();
  
  // Welcome screen buttons
  document.getElementById('createGameBtn').addEventListener('click', createGame);
  document.getElementById('joinGameBtn').addEventListener('click', showJoinScreen);
  
  // Join screen buttons
  document.getElementById('joinBtn').addEventListener('click', joinGame);
  document.getElementById('backBtn').addEventListener('click', showWelcomeScreen);
  
  // Lobby screen button
  document.getElementById('startBtn').addEventListener('click', startRound);
  
  // Game screen button
  document.getElementById('submitBtn').addEventListener('click', submitColor);
  
  // Results screen buttons
  document.getElementById('nextRoundBtn').addEventListener('click', startRound);
  document.getElementById('restartBtn').addEventListener('click', restartGame);
  document.getElementById('exitBtn').addEventListener('click', showWelcomeScreen);
  
  // Color sliders
  document.getElementById('rSlider').addEventListener('input', updateColorPicker);
  document.getElementById('gSlider').addEventListener('input', updateColorPicker);
  document.getElementById('bSlider').addEventListener('input', updateColorPicker);
  
  updateColorPicker();
});

// Socket events
socket.on('gameCreated', (data) => {
  gameId = data.gameId;
  showScreen('lobbyScreen');
  document.getElementById('displayGameId').textContent = gameId;
  updatePlayersList(data.players);
  updateRoundInfo(data.roundNumber, data.maxRounds);
  
  // Make sure host can see the start button
  if (isHost) {
    document.getElementById('startBtn').style.display = 'block';
    document.getElementById('waitingMsg').style.display = 'none';
  }
});

socket.on('playerJoined', (data) => {
  console.log('Player joined event received - FULL DATA:', JSON.stringify(data)); // Debug log
  
  // Re-enable join button in case of error (we'll disable it again on success)
  const joinBtn = document.getElementById('joinBtn');
  
  // If we just joined (not the host), switch to lobby and show success message
  if (!document.getElementById('lobbyScreen').classList.contains('active') && !isHost) {
    showScreen('lobbyScreen');
    document.getElementById('displayGameId').textContent = gameId;
    showNotification('✅ You have entered the lobby!');
  }
  
  // Check what format the data is in
  if (Array.isArray(data)) {
    // If data itself is the players array
    console.log('Data is array format');
    updatePlayersList(data);
  } else if (data.players) {
    // If data has a players property
    console.log('Data has players property');
    updatePlayersList(data.players);
    if (data.roundNumber !== undefined && data.maxRounds !== undefined) {
      updateRoundInfo(data.roundNumber, data.maxRounds);
    }
  } else {
    console.error('Unknown data format:', data);
  }
  
  // Show appropriate buttons based on host status
  if (isHost) {
    document.getElementById('startBtn').style.display = 'block';
    document.getElementById('waitingMsg').style.display = 'none';
  } else {
    document.getElementById('startBtn').style.display = 'none';
    document.getElementById('waitingMsg').style.display = 'block';
  }
});

socket.on('playerLeft', (data) => {
  updatePlayersList(data.players);
  updateRoundInfo(data.roundNumber, data.maxRounds);
});

socket.on('roundStarted', (data) => {
  console.log('Round started with data:', data); // Debug log
  
  showScreen('gameScreen');
  
  const targetColorDiv = document.getElementById('targetColor');
  const colorString = `rgb(${data.targetColor.r},${data.targetColor.g},${data.targetColor.b})`;
  console.log('Setting target color to:', colorString); // Debug log
  
  targetColorDiv.style.backgroundColor = colorString;
  
  document.getElementById('submitBtn').disabled = false;
  document.getElementById('submissionWait').style.display = 'none';
  updateRoundInfo(data.roundNumber, data.maxRounds);
  updateColorPicker();
});

socket.on('submissionReceived', (data) => {
  document.getElementById('submissionWait').style.display = 'block';
  document.getElementById('submissionWait').textContent = 
    `${data.count}/${data.total} players submitted`;
});

socket.on('roundEnded', (data) => {
  showScreen('resultsScreen');
  
  // Show results
  const resultsDiv = document.getElementById('results');
  resultsDiv.innerHTML = data.submissions
    .sort((a, b) => b.accuracy - a.accuracy)
    .map((s, i) => `
      <div class="result-item">
        <div class="result-color" style="background-image: url('background.png'); background-size: cover; background-position: center;"></div>
        <div class="result-info">
          <div><strong>${i + 1}. ${s.playerName}</strong></div>
          <div class="accuracy">${s.accuracy}% accurate</div>
          <div>+${s.points} points</div>
        </div>
      </div>
    `).join('');

  // Show leaderboard
  const leaderboard = document.getElementById('leaderboard');
  leaderboard.innerHTML = data.players
    .sort((a, b) => b.score - a.score)
    .map((p, i) => `
      <div class="player-item">
        <span>${i + 1}. ${p.name}</span>
        <strong>${p.score} pts</strong>
      </div>
    `).join('');

  // Update round info
  updateRoundInfo(data.roundNumber, data.maxRounds);

  // Show appropriate buttons based on host status and game completion
  if (data.isGameComplete) {
    document.getElementById('nextRoundBtn').style.display = 'none';
    document.getElementById('waitingNext').style.display = 'none';
    document.getElementById('gameCompleteMsg').style.display = 'block';
    
    if (isHost) {
      document.getElementById('restartBtn').style.display = 'block';
      document.getElementById('exitBtn').style.display = 'block';
    } else {
      document.getElementById('waitingRestart').style.display = 'block';
    }
  } else {
    document.getElementById('gameCompleteMsg').style.display = 'none';
    document.getElementById('restartBtn').style.display = 'none';
    document.getElementById('exitBtn').style.display = 'none';
    document.getElementById('waitingRestart').style.display = 'none';
    
    if (isHost) {
      document.getElementById('nextRoundBtn').style.display = 'block';
      document.getElementById('waitingNext').style.display = 'none';
    } else {
      document.getElementById('nextRoundBtn').style.display = 'none';
      document.getElementById('waitingNext').style.display = 'block';
    }
  }
});

socket.on('gameRestarted', (data) => {
  showScreen('lobbyScreen');
  updatePlayersList(data.players);
  updateRoundInfo(data.roundNumber, data.maxRounds);
  
  if (isHost) {
    document.getElementById('startBtn').style.display = 'block';
    document.getElementById('waitingMsg').style.display = 'none';
  } else {
    document.getElementById('startBtn').style.display = 'none';
    document.getElementById('waitingMsg').style.display = 'block';
  }
});

socket.on('error', (msg) => {
  alert(msg);
  
  // Re-enable join button on error
  const joinBtn = document.getElementById('joinBtn');
  if (joinBtn) {
    joinBtn.disabled = false;
    joinBtn.textContent = 'Join';
  }
});