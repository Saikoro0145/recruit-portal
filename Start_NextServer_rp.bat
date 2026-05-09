setlocal
@if not "%~0"=="%~dp0.\%~nx0" start /min cmd /c,"%~dp0.\%~nx0" %* & goto :eof

cd /d "%~dp0"
npm run start

exit 0
