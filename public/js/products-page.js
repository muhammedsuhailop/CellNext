function redirectToProduct(productId) {
  window.location.href = `/productDetails?id=${productId}`;
}

$(document).ready(function () {
  function applyZoom() {
    var lensSize = 300;

    if ($(window).width() < 768) {
      lensSize = 200;
    }

    $('.zoom-image').elevateZoom({
      zoomType: 'lens',
      lensShape: 'round',
      lensSize: lensSize,
      borderSize: 3,
      borderColor: '#ccc',
      zoomWindowWidth: 400,
      zoomWindowHeight: 400,
      zoomWindowPosition: 1,
      scrollZoom: true,
      zoomWindowFadeIn: 500,
      zoomWindowFadeOut: 500,
    });
  }

  applyZoom();

  $(window).resize(function () {
    applyZoom();
  });
});



document.addEventListener('DOMContentLoaded', function () {
  const tabContentContainer = document.querySelector('.tab-content');
  const tabs = Array.from(tabContentContainer.querySelectorAll('.tab-pane'));
  const thumbnails = Array.from(document.querySelectorAll('.nav-link'));
  const prevButton = document.getElementById('prev-image');
  const nextButton = document.getElementById('next-image');

  if (!tabs.length || !thumbnails.length) {
    console.error('No image tabs or thumbnails found.');
    return;
  }

  let currentIndex = 0;

  const updateActiveTab = () => {
    tabs.forEach((tab, i) => {
      tab.classList.toggle('active', i === currentIndex);
    });

    thumbnails.forEach((thumbnail, i) => {
      thumbnail.classList.toggle('active', i === currentIndex);
    });
  };

  prevButton.addEventListener('click', () => {
    currentIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    updateActiveTab();
  });

  nextButton.addEventListener('click', () => {
    currentIndex = (currentIndex + 1) % tabs.length;
    updateActiveTab();
  });

  updateActiveTab();
});

function navigateToVariant(productId, variantIndex) {
  window.location.href = `/productDetails?id=${productId}&variant=${variantIndex}`;
}

//Add to Wishlist
document.addEventListener('DOMContentLoaded', function () {
  const wishlistButtons = document.querySelectorAll('.add-to-wishlist');
  wishlistButtons.forEach(button => {
    button.addEventListener('click', async function (event) {
      event.preventDefault();

      const productId = button.getAttribute('data-product-id');
      const variantIndex = button.getAttribute('data-variant-index');

      const requestBody = {
        productId: productId,
        variantIndex: parseInt(variantIndex),
      };

      try {
        const response = await fetch('/wishlist/add', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        const result = await response.json();

        if (response.ok) {
          Swal.fire({
            icon: 'success',
            title: 'Success!',
            text: result.message || 'Item added to wishlist successfully!',
            confirmButtonText: 'OK',
          });

          button.innerHTML = '<i class="fa fa-heart" style="color: red;"></i> Added to Wishlist';
          button.classList.add('added-to-wishlist');
        } else {
          Swal.fire({
            icon: 'error',
            title: 'Oops...',
            text: result.message || 'Failed to add item to wishlist.',
            confirmButtonText: 'OK',
          });
        }
      } catch (error) {
        console.error('Error:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'An error occurred while adding the item to the wishlist.',
          confirmButtonText: 'OK',
        });
      }
    });
  });
});

