import express from 'express'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { timingSafeEqual } from 'node:crypto'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

const run = promisify(execFile)
const DIR = process.env.PROJECT_DIR
const NETWORK = process.env.NETWORK
const TOKEN = process.env.UPDATER_TOKEN
const STATE = path.join(DIR, 'data/update/status.json')
const TAG_RE = /^\d+\.\d+\.\d+(-[A-Za-z0-9.]+)?$/   // on n'accepte QUE ce format

const app = express()
app.use(express.json())

app.use((req, res, next) => {
  const given = Buffer.from(req.headers.authorization || '')
  const expected = Buffer.from(`Bearer ${TOKEN}`)
  if (given.length === expected.length && timingSafeEqual(given, expected)) return next()
  res.sendStatus(401)
})

const readState = async () => {
  try { return JSON.parse(await fs.readFile(STATE, 'utf8')) }
  catch { return { status: 'idle' } }
}

const jobRunning = async () => {
  const { stdout } = await run('docker', ['ps', '-q', '--filter', 'label=monapp.update-job'])
  return stdout.trim() !== ''
}

app.get('/status', async (req, res) => {
  const st = await readState()
  // job mort sans avoir écrit son résultat (crash, machine redémarrée...)
  if (st.status === 'running' && !(await jobRunning())) {
    st.status = 'error'
    st.error = 'Mise à jour interrompue.'
    await fs.writeFile(STATE, JSON.stringify(st))
  }
  res.json({ ...st, updaterVersion: process.env.APP_VERSION || null })
})

app.post('/update', async (req, res) => {
  const tag = req.body?.tag
  if (typeof tag !== 'string' || !TAG_RE.test(tag)) return res.status(400).json({ message: 'Tag invalide' })
  if ((await readState()).status === 'running' || (await jobRunning()))
    return res.status(409).json({ message: 'Une mise à jour est déjà en cours' })

  // L'image de CE conteneur sert à lancer le job (elle restera sur le disque après le remplacement)
  const { stdout } = await run('docker', ['inspect', '--format', '{{.Image}}', os.hostname()])
  await fs.mkdir(path.dirname(STATE), { recursive: true })
  await fs.writeFile(STATE, JSON.stringify({ status: 'running', target: tag, startedAt: Date.now(), log: [] }))

  await run('docker', [
    'run', '-d', '--rm',
    '--label', 'monapp.update-job=1',
    '--network', NETWORK,
    '-v', '/var/run/docker.sock:/var/run/docker.sock',
    '-v', `${DIR}:${DIR}`,
    '-e', `PROJECT_DIR=${DIR}`,
    '-e', `NEW_TAG=${tag}`,
    stdout.trim(), 'node', 'job.js',
  ])
  res.status(202).json({ status: 'running', target: tag })
})

app.listen(4000)
