import { redirect } from 'next/navigation'

export default function Home() {
  // Automatically send the user to the prediction page
  redirect('/predict')
}