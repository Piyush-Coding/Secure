from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("CodeGuard", "0003_emailverification"),
    ]

    operations = [
        migrations.DeleteModel(
            name="EmailVerification",
        ),
    ]

