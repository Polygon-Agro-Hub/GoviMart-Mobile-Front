export type RootStackParamList = {
  Splash: undefined;
  ChooseAuth: undefined;
  DeliveryLocation: undefined;
  Login: undefined;
  UpdatePassword: { customerId: number; name?: string; number?: string } | undefined;
  SignUp: { nearestCity?: string; cityId?: number } | undefined;
  Home: undefined;
  SignUpOTP: {
    phoneCode: string;
    phoneNumber: string;
    email?: string;
    method?: "sms" | "email";
    referenceId?: string;
    signupToken?: string;
  } | undefined;
  ExcludeListAdd: { customerId: number; name?: string; title?: string; number?: string; id?: number } | undefined;
  ExcludeListSummery: { customerId: number; name?: string; title?: string; phoneNumber?: string; cusId?: string; id?: number } | undefined;
  Profile: undefined;
  ViewProduct: {
    product: {
      id: number;
      name: string;
      image: string;
      price: string;
      weight: string;
      isNew?: boolean;
    };
  };
  ViewPackage: {
    itemPackage: {
      id: number;
      name: string;
      image: string;
      price: number;
      packageItems: {
        itemName: string;
        quantity: number;
      }[];
    };
  }
  MyCart: undefined;
  PackageConfirmation: undefined;
  SavedAddresses: undefined;
  EditAddress: undefined;
  AddNewAddress: undefined;
  ReportComplaint: undefined;
  ComplaintHistory: undefined;
  ViewComplaint: undefined;
  MyAccount: undefined;
  DeleteAccount: undefined;
  Notification: undefined;
  PaymentMethod: {total: number;};
  OrderDeliveryMethod: undefined;
  OrderConfirmed: undefined
  SetLocation: undefined;
  ChoosePickupCentre: undefined;

};
