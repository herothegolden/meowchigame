import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3000

// health
app.get('/healthz', (_req, res) => res.status(200).send('ok'))

// serve static
app.use(express.static(path.join(__dirname, 'dist')))

// SPA fallback
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'))
})

app.listen(PORT, () => {
  console.log('Meowchi Mini-App listening on :' + PORT)
})
