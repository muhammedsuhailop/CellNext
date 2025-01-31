
document.addEventListener('DOMContentLoaded', function () {
    const radioButtons = document.querySelectorAll('input[name="paymentMethod"]');

    radioButtons.forEach(button => {
        button.addEventListener('change', function () {
            document.querySelectorAll('.checkmark').forEach(mark => {
                mark.classList.remove('checked');
            });

            if (this.checked) {
                this.nextElementSibling.classList.add('checked');
            }
        });
    });
});

document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll(".toggle-details").forEach((button) => {
        button.addEventListener("click", function () {
            const details = this.previousElementSibling;
            if (details.style.display === "none" || details.style.display === "") {
                details.style.display = "block";
                this.innerHTML = "Show Less <i class='bx bxs-chevron-up'></i>";
            } else {
                details.style.display = "none";
                this.textContent = "Show More";
            }
        });
    });

    document.querySelectorAll(".select-address").forEach((radio) => {
        radio.addEventListener("change", function () {
            document.querySelectorAll(".card").forEach((card) => {
                card.classList.remove("selected-address");
            });

            this.closest(".card").classList.add("selected-address");
        });
    });
});


$(document).ready(function () {
    $(document).on("click", ".edit-address-btn", function () {
        var addressId = $(this).data("address-id");
        $("#address-modal").find('input[name="addressId"]').val(addressId);
        $("#address-modal").find('input[name="name"]').val($(this).data("name"));
        $("#address-modal").find('input[name="addressType"]').val($(this).data("address-type"));
        $("#address-modal").find('input[name="houseName"]').val($(this).data("house-name"));
        $("#address-modal").find('input[name="city"]').val($(this).data("city"));
        $("#address-modal").find('input[name="state"]').val($(this).data("state"));
        $("#address-modal").find('input[name="country"]').val($(this).data("country"));
        $("#address-modal").find('input[name="pinCode"]').val($(this).data("pin-code"));
        $("#address-modal").find('input[name="phone"]').val($(this).data("phone"));
        $("#address-modal").find('input[name="alternatePhone"]').val($(this).data("alternate-phone"));
        $("#address-modal").find('input[name="landmark"]').val($(this).data("landmark"));

        console.log({
            addressId: addressId,
            name: $(this).data("name"),
            addressType: $(this).data("address-type"),
            houseName: $(this).data("house-name"),
            city: $(this).data("city"),
            state: $(this).data("state"),
            country: $(this).data("country"),
            pinCode: $(this).data("pin-code"),
            phone: $(this).data("phone"),
            alternatePhone: $(this).data("alternate-phone"),
            landmark: $(this).data("landmark")
        });

        $("#modal-title").text("Edit Address");
        $("#save-address-btn").text("Update Address");
        $("#address-modal").modal("show");
    });

    $(document).on("click", "#add-address-btn", function () {
        $("#address-modal").find("input").val("");

        $("#modal-title").text("Add New Address");
        $("#save-address-btn").text("Save Address");
        $("#address-modal").modal("show");
    });

    $("#save-address-btn").on("click", async function (event) {
        event.preventDefault();
        $(".error-message").remove();

        var isValid = true;

        function showError(input, message) {
            $(input).after(`<span class="error-message" style="color: red; font-size: 12px;">${message}</span>`);
            isValid = false;
        }

        var addressId = $('#address-modal').find('input[name="addressId"]').val().trim();
        var name = $('#address-modal').find('input[name="name"]').val().trim();
        var addressType = $('#address-modal').find('input[name="addressType"]').val().trim();
        var houseName = $('#address-modal').find('input[name="houseName"]').val().trim();
        var city = $('#address-modal').find('input[name="city"]').val().trim();
        var state = $('#address-modal').find('input[name="state"]').val().trim();
        var country = $('#address-modal').find('input[name="country"]').val().trim();
        var pinCode = $('#address-modal').find('input[name="pinCode"]').val().trim();
        var phone = $('#address-modal').find('input[name="phone"]').val().trim();
        var alternatePhone = $('#address-modal').find('input[name="alternatePhone"]').val().trim();
        var landmark = $('#address-modal').find('input[name="landmark"]').val().trim();

        if (!name) showError('input[name="name"]', 'Name is required');
        if (!addressType) showError('input[name="addressType"]', 'Address Type is required');
        if (!houseName) showError('input[name="houseName"]', 'House Name is required');
        if (!city) showError('input[name="city"]', 'City is required');
        if (!state) showError('input[name="state"]', 'State is required');
        if (!country) showError('input[name="country"]', 'Country is required');
        if (!pinCode) showError('input[name="pinCode"]', 'Pin Code is required');
        else if (!/^\d{6}$/.test(pinCode)) showError('input[name="pinCode"]', 'Pin Code must be 6 digits');
        if (!landmark) showError('input[name="landmark"]', 'landmark is required');

        if (!phone) showError('input[name="phone"]', 'Phone number is required');
        else if (!/^\d{10}$/.test(phone)) showError('input[name="phone"]', 'Phone number must be 10 digits');

        if (alternatePhone && !/^\d{10}$/.test(alternatePhone))
            showError('input[name="alternatePhone"]', 'Alternate phone must be 10 digits');

        if (!isValid) return;

        const data = {
            name,
            addressType,
            houseName,
            city,
            state,
            country,
            pinCode,
            phone,
            alternatePhone,
            landmark,
        };

        const url = addressId ? "/update-address" : "/add-address";
        const method = addressId ? "PUT" : "POST";

        if (addressId) data.addressId = addressId;

        try {
            const response = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(data),
            });

            if (!response.ok) throw new Error(`Error: ${response.statusText}`);

            const responseData = await response.json();

            if (responseData.success) {
                Swal.fire({
                    icon: "success",
                    title: "Success",
                    text: responseData.message || (addressId ? "Address updated!" : "Address added!"),
                }).then(() => {
                    $("#address-modal").modal("hide");
                    location.reload();
                });
            } else {
                Swal.fire({
                    icon: "error",
                    title: "Failed",
                    text: responseData.message,
                });
            }
        } catch (error) {
            Swal.fire({
                icon: "error",
                title: "Error",
                text: "Error saving address: " + error.message,
            });
        }
    });
});


document.addEventListener('click', function (e) {
    if (e.target && e.target.classList.contains('delete-address-btn')) {
        var addressId = e.target.getAttribute('data-address-id');

        swal.fire({
            title: "Are you sure?",
            text: "Once deleted, this address cannot be recovered!",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: 'Yes, delete it!',
            cancelButtonText: 'No, keep it',
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
        })
            .then((result) => {
                if (result.isConfirmed) {
                    fetch('/delete-address', {
                        method: 'DELETE',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            addressId: addressId
                        }),
                    })
                        .then(response => response.json())
                        .then(data => {
                            if (data.success) {
                                swal.fire("Success!", "Address deleted successfully.", "success");
                                location.reload();
                            } else {
                                swal.fire("Error!", data.message, "error");
                            }
                        })
                        .catch(error => {
                            swal.fire("Error!", "Something went wrong. Please try again.", "error");
                        });
                } else {
                    swal.fire("Your address is safe!");
                }
            });
    }
});

window.addEventListener('load', function () {
    const orderForm = document.getElementById('orderForm');
    if (!orderForm) {
        console.error('Order form not found');
        return;
    }
    // place-order-btn
    const placeOrderButton = document.querySelector('.place-order-btn');
    console.log('Place Order Button:', placeOrderButton);

    if (!placeOrderButton) {
        console.error('Place Order button not found');
        return;
    }

    // Prevent form submission via default behavior
    orderForm.addEventListener('submit', function (event) {
        event.preventDefault(); // Prevent the default form submission
        console.log('Form submission prevented');
    });

    placeOrderButton.addEventListener('click', async function () {
        const selectedAddress = document.querySelector('input[name="selectedAddress"]:checked');
        const orderDetails = document.getElementById('orderDetails').value;
        const paymentMethodRadios = document.querySelectorAll('input[name="paymentMethod"]');
        const totalAmount = document.getElementById('checkout-total-amount')?.innerText.trim(); // Get total price
        const selectedPaymentMethod = [...paymentMethodRadios].find(radio => radio.checked);

        console.log('Selected Address:', selectedAddress);
        console.log('Order Details:', orderDetails);
        console.log('Payment Method:', selectedPaymentMethod);
        console.log('Total Amount:', totalAmount);

        if (!selectedAddress || !selectedPaymentMethod) {
            Swal.fire('Error', 'Please select an address and a payment method.', 'error');
            console.log('Missing address or payment method');
            return;
        }

        if (selectedPaymentMethod.id !== 'cod') {
            Swal.fire('Error', 'Currently, only Cash on Delivery (COD) is supported.', 'error');
            console.log('Payment method is not COD');
            return;
        }

        const orderData = {
            selectedAddress: selectedAddress.value,
            orderDetails: orderDetails,
            paymentMethod: selectedPaymentMethod.id,
        };

        console.log('Order Data:', orderData);
        const confirmation = await Swal.fire({
            title: 'Confirm Order',
            html: `<b>Amount to Pay:</b> ${totalAmount}<br><br>Are you sure you want to place this order?`,
            icon: 'info',
            showCancelButton: true,
            confirmButtonText: 'Yes, Place Order',
            cancelButtonText: 'Cancel'
        });

        console.log('Confirmation response:', confirmation);
        if (!confirmation.isConfirmed) {
            console.log('Order canceled');
            return;
        }

        try {
            console.log('Sending POST request...');
            const response = await fetch('/place-order', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(orderData),
            });

            const result = await response.json();
            console.log('Server Response:', result);

            if (result.success) {
                Swal.fire({
                    title: 'Success',
                    text: `Order placed successfully! Order ID: ${result.orderId}`,
                    icon: 'success',
                    timer: 3500,
                    timerProgressBar: true,
                    showConfirmButton: false
                }).then(() => {
                    window.location.href = '/my-orders';
                });
            } else {
                Swal.fire('Error', result.message || 'Failed to place order. Please try again.', 'error');
            }
        } catch (error) {
            console.error('Error placing order:', error);
            Swal.fire('Error', 'Something went wrong. Please try again.', 'error');
        }
    });
});