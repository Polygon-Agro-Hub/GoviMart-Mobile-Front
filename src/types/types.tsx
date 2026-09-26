// ─── Navigation Route Params ─────────────────────────────────────────────────

export interface CheckoutDetails {
  deliveryMethod: "home" | "pickup";
  title?: string;
  fullName?: string;
  phoneCode1?: string;
  phone1?: string;
  phoneCode2?: string;
  phone2?: string;
  // Home delivery fields
  buildingType?: "house" | "apartment";
  cityName?: string;
  companycenterId?: number;
  houseNo?: string;
  street?: string;
  buildingNo?: string;
  buildingName?: string;
  flatNumber?: string;
  floorNumber?: string;
  saveAs?: string;
  // Pickup fields
  centerId?: number;
  centreName?: string;
  // Schedule fields
  scheduleType?: string;
  deliveryDate?: string;
  timeSlot?: string;
  recurringDays?: string[];
  validityWeeks?: string;
  calculatedOrders?: { index: number; label: string; date: string }[];
  // Geo
  geoLatitude?: number;
  geoLongitude?: number;
  // Coupon
  isCoupon?: boolean;
  couponValue?: number;
  couponType?: string;
}

export interface OrderContext {
  cartId?: number;
  grandTotal: number;
  packageTotal: number;
  productTotal: number;
  discount: number;
  deliveryCharge?: number;
  isFinalizeImdt?: number;
  deliveryMethod?: "home" | "pickup";
  checkoutDetails?: CheckoutDetails;
  paymentMethod?: "cash" | "card";
  creditPaid?: number;
  moneyPaid?: number;
}

export type RootStackParamList = {
  Splash: undefined;
  ChooseAuth: undefined;
  DeliveryLocation: undefined;
  CameraAccess?: {
    returnScreen?: keyof RootStackParamList;
  };
  LocationAccess?: {
    returnScreen?: keyof RootStackParamList;
    blockBackNavigation?: boolean;
  };
  NotificationAccess?: {
    returnScreen?: keyof RootStackParamList;
    returnParams?: any;
    blockBackNavigation?: boolean;
  };
  Login: undefined;
  ForgotPassword: undefined;
  ForgotPasswordInput: { method: "email" | "sms" };
  ForgotPasswordOTP: {
    method: "email" | "sms";
    identifier: string;
    phoneCode?: string;
    phoneNumber?: string;
    email?: string;
    referenceId: string;
    resetToken: string;
  };
  ResetPassword: { verifiedResetToken: string };
  UpdatePassword: { customerId?: number; name?: string; number?: string; redirectTo?: keyof RootStackParamList; } | undefined;
  SignUp: { nearestCity?: string; cityId?: number } | undefined;
  PrivacyPolicy: undefined;
  Home: undefined;
  SignUpOTP: {
    phoneCode: string;
    phoneNumber: string;
    email?: string;
    method?: "sms" | "email";
    referenceId?: string;
    signupToken?: string;
    flow?: "signup" | "changePhone";
    accountDetails?: UpdateUserDetailsPayload | null;
  } | undefined;
  ExcludeListAdd: { customerId: number; name?: string; title?: string; number?: string; id?: number } | undefined;
  // NOTE: "Summery" spelling is intentional — kept for consistency across the codebase.
  ExcludeListSummery: { customerId: number; name?: string; title?: string; phoneNumber?: string; cusId?: string; id?: number } | undefined;
  Profile: undefined;
  ViewProduct: {
    product: ProductType | undefined;
  };
  ViewPackage: {
    packageId: number;
    packageName: string;
    image: string;
    price: number;
  };
  MyCart: undefined;
  PackageConfirmation: { orderContext?: OrderContext } | undefined;
  SavedAddresses: undefined;
  EditAddress: { address: SavedAddress };
  AddNewAddress: { fromCheckout?: boolean } | undefined;
  ReportComplaint: undefined;
  ComplaintHistory: undefined;
  ViewComplaint: { id: number } | undefined;
  MyAccount: undefined;
  DeleteAccount: undefined;
  Notification: undefined;
  CheckoutScreen: { orderContext: OrderContext };
  ScheduleOrder: { orderContext: OrderContext };
  PaymentMethod: { total: number; orderContext?: OrderContext };
  PaymentScreen: { amount?: number; title?: string; orderContext?: OrderContext } | undefined;
  OrderDeliveryMethod: { orderContext?: OrderContext } | undefined;
  OrderConfirmed: {
    orderId?: string | number;
    invoiceNumber?: string;
    total?: number;
    orderContext?: OrderContext;
    deliveryDate?: string;
    scheduleDate?: string;
    timeSlot?: string;
  } | undefined;
  SetLocation: undefined;
  ChoosePickupCentre: { orderContext?: OrderContext } | undefined;
  OrderHistory: undefined;
  OrderDetails: { orderId: string } | undefined;
  ViewLocation: { latitude: number; longitude: number; title: string };
  ReviewPackage: { orderId?: string | number; invoiceNo?: string; replacedProduct?: any; targetStepIndex?: number; newScheduleDate?: string; } | undefined;
 SetQauntity: { orderId?: string | number; fromProduct?: any; toProduct?: any; packageId?: string; orderPackageId?: number; replceId?: number; stepIndex?: number; paymentMethod?: string; deliveryMethod?: "home" | "pickup"; } | undefined;
  OrderCancelConfirmation: {
    orderId?: string | number;
    processOrderId?: string | number;
    packages?: Array<{
      id: string;
      name: string;
      icon?: string;
      image?: string;
      qty: number;
      unitPrice: number;
    }>;
    alaCarteItems?: Array<{
      id: string;
      name: string;
      icon?: string;
      image?: string;
      weight: string;
      price: number;
      originalPrice?: number;
    }>;
    totalPaid?: number;
    totalPaidCard?: number;
    totalPaidCredit?: number;
    totalCashDue?: number;
    processOrderTotal?: number;
    paymentMethod?: string;
    refundCreditAmount?: number;
  } | undefined;
 ReplaceProduct: { orderId?: string | number; fromProduct?: any; packageId?: string; orderPackageId?: number; replceId?: number; stepIndex?: number; paymentMethod?: string; deliveryMethod?: "home" | "pickup"; } | undefined;
};

// ─── Product / Package Types (shared across screens) ─────────────────────────

export interface PackageType {
  type: "package";
  id: number;
  displayName: string;
  subTotal: string;
  image: string;
  totalItems?: number;
}

export interface ProductType {
  type: "product";
  id: number;
  category: string;
  changeby?: string;
  cropNameEnglish: string;
  cropNameSinhala?: string;
  cropNameTamil?: string;
  discountedPrice?: number;
  discount?: number;
  comPrice?: number | string;
  tags?: string;
  unitType?: string;
  displayName: string;
  image: string;
  normalPrice: string;
  startValue?: string;
  varietyNameEnglish?: string;
  bgColor?: string;
  /** marketplaceitems.isEnable — 1/true = active, 0/false = disabled */
  isEnable?: number | boolean;
  displayType?: string;
}

export type ShopItem = ProductType | PackageType;

// ─── Address Types ────────────────────────────────────────────────────────────

export interface SavedAddress {
  id: number;
  buildingType: string;
  saveAs?: string;
  title?: string;
  fullName?: string;
  phonecode1?: string;
  phone1?: string;
  phonecode2?: string;
  phone2?: string;
  longitude?: number;
  latitude?: number;
  buildingNo?: string;
  buildingName?: string;
  unitNo?: string;
  floorNo?: string;
  houseNo?: string;
  streetName?: string;
  city?: string;
}

// ─── Auth Payloads ────────────────────────────────────────────────────────────

export interface LoginPayload {
  identifier: string;
  password: string;
}

export interface SignUpPayload {
  title: string;
  firstName: string;
  lastName: string;
  phoneCode: string;
  phoneNumber: string;
  buyerType: string;
  email: string;
  nic: string;
  password: string;
  confirmPassword: string;
  agreeToMarketing?: boolean;
  agreeToTerms: boolean;
  city?: string | null;
  cityId?: number | null;
  companyName?: string | null;
  companyPhoneCode?: string | null;
  companyPhoneNumber?: string | null;
}

// ─── Customer Payloads ────────────────────────────────────────────────────────

export interface UpdateUserDetailsPayload {
  title?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  companyName?: string;
  companyPhoneCode?: string;
  companyPhoneNumber?: string;
}

export interface AddressPayload {
  buildingType: string;
  originalBuildingType?: string;
  saveAs?: string;
  billingTitle?: string;
  billingName?: string;
  billingPhoneCode1?: string;
  billingPhone1?: string;
  billingPhoneCode2?: string;
  billingPhone2?: string;
  longitude?: number;
  latitude?: number;
  buildingNo?: string;
  buildingName?: string;
  unitNo?: string;
  floorNo?: string;
  houseNo?: string;
  streetName?: string;
  city?: string;
}

export interface PhoneChangeOtpPayload {
  phoneCode: string;
  phoneNumber: string;
}

export interface VerifyPhoneChangePayload {
  code: string;
  referenceId: string;
  signupToken: string;
  accountDetails?: UpdateUserDetailsPayload | null;
}

//___________Review Package screen types________________
export type PackageSummary = {
    id: string;
    name: string;
    icon: string; // emoji placeholder — swap for an <Image> when you have assets
    qty: number;
    unitPrice: number;
};
 
export type ReviewProduct = {
    id: string;
    itemId?: number;
    productId?: number;
    category: string; // e.g. "Up Country Fruit (1)"
    name: string;
    icon: string;
    image?: string;
    price: number;
    quantity: number;
    unit: "kg" | "g";
    step: number;
    productType?: number | string;
    productTypeId?: number | string;
    productTypeName?: string;
    excludedWarning?: string;
    isReplaced?: boolean;
    originalProduct?: ReviewProduct;
    minQuantity?: number;
};
 
export type PackageReview = {
    id: string;
    no: number;
    name: string;
    products: ReviewProduct[];
    originalPackagePrice: number;
    serviceFee: number;
    packingFee: number;
};
