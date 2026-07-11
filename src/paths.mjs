import { homedir } from 'os'
import { join } from 'path'
import { existsSync, readFileSync } from 'fs'

/**
 * Resolve the journal home directory.
 * Priority: PROXY_JOURNAL_HOME env → .proxy-journal/config.json → ~/.proxy-journal
 */
export function resolveHome(explicit) {
  if (explicit) return explicit
  if (process.env.PROXY_JOURNAL_HOME) return process.env.PROXY_JOURNAL_HOME

  const cwdConfig = join(process.cwd(), '.proxy-journal', 'config.json')
  if (existsSync(cwdConfig)) {
    try {
      const cfg = JSON.parse(readFileSync(cwdConfig, 'utf8'))
      if (cfg.home) return cfg.home
    } catch { /* ignore */ }
  }

  const local = join(process.cwd(), '.proxy-journal')
  if (existsSync(join(local, 'identity.json'))) return local

  return join(homedir(), '.proxy-journal')
}

export function filesFor(home) {
  return {
    home,
    identity: join(home, 'identity.json'),
    memory: join(home, 'memory.json'),
    state: join(home, 'state.ndjson'),
    journal: join(home, 'journal.md'),
    config: join(home, 'config.json'),
    preserveLog: join(home, 'preserve.log'),
    backupDir: join(home, 'backup'),
    sessionsDir: join(home, 'sessions'),
  }
}
