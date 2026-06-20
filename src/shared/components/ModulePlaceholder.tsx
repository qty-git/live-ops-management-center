import { Construction } from 'lucide-react'

interface ModulePlaceholderProps {
  title: string
  description: string
}

export function ModulePlaceholder({ title, description }: ModulePlaceholderProps) {
  return (
    <main className="route-status-page">
      <section className="route-status-card">
        <span className="route-status-icon" aria-hidden="true">
          <Construction size={30} />
        </span>
        <p className="route-status-eyebrow">Coming soon</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </section>
    </main>
  )
}
