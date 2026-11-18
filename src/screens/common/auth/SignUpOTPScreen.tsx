import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Platform,
  Image,
  Alert,
  Keyboard,
  BackHandler,
  ActivityIndicator,
  AppState,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { RouteProp, useFocusEffect } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "@/types/types";
import { FontAwesome5, MaterialIcons, AntDesign } from "@expo/vector-icons";
import CustomHeader from "@/component/common/CustomHeader";
import { AlertModal } from "@/component/common/AlertModal";
import * as Clipboard from "expo-clipboard";
import axios from "axios";
import { environment } from "@/environment/environment";
import customerService from "@/services/customer/customer.service";
import socketService from "@/services/socket/socket.service";
import cartService from "@/services/cart/cart.service";
import { useDispatch } from "react-redux";
import { loginSuccess } from "@/store/authSlice";
import { setCartFromBackend } from "@/store/cartSlice";

type SignUpOTPRouteProp = RouteProp<RootStackParamList, "SignUpOTP">;
type SignUpOTPNavigationProp = StackNavigationProp<
  RootStackParamList,
  "SignUpOTP"
>;

interface SignUpOTPProps {
  route: SignUpOTPRouteProp;
  navigation: SignUpOTPNavigationProp;
}

const OTP_LENGTH = 5;
const EMPTY_OTP = () => "";

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 60 minutes window to count attempts
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes lockout duration
const MAX_OTP_ATTEMPTS = 5;
const OTP_TIMER_SECONDS = 240; // 4 minutes
const LOCKOUT_SECONDS = LOCKOUT_DURATION_MS / 1000; // 900 seconds (15 minutes)

// Space (px) to keep between the verify area and the top of the keyboard.
const VERIFY_EXTRA_SPACE = 16;

export const getSignUpStorageKeys = (
  phoneCode?: string,
  phoneNumber?: string,
  email?: string,
  method: "email" | "sms" = "sms",
): { lockoutKeys: string[]; attemptsKeys: string[] } => {
  const identifiers: string[] = [];

  if (method === "email" && email && String(email).trim()) {
    const cleanEmail = String(email)
      .trim()
      .toLowerCase()
      .replace(/[^a-zA-Z0-9]/g, "");
    if (cleanEmail) identifiers.push(`email_${cleanEmail}`);
  }

  if (method === "sms" && phoneNumber && String(phoneNumber).trim()) {
    const rawDigits = String(phoneNumber)
      .trim()
      .replace(/[^0-9]/g, "");
    const noZero = rawDigits.replace(/^0+/, "");
    const codeDigits = String(phoneCode || "94").replace(/[^0-9]/g, "");

    if (noZero) {
      identifiers.push(`sms_${codeDigits}${noZero}`);
      identifiers.push(`sms_${codeDigits}${rawDigits}`);
      identifiers.push(`sms_${noZero}`);
      identifiers.push(`sms_${rawDigits}`);
    }
  }

  if (identifiers.length === 0) {
    if (email) {
      identifiers.push(
        `email_${String(email)
          .trim()
          .toLowerCase()
          .replace(/[^a-zA-Z0-9]/g, "")}`,
      );
    } else if (phoneNumber) {
      identifiers.push(`sms_${String(phoneNumber).replace(/[^0-9]/g, "")}`);
    }
  }

  const unique = [...new Set(identifiers)];
  return {
    lockoutKeys: unique.map((id) => `@signup_lockout_${id}`),
    attemptsKeys: unique.map((id) => `@otp_attempts_${id}`),
  };
};

const getRecentAttempts = async (key: string): Promise<number[]> => {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return [];
    const timestamps: number[] = JSON.parse(raw);
    const now = Date.now();
    return timestamps.filter((ts) => now - ts < RATE_LIMIT_WINDOW_MS);
  } catch {
    return [];
  }
};

const saveAttempt = async (key: string): Promise<number[]> => {
  try {
    const recent = await getRecentAttempts(key);
    const updated = [...recent, Date.now()];
    await AsyncStorage.setItem(key, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
};

const clearAttempts = async (key: string) => {
  try {
    await AsyncStorage.removeItem(key);
  } catch {}
};

const SignUpOTP: React.FC<SignUpOTPProps> = ({ route, navigation }) => {
  const dispatch = useDispatch();
  const phoneCode = route.params?.phoneCode || "+94";
  const phoneNumber = route.params?.phoneNumber || "771122300";
  const email = route.params?.email || "";
  const method = (route.params?.method as "email" | "sms") || "sms";
  const [referenceId, setReferenceId] = useState(
    route.params?.referenceId || "",
  );
  const [signupToken, setSignupToken] = useState(
    route.params?.signupToken || "",
  );
  const flow = route.params?.flow || "signup";
  const accountDetails = route.params?.accountDetails || null;
  const formattedPhone = `${phoneCode} ${phoneNumber}`;

  const { lockoutKeys, attemptsKeys } = getSignUpStorageKeys(
    phoneCode,
    phoneNumber,
    email,
    method,
  );
  const primaryAttemptKey =
    attemptsKeys[0] ||
    (method === "email"
      ? `@otp_attempts_email_${email}`
      : `@otp_attempts_sms_${phoneNumber}`);

  // State Management
  const [otp, setOtp] = useState<string>("");
  const [isInputFocused, setIsInputFocused] = useState<boolean>(false);
  const [otpSessionKey, setOtpSessionKey] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(OTP_TIMER_SECONDS);
  const [isExpired, setIsExpired] = useState(false);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [attemptsCount, setAttemptsCount] = useState<number>(1);
  const remainingAttempts = Math.max(0, MAX_OTP_ATTEMPTS - attemptsCount);

  // Alert Modal
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState<"error" | "success">("error");
  const [alertCallback, setAlertCallback] = useState<(() => void) | null>(null);

  const showAlert = (
    title: string,
    message: string,
    type: "error" | "success" = "error",
    onOk?: () => void,
  ) => {
    Keyboard.dismiss();
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertType(type);
    setAlertCallback(() => onOk || null);
    setAlertVisible(true);
  };

  // Master Input Ref
  const inputRef = useRef<TextInput>(null);

  // Synchronous locks (refs update immediately, state does not)
  const resendLockRef = useRef(false);
  const verifyLockRef = useRef(false);
  // FIX: true once the server accepted the code. Blocks any further
  // verification and any error alert that could replace the success alert.
  const verifiedRef = useRef(false);
  // FIX: last code that was auto-submitted (a code is submitted only once).
  const autoSubmittedRef = useRef<string>("");
  const lastUsedClipboardRef = useRef<string>("");
  const appStateRef = useRef(AppState.currentState);

  // ---------- Keyboard / scroll handling ----------
  const scrollRef = useRef<ScrollView>(null);
  const rootRef = useRef<View>(null);
  const verifyWrapRef = useRef<View>(null);
  const scrollYRef = useRef(0);
  const keyboardTopRef = useRef(0);

  // Scroll only as much as needed so the verify area sits just above
  // the keyboard.
  const ensureVisible = useCallback(() => {
    verifyWrapRef.current?.measureInWindow((_x, y, _w, h) => {
      const limit = keyboardTopRef.current - VERIFY_EXTRA_SPACE;
      const overflow = y + h - limit;
      if (overflow > 0) {
        scrollRef.current?.scrollTo({
          y: scrollYRef.current + overflow,
          animated: true,
        });
      }
    });
  }, []);

  useEffect(() => {
    const showListener = Keyboard.addListener("keyboardDidShow", (e) => {
      keyboardTopRef.current = e.endCoordinates.screenY;
      setIsKeyboardVisible(true);

      // Measure how much the keyboard REALLY covers the screen. If the OS
      // already resized the window, the overlap is 0 and no extra padding
      // is added.
      const kbTop = e.endCoordinates.screenY;
      setTimeout(() => {
        rootRef.current?.measureInWindow((_rx, ry, _rw, rh) => {
          setKeyboardHeight(Math.max(0, ry + rh - kbTop));
        });
      }, 100);

      // wait for bottom padding to render, then scroll
      setTimeout(ensureVisible, 300);
    });

    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const hideListener = Keyboard.addListener(hideEvent, () => {
      setIsKeyboardVisible(false);
      setKeyboardHeight(0);
    });

    return () => {
      showListener.remove();
      hideListener.remove();
    };
  }, [ensureVisible]);

  // Clear all boxes. Focus is NOT restored here: the keyboard must stay
  // closed while an alert is on screen, otherwise it covers the OK button.
  const resetOtp = () => {
    setOtp("");
  };

  // Re-focus the OTP input only AFTER the user dismisses an alert (taps OK).
  const focusInputAfterAlert = () => {
    setTimeout(() => {
      inputRef.current?.focus();
    }, 150);
  };

  // Check clipboard for 5-digit OTP
  const checkClipboardForOtp = useCallback(async () => {
    try {
      if (isRateLimited || isVerifying || isExpired || verifiedRef.current)
        return;
      const hasString = await Clipboard.hasStringAsync();
      if (!hasString) return;
      const content = await Clipboard.getStringAsync();
      if (!content) return;
      const trimmed = content.trim();

      const match = trimmed.match(/\b\d{5}\b/);
      if (match && match[0]) {
        const foundOtp = match[0];
        if (foundOtp !== lastUsedClipboardRef.current && foundOtp !== otp) {
          lastUsedClipboardRef.current = foundOtp;
          setOtp(foundOtp);
        }
      }
    } catch {
      // Ignore clipboard read errors
    }
  }, [isRateLimited, isVerifying, isExpired, otp]);

  // Ensure master input focuses automatically when screen mounts or returns to focus
  useFocusEffect(
    useCallback(() => {
      if (verifiedRef.current) return;
      checkClipboardForOtp();
      const t = setTimeout(() => {
        if (!isRateLimited && !isVerifying && !verifiedRef.current) {
          inputRef.current?.focus();
        }
      }, 250);
      return () => clearTimeout(t);
    }, [checkClipboardForOtp, isRateLimited, isVerifying]),
  );

  // Check clipboard immediately on mount as well
  useEffect(() => {
    checkClipboardForOtp();
  }, [checkClipboardForOtp]);

  // Restart autofill session on fresh signup token / reference ID
  useEffect(() => {
    setOtpSessionKey((prev) => prev + 1);
    setOtp("");
    lastUsedClipboardRef.current = "";
    // FIX: a fresh code must be allowed to auto-submit
    verifiedRef.current = false;
    autoSubmittedRef.current = "";
    const t = setTimeout(() => {
      if (!isRateLimited && !isVerifying) {
        inputRef.current?.focus();
      }
    }, 200);
    return () => clearTimeout(t);
  }, [signupToken, referenceId]);

  // When app returns to foreground from SMS / Mail app, refocus input and check clipboard
  useEffect(() => {
    const sub = AppState.addEventListener("change", (nextState) => {
      const prev = appStateRef.current;
      appStateRef.current = nextState;
      if (prev && prev.match(/inactive|background/) && nextState === "active") {
        setTimeout(() => {
          if (!isRateLimited && !isVerifying && !verifiedRef.current) {
            inputRef.current?.focus();
          }
        }, 150);
        checkClipboardForOtp();
      }
    });
    return () => sub.remove();
  }, [checkClipboardForOtp, isRateLimited, isVerifying]);

  // ---------- Rate limit helpers ----------
  const showLockoutAlert = () => {
    showAlert(
      "Too Many Attempts",
      "Too many verification attempts. Please try again after 15 minutes.",
      "error",
      focusInputAfterAlert,
    );
  };

  const applyRateLimitLockout = async () => {
    const lockoutUntil = Date.now() + LOCKOUT_DURATION_MS;
    for (const key of lockoutKeys) {
      await AsyncStorage.setItem(key, String(lockoutUntil));
    }
    setOtp("");
    setTimeLeft(LOCKOUT_SECONDS);
    setIsRateLimited(true);
    setIsExpired(false);
    setAttemptsCount(MAX_OTP_ATTEMPTS);
    showLockoutAlert();
  };

  // Check rate limit on initial mount
  useEffect(() => {
    const checkInitialRateLimit = async () => {
      // 1. Check persistent lockout
      for (const key of lockoutKeys) {
        try {
          const storedLockout = await AsyncStorage.getItem(key);
          if (storedLockout) {
            const lockoutUntil = parseInt(storedLockout, 10);
            const remainingMs = lockoutUntil - Date.now();
            if (remainingMs > 0) {
              const remainingSec = Math.ceil(remainingMs / 1000);
              setTimeLeft(remainingSec);
              setIsRateLimited(true);
              setIsExpired(false);
              setAttemptsCount(MAX_OTP_ATTEMPTS);
              showLockoutAlert();
              return;
            } else {
              await AsyncStorage.removeItem(key);
              for (const attKey of attemptsKeys) {
                await AsyncStorage.removeItem(attKey);
              }
            }
          }
        } catch (e) {
          console.log("Error checking stored lockout:", e);
        }
      }

      // 2. Check recent attempts count
      for (const key of attemptsKeys) {
        const attempts = await getRecentAttempts(key);
        if (attempts.length >= MAX_OTP_ATTEMPTS) {
          await applyRateLimitLockout();
          return;
        }
      }

      // 3. Count the initial OTP send as an attempt (once per 30s window)
      const attempts = await getRecentAttempts(primaryAttemptKey);
      const lastAttempt = attempts[attempts.length - 1];
      if (!lastAttempt || Date.now() - lastAttempt > 30000) {
        let currentCount = 1;
        for (const attKey of attemptsKeys) {
          const updated = await saveAttempt(attKey);
          currentCount = Math.max(currentCount, updated.length);
        }
        setAttemptsCount(Math.min(currentCount, MAX_OTP_ATTEMPTS));
      } else {
        setAttemptsCount(Math.min(attempts.length || 1, MAX_OTP_ATTEMPTS));
      }
    };
    checkInitialRateLimit();
  }, [phoneCode, phoneNumber, email, method]);

  // Wrong code: the server tracks wrong entries, so show its message.
  // The keyboard stays closed while the alert is visible and the input is
  // re-focused only after OK is tapped.
  const handleWrongCode = async (msg: string) => {
    resetOtp();
    const displayMsg =
      !msg || /incorrect|invalid|remaining/i.test(msg)
        ? "Incorrect verification code. Please try again."
        : msg;
    showAlert("Invalid Code", displayMsg, "error", focusInputAfterAlert);
  };

  const handleBackPress = useCallback(() => {
    if (flow === "changePhone") {
      navigation.navigate("MyAccount");
    } else {
      navigation.goBack();
    }
  }, [flow, navigation]);

  useEffect(() => {
    const onHardwareBack = () => {
      handleBackPress();
      return true;
    };
    const sub = BackHandler.addEventListener(
      "hardwareBackPress",
      onHardwareBack,
    );
    return () => sub.remove();
  }, [handleBackPress]);

  // Countdown timer logic
  useEffect(() => {
    if (timeLeft <= 0) {
      if (isRateLimited) {
        setIsRateLimited(false);
        (async () => {
          for (const key of attemptsKeys) {
            await clearAttempts(key);
          }
          for (const key of lockoutKeys) {
            await AsyncStorage.removeItem(key);
          }
          setAttemptsCount(0);
        })();
      }
      setIsExpired(true);
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft((prev: number) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, isRateLimited]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const handleOtpChange = (text: string) => {
    const cleanText = text.replace(/[^0-9]/g, "").slice(0, OTP_LENGTH);
    setOtp(cleanText);
  };

  const handleSessionExpired = () => {
    resetOtp();
    showAlert(
      "Session Expired",
      "Your registration session has expired. Please sign up again to continue.",
      "error",
      () => {
        if (flow === "changePhone") {
          navigation.navigate("MyAccount");
        } else {
          navigation.navigate("SignUp");
        }
      },
    );
  };

  const handleFailedVerifyResponse = async (data: any) => {
    // FIX: never show an error after the code was already accepted
    if (verifiedRef.current) return;

    const is429 = data?.isRateLimited;
    const msg = data?.message || "Incorrect verification code.";
    if (is429 || /too many|15 minutes/i.test(msg)) {
      // applyRateLimitLockout already shows the lockout alert
      await applyRateLimitLockout();
    } else if (/session.*expired|expired.*invalid/i.test(msg)) {
      handleSessionExpired();
    } else {
      await handleWrongCode(msg);
    }
  };

  // Called automatically once all digits are entered or manually on Verify button press
  const handleVerify = async (codeOverride?: string) => {
    // FIX: also block if the code was already accepted
    if (verifyLockRef.current || verifiedRef.current) return;

    const code = (codeOverride ?? otp).trim();
    if (code.length < OTP_LENGTH) {
      if (!codeOverride) {
        showAlert(
          "Invalid Code",
          "Please enter the full 5-digit verification code.",
          "error",
          focusInputAfterAlert,
        );
      }
      return;
    }

    // Persistent lockout
    for (const key of lockoutKeys) {
      try {
        const storedLockout = await AsyncStorage.getItem(key);
        if (storedLockout && parseInt(storedLockout, 10) > Date.now()) {
          setOtp("");
          showLockoutAlert();
          return;
        }
      } catch (e) {}
    }

    if (isExpired) {
      resetOtp();
      showAlert(
        "Code Expired",
        "Your verification code has expired. Please request a new code.",
        "error",
        focusInputAfterAlert,
      );
      return;
    }

    verifyLockRef.current = true;
    Keyboard.dismiss();
    setIsVerifying(true);
    try {
      if (flow === "changePhone") {
        const response = await customerService.verifyPhoneChange({
          code,
          referenceId,
          signupToken,
          accountDetails,
        });

        if (response.data && response.data.status) {
          // FIX: mark success BEFORE anything else so no second verify can run
          verifiedRef.current = true;
          for (const key of lockoutKeys) {
            await AsyncStorage.removeItem(key);
          }
          for (const key of attemptsKeys) {
            await clearAttempts(key);
          }
          showAlert(
            "Phone Number Updated",
            response.data.message ||
              "Your mobile number has been successfully updated.",
            "success",
            () => navigation.navigate("MyAccount"),
          );
        } else {
          await handleFailedVerifyResponse(response.data);
        }
      } else {
        const response = await axios.post(
          `${environment.API_BASE_URL}api/auth/verify-signup`,
          {
            code,
            referenceId,
            signupToken,
          },
        );

        if (response.data && response.data.status) {
          // FIX: mark success BEFORE anything else so no second verify can run
          verifiedRef.current = true;
          for (const key of lockoutKeys) {
            await AsyncStorage.removeItem(key);
          }
          for (const key of attemptsKeys) {
            await clearAttempts(key);
          }

          const userData = response.data.data;
          const token = userData?.token;

          if (token && userData) {
            dispatch(
              loginSuccess({
                token: token,
                userProfile: userData,
                loginTime: Date.now(),
              }),
            );
            await AsyncStorage.setItem("userToken", token);
            await AsyncStorage.setItem("userProfile", JSON.stringify(userData));
            await AsyncStorage.setItem("loginTime", String(Date.now()));

            if (userData.id) {
              socketService.registerUser(userData.id, token);
            }

            try {
              const cartRes = await cartService.getUserCart();
              if (cartRes.data && cartRes.data.status && cartRes.data.data) {
                const dbProducts = cartRes.data.data.products || [];
                const dbPackages = cartRes.data.data.packages || [];
                dispatch(
                  setCartFromBackend({
                    products: dbProducts,
                    packages: dbPackages,
                    cartUserId: userData.id,
                  }),
                );
              }
            } catch (cartErr) {
              console.warn("Failed to load user cart on signup:", cartErr);
            }

            const isWholesale =
              (userData.buyerType || "").toLowerCase() === "wholesale";

            if (isWholesale) {
              showAlert(
                "Registration Submitted",
                "Your wholesale account has been created and your Business Registration (BR) is submitted for review.",
                "success",
                () => {
                  navigation.navigate("Login");
                },
              );
              return;
            }

            const targetScreen: keyof RootStackParamList = "ExcludeListAdd";
            const targetParams = {
              customerId: userData.id,
              name: `${userData.firstName || ""} ${userData.lastName || ""}`.trim(),
              title: userData.title,
              number: userData.phoneNumber,
              cusId: userData.cusId,
            };

            showAlert(
              "Registration Successful",
              "Your Polygon account created successfully.",
              "success",
              async () => {
                try {
                  const hasAsked = await AsyncStorage.getItem(
                    "hasAskedNotificationPermission",
                  );

                  if (hasAsked !== "true") {
                    navigation.navigate("NotificationAccess", {
                      returnScreen: targetScreen,
                      returnParams: targetParams,
                      blockBackNavigation: true,
                    });
                    return;
                  }
                } catch (err) {
                  console.warn(
                    "Error reading notification permission flag:",
                    err,
                  );
                }

                navigation.navigate(targetScreen as any, targetParams);
              },
            );
          } else {
            showAlert(
              "Registration Successful",
              "Your Polygon account created successfully.",
              "success",
              () => navigation.navigate("Login"),
            );
          }
        } else {
          await handleFailedVerifyResponse(response.data);
        }
      }
    } catch (err: any) {
      // FIX: never show an error after the code was already accepted
      if (verifiedRef.current) return;

      console.error("Verification error:", err);
      const status = err.response?.status;
      const is429 = status === 429 || err.response?.data?.isRateLimited;
      const msg =
        err.response?.data?.message || "An unexpected error occurred.";

      if (is429 || /too many|15 minutes/i.test(msg)) {
        await applyRateLimitLockout();
      } else if (/session.*expired|expired.*invalid/i.test(msg)) {
        handleSessionExpired();
      } else if (status && [400, 401, 403, 422].includes(status)) {
        await handleWrongCode(msg);
      } else {
        // Network / 5xx errors: clear so the user can re-enter and retry
        resetOtp();
        showAlert("Verification Error", msg, "error", focusInputAfterAlert);
      }
    } finally {
      verifyLockRef.current = false;
      setIsVerifying(false);
    }
  };

  // Auto-verify as soon as all digits are filled.
  // FIX: each distinct code is submitted only once, and never after success.
  useEffect(() => {
    if (otp.length < OTP_LENGTH) {
      // allow re-submit after the user edits/clears the code
      autoSubmittedRef.current = "";
      return;
    }
    if (
      otp.length === OTP_LENGTH &&
      !isVerifying &&
      !isRateLimited &&
      !isExpired &&
      !verifiedRef.current &&
      autoSubmittedRef.current !== otp
    ) {
      autoSubmittedRef.current = otp;
      handleVerify(otp);
    }
  }, [otp, isVerifying, isRateLimited, isExpired]);

  const handleResend = async () => {
    // Block double taps (ref updates synchronously, state does not)
    if (resendLockRef.current) return;
    resendLockRef.current = true;

    try {
      // 1. Persistent lockout
      for (const key of lockoutKeys) {
        try {
          const storedLockout = await AsyncStorage.getItem(key);
          if (storedLockout) {
            const lockoutUntil = parseInt(storedLockout, 10);
            const remainingMs = lockoutUntil - Date.now();
            if (remainingMs > 0) {
              const remainingSec = Math.ceil(remainingMs / 1000);
              setTimeLeft(remainingSec);
              setIsRateLimited(true);
              setIsExpired(false);
              setAttemptsCount(MAX_OTP_ATTEMPTS);
              showLockoutAlert();
              return;
            } else {
              await AsyncStorage.removeItem(key);
              for (const attKey of attemptsKeys) {
                await AsyncStorage.removeItem(attKey);
              }
            }
          }
        } catch (e) {}
      }

      // 2. Check attempts count BEFORE sending
      for (const key of attemptsKeys) {
        const attempts = await getRecentAttempts(key);
        if (attempts.length >= MAX_OTP_ATTEMPTS) {
          await applyRateLimitLockout();
          return;
        }
      }

      setOtp("");
      // FIX: a new code must be allowed to auto-submit
      verifiedRef.current = false;
      autoSubmittedRef.current = "";
      lastUsedClipboardRef.current = "";
      setOtpSessionKey((prev) => prev + 1);
      setIsResending(true);
      try {
        let response: any;
        if (flow === "changePhone") {
          response = await customerService.resendPhoneChangeOtp({
            signupToken,
          });
        } else {
          response = await axios.post(
            `${environment.API_BASE_URL}api/auth/resend-signup-otp`,
            {
              signupToken,
            },
          );
        }

        if (response.data && response.data.status) {
          let updatedLength = 0;
          for (const key of attemptsKeys) {
            const updated = await saveAttempt(key);
            updatedLength = Math.max(updatedLength, updated.length);
          }
          setAttemptsCount(Math.min(updatedLength, MAX_OTP_ATTEMPTS));
          setReferenceId(response.data.referenceId);
          setSignupToken(response.data.signupToken);

          if (updatedLength >= MAX_OTP_ATTEMPTS) {
            await applyRateLimitLockout();
            showAlert(
              "Code Resent",
              "A new 5-digit verification code has been sent. You have reached the maximum limit of 5 OTP requests. Next attempt will be available after 15 minutes.",
              "success",
              focusInputAfterAlert,
            );
          } else {
            setTimeLeft(OTP_TIMER_SECONDS);
            setIsExpired(false);
            const remaining = Math.max(0, MAX_OTP_ATTEMPTS - updatedLength);
            showAlert(
              "Code Resent",
              `${
                response.data.message ||
                (method === "email"
                  ? "Verification code has been resent to your email address."
                  : "Verification code has been resent to your mobile number.")
              }\n\n(${remaining} resend ${
                remaining === 1 ? "attempt" : "attempts"
              } remaining)`,
              "success",
              focusInputAfterAlert,
            );
          }
          inputRef.current?.focus();
        } else {
          const is429 = response.data?.isRateLimited;
          const msg = response.data?.message || "Failed to resend the code.";
          if (is429 || msg.toLowerCase().includes("too many")) {
            await applyRateLimitLockout();
          } else if (/session.*expired|expired.*invalid/i.test(msg)) {
            handleSessionExpired();
          } else {
            showAlert("Resend Failed", msg, "error", focusInputAfterAlert);
          }
        }
      } catch (err: any) {
        console.error("Resend error:", err);
        const is429 = err.response?.status === 429;
        const msg =
          err.response?.data?.message || "An unexpected error occurred.";
        if (
          is429 ||
          msg.toLowerCase().includes("too many") ||
          msg.toLowerCase().includes("15 minutes")
        ) {
          await applyRateLimitLockout();
        } else if (/session.*expired|expired.*invalid/i.test(msg)) {
          handleSessionExpired();
        } else {
          showAlert("Resend Error", msg, "error", focusInputAfterAlert);
        }
      } finally {
        setIsResending(false);
      }
    } finally {
      resendLockRef.current = false;
    }
  };

  return (
    <View ref={rootRef} collapsable={false} className="flex-1 bg-white">
      <StatusBar backgroundColor="#ffffff" barStyle="dark-content" />

      {/* Custom Header with Logo instead of Title */}
      <CustomHeader
        showLogo={true}
        showBackButton={true}
        navigation={navigation}
        onBackPress={handleBackPress}
      />

      <ScrollView
        ref={scrollRef}
        className="flex-1 bg-white"
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "space-between",
          // Manually lift content above the keyboard (works on iOS and
          // Android, including edge-to-edge production builds).
          paddingBottom: keyboardHeight,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        bounces={false}
        onScroll={(e) => {
          scrollYRef.current = e.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={16}
      >
        {/* Verification Content */}
        <View className="w-full px-4 py-8 justify-center">
          <Text className="text-2xl font-bold text-black text-center mb-4">
            {method === "email"
              ? "Verify your email address"
              : "Verify your mobile number"}
          </Text>

          <Text className="text-sm font-semibold text-[#5A5859] text-center mb-2">
            We’ve sent a 5-digit verification code to :
          </Text>
          {/* Phone Number / Email Display with Icon */}
          <View className="flex-row items-center justify-center gap-x-2 mt-6 mb-8 bg-[#F2F2F6] px-4 py-2 rounded-full self-center">
            {method === "email" ? (
              <MaterialIcons name="email" size={14} color="#5A5859" />
            ) : (
              <FontAwesome5 name="phone-alt" size={14} color="#5A5859" />
            )}
            <Text className="text-sm font-bold text-[#5A5859]">
              {method === "email" ? email : formattedPhone}
            </Text>
          </View>

          {/* 5 OTP Digit Input Boxes Container */}
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => inputRef.current?.focus()}
            className="relative my-8 px-2"
          >
            {/* Master TextInput for 100% reliable SMS autofill & keyboard input */}
            <TextInput
              key={`otp_session_${otpSessionKey}`}
              ref={inputRef}
              value={otp}
              onChangeText={handleOtpChange}
              keyboardType="number-pad"
              maxLength={OTP_LENGTH}
              textContentType="oneTimeCode"
              autoComplete={
                Platform.OS === "android" ? "sms-otp" : "one-time-code"
              }
              importantForAutofill="yes"
              editable={!isRateLimited && !isVerifying}
              onFocus={() => setIsInputFocused(true)}
              onBlur={() => setIsInputFocused(false)}
              autoFocus
              caretHidden
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                width: "100%",
                height: "100%",
                opacity: Platform.OS === "android" ? 0.01 : 0,
                color: "transparent",
                backgroundColor: "transparent",
                zIndex: 10,
              }}
            />

            {/* Visual 5-box display */}
            <View
              pointerEvents="none"
              className="flex-row justify-between w-full"
            >
              {Array.from({ length: OTP_LENGTH }).map((_, index) => {
                const digit = otp[index] || "";
                const isFocused =
                  isInputFocused &&
                  (otp.length === index ||
                    (otp.length === OTP_LENGTH && index === OTP_LENGTH - 1));

                return (
                  <View
                    key={index}
                    className="w-[50px] h-[50px] border rounded-xl justify-center items-center bg-white"
                    style={{
                      borderColor: isFocused ? "#FF9114" : "#000000",
                      borderWidth: isFocused ? 2 : 1,
                    }}
                  >
                    <Text
                      style={{
                        textAlign: "center",
                        fontSize: 20,
                        fontWeight: "bold",
                        color: "#000000",
                        ...(Platform.OS === "android"
                          ? { includeFontPadding: false }
                          : {}),
                      }}
                    >
                      {digit}
                    </Text>
                  </View>
                );
              })}
            </View>
          </TouchableOpacity>

          {/* Rate Limit / Code Expired Banner */}
          {isRateLimited && timeLeft > 0 ? (
            <View className="bg-[#FFF5E9] p-4 rounded-2xl flex-row items-center gap-x-3 mt-6 border-0">
              <FontAwesome5
                name="info-circle"
                size={16}
                color="#FF9114"
                style={{ alignSelf: "center" }}
              />
              <View className="flex-1">
                <Text className="text-sm font-bold text-black mb-1">
                  Too Many Attempts!
                </Text>
                <Text className="text-xs text-black leading-relaxed">
                  Too many verification attempts. Please try again after 15
                  minutes.
                </Text>
              </View>
            </View>
          ) : isExpired ? (
            <View className="bg-[#FFF5E9] p-4 rounded-2xl flex-row items-center gap-x-3 mt-6 border-0">
              <FontAwesome5
                name="info-circle"
                size={16}
                color="black"
                style={{ alignSelf: "center" }}
              />
              <View className="flex-1">
                <Text className="text-sm font-bold text-black mb-1">
                  Code Expired!
                </Text>
                <Text className="text-xs text-black leading-relaxed">
                  Your verification code has expired. Please request a new code
                  to continue.
                </Text>
              </View>
            </View>
          ) : null}

          {/* Resend Helper / Countdown Details */}
          <View className="mt-12 w-full">
            {/* Divider lines next to Didn't receive the code */}
            <View className="flex-row items-center my-6">
              <View className="flex-1 h-[1px] bg-gray-200" />
              <Text className="text-sm font-semibold text-[#5A5859] mx-4">
                Didn’t receive the code ?
              </Text>
              <View className="flex-1 h-[1px] bg-gray-200" />
            </View>

            {timeLeft > 0 ? (
              <View className="flex-row justify-center items-center gap-x-2 mt-2">
                <AntDesign name="reload" size={14} color="#FF9114" />
                <Text className="text-sm font-semibold text-black">
                  Resend OTP in{" "}
                </Text>
                <Text className="text-sm font-semibold text-[#FF9114]">
                  {formatTime(timeLeft)}
                </Text>
              </View>
            ) : (
              <TouchableOpacity
                onPress={handleResend}
                disabled={isVerifying || isResending}
                activeOpacity={0.7}
                className="flex-row justify-center items-center gap-x-2 mt-2"
              >
                <AntDesign name="reload" size={14} color="#FF9114" />
                <Text className="text-sm font-bold text-[#FF9114] underline">
                  {isResending
                    ? "Resending..."
                    : method === "email"
                      ? "Resend Email"
                      : "Resend SMS"}
                </Text>
              </TouchableOpacity>
            )}

            {!isRateLimited && remainingAttempts > 0 && (
              <Text className="text-xs text-[#5A5859] text-center mt-2 font-medium">
                ({remainingAttempts}{" "}
                {remainingAttempts === 1 ? "attempt" : "attempts"} remaining)
              </Text>
            )}
          </View>
        </View>

        {/* Action Buttons (inside the ScrollView so it scrolls above the keyboard) */}
        <View className="bg-white">
          <View
            ref={verifyWrapRef}
            collapsable={false}
            className="px-6 pt-2 pb-3"
          >
            <TouchableOpacity
              onPress={() => handleVerify()}
              disabled={isVerifying || isResending}
              activeOpacity={0.8}
              className="bg-black rounded-full items-center justify-center h-[50px] w-full"
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 6,
                elevation: 5,
              }}
            >
              {isVerifying ? (
                <View className="flex-row items-center justify-center">
                  <ActivityIndicator size="small" color="#ffffff" />
                  <Text className="text-white text-base font-bold ml-2">
                    Verifying...
                  </Text>
                </View>
              ) : (
                <Text className="text-white text-base font-bold">Verify</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Bottom image: hidden while the keyboard is open */}
          {!isKeyboardVisible && (
            <View className="h-14 mt-3 w-full">
              <Image
                source={require("@/assets/images/auth/bottom-line.webp")}
                style={{ width: "100%", height: "100%", resizeMode: "stretch" }}
              />
            </View>
          )}
        </View>
      </ScrollView>

      {/* Alert Modal */}
      <AlertModal
        visible={alertVisible}
        title={alertTitle}
        message={alertMessage}
        type={alertType}
        onClose={() => {
          setAlertVisible(false);
          if (alertCallback) {
            const cb = alertCallback;
            setAlertCallback(null);
            cb();
          } else {
            inputRef.current?.focus();
          }
        }}
        autoClose={false}
        showOkButton={true}
        okButtonText="OK"
        onOkPress={() => {
          setAlertVisible(false);
          if (alertCallback) {
            const cb = alertCallback;
            setAlertCallback(null);
            cb();
          } else {
            inputRef.current?.focus();
          }
        }}
      />
    </View>
  );
};

export default SignUpOTP;