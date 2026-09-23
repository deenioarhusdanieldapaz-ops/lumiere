#!/data/data/com.termux/files/usr/bin/bash
# Uso: ./set-splash.sh 3000
if [ -z "$1" ]; then
  echo "Uso: ./set-splash.sh <ms>"
  echo "Exemplo: ./set-splash.sh 3000"
  exit 1
fi
sed -i "s/const MIN_VISIBLE = [0-9]*;/const MIN_VISIBLE = $1;/" js/splash.js
echo "MIN_VISIBLE = $1 ms"
grep -n "MIN_VISIBLE" js/splash.js
