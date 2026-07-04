import { readFileSync } from 'fs'

export default defineEventHandler(() => {
  try {
    const content = readFileSync('./public/blogdata.json', 'utf-8')
    return JSON.parse(content)
  } catch {
    return []
  }
})
