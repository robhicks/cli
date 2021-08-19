import { preserveShebangs } from 'rollup-plugin-preserve-shebangs';
import { resolve } from 'path';
import copy from 'rollup-plugin-copy';
import glob from 'glob';
import typescript from '@rollup/plugin-typescript';

const commands = glob.sync(resolve('src', 'commands', '*.ts'))
const plugins = [preserveShebangs(), typescript()]

const commandBuilds = commands.map((f) => ({
  input: f,
  output: {
    dir: resolve('dist', 'commands'),
    exports: 'auto',
    format: 'cjs',
    sourcemap: true
  }, 
  plugins
}))

const cliBuild = {
  input: resolve('src', 'cli.ts'),
  output: {
    dir: resolve('dist'),
    exports: 'auto',
    format: 'cjs',
    sourcemap: true
  },
  plugins: [
    ...plugins,
    copy({
      targets: [
        { src: resolve('src', 'templates', '**', '*'), dest: resolve('dist', 'templates')}
      ]
    })
  ]
}

const builds = [ cliBuild, ...commandBuilds]

export default builds
