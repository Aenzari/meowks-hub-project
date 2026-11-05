-- Safe development seed. Test University is fictional and not an affiliated institution.
insert into public.universities (name, slug, description)
values ('Test University','test-university','Fictional development environment for building and testing Meowks.')
on conflict (slug) do update
set name=excluded.name, description=excluded.description, is_active=true;
