export type RootStackParamList = {
  Splash: undefined;
  ChooseAuth: undefined;
  DeliveryLocation: undefined;
  Login: undefined;
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
};
