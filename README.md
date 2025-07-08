# Облака AI - Умный ассистент

Полноценное AI-приложение с поддержкой OpenAI и Google Gemini API.

## 🚀 Возможности

- **Мультимодельная поддержка**: OpenAI GPT и Google Gemini
- **Современный веб-интерфейс**: Адаптивный дизайн с темной/светлой темой
- **Настройки креативности**: Регулировка температуры для AI ответов
- **Статистика использования**: Подсчет сообщений и токенов
- **Экспорт чатов**: Сохранение диалогов в файл
- **Резервные API ключи**: Автоматическое переключение при ошибках

## 🏗️ Архитектура

```
oblaka-ai/
├── backend/           # FastAPI сервер
│   ├── app/
│   │   ├── main.py   # Основное приложение
│   │   └── __init__.py
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/          # Node.js/Express сервер
│   ├── public/       # Статические файлы
│   │   ├── index.html
│   │   ├── styles.css
│   │   └── script.js
│   ├── server.js
│   ├── package.json
│   └── Dockerfile
├── scripts/
│   └── deployment/
│       └── deploy.sh
├── docker-compose.yml
├── .env
└── README.md
```

## 🛠️ Установка и запуск

### Локальная разработка

1. **Клонирование репозитория**
   ```bash
   git clone https://github.com/wenayr/oblakaTwo.git
   cd oblakaTwo
   ```

2. **Настройка переменных окружения**
   ```bash
   cp .env.example .env
   # Отредактируйте .env файл с вашими API ключами
   ```

3. **Запуск backend**
   ```bash
   cd backend
   pip install -r requirements.txt
   uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```

4. **Запуск frontend**
   ```bash
   cd frontend
   npm install
   npm start
   ```

### Docker развертывание

1. **Сборка и запуск**
   ```bash
   docker compose build
   docker compose up -d
   ```

2. **Проверка статуса**
   ```bash
   docker compose ps
   docker compose logs
   ```

### Развертывание на сервере

1. **Подключение к серверу**
   ```bash
   ssh root@92.242.61.121
   # Пароль: S84RmJjvKHtMpUOc
   ```

2. **Развертывание**
   ```bash
   cd /opt/oblaka-ai/
   chmod +x scripts/deployment/deploy.sh
   ./scripts/deployment/deploy.sh
   ```

## 🔧 Конфигурация

### Переменные окружения (.env)

```env
# OpenAI API ключи
OPENAI_API_KEY=your_openai_key_here
OPENAI_API_KEY2=your_backup_openai_key_here

# Google Gemini API ключи
GEMINI_API_KEY=your_gemini_key_here
GEMINI_API_KEY2=your_backup_gemini_key_here
GEMINI_MODEL=gemini-1.5-flash-latest
```

### Порты

- **Frontend**: 80 (в Docker) / 3000 (локально)
- **Backend**: 8000

## 📡 API Endpoints

### Backend API

- `GET /` - Информация о сервисе
- `GET /health` - Проверка состояния
- `GET /models` - Список доступных моделей
- `POST /chat` - Отправка сообщения AI

### Frontend API (Proxy)

- `GET /api/health` - Проксирование к backend
- `GET /api/models` - Проксирование к backend
- `POST /api/chat` - Проксирование к backend

## 🧪 Тестирование

### Проверка backend

```bash
# Проверка здоровья
curl http://localhost:8000/health

# Тест чата с Gemini
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Привет!", "model": "gemini"}'
```

### Проверка frontend

```bash
# Проверка главной страницы
curl http://localhost:3000/

# Проверка API проксирования
curl http://localhost:3000/api/health
```

## 🚀 Статус готовности

### ✅ Готово к продакшену

- [x] Backend с AI интеграцией
- [x] Современный frontend интерфейс
- [x] Docker конфигурация
- [x] Система развертывания
- [x] Обработка ошибок
- [x] Резервные API ключи
- [x] Логирование
- [x] Безопасность (пользователи в контейнерах)
- [x] Health checks
- [x] CORS настройки

### ⚠️ Известные ограничения

- OpenAI API требует доступ к модели GPT-3.5-turbo
- Gemini API работает стабильно
- Docker может требовать дополнительной настройки iptables

## 🔒 Безопасность

- API ключи хранятся в переменных окружения
- Контейнеры запускаются от непривилегированных пользователей
- CORS настроен для безопасного взаимодействия
- Логирование для мониторинга

## 📊 Мониторинг

- Health checks для контейнеров
- Логирование всех запросов
- Статистика использования в интерфейсе
- Автоматический restart при сбоях

## 🤝 Поддержка

При возникновении проблем:

1. Проверьте логи: `docker compose logs`
2. Проверьте статус: `docker compose ps`
3. Перезапустите: `docker compose restart`

## 📝 Лицензия

MIT License

---

**Облака AI** - готовое к продакшену AI-приложение с современным интерфейсом и надежной архитектурой.

