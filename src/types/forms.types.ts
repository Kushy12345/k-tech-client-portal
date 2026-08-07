export type UUID = string;

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type QuestionType =
  | 'text'
  | 'textarea'
  | 'email'
  | 'phone'
  | 'number'
  | 'select'
  | 'multi-select'
  | 'radio'
  | 'checkbox'
  | 'date'
  | 'url'
  | 'file';

export interface FormTemplate {
  id: UUID;
  name: string;
  slug: string;
  description?: string | null;
  version: number;
  is_active: boolean;
  created_by?: UUID | null;
  created_at: string;
  updated_at: string;
}

export interface FormSection {
  id: UUID;
  template_id: UUID;
  title: string;
  description?: string | null;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface FormQuestion {
  id: UUID;
  template_id: UUID;
  section_id?: UUID | null;
  key?: string | null;
  label: string;
  placeholder?: string | null;
  help_text?: string | null;
  question_type: QuestionType;
  required: boolean;
  options?: Json;
  meta?: Record<string, Json> | null;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface QuestionOption {
  id: UUID;
  question_id: UUID;
  label: string;
  value: string;
  position: number;
}

export type SubmissionStatus = 'draft' | 'submitted' | 'under_review' | 'contacted' | 'converted' | 'archived';

export interface FormSubmission {
  id: UUID;
  template_id: UUID;
  user_id?: UUID | null;
  contact_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  business_name?: string | null;
  summary?: Record<string, Json> | null;
  status: SubmissionStatus;
  is_draft: boolean;
  created_at: string;
  updated_at: string;
  submitted_at?: string | null;
}

export interface FormAnswer {
  id: UUID;
  submission_id: UUID;
  question_id?: UUID | null;
  answer_text?: string | null;
  answer_json?: Json;
  created_at: string;
}

export interface SubmissionFile {
  id: UUID;
  submission_id: UUID;
  question_id?: UUID | null;
  storage_path: string;
  filename: string;
  mime_type?: string | null;
  size_bytes?: number | null;
  uploaded_at: string;
}
