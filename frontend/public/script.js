// Глобальные переменные
let messageCount = 0;
let totalTokens = 0;
let isLoading = false;

// DOM элементы
const chatMessages = document.getElementById('chatMessages');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const modelSelect = document.getElementById('modelSelect');
const statusIndicator = document.getElementById('statusIndicator');
const loadingModal = document.getElementById('loadingModal');
const temperatureSlider = document.getElementById('temperatureSlider');
const temperatureValue = document.getElementById('temperatureValue');
const wordCount = document.getElementById('wordCount');
const messageCountElement = document.getElementById('messageCount');
const tokenCountElement = document.getElementById('tokenCount');
const autoScrollCheckbox = document.getElementById('autoScroll');
const soundEnabledCheckbox = document.getElementById('soundEnabled');

// Инициализация
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    checkBackendStatus();
    loadAvailableModels();
});

function initializeApp() {
    // Автоматическое изменение размера textarea
    messageInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = this.scrollHeight + 'px';
        updateWordCount();
    });

    // Обновление значения температуры
    temperatureSlider.addEventListener('input', function() {
        temperatureValue.textContent = this.value;
    });

    // Загрузка настроек из localStorage
    loadSettings();
}

function setupEventListeners() {
    // Отправка сообщения
    sendButton.addEventListener('click', sendMessage);
    
    // Отправка по Enter (Shift+Enter для новой строки)
    messageInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // Сохранение настроек
    autoScrollCheckbox.addEventListener('change', saveSettings);
    soundEnabledCheckbox.addEventListener('change', saveSettings);
}
// Проверка статуса backend
async function checkBackendStatus() {
    try {
        console.log('Проверка статуса backend...');
        const response = await fetch('/api/health', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            timeout: 10000
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('Статус backend:', data);
        
        if (data.status === 'ok') {
            updateStatus('connected', `Подключено (OpenAI: ${data.openai_available ? '✓' : '✗'}, Gemini: ${data.gemini_available ? '✓' : '✗'})`);
        } else {
            updateStatus('error', 'Ошибка сервера');
        }
    } catch (error) {
        console.error('Ошибка проверки статуса:', error);
        updateStatus('error', `Ошибка подключения: ${error.message}`);
    }
}

async function loadAvailableModels() {
    try {
        const response = await fetch('/api/models');
        const data = await response.json();
        
        // Очищаем текущие опции
        modelSelect.innerHTML = '';
        
        // Добавляем доступные модели
        data.models.forEach(model => {
            const option = document.createElement('option');
            option.value = model.id;
            option.textContent = model.name;
            option.disabled = !model.available;
            modelSelect.appendChild(option);
        });
        
        if (data.models.length === 0) {
            const option = document.createElement('option');
            option.textContent = 'Модели недоступны';
            option.disabled = true;
            modelSelect.appendChild(option);
        }
    } catch (error) {
        console.error('Ошибка загрузки моделей:', error);
        const option = document.createElement('option');
        option.textContent = 'Ошибка загрузки моделей';
        option.disabled = true;
        modelSelect.appendChild(option);
    }
}

function updateStatusIndicator(status, text) {
    statusIndicator.className = `status-indicator ${status}`;
    statusIndicator.querySelector('span').textContent = text;
}

function updateModelInfo(healthData) {
    const modelInfo = document.getElementById('modelInfo');
    const openaiStatus = healthData.openai_available ? '✅' : '❌';
    const geminiStatus = healthData.gemini_available ? '✅' : '❌';
    
    modelInfo.innerHTML = `
        <i class="fas fa-info-circle"></i>
        <span>OpenAI: ${openaiStatus} | Gemini: ${geminiStatus}</span>
    `;
}

async function sendMessage() {
    const message = messageInput.value.trim();
    if (!message || isLoading) return;

    const selectedModel = modelSelect.value;
    const temperature = parseFloat(temperatureSlider.value);

    // Добавляем сообщение пользователя
    addMessage(message, 'user');
    
    // Очищаем поле ввода
    messageInput.value = '';
    messageInput.style.height = 'auto';
    updateWordCount();

    // Показываем индикатор загрузки
    showLoading(true);
    
    try {
        console.log('Отправка сообщения:', { message, selectedModel, temperature });
        
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: message,
                model: selectedModel,
                temperature: temperature,
                max_tokens: 1000
            }),
            timeout: 30000 // 30 секунд таймаут
        });

        console.log('Ответ сервера:', response.status, response.statusText);
        
        const data = await response.json();
        console.log('Данные ответа:', data);

        if (response.ok) {
            // Добавляем ответ AI
            addMessage(data.response, 'ai', data.model_used, data.tokens_used);
            
            // Обновляем статистику
            if (data.tokens_used) {
                totalTokens += data.tokens_used;
                updateStats();
            }

            // Воспроизводим звук уведомления
            if (soundEnabledCheckbox.checked) {
                playNotificationSound();
            }
        } else {
            // Улучшенная обработка ошибок
            let errorMessage = 'Неизвестная ошибка';
            if (data.error) {
                errorMessage = data.error;
                if (data.details) {
                    errorMessage += `: ${data.details}`;
                }
            } else if (data.detail) {
                errorMessage = data.detail;
            }
            console.error('Ошибка API:', errorMessage);
            addMessage(`Ошибка: ${errorMessage}`, 'error');
        }
    } catch (error) {
        console.error('Ошибка отправки сообщения:', error);
        let errorMessage = 'Ошибка подключения к серверу';
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            errorMessage = 'Не удается подключиться к серверу';
        } else if (error.message) {
            errorMessage = `Ошибка: ${error.message}`;
        }
        addMessage(errorMessage, 'error');
    } finally {
        showLoading(false);
    }
}

function addMessage(content, type, modelUsed = null, tokensUsed = null) {
    // Удаляем приветственное сообщение при первом сообщении
    const welcomeMessage = chatMessages.querySelector('.welcome-message');
    if (welcomeMessage && type === 'user') {
        welcomeMessage.remove();
    }

    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;

    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    
    if (type === 'user') {
        avatar.innerHTML = '<i class="fas fa-user"></i>';
        messageCount++;
        updateStats();
    } else if (type === 'ai') {
        avatar.innerHTML = '<i class="fas fa-robot"></i>';
    } else if (type === 'error') {
        avatar.innerHTML = '<i class="fas fa-exclamation-triangle"></i>';
        messageDiv.className = 'message ai'; // Используем стиль AI для ошибок
    }

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';

    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    bubble.textContent = content;

    const meta = document.createElement('div');
    meta.className = 'message-meta';
    
    const now = new Date();
    const timeString = now.toLocaleTimeString('ru-RU', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    
    if (type === 'ai' && modelUsed) {
        meta.textContent = `${timeString} • ${modelUsed}`;
        if (tokensUsed) {
            meta.textContent += ` • ${tokensUsed} токенов`;
        }
    } else if (type === 'error') {
        meta.textContent = `${timeString} • Ошибка`;
    } else {
        meta.textContent = timeString;
    }

    contentDiv.appendChild(bubble);
    contentDiv.appendChild(meta);
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(contentDiv);

    chatMessages.appendChild(messageDiv);

    // Автопрокрутка
    if (autoScrollCheckbox.checked) {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
}

function showLoading(show) {
    isLoading = show;
    sendButton.disabled = show;
    
    if (show) {
        loadingModal.classList.add('show');
    } else {
        loadingModal.classList.remove('show');
    }
}

function updateWordCount() {
    const count = messageInput.value.length;
    wordCount.textContent = `${count} символов`;
}

function updateStats() {
    messageCountElement.textContent = messageCount;
    tokenCountElement.textContent = totalTokens;
}

function sendExampleQuestion(question) {
    messageInput.value = question;
    messageInput.focus();
    // Автоматически отправляем вопрос
    setTimeout(() => {
        sendMessage();
    }, 100);
}

function clearChat() {
    if (confirm('Вы уверены, что хотите очистить чат?')) {
        chatMessages.innerHTML = `
            <div class="welcome-message">
                <div class="welcome-icon">
                    <i class="fas fa-robot"></i>
                </div>
                <h2>Добро пожаловать в Облака AI!</h2>
                <p>Я ваш умный ассистент. Задайте любой вопрос, и я помогу вам найти ответ.</p>
                <div class="example-questions">
                    <h3>Примеры вопросов:</h3>
                    <div class="example-item" onclick="sendExampleQuestion('Расскажи о последних новостях в области ИИ')">
                        <i class="fas fa-lightbulb"></i>
                        <span>Расскажи о последних новостях в области ИИ</span>
                    </div>
                    <div class="example-item" onclick="sendExampleQuestion('Помоги написать план презентации')">
                        <i class="fas fa-presentation"></i>
                        <span>Помоги написать план презентации</span>
                    </div>
                    <div class="example-item" onclick="sendExampleQuestion('Объясни сложную тему простыми словами')">
                        <i class="fas fa-graduation-cap"></i>
                        <span>Объясни сложную тему простыми словами</span>
                    </div>
                </div>
            </div>
        `;
        
        // Сброс статистики
        messageCount = 0;
        totalTokens = 0;
        updateStats();
    }
}

function exportChat() {
    const messages = chatMessages.querySelectorAll('.message');
    let chatText = 'Экспорт чата Облака AI\n';
    chatText += '='.repeat(30) + '\n\n';
    
    messages.forEach(message => {
        const isUser = message.classList.contains('user');
        const content = message.querySelector('.message-bubble').textContent;
        const meta = message.querySelector('.message-meta').textContent;
        
        chatText += `${isUser ? 'Пользователь' : 'AI'} (${meta}):\n`;
        chatText += `${content}\n\n`;
    });
    
    // Создаем и скачиваем файл
    const blob = new Blob([chatText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat_export_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function playNotificationSound() {
    // Создаем простой звуковой сигнал
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
    
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.2);
}

function saveSettings() {
    const settings = {
        autoScroll: autoScrollCheckbox.checked,
        soundEnabled: soundEnabledCheckbox.checked,
        temperature: temperatureSlider.value
    };
    localStorage.setItem('oblakaSettings', JSON.stringify(settings));
}

function loadSettings() {
    const savedSettings = localStorage.getItem('oblakaSettings');
    if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        autoScrollCheckbox.checked = settings.autoScroll !== false;
        soundEnabledCheckbox.checked = settings.soundEnabled || false;
        if (settings.temperature) {
            temperatureSlider.value = settings.temperature;
            temperatureValue.textContent = settings.temperature;
        }
    }
}

// Периодическая проверка статуса backend
setInterval(checkBackendStatus, 30000); // каждые 30 секунд

