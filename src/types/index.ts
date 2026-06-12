export type UserRole = 'reporter' | 'cleaner' | 'admin'
export type ReportStatus = 'pending' | 'in_progress' | 'completed'
export type Severity = 'low' | 'medium' | 'high' | 'critical'
export type Priority = 'low' | 'medium' | 'high' | 'urgent'
export type AssignmentStatus = 'assigned' | 'in_progress' | 'completed'
export type BinStatus = 'empty' | 'half_full' | 'full' | 'LOW' | 'MEDIUM' | 'HIGH' | 'FULL'
export type WasteType = 'mixed_waste' | 'plastic' | 'paper' | 'metal' | 'glass' | 'food_waste' | 'electronic' | 'hazardous' | 'other'

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  avatar_url?: string
  created_at: string
}

export interface Report {
  id: string
  user_id: string
  image_url?: string
  description?: string
  latitude: number
  longitude: number
  address?: string
  waste_type?: WasteType
  severity: Severity
  priority: Priority
  status: ReportStatus
  created_at: string
  updated_at: string
}

export interface Cleaner {
  id: string
  user_id: string
  name: string
  email: string
  phone?: string
  latitude?: number
  longitude?: number
  is_active: boolean
  updated_at: string
  created_at: string
}

export interface SmartBin {
  id: string
  bin_id: string
  name: string
  latitude?: number
  longitude?: number
  fill_level: number
  status: BinStatus
  last_updated: string
  created_at: string
}

export interface Assignment {
  id: string
  report_id: string
  cleaner_id: string
  assigned_at: string
  completed_at?: string
  status: AssignmentStatus
  distance_km?: number
  notes?: string
  report?: Report
  cleaner?: Cleaner
}
