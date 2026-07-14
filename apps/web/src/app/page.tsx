import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <h1 className="text-4xl font-bold mb-4">RA Community Management</h1>
      <p className="text-lg text-gray-600 mb-8">
        Residence Association Community Management System
      </p>
      <div className="flex gap-4">
        <Link
          href="/login"
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Login
        </Link>
        <Link
          href="/register"
          className="px-6 py-3 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
        >
          Register
        </Link>
      </div>
    </main>
  )
}
