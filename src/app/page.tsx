import { createSupabaseServerClient } from '@/lib/supabase/server'
import { signInWithGoogle, signOut } from './auth/actions'
import VoteButtons from './components/VoteButtons'

interface CaptionImage {
  id: string
  url: string | null
  image_description: string | null
}

interface CaptionRow {
  id: string
  content: string
  created_datetime_utc: string
  image_id: string
  images: CaptionImage | CaptionImage[] | null
}

interface Caption {
  id: string
  content: string
  created_datetime_utc: string
  image_id: string
  image: CaptionImage | null
}

interface CaptionVote {
  caption_id: string
  vote_value: number
}

interface VoteCounts {
  [captionId: string]: { upvotes: number; downvotes: number }
}

async function getCaptions() {
  const supabase = createSupabaseServerClient()
  const { data, error } = await supabase
    .from('captions')
    .select(`
      id,
      content,
      created_datetime_utc,
      image_id,
      images (
        id,
        url,
        image_description
      )
    `)
    .eq('is_public', true)
    .order('created_datetime_utc', { ascending: false })
    .limit(20)

  if (error) {
    console.error('Error fetching captions:', error)
    return []
  }

  // Normalize: Supabase may return images as object or array
  return (data || []).map((row: CaptionRow) => {
    let image: CaptionImage | null = null
    if (Array.isArray(row.images)) {
      image = row.images[0] || null
    } else if (row.images) {
      image = row.images
    }
    return {
      id: row.id,
      content: row.content,
      created_datetime_utc: row.created_datetime_utc,
      image_id: row.image_id,
      image,
    }
  }) as Caption[]
}

async function getUserVotes(userId: string) {
  const supabase = createSupabaseServerClient()
  const { data, error } = await supabase
    .from('caption_votes')
    .select('caption_id, vote_value')
    .eq('profile_id', userId)

  if (error) {
    console.error('Error fetching user votes:', error)
    return []
  }

  return (data || []) as CaptionVote[]
}

async function getVoteCounts(captionIds: string[]): Promise<VoteCounts> {
  if (captionIds.length === 0) return {}

  const supabase = createSupabaseServerClient()
  const { data, error } = await supabase
    .from('caption_votes')
    .select('caption_id, vote_value')
    .in('caption_id', captionIds)

  if (error) {
    console.error('Error fetching vote counts:', error)
    return {}
  }

  const counts: VoteCounts = {}
  for (const id of captionIds) {
    counts[id] = { upvotes: 0, downvotes: 0 }
  }

  for (const vote of data || []) {
    if (counts[vote.caption_id]) {
      if (vote.vote_value > 0) counts[vote.caption_id].upvotes++
      else if (vote.vote_value < 0) counts[vote.caption_id].downvotes++
    }
  }

  return counts
}

export default async function Home() {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Not logged in — show login page
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">😂 Caption Rater</h1>
          <p className="text-gray-500 mb-8">Sign in to view and rate captions</p>
          <form action={signInWithGoogle}>
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 rounded-lg px-6 py-3 text-gray-700 font-medium hover:bg-gray-50 hover:shadow transition-all"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Sign in with Google
            </button>
          </form>
        </div>
      </div>
    )
  }

  // Logged in — fetch captions, votes, and vote counts
  const captions = await getCaptions()
  const captionIds = captions.map(c => c.id)
  const [userVotes, voteCounts] = await Promise.all([
    getUserVotes(user.id),
    getVoteCounts(captionIds),
  ])

  // Build a map of user's votes: caption_id -> vote_value
  const userVoteMap: { [captionId: string]: number } = {}
  for (const vote of userVotes) {
    userVoteMap[vote.caption_id] = vote.vote_value
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">😂 Caption Rater</h1>
            <p className="text-gray-500 text-sm mt-1">
              Signed in as {user.email}
            </p>
          </div>
          <form action={signOut}>
            <button
              type="submit"
              className="bg-white border border-gray-300 rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:shadow transition-all"
            >
              Sign out
            </button>
          </form>
        </div>

        {/* Captions list */}
        {captions.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-500 text-lg">No captions found</p>
            <p className="text-sm text-gray-400 mt-2">Check back later for new captions to rate!</p>
          </div>
        ) : (
          <div className="space-y-6">
            {captions.map((caption) => {
              const counts = voteCounts[caption.id] || { upvotes: 0, downvotes: 0 }
              const userVote = userVoteMap[caption.id] ?? null

              return (
                <div
                  key={caption.id}
                  className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow"
                >
                  {/* Image */}
                  {caption.image?.url && (
                    <div className="w-full bg-gray-100">
                      <img
                        src={caption.image.url}
                        alt={caption.image.image_description || 'Caption image'}
                        className="w-full h-64 object-contain"
                      />
                    </div>
                  )}

                  {/* Caption content and voting */}
                  <div className="p-5">
                    <p className="text-gray-800 text-lg mb-4 leading-relaxed">
                      &ldquo;{caption.content}&rdquo;
                    </p>

                    <div className="flex items-center justify-between">
                      <VoteButtons
                        captionId={caption.id}
                        userVote={userVote}
                        upvoteCount={counts.upvotes}
                        downvoteCount={counts.downvotes}
                      />
                      <span className="text-xs text-gray-400">
                        {new Date(caption.created_datetime_utc).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div className="mt-8 text-center text-sm text-gray-400">
          Showing {captions.length} captions
        </div>
      </div>
    </div>
  )
}
