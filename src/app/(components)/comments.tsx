'use client'

import { useState, useEffect, useCallback } from 'react'
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { getWebSocketAuth } from '@/app/actions/websocket'

interface Comment {
  id: number
  author: string
  content: string
  date: string
}

interface CommentWrapper {
  id: string
  type: string
  event: string
}

export default function Comments(): JSX.Element {
  const [comments, setComments] = useState<Comment[]>([
    {
      id: 1,
      author: 'Alice Johnson',
      content: 'Great article! I learned a lot from this.',
      date: '2 days ago'
    },
    {
      id: 2,
      author: 'Bob Smith',
      content: 'I have a question about the third point. Can you elaborate more on that?',
      date: '1 day ago'
    }
  ])
  const [newComment, setNewComment] = useState('')
  const [socket, setSocket] = useState<WebSocket | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleWSMessage = useCallback((data: Comment) => {
    if (data.content) {
      setComments(prevComments => {
        const exists = prevComments.some(comment => comment.id === data.id)
        if (exists) {
          return prevComments
        }
        return [...prevComments, data]
      })
    }
  }, [])

  useEffect(() => {
    const id = crypto.randomUUID()
    let ws: WebSocket

    const connectWebSocket = async () => {
      try {
        const { protocol, domain, auth } = await getWebSocketAuth()

        ws = new WebSocket(
          `wss://${domain}/event/realtime`,
          ['aws-appsync-event-ws', protocol]
        )

        ws.onopen = () => {
          ws.send(JSON.stringify({
            type: "subscribe",
            id: id,
            channel: "/default/comments",
            authorization: auth // be aware here you are passing a key client side, this is where stronger auth options really matter outside of a demo.
          }))
        }

        ws.onmessage = (event) => {
          const comment = JSON.parse(event.data) as CommentWrapper
          if (comment.event) {
            handleWSMessage(JSON.parse(comment.event) as Comment)
          }
        }

        ws.onerror = (error) => {
          console.error('WebSocket error:', error)
          setError('Failed to connect to chat server')
        }

        setSocket(ws)
      } catch (error) {
        console.error('Failed to connect to WebSocket:', error)
        setError('Failed to connect to chat server')
      }
    }

    connectWebSocket()

    return () => {
      if (ws) {
        ws.close()
      }
    }
  }, [handleWSMessage])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim() || isSubmitting) return

    setIsSubmitting(true)
    setError(null)

    const comment: Comment = {
      id: comments.length + 1,
      author: 'Current User',
      content: newComment.trim(),
      date: 'Just now'
    }

    try {
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(comment)
      })

      if (!response.ok) {
        throw new Error('Failed to post comment')
      }

      setNewComment('')
    } catch (error) {
      setError('Failed to post comment. Please try again.')
      console.error('Error posting comment:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-4 mx-24 my-24">
      {error && (
        <div className="p-4 text-red-500 bg-red-50 rounded-lg">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {comments.map((comment) => (
          <div key={comment.id} className="flex space-x-4 p-4 border rounded-lg">
            <Avatar>
              <AvatarFallback>{comment.author[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <h4 className="font-bold">{comment.author}</h4>
                <span className="text-gray-500 text-sm">{comment.date}</span>
              </div>
              <p className="mt-1">{comment.content}</p>
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Write a comment..."
          className="w-full"
          disabled={isSubmitting}
        />
        <Button
          type="submit"
          disabled={!socket || !newComment.trim() || isSubmitting}
        >
          {isSubmitting ? 'Posting...' : 'Post Comment'}
        </Button>
      </form>
    </div>
  )
}
