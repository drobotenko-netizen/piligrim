#!/bin/bash

# Исправить все файлы с неправильными импортами getApiBase

# 1. Исправить неправильные пути импорта
find client/src -name "*.tsx" -o -name "*.ts" | xargs sed -i '' 's/from '\''..\/..\/lib\/api'\''/from '\''@\/lib\/api'\''/g'

# 2. Исправить неправильный порядок импортов (getApiBase должен быть после других импортов)
find client/src -name "*.tsx" -o -name "*.ts" | xargs sed -i '' 's/^import { getApiBase } from '\''@\/lib\/api'\''$/\/\/ getApiBase import moved below/g'

# 3. Исправить неправильное размещение 'use client'
find client/src -name "*.tsx" -o -name "*.ts" | xargs sed -i '' '/^import { getApiBase } from '\''@\/lib\/api'\''/,/^'\''use client'\''/{
  /^import { getApiBase } from '\''@\/lib\/api'\''/{
    N
    s/^import { getApiBase } from '\''@\/lib\/api'\''\n'\''use client'\''/'\''use client'\''\n\nimport { getApiBase } from '\''@\/lib\/api'\''/
  }
}'

# 4. Добавить правильный импорт getApiBase в конец блока импортов для файлов, которые используют getApiBase()
find client/src -name "*.tsx" -o -name "*.ts" | xargs grep -l "getApiBase()" | while read file; do
  if ! grep -q "import.*getApiBase" "$file"; then
    # Найти последний импорт и добавить getApiBase после него
    sed -i '' '/^import.*from.*$/a\
import { getApiBase } from '\''@\/lib\/api'\''
' "$file"
  fi
done

echo "Done!"

