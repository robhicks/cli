import { system, filesystem } from 'gluegun'

const cliPath = filesystem.path(__dirname, '../dist/cli.js')
const cli = (cmd: string) => system.run(`npx node ${cliPath} ${cmd}`)

test('outputs version', async () => {
  const output = await cli('--version')
  expect(output).toContain('0.0.0-automated')
})

test('outputs help', async () => {
  const output = await cli('--help')
  expect(output).toContain('0.0.0-automated')
})
