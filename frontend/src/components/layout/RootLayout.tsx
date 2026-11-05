import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'
import BottomNav from './BottomNav'
import Toast from '@components/ui/Toast'

export default function RootLayout() {
  return (
    <div className="flex justify-center bg-zinc-950 min-h-screen">
      <div className="w-full max-w-[430px] min-h-screen flex flex-col relative">
        <Navbar />
        <main className="flex-1 overflow-y-auto pb-20">
          <Outlet />
        </main>
        <BottomNav />
        <Toast />
      </div>
    </div>
  )
}
