import express from 'express'
import cors from 'cors'
import { config } from './config.js'
import { authRouter } from './auth/routes.js'
import { hierarchyRouter } from './routes/hierarchy.js'
import { hazardsRouter } from './routes/hazards.js'
import { promptsRouter } from './routes/prompts.js'
import { akoKoreroRouter } from './routes/akoKorero.js'
import { concernsRouter } from './routes/concerns.js'
import { syncRouter } from './routes/sync.js'
import { notificationsRouter } from './routes/notifications.js'
import { analyticsRouter } from './routes/analytics.js'
import { membersRouter } from './routes/members.js'
import { mediaRouter } from './routes/media.js'
import { quickLinksRouter } from './routes/quickLinks.js'
import { nzbnRouter } from './routes/nzbn.js'
import { systemRouter } from './routes/system.js'
import { errorHandler } from './middleware/errorHandler.js'

const app = express()

app.use(
  cors({
    origin: config.corsOrigins.length ? config.corsOrigins : true,
    credentials: true,
  }),
)
// Photos arrive as data URLs, so allow a generous JSON body.
app.use(express.json({ limit: '15mb' }))

// Liveness/readiness.
app.get('/health', (_req, res) => res.json({ status: 'ok' }))

const api = express.Router()
api.use('/auth', authRouter)
api.use('/supervisors', hierarchyRouter) // /supervisors, /supervisors/:id/crew
api.use('/hazards', hazardsRouter)
api.use('/prompts', promptsRouter)
api.use('/ako-korero', akoKoreroRouter)
api.use('/concerns', concernsRouter)
api.use('/sync', syncRouter)
api.use('/notifications', notificationsRouter)
api.use('/analytics', analyticsRouter)
api.use('/members', membersRouter)
api.use('/media', mediaRouter)
api.use('/quick-links', quickLinksRouter)
api.use('/nzbn', nzbnRouter)
api.use('/system', systemRouter)

// Versioned + unversioned mounts (the PWA's VITE_API_BASE can include /v1 or not).
app.use('/v1', api)
app.use('/', api)

app.use(errorHandler)

app.listen(config.port, () => {
  console.log(`NQR backend listening on http://localhost:${config.port}`)
})
