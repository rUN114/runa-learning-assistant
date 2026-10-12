@echo off
chcp 65001 >nul
echo Runa学习助手
echo.
echo 即将打开插件文件夹与 Edge 扩展管理页。
echo 打开“开发人员模式”，点击“加载解压缩的扩展”。
echo 选择下方这个文件夹，里面应能看到 manifest.json：
echo %~dp0
echo.
start "" explorer.exe "%~dp0."
if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
  start "" "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" "edge://extensions"
) else (
  start "" msedge.exe "edge://extensions"
)
echo 安装后在设置页填写自己的 Key，不需要搜题酱登录。
pause
