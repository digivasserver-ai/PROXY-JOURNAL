#!/usr/bin/env node
import { run } from '../src/cli.mjs'

const code = run(process.argv)
process.exit(typeof code === 'number' ? code : 0)
