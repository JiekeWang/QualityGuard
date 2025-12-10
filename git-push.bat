@echo off
echo ==========================================
echo Push to GitHub
echo ==========================================
echo.

echo Checking Git status...
git status
echo.

echo Adding all files...
git add .
echo.

echo Committing changes...
git commit -m "Add direct deployment scripts, fix Docker network issues, and add deployment documentation"
echo.

echo Pushing to GitHub...
git push origin main
echo.

if errorlevel 1 (
    echo.
    echo [ERROR] Push failed
    echo.
    echo Trying to set upstream...
    git push -u origin main
) else (
    echo.
    echo [SUCCESS] Pushed to GitHub successfully!
    echo.
)

pause

