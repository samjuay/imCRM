/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum UserRole {
  COMPANY_ADMIN = 'company_admin',
  TEAM_LEADER = 'team_leader',
  SALES_EXECUTIVE = 'sales_executive'
}

export enum LeadStatus {
  NEW = 'New',
  ATTEMPTED = 'Attempted',
  CONNECTED = 'Connected',
  FOLLOWUP_SCHEDULED = 'Followup Scheduled',
  INTERESTED = 'Interested',
  SITE_VISIT_SCHEDULED = 'Site Visit Scheduled',
  SITE_VISIT_DONE = 'Site Visit Done',
  NEGOTIATION = 'Negotiation',
  BOOKING_DONE = 'Booking Done',
  NOT_INTERESTED = 'Not Interested',
  LOST = 'Lost',
  INVALID = 'Invalid'
}

export enum ColdStatus {
  NEW = 'New',
  ATTEMPTED = 'Attempted',
  CONNECTED = 'Connected',
  FOLLOWUP_REQUIRED = 'Followup Required',
  INTERESTED = 'Interested',
  NOT_INTERESTED = 'Not Interested',
  WRONG_NUMBER = 'Wrong Number',
  DUPLICATE = 'Duplicate',
  CONVERTED_TO_LEAD = 'Converted To Lead'
}

export enum SiteVisitStatus {
  SCHEDULED = 'scheduled',
  CONFIRMED = 'confirmed',
  VISITED = 'visited',
  CANCELLED = 'cancelled'
}

export interface Company {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  company_id: string;
  full_name: string;
  phone: string;
  email: string;
  role: UserRole;
  team_id?: string; // Linked to Team
  is_active: boolean;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Team {
  id: string;
  company_id: string;
  name: string;
  team_leader_id: string; // User ID
  created_at: string;
  updated_at: string;
}

export interface LeadSource {
  id: string;
  company_id: string;
  name: string; // "Builder Website", "Referral", "Cold Call", etc.
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Lead {
  id: string;
  company_id: string;
  full_name: string;
  phone: string;
  alternate_phone?: string;
  email?: string;
  city?: string;
  location?: string;
  source_id: string; // Linked to LeadSource
  project_interests: string[]; // List of project IDs
  budget_min?: number;
  budget_max?: number;
  bedroom_preference?: string; // e.g. "1BHK", "2BHK", "3BHK"
  status: LeadStatus;
  assigned_to: string; // User ID
  booking_amount?: number;
  booking_date?: string;
  converted_from_cold_id?: string;
  created_by: string; // User ID
  created_at: string;
  updated_at: string;
}

export interface LeadStatusUpdate {
  id: string;
  lead_id: string;
  company_id: string;
  user_id: string;
  previous_status: LeadStatus | string;
  new_status: LeadStatus | string;
  outcome?: string; // stores outcome
  remark?: string;  // stores remark/notes
  created_at: string;
}

export interface Followup {
  id: string;
  lead_id: string;
  company_id: string;
  user_id: string;
  scheduled_at: string; // TIMESTAMPTZ
  type: 'Call' | 'WhatsApp' | 'In-Person';
  notes?: string; // agenda
  completed: boolean;
  completed_at?: string;
  outcome_notes?: string;
  created_at: string;
}

export interface SiteVisit {
  id: string;
  lead_id: string;
  project_id: string;
  company_id: string;
  user_id: string;
  scheduled_date: string; // YYYY-MM-DD
  scheduled_time: string; // HH:MM
  visitors_count: number;
  transport_arranged: boolean;
  status: SiteVisitStatus;
  visited_at?: string;
  feedback?: string;
  created_at: string;
}

export interface ColdData {
  id: string;
  company_id: string;
  full_name: string;
  phone: string;
  alternate_phone?: string;
  city?: string;
  location?: string;
  source_id: string; // Linked to LeadSource
  notes?: string;
  status: ColdStatus;
  assigned_to: string; // User ID
  converted_lead_id?: string;
  created_by: string; // User ID
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  company_id: string;
  name: string;
  builder_name: string;
  rera_number?: string;
  city: string;
  location?: string;
  description?: string;
  amenities: string[]; // JSONB represented as string array
  possession_date?: string; // Date
  status: 'active' | 'sold_out' | 'on_hold';
  created_at: string;
  totalUnits?: number;
  availableUnits?: number;
  priceRange?: { min: number; max: number };
  configurations?: string[];
}

export interface ProjectConfiguration {
  id: string;
  project_id: string;
  company_id: string;
  configuration_type: string; // "1BHK" | "2BHK" | "3BHK"
  carpet_area: number; // in sqft
  price: number;
  unit_count: number;
  created_at: string;
  updated_at: string;
}

export interface DashboardStats {
  leadsWithoutFollowup: number;
  followupsDueToday: number;
  overdueFollowups: number;
  upcomingFollowups: number;
  siteVisitsToday: number;
  upcomingSiteVisits: number;
  totalUsers?: number;
  totalTeams?: number;
  totalLeads?: number;
  totalLeadSources?: number;
  kpiJustification?: any;
}

export interface Activity {
  id: string;
  company_id: string;
  lead_id: string;
  user_id: string;
  team_id?: string;
  activity_type: string;
  previous_status?: string;
  new_status?: string;
  created_at: string;
  created_by?: string;
  notes?: string;
}

export function getInitials(fullName: string | null | undefined): string {
  if (!fullName) return "??";
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return "??";
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
