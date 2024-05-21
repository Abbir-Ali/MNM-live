if (!customElements.get('product-form'))  { customElements.define(
  'product-form',
  class ProductForm extends HTMLElement {
    constructor() {
      super();

      this.form = this.querySelector('form');
      this.form.querySelector('[name=id]').disabled = false;
      this.form.addEventListener('submit', this.onSubmitHandler.bind(this));
      this.cart = document.querySelector('cart-notification') || document.querySelector('cart-drawer');
      this.submitButton = this.querySelector('[type="submit"]');

      if (document.querySelector('cart-drawer')) this.submitButton.setAttribute('aria-haspopup', 'dialog');

      this.hideErrors = this.dataset.hideErrors === 'true';
    }

    onSubmitHandler(evt) {
      console.log('Submitting form...');
      evt.preventDefault();
      if (this.submitButton.getAttribute('aria-disabled') === 'true') {
        console.log('Button is disabled, aborting submission.');
        return;
      }

      this.handleErrorMessage();

      this.submitButton.setAttribute('aria-disabled', true);
      this.submitButton.classList.add('loading');
      if (this.querySelector('.loading__spinner'))
        this.querySelector('.loading__spinner').classList.remove('hidden');

      const config = fetchConfig('javascript');
      config.headers['X-Requested-With'] = 'XMLHttpRequest';
      delete config.headers['Content-Type'];

      const formData = new FormData(this.form);
      const selectedVariantId = formData.get('id'); // Get the selected variant ID
      console.log('Selected Variant ID:', selectedVariantId); // Log the selected variant ID

      if (this.cart) {
        formData.append(
          'sections',
          this.cart.getSectionsToRender().map((section) => section.id)
        );
        formData.append('sections_url', window.location.pathname);
        this.cart.setActiveElement(document.activeElement);
      }
      config.body = formData;

      fetch(`${routes.cart_add_url}`, config)
        .then((response) => response.json())
        .then((response) => {
          console.log('Received response:', response);

          // Check if cart data is available in the response
          if (response.cartData) {
            // Log the variant IDs in the cart
            const cartItems = response.cartData.items;
            const variantIdsInCart = cartItems.map(item => item.variantId);
            console.log('Variant IDs in Cart:', variantIdsInCart);

            // Disable "Add to Cart" buttons for variants already in the cart
            const allVariantButtons = document.querySelectorAll('[type="submit"]');
            allVariantButtons.forEach(button => {
              const variantId = button.getAttribute('value');
              console.log('Checking variant:', variantId);
              if (variantIdsInCart.includes(variantId)) {
                console.log('Disabling button for variant:', variantId);
                button.disabled = true;
              }
            });
          }

          // Handle other logic based on the response
          if (response.status) {
            console.log('Error adding to cart:', response.errors || response.description);
            publish(PUB_SUB_EVENTS.cartError, {
              source: 'product-form',
              productVariantId: formData.get('id'),
              errors: response.errors || response.description,
              message: response.message,
            });
            this.handleErrorMessage(response.description);

            const soldOutMessage = this.submitButton.querySelector('.sold-out-message');
            if (!soldOutMessage) return;
            this.submitButton.setAttribute('aria-disabled', true);
            this.submitButton.querySelector('span').classList.add('hidden');
            soldOutMessage.classList.remove('hidden');
            this.error = true;
            return;
          } else if (!this.cart) {
            window.location = window.routes.cart_url;
            return;
          }

          // Update button text to "Added to Cart"
          this.submitButton.textContent = 'Added to Cart';
          // Disable the button after adding to cart
          this.submitButton.disabled = true;

          const quickAddModal = this.closest('quick-add-modal');
          if (quickAddModal) {
            document.body.addEventListener(
              'modalClosed',
              () => {
                setTimeout(() => {
                  this.cart.renderContents(response);
                });
              },
              { once: true }
            );
            quickAddModal.hide(true);
          } else {
            this.cart.renderContents(response);
          }
        })
        .catch((e) => {
          console.error('Error:', e);
        })
        .finally(() => {
          this.submitButton.classList.remove('loading');
          if (this.cart && this.cart.classList.contains('is-empty')) this.cart.classList.remove('is-empty');
          if (!this.error) this.submitButton.removeAttribute('aria-disabled');
          if (this.querySelector('.loading__spinner'))
            this.querySelector('.loading__spinner').classList.add('hidden');
        });
    }

    handleErrorMessage(errorMessage = false) {
      if (this.hideErrors) return;

      this.errorMessageWrapper =
        this.errorMessageWrapper || this.querySelector('.product-form__error-message-wrapper');
      if (!this.errorMessageWrapper) return;
      this.errorMessage = this.errorMessage || this.errorMessageWrapper.querySelector('.product-form__error-message');

      this.errorMessageWrapper.toggleAttribute('hidden', !errorMessage);

      if (errorMessage) {
        this.errorMessage.textContent = errorMessage;
      }
    }
  }
);
                                          }