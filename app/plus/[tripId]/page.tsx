import { redirect } from 'next/navigation'

interface PlusPageProps {
  params: Promise<{ tripId: string }>
}

export default async function PlusPage({ params }: PlusPageProps) {
  const { tripId } = await params
  redirect(`/pricing?tripId=${tripId}`)
}
