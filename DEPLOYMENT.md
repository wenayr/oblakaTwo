# Инструкции по развертыванию Облака AI

## 🎯 Быстрый старт на сервере

### Сервер: 92.242.61.121
- **Логин**: root
- **Пароль**: S84RmJjvKHtMpUOc

### Команды для развертывания

```bash
# 1. Подключение к серверу
ssh root@92.242.61.121

# 2. Переход в директорию проекта
cd /opt/oblaka-ai/

# 3. Обновление кода (если нужно)
git pull origin master

# 4. Запуск развертывания
chmod +x scripts/deployment/deploy.sh
./scripts/deployment/deploy.sh
```

## 🔧 Ручное развертывание

### 1. Подготовка сервера

```bash
# Установка Docker (если не установлен)
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Установка Docker Compose
sudo apt update
sudo apt install docker-compose-plugin
```

### 2. Настройка проекта

```bash
# Клонирование репозитория
git clone https://wenayr:TOKEN@github.com/wenayr/oblakaTwo.git
cd oblakaTwo

# Создание .env файла
cat > .env << EOF
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_API_KEY2=your_openai_backup_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_API_KEY2=your_gemini_backup_api_key_here
GEMINI_MODEL=gemini-1.5-flash-latest
EOF
```

### 3. Сборка и запуск

```bash
# Сборка образов
docker compose build

# Запуск сервисов
docker compose up -d

# Проверка статуса
docker compose ps
```

## 🔍 Проверка работы

### После развертывания проверьте:

1. **Статус контейнеров**
   ```bash
   docker compose ps
   ```

2. **Логи сервисов**
   ```bash
   docker compose logs backend
   docker compose logs frontend
   ```

3. **Доступность сервисов**
   ```bash
   # Backend health check
   curl http://localhost:8000/health
   
   # Frontend
   curl http://localhost/
   ```

4. **Веб-интерфейс**
   - Откройте в браузере: `http://92.242.61.121`
   - Проверьте статус подключения (должно быть "Подключено")
   - Протестируйте отправку сообщения

## 🛠️ Управление сервисами

### Основные команды

```bash
# Запуск
docker compose up -d

# Остановка
docker compose down

# Перезапуск
docker compose restart

# Просмотр логов
docker compose logs -f

# Обновление образов
docker compose pull
docker compose up -d
```

### Обновление приложения

```bash
# 1. Остановка сервисов
docker compose down

# 2. Обновление кода
git pull origin master

# 3. Пересборка образов
docker compose build

# 4. Запуск обновленных сервисов
docker compose up -d
```

## 🚨 Устранение неполадок

### Проблема: Контейнеры не запускаются

```bash
# Проверка логов
docker compose logs

# Проверка портов
netstat -tlnp | grep :80
netstat -tlnp | grep :8000

# Освобождение портов (если заняты)
sudo fuser -k 80/tcp
sudo fuser -k 8000/tcp
```

### Проблема: API ключи не работают

1. Проверьте .env файл
2. Убедитесь, что ключи корректные
3. Проверьте логи backend: `docker compose logs backend`

### Проблема: Frontend не подключается к backend

1. Проверьте, что backend запущен: `curl http://localhost:8000/health`
2. Проверьте сетевые настройки Docker
3. Перезапустите сервисы: `docker compose restart`

## 📊 Мониторинг

### Проверка состояния системы

```bash
# Использование ресурсов
docker stats

# Дисковое пространство
df -h

# Память
free -h

# Процессы
top
```

### Логирование

Логи сохраняются в:
- Backend: `docker compose logs backend`
- Frontend: `docker compose logs frontend`

## 🔄 Автоматическое обновление

Создайте cron задачу для автоматического обновления:

```bash
# Редактирование crontab
crontab -e

# Добавьте строку для обновления каждую ночь в 2:00
0 2 * * * cd /opt/oblaka-ai && git pull && docker compose up -d --build
```

## 🎉 Готово!

После успешного развертывания:

- **Frontend**: http://92.242.61.121
- **Backend API**: http://92.242.61.121:8000
- **Health Check**: http://92.242.61.121:8000/health

Приложение готово к использованию!

