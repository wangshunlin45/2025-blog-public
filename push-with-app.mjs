import fs from 'node:fs'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { KJUR, KEYUTIL } = require('jsrsasign')

const APP_ID = '4837132'
const OWNER = 'wangshunlin45'
const REPO = '2025-blog-public'
const REPO_DIR = 'E:/GitHub/boke'

const keyPath = process.env.BLOG_KEY_PATH
if (!keyPath) throw new Error('BLOG_KEY_PATH is not set')
const pem = fs.readFileSync(keyPath, 'utf8')

function signJwt() {
	const header = { alg: 'RS256', typ: 'JWT' }
	const now = Math.floor(Date.now() / 1000)
	const payload = { iat: now - 60, exp: now + 600, iss: APP_ID }
	const key = KEYUTIL.getKey(pem)
	return KJUR.jws.JWS.sign('RS256', JSON.stringify(header), JSON.stringify(payload), key)
}

const base = 'https://api.github.com'
const headers = {
	Authorization: `Bearer ${signJwt()}`,
	Accept: 'application/vnd.github+json',
	'X-GitHub-Api-Version': '2022-11-28'
}

let res = await fetch(`${base}/repos/${OWNER}/${REPO}/installation`, { headers })
if (!res.ok) throw new Error(`installation lookup failed: ${res.status} ${await res.text()}`)
const { id: installationId } = await res.json()

res = await fetch(`${base}/app/installations/${installationId}/access_tokens`, { method: 'POST', headers })
if (!res.ok) throw new Error(`access token failed: ${res.status} ${await res.text()}`)
const { token } = await res.json()

const pushUrl = `https://x-access-token:${token}@github.com/${OWNER}/${REPO}.git`
execFileSync('git', ['-C', REPO_DIR, 'push', pushUrl, 'main'], {
	stdio: 'inherit',
	env: { ...process.env, GIT_TERMINAL_PROMPT: '0' }
})
console.log('push ok')
