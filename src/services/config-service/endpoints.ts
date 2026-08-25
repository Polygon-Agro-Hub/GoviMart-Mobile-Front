export const ENDPOINTS = {
  AUTH: {
    SIGN_UP: "api/auth/signup",
    LOGIN: "api/auth/login",
    LOGOUT: "api/auth/logout",
    UPDATE_PASSWORD: "api/auth/update-password",
  },

  CUSTOMER: {
    GET_ACCOUNT_DETAILS: "api/customer/account-details",
    GET_SAVED_ADDRESSES: "api/customer/fetch-saved-addresses",
    ADD_ADDRESS: "api/customer/add-address",
    UPDATE_ADDRESS: "api/customer/update-address/:addressId",
    DELETE_ADDRESS: "api/customer/delete-address",
    UPDATE_USER_DETAILS: "api/customer/update-details",
    DELETE_ACCOUNT: "api/customer/delete-account",
    SEND_PHONE_CHANGE_OTP: "api/customer/send-phone-change-otp",
    VERIFY_PHONE_CHANGE_OTP: "api/customer/verify-phone-change-otp",
    RESEND_PHONE_CHANGE_OTP: "api/customer/resend-phone-change-otp",
  },

  COMPLAINT: {
    GET_CATEGORIES: "api/complaint/categories",
    CREATE_COMPLAINT: "api/complaint/create-complain",
    GET_MY_COMPLAINTS: "api/complaint/my-complaints",
    GET_COMPLAINT_DETAILS: "api/complaint/complain",
  },

  PRODUCT: {
    GET_ALL_PRODUCTS: "api/product/all-product",
    GET_PACKAGE_DETAILS: "api/product/package-details/:packageId",
    GET_PRODUCTS_BY_CATEGORY: "api/product/by-category",
    GET_BANNERS: "api/product/slides",
  },

  ORDER: {
    GET_ORDER_HISTORY: "api/order/order-history",
    GET_ORDER_BY_ID: "api/order/:orderId",
    GET_ORDER_PACKAGES: "api/order/packages/:orderId",
    GET_ORDER_ADDITIONAL_ITEMS: "api/order/additional-items/:orderId",
  },
};