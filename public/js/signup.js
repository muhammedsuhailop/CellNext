const password = document.getElementById("password");
const confirmPassword = document.getElementById("confirmPassword");
const fullName = document.getElementById("name");
const email = document.getElementById("email");
const phone = document.getElementById("phone");
const sendOtpBtn = document.getElementById("sendOtp");
const referralCode = document.getElementById("referralCode");

function showError(element, message) {
    const errorElement = document.querySelector(`#${element}Error`);
    if (message) {
        document.getElementById(element).classList.add("error");
        errorElement.textContent = message;
        errorElement.style.display = "block";
    } else {
        document.getElementById(element).classList.remove("error");
        errorElement.textContent = "";
        errorElement.style.display = "none";
    }
}

function checkFields() {
    let isValid = true;

    if (!fullName.value.trim()) {
        showError("name", "Please enter your full name");
        isValid = false;
    } else {
        showError("name", "");
    }

    if (!email.value.trim() || !validateEmail(email.value)) {
        showError("email", "Please enter a valid email address");
        isValid = false;
    } else {
        showError("email", "");
    }

    if (!phone.value.trim() || phone.value.length < 10) {
        showError("phone", "Please enter a valid phone number");
        isValid = false;
    } else {
        showError("phone", "");
    }
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[A-Z])(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$/;
    if (!password.value.trim()) {
        showError("password", "Password is required");
        isValid = false;
    } else if (!passwordRegex.test(password.value)) {
        console.log(password.value)
        showError("password", "Password must be at least 6 characters, include uppercase, lowercase, a number, and a special character");
        isValid = false;
    } else {
        showError("password", "");
    }

    if (confirmPassword.value !== password.value) {
        showError("confirmPassword", "Passwords do not match");
        isValid = false;
    } else {
        showError("confirmPassword", "");
    }

    return isValid;
}

function validateEmail(email) {
    const re = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    return re.test(String(email).toLowerCase());
}

sendOtpBtn.addEventListener("click", async (e) => {
    e.preventDefault();

    if (!checkFields()) return;

    sendOtpBtn.disabled = true;
    sendOtpBtn.innerHTML = `
    <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
    <span class="ms-2">Sending OTP...</span>
  `;

    const formData = {
        name: fullName.value.trim(),
        email: email.value.trim(),
        phone: phone.value.trim(),
        password: password.value.trim(),
        confirmPassword: confirmPassword.value.trim(),
        referralCode: referralCode.value,
    };

    try {
        const response = await fetch("/signup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(formData),
        });

        const data = await response.json();
        console.log('Response Data:', data);

        if (!response.ok) {
            if (data.errorCode === "E110") {
                showError("email", data.message);
            } else if (data.message === "Passwords do not match") {
                showError("password", data.message);
                showError("confirmPassword", data.message);
            } else {
                alert("An error occurred: " + data.message);
            }
            sendOtpBtn.disabled = false;
            sendOtpBtn.textContent = "Send OTP";
            return;
        }

        window.location.href = "/verify-otp";
    } catch (error) {
        console.error("Signup Error:", error);
        alert("An error occurred. Please try again.");
        sendOtpBtn.disabled = false;
        sendOtpBtn.textContent = "Send OTP";
    }
});





