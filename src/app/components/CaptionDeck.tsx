'use client'

import { useCallback, useState, useTransition } from 'react'
import {
  voteOnCaption,
  fetchNextCaptions,
  type DeckCaption,
} from '@/app/auth/actions'

interface Props {
  initialCaptions: DeckCaption[]
}

export default function CaptionDeck({ initialCaptions }: Props) {
  const [pool, setPool] = useState<DeckCaption[]>(initialCaptions)
  const [index, setIndex] = useState(0)
  const [voted, setVoted] = useState(0)
  const [exhausted, setExhausted] = useState(initialCaptions.length === 0)
  const [isPending, startTransition] = useTransition()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [lastVote, setLastVote] = useState<1 | -1 | null>(null)

  const current = pool[index] ?? null

  const advance = useCallback(async () => {
    const nextIdx = index + 1
    if (nextIdx < pool.length) {
      setIndex(nextIdx)
      return
    }
    // Pool drained — try to fetch more
    const more = await fetchNextCaptions(60)
    if (more.length === 0) {
      setExhausted(true)
      setPool([])
      setIndex(0)
    } else {
      setPool(more)
      setIndex(0)
    }
  }, [index, pool.length])

  const handleVote = (value: 1 | -1) => {
    if (!current || isPending) return
    setErrorMsg(null)
    setLastVote(value)
    startTransition(async () => {
      const res = await voteOnCaption(current.id, value)
      if ('error' in res && res.error) {
        setErrorMsg(res.error)
        setLastVote(null)
        return
      }
      setVoted(v => v + 1)
      await advance()
      setLastVote(null)
    })
  }

  const handleRefresh = () => {
    setErrorMsg(null)
    startTransition(async () => {
      const more = await fetchNextCaptions(60)
      if (more.length === 0) {
        setExhausted(true)
        setPool([])
        setIndex(0)
      } else {
        setExhausted(false)
        setPool(more)
        setIndex(0)
      }
    })
  }

  if (exhausted || !current) {
    return (
      <div className="bg-white rounded-xl shadow-md p-10 text-center">
        <div className="text-5xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          You&rsquo;ve rated everything!
        </h2>
        <p className="text-gray-500 mb-6">
          {voted > 0
            ? `Nice work — ${voted} caption${voted === 1 ? '' : 's'} rated this session.`
            : 'No new captions to rate right now.'}
        </p>
        <button
          onClick={handleRefresh}
          disabled={isPending}
          className="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          {isPending ? 'Checking…' : 'Check for new captions'}
        </button>
      </div>
    )
  }

  const remaining = pool.length - index

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden">
      {current.image?.url && (
        <div className="w-full bg-gray-100">
          <img
            key={current.id}
            src={current.image.url}
            alt={current.image.image_description || 'Caption image'}
            className="w-full h-72 object-contain"
          />
        </div>
      )}

      <div className="p-6">
        <p className="text-gray-800 text-xl leading-relaxed mb-6 text-center">
          &ldquo;{current.content}&rdquo;
        </p>

        <div className="flex items-center justify-center gap-4 mb-4">
          <button
            onClick={() => handleVote(1)}
            disabled={isPending}
            className={`flex-1 max-w-[200px] flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-base font-semibold transition-all ${
              isPending && lastVote === 1
                ? 'bg-green-100 text-green-700 border-2 border-green-400'
                : 'bg-green-50 text-green-700 border-2 border-green-300 hover:bg-green-100'
            } ${isPending ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <span className="text-xl">👍</span>
            <span>Funny</span>
          </button>

          <button
            onClick={() => handleVote(-1)}
            disabled={isPending}
            className={`flex-1 max-w-[200px] flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-base font-semibold transition-all ${
              isPending && lastVote === -1
                ? 'bg-red-100 text-red-700 border-2 border-red-400'
                : 'bg-red-50 text-red-700 border-2 border-red-300 hover:bg-red-100'
            } ${isPending ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <span className="text-xl">👎</span>
            <span>Not Funny</span>
          </button>
        </div>

        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>
            👍 {current.upvotes} &nbsp;·&nbsp; 👎 {current.downvotes}
          </span>
          <span>
            {remaining} more in this batch &nbsp;·&nbsp; {voted} rated
          </span>
        </div>

        {errorMsg && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-700">{errorMsg}</p>
          </div>
        )}
      </div>
    </div>
  )
}
