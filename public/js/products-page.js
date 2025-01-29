function redirectToProduct(productId) {
    window.location.href = `/productDetails?id=${productId}`;
  }

$(document).ready(function() {
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

    $(window).resize(function() {
      applyZoom();
    });
  });



  document.addEventListener('DOMContentLoaded', function() {
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


  