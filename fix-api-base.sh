#!/bin/bash

# Найти все файлы с localhost:4000 и заменить на использование getApiBase()
find client/src -name "*.tsx" -o -name "*.ts" | xargs grep -l "localhost:4000" | while read file; do
  echo "Fixing $file..."
  
  # Заменить строки с localhost:4000 на использование getApiBase()
  sed -i '' 's/const API_BASE = process\.env\.NEXT_PUBLIC_API_BASE || '\''http:\/\/localhost:4000'\''/const API_BASE = getApiBase()/g' "$file"
  
  # Добавить импорт getApiBase если его нет
  if ! grep -q "import.*getApiBase" "$file"; then
    if grep -q "getApiBase()" "$file"; then
      # Найти строку с импортом и добавить getApiBase
      sed -i '' '/^import.*from.*lib/ s/$/; import { getApiBase } from '\''..\/..\/lib\/api'\''/' "$file"
      # Если нет импорта из lib, добавить новый
      if ! grep -q "import.*getApiBase" "$file"; then
        sed -i '' '1i\
import { getApiBase } from '\''..\/..\/lib\/api'\''
' "$file"
      fi
    fi
  fi
done

echo "Done!"
