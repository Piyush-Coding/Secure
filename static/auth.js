const statusMessage = document.querySelector("#statusMessage");
const forms = document.querySelectorAll("form[id$='Form']");

const CURRENT_USER_KEY = "secureAICurrentUser";
const USERS_KEY = "secureAIUsers";

const getStoredJSON = (key, fallback) => {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
        console.error(`Unable to parse data for ${key}`, error);
        return fallback;
    }
};

const setStoredJSON = (key, value) => {
    localStorage.setItem(key, JSON.stringify(value));
};

const getUsers = () => getStoredJSON(USERS_KEY, []);

const persistUsers = (users) => {
    setStoredJSON(USERS_KEY, users);
};

const setCurrentUser = (user) => {
    setStoredJSON(CURRENT_USER_KEY, user);
};

const findUserByEmail = (email) => getUsers().find((user) => user.email === email);

const buildUserProfile = (entries, overrides = {}) => {
    const now = new Date().toISOString();
    const email = (entries.email || "").trim();
    const nameFromEmail = email ? email.split("@")[0] : "SecureAI User";
    const baseName = (entries.name || overrides.name || "").trim();
    return {
        name: baseName || overrides.name || nameFromEmail,
        email,
        company: (entries.company || overrides.company || "Independent").trim(),
        plan: overrides.plan || entries.plan || "Starter",
        role: overrides.role || "Security Lead",
        joined: overrides.joined || now,
        lastLogin: overrides.lastLogin || now,
        securityStatus: overrides.securityStatus || "MFA Enabled",
    };
};

const saveUserProfile = (profile) => {
    const users = getUsers();
    const index = users.findIndex((user) => user.email === profile.email);

    if (index >= 0) {
        users[index] = { ...users[index], ...profile };
    } else {
        users.push(profile);
    }

    persistUsers(users);
    setCurrentUser(users[index >= 0 ? index : users.length - 1]);
};

const showStatus = (type, message) => {
    if (!statusMessage) {
        return;
    }

    statusMessage.hidden = false;
    statusMessage.classList.remove("error", "success");

    if (type === "error") {
        statusMessage.classList.add("error");
        statusMessage.querySelector("i").className = "fas fa-circle-exclamation";
    } else {
        statusMessage.classList.add("success");
        statusMessage.querySelector("i").className = "fas fa-circle-check";
    }

    // Use innerHTML to support HTML links in messages
    const span = statusMessage.querySelector("span");
    if (message && message.includes("<a")) {
        span.innerHTML = message;
    } else {
        span.textContent = message;
    }
};

const hideStatus = () => {
    if (statusMessage) {
        statusMessage.hidden = true;
    }
};

const toggleButtons = document.querySelectorAll(".toggle-password");

toggleButtons.forEach((button) => {
    button.addEventListener("click", () => {
        const targetId = button.getAttribute("data-target");
        const input = document.getElementById(targetId);

        if (!input) {
            return;
        }

        const isPassword = input.type === "password";
        input.type = isPassword ? "text" : "password";

        const icon = button.querySelector("i");
        icon.className = isPassword ? "fas fa-eye-slash" : "fas fa-eye";

        input.focus();
    });
});

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const clearErrors = (form) => {
    form.querySelectorAll(".input-error").forEach((field) => {
        field.classList.remove("input-error");
    });

    form.querySelectorAll(".error-note").forEach((note) => {
        note.hidden = true;
    });
};

forms.forEach((form) => {
    form.addEventListener("submit", (event) => {
        event.preventDefault();
        hideStatus();
        clearErrors(form);

        const formData = new FormData(form);
        const entries = Object.fromEntries(formData.entries());
        let isValid = true;

        form.querySelectorAll("input[required], select[required]").forEach((field) => {
            const value = field.value.trim();
            if (!value) {
                isValid = false;
                field.classList.add("input-error");
                const errorNote = field.closest(".input-group")?.querySelector(".error-note");
                if (errorNote) {
                    errorNote.hidden = false;
                }
            }
        });

        if (!isValid) {
            showStatus("error", "Please review the highlighted fields.");
            return;
        }

        if (entries.email && !emailPattern.test(entries.email)) {
            isValid = false;
            const emailField = form.querySelector("input[name='email']");
            emailField?.classList.add("input-error");
            const emailNote = emailField?.closest(".input-group")?.querySelector(".error-note");
            if (emailNote) {
                emailNote.hidden = false;
            }
            showStatus("error", "Enter a valid email address to continue.");
            return;
        }

        if (form.id === "signupForm") {
            const password = entries.password || "";
            const confirmPassword = entries.confirmPassword || "";
            if (password.length < 8) {
                isValid = false;
                const passField = form.querySelector("#signupPassword");
                passField?.classList.add("input-error");
                const passNote = passField?.closest(".input-group")?.querySelector(".error-note");
                if (passNote) {
                    passNote.hidden = false;
                }
                showStatus("error", "Password must include at least 8 characters.");
                return;
            }
            if (password !== confirmPassword) {
                isValid = false;
                const confirmField = form.querySelector("#signupConfirm");
                confirmField?.classList.add("input-error");
                const confirmNote = confirmField?.closest(".input-group")?.querySelector(".error-note");
                if (confirmNote) {
                    confirmNote.hidden = false;
                }
                showStatus("error", "Passwords do not match. Try again.");
                return;
            }
            if (!form.querySelector("#signupTerms")?.checked) {
                showStatus("error", "Please accept the Terms of Service to continue.");
                return;
            }
        }

        if (form.id === "loginForm") {
            if ((entries.password || "").length < 8) {
                const passField = form.querySelector("#loginPassword");
                passField?.classList.add("input-error");
                const passNote = passField?.closest(".input-group")?.querySelector(".error-note");
                if (passNote) {
                    passNote.hidden = false;
                }
                showStatus("error", "Password must be at least 8 characters.");
                return;
            }
        }

        if (!isValid) {
            return;
        }

        if (form.id === "signupForm") {
            const profile = buildUserProfile(entries, {
                plan: entries.plan || "Starter",
            });
            saveUserProfile(profile);
            showStatus("success", `Welcome aboard, ${profile.name}! Redirecting to your profile...`);
            form.reset();
            form.querySelectorAll(".toggle-password i").forEach((icon) => {
                icon.className = "fas fa-eye";
            });
            setTimeout(() => {
                window.location.href = "profile.html";
            }, 1400);
            return;
        }

        if (form.id === "loginForm") {
            const email = (entries.email || "").trim();
            let profile = findUserByEmail(email);
            if (profile) {
                profile = {
                    ...profile,
                    lastLogin: new Date().toISOString(),
                };
            } else {
                profile = buildUserProfile(entries);
            }
            saveUserProfile(profile);
            showStatus("success", `Welcome back, ${profile.name.split(" ")[0] || "there"}! Redirecting to your dashboard...`);
            form.reset();
            form.querySelectorAll(".toggle-password i").forEach((icon) => {
                icon.className = "fas fa-eye";
            });
            setTimeout(() => {
                window.location.href = "index.html";
            }, 1200);
            return;
        }

        if (form.id === "forgotForm") {
            const email = (entries.email || "").trim();
            const url = form.getAttribute("data-url") || "forget-password.html";
            const csrfToken = form.querySelector("[name=csrfmiddlewaretoken]")?.value || "";
            
            if (!email) {
                showStatus("error", "Please enter your email address.");
                return;
            }
            
            console.log("Sending OTP request for email:", email);
            
            fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    "X-CSRFToken": csrfToken
                },
                body: `email=${encodeURIComponent(email)}`
            })
            .then(response => {
                // Check if response is ok and is JSON
                if (!response.ok) {
                    // Try to parse error response
                    return response.json().then(data => {
                        throw { status: response.status, data: data };
                    }).catch(() => {
                        // If not JSON, throw with status
                        throw { status: response.status, data: { success: false, error: `Server error (${response.status}). Please try again.` } };
                    });
                }
                return response.json().then(data => {
                    return { status: response.status, data: data };
                });
            })
            .then(({ status, data }) => {
                console.log("Response received:", { status, data });
                if (data.success) {
                    showStatus("success", data.message || "OTP has been sent to your email address.");
                    // Store email for next steps
                    sessionStorage.setItem("resetEmail", email);
                    // Hide step 1, show step 2
                    document.getElementById("forgotForm").hidden = true;
                    document.getElementById("otpForm").hidden = false;
                    form.reset();
                } else {
                    let errorMessage = data.error || "Failed to send OTP. Please try again.";
                    console.log("Error response:", errorMessage);
                    // If account doesn't exist, add link to signup
                    if (status === 404 && errorMessage.includes("create an account")) {
                        errorMessage += " <a href='signup.html' style='color: inherit; text-decoration: underline;'>Create account</a>";
                    }
                    showStatus("error", errorMessage);
                }
            })
            .catch(error => {
                console.error("Error:", error);
                // Handle different error types
                if (error && error.data && error.data.error) {
                    showStatus("error", error.data.error);
                } else if (error && error.message) {
                    showStatus("error", `Network error: ${error.message}. Please check your connection and try again.`);
                } else {
                    showStatus("error", "An error occurred. Please try again.");
                }
            });
            return;
        }

        if (form.id === "otpForm") {
            const email = sessionStorage.getItem("resetEmail") || "";
            const otp = (entries.otp || "").trim();
            const url = form.getAttribute("data-url") || "verify-otp/";
            const csrfToken = form.querySelector("[name=csrfmiddlewaretoken]")?.value || "";
            
            if (!email) {
                showStatus("error", "Session expired. Please start over.");
                return;
            }

            fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    "X-CSRFToken": csrfToken
                },
                body: `email=${encodeURIComponent(email)}&otp=${encodeURIComponent(otp)}`
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    showStatus("success", data.message || "OTP verified successfully.");
                    // Store OTP for password reset
                    sessionStorage.setItem("resetOtp", otp);
                    // Hide step 2, show step 3
                    document.getElementById("otpForm").hidden = true;
                    document.getElementById("resetPasswordForm").hidden = false;
                    form.reset();
                } else {
                    showStatus("error", data.error || "Invalid OTP. Please try again.");
                }
            })
            .catch(error => {
                console.error("Error:", error);
                showStatus("error", "An error occurred. Please try again.");
            });
            return;
        }

        if (form.id === "resetPasswordForm") {
            const email = sessionStorage.getItem("resetEmail") || "";
            const otp = sessionStorage.getItem("resetOtp") || "";
            const newPassword = entries.new_password || "";
            const confirmPassword = entries.confirm_password || "";
            const url = form.getAttribute("data-url") || "reset-password/";
            const csrfToken = form.querySelector("[name=csrfmiddlewaretoken]")?.value || "";

            if (!email || !otp) {
                showStatus("error", "Session expired. Please start over.");
                return;
            }

            if (newPassword !== confirmPassword) {
                showStatus("error", "Passwords do not match.");
                const confirmField = form.querySelector("#confirmPassword");
                confirmField?.classList.add("input-error");
                const confirmNote = confirmField?.closest(".input-group")?.querySelector(".error-note");
                if (confirmNote) {
                    confirmNote.hidden = false;
                }
                return;
            }

            if (newPassword.length < 8) {
                showStatus("error", "Password must be at least 8 characters.");
                const passField = form.querySelector("#newPassword");
                passField?.classList.add("input-error");
                const passNote = passField?.closest(".input-group")?.querySelector(".error-note");
                if (passNote) {
                    passNote.hidden = false;
                }
                return;
            }

            fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    "X-CSRFToken": csrfToken
                },
                body: `email=${encodeURIComponent(email)}&otp=${encodeURIComponent(otp)}&new_password=${encodeURIComponent(newPassword)}&confirm_password=${encodeURIComponent(confirmPassword)}`
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    showStatus("success", data.message || "Password has been reset successfully.");
                    // Clear session storage
                    sessionStorage.removeItem("resetEmail");
                    sessionStorage.removeItem("resetOtp");
                    form.reset();
                    // Redirect to login after 2 seconds
                    setTimeout(() => {
                        window.location.href = "login.html";
                    }, 2000);
                } else {
                    showStatus("error", data.error || "Failed to reset password. Please try again.");
                }
            })
            .catch(error => {
                console.error("Error:", error);
                showStatus("error", "An error occurred. Please try again.");
            });
            return;
        }

        showStatus("success", "All good! We processed your request.");
        form.reset();
    });
});

// Resend OTP handler
const resendOtpBtn = document.getElementById("resendOtpBtn");
if (resendOtpBtn) {
    resendOtpBtn.addEventListener("click", () => {
        const email = sessionStorage.getItem("resetEmail");
        if (!email) {
            showStatus("error", "Session expired. Please start over.");
            return;
        }

        const forgotForm = document.getElementById("forgotForm");
        const url = forgotForm.getAttribute("data-url") || "forget-password.html";
        const csrfToken = forgotForm.querySelector("[name=csrfmiddlewaretoken]")?.value || "";

        fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "X-CSRFToken": csrfToken
            },
            body: `email=${encodeURIComponent(email)}`
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showStatus("success", data.message || "OTP has been resent to your email address.");
            } else {
                showStatus("error", data.error || "Failed to resend OTP. Please try again.");
            }
        })
        .catch(error => {
            console.error("Error:", error);
            showStatus("error", "An error occurred. Please try again.");
        });
    });
}

