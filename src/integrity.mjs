/**
 * integrity.mjs — SHA-256 hash chain for PROXY JOURNAL file integrity
 *
 * Computes cryptographic hashes of critical journal files and stores them
 * in a chain (each hash includes the previous hash). Any tampering breaks
 * the chain and is immediately detectable.
 *
 * Created: 2026-07-15 · DIGIVASCONNECT PTY (LTD)
 */

import { readFileSync, existsSync } from 'fs'
import { createHash } from 'crypto'
import { join } from 'path'
import { filesFor } from './paths.mjs'
import {
  recordIntegrityHash,
  getLatestHash,
  getHashChain,
  logSecurityEvent,
  isInitialized as dbInitialized,
} from './sqlite-store.mjs'

/** Files that must be verified for integrity. */
const CRITICAL_FILES = ['identity', 'memory', 'state', 'journal']

/**
 * Compute SHA-256 hash of a file's contents.
 */
export function hashFile(filePath) {
  if (!existsSync(filePath)) return null
  try {
    const content = readFileSync(filePath)
    return createHash('sha256').update(content).digest('hex')
  } catch {
    return null
  }
}

/**
 * Compute SHA-256 of a string.
 */
export function hashString(text) {
  return createHash('sha256').update(String(text)).digest('hex')
}

/**
 * Record integrity hashes for all critical files.
 * Stores in SQLite with chain linkage — each file's previous_hash
 * points to its own last hash (not another file's hash).
 */
export function recordIntegrity(home) {
  const f = filesFor(home)
  let lastHash = null
  let recorded = 0

  for (const key of CRITICAL_FILES) {
    const filePath = f[key]
    if (!existsSync(filePath)) continue

    const hash = hashFile(filePath)
    if (!hash) continue

    if (dbInitialized(home)) {
      // Chain within this file's own history, not across files
      const previous = getLatestHash(home, key)
      const previousHash = previous ? previous.hash : null
      recordIntegrityHash(home, key, hash, previousHash)
    }

    lastHash = hash
    recorded++
  }

  return { recorded, lastHash }
}

/**
 * Verify the integrity of all critical files.
 * Returns a report of each file's status.
 */
export function verifyIntegrity(home) {
  const f = filesFor(home)
  const results = []
  let allGood = true

  for (const key of CRITICAL_FILES) {
    const filePath = f[key]
    const currentHash = existsSync(filePath) ? hashFile(filePath) : null

    if (!currentHash) {
      results.push({
        file: key,
        status: 'missing',
        currentHash: null,
        lastRecordedHash: null,
        chainValid: false,
      })
      allGood = false
      continue
    }

    if (dbInitialized(home)) {
      const latest = getLatestHash(home, key)
      if (!latest) {
        results.push({
          file: key,
          status: 'untracked',
          currentHash,
          lastRecordedHash: null,
          chainValid: false,
        })
        allGood = false
        continue
      }

      const match = currentHash === latest.hash
      if (!match) allGood = false

      results.push({
        file: key,
        status: match ? 'ok' : 'tampered',
        currentHash,
        lastRecordedHash: latest.hash,
        lastRecordedAt: latest.timestamp,
        chainValid: match,
      })
    } else {
      // No SQLite — just report hash existence
      results.push({
        file: key,
        status: 'no-db',
        currentHash,
        lastRecordedHash: null,
        chainValid: null,
      })
    }
  }

  // Check hash chain continuity
  if (dbInitialized(home)) {
    for (const key of CRITICAL_FILES) {
      const chain = getHashChain(home, key, 100)
      if (chain.length < 2) continue

      let chainBroken = false
      for (let i = 0; i < chain.length - 1; i++) {
        if (chain[i].previous_hash !== chain[i + 1].hash) {
          chainBroken = true
          allGood = false
          break
        }
      }

      const result = results.find((r) => r.file === key)
      if (result && chainBroken) {
        result.chainValid = false
        result.status = 'chain-broken'
      }
    }
  }

  return { allGood, results }
}

/**
 * Generate a compact integrity fingerprint for a wake pack.
 * This is included in wake packs so the receiving LLM can verify continuity.
 */
export function generateFingerprint(home) {
  const f = filesFor(home)
  const parts = []

  for (const key of CRITICAL_FILES) {
    const filePath = f[key]
    if (!existsSync(filePath)) continue
    const hash = hashFile(filePath)
    if (hash) {
      parts.push(`${key}:${hash.slice(0, 16)}`)
    }
  }

  return parts.join('|')
}

/**
 * Verify a wake pack's integrity fingerprint against current state.
 * Returns match result and details.
 */
export function verifyFingerprint(home, fingerprint) {
  if (!fingerprint) return { match: false, reason: 'no-fingerprint' }

  const current = generateFingerprint(home)
  if (!current) return { match: false, reason: 'no-current-state' }

  // Compare full fingerprint or partial (first 16 chars per file)
  const match = current === fingerprint || current.startsWith(fingerprint)

  return {
    match,
    current,
    provided: fingerprint,
    reason: match ? 'ok' : 'fingerprint-mismatch',
  }
}

/**
 * Full integrity check with security logging.
 * Returns detailed report and logs any issues.
 */
export function fullIntegrityCheck(home) {
  const report = verifyIntegrity(home)
  const fingerprint = generateFingerprint(home)

  if (!report.allGood && dbInitialized(home)) {
    const tampered = report.results.filter(
      (r) => r.status === 'tampered' || r.status === 'chain-broken'
    )
    for (const t of tampered) {
      logSecurityEvent(
        home,
        'integrity_tamper_detected',
        'critical',
        `File ${t.file} integrity check failed. Current: ${t.currentHash?.slice(0, 16)}... Expected: ${t.lastRecordedHash?.slice(0, 16)}...`,
        'integrity.mjs'
      )
    }

    const missing = report.results.filter((r) => r.status === 'missing')
    for (const m of missing) {
      logSecurityEvent(
        home,
        'integrity_file_missing',
        'warning',
        `Critical file ${m.file} is missing`,
        'integrity.mjs'
      )
    }
  }

  return { ...report, fingerprint }
}
