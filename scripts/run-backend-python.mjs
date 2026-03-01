import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

const rootDir = process.cwd()
const backendDir = join(rootDir, 'backend')
const venvPython = process.platform === 'win32'
  ? join(backendDir, '.venv', 'Scripts', 'python.exe')
  : join(backendDir, '.venv', 'bin', 'python')

const pythonBinary = existsSync(venvPython) ? venvPython : 'python'
const args = process.argv.slice(2)

const result = spawnSync(pythonBinary, args, {
  stdio: 'inherit',
  cwd: backendDir
})

if (result.error) {
  throw result.error
}

process.exit(result.status ?? 0)
