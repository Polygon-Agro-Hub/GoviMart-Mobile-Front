import { ProductType } from "@/screens/home/HomeScreen";

export type RootStackParamList = {
  Splash: undefined;
  ChooseAuth: undefined;
  DeliveryLocation: undefined;
  Login: undefined;
  UpdatePassword: { customerId?: number; name?: string; number?: string, redirectTo?: keyof RootStackParamList; } | undefined;
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
    accountDetails?: any;
  } | undefined;
  ExcludeListAdd: { customerId: number; name?: string; title?: string; number?: string; id?: number } | undefined;
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
  PackageConfirmation: undefined;
  SavedAddresses: undefined;
  EditAddress: { address: any };
  AddNewAddress: undefined;
  ReportComplaint: undefined;
  ComplaintHistory: undefined;
  ViewComplaint: { id: number } | undefined;
  MyAccount: undefined;
  DeleteAccount: undefined;
  Notification: undefined;
  PaymentMethod: { total: number; };
  OrderDeliveryMethod: undefined;
  OrderConfirmed: undefined
  SetLocation: undefined;
  ChoosePickupCentre: undefined;
  OrderHistory: undefined;
  OrderDetails: undefined;
  ViewLocation: { latitude: number, longitude: number, title: string };
};
