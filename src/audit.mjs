/**
 * audit.mjs — Append-only audit logger for PROXY JOURNAL
 *
 * Records every CLI command execution for forensic analysis.
 * Uses SHA-256 of command args (not content) to avoid logging
 * sensitive data while still enabling anomaly detection.
 *
 * Created: 2026-07-15 · DIGIVASCONNECT PTY (LTD)
 */

import { hostname } from 'os'
import { createHash } from 'crypto'
import { query, execute, isInitialized as dbInitialized } from './sqlite-store.mjs'
import { hashString } from './integrity.mjs'

/**
 * Log a CLI command execution to the audit table.
 *
 * @param {string} home — Journal home directory
 * @param {string} command — CLI command name (e.g., 'wake', 'log', 'remember')
 * @param {string[]} args — Command arguments (hashed, not stored raw)
 * @param {string} result — 'ok', 'error', 'blocked'
 * @param {string} [details] — Optional detail message
 */
export function auditLog(home, command, args = [], result = 'ok', details = null) {
  if (!dbInitialized(home)) return false

  const argsHash = hashString(JSON.stringify(args)).slice(0, 16)
  const host = hostname()

  const esc = (s) => String(s || '').replace(/\\/g, '\\\\').replace(/'/g, "''")
  const det = details ? `'${esc(details)}'` : 'NULL'

  return execute(
    home,
    `INSERT INTO audit_log (timestamp, command, args_hash, hostname, result, details)
     VALUES (datetime('now'), '${esc(command)}', '${esc(argsHash)}', '${esc(host)}', '${esc(result)}', ${det})`
  )
}

/**
 * Get recent audit log entries.
 *
 * @param {string} home — Journal home directory
 * @param {number} limit — Max entries to return
 * @returns {Array} Audit entries
 */
export function getAuditLog(home, limit = 50) {
  if (!dbInitialized(home)) return []
  const safeLimit = Math.max(1, Math.min(10000, Number(limit) || 50))
  return query(
    home,
    `SELECT timestamp, command, args_hash, hostname, result, details
     FROM audit_log ORDER BY id DESC LIMIT ${safeLimit}`
  )
}

/**
 * Get audit entries for a specific command.
 */
export function getAuditForCommand(home, command, limit = 20) {
  if (!dbInitialized(home)) return []
  const escaped = String(command || '').replace(/\\/g, '\\\\').replace(/'/g, "''")
  const safeLimit = Math.max(1, Math.min(10000, Number(limit) || 20))
  return query(
    home,
    `SELECT timestamp, args_hash, hostname, result, details
     FROM audit_log WHERE command = '${escaped}' ORDER BY id DESC LIMIT ${safeLimit}`
  )
}

/**
 * Detect suspicious patterns in the audit log.
 * Flags: unusual hours, high error rate, rapid-fire commands.
 */
export function detectSuspicious(home, limit = 200) {
  if (!dbInitialized(home)) return { suspicious: false, entries: [] }

  const entries = query(
    home,
    `SELECT timestamp, command, args_hash, hostname, result
     FROM audit_log ORDER BY id DESC LIMIT ${limit}`
  )

  const suspicious = []

  // 1. Commands between 00:00–05:00 (unusual hours)
  for (const e of entries) {
    const hour = new Date(e.timestamp).getHours()
    if (hour >= 0 && hour < 5) {
      suspicious.push({ ...e, reason: 'unusual-hour', severity: 'warning' })
    }
  }

  // 2. High error rate (more than 3 errors in last 20 commands)
  const recent = entries.slice(0, 20)
  const errorCount = recent.filter((e) => e.result === 'error').length
  if (errorCount > 3) {
    suspicious.push({
      timestamp: new Date().toISOString(),
      command: '(aggregate)',
      reason: `high-error-rate: ${errorCount}/20 recent commands failed`,
      severity: 'warning',
    })
  }

  // 3. Rapid-fire commands (more than 10 in 60 seconds)
  if (entries.length >= 10) {
    const timestamps = entries.slice(0, 15).map((e) => new Date(e.timestamp).getTime())
    for (let i = 0; i < timestamps.length - 9; i++) {
      const span = timestamps[i] - timestamps[i + 9]
      if (span < 60000) {
        suspicious.push({
          timestamp: entries[i].timestamp,
          command: '(rapid-fire)',
          reason: `10+ commands in ${Math.round(span / 1000)}s`,
          severity: 'critical',
        })
        break
      }
    }
  }

  // 4. Commands from unexpected hostnames
  const hostCounts = {}
  for (const e of entries) {
    hostCounts[e.hostname] = (hostCounts[e.hostname] || 0) + 1
  }
  const mainHost = Object.entries(hostCounts).sort((a, b) => b[1] - a[1])[0]
  if (mainHost) {
    const minorHosts = Object.entries(hostCounts).filter(
      ([h, c]) => h !== mainHost[0] && c <= 2
    )
    for (const [h] of minorHosts) {
      const entry = entries.find((e) => e.hostname === h)
      if (entry) {
        suspicious.push({
          ...entry,
          reason: `unusual-host: ${h} (only ${hostCounts[h]} commands)`,
          severity: 'info',
        })
      }
    }
  }

  return {
    suspicious: suspicious.length > 0,
    entries: suspicious,
    totalAnalyzed: entries.length,
  }
}

/**
 * Get audit summary statistics.
 */
export function auditSummary(home) {
  if (!dbInitialized(home)) return null

  const total = query(home, 'SELECT COUNT(*) as c FROM audit_log')
  const byCommand = query(
    home,
    'SELECT command, COUNT(*) as c FROM audit_log GROUP BY command ORDER BY c DESC'
  )
  const byResult = query(
    home,
    'SELECT result, COUNT(*) as c FROM audit_log GROUP BY result'
  )
  const last24h = query(
    home,
    "SELECT COUNT(*) as c FROM audit_log WHERE timestamp > datetime('now', '-1 day')"
  )

  return {
    total: total[0]?.c || 0,
    last24h: last24h[0]?.c || 0,
    byCommand: byCommand.map((r) => ({ command: r.command, count: r.c })),
    byResult: byResult.map((r) => ({ result: r.result, count: r.c })),
  }
}
