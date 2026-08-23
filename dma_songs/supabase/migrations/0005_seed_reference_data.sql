-- ===========================================================================
-- dma_songs — 0005 reference data
--
-- The eight voice parts and the default application settings. This is
-- reference data the application depends on, so it ships as a migration
-- rather than as optional seed data. Re-running is safe.
-- ===========================================================================

insert into public.voice_classifications (name, slug, short_code, color, sort_order, description) values
  ('Soprano 2', 'soprano-2', 'S2', '#C2557E', 10, 'Lower soprano line.'),
  ('Soprano 1', 'soprano-1', 'S1', '#A33463', 20, 'Highest treble line.'),
  ('Alto 2',    'alto-2',    'A2', '#8C63C9', 30, 'Lower alto line.'),
  ('Alto 1',    'alto-1',    'A1', '#6C3FB0', 40, 'Upper alto line.'),
  ('Tenor 2',   'tenor-2',   'T2', '#2A9D9D', 50, 'Lower tenor line.'),
  ('Tenor 1',   'tenor-1',   'T1', '#17766F', 60, 'Upper tenor line.'),
  ('Bass 2',    'bass-2',    'B2', '#3C6FC4', 70, 'Lowest voice line.'),
  ('Bass 1',    'bass-1',    'B1', '#27508F', 80, 'Upper bass line.')
on conflict (name) do nothing;

insert into public.app_settings (key, value, label, is_public) values
  ('app.name',                    '"DLL Music and Arts"'::jsonb,                              'Application name', true),
  ('app.tagline',                 '"Song library and practice materials"'::jsonb,             'Tagline', true),
  ('app.organization',            '"Dalubhasaan ng Lungsod ng Lucena"'::jsonb,                'Organization', true),
  ('app.logo_url',                '"/logo.svg"'::jsonb,                                       'Logo URL', true),
  ('app.contact_email',           'null'::jsonb,                                              'Contact email shown in the footer', true),
  ('songs.page_size',             '12'::jsonb,                                                'Songs per page in the library', true),
  ('songs.default_sort',          '"recent"'::jsonb,                                          'Default song sort order', true),
  ('announcements.home_limit',    '3'::jsonb,                                                 'Announcements shown on the home page', true),
  ('announcements.show_banner',   'true'::jsonb,                                              'Show the pinned announcement banner', true)
on conflict (key) do nothing;
