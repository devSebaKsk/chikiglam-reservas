const WORKER_URL = 'https://chikiglam-api.pixelautomationar.workers.dev'

export async function onRequest({ request }) {
  const url = new URL(request.url)
  const targetUrl = `${WORKER_URL}${url.pathname}${url.search}`

  const headers = new Headers(request.headers)
  headers.delete('host')

  const response = await fetch(targetUrl, {
    method: request.method,
    headers,
    body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
  })

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  })
}
