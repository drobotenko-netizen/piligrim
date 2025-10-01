#!/usr/bin/env node
// Split docs/iiko-api.md into multiple section files under docs/iiko-api/

const fs = require('fs')
const path = require('path')

const SRC = path.resolve(__dirname, '..', 'docs', 'iiko-api.md')
const OUT_DIR = path.resolve(__dirname, '..', 'docs', 'iiko-api')

/** Heuristic: a line is a section title if it's a single line, short, no markdown markers,
 * and followed by typical API doc content within the next few lines.
 */
function isLikelyTitle(line) {
  const s = line.trim()
  if (!s) return false
  if (s.startsWith('#') || s.startsWith('[') || s.startsWith('*') || s.startsWith('-')) return false
  if (/^https?:\/\//i.test(s)) return false
  if (s.length > 120 || s.length < 3) return false
  // avoid common non-titles
  const blacklist = ['JSON', 'XML', 'Код', 'Код ', 'Результат', 'Запрос', 'Параметры', 'Параметр', 'Поле', 'Пример', 'Тело запроса', 'Ответ', 'Information', 'Warning']
  if (blacklist.some(w => s.toLowerCase() === w.toLowerCase())) return false
  return true
}

function looksLikeSection(lines, idx) {
  // look ahead a few lines to see API markers
  for (let j = idx + 1; j < Math.min(lines.length, idx + 8); j++) {
    const t = lines[j].trim()
    if (!t) continue
    if (/^(Версия iiko:|GET Request|POST Request|DELETE Request|Что в ответе|Тело запроса|Описание полей|Параметры запроса)/i.test(t)) {
      return true
    }
  }
  return false
}

function pad(n, w = 2) { return String(n).padStart(w, '0') }

function main() {
  if (!fs.existsSync(SRC)) {
    console.error('Source not found:', SRC)
    process.exit(1)
  }
  const content = fs.readFileSync(SRC, 'utf8')
  const lines = content.split(/\r?\n/)

  const sections = []
  // Initial overview from start until first detected section
  let i = 0
  // capture initial H1 as overview title
  let overviewTitle = lines[0]?.replace(/^#\s*/, '').trim() || 'iiko API'
  let start = 0
  // find first section boundary
  for (i = 1; i < lines.length; i++) {
    if (isLikelyTitle(lines[i]) && looksLikeSection(lines, i)) {
      // push overview before i
      const block = lines.slice(start, i)
      sections.push({ title: overviewTitle || 'Обзор', start, end: i, lines: block })
      break
    }
  }
  if (sections.length === 0) {
    // nothing found, dump as one file
    sections.push({ title: overviewTitle, start: 0, end: lines.length, lines })
  } else {
    // continue extracting further sections
    let currentStart = i
    let currentTitle = lines[i].trim()
    for (let k = i + 1; k < lines.length; k++) {
      if (isLikelyTitle(lines[k]) && looksLikeSection(lines, k)) {
        // close previous section at k
        const block = lines.slice(currentStart, k)
        sections.push({ title: currentTitle, start: currentStart, end: k, lines: block })
        currentStart = k
        currentTitle = lines[k].trim()
      }
    }
    // tail
    if (currentStart < lines.length) {
      sections.push({ title: currentTitle, start: currentStart, end: lines.length, lines: lines.slice(currentStart) })
    }
  }

  // ensure out dir
  fs.mkdirSync(OUT_DIR, { recursive: true })

  // write files
  const indexLines = ['# iiko API — разделы', '', `Источник: ${lines.find(l => l.startsWith('Источник:'))?.replace('Источник: ', '') || ''}`, '']
  let counter = 0
  for (const sec of sections) {
    const idx = pad(++counter, 2)
    const safeName = sec.title.replace(/[\/:*?"<>|]/g, '_').trim()
    const file = path.join(OUT_DIR, `${idx} ${safeName}.md`)
    const out = []
    if (!sec.lines[0]?.startsWith('##')) out.push(`## ${sec.title}`)
    out.push('')
    out.push(...sec.lines)
    fs.writeFileSync(file, out.join('\n'), 'utf8')
    indexLines.push(`- [${sec.title}](./${path.basename(file)})`)
  }
  fs.writeFileSync(path.join(OUT_DIR, 'index.md'), indexLines.join('\n'), 'utf8')
  console.log(`Split into ${sections.length} files at ${OUT_DIR}`)
}

main()



