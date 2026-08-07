-- Seed the industry-neutral client discovery template.
INSERT INTO public.form_templates (name, slug, description)
VALUES (
  'Website & Digital Solution Discovery',
  'general-digital-discovery',
  'A guided discovery process to help us understand your business, goals, and digital needs so we can recommend the right solution.'
)
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    is_active = true;

WITH template AS (
  SELECT id FROM public.form_templates WHERE slug = 'general-digital-discovery'
)
INSERT INTO public.form_sections (template_id, title, description, position)
SELECT template.id, section.title, section.description, section.position
FROM template
CROSS JOIN (VALUES
  ('Business Information', 'Tell us about your organisation and the people we will work with.', 1),
  ('Current Digital Presence', 'Help us understand what you already have and what is working today.', 2),
  ('Project Goals', 'Choose the outcomes that matter most for this project.', 3),
  ('Website or Digital Solution Requirements', 'Describe the solution and audience your organisation needs.', 4),
  ('Design Preferences', 'Share the visual direction and experiences you want to create.', 5),
  ('Required Features', 'Select the capabilities that would support your goals.', 6),
  ('Available Content and Assets', 'Tell us what content and brand assets are ready to use.', 7),
  ('Timeline and Budget', 'Set expectations for planning and delivery.', 8),
  ('Additional Notes', 'Anything else we should know before we begin?', 9)
) AS section(title, description, position)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.form_sections existing
  WHERE existing.template_id = template.id
    AND existing.position = section.position
);

WITH template AS (
  SELECT id FROM public.form_templates WHERE slug = 'general-digital-discovery'
),
sections AS (
  SELECT id, position
  FROM public.form_sections
  WHERE template_id = (SELECT id FROM template)
),
questions AS (
  SELECT *
  FROM (VALUES
    (1, 'business_name', 'Business or organisation name', 'text', true, 'e.g. K-Tech Solutions', NULL::jsonb),
    (1, 'contact_name', 'Contact person''s name', 'text', true, 'Your full name', NULL::jsonb),
    (1, 'contact_email', 'Email address', 'email', true, 'you@company.com', NULL::jsonb),
    (1, 'contact_phone', 'Phone number', 'phone', true, '+234...', NULL::jsonb),
    (1, 'business_location', 'Business location', 'text', false, 'City, country', NULL::jsonb),
    (1, 'business_description', 'Tell us about your business or organisation', 'textarea', true, 'What do you do, who do you serve, and what makes you different?', NULL::jsonb),
    (2, 'existing_website', 'Existing website URL', 'url', false, 'https://', NULL::jsonb),
    (2, 'digital_channels', 'Which digital channels do you currently use?', 'multi-select', false, NULL, '["Website","Social media","Email marketing","Online advertising","Mobile app","Customer portal","None yet","Other"]'::jsonb),
    (2, 'current_digital_challenges', 'What is not working well with your current digital presence?', 'textarea', false, NULL, NULL::jsonb),
    (3, 'project_goals', 'What should this project help you achieve?', 'multi-select', true, NULL, '["Generate leads","Sell products or services","Improve customer service","Build credibility","Share information","Automate a process","Reach a new audience","Improve internal operations","Other"]'::jsonb),
    (3, 'success_definition', 'How will you measure success?', 'textarea', false, NULL, NULL::jsonb),
    (4, 'solution_type', 'What are you looking to create or improve?', 'select', true, NULL, '["A new website","A website redesign","An e-commerce solution","A customer portal","A web application","A mobile application","An internal business tool","Not sure yet"]'::jsonb),
    (4, 'target_audience', 'Who should the solution serve?', 'textarea', true, 'Describe your customers, members, staff, or other users.', NULL::jsonb),
    (4, 'solution_requirements', 'What should the website or digital solution help users do?', 'textarea', true, NULL, NULL::jsonb),
    (5, 'design_style', 'Which design styles appeal to you?', 'multi-select', false, NULL, '["Clean and minimal","Bold and energetic","Professional and corporate","Warm and approachable","Editorial and content-led","Modern and experimental","Not sure yet"]'::jsonb),
    (5, 'reference_websites', 'Websites or digital products you like', 'textarea', false, 'Share links and what you like about them.', NULL::jsonb),
    (5, 'design_preferences', 'Are there any design preferences or requirements we should know about?', 'textarea', false, NULL, NULL::jsonb),
    (6, 'required_features', 'Which features are important to your project?', 'multi-select', true, NULL, '["Contact forms","User accounts","Online payments","Product or service listings","Search and filters","Bookings or appointments","Blog or news","Gallery or portfolio","Maps or location tools","Live chat","Newsletter signup","Analytics","Social media integration","Admin management","Other"]'::jsonb),
    (6, 'integrations', 'Are there any systems or services the solution should connect to?', 'textarea', false, 'e.g. payment providers, CRM, accounting, email, or messaging tools.', NULL::jsonb),
    (7, 'content_ready', 'What content do you already have?', 'multi-select', false, NULL, '["Logo","Brand colours","Brand guidelines","Written copy","Images","Video","Documents","Product or service information","None yet"]'::jsonb),
    (7, 'content_support', 'What content or asset support do you need from K-Tech?', 'multi-select', false, NULL, '["Copywriting","Photography","Video","Graphic design","Content migration","Data entry","None"]'::jsonb),
    (7, 'brand_assets', 'Upload relevant brand or project assets', 'file', false, 'JPG, PNG, WEBP, PDF, DOC, or DOCX up to 10 MB.', NULL::jsonb),
    (8, 'desired_launch_date', 'Desired launch date', 'date', false, NULL, NULL::jsonb),
    (8, 'important_deadline', 'Is there an important deadline or event?', 'text', false, 'e.g. campaign, launch, registration, or event date', NULL::jsonb),
    (8, 'budget_range', 'Estimated budget range', 'select', false, NULL, '["Under $2,000","$2,000 - $5,000","$5,000 - $10,000","Over $10,000","Not sure yet"]'::jsonb),
    (8, 'timeline_notes', 'Any timeline or budget considerations?', 'textarea', false, NULL, NULL::jsonb),
    (9, 'additional_requirements', 'Is there anything else you would like us to know?', 'textarea', false, 'Share any context, concerns, or requirements we have not covered.', NULL::jsonb)
  ) AS item(section_position, question_key, label, question_type, required, placeholder, options)
)
INSERT INTO public.form_questions (
  template_id, section_id, key, label, question_type, required, placeholder, options, position
)
SELECT
  template.id,
  sections.id,
  questions.question_key,
  questions.label,
  questions.question_type,
  questions.required,
  questions.placeholder,
  questions.options,
  row_number() OVER (PARTITION BY sections.id ORDER BY questions.question_key)
FROM template
JOIN sections ON true
JOIN questions ON questions.section_position = sections.position
WHERE NOT EXISTS (
  SELECT 1
  FROM public.form_questions existing
  WHERE existing.template_id = template.id
    AND existing.key = questions.question_key
);
