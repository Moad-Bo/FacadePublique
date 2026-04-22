import { defineEventHandler, readBody } from 'h3'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { level, title, description, path, timestamp } = body

  const color = level === 'error' ? '\x1b[31m' : '\x1b[33m' // Red for error, Yellow for warning
  const reset = '\x1b[0m'

  // Log to Nitro / Shell CLI
  console.log(`${color}\n[CLIENT ${level?.toUpperCase() || 'LOG'}] ${timestamp}${reset}`)
  console.log(`${color}Title: ${title}${reset}`)
  if (description) console.log(`Description: ${description}`)
  console.log(`Path: ${path}\n`)

  return { success: true }
})
