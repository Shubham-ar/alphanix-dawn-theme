if (!customElements.get('quick-add-inline')) {
  customElements.define(
    'quick-add-inline',
    class QuickAddInline extends HTMLElement {
      constructor() {
        super();
        this.cart =
          document.querySelector('cart-notification') ||
          document.querySelector('cart-drawer');
      }

      connectedCallback() {
        /* Block ALL clicks on this overlay from reaching the card link */
        this.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
        });

        this.querySelectorAll('.quick-add-inline__btn').forEach((btn) => {
          btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.addToCart(btn);
          });
        });

        /*
         * Since we disable the card link's ::after (pointer-events:none) on hover
         * to make our buttons clickable, we must handle card clicks manually.
         * setTimeout ensures the rest of the DOM (product link) is parsed.
         */
        setTimeout(() => {
          const cardWrapper = this.closest('.card-wrapper');
          if (!cardWrapper) return;
          
          const productLink = cardWrapper.querySelector('.card__heading a');
          if (!productLink) return;

          cardWrapper.style.cursor = 'pointer';
          cardWrapper.addEventListener('click', (e) => {
            // Let the quick-add buttons handle their own clicks
            if (e.target.closest('quick-add-inline')) return;
            
            // Navigate to product page for clicks anywhere else on the card
            window.location.href = productLink.href;
          });
        }, 0);
      }

      async addToCart(button) {
        if (button.disabled || button.classList.contains('adding')) return;

        const variantId = button.getAttribute('data-variant-id');
        const originalText = button.textContent;

        button.classList.add('adding');
        button.textContent = '\u2022\u2022\u2022';

        try {
          const formData = new FormData();
          formData.append('id', variantId);
          formData.append('quantity', '1');

          if (this.cart) {
            formData.append(
              'sections',
              this.cart
                .getSectionsToRender()
                .map((section) => section.id)
            );
            formData.append('sections_url', window.location.pathname);
            this.cart.setActiveElement(document.activeElement);
          }

          const config =
            typeof fetchConfig === 'function'
              ? fetchConfig('javascript')
              : { method: 'POST', headers: {} };
          config.headers['X-Requested-With'] = 'XMLHttpRequest';
          delete config.headers['Content-Type'];
          config.body = formData;

          const res = await fetch(
            window.routes?.cart_add_url || '/cart/add.js',
            config
          );
          const response = await res.json();

          if (response.status) {
            throw new Error(response.description || 'Could not add to cart');
          }

          button.classList.remove('adding');
          button.classList.add('added');
          button.textContent = '\u2713';

          if (
            typeof publish === 'function' &&
            typeof PUB_SUB_EVENTS !== 'undefined'
          ) {
            publish(PUB_SUB_EVENTS.cartUpdate, {
              source: 'quick-add-inline',
              productVariantId: variantId,
              cartData: response,
            });
          }

          if (this.cart) {
            this.cart.renderContents(response);
          }

          if (this.cart && this.cart.classList.contains('is-empty')) {
            this.cart.classList.remove('is-empty');
          }

          setTimeout(() => {
            button.textContent = originalText;
            button.classList.remove('added');
          }, 1800);
        } catch (err) {
          console.error('Quick add inline error:', err);
          button.classList.remove('adding');
          button.classList.add('error');
          button.textContent = '\u2717';

          setTimeout(() => {
            button.textContent = originalText;
            button.classList.remove('error');
          }, 1800);
        }
      }
    }
  );
}
