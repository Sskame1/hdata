# Как собрать Android приложение

## Предварительные требования

1. Установить Android Studio: https://developer.android.com/studio
2. Установить Node.js: https://nodejs.org
3. Установить Java JDK 17: https://adoptium.net

## Установка зависимостей

```bash
cd frontend
npm install
npm install @capacitor/core @capacitor/cli @capacitor/android
```

## Команды

### 1. development mode (не для продакшена)

```bash
npm run dev
```
Запускает Next.js в режиме разработки (порт 3000).

### 2. Сборка для продакшена

```bash
npm run build
```
Создает статические файлы в папке `out/`.

### 3. Синхронизация с Android

```bash
npm run cap:sync
# или
npx cap sync
```
Копирует веб-ассеты в Android проект.

### 4. Добавление Android платформы (однократно)

```bash
npx cap add android
```

### 5. Открытие в Android Studio

```bash
npm run cap:android
# или
npx cap open android
```

### 6. Полная сборка

```bash
npm run cap:build
```
Выполняет: build + cap sync

## Запуск на эмуляторе

### Способ 1: Через Android Studio

1. Открыть проект:
   ```bash
   npm run cap:android
   ```

2. В Android Studio:
   - Запустить AVD Manager (Tools → AVD Manager)
   - Создать или запустить эмулятор
   - Нажать Run (Shift+F10)

### Способ 2: Через командную строку

1. Запустить эмулятор:
   ```bash
   $ANDROID_HOME/emulator/emulator -avd <avd_name>
   # Пример:
   $ANDROID_HOME/emulator/emulator -avd Pixel_8_API_34
   ```

2. Установить APK:
   ```bash
   adb install android/app/build/outputs/apk/debug/app-debug.apk
   ```

## Доступ к бэкенду

По умолчанию эмулятор Android обращается к `localhost` хост-машины через адрес:

```
10.0.2.2
```

Измените API_URL в файле `frontend/app/page.tsx`:

```typescript
const API_URL = "http://10.0.2.2:3001";
```

## Структура проекта

```
frontend/
├── android/           # Нативный Android проект
├── out/              # Скомпилированные веб-файлы
├── capacitor.config.ts # Конфиг Capacitor
└── package.json      # Зависимости
```

## Устранение проблем

### Ошибка: minSdkVersion

Отредактировать `android/app/build.gradle`:
```groovy
minSdkVersion 22
```

### Ошибка: не запускается эмулятор

Запустить через Android Studio или проверить что Android SDK установлен корректно.

### Ошибка: CORS

Бэкенд должен разрешать CORS для `http://10.0.2.2`.

Проверьте `backend/src/main.ts`:
```typescript
app.enableCors({
  origin: 'http://localhost:3000',
  credentials: true,
});
```

Добавьте адрес эмулятора:
```typescript
app.enableCors({
  origin: ['http://localhost:3000', 'http://10.0.2.2:3000'],
  credentials: true,
});
```