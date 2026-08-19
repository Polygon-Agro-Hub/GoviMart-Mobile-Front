export const ENDPOINTS = {
  //  Edit this with your real enpoint names
  AUTH: {
    SIGN_UP: "api/auth/signup", //this is real
    LOGIN: "api/auth/login", //this is real
    LOGOUT: "/api/auth/logout",
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
  }

  // BANNER: {
  //   GET_ALL: "/api/banner/list",
  // },
};