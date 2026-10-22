#!/usr/bin/env node
/**
 * Safely resets a local user password on local Supabase without exposing it in logs or git.
 * Controlled local-only utility for local development accounts.
 *
 * Usage:
 *   node frontend-v2/scripts/reset-local-password.mjs [email]
 * Or:
 *   npm run reset-password --prefix frontend-v2
 */

import readline from 'readline'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321'
const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

const email = process.argv[2] || 'localhr@tpp.com'

async function promptPassword() {
  if (process.env.NEW_PASSWORD) {
    return process.env.NEW_PASSWORD
  }

  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    })

    process.stdout.write(`Enter new local password for ${email}: `)
    let password = ''

    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true)
      process.stdin.resume()
      process.stdin.setEncoding('utf8')

      process.stdin.on('data', function onData(char) {
        char = char.toString()
        if (char === '\n' || char === '\r' || char === '\u0004') {
          process.stdin.setRawMode(false)
          process.stdin.pause()
          process.stdout.write('\n')
          rl.close()
          resolve(password)
        } else if (char === '\u0003') {
          process.exit(1)
        } else if (char === '\u0008' || char === '\x7f') {
          if (password.length > 0) {
            password = password.slice(0, -1)
            process.stdout.write('\b \b')
          }
        } else {
          password += char
          process.stdout.write('*')
        }
      })
    } else {
      rl.question('', (answer) => {
        rl.close()
        resolve(answer.trim())
      })
    }
  })
}

async function main() {
  console.log('==========================================================')
  console.log(' Local Supabase Password Reset Utility (Local-Only)')
  console.log('==========================================================')
  console.log(`Target User: ${email}`)
  console.log(`Supabase Endpoint: ${SUPABASE_URL}`)

  const password = await promptPassword()
  if (!password) {
    console.error('Password cannot be empty.')
    process.exit(1)
  }

  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: usersData, error: listError } = await adminClient.auth.admin.listUsers()
  if (listError) {
    console.error('Failed to list users:', listError.message)
    process.exit(1)
  }

  const user = usersData.users.find((u) => u.email === email)
  if (!user) {
    console.error(`User '${email}' not found in local auth.users.`)
    process.exit(1)
  }

  const { error: updateError } = await adminClient.auth.admin.updateUserById(user.id, {
    password,
    email_confirm: true,
  })

  if (updateError) {
    console.error('Failed to update password:', updateError.message)
    process.exit(1)
  }

  console.log('')
  console.log(`[SUCCESS] Local password for ${email} has been updated.`)
  console.log(`Account ID: ${user.id}`)
  console.log('You can now log in at http://localhost:5174/login (or http://localhost:5173/login).')
}

main().catch((err) => {
  console.error('Unexpected error:', err.message)
  process.exit(1)
})
