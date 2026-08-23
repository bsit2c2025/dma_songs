-- ===========================================================================
-- OPTIONAL demo content for local development only.
-- Do not run this against production. Every row is tagged so it can be
-- removed again with 03_remove_demo_content.sql.
-- ===========================================================================

with new_song as (
  insert into public.songs (title, composer, arranger, description, category, lyrics, notes, status)
  values (
    'Pilipinas Kong Mahal',
    'Francisco Santiago',
    'DLL Music and Arts',
    'Rehearsal material for the university anniversary programme. [demo]',
    'Patriotic',
    E'Ang bayan ko''y tanging ikaw\nPilipinas kong mahal...',
    'Watch the breath marks in bar 12. Keep the vowels tall.',
    'active'
  )
  returning id
)
insert into public.song_voice_classifications (song_id, voice_classification_id)
select new_song.id, vc.id from new_song, public.voice_classifications vc
where vc.name in ('Soprano 1', 'Soprano 2', 'Alto 1', 'Alto 2');

insert into public.song_videos (song_id, voice_classification_id, youtube_video_id, youtube_url, label, sort_order)
select s.id, vc.id, 'dQw4w9WgXcQ', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', vc.name || ' part guide', vc.sort_order
from public.songs s
join public.voice_classifications vc on vc.name in ('Soprano 1', 'Alto 1')
where s.title = 'Pilipinas Kong Mahal';

insert into public.announcements (title, content, is_published, is_pinned, priority, link_url, link_label)
values (
  'Rehearsal moved to Friday 4:00 PM',
  '<p>This week''s rehearsal moves to <strong>Friday, 4:00 PM</strong> at the AVR. Bring your folders. [demo]</p>',
  true, true, 80, 'https://example.edu/schedule', 'View the schedule'
);
