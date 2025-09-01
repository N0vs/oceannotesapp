@echo off
echo Parando servidor Next.js...
taskkill /f /im node.exe 2>nul
timeout /t 2 /nobreak >nul

echo Limpando cache do Next.js...
rmdir /s /q .next 2>nul

echo Reiniciando servidor...
npm run dev
