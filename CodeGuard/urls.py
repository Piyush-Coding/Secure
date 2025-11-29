from django.urls import path
from CodeGuard import views

urlpatterns = [
    path("", views.login_view, name="login"),
    path("login.html", views.login_view, name="login"),
    path("signup.html", views.signup, name="signup"),
    path("index.html", views.index, name="index"),
    path("profile.html", views.profile, name="profile"),
    path("logout/", views.logout_view, name="logout"),
    path("contact.html", views.contact, name="contact"),
    path("upload.html", views.upload, name="upload"),
    path("coming.html", views.coming, name="coming"),
    path("demo.html", views.demo, name="demo"),
    path("forget-password.html", views.forget_password, name="forget_password"),
    path("verify-otp/", views.verify_otp, name="verify_otp"),
    path("reset-password/", views.reset_password, name="reset_password"),
]
