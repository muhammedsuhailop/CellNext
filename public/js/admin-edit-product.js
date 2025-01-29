document.addEventListener('DOMContentLoaded', function () {
    const variantButtons = document.querySelectorAll('.variant-btn');
    const variantSections = document.querySelectorAll('[id^="variant-section-"]');
    const addNewVariantBtn = document.getElementById('add-new-variant-btn');
    const newVariantForm = document.getElementById('new-variant-form-card');
    const cancelNewVariantBtn = document.getElementById('cancel-new-variant-btn');
    const hideVariantButtons = document.querySelectorAll('.hide-variant-btn');

    function showVariant(variantIndex) {
        variantSections.forEach((section, index) => {
            section.style.display = (index === variantIndex) ? 'block' : 'none';
        });

        variantButtons.forEach((button, index) => {
            button.classList.toggle('btn-primary', index === variantIndex);
            button.classList.toggle('btn-secondary', index !== variantIndex);
        });

        newVariantForm.style.display = 'none';
    }

    function hideVariant(variantIndex) {
        document.getElementById(`variant-section-${variantIndex}`).style.display = 'none';
    }

    showVariant(0);

    variantButtons.forEach((button, index) => {
        button.addEventListener('click', () => showVariant(index));
    });

    addNewVariantBtn.addEventListener('click', function () {
        newVariantForm.style.display = 'block';
    });

    cancelNewVariantBtn.addEventListener('click', function () {
        newVariantForm.style.display = 'none';
        showVariant(0);
    });

    hideVariantButtons.forEach((button) => {
        button.addEventListener('click', function () {
            const variantIndex = button.getAttribute('data-variant-index');
            hideVariant(variantIndex);
        });
    });
});

document.addEventListener('DOMContentLoaded', function () {
    const cropperModal = new bootstrap.Modal(document.getElementById('cropperModal'));
    let cropper;
    let currentImageIndex;
    let croppedImages = {};

    document.querySelectorAll('input[name="variantImages"]').forEach((input, index) => {
        input.addEventListener('change', function (event) {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function (e) {
                    document.getElementById('cropperImage').src = e.target.result;
                    cropperModal.show();
                    currentImageIndex = index;

                    if (cropper) cropper.destroy();
                    cropper = new Cropper(document.getElementById('cropperImage'), {
                        aspectRatio: 1,
                        viewMode: 1,
                    });
                };
                reader.readAsDataURL(file);
            }
        });
    });

    document.getElementById('cropImage').addEventListener('click', function () {
        if (cropper) {
            const canvas = cropper.getCroppedCanvas({
                width: 500,
                height: 500,
            });

            canvas.toBlob(function (blob) {
                const url = URL.createObjectURL(blob);
                const previewContainer = document.querySelectorAll('.image-preview img')[currentImageIndex];
                previewContainer.src = url;
                previewContainer.style.display = 'block';
                cropperModal.hide();
            }, 'image/jpeg');
        }
    });

    document.getElementById('cropperModal').addEventListener('hidden.bs.modal', function () {
        if (cropper) cropper.destroy();
        cropper = null;
    });
});



document.addEventListener('DOMContentLoaded', function () {
    console.log('Document loaded, attaching remove buttons functionality');
    const removeButtons = document.querySelectorAll('.remove-image');

    if (removeButtons.length === 0) {
        console.log("No remove buttons found, skipping event listener attachment");
    } else {
        removeButtons.forEach((button) => {
            button.addEventListener('click', function (event) {
                event.preventDefault();

                const index = button.getAttribute('data-index');
                const variantIndex = button.getAttribute('data-variant-index');
                console.log(`Removing image at variant ${variantIndex} index ${index}`);

                const previewImg = document.querySelector(`#preview-img-${variantIndex}-${index}`);
                const imageInput = document.querySelector(`#new-image-${variantIndex}-${index}`);
                const previewContainer = document.querySelector(`#preview-image-${variantIndex}-${index}`);

                if (previewImg) {
                    previewImg.src = '';
                    previewImg.style.display = 'none';
                }

                if (previewContainer) {
                    previewContainer.style.backgroundColor = '#f5f5f5';
                }

                if (imageInput) {
                    imageInput.value = '';
                }

                const productId = button.getAttribute('data-product-id');
                const url = `/admin/removeProductImage/${productId}/${variantIndex}/${index}`;

                fetch(url, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                }).then(response => {
                    console.log('Fetch executed');
                    if (!response.ok) {
                        throw new Error(`Network response was not ok: ${response.statusText}`);
                    }
                    return response.json();
                }).then(data => {
                    console.log('Image removed successfully from backend:', data);
                    button.style.display = 'none';
                }).catch(error => {
                    console.error('Error removing image from backend:', error);
                });

            });
        });
    }
});

function validateForm(form) {
    let isValid = true;

    function validateInput(input, errorElement, errorMessage) {
        if (!input.value.trim()) {
            errorElement.textContent = errorMessage;
            isValid = false;
        } else {
            errorElement.textContent = '';
        }
    }

    function validatePositiveNumber(input, errorElement, errorMessage) {
        if (!input.value.trim() || input.value < 0) {
            errorElement.textContent = errorMessage;
            isValid = false;
        } else {
            errorElement.textContent = '';
        }
    }

    function validatePrice(regularPriceInput, salePriceInput, regularPriceError, salePriceError) {
        if (!regularPriceInput.value.trim()) {
            regularPriceError.textContent = 'Regular Price is required';
            isValid = false;
        } else if (parseFloat(regularPriceInput.value) < 0) {
            regularPriceError.textContent = 'Regular Price cannot be negative';
            isValid = false;
        } else {
            regularPriceError.textContent = '';
        }

        if (!salePriceInput.value.trim()) {
            salePriceError.textContent = 'Sale Price is required';
            isValid = false;
        } else if (parseFloat(salePriceInput.value) < 0) {
            salePriceError.textContent = 'Sale Price cannot be negative';
            isValid = false;
        } else if (parseFloat(salePriceInput.value) > parseFloat(regularPriceInput.value)) {
            salePriceError.textContent = 'Sale Price cannot be greater than Regular Price';
            isValid = false;
        } else {
            salePriceError.textContent = '';
        }
    }

    const storageInput = form.querySelector('[name="size"]');
    const storageError = form.querySelector('#size-error');
    validateInput(storageInput, storageError, 'Size is required');

    const colorInput = form.querySelector('[name="color"]');
    const colorError = form.querySelector('#color-error');
    validateInput(colorInput, colorError, 'Color is required');

    const quantityInput = form.querySelector('[name="quantity"]');
    const quantityError = form.querySelector('#quantity-error');
    validatePositiveNumber(quantityInput, quantityError, 'Quantity must be a positive number');

    const regularPriceInput = form.querySelector('[name="regularPrice"]');
    const regularPriceError = form.querySelector('#regularPrice-error');
    const salePriceInput = form.querySelector('[name="salePrice"]');
    const salePriceError = form.querySelector('#salePrice-error');
    validatePrice(regularPriceInput, salePriceInput, regularPriceError, salePriceError);

    return isValid;
}

function submitFormViaAjax(form) {
    const formData = new FormData(form);
    const url = form.action;

    if (!validateForm(form)) {
        console.log("Form validation failed.");
        return;
    }

    fetch(url, {
        method: 'PUT',
        body: formData,
    })
        .then(response => response.json())
        .then(data => {
            if (!data.success) {
                Swal.fire({
                    title: 'Error!',
                    text: data.message || 'There was an error with your submission.',
                    icon: 'error',
                    confirmButtonText: 'OK',
                });
                return;
            }

            Swal.fire({
                title: 'Success!',
                text: data.message || 'Form submitted successfully.',
                icon: 'success',
                confirmButtonText: 'OK',
            }).then(() => {
                window.location.href = '/admin/products';
            });
        })
        .catch(error => {
            console.error('Error submitting form:', error);
            Swal.fire({
                title: 'Error!',
                text: 'There was an error with your submission.',
                icon: 'error',
                confirmButtonText: 'OK',
            });
        });
}

document.querySelectorAll('form[data-index]').forEach(form => {
    form.addEventListener('submit', function (e) {
        e.preventDefault();
        submitFormViaAjax(form);
    });
});