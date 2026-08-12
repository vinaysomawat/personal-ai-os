// Shared deterministic cross-module signal type (Product Principle 4: modules
// should connect; Product Principle 2: rule engine before AI — signals are
// plain functions over already-fetched data, never an AI call).
//
// Each module owns its own signal-producing functions (see
// src/features/*/signals.ts) and returns a Signal | null. Consumers (e.g.
// Dashboard's Today's Focus) aggregate and rank via rankSignals() instead of
// hand-rolling their own candidate list per widget.

type ModuleName = 'planner' | 'career' | 'finance' | 'health' | 'learning' | 'coding'

export interface Signal {
  id: string
  module: ModuleName
  weight: number
  emoji: string
  message: string
  href: string
}

export function rankSignals(signals: Signal[], limit: number): Signal[] {
  return [...signals].sort((a, b) => b.weight - a.weight).slice(0, limit)
}
