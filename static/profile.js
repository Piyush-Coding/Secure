const CURRENT_USER_KEY = "secureAICurrentUser";
const USERS_KEY = "secureAIUsers";
const SETTINGS_KEY = "secureAISettings";

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

const getServerUser = () => {
    if (typeof window !== "undefined" && window.secureAIProfile) {
        return window.secureAIProfile;
    }
    return null;
};

const getCurrentUser = () => getServerUser() || getStoredJSON(CURRENT_USER_KEY, null);

const upsertUser = (userPayload) => {
    const users = getStoredJSON(USERS_KEY, []);
    const index = users.findIndex((entry) => entry.email === userPayload.email);
    if (index >= 0) {
        users[index] = { ...users[index], ...userPayload };
    } else {
        users.push(userPayload);
    }
    setStoredJSON(USERS_KEY, users);
    setStoredJSON(CURRENT_USER_KEY, userPayload);
};

const formatDate = (dateString) => {
    if (!dateString) return "--";
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return "--";
    return date.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
};

const renderProfileSummary = () => {
    const summarySection = document.getElementById("profile-summary");
    if (!summarySection) return;

    const user = getCurrentUser();
    if (!user) {
        summarySection.hidden = true;
        return;
    }

    const setText = (id, value) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    };

    setText("summaryName", user.name || "SecureAI User");
    setText("summaryEmail", user.email || "--");
    setText("summaryRole", user.role || "Security Lead");
    setText("summaryCompany", user.company || "Independent");
    setText("summaryPlan", user.plan || "Starter");
    setText("summaryLastLogin", user.lastLogin ? formatDate(user.lastLogin) : "--");
    setText("summaryJoined", user.joined ? formatDate(user.joined) : "--");

    summarySection.hidden = false;
};

const renderProfilePage = () => {
    const profileName = document.getElementById("profileName");
    if (!profileName) {
        return;
    }

    const user = getCurrentUser();
    const profileShell = document.querySelector(".profile-main");
    const emptyState = document.getElementById("profileEmpty");

    if (!user) {
        if (profileShell) profileShell.hidden = true;
        if (emptyState) emptyState.hidden = false;
        return;
    }

    const initials = (user.name || user.email || "U")
        .split(" ")
        .map((part) => part.charAt(0))
        .join("")
        .toUpperCase()
        .slice(0, 2);

    const assignText = (id, value) => {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    };

    assignText("profileName", user.name || "SecureAI User");
    assignText("profileEmail", user.email || "--");
    assignText("detailName", user.name || "--");
    assignText("detailEmail", user.email || "--");
    assignText("detailCompany", user.company || "Independent");
    assignText("detailRole", user.role || "Security Lead");
    assignText("detailPlan", user.plan || "Starter");
    assignText("detailJoined", user.joined ? formatDate(user.joined) : "--");
    assignText("detailLastLogin", user.lastLogin ? formatDate(user.lastLogin) : "--");
    assignText("detailSecurityStatus", user.securityStatus || "MFA Enabled");

    const initialsNode = document.getElementById("profileInitials");
    if (initialsNode) {
        initialsNode.textContent = initials;
    }

    if (profileShell) profileShell.hidden = false;
    if (emptyState) emptyState.hidden = true;

    hydrateSettings(user.email);
    setupLogout();
};

const hydrateSettings = (email) => {
    const settings = getStoredJSON(SETTINGS_KEY, {});
    const userSettings = settings[email] || {
        mfa: true,
        autolock: true,
        alerts: true,
        digest: false,
    };

    const map = [
        ["settingMfa", "mfa"],
        ["settingAutolock", "autolock"],
        ["settingAlerts", "alerts"],
        ["settingDigest", "digest"],
    ];

    map.forEach(([id, key]) => {
        const checkbox = document.getElementById(id);
        if (checkbox) {
            checkbox.checked = Boolean(userSettings[key]);
        }
    });

    const settingsStatus = document.getElementById("settingsStatus");
    const resetBtn = document.getElementById("settingsReset");
    const saveBtn = document.getElementById("settingsSave");

    const setStatus = (text, state = "default") => {
        if (!settingsStatus) return;
        settingsStatus.textContent = text;
        settingsStatus.style.color = state === "saved" ? "#15803d" : "#475569";
    };

    if (resetBtn) {
        resetBtn.addEventListener("click", () => {
            hydrateSettings(email);
            setStatus("Restored defaults");
        });
    }

    if (saveBtn) {
        saveBtn.addEventListener("click", () => {
            const updated = {
                mfa: document.getElementById("settingMfa")?.checked ?? true,
                autolock: document.getElementById("settingAutolock")?.checked ?? true,
                alerts: document.getElementById("settingAlerts")?.checked ?? true,
                digest: document.getElementById("settingDigest")?.checked ?? false,
            };
            settings[email] = updated;
            setStoredJSON(SETTINGS_KEY, settings);
            setStatus("Changes saved", "saved");
        });
    }
};

const setupLogout = () => {
    const form = document.getElementById("logoutForm");
    if (!form) return;

    form.addEventListener("submit", () => {
        localStorage.removeItem(CURRENT_USER_KEY);
    });
};

document.addEventListener("DOMContentLoaded", () => {
    renderProfileSummary();
    renderProfilePage();
});

