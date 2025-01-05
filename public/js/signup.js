const password = document.getElementById("password");
const confirmPassword = document.getElementById("confirmPassword");
const fullName = document.getElementById("fullName");
const email = document.getElementById("email");
const phone = document.getElementById("phone");
const sendOtpBtn = document.getElementById("sendOtp");
const otpSection = document.getElementById("otpSection");
const otpInput = document.getElementById("otp");
const otpTimer = document.getElementById("otpTimer");
const timerDisplay = document.getElementById("timer");
const submitSection = document.getElementById("submitSection");

let otpTimerInterval;
let isResend = false;

// Check if the fields are valid
function checkFields() {
    let isValid = true;

    // Full Name Validation
    if (!fullName.value.trim()) {
        fullName.classList.add("error");
        fullName.placeholder = "Please enter your full name";
        isValid = false;
    } else {
        fullName.classList.remove("error");
        fullName.placeholder = "Enter your full name";
    }

    // Email Validation
    if (!email.value.trim() || !validateEmail(email.value)) {
        email.classList.add("error");
        email.placeholder = "Please enter a valid email";
        isValid = false;
    } else {
        email.classList.remove("error");
        email.placeholder = "Enter your email address";
    }

    // Phone Validation
    if (!phone.value.trim() || phone.value.length < 10) {
        phone.classList.add("error");
        phone.placeholder = "Please enter a valid phone number";
        isValid = false;
    } else {
        phone.classList.remove("error");
        phone.placeholder = "Enter your phone number";
    }

    // Password Validation
    if (!password.value.trim()) {
        password.classList.add("error");
        password.placeholder = "Password is required";
        isValid = false;
    } else {
        password.classList.remove("error");
        password.placeholder = "Enter your password";
    }

    // Confirm Password Validation
    if (confirmPassword.value !== password.value) {
        confirmPassword.classList.add("error");
        confirmPassword.placeholder = "Passwords do not match";
        document.getElementById("confirmPasswordError").style.display = "block"; // Show the error below confirm password
        isValid = false;
    } else {
        confirmPassword.classList.remove("error");
        confirmPassword.placeholder = "Re-enter your password";
        document.getElementById("confirmPasswordError").style.display = "none"; // Hide error when passwords match
    }

    return isValid;
}

// Email format validation
function validateEmail(email) {
    const re = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    return re.test(String(email).toLowerCase());
}

// Handle Send OTP button click
sendOtpBtn.addEventListener("click", () => {
    // If the fields are invalid, show warning messages and do not proceed
    if (!checkFields()) {
        return; // Stop the action if fields are invalid
    }

    // If all fields are valid, proceed to send OTP
    sendOtp();
    startOtpTimer();
    otpSection.style.display = "block"; // Show OTP input field
    sendOtpBtn.textContent = "Resend OTP"; // Change button text to "Resend OTP"
});

// Mock function to simulate sending OTP
function sendOtp() {
    if (isResend) {
        alert("OTP resent successfully!");
    } else {
        alert("OTP sent successfully!");
        isResend = true;
    }
}

// Start OTP timer
function startOtpTimer() {
    otpTimer.style.display = "block";
    sendOtpBtn.disabled = true; // Disable Send OTP button during timer
    let timeLeft = 30;

    clearInterval(otpTimerInterval);
    otpTimerInterval = setInterval(() => {
        if (timeLeft <= 0) {
            clearInterval(otpTimerInterval);
            otpTimer.style.display = "none";
            sendOtpBtn.disabled = false; // Enable Send OTP button after timer
        } else {
            timerDisplay.textContent = timeLeft;
            timeLeft--;
        }
    }, 1000);
}

// Show Submit button when valid OTP is entered
otpInput.addEventListener("input", () => {
    if (otpInput.value.length === 4) {
        submitSection.style.display = "block";
    } else {
        submitSection.style.display = "none";
    }
});

// Handle form submission
document.getElementById("signupForm").addEventListener("submit", (e) => {
    e.preventDefault();

    // Perform final validation here
    if (otpInput.value.length === 4) {
        alert("Signup successful!");
    } else {
        alert("Please enter a valid 4-digit OTP.");
    }
});

// Add blur event listeners for input fields
fullName.addEventListener("blur", () => {
    if (!fullName.value.trim()) {
        fullName.classList.add("error");
        fullName.placeholder = "Please enter your full name";
    } else {
        fullName.classList.remove("error");
        fullName.placeholder = "Enter your full name";
    }
});

email.addEventListener("blur", () => {
    if (!email.value.trim() || !validateEmail(email.value)) {
        email.classList.add("error");
        email.placeholder = "Please enter a valid email";
    } else {
        email.classList.remove("error");
        email.placeholder = "Enter your email address";
    }
});

phone.addEventListener("blur", () => {
    if (!phone.value.trim() || phone.value.length < 10) {
        phone.classList.add("error");
        phone.placeholder = "Please enter a valid phone number";
    } else {
        phone.classList.remove("error");
        phone.placeholder = "Enter your phone number";
    }
});

password.addEventListener("blur", () => {
    if (!password.value.trim()) {
        password.classList.add("error");
        password.placeholder = "Password is required";
    } else {
        password.classList.remove("error");
        password.placeholder = "Enter your password";
    }
});

confirmPassword.addEventListener("blur", () => {
    if (confirmPassword.value !== password.value) {
        confirmPassword.classList.add("error");
        confirmPassword.placeholder = "Passwords do not match";
        document.getElementById("confirmPasswordError").style.display = "block"; // Show error
    } else {
        confirmPassword.classList.remove("error");
        confirmPassword.placeholder = "Re-enter your password";
        document.getElementById("confirmPasswordError").style.display = "none"; // Hide error
    }
});
