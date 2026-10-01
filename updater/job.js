import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import fs from 'node:fs/promises'
import path from 'node:path'

const sh = promisify(execFile)
const DIR = process.env.PROJECT_DIR
const NEW = process.env.NEW_TAG
const ENV_FILE = path.join(DIR, '.env')
const STATE = path.join(DIR, 'data/update/status.json')

let state = JSON.parse(await fs.readFile(STATE, 'utf8'))
async function save(patch = {}, line) {
  state = { ...state, ...patch }
  if (line) state.log = [...state.log, line].slice(-200)
  await fs.writeFile(STATE + '.tmp', JSON.stringify(state))
  await fs.rename(STATE + '.tmp', STATE)   // écriture atomique
}

const compose = async (...args) => {
  const { stdout, stderr } = await sh('docker', ['compose', '-p', 'monapp', ...args], { cwd: DIR, maxBuffer: 20e6 })
  return stdout + stderr
}

const getTag = async () => (await fs.readFile(ENV_FILE, 'utf8')).match(/^APP_TAG=(.*)$/m)?.[1]
const setTag = async (tag) => {
  const t = await fs.readFile(ENV_FILE, 'utf8')
  await fs.writeFile(ENV_FILE, t.replace(/^APP_TAG=.*$/m, `APP_TAG=${tag}`))
}

async function waitForVersion(tag, timeoutMs = 180_000) {
  const end = Date.now() + timeoutMs
  while (Date.now() < end) {
    try {
      const r = await fetch('http://backend:3000/api/system/version')
      if ((await r.json()).version === tag) return true
    } catch { /* le backend redémarre */ }
    await new Promise((r) => setTimeout(r, 3000))
  }
  return false
}

const previous = await getTag()
await save({ previous }, `Version actuelle : ${previous}, cible : ${NEW}`)

try {
  await setTag(NEW)
  await save({}, 'Téléchargement des images...')
  await compose('pull')
  await save({}, 'Redémarrage des services...')
  await compose('up', '-d', '--remove-orphans')
  await save({}, 'Vérification du démarrage...')
  if (!(await waitForVersion(NEW))) throw new Error('Le backend ne répond pas avec la nouvelle version')
  await save({ status: 'done', finishedAt: Date.now() }, `Mise à jour vers ${NEW} terminée.`)
} catch (err) {
  await save({}, `Échec : ${err.message}. Retour à ${previous}...`)
  try {
    await setTag(previous)
    await compose('up', '-d')
    await save({ status: 'error', error: err.message, rolledBack: true, finishedAt: Date.now() })
  } catch (e) {
    await save({ status: 'error', error: `${err.message} / rollback impossible : ${e.message}`, finishedAt: Date.now() })
  }
}
