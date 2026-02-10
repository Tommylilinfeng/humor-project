import { supabase } from '@/lib/supabase'

// 大学数据类型
interface University {
  id: number
  name: string
  created_at: string
  updated_at: string
}

// 从 Supabase 获取大学列表
async function getUniversities() {
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
  const universities = await getUniversities()

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-2 text-gray-800">
          🎓 Universities
        </h1>
        <p className="text-center text-gray-500 mb-8">
          Data from Supabase
        </p>
        
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
