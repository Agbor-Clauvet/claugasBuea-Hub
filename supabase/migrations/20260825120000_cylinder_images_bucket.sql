-- Storage bucket for cylinder/product photos, uploaded via the new
-- "Add Product" admin form. Public read (customers need to see photos
-- without logging in), admin-only write.

insert into storage.buckets (id, name, public)
values ('cylinder-images', 'cylinder-images', true)
on conflict (id) do nothing;

create policy "Cylinder images are publicly viewable"
on storage.objects for select
to public
using (bucket_id = 'cylinder-images');

create policy "Admins can upload cylinder images"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'cylinder-images'
  and public.has_role(auth.uid(), 'admin')
);

create policy "Admins can update cylinder images"
on storage.objects for update
to authenticated
using (
  bucket_id = 'cylinder-images'
  and public.has_role(auth.uid(), 'admin')
);

create policy "Admins can delete cylinder images"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'cylinder-images'
  and public.has_role(auth.uid(), 'admin')
);
