from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import OpenAI
import google.generativeai as genai
import os
from typing import Optional, List
import logging
import asyncio
import traceback
from dotenv import load_dotenv

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Загружаем переменные окружения из .env файла
env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), '.env')
load_dotenv(dotenv_path=env_path)
logger.info(f"Загружаем .env из: {env_path}")
logger.info(f"OPENAI_API_KEY установлен: {bool(os.getenv('OPENAI_API_KEY'))}")
logger.info(f"GEMINI_API_KEY установлен: {bool(os.getenv('GEMINI_API_KEY'))}")

app = FastAPI(
    title="Облака AI API",
    description="AI-сервис с поддержкой OpenAI и Gemini",
    version="1.0.0"
)

# Настройка CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Настройка API ключей
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_API_KEY2 = os.getenv("OPENAI_API_KEY2")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_API_KEY2 = os.getenv("GEMINI_API_KEY2")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-1.5-flash-latest")

# Инициализация OpenAI клиентов
openai_client = None
openai_client_backup = None

if OPENAI_API_KEY:
    try:
        openai_client = OpenAI(api_key=OPENAI_API_KEY)
        logger.info("OpenAI API инициализирован")
    except Exception as e:
        logger.error(f"Ошибка инициализации OpenAI: {e}")

if OPENAI_API_KEY2:
    try:
        openai_client_backup = OpenAI(api_key=OPENAI_API_KEY2)
        logger.info("OpenAI backup API инициализирован")
    except Exception as e:
        logger.error(f"Ошибка инициализации OpenAI backup: {e}")

# Инициализация Gemini
gemini_initialized = False
gemini_backup_initialized = False

if GEMINI_API_KEY:
    try:
        genai.configure(api_key=GEMINI_API_KEY)
        # Тестируем подключение
        model = genai.GenerativeModel(GEMINI_MODEL)
        test_response = model.generate_content("test")
        gemini_initialized = True
        logger.info("Gemini API инициализирован и протестирован")
    except Exception as e:
        logger.error(f"Ошибка инициализации Gemini: {e}")

# Модели данных
class ChatRequest(BaseModel):
    message: str
    model: str = "gemini"  # По умолчанию gemini, так как он работает
    max_tokens: Optional[int] = 1000
    temperature: Optional[float] = 0.7

class ChatResponse(BaseModel):
    response: str
    model_used: str
    tokens_used: Optional[int] = None

class HealthResponse(BaseModel):
    status: str
    openai_available: bool
    gemini_available: bool

# Основные endpoints
@app.get("/")
async def root():
    return {
        "message": "Добро пожаловать в Облака AI!",
        "version": "1.0.0",
        "description": "AI-сервис с поддержкой OpenAI и Gemini",
        "status": "running"
    }

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Проверка состояния сервиса и доступности AI моделей"""
    openai_available = openai_client is not None
    gemini_available = gemini_initialized
    
    logger.info(f"Health check: OpenAI={openai_available}, Gemini={gemini_available}")
    
    return HealthResponse(
        status="ok",
        openai_available=openai_available,
        gemini_available=gemini_available
    )

@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Основной endpoint для общения с AI"""
    try:
        logger.info(f"Получен запрос: model={request.model}, message_length={len(request.message)}")
        logger.debug(f"Сообщение: {request.message[:100]}...")
        
        if request.model == "openai":
            return await chat_with_openai(request)
        elif request.model == "gemini":
            return await chat_with_gemini(request)
        else:
            logger.warning(f"Неподдерживаемая модель: {request.model}")
            raise HTTPException(status_code=400, detail="Неподдерживаемая модель")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Ошибка в chat endpoint: {str(e)}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Ошибка обработки запроса: {str(e)}")

async def chat_with_openai(request: ChatRequest) -> ChatResponse:
    """Обработка запроса через OpenAI"""
    if not openai_client:
        logger.warning("OpenAI API недоступен")
        raise HTTPException(status_code=503, detail="OpenAI API недоступен")
    
    try:
        logger.info("Отправка запроса к OpenAI...")
        
        # Проверяем валидность параметров
        max_tokens = min(request.max_tokens or 1000, 4000)
        temperature = max(0.0, min(request.temperature or 0.7, 2.0))
        
        response = openai_client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "Ты полезный AI-ассистент. Отвечай на русском языке."},
                {"role": "user", "content": request.message}
            ],
            max_tokens=max_tokens,
            temperature=temperature
        )
        
        logger.info("Получен ответ от OpenAI")
        return ChatResponse(
            response=response.choices[0].message.content,
            model_used="OpenAI GPT-3.5",
            tokens_used=response.usage.total_tokens if response.usage else None
        )
    except Exception as e:
        logger.error(f"Ошибка OpenAI API: {str(e)}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        
        # Попробуем второй ключ
        if openai_client_backup:
            try:
                logger.info("Попытка использования backup OpenAI...")
                response = openai_client_backup.chat.completions.create(
                    model="gpt-3.5-turbo",
                    messages=[
                        {"role": "system", "content": "Ты полезный AI-ассистент. Отвечай на русском языке."},
                        {"role": "user", "content": request.message}
                    ],
                    max_tokens=max_tokens,
                    temperature=temperature
                )
                logger.info("Получен ответ от backup OpenAI")
                return ChatResponse(
                    response=response.choices[0].message.content,
                    model_used="OpenAI GPT-3.5 (backup)",
                    tokens_used=response.usage.total_tokens if response.usage else None
                )
            except Exception as e2:
                logger.error(f"Ошибка backup OpenAI API: {str(e2)}")
        
        raise HTTPException(status_code=503, detail=f"Ошибка OpenAI API: {str(e)}")

async def chat_with_gemini(request: ChatRequest) -> ChatResponse:
    """Обработка запроса через Gemini"""
    if not gemini_initialized:
        logger.warning("Gemini API недоступен")
        raise HTTPException(status_code=503, detail="Gemini API недоступен")
    
    try:
        logger.info("Отправка запроса к Gemini...")
        
        # Проверяем валидность параметров
        max_tokens = min(request.max_tokens or 1000, 8000)
        temperature = max(0.0, min(request.temperature or 0.7, 2.0))
        
        model = genai.GenerativeModel(GEMINI_MODEL)
        
        # Создаем конфигурацию генерации
        generation_config = genai.types.GenerationConfig(
            max_output_tokens=max_tokens,
            temperature=temperature,
        )
        
        response = model.generate_content(
            request.message,
            generation_config=generation_config
        )
        
        logger.info("Получен ответ от Gemini")
        
        # Проверяем, что ответ содержит текст
        if not response.text:
            logger.warning("Gemini вернул пустой ответ")
            raise Exception("Gemini вернул пустой ответ")
        
        return ChatResponse(
            response=response.text,
            model_used=f"Google {GEMINI_MODEL}",
            tokens_used=None  # Gemini не всегда предоставляет информацию о токенах
        )
    except Exception as e:
        logger.error(f"Ошибка Gemini API: {str(e)}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        
        # Попробуем второй ключ
        if GEMINI_API_KEY2 and not gemini_backup_initialized:
            try:
                logger.info("Попытка использования backup Gemini...")
                genai.configure(api_key=GEMINI_API_KEY2)
                model = genai.GenerativeModel(GEMINI_MODEL)
                response = model.generate_content(
                    request.message,
                    generation_config=genai.types.GenerationConfig(
                        max_output_tokens=max_tokens,
                        temperature=temperature,
                    )
                )
                
                if not response.text:
                    raise Exception("Gemini backup вернул пустой ответ")
                
                logger.info("Получен ответ от backup Gemini")
                return ChatResponse(
                    response=response.text,
                    model_used=f"Google {GEMINI_MODEL} (backup)",
                    tokens_used=None
                )
            except Exception as e2:
                logger.error(f"Ошибка backup Gemini API: {str(e2)}")
        
        raise HTTPException(status_code=503, detail=f"Ошибка Gemini API: {str(e)}")

@app.get("/models")
async def get_available_models():
    """Получить список доступных моделей"""
    models = []
    
    if openai_client:
        models.append({
            "id": "openai",
            "name": "OpenAI GPT-3.5",
            "description": "Мощная языковая модель от OpenAI",
            "available": True
        })
    
    if gemini_initialized:
        models.append({
            "id": "gemini",
            "name": f"Google {GEMINI_MODEL}",
            "description": "Современная модель от Google",
            "available": True
        })
    
    logger.info(f"Возвращаем {len(models)} доступных моделей")
    return {"models": models}

@app.get("/debug")
async def debug_info():
    """Отладочная информация"""
    return {
        "openai_key_set": bool(OPENAI_API_KEY),
        "openai_key2_set": bool(OPENAI_API_KEY2),
        "gemini_key_set": bool(GEMINI_API_KEY),
        "gemini_key2_set": bool(GEMINI_API_KEY2),
        "openai_client_initialized": openai_client is not None,
        "gemini_initialized": gemini_initialized,
        "gemini_model": GEMINI_MODEL
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

