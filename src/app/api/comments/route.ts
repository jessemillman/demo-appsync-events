'use server'

const HTTP_DOMAIN = process.env.NEXT_PUBLIC_HTTP_DOMAIN
const API_KEY = process.env.API_KEY

export async function POST(request: Request) {
  const comment = await request.json()

  const event = {
    "channel": "/default/comments",
    "events": [JSON.stringify(comment)]
  }

  try {
    const response = await fetch(`https://${HTTP_DOMAIN}/event`, {
      method: "POST",
      headers: {
        'x-api-key': API_KEY!,
        'host': HTTP_DOMAIN!
      },
      body: JSON.stringify(event)
    })

    if (!response.ok) {
      throw new Error('Failed to post comment')
    }

    return Response.json({ success: true })
  } catch (error) {
    return Response.json({ success: false, error: 'Failed to post comment' }, { status: 500 })
  }
}

