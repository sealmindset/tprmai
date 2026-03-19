'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { MessageSquare, Save, History, Bot } from 'lucide-react'

interface ManagedPrompt {
  id: string
  slug: string
  name: string
  description: string | null
  category: string
  agentName: string | null
  content: string
  model: string | null
  temperature: number | null
  maxTokens: number | null
  isActive: boolean
  updatedBy: string | null
  updatedAt: string
  _count: { versions: number }
}

interface PromptVersion {
  id: string
  version: number
  content: string
  changeSummary: string | null
  changedBy: string | null
  createdAt: string
}

interface PromptDetail extends ManagedPrompt {
  versions: PromptVersion[]
}

const AGENTS = ['VERA', 'CARA', 'DORA', 'SARA', 'RITA', 'MARS']

export default function PromptsPage() {
  const [prompts, setPrompts] = useState<ManagedPrompt[]>([])
  const [loading, setLoading] = useState(true)
  const [filterAgent, setFilterAgent] = useState<string>('')
  const [search, setSearch] = useState('')

  // Editor state
  const [editPrompt, setEditPrompt] = useState<PromptDetail | null>(null)
  const [editContent, setEditContent] = useState('')
  const [changeSummary, setChangeSummary] = useState('')
  const [saving, setSaving] = useState(false)

  // Version history state
  const [historyPrompt, setHistoryPrompt] = useState<PromptDetail | null>(null)

  useEffect(() => {
    fetchPrompts()
  }, [filterAgent])

  async function fetchPrompts() {
    setLoading(true)
    const params = new URLSearchParams()
    if (filterAgent) params.set('agentName', filterAgent)
    const res = await fetch(`/api/admin/prompts?${params}`)
    if (res.ok) setPrompts(await res.json())
    setLoading(false)
  }

  async function openEditor(promptId: string) {
    const res = await fetch(`/api/admin/prompts/${promptId}`)
    if (res.ok) {
      const detail: PromptDetail = await res.json()
      setEditPrompt(detail)
      setEditContent(detail.content)
      setChangeSummary('')
    }
  }

  async function openHistory(promptId: string) {
    const res = await fetch(`/api/admin/prompts/${promptId}`)
    if (res.ok) {
      setHistoryPrompt(await res.json())
    }
  }

  async function savePrompt() {
    if (!editPrompt) return
    setSaving(true)

    const res = await fetch(`/api/admin/prompts/${editPrompt.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: editContent,
        changeSummary: changeSummary || undefined,
      }),
    })

    if (res.ok) {
      setEditPrompt(null)
      fetchPrompts()
    }
    setSaving(false)
  }

  async function toggleActive(prompt: ManagedPrompt) {
    await fetch(`/api/admin/prompts/${prompt.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !prompt.isActive }),
    })
    fetchPrompts()
  }

  const filtered = prompts.filter((p) => {
    if (search) {
      const q = search.toLowerCase()
      return (
        p.name.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q) ||
        p.agentName?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q)
      )
    }
    return true
  })

  const agentCounts = AGENTS.map((a) => ({
    name: a,
    count: prompts.filter((p) => p.agentName === a).length,
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MessageSquare className="h-6 w-6" />
          AI Prompt Management
        </h1>
        <p className="text-muted-foreground mt-1">
          Edit and manage AI agent prompts without redeploying
        </p>
      </div>

      {/* Agent filter cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <Card
          className={`cursor-pointer transition-colors ${
            !filterAgent ? 'border-primary bg-primary/5' : 'hover:border-primary/50'
          }`}
          onClick={() => setFilterAgent('')}
        >
          <CardContent className="p-3 text-center">
            <div className="text-lg font-bold">{prompts.length}</div>
            <div className="text-xs text-muted-foreground">All Prompts</div>
          </CardContent>
        </Card>
        {agentCounts.map((a) => (
          <Card
            key={a.name}
            className={`cursor-pointer transition-colors ${
              filterAgent === a.name ? 'border-primary bg-primary/5' : 'hover:border-primary/50'
            }`}
            onClick={() => setFilterAgent(filterAgent === a.name ? '' : a.name)}
          >
            <CardContent className="p-3 text-center">
              <div className="text-lg font-bold">{a.count}</div>
              <div className="text-xs text-muted-foreground">{a.name}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <Input
        placeholder="Search prompts..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      {/* Prompts table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {filterAgent ? `${filterAgent} Prompts` : 'All Prompts'} ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground py-8 text-center">Loading prompts...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agent</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Versions</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Bot className="h-4 w-4 text-muted-foreground" />
                        <span className="font-mono text-sm">{p.agentName || '—'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{p.name}</div>
                        <div className="text-xs text-muted-foreground font-mono">{p.slug}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{p.category}</Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">{p.model || '—'}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{p._count.versions}</span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={p.isActive ? 'low' : 'critical'}
                        className="cursor-pointer"
                        onClick={() => toggleActive(p)}
                      >
                        {p.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(p.updatedAt).toLocaleDateString()}
                      {p.updatedBy && (
                        <div className="text-xs">by {p.updatedBy}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button size="sm" variant="outline" onClick={() => openEditor(p.id)}>
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openHistory(p.id)}
                        disabled={p._count.versions === 0}
                      >
                        <History className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No prompts found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Editor Dialog */}
      <Dialog open={!!editPrompt} onOpenChange={() => setEditPrompt(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              Edit: {editPrompt?.name}
            </DialogTitle>
          </DialogHeader>
          {editPrompt && (
            <div className="space-y-4">
              <div className="flex gap-2 text-sm text-muted-foreground">
                <Badge variant="outline">{editPrompt.agentName}</Badge>
                <Badge variant="outline">{editPrompt.category}</Badge>
                <span className="font-mono">{editPrompt.slug}</span>
              </div>

              {editPrompt.description && (
                <p className="text-sm text-muted-foreground">{editPrompt.description}</p>
              )}

              <div>
                <label className="text-sm font-medium">Prompt Content</label>
                <textarea
                  className="w-full mt-1 p-3 rounded-md border bg-background font-mono text-sm min-h-[400px] resize-y"
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm font-medium">Change Summary (optional)</label>
                <Input
                  placeholder="What did you change and why?"
                  value={changeSummary}
                  onChange={(e) => setChangeSummary(e.target.value)}
                />
              </div>

              <div className="flex justify-between items-center">
                <div className="text-sm text-muted-foreground">
                  {editContent.length} characters
                  {editContent !== editPrompt.content && (
                    <span className="text-yellow-600 ml-2">Modified</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setEditContent(editPrompt.content)}>
                    Reset
                  </Button>
                  <Button
                    onClick={savePrompt}
                    disabled={saving || editContent === editPrompt.content}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Version History Dialog */}
      <Dialog open={!!historyPrompt} onOpenChange={() => setHistoryPrompt(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Version History: {historyPrompt?.name}
            </DialogTitle>
          </DialogHeader>
          {historyPrompt && (
            <div className="space-y-4">
              {historyPrompt.versions.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  No version history yet. Versions are created when you edit a prompt.
                </p>
              ) : (
                historyPrompt.versions.map((v) => (
                  <Card key={v.id}>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-sm font-medium">
                          Version {v.version}
                        </CardTitle>
                        <div className="text-xs text-muted-foreground">
                          {new Date(v.createdAt).toLocaleString()}
                          {v.changedBy && ` by ${v.changedBy}`}
                        </div>
                      </div>
                      {v.changeSummary && (
                        <p className="text-sm text-muted-foreground">{v.changeSummary}</p>
                      )}
                    </CardHeader>
                    <CardContent>
                      <pre className="text-xs font-mono bg-muted p-3 rounded-md overflow-x-auto whitespace-pre-wrap max-h-40">
                        {v.content}
                      </pre>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
