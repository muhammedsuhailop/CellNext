document.addEventListener("DOMContentLoaded", function () {
    let cropper;
    let currentInputId;
  
    // Function to handle image input change
    const viewImage = (event, inputId) => {
      const file = event.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
          const modalImgView = document.getElementById("modalImgView");
          modalImgView.src = e.target.result; // Set image source for cropping
          currentInputId = inputId; // Keep track of which input triggered the modal
          const cropperModal = new bootstrap.Modal(document.getElementById("cropperModal"));
          cropperModal.show();
  
          // Destroy previous cropper instance
          if (cropper) {
            cropper.destroy();
          }
  
          // Initialize Cropper.js
          cropper = new Cropper(modalImgView, {
            aspectRatio: 1,
            viewMode: 1,
          });
        };
        reader.readAsDataURL(file);
      }
    };
  
    // Function to handle crop button click and upload
    document.getElementById("cropButton").addEventListener("click", function () {
      if (cropper) {
        const canvas = cropper.getCroppedCanvas({
          width: 440,
          height: 440,
        });
  
        canvas.toBlob(function (blob) {
          const formData = new FormData();
          formData.append("croppedImage", blob, `cropped-image-${currentInputId}.jpg`);
  
          // Display the cropped image on the client
          const imgView = document.getElementById("imgView" + currentInputId);
          const url = URL.createObjectURL(blob);
          imgView.src = url;
          imgView.style.display = "block";
  
          // Send cropped image to server
          fetch("/upload-cropped-image", {
            method: "POST",
            body: formData,
          })
            .then((response) => response.json())
            .then((data) => {
              console.log("Image uploaded successfully:", data);
              imgView.dataset.croppedImagePath = data.filePath;
            })
            .catch((error) => {
              console.error("Error uploading image:", error);
            });
  
          // Hide the modal
          const cropperModal = bootstrap.Modal.getInstance(document.getElementById("cropperModal"));
          cropperModal.hide();
        }, "image/jpeg");
      }
    });
  
    // Attach event listeners to inputs
    for (let i = 1; i <= 4; i++) {
      document.getElementById("input" + i).addEventListener("change", (event) => viewImage(event, i));
    }
  });
  