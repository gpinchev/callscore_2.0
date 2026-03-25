export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      organizations: {
        Row: Organization;
        Insert: OrganizationInsert;
        Update: OrganizationUpdate;
        Relationships: [];
      };
      technicians: {
        Row: Technician;
        Insert: TechnicianInsert;
        Update: TechnicianUpdate;
        Relationships: [];
      };
      eval_criteria: {
        Row: EvalCriteria;
        Insert: EvalCriteriaInsert;
        Update: EvalCriteriaUpdate;
        Relationships: [];
      };
      few_shot_examples: {
        Row: FewShotExample;
        Insert: FewShotExampleInsert;
        Update: FewShotExampleUpdate;
        Relationships: [];
      };
      transcripts: {
        Row: Transcript;
        Insert: TranscriptInsert;
        Update: TranscriptUpdate;
        Relationships: [];
      };
      eval_results: {
        Row: EvalResult;
        Insert: EvalResultInsert;
        Update: EvalResultUpdate;
        Relationships: [];
      };
      eval_templates: {
        Row: EvalTemplate;
        Insert: EvalTemplateInsert;
        Update: EvalTemplateUpdate;
        Relationships: [];
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
    CompositeTypes: {};
  };
};

// ============================================================
// Organizations
// ============================================================
export interface Organization {
  id: string;
  name: string;
  industry: string;
  company_size: string | null;
  onboarding_completed: boolean;
  notification_email: string[] | null;
  call_taxonomy: Json | null;
  created_at: string;
  updated_at: string;
}

export interface OrganizationInsert {
  id?: string;
  name: string;
  industry: string;
  company_size?: string | null;
  onboarding_completed?: boolean;
  notification_email?: string[] | null;
  call_taxonomy?: Json | null;
}

export interface OrganizationUpdate {
  name?: string;
  industry?: string;
  company_size?: string | null;
  onboarding_completed?: boolean;
  notification_email?: string[] | null;
  call_taxonomy?: Json | null;
}

// ============================================================
// Technicians
// ============================================================
export interface Technician {
  id: string;
  organization_id: string;
  name: string;
  role: string | null;
  specialties: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface TechnicianInsert {
  id?: string;
  organization_id: string;
  name: string;
  role?: string | null;
  specialties?: string[] | null;
}

export interface TechnicianUpdate {
  name?: string;
  role?: string | null;
  specialties?: string[] | null;
}

// ============================================================
// Eval Criteria
// ============================================================
export interface EvalCriteria {
  id: string;
  organization_id: string;
  name: string;
  description: string;
  category: string | null;
  call_intent: string | null;
  call_intents: string[];
  is_active: boolean;
  notify_on_fail: boolean;
  sort_order: number;
  status: string;
  target_pass_rate: number;
  created_at: string;
  updated_at: string;
}

export interface EvalCriteriaInsert {
  id?: string;
  organization_id: string;
  name: string;
  description: string;
  category?: string | null;
  call_intent?: string | null;
  call_intents?: string[];
  is_active?: boolean;
  notify_on_fail?: boolean;
  sort_order?: number;
  status?: string;
  target_pass_rate?: number;
}

export interface EvalCriteriaUpdate {
  name?: string;
  description?: string;
  category?: string | null;
  call_intent?: string | null;
  call_intents?: string[];
  is_active?: boolean;
  notify_on_fail?: boolean;
  sort_order?: number;
  status?: string;
  target_pass_rate?: number;
}

// ============================================================
// Few-Shot Examples
// ============================================================
export interface FewShotExample {
  id: string;
  eval_criteria_id: string;
  example_type: string;
  transcript_snippet: string;
  explanation: string | null;
  created_at: string;
}

export interface FewShotExampleInsert {
  id?: string;
  eval_criteria_id: string;
  example_type: string;
  transcript_snippet: string;
  explanation?: string | null;
}

export interface FewShotExampleUpdate {
  example_type?: string;
  transcript_snippet?: string;
  explanation?: string | null;
}

// ============================================================
// Customers
// ============================================================
export interface Customer {
  id: string;
  organization_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CustomerInsert {
  id?: string;
  organization_id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
}

export interface CustomerUpdate {
  name?: string;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
}

// ============================================================
// Transcripts
// ============================================================
export interface Transcript {
  id: string;
  organization_id: string;
  technician_id: string | null;
  customer_id: string | null;
  source: string;
  raw_transcript: string;
  diarized_transcript: Json | null;
  summary: string | null;
  audio_url: string | null;
  audio_duration_seconds: number | null;
  service_type: string | null;
  location: string | null;
  call_type: string | null;
  call_intent: string | null;
  call_outcome: string | null;
  metadata: Json;
  eval_status: string;
  eval_cost_usd: number | null;
  eval_prompt_tokens: number | null;
  eval_completion_tokens: number | null;
  created_at: string;
  updated_at: string;
}

export interface TranscriptInsert {
  id?: string;
  organization_id: string;
  technician_id?: string | null;
  customer_id?: string | null;
  source: string;
  raw_transcript: string;
  diarized_transcript?: Json | null;
  summary?: string | null;
  audio_url?: string | null;
  audio_duration_seconds?: number | null;
  service_type?: string | null;
  location?: string | null;
  call_type?: string | null;
  call_intent?: string | null;
  call_outcome?: string | null;
  metadata?: Json;
  eval_status?: string;
  eval_cost_usd?: number | null;
  eval_prompt_tokens?: number | null;
  eval_completion_tokens?: number | null;
}

export interface TranscriptUpdate {
  technician_id?: string | null;
  customer_id?: string | null;
  source?: string;
  raw_transcript?: string;
  diarized_transcript?: Json | null;
  summary?: string | null;
  audio_url?: string | null;
  audio_duration_seconds?: number | null;
  service_type?: string | null;
  location?: string | null;
  call_type?: string | null;
  call_intent?: string | null;
  call_outcome?: string | null;
  metadata?: Json;
  eval_status?: string;
  eval_cost_usd?: number | null;
  eval_prompt_tokens?: number | null;
  eval_completion_tokens?: number | null;
}

// ============================================================
// Eval Results
// ============================================================
export interface EvalResult {
  id: string;
  transcript_id: string;
  eval_criteria_id: string;
  passed: boolean | null;
  confidence: number | null;
  reasoning: string | null;
  transcript_excerpt: string | null;
  excerpt_start_index: number | null;
  excerpt_end_index: number | null;
  eval_run_id: string | null;
  created_at: string;
}

export interface EvalResultInsert {
  id?: string;
  transcript_id: string;
  eval_criteria_id: string;
  passed?: boolean | null;
  confidence?: number | null;
  reasoning?: string | null;
  transcript_excerpt?: string | null;
  excerpt_start_index?: number | null;
  excerpt_end_index?: number | null;
  eval_run_id?: string | null;
}

export interface EvalResultUpdate {
  passed?: boolean | null;
  confidence?: number | null;
  reasoning?: string | null;
  transcript_excerpt?: string | null;
  excerpt_start_index?: number | null;
  excerpt_end_index?: number | null;
}

// ============================================================
// Eval Templates
// ============================================================
export interface EvalTemplateCriteria {
  name: string;
  description: string;
  category: string;
}

export interface EvalTemplate {
  id: string;
  name: string;
  description: string | null;
  industry: string | null;
  criteria: EvalTemplateCriteria[];
  is_default: boolean;
  created_at: string;
}

export interface EvalTemplateInsert {
  id?: string;
  name: string;
  description?: string | null;
  industry?: string | null;
  criteria: EvalTemplateCriteria[];
  is_default?: boolean;
}

export interface EvalTemplateUpdate {
  name?: string;
  description?: string | null;
  industry?: string | null;
  criteria?: EvalTemplateCriteria[];
  is_default?: boolean;
}
