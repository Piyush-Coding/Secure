import json
import random

from django.contrib import messages
from django.contrib.auth import (
    authenticate,
    login as auth_login,
    logout as auth_logout,
)
from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User
from django.core.mail import send_mail
from django.core.serializers.json import DjangoJSONEncoder
from django.shortcuts import redirect, render
from django.urls import reverse
from django.utils import timezone
from django.http import JsonResponse
from .models import ContactMessage, PasswordResetOTP


def _split_full_name(full_name):
    """Split a full name into first and last parts for storage."""
    parts = full_name.split()
    if not parts:
        return "", ""
    first_name = parts[0]
    last_name = " ".join(parts[1:]) if len(parts) > 1 else ""
    return first_name, last_name


def signup(request):
    context = {}
    if request.method == "POST":
        full_name = (request.POST.get("name") or "").strip()
        email = (request.POST.get("email") or "").strip().lower()
        password = request.POST.get("password") or ""
        confirm_password = request.POST.get("confirmPassword") or ""

        if not full_name or not email or not password:
            context["error"] = "Name, email, and password are required."
        elif password != confirm_password:
            context["error"] = "Passwords do not match."
        elif User.objects.filter(username=email).exists():
            context["error"] = "An account with this email already exists."
        else:
            first_name, last_name = _split_full_name(full_name)
            User.objects.create_user(
                username=email,
                email=email,
                first_name=first_name,
                last_name=last_name,
                password=password,
            )
            messages.success(
                request, "Account created successfully. Please sign in."
            )
            return redirect("login")
    
    return render(request, "signup.html", context)


def login_view(request):
    context = {}
    if request.method == "POST":
        identifier = (request.POST.get("username") or "").strip().lower()
        password = request.POST.get("password") or ""

        if not identifier or not password:
            context["error"] = "Enter both email and password."
        else:
            user = authenticate(username=identifier, password=password)
            if user is None:
                try:
                    user_obj = User.objects.get(email__iexact=identifier)
                    user = authenticate(
                        username=user_obj.username, password=password
                    )
                except User.DoesNotExist:
                    user = None

            if user is not None:
                auth_login(request, user)
                return redirect("index")

            context["error"] = "Invalid credentials."

    return render(request, "login.html", context)


@login_required(login_url="login")
def index(request):
    return render(request, "index.html")


@login_required(login_url="login")
def profile(request):
    user = request.user
    full_name = user.get_full_name().strip() or user.username
    profile_display = {
        "name": full_name,
        "email": user.email or user.username,
        "company": "",
        "role": "SecureAI User",
        "plan": "Starter",
        "joined": user.date_joined,
        "last_login": user.last_login,
    }
    profile_display["initials"] = (
        "".join(part[0] for part in full_name.split() if part)[:2].upper() or "SU"
    )
    profile_json = {
        **profile_display,
        "joined": user.date_joined.isoformat() if user.date_joined else "",
        "lastLogin": user.last_login.isoformat() if user.last_login else "",
    }
    context = {
        "profile": profile_display,
        "profile_json": json.dumps(profile_json, cls=DjangoJSONEncoder),
    }
    return render(request, "profile.html", context)


@login_required(login_url="login")
def upload(request):
    return render(request, "upload.html")


def coming(request):
    return render(request, "coming.html")


def demo(request):
    return render(request, "demo.html")


def forget_password(request):
    """Initial page for password reset - user enters email"""
    if request.method == "POST":
        email = (request.POST.get("email") or "").strip().lower()
        
        if not email:
            return JsonResponse({"success": False, "error": "Email is required."}, status=400)
        
        # Check if user exists in Django admin
        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            # User doesn't have an account - ask them to create one
            return JsonResponse({
                "success": False, 
                "error": "No account found with this email address. Please create an account first."
            }, status=404)
        
        # User exists - Generate 6-digit OTP
        otp = str(random.randint(100000, 999999))
        
        # Invalidate any existing OTPs for this email
        PasswordResetOTP.objects.filter(email=email, is_verified=False).update(is_verified=True)
        
        # Create new OTP
        otp_obj = PasswordResetOTP.objects.create(
            email=email,
            otp=otp,
            expires_at=timezone.now() + timezone.timedelta(minutes=10)
        )
        
        # Send OTP via email
        try:
            from django.conf import settings
            # In development mode with console backend, EMAIL_HOST_USER might not be set
            # but that's okay - console backend will still work
            from_email = settings.DEFAULT_FROM_EMAIL or getattr(settings, 'EMAIL_HOST_USER', 'noreply@secureai.local')
            
            send_mail(
                subject="Password Reset OTP - SecureAI",
                message=f"Your password reset OTP is: {otp}\n\nThis OTP is valid for 10 minutes.\n\nIf you didn't request this, please ignore this email.",
                from_email=from_email,
                recipient_list=[email],
                fail_silently=False,
            )
            # In development mode, inform user to check console
            if settings.DEBUG and settings.EMAIL_BACKEND == 'django.core.mail.backends.console.EmailBackend':
                return JsonResponse({
                    "success": True, 
                    "message": "OTP has been sent. Check your Django console/terminal for the OTP (development mode)."
                })
            return JsonResponse({"success": True, "message": "OTP has been sent to your email address."})
        except Exception as e:
            # Log the actual error for debugging
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Failed to send OTP email: {str(e)}")
            return JsonResponse({
                "success": False, 
                "error": f"Failed to send email: {str(e)}. Please check email configuration or try again later."
            }, status=500)
    
    return render(request, "forget-password.html")


def verify_otp(request):
    """Verify OTP entered by user"""
    if request.method == "POST":
        email = (request.POST.get("email") or "").strip().lower()
        otp = (request.POST.get("otp") or "").strip()
        
        if not email or not otp:
            return JsonResponse({"success": False, "error": "Email and OTP are required."}, status=400)
        
        # Find valid OTP
        try:
            otp_obj = PasswordResetOTP.objects.filter(
                email=email,
                otp=otp,
                is_verified=False
            ).order_by("-created_at").first()
            
            if not otp_obj:
                return JsonResponse({"success": False, "error": "Invalid OTP."}, status=400)
            
            if otp_obj.is_expired():
                return JsonResponse({"success": False, "error": "OTP has expired. Please request a new one."}, status=400)
            
            # Mark OTP as verified
            otp_obj.is_verified = True
            otp_obj.save()
            
            return JsonResponse({"success": True, "message": "OTP verified successfully."})
        except Exception as e:
            return JsonResponse({"success": False, "error": "An error occurred. Please try again."}, status=500)
    
    return JsonResponse({"success": False, "error": "Invalid request method."}, status=405)


def reset_password(request):
    """Reset password after OTP verification"""
    if request.method == "POST":
        email = (request.POST.get("email") or "").strip().lower()
        otp = (request.POST.get("otp") or "").strip()
        new_password = request.POST.get("new_password") or ""
        confirm_password = request.POST.get("confirm_password") or ""
        
        if not email or not otp or not new_password or not confirm_password:
            return JsonResponse({"success": False, "error": "All fields are required."}, status=400)
        
        if new_password != confirm_password:
            return JsonResponse({"success": False, "error": "Passwords do not match."}, status=400)
        
        if len(new_password) < 8:
            return JsonResponse({"success": False, "error": "Password must be at least 8 characters."}, status=400)
        
        # Verify OTP was used
        try:
            otp_obj = PasswordResetOTP.objects.filter(
                email=email,
                otp=otp,
                is_verified=True
            ).order_by("-created_at").first()
            
            if not otp_obj:
                return JsonResponse({"success": False, "error": "OTP verification required. Please verify OTP first."}, status=400)
            
            # Check if OTP is still valid (not expired and recently verified)
            # Allow password reset within 10 minutes of OTP creation
            time_since_creation = (timezone.now() - otp_obj.created_at).total_seconds()
            if otp_obj.is_expired() or time_since_creation > 600:
                return JsonResponse({"success": False, "error": "OTP session expired. Please start over."}, status=400)
            
            # Get user and reset password
            try:
                user = User.objects.get(email__iexact=email)
                user.set_password(new_password)
                user.save()
                
                # Invalidate all OTPs for this email
                PasswordResetOTP.objects.filter(email=email).update(is_verified=True)
                
                return JsonResponse({"success": True, "message": "Password has been reset successfully. You can now login with your new password."})
            except User.DoesNotExist:
                return JsonResponse({"success": False, "error": "User not found."}, status=404)
        except Exception as e:
            return JsonResponse({"success": False, "error": "An error occurred. Please try again."}, status=500)
    
    return JsonResponse({"success": False, "error": "Invalid request method."}, status=405)


def contact(request):
    initial = {}
    if request.method == "POST":
        name = (request.POST.get("name") or "").strip()
        email = (request.POST.get("email") or "").strip()
        subject = (request.POST.get("subject") or "").strip()
        plan = (request.POST.get("plan") or "").strip()
        message_text = (request.POST.get("message") or "").strip()
        from_index = request.POST.get("from_index") == "true"

        initial = {
            "name": name,
            "email": email,
            "subject": subject,
            "plan": plan,
            "message": message_text,
        }

        valid_plans = {choice[0] for choice in ContactMessage.PLAN_CHOICES}
        if plan not in valid_plans:
            plan = ""

        if not name or not email or not message_text:
            messages.error(request, "Name, email, and message are required.")
        else:
            ContactMessage.objects.create(
                name=name,
                email=email,
                subject=subject,
                plan=plan,
                message=message_text,
            )
            messages.success(request, "Successful send! We received your message.")
            # If form was submitted from index.html, redirect back to index.html#contact
            if from_index:
                return redirect(f"{reverse('index')}?contact_sent=true")
            return redirect("contact")

    return render(request, "contact.html", {"initial": initial})


@login_required(login_url="login")
def logout_view(request):
    if request.method == "POST":
        auth_logout(request)
        messages.info(request, "You have been signed out.")
    return redirect("login")