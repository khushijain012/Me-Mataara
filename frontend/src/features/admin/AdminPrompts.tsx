import { useState } from 'react'
import { Plus, Trash2, MessageSquareText } from 'lucide-react'
import { useApp } from '@/context/AppContext'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button, Input, SectionTitle } from '@/components/ui'
import { nextId } from '@/lib/utils'

export function AdminPrompts() {
  // Supervisor preset prompts are live — they feed the response dropdown.
  const { prompts, savePrompts } = useApp()
  const [newR, setNewR] = useState('')

  return (
    <div className="space-y-8">
      <PageHeader title="Prompts" subtitle="The preset responses supervisors can pick from" />

      {/* Supervisor preset responses — persisted, feed the live response dropdown */}
      <section>
        <SectionTitle>
          <span className="flex items-center gap-2">
            <MessageSquareText className="h-5 w-5 text-kokowai-600" /> Supervisor preset responses
          </span>
        </SectionTitle>
        <div className="card p-4">
          <div className="flex flex-wrap gap-2">
            {prompts.map((p) => (
              <span
                key={p.id}
                className="group inline-flex items-center gap-2 rounded-full bg-sand-100 py-1.5 pl-3.5 pr-2 text-sm text-ink"
              >
                {p.label}
                <button
                  onClick={() => savePrompts(prompts.filter((x) => x.id !== p.id))}
                  className="focus-ring rounded-full p-0.5 text-ink-faint hover:text-kokowai-600"
                  aria-label={`Remove ${p.label}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            <Input placeholder="Add a preset response…" value={newR} onChange={(e) => setNewR(e.target.value)} />
            <Button
              variant="secondary"
              icon={<Plus className="h-4 w-4" />}
              disabled={!newR.trim()}
              onClick={() => {
                savePrompts([...prompts, { id: nextId('p'), label: newR.trim() }])
                setNewR('')
              }}
            >
              Add
            </Button>
          </div>
          <p className="mt-3 text-xs text-ink-faint">
            These appear in the supervisor’s “Quick prompt” dropdown when responding to a concern.
          </p>
        </div>
      </section>
    </div>
  )
}
