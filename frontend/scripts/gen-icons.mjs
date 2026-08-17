// Generates PWA PNG icons from the SVG logo using sharp.
// Run: npm run gen:icons
import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outDir = path.resolve(__dirname, '../public/icons')

const logo = (bg = 'url(#bg)', radius = 120) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#4c8189"/>
      <stop offset="1" stop-color="#2d4247"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="${radius}" fill="${bg}"/>
  <path d="M96 256c48-72 112-108 160-108s112 36 160 108c-48 72-112 108-160 108S144 328 96 256Z"
        fill="none" stroke="#f6f8f7" stroke-width="22" stroke-linecap="round"/>
  <circle cx="256" cy="256" r="60" fill="#dce1e0"/>
  <path d="M256 214c24 0 42 18 42 42s-18 40-40 40-34-14-34-32 12-28 28-28 22 10 22 22"
        fill="none" stroke="#2d4247" stroke-width="18" stroke-linecap="round"/>
</svg>`

// Maskable: fill the whole canvas (no rounded corners) with extra safe padding.
const maskable = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#4c8189"/>
      <stop offset="1" stop-color="#2d4247"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="url(#bg)"/>
  <g transform="translate(64 64) scale(0.75)">
    <path d="M96 256c48-72 112-108 160-108s112 36 160 108c-48 72-112 108-160 108S144 328 96 256Z"
          fill="none" stroke="#f4ecdd" stroke-width="22" stroke-linecap="round"/>
    <circle cx="256" cy="256" r="60" fill="#e0a458"/>
    <path d="M256 214c24 0 42 18 42 42s-18 40-40 40-34-14-34-32 12-28 28-28 22 10 22 22"
          fill="none" stroke="#123f3e" stroke-width="18" stroke-linecap="round"/>
  </g>
</svg>`

async function main() {
  await mkdir(outDir, { recursive: true })
  const jobs = [
    { name: 'icon-192.png', size: 192, svg: logo() },
    { name: 'icon-512.png', size: 512, svg: logo() },
    { name: 'maskable-512.png', size: 512, svg: maskable },
    { name: 'apple-touch-icon.png', size: 180, svg: logo('url(#bg)', 0) },
  ]
  for (const job of jobs) {
    await sharp(Buffer.from(job.svg))
      .resize(job.size, job.size)
      .png()
      .toFile(path.join(outDir, job.name))
    console.log('✓', job.name)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
