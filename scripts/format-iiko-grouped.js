#!/usr/bin/env node
// Add front-matter, normalize H1, and build internal TOC for grouped docs

const fs = require('fs')
const path = require('path')

const DIR = path.resolve(__dirname, '..', 'docs', 'iiko-api-grouped')
const SOURCE_URL = 'https://ru.iiko.help/articles/#!api-documentations/iikoserver-api'

function slugify(s) {
  return String(s).toLowerCase()
    .replace(/[^a-zа-я0-9\s-_]/gi, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function buildToc(lines) {
  const toc = []
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim()
    if (!t) continue
    if (/^(GET Request|POST Request|DELETE Request)\b/i.test(t)) {
      const text = t.replace(/\s+/g, ' ').trim()
      const slug = slugify(text)
      toc.push(`- [${text}](#${slug})`)
      continue
    }
    if (/^Версия iiko:/i.test(t)) {
      const text = t
      const slug = slugify(text)
      toc.push(`- [${text}](#${slug})`)
      continue
    }
    if (/^(Параметры запроса|Что в ответе|Тело запроса|Описание полей|Пример(ы)?(\s|$))/i.test(t)) {
      const text = t
      const slug = slugify(text)
      toc.push(`- [${text}](#${slug})`)
    }
  }
  // dedup while preserving order
  const seen = new Set()
  return toc.filter(x => { if (seen.has(x)) return false; seen.add(x); return true })
}

function ensureAnchors(lines) {
  // Convert key markers into markdown headings so anchors work in most viewers
  const out = []
  for (const line of lines) {
    const t = line.trim()
    if (/^(GET Request|POST Request|DELETE Request)\b/i.test(t)) {
      out.push(`### ${t}`)
      continue
    }
    if (/^Версия iiko:/i.test(t)) {
      out.push(`### ${t}`)
      continue
    }
    if (/^(Параметры запроса|Что в ответе|Тело запроса|Описание полей|Пример(ы)?(\s|$))/i.test(t)) {
      out.push(`#### ${t}`)
      continue
    }
    out.push(line)
  }
  return out
}

function main() {
  if (!fs.existsSync(DIR)) {
    console.error('Directory not found:', DIR)
    process.exit(1)
  }
  const files = fs.readdirSync(DIR).filter(f => f.endsWith('.md'))
  for (const f of files) {
    const p = path.join(DIR, f)
    const raw = fs.readFileSync(p, 'utf8')
    const lines = raw.split(/\r?\n/)
    // Extract or set title
    let title = ''
    if (lines[0].startsWith('# ')) {
      title = lines[0].slice(2).trim()
    } else if (lines[0].startsWith('---')) {
      // front-matter exists — keep title detection below
      const idx = lines.findIndex(l => l.startsWith('# '))
      if (idx >= 0) title = lines[idx].slice(2).trim()
    }
    if (!title) title = path.basename(f, '.md')

    const bodyStart = lines.findIndex(l => l.startsWith('# '))
    const body = bodyStart >= 0 ? lines.slice(bodyStart + 1) : lines
    const withAnchors = ensureAnchors(body)
    const toc = buildToc(withAnchors)

    const fm = [
      '---',
      `title: ${title}`,
      `source: ${SOURCE_URL}`,
      `generated: ${new Date().toISOString()}`,
      '---',
      ''
    ]
    const header = [`# ${title}`, '', '## Оглавление', '', ...toc, '', '---', '']
    const out = [...fm, ...header, ...withAnchors].join('\n').replace(/\n{3,}/g, '\n\n')
    fs.writeFileSync(p, out, 'utf8')
  }
  console.log(`Formatted ${files.length} files in ${DIR}`)
}

main()



