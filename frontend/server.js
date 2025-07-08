const express = require('express');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Определяем backend URL в зависимости от окружения
const BACKEND_URL = process.env.BACKEND_URL || 'http://127.0.0.1:8000';

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Настройка axios с таймаутами
const apiClient = axios.create({
    baseURL: BACKEND_URL,
    timeout: 30000, // 30 секунд
    headers: {
        'Content-Type': 'application/json'
    }
});

// Логирование запросов
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// API Routes - проксирование к backend
app.get('/api/health', async (req, res) => {
    try {
        console.log('Проверка health backend...');
        const response = await apiClient.get('/health');
        res.json(response.data);
    } catch (error) {
        console.error('Ошибка health check:', error.message);
        res.status(500).json({ 
            error: 'Ошибка подключения к backend',
            details: error.message 
        });
    }
});

app.get('/api/models', async (req, res) => {
    try {
        console.log('Получение списка моделей...');
        const response = await apiClient.get('/models');
        res.json(response.data);
    } catch (error) {
        console.error('Ошибка получения моделей:', error.message);
        res.status(500).json({ 
            error: 'Ошибка получения моделей',
            details: error.message 
        });
    }
});

app.post('/api/chat', async (req, res) => {
    try {
        console.log('Отправка chat запроса:', req.body);
        const response = await apiClient.post('/chat', req.body);
        console.log('Получен ответ от backend');
        res.json(response.data);
    } catch (error) {
        console.error('Ошибка chat запроса:', error.message);
        
        // Более детальная обработка ошибок
        if (error.response) {
            // Backend ответил с ошибкой
            res.status(error.response.status).json({
                error: 'Ошибка обработки запроса',
                details: error.response.data?.detail || error.message
            });
        } else if (error.request) {
            // Запрос был отправлен, но ответа не получено
            res.status(503).json({
                error: 'Backend недоступен',
                details: 'Не удалось подключиться к AI сервису'
            });
        } else {
            // Ошибка в настройке запроса
            res.status(500).json({
                error: 'Ошибка запроса',
                details: error.message
            });
        }
    }
});

// Главная страница
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Обработка 404
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint не найден' });
});

// Обработка ошибок
app.use((error, req, res, next) => {
    console.error('Серверная ошибка:', error);
    res.status(500).json({ 
        error: 'Внутренняя ошибка сервера',
        details: error.message 
    });
});

// Запуск сервера
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Frontend сервер запущен на порту ${PORT}`);
    console.log(`Backend URL: ${BACKEND_URL}`);
    console.log(`Доступен по адресу: http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('Получен SIGTERM, завершение работы...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('Получен SIGINT, завершение работы...');
    process.exit(0);
});

