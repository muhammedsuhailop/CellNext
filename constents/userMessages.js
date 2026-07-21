const USER_MESSAGES = Object.freeze({
  AUTH: {
    SUCCESS: {
      OTP_SENT: "OTP sent successfully.",
      OTP_RESENT: "OTP resent successfully.",
      PASSWORD_UPDATED: "Password updated successfully.",
      LOGIN_SUCCESS: "You have successfully logged in!",
      LOGOUT_SUCCESS: "Logged out successfully.",
      ACCOUNT_CREATED: "Account created successfully.",
    },
    ERROR: {
      PASSWORD_MISMATCH: "Passwords do not match.",
      EMAIL_ALREADY_REGISTERED: "Email is already registered.",
      EMAIL_SEND_FAILED: "Failed to send OTP. Please try again later.",
      EMAIL_NOT_FOUND: "Email not found.",
      USER_NOT_FOUND: "User not found.",
      ACCOUNT_BLOCKED: "This account is blocked.",
      INVALID_PASSWORD: "Incorrect password.",
      INVALID_OTP: "Invalid OTP. Please try again.",
      OTP_SEND_FAILED: "Failed to resend OTP. Please try again.",
      INTERNAL_SERVER_ERROR: "Internal server error. Please try again later.",
      SERVER_ERROR: "Server error.",
    },
  },

  PROFILE: {
    SUCCESS: {
      PROFILE_UPDATED: "User profile updated successfully.",
    },
    ERROR: {
      REQUIRED_FIELDS: "First name and phone number are required.",
      USER_NOT_FOUND: "User not found.",
    },
  },

  ADDRESS: {
    SUCCESS: {
      CREATED: "Saved new address successfully.",
      UPDATED: "Address updated successfully.",
      DELETED: "Address deleted successfully.",
    },
    ERROR: {
      REQUIRED_FIELDS: "All fields are required.",
      ADDRESS_TYPE_EXISTS: "An address with this type already exists.",
      ADDRESS_TYPE_ALREADY_EXISTS: "This address type already exists.",
      ADDRESS_NOT_FOUND: "Address not found.",
      ADDRESS_UPDATE_FAILED: "Address update failed.",
      USER_ADDRESS_NOT_FOUND: "User address not found.",
    },
  },

  REFERRAL: {
    SUCCESS: {
      GENERATED: "Referral code generated successfully!",
      ALREADY_EXISTS: "You already have a referral code.",
    },
    ERROR: {
      USER_NOT_FOUND: "User not found.",
      GENERATION_FAILED:
        "An error occurred while generating the referral code.",
    },
  },

  ORDER: {
    SUCCESS: {
      ORDER_PLACED_COD: "Order placed successfully with Cash on Delivery.",
      ORDER_PLACED_WALLET: "Order placed successfully using Wallet.",
      RAZORPAY_ORDER_CREATED: "Razorpay order created successfully.",
      PAYMENT_VERIFIED: "Payment verified.",
      PAYMENT_MARKED_FAILED: "Order marked as payment failed.",
      CANCELLATION_REQUESTED: "Order cancellation requested successfully.",
      ITEM_CANCELLATION_REQUESTED: "Item cancellation requested successfully.",
      RETURN_REQUEST_SUBMITTED: "Return request submitted successfully.",
      PAYMENT_RETRY_INITIATED: "Payment retry initiated successfully.",
    },

    ERROR: {
      MISSING_REQUIRED_FIELDS: "Missing required fields.",
      EMPTY_CART: "Your cart is empty or invalid.",
      PRODUCT_NOT_FOUND: "One or more products not found.",
      VARIANT_NOT_FOUND: "Selected variant not found.",
      MAX_CART_QUANTITY_EXCEEDED: "Maximum quantity allowed per product is 5.",
      INSUFFICIENT_STOCK: "Insufficient stock available.",
      COD_LIMIT_EXCEEDED:
        "Cash on Delivery (COD) is not available for orders above ₹1000.",

      COUPON_INVALID: "Coupon is no longer valid and has been removed.",
      COUPON_EXPIRED: "Coupon has expired and has been removed.",
      COUPON_USAGE_LIMIT_EXCEEDED:
        "Coupon usage limit exceeded and has been removed.",
      COUPON_USER_LIMIT_EXCEEDED:
        "You have already used this coupon the maximum number of times. It has been removed.",
      COUPON_MINIMUM_ORDER: "Your cart does not meet the minimum order amount.",

      INSUFFICIENT_WALLET_BALANCE: "Insufficient wallet balance.",

      INVALID_PAYMENT_METHOD: "Invalid payment method.",
      RAZORPAY_ORDER_FAILED: "Failed to create Razorpay order.",

      INVALID_RAZORPAY_PAYMENT_ID: "Invalid Razorpay payment ID.",
      ORDER_NOT_FOUND: "Order not found.",
      ORDER_ALREADY_PROCESSED: "Order already processed.",
      INVALID_PAYMENT_SIGNATURE: "Invalid payment signature.",
      PAYMENT_VERIFICATION_FAILED: "Payment verification failed.",
      PAYMENT_FAILED: "Payment failed.",

      UNAUTHORIZED_ACCESS: "Unauthorized access.",

      ITEM_NOT_FOUND: "Item not found in order.",
      RETURN_ONLY_DELIVERED:
        "Return request can only be made for delivered items.",
      RETURN_WINDOW_EXPIRED:
        "Return request must be made within 14 days of delivery.",

      INVOICE_ONLY_DELIVERED: "Invoice is available only for delivered orders.",
      INVOICE_GENERATION_FAILED: "Error generating invoice PDF.",

      RETRY_NOT_ALLOWED: "This order is not eligible for retry.",
      RETRY_WINDOW_EXPIRED:
        "Payment retries are allowed only within 24 hours of order initiation.",

      INTERNAL_SERVER_ERROR: "Internal server error.",
      RETRY_PAYMENT_FAILED: "Server error while retrying payment.",
    },
  },

  CHECKOUT: {
    SUCCESS: {},

    ERROR: {
      CART_NOT_FOUND: "Cart not found.",
      EMPTY_CART:
        "Cannot proceed to checkout. Cart is empty or items are out of stock.",
      FETCH_CART_FAILED: "Error fetching cart data.",
    },
  },

  CART: {
    SUCCESS: {
      ADDED: "Successfully added to cart.",
      ITEM_REMOVED: "Item removed successfully.",
      COUPON_APPLIED: "Coupon applied successfully.",
      COUPON_REMOVED: "Coupon removed successfully.",
    },

    ERROR: {
      CART_NOT_FOUND: "Cart not found.",
      EMPTY_CART:
        "Cannot proceed to checkout. Cart is empty or items are out of stock.",
      FETCH_CART_FAILED: "Error fetching cart data.",

      LOGIN_REQUIRED: "Please login to add products to cart.",

      PRODUCT_NOT_FOUND: "Product not found.",
      VARIANT_NOT_FOUND: "Variant not found.",

      STOCK_NOT_AVAILABLE: "Not enough stock available for this variant.",
      INSUFFICIENT_STOCK: "Item in cart! Insufficient stock.",
      MAX_CART_QUANTITY: "Maximum cart quantity: 5",

      REMOVE_ITEM_FAILED: "Failed to remove item.",

      LOGIN_REQUIRED_FOR_COUPON: "Please log in to apply a coupon.",
      CART_EMPTY: "Your cart is empty.",
      INVALID_COUPON: "Invalid or expired coupon.",
      COUPON_EXPIRED: "Coupon has expired or is not yet active.",
      COUPON_USAGE_LIMIT_EXCEEDED: "Coupon usage limit exceeded.",
      COUPON_USER_LIMIT_EXCEEDED:
        "You have already used this coupon the maximum number of times.",
      COUPON_MINIMUM_ORDER:
        "Your cart does not meet the minimum order amount of",

      NO_COUPON_APPLIED: "No coupon applied.",
      REMOVE_COUPON_FAILED: "Failed to remove coupon.",

      INTERNAL_SERVER_ERROR: "Internal Server Error.",
      SERVER_ERROR: "Server error.",
    },
  },

  WISHLIST: {
    SUCCESS: {
      ITEM_ALREADY_EXISTS: "Item already exists in the wishlist.",
      ITEM_ADDED: "Item added to wishlist successfully.",
      ITEM_REMOVED: "Product removed from wishlist successfully.",
    },

    ERROR: {
      WISHLIST_NOT_FOUND: "Wishlist not found.",
      REMOVE_ITEM_FAILED: "Failed to remove product from wishlist.",
      INTERNAL_SERVER_ERROR: "Internal server error.",
    },
  },
});

module.exports = {
  USER_MESSAGES,
};
