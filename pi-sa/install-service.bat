@echo off
chcp 65001 >nul
echo ==========================================
echo   π死循环服务安装程序
echo ==========================================
echo.

:: 设置路径
set "INSTALL_DIR=%USERPROFILE%\pi-daemon"
set "SCRIPT_DIR=%~dp0"

:: 创建安装目录
echo [1/4] 创建安装目录...
if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%"
copy /Y "%SCRIPT_DIR%\pi-core-sa.js" "%INSTALL_DIR%\" >nul
copy /Y "%SCRIPT_DIR%\pi-daemon.js" "%INSTALL_DIR%\" >nul
echo       完成: %INSTALL_DIR%
echo.

:: 创建启动脚本
echo [2/4] 创建启动脚本...
(
echo @echo off
echo chcp 65001 ^>nul
echo cd /d "%INSTALL_DIR%"
echo echo 启动π死循环服务...
echo node pi-daemon.js
echo pause
) > "%INSTALL_DIR%\start.bat"
echo       完成: start.bat
echo.

:: 创建Windows任务计划
echo [3/4] 创建开机启动任务...
schtasks /create /tn "PiDeadLoopService" /tr "node '%INSTALL_DIR%\pi-daemon.js'" /sc onstart /ru SYSTEM /f >nul 2>&1
if %errorlevel% == 0 (
    echo       完成: 已添加到开机启动
) else (
    echo       警告: 需要管理员权限才能创建系统任务
    echo       请右键以管理员身份运行此脚本
)
echo.

:: 立即启动
echo [4/4] 启动服务...
start /min cmd /c "cd /d "%INSTALL_DIR%" && node pi-daemon.js"
echo       完成: 服务已启动
echo.

echo ==========================================
echo   安装完成！
echo   安装目录: %INSTALL_DIR%
echo   日志文件: %INSTALL_DIR%\pi-daemon.log
echo   启动脚本: %INSTALL_DIR%\start.bat
echo ==========================================
pause
