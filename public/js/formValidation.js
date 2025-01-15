document.addEventListener("DOMContentLoaded", function () {
    // Form validation
    document.getElementsByTagName("form")[0].addEventListener("submit", validateForm);
  
    function validateForm(event) {
      clearErrorMessages();
  
      const name = document.getElementsByName("productName")[0].value.trim();
      const description = document.getElementById("descriptionid").value.trim();
      const category = document.getElementsByName("category")[0].value.trim();
      const price = document.getElementsByName("regularPrice")[0].value.trim();
      const salePrice = document.getElementsByName("salePrice")[0].value.trim();
      const color = document.getElementsByName("color")[0].value.trim();
      const customColor = document.getElementById("custom-color").value.trim();
      const quantity = document.getElementsByName("quantity")[0].value.trim();
      const images = document.querySelectorAll('input[type="file"][name="images"]');
      let isValid = true;
  
      // Field validation
      if (name === "") {
        displayErrorMessage("productName-error", "Please enter a product name.");
        isValid = false;
      }
      if (description === "") {
        displayErrorMessage("description-error", "Please enter a product description.");
        isValid = false;
      }
      if (category === "") {
        displayErrorMessage("category-error", "Please select a category.");
        isValid = false;
      }
      if (quantity <= 0 || quantity === "") {
        displayErrorMessage("quantity-error", "Please enter a valid non-negative quantity.");
        isValid = false;
      }
      if (price === "" || !/^\d+(\.\d{1,2})?$/.test(price) || parseFloat(price) <= 0) {
        displayErrorMessage("regularPrice-error", "Please enter a valid non-negative price.");
        isValid = false;
      }
      if (salePrice !== "" && parseFloat(price) < parseFloat(salePrice)) {
        displayErrorMessage("salePrice-error", "Regular price must be greater than sale price.");
        isValid = false;
      }
      if (color === "" && customColor === "") {
        displayErrorMessage("color-error", "Please select or enter a color.");
        isValid = false;
      }
  
      // Image validation
      let totalImagesSelected = 0;
      images.forEach((image) => {
        totalImagesSelected += image.files.length;
      });
      if (totalImagesSelected < 2) {
        displayErrorMessage("images-error", "Please select at least two images.");
        isValid = false;
      }
  
      if (!isValid) {
        event.preventDefault();
      }
      return isValid;
    }
  
    function displayErrorMessage(elementId, message) {
      const errorElement = document.getElementById(elementId);
      errorElement.textContent = message;
      errorElement.style.display = "block";
    }
  
    function clearErrorMessages() {
      const errorElements = document.getElementsByClassName("error-message");
      Array.from(errorElements).forEach((element) => {
        element.textContent = "";
        element.style.display = "none";
      });
    }
  });
  