#!/bin/bash

# Останавливаем и удаляем старые контейнеры
docker-compose down

# Собираем новые образы
docker-compose build

# Запускаем контейнеры
docker-compose up -d

echo "Развертывание завершено!"

