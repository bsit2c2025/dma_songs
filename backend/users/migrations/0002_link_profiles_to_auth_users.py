"""
`auth.users` lives in Supabase's own `auth` schema, in the same Postgres
database, but Django has no model for it (Supabase manages that table).
We still want a real referential-integrity constraint, so it's added here
via raw SQL rather than a Django ForeignKey.

ON DELETE CASCADE means deleting a user in Supabase Auth automatically
removes their profile row.
"""

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0001_initial"),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
                ALTER TABLE profiles
                ADD CONSTRAINT profiles_id_fkey
                FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
            """,
            reverse_sql="""
                ALTER TABLE profiles
                DROP CONSTRAINT profiles_id_fkey;
            """,
        ),
    ]
