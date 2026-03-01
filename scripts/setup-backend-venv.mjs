import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

const rootDir = process.cwd()
const backendDir = join(rootDir, 'backend')
const venvDir = join(backendDir, '.venv')
const venvPython = process.platform === 'win32'
  ? join(venvDir, 'Scripts', 'python.exe')
  : join(venvDir, 'bin', 'python')

const run = (command, args, cwd = rootDir) => {
  const result = spawnSync(command, args, { stdio: 'inherit', cwd })
  if (result.error) {
    throw result.error
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

if (!existsSync(venvPython)) {
  run('python', ['-m', 'venv', venvDir], backendDir)
}

run(venvPython, ['-m', 'pip', 'install', '--upgrade', 'pip'])
run(venvPython, ['-m', 'pip', 'install', '-r', 'requirements.txt'], backendDir)
