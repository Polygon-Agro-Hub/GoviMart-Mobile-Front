// ─── Navigation Route Params ─────────────────────────────────────────────────

export type RootStackParamList = {
  Splash: undefined;
  ChooseAuth: undefined;
  DeliveryLocation: undefined;
  Login: undefined;
  UpdatePassword: { customerId?: number; name?: string; number?: string; redirectTo?: keyof RootStackParamList; } | undefined;
  SignUp: { nearestCity?: string; cityId?: number } | undefined;
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
  // TODO: Register PackageConfirmation in navigator when ready
  PackageConfirmation: undefined;
  SavedAddresses: undefined;
  EditAddress: { address: SavedAddress };
  AddNewAddress: undefined;
  ReportComplaint: undefined;
  ComplaintHistory: undefined;
  ViewComplaint: { id: number } | undefined;
  MyAccount: undefined;
  DeleteAccount: undefined;
  Notification: undefined;
  PaymentMethod: { total: number; };
  OrderDeliveryMethod: undefined;
  OrderConfirmed: undefined;
  SetLocation: undefined;
  ChoosePickupCentre: undefined;
  OrderHistory: undefined;
  OrderDetails: { orderId: string } | undefined;
  ViewLocation: { latitude: number; longitude: number; title: string };
  ReviewPackage: undefined;
  SetQauntity: undefined;
  OrderCancelConfirmation: undefined;
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
    category: string; // e.g. "Up Country Fruit (1)"
    name: string;
    icon: string;
    price: number;
    quantity: number;
    unit: "kg" | "g";
    step: number;
    excludedWarning?: string;
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
