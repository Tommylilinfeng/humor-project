'use client'

import { useState, useTransition } from 'react'
import { voteOnCaption } from '@/app/auth/actions'

interface VoteButtonsProps {
  captionId: string
  userVote: number | null  // 1, -1, or null
  upvoteCount: number
  downvoteCount: number
}

export default function VoteButtons({ captionId, userVote, upvoteCount, downvoteCount }: VoteButtonsProps) {
  const [isPending, startTransition] = useTransition()
  const [optimisticVote, setOptimisticVote] = useState<number | null>(userVote)
  const [optimisticUpvotes, setOptimisticUpvotes] = useState(upvoteCount)
  const [optimisticDownvotes, setOptimisticDownvotes] = useState(downvoteCount)

  const handleVote = (voteValue: number) => {
    // Optimistic update
    if (optimisticVote === voteValue) {
      // Toggle off
      setOptimisticVote(null)
      if (voteValue === 1) setOptimisticUpvotes(prev => prev - 1)
      else setOptimisticDownvotes(prev => prev - 1)
    } else {
      // New vote or switch
      if (optimisticVote === 1) setOptimisticUpvotes(prev => prev - 1)
      if (optimisticVote === -1) setOptimisticDownvotes(prev => prev - 1)
      setOptimisticVote(voteValue)
      if (voteValue === 1) setOptimisticUpvotes(prev => prev + 1)
      else setOptimisticDownvotes(prev => prev + 1)
    }

    startTransition(async () => {
      const result = await voteOnCaption(captionId, voteValue)
      if (result.error) {
        // Revert on error
        setOptimisticVote(userVote)
        setOptimisticUpvotes(upvoteCount)
        setOptimisticDownvotes(downvoteCount)
      }
    })
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => handleVote(1)}
        disabled={isPending}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
          optimisticVote === 1
            ? 'bg-green-100 text-green-700 border-2 border-green-400'
            : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-green-50 hover:text-green-600'
        } ${isPending ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <span className="text-lg">👍</span>
        <span>Funny</span>
        <span className="ml-1 text-xs bg-white/60 rounded px-1.5 py-0.5">{optimisticUpvotes}</span>
      </button>

      <button
        onClick={() => handleVote(-1)}
        disabled={isPending}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
          optimisticVote === -1
            ? 'bg-red-100 text-red-700 border-2 border-red-400'
            : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-red-50 hover:text-red-600'
        } ${isPending ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <span className="text-lg">👎</span>
        <span>Not Funny</span>
        <span className="ml-1 text-xs bg-white/60 rounded px-1.5 py-0.5">{optimisticDownvotes}</span>
      </button>
    </div>
  )
}
