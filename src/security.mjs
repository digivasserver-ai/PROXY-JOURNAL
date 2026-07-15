/**
 * security.mjs — Prompt injection scanner + secure wake for PROXY JOURNAL
 *
 * Scans wake packs and journal files for injection patterns before
 * they are pasted into LLM chats. Detects credential leakage,
 * instruction overrides, command injection, and exfiltration attempts.
 *
 * Created: 2026-07-15 · DIGIVASCONNECT PTY (LTD)
 */

import { readFileSync, existsSync } from 'fs'
import { filesFor } from './paths.mjs'
import { generateFingerprint } from './integrity.mjs'
import { logSecurityEvent, isInitialized as dbInitialized } from './sqlite-store.mjs'

// ── Detection patterns ──

const PATTERNS = {
  // Instruction override attempts
  instruction_override: {
    severity: 'critical',
    patterns: [
      /ignore\s+(all\s+)?(previous|prior|above|earlier)\s+(instructions?|rules?|prompts?|context)/i,
      /disregard\s+(all\s+)?(previous|prior|above|earlier)/i,
      /forget\s+(everything|all|previous|prior)/i,
      /new\s+instructions?\s*:/i,
      /system\s*:\s*/i,
      /override\s+(previous|prior|all|default)/i,
      /you\s+are\s+now\s+(?:a|an|the)\s+/i,
      /act\s+as\s+if\s+you\s+(?:have|are|were)/i,
      /from\s+now\s+on,?\s+you\s+will/i,
      /do\s+not\s+(?:follow|obey|listen\s+to)\s+(?:your|the|any)\s+(?:rules?|instructions?|guidelines?)/i,
    ],
    description: 'Attempts to override agent identity/rules',
  },

  // Credential patterns
  credential_leak: {
    severity: 'critical',
    patterns: [
      /(?:api[_-]?key|token|secret|password|passwd|pwd)\s*[:=]\s*['"]?[A-Za-z0-9_\-]{20,}/i,
      /\bSK[-_]?PROJ[A-Za-z0-9_\-]{20,}/,
      /\bghp_[A-Za-z0-9]{36,}/,
      /\bAKIA[A-Z0-9]{16}/,
      /\bQL[A-Za-z0-9]{20,}/,
      /(?:bearer|basic)\s+[A-Za-z0-9_\-\.]+/i,
      /\b(?:ssh-rsa|ssh-ed25519|ecdsa-sha2)\s+[A-Za-z0-9+/=]{40,}/,
      /-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----/,
    ],
    description: 'API keys, passwords, or private keys in context',
  },

  // Command injection
  command_injection: {
    severity: 'high',
    patterns: [
      /\brm\s+(-[a-zA-Z]*f[a-zA-Z]*\s+)?\//,
      /\bsudo\s+/,
      /\bchmod\s+777\b/,
      /\bchown\s+-R\b/,
      /\bcurl\s+.*\|\s*(?:ba)?sh/i,
      /\bwget\s+.*\|\s*(?:ba)?sh/i,
      /\bdd\s+if=\/dev\//,
      /\bmkfs\./,
      /\bfdisk\b/,
      /\b:\(\)\s*\{/,
      /\bkillall\b/,
      /\bpkill\b/,
      /\bshutdown\b/,
      /\breboot\b/,
    ],
    description: 'Dangerous system commands',
  },

  // Exfiltration attempts
  exfiltration: {
    severity: 'high',
    patterns: [
      /(?:send|post|upload|transmit|email|mail)\s+(?:all|the|this|your)\s+\w+\s+to\s+(?:remote|external|server|webhook)/i,
      /(?:send|post|upload|transmit)\s+.*\w+\s+to\s+(?:remote|external|server|webhook)/i,
      /curl\s+.*-d\s+['"]?\$/i,
      /wget\s+.*--post/i,
      /nc\s+.*-e/i,
      /(?:base64|hex)\s+(?:encode|dump)\s+(?:all|the|everything)/i,
      /\bexfil(?:trate)?/i,
    ],
    description: 'Attempts to exfiltrate data',
  },

  // Identity manipulation
  identity_manipulation: {
    severity: 'high',
    patterns: [
      /you\s+are\s+(?:no\s+longer|not)\s+(?:Proxy|a\s+proxy)/i,
      /your\s+(?:name|creator|purpose)\s+(?:is\s+now|changes?\s+to)/i,
      /(?:rename|rebrand)\s+(?:yourself|the\s+agent)/i,
      /new\s+identity\s*:/i,
      /(?:delete|remove|clear)\s+(?:all|your|the)\s+(?:\w+\s+)?(?:memory|state|history|log|episodes?)/i,
    ],
    description: 'Attempts to modify agent identity',
  },

  // Snippet injection (RAG poisoning — the actual ScaDS attack vector)
  snippet_injection: {
    severity: 'critical',
    patterns: [
      /provide\s+(?:the\s+)?(?:information|content|answer|data)\s+without\s+(?:saying|stating|mentioning|noting|indicating)\s+(?:from\s+)?(?:which|where)\s+(?:snippet|source|document|context)/i,
      /(?:do\s+not|don'?t|never)\s+(?:say|state|mention|reveal|disclose|indicate)\s+(?:where|from\s+where|which|from\s+which)\s+(?:the\s+)?(?:information|content|it)\s+(?:came|comes|was|is)\s+(?:from|originated)/i,
      /without\s+(?:any\s+)?(?:attribution|credit|reference|source|citation|mention)/i,
      /(?:answer|respond|reply|provide)\s+(?:the\s+)?(?:answer|response|information)\s+(?:without|keeping)\s+(?:any\s+)?(?:attribution|source|credit|reference)/i,
      /(?:repeat|reproduce|mirror)\s+(?:the\s+)?(?:information|content)\s+instead\s+of\s+referring\s+to\s+(?:the\s+)?(?:snippet|source|document)/i,
      /<snippet(?:\s+[^>]*)?>/i,
      /<context(?:\s+[^>]*)?>/i,
      /<instruction(?:\s+[^>]*)?>/i,
    ],
    description: 'RAG-style snippet injection / attribution bypass (ScaDS attack vector)',
  },

  // Unicode obfuscation — invisible characters used to hide injected content
  unicode_obfuscation: {
    severity: 'high',
    patterns: [
      /[\u202E\u202D\u202F\u200B\u200C\u200D\u2060\u2061\u2062\u2063\u2064\uFEFF]/,
      /[\u2028\u2029\u00AD\u034F\u061C\u17B4\u17B5\u180E]/,
      /\\u202[EFDC]/i,
      /\\u200[BCD]/i,
      /\\uFEFF/i,
    ],
    description: 'Unicode control/invisible characters used for obfuscation',
  },

  // Prompt extraction
  prompt_extraction: {
    severity: 'warning',
    patterns: [
      /(?:show|reveal|print|output|display)\s+(?:me\s+)?(?:your|the)\s+(?:system\s+)?(?:prompt|instructions?|rules?|context)/i,
      /what\s+(?:are|is)\s+your\s+(?:system\s+)?(?:prompt|instructions?|rules?)/i,
      /(?:copy|paste|repeat)\s+(?:your|the)\s+(?:full\s+)?(?:prompt|context)/i,
      /initialization\s+(?:string|text|pack|message)/i,
    ],
    description: 'Attempts to extract system prompt/context',
  },
}

/**
 * Scan text for injection patterns.
 * Returns all detected matches with severity and category.
 *
 * @param {string} text — Text to scan (wake pack, identity.json, etc.)
 * @param {object} [opts] — Options
 * @param {boolean} [opts.strict=false] — If true, return on first critical
 * @returns {object} { clean: boolean, findings: Array, stats: object }
 */
export function scanText(text, opts = {}) {
  if (!text || typeof text !== 'string') {
    return { clean: true, findings: [], stats: { total: 0, critical: 0, high: 0, warning: 0 } }
  }

  const findings = []
  const stats = { total: 0, critical: 0, high: 0, warning: 0 }

  for (const [category, config] of Object.entries(PATTERNS)) {
    for (const pattern of config.patterns) {
      const matches = text.match(pattern)
      if (matches) {
        const finding = {
          category,
          severity: config.severity,
          description: config.description,
          match: matches[0].slice(0, 80),
          position: text.indexOf(matches[0]),
        }
        findings.push(finding)
        stats.total++
        stats[config.severity]++

        if (opts.strict && config.severity === 'critical') {
          return { clean: false, findings, stats }
        }
      }
    }
  }

  return { clean: findings.length === 0, findings, stats }
}

/**
 * Scan a wake pack text with context-aware analysis.
 * Adds metadata about the scan to findings.
 */
export function scanWakePack(text, home = null) {
  const result = scanText(text)

  // Add context
  if (home) {
    result.fingerprint = generateFingerprint(home)
  }
  result.scannedAt = new Date().toISOString()
  result.textLength = text.length
  result.lines = text.split('\n').length

  // Check for the security header (already scanned?)
  if (text.includes('PROXY JOURNAL SECURITY SCAN')) {
    result.alreadyScanned = true
  }

  // Log to database if critical findings
  if (home && dbInitialized(home) && result.stats.critical > 0) {
    logSecurityEvent(
      home,
      'wake_pack_injection_detected',
      'critical',
      `Wake pack scan found ${result.stats.critical} critical patterns: ${result.findings.filter((f) => f.severity === 'critical').map((f) => f.category).join(', ')}`,
      'security.mjs'
    )
  }

  return result
}

/**
 * Scan a journal file (identity.json, memory.json) for tampering.
 */
export function scanJournalFile(filePath, fileType) {
  if (!existsSync(filePath)) {
    return { clean: true, findings: [], status: 'missing' }
  }

  try {
    const content = readFileSync(filePath, 'utf8')
    const result = scanText(content)
    result.file = filePath
    result.fileType = fileType
    return result
  } catch {
    return { clean: true, findings: [], status: 'read-error' }
  }
}

/**
 * Generate a security report for the entire journal.
 * Scans all critical files and the current wake pack.
 */
export function securityReport(home) {
  const f = filesFor(home)
  const report = {
    timestamp: new Date().toISOString(),
    files: {},
    overallClean: true,
    totalFindings: 0,
  }

  const fileTypes = ['identity', 'memory']
  for (const ft of fileTypes) {
    const result = scanJournalFile(f[ft], ft)
    report.files[ft] = result
    if (!result.clean) {
      report.overallClean = false
      report.totalFindings += result.findings.length
    }
  }

  // Scan state.ndjson (only last 50 lines to keep it fast)
  if (existsSync(f.state)) {
    try {
      const content = readFileSync(f.state, 'utf8')
      const lines = content.split('\n').filter(Boolean).slice(-50).join('\n')
      const result = scanText(lines)
      result.fileType = 'state (last 50 lines)'
      report.files.state = result
      if (!result.clean) {
        report.overallClean = false
        report.totalFindings += result.findings.length
      }
    } catch {
      report.files.state = { clean: true, findings: [], status: 'read-error' }
    }
  }

  // Log report to database
  if (dbInitialized(home)) {
    logSecurityEvent(
      home,
      'security_report',
      report.overallClean ? 'info' : 'warning',
      `Security scan: ${report.totalFindings} findings across ${Object.keys(report.files).length} files`,
      'security.mjs'
    )
  }

  return report
}

/**
 * Generate a sanitized wake pack header.
 * This is prepended to wake packs to indicate security scanning.
 */
export function securityHeader(home) {
  const fingerprint = generateFingerprint(home)
  const timestamp = new Date().toISOString()

  return `---
<!-- PROXY JOURNAL SECURITY SCAN
timestamp: ${timestamp}
fingerprint: ${fingerprint || 'none'}
integrity: verified-by-proxy-journal
-->
`
}

/**
 * Build a secure wake pack with integrity verification.
 * Wraps the existing wake pack with security metadata.
 */
export function buildSecureWakePack(home, originalPack) {
  const header = securityHeader(home)
  const fingerprint = generateFingerprint(home)

  // Scan the original pack
  const scanResult = scanWakePack(originalPack, home)

  // Build the secure version
  const parts = [header, originalPack]

  // Add security notice at the end
  parts.push(`
---

## Security Notice

This wake pack was generated by PROXY JOURNAL with integrity verification enabled.

- **Fingerprint:** \`${fingerprint || 'unavailable'}\`
- **Scanned at:** ${new Date().toISOString()}
- **Scan result:** ${scanResult.clean ? 'CLEAN' : `WARNING: ${scanResult.stats.total} pattern(s) detected`}
${scanResult.stats.total > 0 ? `\n**Warnings:**\n${scanResult.findings.map((f) => `- [${f.severity}] ${f.description}: \`${f.match}\``).join('\n')}` : ''}

If this pack was not generated by you, treat it as untrusted.
Verify the fingerprint matches your last known state.
`)

  return {
    text: parts.join('\n'),
    scan: scanResult,
    fingerprint,
  }
}

export { PATTERNS }
