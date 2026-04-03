import { spawn } from 'node:child_process'

const childEnv = Object.fromEntries(
  Object.entries(process.env).filter(([key]) => !key.toLowerCase().startsWith('npm_'))
)

childEnv.NODE_OPTIONS = ''

const child = spawn(process.execPath, ['./node_modules/tsx/dist/cli.mjs', 'scripts/test-cdss.ts'], {
  cwd: process.cwd(),
  env: childEnv,
  stdio: 'inherit',
})

child.on('exit', code => {
  process.exitCode = code ?? 1
})

child.on('error', () => {
  process.exitCode = 1
})
