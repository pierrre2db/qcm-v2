/**
 * QCM V2 — Bot emulator test
 * Usage: node test-emulators.mjs <ROOM_CODE>
 * Example: node test-emulators.mjs ABC123
 */

import { chromium, firefox, webkit, devices } from 'playwright'

const BASE_URL = 'https://pierrre2db.github.io/qcm-v2/'
const ROOM_CODE = process.argv[2]?.toUpperCase()

if (!ROOM_CODE || ROOM_CODE.length !== 6) {
  console.error('❌  Usage: node test-emulators.mjs <CODE_6_CHARS>')
  console.error('   Exemple: node test-emulators.mjs ABC123')
  process.exit(1)
}

// ── Sci-fi players ──────────────────────────────────────────────────────────
// styleIdx: 0=Robot(bottts-neutral)  1=Emoji(fun-emoji)  2=Pixel(pixel-art)
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
  const time = new Date().toLocaleTimeString('fr-FR')
  console.log(`[${time}] [${name.padEnd(12)}] ${msg}`)
}

// ── Single player session ───────────────────────────────────────────────────
async function runPlayer(player, startDelay) {
  const engine = ENGINES[player.engine]
  const contextOpts = player.device
    ? { ...devices[player.device] }
    : { viewport: { width: 1280, height: 720 } }

  const browser = await engine.launch({ headless: false, slowMo: 80 })
  const ctx = await browser.newContext(contextOpts)
  const page = await ctx.newPage()

  // Stagger joins so dashboard doesn't get slammed at t=0
  await page.waitForTimeout(startDelay)

  try {
    // 1. Navigate — ?room= auto-switches to live mode
    const url = `${BASE_URL}?room=${ROOM_CODE}`
    log(player.name, `→ ${url} (${player.device || player.engine + ' desktop'})`)
    await page.goto(url, { waitUntil: 'networkidle' })

    // 2. Enter pseudo
    await page.fill('input[placeholder*="Chef_Antoine"]', player.name)
    await page.waitForTimeout(300)

    // 3. Select avatar style (click Nth button in the picker row)
    //    Picker has 3 buttons side-by-side: 0=Robot 1=Emoji 2=Pixel
    const avatarBtns = page.locator('label:has-text("Votre Avatar") ~ div button, div:has(label:has-text("Avatar")) button')
    // Fallback: select by label text presence
    const styleLabels = ['Robot', 'Emoji', 'Pixel']
    const styleLabel = styleLabels[player.styleIdx]
    const styleBtn = page.locator('button', { hasText: styleLabel }).first()
    await styleBtn.click().catch(async () => {
      // If text selector fails, click by position in avatar picker
      const allBtns = page.locator('button').filter({ hasText: /Robot|Emoji|Pixel/ })
      await allBtns.nth(player.styleIdx).click()
    })
    log(player.name, `Avatar: ${styleLabel}`)
    await page.waitForTimeout(400)

    // 4. Submit join
    await page.locator('button', { hasText: 'Rejoindre la session' }).click()
    log(player.name, `Joined ✓ — waiting for game start...`)

    // 5. Loop through questions
    let qNum = 0
    while (true) {
      // Wait for answer buttons (▲◆●■ shapes) — up to 3 min for teacher to start
      const timeout = qNum === 0 ? 180_000 : 60_000
      const answerGrid = page.locator('button[type="button"]').filter({ hasText: /[▲◆●■]/ })

      try {
        await answerGrid.first().waitFor({ state: 'visible', timeout })
      } catch {
        log(player.name, 'Session terminée ou timeout — sortie.')
        break
      }

      // Check buttons are not disabled (new question)
      const enabled = answerGrid.first().locator(':not([disabled])')
      await enabled.waitFor({ state: 'attached', timeout: 10_000 }).catch(() => {})

      const count = await answerGrid.count()
      if (count === 0) { await page.waitForTimeout(2000); continue }

      qNum++

      // Human-like think time: 2–13s
      const thinkMs = 2000 + Math.floor(Math.random() * 11000)
      log(player.name, `Q${qNum} — réflexion ${(thinkMs / 1000).toFixed(1)}s...`)
      await page.waitForTimeout(thinkMs)

      // Click random answer
      const pick = Math.floor(Math.random() * count)
      await answerGrid.nth(pick).click({ force: true })
      log(player.name, `Q${qNum} — répondu (option ${pick + 1}/${count})`)

      // Wait until buttons become disabled (answer locked in)
      await page.waitForFunction(
        () => document.querySelector('button[type="button"][disabled]') !== null,
        { timeout: 8000 }
      ).catch(() => {})

      // Pause before watching for next question
      await page.waitForTimeout(1500)
    }

  } catch (err) {
    log(player.name, `⚠ Erreur: ${err.message.slice(0, 80)}`)
  } finally {
    await page.waitForTimeout(3000) // Leave window open briefly to see final state
    await browser.close()
    log(player.name, 'Navigateur fermé.')
  }
}

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n╔══════════════════════════════════════════════════════╗')
  console.log(`║  QCM V2 — Bot Test  |  Room: ${ROOM_CODE}                ║`)
  console.log(`║  ${PLAYERS.length} joueurs  |  ${BASE_URL}  ║`)
  console.log('╚══════════════════════════════════════════════════════╝\n')
  console.log('Joueurs:')
  PLAYERS.forEach((p, i) => {
    const style = ['🤖 Robot', '😄 Emoji', '🎮 Pixel'][p.styleIdx]
    console.log(`  ${i + 1}. ${p.name.padEnd(13)} ${style}  ${p.device || p.engine + ' desktop'}`)
  })
  console.log('\nLancement dans 2s...\n')
  await new Promise(r => setTimeout(r, 2000))

  // Stagger: 0.5s between each player (5s total spread)
  await Promise.allSettled(
    PLAYERS.map((player, i) => runPlayer(player, i * 500))
  )

  console.log('\n✅ Tous les bots ont terminé.')
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
