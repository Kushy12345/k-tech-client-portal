WITH template AS (
  SELECT id FROM public.form_templates WHERE slug = 'real-estate-property-discovery'
),
section AS (
  SELECT id FROM public.form_sections
  WHERE template_id = (SELECT id FROM template) AND position = 7
)
INSERT INTO public.form_questions (
  template_id, section_id, key, label, question_type, required, placeholder, position
)
SELECT (SELECT id FROM template), (SELECT id FROM section), item.key, item.label, 'file', false, item.help, item.position
FROM (VALUES
  ('logo_file', 'Upload your logo', 'JPG, PNG, WEBP, PDF, DOC, or DOCX up to 10 MB.', 8),
  ('reference_files', 'Upload project references', 'Add brochures, company profiles, property references, or other useful documents.', 9)
) AS item(key, label, help, position)
WHERE NOT EXISTS (
  SELECT 1 FROM public.form_questions existing
  WHERE existing.template_id = (SELECT id FROM template)
    AND existing.key = item.key
);
