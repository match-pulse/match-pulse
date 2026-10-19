import { redirect } from 'next/navigation'

const DEMO_MARKET_ID = '33333333-3333-3333-3333-333333333333'

export default function Home() {
  redirect(`/market/${DEMO_MARKET_ID}`)
}
