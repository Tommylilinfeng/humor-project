import { createSupabaseServerClient } from '@/lib/supabase/server'
import Link from 'next/link'
import {
  signInWithGoogle,
  signOut,
  fetchNextCaptions,
} from './auth/actions'
import CaptionDeck from './components/CaptionDeck'
import ImageUpload from './components/ImageUpload'

export const dynamic = 'force-dynamic'

type TabKey = 'rate' | 'upload'

export default async function Home({
  searchParams,
}: {
  searchParams?: { tab?: string }
}) {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-stone-200 p-10 text-center">
          <h1 className="text-3xl font-serif tracking-tight text-stone-900 mb-2">
            Caption Rater
          </h1>
          <p className="text-stone-500 mb-8 text-sm">
            Rate AI-generated captions, one at a time.
          </p>
          <form action={signInWithGoogle}>
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-3 bg-stone-900 text-white rounded-lg px-6 py-3 font-medium hover:bg-stone-800 transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#fff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                <path fill="#fff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" opacity="0.9"/>
                <path fill="#fff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" opacity="0.7"/>
                <path fill="#fff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" opacity="0.85"/>
              </svg>
              Continue with Google
            </button>
          </form>
        </div>
      </div>
    )
  }

  const tab: TabKey = searchParams?.tab === 'upload' ? 'upload' : 'rate'
  const initialCaptions = tab === 'rate' ? await fetchNextCaptions(60) : []

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="border-b border-stone-200 bg-white">
        <div className="max-w-3xl mx-auto px-6 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-serif tracking-tight text-stone-900">
              Caption Rater
            </h1>
            <p className="text-xs text-stone-500 mt-0.5">{user.email}</p>
          </div>
          <form action={signOut}>
            <button
              type="submit"
              className="text-sm text-stone-500 hover:text-stone-900 transition-colors"
            >
              Sign out
            </button>
          </form>
        </div>

        <nav className="max-w-3xl mx-auto px-6 flex gap-6 -mb-px">
          <TabLink current={tab} target="rate" label="Rate" />
          <TabLink current={tab} target="upload" label="Upload" />
        </nav>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        {tab === 'rate' ? (
          <section>
            <div className="mb-6">
              <h2 className="text-2xl font-serif text-stone-900 mb-1">
                Rate the next caption
              </h2>
              <p className="text-sm text-stone-500">
                One image, one caption. Mark it funny or not — the next one loads automatically.
              </p>
            </div>
            <CaptionDeck initialCaptions={initialCaptions} />
          </section>
        ) : (
          <section>
            <div className="mb-6">
              <h2 className="text-2xl font-serif text-stone-900 mb-1">
                Upload an image
              </h2>
              <p className="text-sm text-stone-500">
                Upload your own image and the model will generate fresh captions for it.
              </p>
            </div>
            <ImageUpload />
          </section>
        )}
      </main>
    </div>
  )
}

function TabLink({
  current,
  target,
  label,
}: {
  current: TabKey
  target: TabKey
  label: string
}) {
  const active = current === target
  return (
    <Link
      href={target === 'rate' ? '/' : `/?tab=${target}`}
      className={`pb-3 text-sm border-b-2 transition-colors ${
        active
          ? 'border-stone-900 text-stone-900 font-medium'
          : 'border-transparent text-stone-500 hover:text-stone-900'
      }`}
    >
      {label}
    </Link>
  )
}
