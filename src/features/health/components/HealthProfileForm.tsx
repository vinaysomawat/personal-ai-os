'use client'

import { useState } from 'react'
import Modal, { modalLabelClass, modalInputClass, modalSelectClass, modalCancelButtonClass, modalSaveButtonClass } from '@/components/Modal'
import { upsertHealthProfile } from '../actions'
import { ACTIVITY_LEVELS } from '../types'
import type { HealthProfile, ActivityLevel, Gender } from '../types'
import { useEscapeKey } from '@/lib/use-escape-key'
import { useFormValidation } from '@/lib/use-form-validation'
import FieldError from '@/components/FieldError'

interface Props {
  profile: HealthProfile | null
  onClose: () => void
  onSaved: (profile: HealthProfile) => void
}

export default function HealthProfileForm({ profile, onClose, onSaved }: Props) {
  const [saving, setSaving] = useState(false)
  useEscapeKey(onClose)
  const { invalidFields, validate, onFieldInput } = useFormValidation()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!validate(e.currentTarget)) return
    setSaving(true)
    const fd = new FormData(e.currentTarget)
    const payload = {
      age: parseInt(fd.get('age') as string) || null,
      gender: (fd.get('gender') as Gender) || null,
      height_cm: parseFloat(fd.get('height_cm') as string) || null,
      target_weight_kg: null,
      activity_level: (fd.get('activity_level') as ActivityLevel) || null,
      workout_days_per_week: parseInt(fd.get('workout_days_per_week') as string) || null,
      food_preference: (fd.get('food_preference') as string) || null,
      goal_deadline: null,
    }
    await upsertHealthProfile(payload)
    onSaved({
      id: profile?.id ?? '',
      user_id: profile?.user_id ?? '',
      updated_at: new Date().toISOString(),
      ...payload,
    })
    setSaving(false)
  }

  return (
    <Modal title="Health Profile" onClose={onClose}>
      <p className="text-xs text-fg-tertiary mb-4">One-time setup — used to calculate your daily calorie/macro targets and health score. If your BMI is above normal, targets carry a gradual deficit toward a normal BMI (auto-computed from height, no target weight needed); otherwise they&apos;re maintenance. Your current weight comes from today&apos;s metric log.</p>
      <form onSubmit={handleSubmit} noValidate onInput={onFieldInput} className="flex flex-col gap-3.5">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={modalLabelClass}>Age</label>
            <input name="age" type="number" required defaultValue={profile?.age ?? ''} placeholder="29" className={modalInputClass(invalidFields.has('age'))} />
            <FieldError show={invalidFields.has('age')} />
          </div>
          <div>
            <label className={modalLabelClass}>Gender</label>
            <select name="gender" required defaultValue={profile?.gender ?? 'male'} className={modalSelectClass}>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
            <FieldError show={invalidFields.has('gender')} />
          </div>
        </div>
        <div>
          <label className={modalLabelClass}>Height (cm)</label>
          <input name="height_cm" type="number" required defaultValue={profile?.height_cm ?? ''} placeholder="183" className={modalInputClass(invalidFields.has('height_cm'))} />
          <FieldError show={invalidFields.has('height_cm')} />
        </div>
        <div>
          <label className={modalLabelClass}>Activity Level</label>
          <select name="activity_level" required defaultValue={profile?.activity_level ?? 'moderate'} className={modalSelectClass}>
            {ACTIVITY_LEVELS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
          </select>
          <FieldError show={invalidFields.has('activity_level')} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={modalLabelClass}>Workout Days / Week</label>
            <input name="workout_days_per_week" type="number" min="0" max="7" defaultValue={profile?.workout_days_per_week ?? ''} placeholder="4" className={modalInputClass()} />
          </div>
          <div>
            <label className={modalLabelClass}>Food Preference</label>
            <select name="food_preference" defaultValue={profile?.food_preference ?? 'nonveg'} className={modalSelectClass}>
              <option value="veg">Vegetarian</option>
              <option value="nonveg">Non-Vegetarian</option>
              <option value="vegan">Vegan</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-2.5 mt-1.5">
          <button type="button" onClick={onClose} className={modalCancelButtonClass}>Cancel</button>
          <button type="submit" disabled={saving} className={modalSaveButtonClass}>
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
