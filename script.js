// =========================
// script.js (FULL)
// =========================
document.addEventListener('DOMContentLoaded', () => {
  /* Helpers */
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => Array.from(root.querySelectorAll(s));
  const lockScroll = (lock) => (document.body.style.overflow = lock ? 'hidden' : 'auto');

  const readableFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  /* =========================
     Theme Toggle
  ========================== */
  (() => {
    const themeToggle = $('#themeToggle');
    const themeSlider = $('.theme-toggle-slider');
    const html = document.documentElement;
    if (!themeToggle || !themeSlider) return;

    const savedTheme = localStorage.getItem('theme') || 'light';
    html.setAttribute('data-theme', savedTheme);
    themeSlider.textContent = savedTheme === 'light' ? '☀️' : '🌙';

    themeToggle.addEventListener('click', () => {
      const current = html.getAttribute('data-theme') || 'light';
      const next = current === 'light' ? 'dark' : 'light';
      html.setAttribute('data-theme', next);
      localStorage.setItem('theme', next);
      themeSlider.textContent = next === 'light' ? '☀️' : '🌙';
    });
  })();

  /* =========================
     Hero Slider
  ========================== */
  (() => {
    const slides = $$('.hero-slide');
    const dots = $$('.slider-dot');
    if (!slides.length || !dots.length) return;

    let currentSlide = 0;
    const total = slides.length;

    const show = (index) => {
      slides.forEach((s) => s.classList.remove('active'));
      dots.forEach((d) => d.classList.remove('active'));
      currentSlide = (index + total) % total;
      slides[currentSlide].classList.add('active');
      dots[currentSlide].classList.add('active');
    };

    const next = () => show(currentSlide + 1);

    let interval = setInterval(next, 5000);

    dots.forEach((dot, idx) => {
      dot.addEventListener('click', () => {
        clearInterval(interval);
        show(idx);
        interval = setInterval(next, 5000);
      });
    });
  })();

  /* =========================
     Mobile Menu
  ========================== */
  (() => {
    const menuToggle = $('#menuToggle');
    const navLinks = $('#navLinks');
    if (!menuToggle || !navLinks) return;

    menuToggle.addEventListener('click', () => navLinks.classList.toggle('active'));
    $$('.nav-links a').forEach((a) => a.addEventListener('click', () => navLinks.classList.remove('active')));
  })();

  /* =========================
     Smooth Scrolling
  ========================== */
  (() => {
    $$('a[href^="#"]').forEach((a) => {
      a.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        if (!href || href === '#') return;

        const target = $(href);
        if (!target) return;

        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  })();

  /* =========================
     Service Card Animation
  ========================== */
  (() => {
    const cards = $$('.service-card');
    if (!cards.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -100px 0px' }
    );

    cards.forEach((card) => {
      card.style.opacity = '0';
      card.style.transform = 'translateY(20px)';
      card.style.transition = 'opacity 0.6s, transform 0.6s';
      observer.observe(card);
    });
  })();

  /* =========================
     Gallery Modal (Global funcs)
  ========================== */
  (() => {
    const modal = $('#imageModal');
    const modalImg = $('#modalImage');
    const caption = $('#modalCaption');
    if (!modal || !modalImg || !caption) return;

    window.openGalleryModal = (img) => {
      modal.style.display = 'block';
      modal.setAttribute('aria-hidden', 'false');
      modalImg.src = img.src;
      caption.textContent = img.alt || '';
      lockScroll(true);
    };

    window.closeImageModal = () => {
      modal.style.display = 'none';
      modal.setAttribute('aria-hidden', 'true');
      lockScroll(false);
    };

    document.addEventListener('click', (e) => {
      if (e.target === modal) window.closeImageModal();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.style.display === 'block') window.closeImageModal();
    });
  })();

  /* =========================
     WhatsApp File Upload + Modal + Toast
  ========================== */
  (() => {
    const fileInput = $('#fileInput');
    const fileName = $('#fileName');
    const sendBtn = $('#sendFileBtn');

    const filePreview = $('#filePreview');
    const fileThumb = $('#fileThumb');
    const fileThumbImg = $('#fileThumbImg');
    const fileInfo = $('#fileInfo');
    const fileInfoName = $('#fileInfoName');
    const fileInfoSize = $('#fileInfoSize');

    const modal = $('#sendConfirmModal');
    const modalPreview = $('#modalPreviewArea');
    const modalClose = $('#sendModalClose');
    const modalBackdrop = $('#sendModalBackdrop');
    const btnSent = $('#modalISentBtn');
    const btnNotSent = $('#modalNotSentBtn');
    const toast = $('#sendToast');

    const required = [fileInput, fileName, sendBtn, filePreview, fileThumb, fileThumbImg, fileInfo, fileInfoName, fileInfoSize, modal, modalPreview, modalClose, modalBackdrop, btnSent, btnNotSent, toast];
    if (required.some((x) => !x)) return;

    let selectedFile = null;

    const showToast = (msg, isError = false) => {
      toast.textContent = msg;
      toast.classList.toggle('error', isError);
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 3000);
    };

    const openModal = () => {
      modal.setAttribute('aria-hidden', 'false');
      lockScroll(true);
    };

    const closeModal = () => {
      modal.setAttribute('aria-hidden', 'true');
      lockScroll(false);
    };

    const resetUI = () => {
      fileInput.value = '';
      fileName.textContent = 'No file chosen';
      fileThumb.style.display = 'none';
      fileInfo.style.display = 'none';
      filePreview.setAttribute('aria-hidden', 'true');
      selectedFile = null;
      sendBtn.disabled = true;
    };

    modalClose.addEventListener('click', closeModal);
    modalBackdrop.addEventListener('click', closeModal);

    fileInput.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      selectedFile = null;

      // reset preview
      fileThumb.style.display = 'none';
      fileInfo.style.display = 'none';
      filePreview.setAttribute('aria-hidden', 'false');

      if (!file) {
        resetUI();
        return;
      }

      selectedFile = file;
      fileName.textContent = `Selected: ${file.name}`;
      sendBtn.disabled = false;

      if (file.type && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          fileThumbImg.src = ev.target.result;
          fileThumb.style.display = 'block';
        };
        reader.readAsDataURL(file);
      } else {
        fileInfoName.textContent = file.name;
        fileInfoSize.textContent = readableFileSize(file.size);
        fileInfo.style.display = 'flex';
      }
    });

    sendBtn.addEventListener('click', () => {
      if (!selectedFile) return;

      const message =
        `Hello Vinayak Xerox & Stationery!\n\n` +
        `I want to print/xerox this file:\n` +
        `File: ${selectedFile.name}\n\n` +
        `Please tell me price and time.`;

      const whatsappUrl = `https://wa.me/919106298729?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');

      // modal preview
      modalPreview.innerHTML = '';
      if (selectedFile.type && selectedFile.type.startsWith('image/')) {
        const img = document.createElement('img');
        img.src = fileThumbImg.src || URL.createObjectURL(selectedFile);
        modalPreview.appendChild(img);
      } else {
        const div = document.createElement('div');
        div.style.display = 'flex';
        div.style.alignItems = 'center';
        div.style.gap = '12px';
        div.innerHTML = `
          <div style="font-size:34px">📄</div>
          <div>
            <div style="font-weight:900">${selectedFile.name}</div>
            <div style="color:var(--text-light);font-size:.95rem">${readableFileSize(selectedFile.size)}</div>
          </div>
        `;
        modalPreview.appendChild(div);
      }

      openModal();
    });

    btnSent.addEventListener('click', () => {
      closeModal();
      showToast('✅ Thanks! Sent confirmation saved.', false);
      resetUI();
    });

    btnNotSent.addEventListener('click', () => {
      closeModal();
      showToast('❌ Not sent. Please try again.', true);
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.getAttribute('aria-hidden') === 'false') {
        closeModal();
      }
    });
  })();
});
