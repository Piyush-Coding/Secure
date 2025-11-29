from django.db import models
from django.utils import timezone
from datetime import timedelta


class ContactMessage(models.Model):
    PLAN_CHOICES = [
        ("starter", "Starter"),
        ("professional", "Professional"),
        ("enterprise", "Enterprise"),
    ]

    name = models.CharField(max_length=255)
    email = models.EmailField()
    subject = models.CharField(max_length=255, blank=True)
    plan = models.CharField(max_length=32, choices=PLAN_CHOICES, blank=True)
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        plan_suffix = f" ({self.get_plan_display()})" if self.plan else ""
        return f"{self.name}{plan_suffix} - {self.email}"


class PasswordResetOTP(models.Model):
    email = models.EmailField()
    otp = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    is_verified = models.BooleanField(default=False)
    expires_at = models.DateTimeField()

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["email", "otp"]),
        ]

    def __str__(self):
        return f"OTP for {self.email} - {self.otp}"

    def is_expired(self):
        return timezone.now() > self.expires_at

    def save(self, *args, **kwargs):
        if not self.expires_at:
            self.expires_at = timezone.now() + timedelta(minutes=10)
        super().save(*args, **kwargs)
