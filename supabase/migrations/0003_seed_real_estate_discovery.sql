-- Seed the first reusable intake template.
INSERT INTO public.form_templates (name, slug, description)
VALUES (
  'Real Estate & Property Business Website Discovery',
  'real-estate-property-discovery',
  'A guided discovery form for planning a real estate or property business website.'
)
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name, description = EXCLUDED.description, is_active = true;

WITH template AS (
  SELECT id FROM public.form_templates WHERE slug = 'real-estate-property-discovery'
)
INSERT INTO public.form_sections (template_id, title, description, position)
SELECT template.id, section.title, section.description, section.position
FROM template
CROSS JOIN (VALUES
  ('Business information', 'Tell us about your business and the people we will work with.', 1),
  ('Business services', 'Select every service your business provides.', 2),
  ('Target audience', 'Who should the website help you reach?', 3),
  ('Website goals', 'Choose the outcomes that matter most for this project.', 4),
  ('Property information', 'Help us understand your inventory and property journey.', 5),
  ('Property listings', 'Choose the information you want to show on listings.', 6),
  ('Branding and assets', 'Tell us which brand and marketing assets you already have.', 7),
  ('Marketing', 'Share the channels you currently use.', 8),
  ('SEO', 'Describe how prospective clients should find you online.', 9),
  ('Website features', 'Select the capabilities you would like to explore.', 10),
  ('Competitors', 'Help us understand your market and visual preferences.', 11),
  ('Content', 'Tell us what content is ready and where you need support.', 12),
  ('Budget and timeline', 'Set expectations for delivery planning.', 13),
  ('Final notes', 'Anything else we should know before we begin?', 14)
) AS section(title, description, position)
WHERE NOT EXISTS (
  SELECT 1 FROM public.form_sections existing
  WHERE existing.template_id = template.id AND existing.position = section.position
);

WITH template AS (
  SELECT id FROM public.form_templates WHERE slug = 'real-estate-property-discovery'
),
sections AS (
  SELECT id, position FROM public.form_sections
  WHERE template_id = (SELECT id FROM template)
),
questions AS (
  SELECT * FROM (VALUES
    (1, 'business_name', 'Business name', 'text', true, 'e.g. Acme Properties', NULL::jsonb),
    (1, 'contact_name', 'Contact person''s name', 'text', true, 'Your full name', NULL::jsonb),
    (1, 'contact_email', 'Email address', 'email', true, 'you@company.com', NULL::jsonb),
    (1, 'contact_phone', 'Phone number', 'phone', true, '+234...', NULL::jsonb),
    (1, 'business_location', 'Business location', 'text', true, 'City, country', NULL::jsonb),
    (1, 'existing_website', 'Existing website URL', 'url', false, 'https://', NULL::jsonb),
    (1, 'years_in_business', 'Years in business', 'number', false, 'e.g. 8', NULL::jsonb),
    (1, 'business_description', 'Tell us about your business', 'textarea', true, 'What makes your business different?', NULL::jsonb),
    (2, 'services', 'Which services do you provide?', 'multi-select', true, NULL, '["Land sales","Property sales","Property rentals","Property management","Real estate consultancy","Property development","Short-let","Other"]'::jsonb),
    (3, 'target_audience', 'Who is your target audience?', 'multi-select', true, NULL, '["Individual buyers","Investors","Families","Businesses","Developers","Land buyers","Tenants","Other"]'::jsonb),
    (4, 'website_goals', 'What should the website help you achieve?', 'multi-select', true, NULL, '["Generate property enquiries","Generate leads","Showcase properties","Sell land","Promote houses","Build credibility","Receive WhatsApp enquiries","Receive phone enquiries","Collect customer information","Advertise properties"]'::jsonb),
    (5, 'property_types', 'Types of properties offered', 'textarea', true, NULL, NULL::jsonb),
    (5, 'locations_covered', 'Locations covered', 'textarea', true, NULL, NULL::jsonb),
    (5, 'price_range', 'Typical property price range', 'text', false, NULL, NULL::jsonb),
    (5, 'available_properties', 'Number of currently available properties', 'number', false, NULL, NULL::jsonb),
    (5, 'properties_change_frequently', 'Do your available properties change frequently?', 'radio', true, NULL, '["Yes","No","Sometimes"]'::jsonb),
    (5, 'property_search_required', 'Is property search/filtering required?', 'radio', true, NULL, '["Yes","No","Not sure"]'::jsonb),
    (5, 'property_detail_pages', 'Are individual property detail pages required?', 'radio', true, NULL, '["Yes","No","Not sure"]'::jsonb),
    (5, 'property_enquiry_forms', 'Are individual property enquiry forms required?', 'radio', true, NULL, '["Yes","No","Not sure"]'::jsonb),
    (6, 'listing_information', 'What should each property listing include?', 'multi-select', true, NULL, '["Property gallery","Property description","Price","Location","Property type","Size","Features","Availability status","Google Maps location","WhatsApp enquiry button","Call button"]'::jsonb),
    (7, 'brand_assets', 'Which assets do you already have?', 'multi-select', true, NULL, '["Logo","Brand colours","Brand guidelines","Professional property photographs","Videos","Brochures","Company profile documents"]'::jsonb),
    (8, 'marketing_channels', 'Which marketing channels do you use?', 'multi-select', false, NULL, '["Facebook","Instagram","TikTok","WhatsApp Business","Google Business Profile"]'::jsonb),
    (8, 'currently_run_ads', 'Do you currently run advertisements?', 'radio', true, NULL, '["Yes","No","Sometimes"]'::jsonb),
    (8, 'google_ads_support', 'Should the website support Google Ads?', 'radio', true, NULL, '["Yes","No","Not sure"]'::jsonb),
    (8, 'social_integration', 'Do you want social media integration?', 'radio', true, NULL, '["Yes","No","Not sure"]'::jsonb),
    (9, 'seo_locations', 'What locations should the website rank for?', 'textarea', true, NULL, NULL::jsonb),
    (9, 'seo_services', 'What services should people find you for?', 'textarea', true, NULL, NULL::jsonb),
    (9, 'want_blog', 'Do you want a blog?', 'radio', true, NULL, '["Yes","No","Not sure"]'::jsonb),
    (9, 'want_property_articles', 'Do you want property-related articles?', 'radio', true, NULL, '["Yes","No","Not sure"]'::jsonb),
    (9, 'want_local_seo', 'Do you want local SEO?', 'radio', true, NULL, '["Yes","No","Not sure"]'::jsonb),
    (10, 'website_features', 'Which website features are important?', 'multi-select', true, NULL, '["Property listings","Property search","Property filters","Contact forms","WhatsApp integration","Google Maps","Blog","Testimonials","Gallery","About page","FAQ","Newsletter","Social media integration","Live chat","Admin property management"]'::jsonb),
    (11, 'competitor_websites', 'Competitor websites', 'textarea', false, NULL, NULL::jsonb),
    (11, 'liked_websites', 'Websites you like', 'textarea', false, NULL, NULL::jsonb),
    (11, 'disliked_websites', 'Websites you dislike', 'textarea', false, NULL, NULL::jsonb),
    (11, 'website_improvements', 'What should your website do better?', 'textarea', false, NULL, NULL::jsonb),
    (12, 'website_copy_ready', 'Do you already have website copy?', 'radio', true, NULL, '["Yes","No","Some of it"]'::jsonb),
    (12, 'needs_copywriting', 'Do you need K-Tech to write it?', 'radio', true, NULL, '["Yes","No","Not sure"]'::jsonb),
    (12, 'property_descriptions_ready', 'Do you have property descriptions?', 'radio', true, NULL, '["Yes","No","Some of them"]'::jsonb),
    (12, 'professional_photographs', 'Do you have professional photographs?', 'radio', true, NULL, '["Yes","No","Some of them"]'::jsonb),
    (12, 'needs_media_support', 'Do you need photography/video support?', 'radio', true, NULL, '["Yes","No","Not sure"]'::jsonb),
    (13, 'budget_range', 'Estimated budget range', 'select', true, NULL, '["Under $2,000","$2,000 - $5,000","$5,000 - $10,000","Over $10,000","Not sure yet"]'::jsonb),
    (13, 'desired_launch_date', 'Desired launch date', 'date', false, NULL, NULL::jsonb),
    (13, 'important_deadline', 'Important deadline', 'text', false, NULL, NULL::jsonb),
    (13, 'additional_requirements', 'Additional requirements', 'textarea', false, NULL, NULL::jsonb),
    (14, 'final_notes', 'Is there anything else you would like us to know about your business or website?', 'textarea', false, NULL, NULL::jsonb)
  ) AS q(section_position, question_key, label, question_type, required, placeholder, options)
)
INSERT INTO public.form_questions (
  template_id, section_id, key, label, question_type, required, placeholder, options, position
)
SELECT
  template.id, sections.id, questions.question_key, questions.label,
  questions.question_type, questions.required, questions.placeholder,
  questions.options, row_number() OVER (PARTITION BY sections.id ORDER BY questions.question_key)
FROM template
JOIN sections ON true
JOIN questions ON questions.section_position = sections.position
WHERE NOT EXISTS (
  SELECT 1 FROM public.form_questions existing
  WHERE existing.template_id = template.id AND existing.key = questions.question_key
);
