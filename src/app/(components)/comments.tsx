'use client'

import { useState, useEffect } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

interface CommentWrapper {
  id: string,
  type: string,
  event: string
}

interface Comment {
  id: number
  author: string
  content: string
  date: string
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

  const HTTP_DOMAIN = process.env.NEXT_PUBLIC_HTTP_DOMAIN || ''
  const REALTIME_DOMAIN = process.env.NEXT_PUBLIC_REALTIME_DOMAIN || ''
  const API_KEY = process.env.NEXT_PUBLIC_API_KEY || ''
  const auth = { 'x-api-key': API_KEY, host: HTTP_DOMAIN }

  useEffect(() => {
    const id = crypto.randomUUID()

    const getAuthProtocol = (): string => {
      const header = btoa(JSON.stringify(auth))
        .replace(/\+/g, '-') // Convert '+' to '-'
        .replace(/\//g, '_') // Convert '/' to '_'
        .replace(/=+$/, '') // Remove padding `=`
      return `header-${header}`
    }

    const connectWebSocket = async () => {
      try {

        const socket = new WebSocket(
          `wss://${REALTIME_DOMAIN}/event/realtime`,
          ['aws-appsync-event-ws', getAuthProtocol()])
        socket.onopen = () => {
          socket.send(JSON.stringify({ type: 'connection_init' }))
        }
        socket.onmessage = (event) => {
          const comment = JSON.parse(event.data) as CommentWrapper;

          if (comment.event) {
            handleWSMessage(JSON.parse(comment.event) as Comment);
          }
        }
        socket.onopen = () => socket.send(JSON.stringify({
          type: "subscribe",
          id: id,
          channel: "/default/comments",
          authorization: auth
        }));

        setSocket(socket);
      } catch (error) {
        console.error('Failed to connect to WebSocket:', error)
      }
    }

    connectWebSocket()

    // Cleanup function to close WebSocket connection when component unmounts
    return () => {
      if (socket) {
        socket.close()
      }
    }
  }, []) // Empty dependency array means this effect runs once on mount


  const handleWSMessage = (data: Comment) => {
    console.log(data)
    if (data.content) {
      (setComments([...comments, data]))
    }
    setNewComment("");
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newComment.trim() && socket) {
      const comment: Comment = {
        id: comments.length + 1,
        author: 'Current User',
        content: newComment.trim(),
        date: 'Just now'
      }
      const event = {
        "channel": "/default/comments",
        "events": [
          JSON.stringify(comment)
        ]
      }
      // Send the comment through HTTP as bidirectionality is not yet supported.
      await fetch(`https://${HTTP_DOMAIN}/event`, {
        method: "POST",
        headers: auth,
        body: JSON.stringify(event)
      })
      // Optimistically update the UI
      //setComments([...comments, comment])
      setNewComment("")
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-4">
        {comments.map((comment) => (
          <div key={comment.id} className="flex space-x-4 p-4 border rounded-lg">
            <Avatar>
              <AvatarImage src={""} alt={comment.author} />
              <AvatarFallback>{comment.author}</AvatarFallback>
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
        />
        <Button type="submit" disabled={!socket || !newComment.trim()}>
          Post Comment
        </Button>
      </form>
    </div>
  )
}
