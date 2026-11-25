begin;

alter table public.notes drop constraint if exists notes_category_check;
alter table public.notes add constraint notes_category_check
  check (category in ('excel', 'psychology', 'law', 'windows', 'ai_pm'));

commit;
