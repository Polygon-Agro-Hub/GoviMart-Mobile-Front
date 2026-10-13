import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  phoneCode?: string;
  image: string;
  firstTimeUser: number;
  buyerType: string;
  id?: number;
  title?: string;
  cusId?: string;
  companyName?: string;
}

interface RememberedDetails {
  identifier?: string;
}

interface AuthState {
  token: string | null;
  userProfile: UserProfile | null;
  loginTime: number | null;
  rememberMe: boolean;
  rememberedDetails: RememberedDetails | null;
}

const initialState: AuthState = {
  token: null,
  userProfile: null,
  loginTime: null,
  rememberMe: false,
  rememberedDetails: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    loginSuccess: (
      state,
      action: PayloadAction<{ token: string; userProfile: UserProfile; loginTime: number }>
    ) => {
      state.token = action.payload.token;
      state.userProfile = action.payload.userProfile;
      state.loginTime = action.payload.loginTime;
    },
    logoutSuccess: (state) => {
      state.token = null;
      state.userProfile = null;
      state.loginTime = null;
    },
    setRememberMeDetails: (
      state,
      action: PayloadAction<{ rememberMe: boolean; rememberedDetails: RememberedDetails | null }>
    ) => {
      state.rememberMe = action.payload.rememberMe;
      state.rememberedDetails = action.payload.rememberedDetails;
    },
    updateUserProfileFlag: (state, action: PayloadAction<{ firstTimeUser: number }>) => {
      if (state.userProfile) {
        state.userProfile.firstTimeUser = action.payload.firstTimeUser;
      }
    },
    updateUserProfileImage: (state, action: PayloadAction<{ image: string }>) => {
      if (state.userProfile) {
        state.userProfile.image = action.payload.image;
      }
    },
    updateUserProfile: (state, action: PayloadAction<Partial<UserProfile>>) => {
      if (state.userProfile) {
        state.userProfile = { ...state.userProfile, ...action.payload };
      } else {
        state.userProfile = action.payload as UserProfile;
      }
    },
    updateToken: (state, action: PayloadAction<string>) => {
      state.token = action.payload;
    },
  },
});

export const {
  loginSuccess,
  logoutSuccess,
  setRememberMeDetails,
  updateUserProfileFlag,
  updateUserProfileImage,
  updateUserProfile,
  updateToken,
} = authSlice.actions;

export default authSlice.reducer;
