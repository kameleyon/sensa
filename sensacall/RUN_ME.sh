#!/bin/bash

echo "======================================"
echo "       🌟 SENSACALL LAUNCHER 🌟      "
echo "======================================"
echo ""
echo "Choose how to run SensaCall:"
echo ""
echo "1) Open standalone HTML app (no server needed)"
echo "2) Run with integrated server (full features)"
echo "3) Run backend TypeScript server"
echo ""
read -p "Enter your choice (1-3, default is 1): " choice

case ${choice:-1} in
    1)
        echo "Opening SensaCall standalone app..."
        if [[ "$OSTYPE" == "linux-gnu"* ]]; then
            xdg-open sensacall-app.html 2>/dev/null || echo "Please open sensacall-app.html in your browser"
        elif [[ "$OSTYPE" == "darwin"* ]]; then
            open sensacall-app.html
        elif [[ "$OSTYPE" == "cygwin" ]] || [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
            start sensacall-app.html
        else
            echo "Please open sensacall-app.html in your browser"
        fi
        echo ""
        echo "✅ SensaCall is ready!"
        echo "If the browser didn't open, manually open: sensacall-app.html"
        ;;
    2)
        echo "Starting integrated server..."
        if ! command -v node &> /dev/null; then
            echo "❌ Node.js is not installed. Please install Node.js first."
            exit 1
        fi
        node integrated-server.js
        ;;
    3)
        echo "Starting TypeScript backend..."
        cd backend
        npm run dev
        ;;
    *)
        echo "Invalid choice. Opening standalone app..."
        xdg-open sensacall-app.html 2>/dev/null || open sensacall-app.html 2>/dev/null || start sensacall-app.html 2>/dev/null || echo "Please open sensacall-app.html in your browser"
        ;;
esac