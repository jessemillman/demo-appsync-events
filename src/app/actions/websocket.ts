'use server'

export async function getWebSocketAuth() {
  const HTTP_DOMAIN = process.env.NEXT_PUBLIC_HTTP_DOMAIN
  const API_KEY = process.env.API_KEY

  const auth = {
    'x-api-key': API_KEY!,
    host: HTTP_DOMAIN!
  }

  const header = btoa(JSON.stringify(auth))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

  return {
    auth: auth,
    protocol: `header-${header}`,
    domain: process.env.NEXT_PUBLIC_REALTIME_DOMAIN
  }
}
