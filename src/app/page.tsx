import { createSupabaseServerClient } from '@/lib/supabase/server'
import { signInWithGoogle, signOut } from './auth/actions'

interface University {
  id: number
  name: string
  created_at: string
  updated_at: string
}

async function getUniversities() {
  const supabase = createSupabaseServerClient()
  const { data, error } = await supabase
    .from('universities')
    .select('*')
    .order('name', { ascending: true })

  if (error) {
    console.error('Error fetching universities:', error)
    return []
  }

  return data as University[]
}

export default async function Home() {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Not logged in — show login page
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">🎓 Universities</h1>
          <p className="text-gray-500 mb-8">Sign in to view university data</p>
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

  // Logged in — show protected content
  const universities = await getUniversities()

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header with user info and sign out */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">🎓 Universities</h1>
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

        {universities.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-500">No universities found</p>
            <p className="text-sm text-gray-400 mt-2">Check your Supabase connection</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {universities.map((uni, index) => (
              <div
                key={uni.id}
                className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow border-l-4 border-blue-500"
              >
                <div className="flex items-center gap-3">
                  <span className="flex items-center justify-center w-10 h-10 bg-blue-100 text-blue-600 rounded-full text-lg font-bold">
                    {index + 1}
                  </span>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-800">
                      {uni.name}
                    </h2>
                    <p className="text-sm text-gray-400">
                      ID: {uni.id}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 text-center text-sm text-gray-400">
          Total: {universities.length} universities
        </div>
      </div>
    </div>
  )
}
