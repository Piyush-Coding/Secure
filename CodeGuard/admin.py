from django.contrib import admin
from .models import ContactMessage, PasswordResetOTP


@admin.register(ContactMessage)
class ContactMessageAdmin(admin.ModelAdmin):
    list_display = ("name", "email", "plan", "subject", "created_at")
    search_fields = ("name", "email", "subject", "message")
    list_filter = ("plan", "created_at")


@admin.register(PasswordResetOTP)
class PasswordResetOTPAdmin(admin.ModelAdmin):
    list_display = ("email", "otp", "is_verified", "created_at", "expires_at")
    search_fields = ("email", "otp")
    list_filter = ("is_verified", "created_at", "expires_at")
    readonly_fields = ("created_at", "expires_at")
    
    def has_add_permission(self, request):
        return False  # OTPs should only be created through the password reset flow


