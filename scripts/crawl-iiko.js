#!/usr/bin/env node
/*
  Crawl iiko Help (API docs) and save as a single Markdown file.
  Target: https://ru.iiko.help/articles/#!api-documentations/iikoserver-api
  Note: Site is JS-driven, so we use Puppeteer to render pages.
*/

const fs = require('fs')
const path = require('path')
const { mkdirSync, writeFileSync } = fs
const puppeteer = require('puppeteer')

const START_URL = process.env.IIKO_START_URL || 'https://ru.iiko.help/articles/#!api-documentations/iikoserver-api'
const OUTPUT = process.env.IIKO_OUTPUT || path.resolve(__dirname, '..', 'docs', 'iiko-api.md')
const ORIGIN = new URL(START_URL).origin

function normalizeUrl(href) {
  if (!href) return null
  // Handle hashbang routes like #!api-documentations/...
  if (href.startsWith('#!')) {
    return `${ORIGIN}/articles/${href}`
  }
  if (href.startsWith('/#!')) {
    return `${ORIGIN}/articles/${href.slice(1)}`
  }
  try {
    const url = new URL(href, ORIGIN)
    return url.href
  } catch { return null }
}

function isDocUrl(u) {
  if (!u) return false
  if (!u.startsWith(ORIGIN)) return false
  // Keep only help portal API documentation pages
  return u.includes('/articles/#!api-documentations/')
}

async function extractContent(target) {
  // Wait for network to calm down and try to expand page content if possible
  if (typeof target.waitForNetworkIdle === 'function') {
    try { await target.waitForNetworkIdle({ timeout: 15000 }) } catch {}
  }
  // Try expanding controls if exist (RU labels)
  try {
    await target.evaluate(() => {
      const clickByText = (txts) => {
        const els = Array.from(document.querySelectorAll('button, a, span, div'))
        for (const t of txts) {
          const el = els.find(e => (e.textContent || '').trim() === t)
          if (el) { (el).dispatchEvent(new MouseEvent('click', { bubbles: true })) }
        }
      }
      clickByText(['Показать страницы', 'Раскрыть все'])
    })
    try { await target.waitForTimeout(500) } catch {}
  } catch {}
  // Best-effort: try some likely containers, else take body
  return target.evaluate(() => {
    function pick(...selectors) {
      for (const s of selectors) {
        const el = document.querySelector(s)
        if (el) return el
      }
      return document.body
    }
    const container = pick('#content', '.content', '.article-content', '[role="main"]', 'main', '#MainContent', 'body')
    const title = (document.querySelector('h1')?.innerText || document.title || '').trim()
    let text = container.innerText || ''
    if (!text || text.trim().length < 200) {
      // fallback: strip HTML tags
      const html = container.innerHTML || document.documentElement.innerHTML
      text = html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()
    }
    return { title, text }
  })
}

async function crawl() {
  const browser = await puppeteer.launch({ headless: 'new' })
  try {
    const page = await browser.newPage()
    await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36')
    const visited = new Set()
    const queue = [START_URL]
    const pages = []
    const MAX_PAGES = Number(process.env.IIKO_MAX_PAGES || 1000)

    while (queue.length && pages.length < MAX_PAGES) {
      const url = queue.shift()
      if (!url || visited.has(url)) continue
      visited.add(url)

      try {
        // Prefer SPA navigation via hash when available
        if (url.includes('/articles/#!')) {
          const hash = url.split('/articles/')[1] || ''
          await page.goto(`${ORIGIN}/articles/`, { waitUntil: 'domcontentloaded', timeout: 45000 })
          await page.evaluate(async (h) => { location.hash = h }, hash)
          try { await page.waitForNetworkIdle({ timeout: 12000 }) } catch {}
          await page.waitForTimeout(800)
        } else {
          await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 })
          try { await page.waitForNetworkIdle({ timeout: 12000 }) } catch {}
        }
      } catch {
        continue
      }

      // Discover links on the page (including within iframes)
      try {
        const collectFrom = async (target) => {
          const links = await target.$$eval('a[href]', as => as.map(a => a.getAttribute('href')))
          for (const href of links) {
            const abs = normalizeUrl(href)
            if (isDocUrl(abs) && !visited.has(abs)) queue.push(abs)
          }
          const extra = await target.evaluate(() => {
            const set = new Set()
            document.querySelectorAll('[data-href]').forEach(el => { set.add(el.getAttribute('data-href')) })
            document.querySelectorAll('*').forEach(el => {
              const oc = el.getAttribute && el.getAttribute('onclick')
              if (oc && /#!api-documentations\//.test(oc)) set.add(oc.match(/#!api-documentations\/[\w\-/]+/)[0])
            })
            return Array.from(set)
          })
          for (const href of extra) {
            const abs = normalizeUrl(href)
            if (isDocUrl(abs) && !visited.has(abs)) queue.push(abs)
          }
        }
        await collectFrom(page)
        for (const f of page.frames()) {
          try { await collectFrom(f) } catch {}
        }
      } catch {}

      // Extract content (try main page then frames, pick longest)
      try {
        let best = { title: '', text: '' }
        const c1 = await extractContent(page)
        if ((c1.text || '').length > best.text.length) best = c1
        for (const f of page.frames()) {
          try {
            const c = await extractContent(f)
            if ((c.text || '').length > best.text.length) best = c
          } catch {}
        }
        const { title, text } = best
        if (text && text.trim()) {
          pages.push({ url, title: title || url, text })
          // Small delay to be polite
          await page.waitForTimeout(150)
        }
      } catch {}
    }

    // Compose Markdown
    const lines = []
    lines.push(`# iiko Server API (ru.iiko.help) — выгрузка`)
    lines.push('')
    lines.push(`Источник: ${START_URL}`)
    lines.push('')
    for (const p of pages) {
      lines.push(`\n\n---\n\n`)
      lines.push(`## ${p.title}`)
      lines.push('')
      lines.push(`URL: ${p.url}`)
      lines.push('')
      lines.push(p.text)
    }

    mkdirSync(path.dirname(OUTPUT), { recursive: true })
    writeFileSync(OUTPUT, lines.join('\n'), 'utf8')
    console.log(`Saved ${pages.length} pages to`, OUTPUT)
  } finally {
    await browser.close()
  }
}

crawl().catch(err => {
  console.error(err)
  process.exit(1)
})


