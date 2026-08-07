import type { Json } from './forms.types';

type Table<Row, Insert, Update> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

type TemplateRow = {
  id: string; name: string; slug: string; description: string | null; version: number;
  is_active: boolean; created_by: string | null; created_at: string; updated_at: string;
};
type SectionRow = { id: string; template_id: string; title: string; description: string | null; position: number; created_at: string; updated_at: string };
type QuestionRow = { id: string; template_id: string; section_id: string | null; key: string | null; label: string; placeholder: string | null; help_text: string | null; question_type: string; required: boolean; options: Json | null; meta: Json | null; position: number; created_at: string; updated_at: string };
type SubmissionRow = { id: string; template_id: string | null; user_id: string | null; contact_name: string | null; contact_email: string | null; contact_phone: string | null; business_name: string | null; summary: Json | null; status: string; is_draft: boolean; created_at: string; updated_at: string; submitted_at: string | null };
type AnswerRow = { id: string; submission_id: string; question_id: string | null; answer_text: string | null; answer_json: Json | null; created_at: string };
type ProfileRow = { id: string; email: string; full_name: string | null; role: 'client' | 'admin'; created_at: string; updated_at: string };
type NoteRow = { id: string; submission_id: string; author_id: string; content: string; created_at: string };
type FileRow = { id: string; submission_id: string; question_id: string | null; storage_path: string; filename: string; mime_type: string | null; size_bytes: number | null; uploaded_at: string };

export interface Database {
  public: {
    Tables: {
      form_templates: Table<TemplateRow, Partial<TemplateRow> & Pick<TemplateRow, 'name' | 'slug'>, Partial<TemplateRow>>;
      form_sections: Table<SectionRow, Partial<SectionRow> & Pick<SectionRow, 'template_id' | 'title'>, Partial<SectionRow>>;
      form_questions: Table<QuestionRow, Partial<QuestionRow> & Pick<QuestionRow, 'template_id' | 'label' | 'question_type'>, Partial<QuestionRow>>;
      form_submissions: Table<SubmissionRow, Partial<SubmissionRow>, Partial<SubmissionRow>>;
      form_answers: Table<AnswerRow, Partial<AnswerRow> & Pick<AnswerRow, 'submission_id'>, Partial<AnswerRow>>;
      profiles: Table<ProfileRow, Partial<ProfileRow> & Pick<ProfileRow, 'id'>, Partial<ProfileRow>>;
      project_notes: Table<NoteRow, Partial<NoteRow> & Pick<NoteRow, 'submission_id' | 'author_id' | 'content'>, Partial<NoteRow>>;
      submission_files: Table<FileRow, Partial<FileRow> & Pick<FileRow, 'submission_id' | 'storage_path' | 'filename'>, Partial<FileRow>>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, string>;
    CompositeTypes: Record<string, never>;
  };
}
