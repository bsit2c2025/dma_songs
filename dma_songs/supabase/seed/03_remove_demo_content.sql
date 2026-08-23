-- Removes rows created by 02_demo_content.sql.
delete from public.announcements where content like '%[demo]%';
delete from public.songs where description like '%[demo]%';
