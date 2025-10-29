// Sistema principal do jogo
document.addEventListener('DOMContentLoaded', function() {
    console.log("ULTIMA NOITE - Sistema Carregado");
    
    // Estado do jogo
    const gameState = {
        roomId: null,
        playerId: null,
        isHost: false,
        currentRole: null,
        inventory: [],
        playerSkills: [],
        firebaseReady: false,
        currentRoom: null,
        assassinPowers: {
            summon_wolves: { cooldown: 10 * 60 * 1000, lastUsed: 0 },
            shadow_walk: { cooldown: 5 * 60 * 1000, lastUsed: 0 },
            poison_dart: { cooldown: 7 * 60 * 1000, lastUsed: 0 }
        }
    };

    // Sistema de itens
    const itemSystem = {
        comum: [
            { id: "wood", name: "Madeira", emoji: "🪵", chance: 25, type: "material" },
            { id: "stick", name: "Galho", emoji: "🌿", chance: 30, type: "material" },
            { id: "stone", name: "Pedra", emoji: "🪨", chance: 20, type: "material" },
            { id: "dirty_water", name: "Água Suja", emoji: "💧", chance: 15, type: "consumable" }
        ],
        geladeira: [
            { id: "soda", name: "Refrigerante", emoji: "🥤", chance: 20, type: "consumable" },
            { id: "expired_yogurt", name: "Iogurte Vencido", emoji: "🥛", chance: 15, type: "food" }
        ],
        moveis: [
            { id: "bottle", name: "Garrafa Vazia", emoji: "🍾", chance: 20, type: "material" },
            { id: "old_key", name: "Chave Velha", emoji: "🔑", chance: 10, type: "tool" },
            { id: "bandage", name: "Bandagem Suja", emoji: "🩹", chance: 8, type: "medical" }
        ],
        cacto: [
            { id: "cactus_water", name: "Água de Cacto", emoji: "💦", chance: 40, type: "consumable" },
            { id: "cactus_spine", name: "Espinho de Cacto", emoji: "🪡", chance: 25, type: "material" }
        ]
    };

    // Sistema de craft
    const craftSystem = {
        recipes: {
            wooden_knife: {
                name: "Faca de Madeira",
                emoji: "🔪",
                type: "tool",
                ingredients: [
                    { id: "wood", amount: 2 },
                    { id: "stone", amount: 1 }
                ]
            },
            simple_shelter: {
                name: "Abrigo Simples",
                emoji: "🛖",
                type: "shelter",
                ingredients: [
                    { id: "wood", amount: 5 },
                    { id: "stick", amount: 3 }
                ]
            },
            water_filter: {
                name: "Filtro de Água",
                emoji: "💧",
                type: "tool",
                ingredients: [
                    { id: "bottle", amount: 1 },
                    { id: "stick", amount: 1 },
                    { id: "stone", amount: 1 }
                ]
            },
            stone_axe: {
                name: "Machado de Pedra",
                emoji: "🪓",
                type: "tool",
                ingredients: [
                    { id: "wood", amount: 1 },
                    { id: "stone", amount: 2 },
                    { id: "stick", amount: 1 }
                ]
            },
            simple_trap: {
                name: "Armadilha Simples",
                emoji: "🪤",
                type: "tool",
                ingredients: [
                    { id: "stick", amount: 2 },
                    { id: "stone", amount: 1 },
                    { id: "wood", amount: 1 }
                ]
            },
            fixed_radio: {
                name: "Rádio Reparado",
                emoji: "📻",
                type: "special",
                ingredients: [
                    { id: "bottle", amount: 1 },
                    { id: "stone", amount: 2 },
                    { id: "stick", amount: 1 }
                ]
            },
            medical_kit: {
                name: "Kit Médico Completo",
                emoji: "💊",
                type: "medical",
                ingredients: [
                    { id: "bandage", amount: 2 },
                    { id: "stick", amount: 1 },
                    { id: "bottle", amount: 1 }
                ]
            }
        },

        canCraft(recipeId, inventory) {
            const recipe = this.recipes[recipeId];
            if (!recipe) return false;
            
            for (const ingredient of recipe.ingredients) {
                const count = inventory.filter(item => item.id === ingredient.id).length;
                if (count < ingredient.amount) return false;
            }
            return true;
        },

        craft(recipeId, inventory) {
            const recipe = this.recipes[recipeId];
            const newInventory = [...inventory];
            
            for (const ingredient of recipe.ingredients) {
                let toRemove = ingredient.amount;
                for (let i = newInventory.length - 1; i >= 0 && toRemove > 0; i--) {
                    if (newInventory[i].id === ingredient.id) {
                        newInventory.splice(i, 1);
                        toRemove--;
                    }
                }
            }
            
            newInventory.push({
                id: recipeId,
                name: recipe.name,
                emoji: recipe.emoji,
                type: recipe.type
            });
            
            return newInventory;
        }
    };

    // Sistema de habilidades
    const skillSystem = {
        survival: {
            name: "Sobrevivência",
            description: "Conhecimento em sobrevivência no deserto",
            benefits: "+50% água de cacto, -50% dano cactos, +20% comida"
        },
        crafting: {
            name: "Crafting",
            description: "Habilidade em criar itens complexos",
            benefits: "Desbloqueia crafts avançados, -1 ingrediente"
        },
        scavenging: {
            name: "Procura",
            description: "Olho afiado para encontrar itens",
            benefits: "+25% chance encontrar itens, +10% itens raros"
        },
        healing: {
            name: "Cura",
            description: "Conhecimento em primeiros socorros",
            benefits: "Itens médicos 2x eficientes, +1 vida"
        }
    };

    // Inicialização
    function initializeGame() {
        console.log("Inicializando jogo...");
        
        // Verificar Firebase
        const checkFirebase = setInterval(() => {
            if (window.firebase) {
                clearInterval(checkFirebase);
                gameState.firebaseReady = true;
                updateConnectionStatus(true);
                console.log("Firebase carregado - Inicializando Event Listeners");
                initializeEventListeners();
            }
        }, 100);
        
        // Timeout para Firebase
        setTimeout(() => {
            if (!gameState.firebaseReady) {
                console.error("Firebase não carregou a tempo");
                updateConnectionStatus(false);
                initializeEventListeners();
            }
        }, 5000);
    }

    function updateConnectionStatus(connected) {
        const statusDot = document.getElementById('connection-status');
        const statusText = document.getElementById('connection-text');
        
        if (connected) {
            statusDot.className = 'status-online';
            statusText.textContent = 'Conectado';
        } else {
            statusDot.className = 'status-offline';
            statusText.textContent = 'Offline';
        }
    }

    // Sistema de Menu
    function initializeMenu() {
        const menuButtons = document.querySelectorAll('.menu-btn');
        
        menuButtons.forEach(button => {
            button.addEventListener('click', function() {
                // Remover classe active de todos os botões
                menuButtons.forEach(btn => btn.classList.remove('active'));
                
                // Adicionar classe active ao botão clicado
                this.classList.add('active');
                
                // Esconder todas as abas
                const tabs = document.querySelectorAll('.content-tab');
                tabs.forEach(tab => tab.classList.remove('active'));
                
                // Mostrar aba correspondente
                const tabId = this.getAttribute('data-tab') + '-tab';
                document.getElementById(tabId).classList.add('active');
            });
        });
    }

    // Event Listeners
    function initializeEventListeners() {
        console.log("Inicializando event listeners...");
        
        // Inicializar menu
        initializeMenu();
        
        // Sistema de salas
        document.getElementById('create-room-btn').addEventListener('click', createRoom);
        document.getElementById('join-room-btn').addEventListener('click', joinRoom);
        document.getElementById('leave-room-btn').addEventListener('click', leaveRoom);

        // Ações do jogo
        document.getElementById('explore-btn').addEventListener('click', explore);
        document.getElementById('search-food').addEventListener('click', searchFood);
        document.getElementById('chop-tree').addEventListener('click', chopTree);
        document.getElementById('collect-btn').addEventListener('click', collect);
        document.getElementById('search-fridge').addEventListener('click', searchFridge);
        document.getElementById('search-furniture').addEventListener('click', searchFurniture);
        document.getElementById('cactus-btn').addEventListener('click', collectCactus);
        document.getElementById('water-btn').addEventListener('click', searchWater);

        // Controles do host
        document.getElementById('assign-roles-btn').addEventListener('click', assignRoles);
        document.getElementById('next-turn-btn').addEventListener('click', nextTurn);
        document.getElementById('random-message-btn').addEventListener('click', sendRandomMessage);
        document.getElementById('trigger-event-btn').addEventListener('click', triggerRandomEvent);

        // Dados
        document.querySelectorAll('.dice-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const dice = this.getAttribute('data-dice');
                if (dice) rollDice(parseInt(dice));
            });
        });

        // Craft
        document.querySelectorAll('.craft-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const recipe = this.getAttribute('data-recipe');
                if (recipe) craftItem(recipe);
            });
        });

        // Poderes do assassino
        document.getElementById('summon-wolves').addEventListener('click', function() {
            useAssassinPower('summon_wolves');
        });
        document.getElementById('shadow-walk').addEventListener('click', function() {
            useAssassinPower('shadow_walk');
        });
        document.getElementById('poison-dart').addEventListener('click', function() {
            useAssassinPower('poison_dart');
        });

        console.log("Event listeners inicializados com sucesso");
    }

    // Sistema de Salas
    async function createRoom() {
        console.log("Criando sala...");
        
        if (!gameState.firebaseReady) {
            addLog('❌ Firebase não está carregado!');
            return;
        }

        const roomName = document.getElementById('new-room-name').value.trim();
        const hostName = document.getElementById('host-name').value.trim();

        if (!roomName || !hostName) {
            addLog('❌ Preencha todos os campos!');
            return;
        }

        try {
            const roomId = generateRoomId();
            gameState.roomId = roomId;
            gameState.playerId = 'host_' + Date.now();
            gameState.isHost = true;
            
            const roomData = {
                name: roomName,
                host: hostName,
                hostId: gameState.playerId,
                players: {
                    [gameState.playerId]: {
                        name: hostName,
                        role: 'host',
                        isHost: true,
                        isPlaying: true,
                        inventory: [],
                        skills: []
                    }
                },
                game: {
                    turn: 1,
                    day: 1,
                    weather: "🌞 Dia Ensolarado",
                    weatherEffect: "Calor intenso - Consumo de água dobrado"
                },
                createdAt: Date.now()
            };

            await window.firebase.set(
                window.firebase.ref(window.firebase.database, `rooms/${roomId}`), 
                roomData
            );

            listenToRoomChanges(roomId);
            updateUIForRoom(roomId);
            addLog(`✅ Sala "${roomName}" criada! Código: ${roomId}`);
            
        } catch (error) {
            console.error("Erro:", error);
            addLog('❌ Erro ao criar sala');
        }
    }

    async function joinRoom() {
        console.log("Entrando na sala...");
        
        if (!gameState.firebaseReady) {
            addLog('❌ Firebase não está carregado!');
            return;
        }

        const roomId = document.getElementById('room-id').value.trim();
        const playerName = document.getElementById('player-name').value.trim();

        if (!roomId || !playerName) {
            addLog('❌ Preencha todos os campos!');
            return;
        }

        try {
            const roomRef = window.firebase.ref(window.firebase.database, `rooms/${roomId}`);
            const snapshot = await window.firebase.get(roomRef);

            if (!snapshot.exists()) {
                addLog('❌ Sala não encontrada!');
                return;
            }

            const roomData = snapshot.val();
            const playerCount = Object.keys(roomData.players || {}).length;
            
            if (playerCount >= 6) {
                addLog('❌ Sala cheia! Máximo 6 jogadores.');
                return;
            }

            gameState.roomId = roomId;
            gameState.playerId = 'player_' + Date.now();
            gameState.isHost = false;

            const playerData = {
                name: playerName,
                role: 'survivor',
                isHost: false,
                isPlaying: true,
                inventory: [],
                skills: [],
                joinedAt: Date.now()
            };

            await window.firebase.set(
                window.firebase.ref(window.firebase.database, `rooms/${roomId}/players/${gameState.playerId}`),
                playerData
            );

            listenToRoomChanges(roomId);
            updateUIForRoom(roomId);
            addLog(`✅ Entrou na sala como ${playerName}`);
            
        } catch (error) {
            console.error("Erro:", error);
            addLog('❌ Erro ao entrar na sala');
        }
    }

    function listenToRoomChanges(roomId) {
        const roomRef = window.firebase.ref(window.firebase.database, `rooms/${roomId}`);
        
        window.firebase.onValue(roomRef, (snapshot) => {
            if (snapshot.exists()) {
                const roomData = snapshot.val();
                gameState.currentRoom = roomData;
                
                updatePlayersList();
                updateGameState(roomData.game);
                
                if (roomData.players && roomData.players[gameState.playerId]) {
                    const player = roomData.players[gameState.playerId];
                    gameState.currentRole = player.role;
                    gameState.inventory = player.inventory || [];
                    gameState.playerSkills = player.skills || [];
                    
                    updateInventoryDisplay();
                    updateSkillsDisplay();
                    
                    // Atualizar controles baseados no role
                    if (player.role === 'assassin') {
                        document.getElementById('assassin-powers').style.display = 'block';
                        updateAssassinPowersDisplay();
                    }
                    
                    if (gameState.isHost) {
                        document.getElementById('host-controls').style.display = 'block';
                    }
                    
                    // Mostrar crafts baseados em skills
                    if (player.skills.includes('crafting')) {
                        document.getElementById('advanced-craft').style.display = 'block';
                    }
                    if (player.skills.includes('survival')) {
                        document.getElementById('survival-craft').style.display = 'block';
                    }
                }
            } else {
                addLog('❌ Sala foi fechada!');
                leaveRoom();
            }
        });
    }

    function updatePlayersList() {
        if (!gameState.currentRoom || !gameState.currentRoom.players) return;
        
        const list = document.getElementById('players-list');
        list.innerHTML = '';
        const players = gameState.currentRoom.players;

        Object.entries(players).forEach(([id, player]) => {
            const playerElement = document.createElement('div');
            playerElement.className = 'player-card';
            
            playerElement.innerHTML = `
                <div class="player-avatar">${player.name.charAt(0).toUpperCase()}</div>
                <div class="player-info">
                    <div class="player-name">
                        ${player.name}
                        ${player.isHost ? '👑' : ''}
                        ${id === gameState.playerId ? ' (Você)' : ''}
                    </div>
                    <div class="player-role">${getRoleDisplay(player.role)}</div>
                </div>
            `;

            list.appendChild(playerElement);
        });

        document.getElementById('player-count').textContent = 
            `Jogadores: ${Object.keys(players).length}/6`;
    }

    function updateGameState(gameData) {
        if (gameData) {
            document.getElementById('weather-text').textContent = `${gameData.weather} - Dia ${gameData.day}`;
            document.getElementById('weather-effect').textContent = gameData.weatherEffect;
            document.getElementById('weather-event').style.display = 'block';
        }
    }

    function updateUIForRoom(roomId) {
        document.getElementById('room-management').style.display = 'block';
        document.getElementById('room-code-display').textContent = `Código: ${roomId}`;
        
        // Mudar para aba do jogo
        document.querySelector('.menu-btn[data-tab="game"]').click();
    }

    // Sistema de Ações do Jogo
    async function explore() {
        if (!canPerformAction()) return;
        
        const roll = rollDice(20);
        addLog(`🔍 Vasculhando... Rolou ${roll} no D20`);

        if (roll > 12) {
            const item = getRandomItem('comum');
            if (item) {
                addLog(`🎉 Encontrou: ${item.emoji} ${item.name}`);
                await addItemToInventory(item);
            }
        } else {
            addLog('💨 Nada de útil encontrado...');
        }
    }

    async function searchFood() {
        if (!canPerformAction()) return;
        
        const roll = rollDice(8);
        addLog(`🍖 Procurando comida... Rolou ${roll} no D8`);

        if (roll > 3) {
            const item = getRandomItem('comum');
            if (item) {
                addLog(`🍽️ Encontrou: ${item.emoji} ${item.name}`);
                await addItemToInventory(item);
            }
        } else {
            addLog('🐍 Um animal te afugentou!');
        }
    }

    async function chopTree() {
        if (!canPerformAction()) return;
        
        const roll = rollDice(8);
        addLog(`🪓 Cortando árvore... Rolou ${roll} no D8`);

        if (roll > 2) {
            addLog('🎯 Madeira obtida!');
            await addItemToInventory({ id: "wood", name: "Madeira", emoji: "🪵", type: "material" });
        } else {
            addLog('💢 A machada quebrou!');
        }
    }

    async function collectCactus() {
        if (!canPerformAction()) return;
        
        const roll = rollDice(6);
        addLog(`🌵 Coletando cacto... Rolou ${roll} no D6`);

        if (roll > 2) {
            const item = getRandomItem('cacto');
            if (item) {
                addLog(`🌵 Coletou: ${item.emoji} ${item.name}`);
                await addItemToInventory(item);
            }
        } else {
            addLog('💉 Os espinhos te machucaram!');
        }
    }

    async function searchWater() {
        if (!canPerformAction()) return;
        
        const roll = rollDice(10);
        addLog(`💧 Procurando água... Rolou ${roll} no D10`);

        if (roll > 5) {
            addLog(`💦 Encontrou água!`);
            await addItemToInventory({ id: "dirty_water", name: "Água Suja", emoji: "💧", type: "consumable" });
        } else {
            addLog('🏜️ Nenhum sinal de água...');
        }
    }

    async function collect() {
        if (!canPerformAction()) return;
        
        const roll = rollDice(6);
        addLog(`🌿 Coletando arbustos... Rolou ${roll} no D6`);

        if (roll > 2) {
            addLog('🌿 Galhos coletados!');
            await addItemToInventory({ id: "stick", name: "Galho", emoji: "🌿", type: "material" });
        } else {
            addLog('🌱 Só folhas secas...');
        }
    }

    async function searchFridge() {
        if (!canPerformAction()) return;
        
        const roll = rollDice(8);
        addLog(`🧊 Procurando na geladeira... Rolou ${roll} no D8`);

        if (roll > 2) {
            const item = getRandomItem('geladeira');
            if (item) {
                addLog(`🧊 Encontrou: ${item.emoji} ${item.name}`);
                await addItemToInventory(item);
            }
        } else {
            addLog('💀 Só coisas estragadas...');
        }
    }

    async function searchFurniture() {
        if (!canPerformAction()) return;
        
        const roll = rollDice(8);
        addLog(`🪑 Vasculhando móveis... Rolou ${roll} no D8`);

        if (roll > 3) {
            const item = getRandomItem('moveis');
            if (item) {
                addLog(`🪑 Encontrou: ${item.emoji} ${item.name}`);
                await addItemToInventory(item);
            }
        } else {
            addLog('🕷️ Só aranhas...');
        }
    }

    // Sistema de Inventário
    async function addItemToInventory(item) {
        gameState.inventory.push(item);
        
        if (gameState.firebaseReady && gameState.roomId && gameState.playerId) {
            try {
                await window.firebase.set(
                    window.firebase.ref(window.firebase.database, `rooms/${gameState.roomId}/players/${gameState.playerId}/inventory`),
                    gameState.inventory
                );
            } catch (error) {
                console.error("Erro ao salvar inventário:", error);
            }
        }
        
        updateInventoryDisplay();
    }

    function updateInventoryDisplay() {
        const grid = document.getElementById('inventory-grid');
        
        if (gameState.inventory.length === 0) {
            grid.innerHTML = `
                <div class="empty-inventory">
                    <span>🎒</span>
                    <p>Seu inventário está vazio</p>
                    <p>Use as ações do jogo para coletar itens!</p>
                </div>
            `;
            return;
        }
        
        grid.innerHTML = '';
        
        gameState.inventory.forEach((item, index) => {
            const itemElement = document.createElement('div');
            itemElement.className = 'item-card';
            itemElement.innerHTML = `
                <div class="item-icon">${item.emoji}</div>
                <div class="item-name">${item.name}</div>
                <div class="item-actions">
                    <button class="item-btn btn-danger" onclick="removeItem(${index})">🗑️</button>
                    <button class="item-btn btn-success" onclick="useItem(${index})">🔄</button>
                </div>
            `;
            grid.appendChild(itemElement);
        });
    }

    // Sistema de Craft
    async function craftItem(recipeId) {
        if (!gameState.roomId || !gameState.playerId) return;

        if (!craftSystem.canCraft(recipeId, gameState.inventory)) {
            addLog('❌ Ingredientes insuficientes!');
            return;
        }

        const recipe = craftSystem.recipes[recipeId];
        const newInventory = craftSystem.craft(recipeId, gameState.inventory);
        
        gameState.inventory = newInventory;
        
        if (gameState.firebaseReady && gameState.roomId && gameState.playerId) {
            try {
                await window.firebase.set(
                    window.firebase.ref(window.firebase.database, `rooms/${gameState.roomId}/players/${gameState.playerId}/inventory`),
                    gameState.inventory
                );
            } catch (error) {
                console.error("Erro ao salvar inventário:", error);
            }
        }
        
        updateInventoryDisplay();
        addLog(`🛠️ Craft bem-sucedido! Criou: ${recipe.emoji} ${recipe.name}`);
    }

    // Sistema de Habilidades
    function updateSkillsDisplay() {
        const skillsList = document.getElementById('skills-list');
        
        if (gameState.playerSkills.length === 0) {
            skillsList.innerHTML = `
                <div class="no-skills">
                    <span>🎓</span>
                    <p>Você ainda não possui habilidades</p>
                    <p>O host pode atribuir habilidades durante o jogo</p>
                </div>
            `;
            return;
        }
        
        skillsList.innerHTML = '';
        
        gameState.playerSkills.forEach(skill => {
            const skillData = skillSystem[skill];
            if (skillData) {
                const skillElement = document.createElement('div');
                skillElement.className = 'skill-item skill-active';
                skillElement.innerHTML = `
                    <strong>${skillData.name}</strong>
                    <div style="font-size: 12px; color: var(--muted); margin-top: 5px;">${skillData.description}</div>
                    <div style="font-size: 11px; color: var(--success); margin-top: 3px;">${skillData.benefits}</div>
                `;
                skillsList.appendChild(skillElement);
            }
        });
    }

    // Poderes do Assassino
    async function useAssassinPower(powerId) {
        if (!gameState.roomId || !gameState.playerId || gameState.currentRole !== 'assassin') return;

        const power = gameState.assassinPowers[powerId];
        const now = Date.now();
        
        if (now - power.lastUsed < power.cooldown) {
            const remaining = Math.ceil((power.cooldown - (now - power.lastUsed)) / 1000 / 60);
            addLog(`⏳ Habilidade em cooldown! Aguarde mais ${remaining} minutos.`);
            return;
        }

        gameState.assassinPowers[powerId].lastUsed = now;
        updateAssassinPowersDisplay();

        const powerMessages = {
            summon_wolves: '🐺 Você invocou lobos do deserto!',
            shadow_walk: '👻 Você se move silenciosamente nas sombras...',
            poison_dart: '🎯 Você prepara um dardo envenenado...'
        };

        addLog(powerMessages[powerId], true);
    }

    function updateAssassinPowersDisplay() {
        if (gameState.currentRole !== 'assassin') return;

        const now = Date.now();
        Object.keys(gameState.assassinPowers).forEach(powerId => {
            const btn = document.getElementById(powerId.replace(/_/g, '-'));
            const power = gameState.assassinPowers[powerId];
            
            if (btn) {
                const remaining = power.cooldown - (now - power.lastUsed);
                if (remaining > 0) {
                    btn.disabled = true;
                    const minutes = Math.ceil(remaining / 1000 / 60);
                    btn.querySelector('.power-cooldown').textContent = `${minutes}min CD`;
                } else {
                    btn.disabled = false;
                    btn.querySelector('.power-cooldown').textContent = 'Pronto';
                }
            }
        });
    }

    // Controles do Host
    async function assignRoles() {
        if (!gameState.isHost) {
            addLog('❌ Apenas o host pode sortear papéis!');
            return;
        }

        const players = gameState.currentRoom.players;
        const playerIds = Object.keys(players).filter(id => !players[id].isHost);

        if (playerIds.length < 2) {
            addLog('❌ Precisa de pelo menos 2 jogadores!');
            return;
        }

        const assassinIndex = Math.floor(Math.random() * playerIds.length);
        const updates = {};

        playerIds.forEach((id, index) => {
            const role = index === assassinIndex ? 'assassin' : 'survivor';
            updates[`/rooms/${gameState.roomId}/players/${id}/role`] = role;
        });

        try {
            await window.firebase.update(window.firebase.ref(window.firebase.database), updates);
            addLog('🎭 Papéis sorteados! O assassino está entre vocês...');
        } catch (error) {
            console.error("Erro:", error);
            addLog('❌ Erro ao sortear papéis');
        }
    }

    async function nextTurn() {
        if (!gameState.isHost) {
            addLog('❌ Apenas o host pode avançar turnos!');
            return;
        }

        const game = gameState.currentRoom.game;
        game.turn += 1;
        game.day = Math.floor(game.turn / 3) + 1;
        
        const weathers = [
            { name: "🌞 Dia Ensolarado", effect: "Calor intenso" },
            { name: "🌧️ Chuva Rara", effect: "Água disponível" },
            { name: "🌬️ Ventania Forte", effect: "Dificuldade em explorar" }
        ];
        const newWeather = weathers[Math.floor(Math.random() * weathers.length)];
        
        game.weather = newWeather.name;
        game.weatherEffect = newWeather.effect;

        try {
            await window.firebase.update(
                window.firebase.ref(window.firebase.database, `rooms/${gameState.roomId}/game`),
                game
            );
            addLog(`⏭️ Dia ${game.day} - Turno ${game.turn} iniciado`);
        } catch (error) {
            console.error("Erro:", error);
            addLog('❌ Erro ao avançar turno');
        }
    }

    function sendRandomMessage() {
        if (!gameState.isHost) return;
        const messages = [
            "🌅 O sol começa a nascer no horizonte...",
            "🌌 As estrelas aparecem no céu escuro",
            "💨 Uma brisa suave passa pelo acampamento",
            "🌵 Cactos balançam lentamente ao vento"
        ];
        const randomMessage = messages[Math.floor(Math.random() * messages.length)];
        addLog(`💬 ${randomMessage}`);
    }

    function triggerRandomEvent() {
        if (!gameState.isHost) return;

        const events = [
            () => addLog('🌪️ UMA TEMPESTADE DE AREIA SE APROXIMA! Procurem abrigo!'),
            () => addLog('💧 UMA FONTE DE ÁGUA FOI ENCONTRADA! Todos recuperam 1 de sede.'),
            () => addLog('🐍 COBRAS VENENOSAS INVADEM O ACAMPAMENTO! Cuidado!')
        ];

        const randomEvent = events[Math.floor(Math.random() * events.length)];
        randomEvent();
    }

    // Funções Utilitárias
    function generateRoomId() {
        return Math.random().toString(36).substring(2, 8).toUpperCase();
    }

    function getRandomItem(pool) {
        const items = itemSystem[pool];
        if (!items) return null;
        return items[Math.floor(Math.random() * items.length)];
    }

    function getRoleDisplay(role) {
        const roles = {
            'host': '👑 Host',
            'survivor': '😊 Sobrevivente',
            'assassin': '🔪 Assassino',
            'spectator': '👁️ Espectador'
        };
        return roles[role] || role;
    }

    function addLog(message, isPrivate = false) {
        const log = document.getElementById('game-log');
        const entry = document.createElement('div');
        entry.className = 'log-entry';
        
        if (isPrivate) {
            entry.style.background = 'rgba(255, 107, 53, 0.1)';
            entry.style.border = '1px solid var(--accent)';
            entry.textContent = `🔒 ${message}`;
        } else {
            entry.textContent = message;
        }
        
        log.appendChild(entry);
        log.scrollTop = log.scrollHeight;
    }

    function rollDice(sides) {
        const result = Math.floor(Math.random() * sides) + 1;
        addLog(`🎲 Rolou D${sides}: ${result}`);
        return result;
    }

    function canPerformAction() {
        if (!gameState.roomId || !gameState.playerId) {
            addLog('❌ Entre em uma sala primeiro!');
            return false;
        }
        return true;
    }

    async function leaveRoom() {
        if (gameState.firebaseReady && gameState.roomId && gameState.playerId) {
            try {
                await window.firebase.remove(
                    window.firebase.ref(window.firebase.database, `rooms/${gameState.roomId}/players/${gameState.playerId}`)
                );
            } catch (error) {
                console.error("Erro ao sair:", error);
            }
        }

        // Resetar estado
        gameState.roomId = null;
        gameState.playerId = null;
        gameState.isHost = false;
        gameState.currentRoom = null;
        gameState.inventory = [];
        gameState.playerSkills = [];
        
        // Resetar UI
        document.getElementById('room-management').style.display = 'none';
        document.getElementById('host-controls').style.display = 'none';
        document.getElementById('assassin-powers').style.display = 'none';
        document.getElementById('weather-event').style.display = 'none';
        document.getElementById('advanced-craft').style.display = 'none';
        document.getElementById('survival-craft').style.display = 'none';
        
        updateInventoryDisplay();
        updateSkillsDisplay();
        addLog('🚪 Você saiu da sala');
        
        // Voltar para aba de salas
        document.querySelector('.menu-btn[data-tab="rooms"]').click();
    }

    // Funções Globais
    window.removeItem = async function(index) {
        if (index >= 0 && index < gameState.inventory.length) {
            const removedItem = gameState.inventory.splice(index, 1)[0];
            
            if (gameState.firebaseReady && gameState.roomId && gameState.playerId) {
                try {
                    await window.firebase.set(
                        window.firebase.ref(window.firebase.database, `rooms/${gameState.roomId}/players/${gameState.playerId}/inventory`),
                        gameState.inventory
                    );
                } catch (error) {
                    console.error("Erro:", error);
                }
            }
            
            updateInventoryDisplay();
            addLog(`🗑️ Descarta: ${removedItem.emoji} ${removedItem.name}`);
        }
    };

    window.useItem = async function(index) {
        if (index >= 0 && index < gameState.inventory.length) {
            const item = gameState.inventory[index];
            addLog(`🔧 Usou: ${item.emoji} ${item.name}`);
            
            gameState.inventory.splice(index, 1);
            
            if (gameState.firebaseReady && gameState.roomId && gameState.playerId) {
                try {
                    await window.firebase.set(
                        window.firebase.ref(window.firebase.database, `rooms/${gameState.roomId}/players/${gameState.playerId}/inventory`),
                        gameState.inventory
                    );
                } catch (error) {
                    console.error("Erro:", error);
                }
            }
            
            updateInventoryDisplay();
        }
    };

    // Inicializar o jogo
    initializeGame();
});