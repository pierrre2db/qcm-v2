/**
 * QCM V2 — Bot emulator test avec tableau de résultats
 * Usage: node test-emulators.mjs <ROOM_CODE>
 */

import { chromium, firefox, webkit, devices } from 'playwright'

const BASE_URL = 'https://pierrre2db.github.io/qcm-v2/'
const ROOM_CODE = process.argv[2]?.toUpperCase()

if (!ROOM_CODE || ROOM_CODE.length !== 6) {
  console.error('❌  Usage: node test-emulators.mjs <CODE_6_CHARS>')
  process.exit(1)
}

const STYLE_LABELS = ['🤖 Robot', '😄 Emoji', '🎮 Pixel']

const PLAYERS = [
  { name: 'Zara-9',      styleIdx: 1, engine: 'chromium', device: 'iPhone 13' },
  { name: 'Kael Voss',   styleIdx: 2, engine: 'chromium', device: 'Pixel 5' },
  { name: 'Nyra Strix',  styleIdx: 0, engine: 'chromium', device: 'iPad Pro 11' },
  { name: 'Dax Solaris', styleIdx: 1, engine: 'chromium', device: 'iPhone 13 Pro Max' },
  { name: 'Vex Morrow',  styleIdx: 2, engine: 'chromium', device: 'iPhone SE' },
  { name: 'Lyra Onyx',   styleIdx: 0, engine: 'chromium', device: null },
  { name: 'Caden-Z',     styleIdx: 1, engine: 'firefox',  device: null },
  { name: 'Sable Rho',   styleIdx: 2, engine: 'webkit',   device: null },
  { name: 'Orion Flux',  styleIdx: 0, engine: 'chromium', device: 'Galaxy S8' },
  { name: 'Nyx Vael',    styleIdx: 1, engine: 'chromium', device: 'Moto G4' },
]

const ENGINES = { chromium, firefox, webkit }

function log(name, msg) {
  const t = new Date().toLocaleTimeString('fr-FR')
  console.log(`[${t}] [${name.padEnd(12)}] ${msg}`)
}

// ── Single player ────────────────────────────────────────────────────────────
async function runPlayer(player, startDelay) {
  const deviceLabel = player.device || `${player.engine} desktop`
  const stats = {
    name: player.name,
    device: deviceLabel,
    avatar: STYLE_LABELS[player.styleIdx],
    joined: false,
    questions: []   // { q, status: 'answered'|'skipped'|'timeout', optionIdx, ms }
  }

  const engine = ENGINES[player.engine]
  const contextOpts = player.device
    ? { ...devices[player.device] }
    : { viewport: { width: 1280, height: 720 } }

  const browser = await engine.launch({ headless: false, slowMo: 60 })
  const ctx = await browser.newContext(contextOpts)
  const page = await ctx.newPage()

  await page.waitForTimeout(startDelay)

  try {
    log(player.name, `→ ${deviceLabel}`)
    await page.goto(`${BASE_URL}?room=${ROOM_CODE}`, {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    })

    // Fill pseudo
    await page.fill('input[placeholder*="Chef_Antoine"]', player.name)
    await page.waitForTimeout(300)

    // Pick avatar style by label
    const styleText = ['Robot', 'Emoji', 'Pixel'][player.styleIdx]
    await page.locator('button', { hasText: styleText }).first().click()
    await page.waitForTimeout(300)

    // Join
    await page.locator('button', { hasText: 'Rejoindre la session' }).click()
    stats.joined = true
    log(player.name, `Joined ✓  avatar: ${STYLE_LABELS[player.styleIdx]}`)

    // ── Question loop ────────────────────────────────────────────────────────
    let qNum = 0

    while (true) {
      // Wait for answer buttons (▲◆●■) — 3 min on first question, 45s after
      const waitMs = qNum === 0 ? 180_000 : 45_000
      const answerBtns = page.locator('button[type="button"]').filter({ hasText: /[▲◆●■]/ })

      try {
        await answerBtns.first().waitFor({ state: 'visible', timeout: waitMs })
      } catch {
        log(player.name, 'Session terminée (timeout attente question).')
        break
      }

      // Make sure buttons are enabled (not a lingering disabled state)
      await page.waitForFunction(
        () => {
          const btns = [...document.querySelectorAll('button[type="button"]')]
            .filter(b => /[▲◆●■]/.test(b.textContent) && !b.disabled)
          return btns.length > 0
        },
        { timeout: 5000 }
      ).catch(() => {})

      const count = await answerBtns.count()
      if (count === 0) { await page.waitForTimeout(1000); continue }

      qNum++
      const qStart = Date.now()

      // Random think time 2–12s (never more than 28s so we don't hit the 30s timer)
      const thinkMs = 2000 + Math.floor(Math.random() * 10000)
      log(player.name, `Q${qNum} — réflexion ${(thinkMs / 1000).toFixed(1)}s...`)

      // Race: think timer vs buttons disappearing (teacher skipped)
      const pick = Math.floor(Math.random() * count)

      const answered = await Promise.race([
        // Path A: think time elapsed → click answer
        page.waitForTimeout(thinkMs).then(async () => {
          const stillEnabled = await answerBtns.nth(pick).isEnabled().catch(() => false)
          if (!stillEnabled) return 'skipped'
          await answerBtns.nth(pick).click({ force: true }).catch(() => {})
          return 'answered'
        }),
        // Path B: buttons vanish → teacher advanced
        page.waitForFunction(
          () => {
            const btns = [...document.querySelectorAll('button[type="button"]')]
              .filter(b => /[▲◆●■]/.test(b.textContent))
            return btns.length === 0
          },
          { timeout: 35_000 }
        ).then(() => 'skipped').catch(() => 'timeout')
      ])

      const ms = Date.now() - qStart
      stats.questions.push({ q: qNum, status: answered, optionIdx: pick, ms })

      const emoji = answered === 'answered' ? '✓' : answered === 'skipped' ? '⏭ skipped' : '⏱ timeout'
      log(player.name, `Q${qNum} — ${emoji}  (${(ms / 1000).toFixed(1)}s)`)

      await page.waitForTimeout(1000)
    }

  } catch (err) {
    log(player.name, `⚠ ${err.message.slice(0, 80)}`)
  } finally {
    await page.waitForTimeout(2000)
    await browser.close()
  }

  return stats
}

// ── Results table ────────────────────────────────────────────────────────────
function printResults(results) {
  console.log('\n')
  console.log('═'.repeat(90))
  console.log('  RÉSULTATS DU TEST')
  console.log('═'.repeat(90))

  // Per-player detail
  const maxQ = Math.max(...results.map(r => r.questions.length), 0)

  // Header
  const nameW = 14, devW = 22, avW = 10
  console.log(
    '\n' +
    'Joueur'.padEnd(nameW) +
    'Appareil'.padEnd(devW) +
    'Avatar'.padEnd(avW) +
    'Joint'.padEnd(7) +
    'Répondu'.padEnd(10) +
    'Skipped'.padEnd(10) +
    'Moy. temps'
  )
  console.log('─'.repeat(90))

  for (const r of results) {
    const answered = r.questions.filter(q => q.status === 'answered').length
    const skipped  = r.questions.filter(q => q.status === 'skipped').length
    const times    = r.questions.filter(q => q.status === 'answered').map(q => q.ms)
    const avgMs    = times.length > 0 ? (times.reduce((a, b) => a + b, 0) / times.length / 1000).toFixed(1) : '—'

    console.log(
      r.name.padEnd(nameW) +
      r.device.padEnd(devW) +
      r.avatar.padEnd(avW) +
      (r.joined ? '✓' : '✗').padEnd(7) +
      `${answered}/${r.questions.length}`.padEnd(10) +
      String(skipped).padEnd(10) +
      (avgMs !== '—' ? `${avgMs}s` : '—')
    )
  }

  console.log('─'.repeat(90))

  // Summary
  const totalJoined   = results.filter(r => r.joined).length
  const totalAnswered = results.reduce((s, r) => s + r.questions.filter(q => q.status === 'answered').length, 0)
  const totalSkipped  = results.reduce((s, r) => s + r.questions.filter(q => q.status === 'skipped').length, 0)
  const totalQ        = results.reduce((s, r) => s + r.questions.length, 0)

  console.log(
    'TOTAL'.padEnd(nameW) +
    ''.padEnd(devW) +
    ''.padEnd(avW) +
    `${totalJoined}/10`.padEnd(7) +
    `${totalAnswered}/${totalQ}`.padEnd(10) +
    String(totalSkipped).padEnd(10)
  )
  console.log('═'.repeat(90))

  // Per-question breakdown
  if (maxQ > 0) {
    console.log('\n  DÉTAIL PAR QUESTION\n')
    console.log('Q'.padEnd(5) + results.map(r => r.name.slice(0, 8).padEnd(10)).join(''))
    console.log('─'.repeat(5 + results.length * 10))
    for (let q = 1; q <= maxQ; q++) {
      const row = results.map(r => {
        const entry = r.questions.find(x => x.q === q)
        if (!entry) return '—'.padEnd(10)
        if (entry.status === 'answered') return `✓ ${(entry.ms/1000).toFixed(1)}s`.padEnd(10)
        if (entry.status === 'skipped')  return '⏭'.padEnd(10)
        return '⏱'.padEnd(10)
      }).join('')
      console.log(`Q${q}`.padEnd(5) + row)
    }
    console.log('─'.repeat(5 + results.length * 10))
    console.log('\n  ✓ répondu   ⏭ skipped (avancé trop vite)   ⏱ timeout\n')
  }
}

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n╔══════════════════════════════════════════════════════╗')
  console.log(`║  QCM V2 — Bot Test  |  Room: ${ROOM_CODE}                ║`)
  console.log(`║  ${PLAYERS.length} joueurs  |  ${BASE_URL}  ║`)
  console.log('╚══════════════════════════════════════════════════════╝\n')
  PLAYERS.forEach((p, i) => {
    console.log(`  ${i + 1}. ${p.name.padEnd(13)} ${STYLE_LABELS[p.styleIdx]}  ${p.device || p.engine + ' desktop'}`)
  })
  console.log('\nLancement dans 2s...\n')
  await new Promise(r => setTimeout(r, 2000))

  const results = await Promise.allSettled(
    PLAYERS.map((player, i) => runPlayer(player, i * 500))
  )

  const finalResults = results.map((r, i) =>
    r.status === 'fulfilled' ? r.value : {
      name: PLAYERS[i].name,
      device: PLAYERS[i].device || `${PLAYERS[i].engine} desktop`,
      avatar: STYLE_LABELS[PLAYERS[i].styleIdx],
      joined: false,
      questions: []
    }
  )

  printResults(finalResults)
}

main().catch(err => { console.error('Fatal:', err); process.exit(1) })
