import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  Keyboard,
  Modal,
  ActivityIndicator,
} from "react-native";
import { FontAwesome6 } from "@expo/vector-icons";
import { StackNavigationProp } from "@react-navigation/stack";
import { useFocusEffect } from "@react-navigation/native";
import { RootStackParamList } from "@/types/types";
import CustomHeader from "@/component/common/CustomHeader";
import LoadingPage from "@/component/common/LoadingPage";
import customerService from "@/services/customer/customer.service";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useDispatch } from "react-redux";
import { logoutSuccess } from "@/store/authSlice";
import { clearCart } from "@/store/cartSlice";

type DeleteAccountNavigationProp = StackNavigationProp<
  RootStackParamList,
  "DeleteAccount"
>;

interface DeleteAccountProps {
  navigation: DeleteAccountNavigationProp;
}

// Space (px) kept between the confirmation box and the keyboard.
// This leaves room for the fixed bottom button (~72px) plus a small gap.
const EXTRA_SPACE = 100;

const DeleteAccount: React.FC<DeleteAccountProps> = ({ navigation }) => {
  const dispatch = useDispatch();
  const scrollViewRef = useRef<ScrollView>(null);

  const [confirmation, setConfirmation] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [hasNegativeCredit, setHasNegativeCredit] = useState(false);
  const [hasProcessingOrders, setHasProcessingOrders] = useState(false);
  const [creditBalance, setCreditBalance] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Keyboard / scroll refs
  const rootRef = useRef<View>(null);
  const scrollYRef = useRef(0);
  const keyboardTopRef = useRef(0);
  const keyboardOpenRef = useRef(false);
  const confirmWrapRef = useRef<View>(null);

  // Scroll only as much as needed so the confirmation box sits just above
  // the fixed bottom button (not at the top of the screen).
  const ensureVisible = useCallback(() => {
    confirmWrapRef.current?.measureInWindow((_x, y, _w, h) => {
      const limit = keyboardTopRef.current - EXTRA_SPACE;
      const overflow = y + h - limit;
      if (overflow > 0) {
        scrollViewRef.current?.scrollTo({
          y: scrollYRef.current + overflow,
          animated: true,
        });
      }
    });
  }, []);

  // Track keyboard visibility + how much it really covers the screen
  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", (e) => {
      keyboardOpenRef.current = true;
      keyboardTopRef.current = e.endCoordinates.screenY;
      setIsKeyboardVisible(true);

      // Measure the real overlap. If Android already resized the window,
      // the overlap is 0 and no extra space is added (no white gap).
      const kbTop = e.endCoordinates.screenY;
      setTimeout(() => {
        rootRef.current?.measureInWindow((_rx, ry, _rw, rh) => {
          setKeyboardHeight(Math.max(0, ry + rh - kbTop));
        });
      }, 100);

      // wait for layout to update, then scroll
      setTimeout(ensureVisible, 300);
    });

    const hideSub = Keyboard.addListener("keyboardDidHide", () => {
      keyboardOpenRef.current = false;
      setIsKeyboardVisible(false);
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [ensureVisible]);

  useFocusEffect(
    useCallback(() => {
      const fetchDeleteStatus = async () => {
        try {
          setLoadingStatus(true);
          const response = await customerService.getDeleteAccountStatus();
          if (response.data && response.data.status && response.data.data) {
            const { hasNegativeCredit, hasProcessingOrders, creditBalance } =
              response.data.data;
            setHasNegativeCredit(Boolean(hasNegativeCredit));
            setHasProcessingOrders(Boolean(hasProcessingOrders));
            setCreditBalance(Number(creditBalance || 0));
          }
        } catch (error) {
          console.log("Failed to fetch delete account status: ", error);
        } finally {
          setLoadingStatus(false);
        }
      };
      fetchDeleteStatus();
    }, []),
  );

  const isDeleteEnabled = confirmation.toUpperCase() === "DELETE";

  const handleDelete = () => {
    if (!isDeleteEnabled || deleting) {
      return;
    }

    Alert.alert(
      "Delete Account",
      "Are you sure you want to permanently delete your account?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              Keyboard.dismiss();
              setDeleting(true);
              await customerService.deleteAccount();

              await AsyncStorage.removeItem("userToken");
              await AsyncStorage.removeItem("userProfile");
              await AsyncStorage.removeItem("userLoginTime");

              dispatch(clearCart());
              dispatch(logoutSuccess());

              navigation.reset({
                index: 0,
                routes: [{ name: "ChooseAuth" }],
              });
            } catch (error: any) {
              console.log("Failed to delete account: ", error);
              setDeleting(false);
              const msg =
                error.response?.data?.message ||
                "Failed to delete account. Please try again.";
              // Small delay so iOS can finish closing the Modal before the Alert shows
              setTimeout(() => Alert.alert("Error", msg), 300);
            }
          },
        },
      ],
    );
  };

  const handleClearNegativeCredit = () => {
    navigation.navigate("PaymentScreen", {
      amount: Math.abs(creditBalance),
      title: "Payment Summery",
    });
  };

  return (
    <View
      ref={rootRef}
      collapsable={false}
      style={{
        flex: 1,
        backgroundColor: "#FFFFFF",
      }}
    >
      {/* Header */}
      <CustomHeader
        navigation={navigation}
        title="Delete Account"
        showBackButton={true}
      />

      {loadingStatus ? (
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <LoadingPage
            message="Checking Account Status..."
            fullScreen={false}
          />
        </View>
      ) : (
        <>
          <ScrollView
            ref={scrollViewRef}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            scrollEnabled={true}
            nestedScrollEnabled={true}
            alwaysBounceVertical={true}
            bounces={true}
            onScroll={(e) => {
              scrollYRef.current = e.nativeEvent.contentOffset.y;
            }}
            scrollEventThrottle={16}
            contentContainerStyle={{
              flexGrow: 1,
              paddingHorizontal: 14,
              // keyboardHeight lifts the content above the keyboard
              // (works in production builds even with edge-to-edge enabled)
              paddingBottom: isKeyboardVisible
                ? 120 + keyboardHeight
                : !hasProcessingOrders || hasNegativeCredit
                  ? 80
                  : 24,
            }}
          >
            {/* Delete Icon */}
            <View
              style={{
                alignItems: "center",
                marginTop: 0,
                marginBottom: isKeyboardVisible ? 8 : 25,
              }}
            >
              <View
                style={{
                  width: isKeyboardVisible ? 46 : 57,
                  height: isKeyboardVisible ? 46 : 57,
                  borderRadius: 999,
                  backgroundColor: "#FFE8E8",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <FontAwesome6
                  name="trash"
                  size={isKeyboardVisible ? 18 : 22}
                  color="#FF383C"
                />
              </View>
            </View>

            {/* Title */}
            <Text
              style={{
                textAlign: "center",
                fontSize: 16,
                fontWeight: "600",
                color: "#000000",
                marginBottom: isKeyboardVisible ? 4 : 7,
              }}
            >
              Delete Your Account?
            </Text>

            {/* Description */}
            <Text
              style={{
                textAlign: "center",
                fontSize: isKeyboardVisible ? 13 : 14,
                lineHeight: isKeyboardVisible ? 17 : 20,
                fontWeight: "400",
                color: "#494A65",
                paddingHorizontal: 8,
                marginBottom: isKeyboardVisible ? 6 : 18,
              }}
            >
              <Text style={{ color: "#FF383C" }}>This action is permanent.</Text>
              {"\n"}
              Your account data will be deleted,{"\n"}
              while certain information may be retained{"\n"}
              for legal or record-keeping purposes.
            </Text>

            {/* What will be deleted */}
            <View
              style={{
                borderWidth: 1,
                borderColor: "#DDE2E7",
                borderRadius: 17,
                paddingHorizontal: 14,
                paddingVertical: isKeyboardVisible ? 8 : 12,
                marginHorizontal: 3,
              }}
            >
              <Text
                style={{
                  textAlign: "left",
                  fontSize: 14,
                  fontWeight: "700",
                  color: "#000000",
                  marginLeft: 10,
                  marginBottom: isKeyboardVisible ? 4 : 9,
                }}
              >
                What will be deleted?
              </Text>

              <View>
                {[
                  "• Your personal information and profile.",
                  "• All order history and transaction details.",
                  "• Saved addresses and payment methods.",
                  "• Account preferences and settings.",
                  "• Any remaining positive credit balance.",
                ].map((item) => (
                  <Text
                    key={item}
                    style={{
                      fontSize: 12,
                      color: "#494A65",
                      lineHeight: isKeyboardVisible ? 18 : 22,
                    }}
                  >
                    {item}
                  </Text>
                ))}
              </View>
            </View>

            {/* Flexible spacer to push bottom components close to bottom */}
            <View
              style={{
                flex: isKeyboardVisible ? 0 : 1,
                minHeight: isKeyboardVisible ? 0 : 20,
              }}
            />

            {hasNegativeCredit ? (
              <View
                style={{
                  backgroundColor: "#FFEAEA",
                  borderRadius: 16,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  flexDirection: "row",
                  alignItems: "center",
                  marginTop: 12,
                  marginBottom: 8,
                  marginHorizontal: 3,
                }}
              >
                <FontAwesome6 name="shield-halved" size={16} color="#FF3B42" />
                <Text
                  style={{
                    fontSize: 12,
                    color: "#111111",
                    fontWeight: "500",
                    lineHeight: 17,
                    marginLeft: 10,
                    flex: 1,
                  }}
                >
                  You have a negative credit balance on your account. Please
                  clear the outstanding balance before deleting your account.
                </Text>
              </View>
            ) : hasProcessingOrders ? (
              <View
                style={{
                  backgroundColor: "#FFEAEA",
                  borderRadius: 16,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  flexDirection: "row",
                  alignItems: "center",
                  marginTop: 12,
                  marginBottom: 16,
                  marginHorizontal: 3,
                }}
              >
                <FontAwesome6 name="shield-halved" size={16} color="#FF3B42" />
                <Text
                  style={{
                    fontSize: 12,
                    color: "#111111",
                    fontWeight: "500",
                    lineHeight: 17,
                    marginLeft: 10,
                    flex: 1,
                  }}
                >
                  You have processing orders. Once all of them are completed,
                  you may delete your account.
                </Text>
              </View>
            ) : (
              <>
                {/* Confirmation Text */}
                <View
                  style={{
                    alignItems: "center",
                    marginTop: isKeyboardVisible ? 4 : 12,
                    marginBottom: isKeyboardVisible ? 4 : 14,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "500",
                      color: "#111111",
                      textAlign: "center",
                      lineHeight: isKeyboardVisible ? 17 : 19,
                    }}
                  >
                    To confirm account deletion,
                  </Text>

                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "500",
                      color: "#111111",
                      textAlign: "center",
                      lineHeight: isKeyboardVisible ? 17 : 19,
                    }}
                  >
                    please type{" "}
                    <Text
                      style={{
                        color: "#FF383C",
                      }}
                    >
                      DELETE
                    </Text>{" "}
                    in the box below.
                  </Text>
                </View>

                {/* Confirmation Input */}
                <View
                  ref={confirmWrapRef}
                  collapsable={false}
                  style={{
                    height: 50,
                    borderWidth: 1,
                    borderColor: "#DDE2E7",
                    borderRadius: 999,
                    flexDirection: "row",
                    alignItems: "center",
                    paddingHorizontal: 7,
                    marginHorizontal: 0,
                    marginBottom: isKeyboardVisible ? 4 : 8,
                  }}
                >
                  {/* Lock Icon */}
                  <View
                    style={{
                      width: 27,
                      height: 27,
                      borderRadius: 14,
                      backgroundColor: "#F1F2F4",
                      justifyContent: "center",
                      alignItems: "center",
                      marginRight: 9,
                    }}
                  >
                    <FontAwesome6 name="lock" solid size={13} color="#000000" />
                  </View>

                  {/* Input */}
                  <TextInput
                    value={confirmation}
                    onChangeText={(text) => {
                      const cleaned = text.replace(/^\s+/, "").toUpperCase();
                      setConfirmation(cleaned);
                    }}
                    onFocus={() => {
                      // if keyboard is already open, adjust now
                      if (keyboardOpenRef.current) {
                        setTimeout(ensureVisible, 150);
                      }
                    }}
                    placeholder="Type DELETE to confirm"
                    placeholderTextColor="#747990"
                    autoCapitalize="characters"
                    maxLength={6}
                    style={{
                      flex: 1,
                      height: "100%",
                      fontSize: 14,
                      color: "#FF3B42",
                      fontWeight: "500",
                      paddingVertical: 0,
                    }}
                  />

                  {/* Character Count */}
                  <Text
                    style={{
                      fontSize: 12,
                      color: "#7B7F91",
                      marginRight: 7,
                    }}
                  >
                    {confirmation.length}/6
                  </Text>
                </View>
              </>
            )}
          </ScrollView>

          {/* BOTTOM BUTTON (lifted above the keyboard by keyboardHeight) */}
          {(!hasProcessingOrders || hasNegativeCredit) && (
            <View
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: keyboardHeight,
                paddingHorizontal: 14,
                paddingBottom: 12,
                paddingTop: 8,
                backgroundColor: "#FFFFFF",
              }}
            >
              {hasNegativeCredit ? (
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={handleClearNegativeCredit}
                  style={{
                    height: 52,
                    borderRadius: 27,
                    backgroundColor: "#FF383C",
                    justifyContent: "center",
                    alignItems: "center",
                    shadowColor: "#000",
                    shadowOffset: {
                      width: 0,
                      height: 2,
                    },
                    shadowOpacity: 0.12,
                    shadowRadius: 4,
                    elevation: 3,
                  }}
                >
                  <Text
                    style={{
                      color: "#FFFFFF",
                      fontSize: 14,
                      fontWeight: "700",
                      letterSpacing: 0.2,
                    }}
                  >
                    Clear Negative Credit Balance
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  activeOpacity={0.85}
                  disabled={!isDeleteEnabled || deleting}
                  onPress={handleDelete}
                  style={{
                    height: 52,
                    borderRadius: 27,
                    backgroundColor: isDeleteEnabled ? "#FF3B42" : "#8C9FA8",
                    justifyContent: "center",
                    alignItems: "center",
                    shadowColor: "#000",
                    shadowOffset: {
                      width: 0,
                      height: 2,
                    },
                    shadowOpacity: 0.12,
                    shadowRadius: 4,
                    elevation: 3,
                  }}
                >
                  <Text
                    style={{
                      color: "#FFFFFF",
                      fontSize: 14,
                      fontWeight: "700",
                      letterSpacing: 0.2,
                    }}
                  >
                    {deleting ? "Deleting..." : "Delete My Account"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </>
      )}

      {/* Deleting popup: shown only while the account is being deleted */}
      <Modal
        visible={deleting}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => {}} // block Android back button while deleting
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.55)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 20,
              paddingVertical: 36,
              paddingHorizontal: 40,
              alignItems: "center",
              minWidth: 220,
            }}
          >
            <ActivityIndicator size="large" color="#000000" />
            <Text
              style={{
                marginTop: 16,
                fontSize: 15,
                fontWeight: "600",
                color: "#000000",
                textAlign: "center",
              }}
            >
              Deleting account...
            </Text>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default DeleteAccount;