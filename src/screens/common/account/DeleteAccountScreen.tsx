import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Keyboard,
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

const DeleteAccount: React.FC<DeleteAccountProps> = ({ navigation }) => {
  const dispatch = useDispatch();
  const scrollViewRef = useRef<ScrollView>(null);

  const [confirmation, setConfirmation] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [hasNegativeCredit, setHasNegativeCredit] = useState(false);
  const [hasProcessingOrders, setHasProcessingOrders] = useState(false);
  const [creditBalance, setCreditBalance] = useState(0);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, (e) => {
      const height = e?.endCoordinates?.height || 280;
      setKeyboardHeight(height);
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

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
              Alert.alert("Error", msg);
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
    <KeyboardAvoidingView
      style={{
        flex: 1,
        backgroundColor: "#FFFFFF",
      }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View
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
              contentContainerStyle={{
                paddingHorizontal: 14,
                paddingBottom: keyboardHeight > 0 ? keyboardHeight + 80 : 140,
              }}
            >
              {/* Delete Icon */}
              <View
                style={{
                  alignItems: "center",
                  marginTop: 0,
                  marginBottom: 25,
                }}
              >
                <View
                  style={{
                    width: 57,
                    height: 57,
                    borderRadius: 999,
                    backgroundColor: "#FFE8E8",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <FontAwesome6 name="trash" size={22} color="#FF383C" />
                </View>
              </View>

              {/* Title */}
              <Text
                style={{
                  textAlign: "center",
                  fontSize: 16,
                  fontWeight: "600",
                  color: "#000000",
                  marginBottom: 7,
                }}
              >
                Delete Your Account?
              </Text>

              {/* Description */}
              <Text
                style={{
                  textAlign: "center",
                  fontSize: 14,
                  lineHeight: 18,
                  fontWeight: "400",
                  color: "#494A65",
                  paddingHorizontal: 8,
                  marginBottom: 18,
                }}
              >
                This action is permanent and cannot be{"\n"}
                undone. All your data, orders, and account{"\n"}
                information{" "}
                <Text
                  style={{
                    color: "#FF3B42",
                  }}
                >
                  will be permanently deleted.
                </Text>
              </Text>

              {/* What will be deleted */}
              <View
                style={{
                  borderWidth: 1,
                  borderColor: "#DDE2E7",
                  borderRadius: 17,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
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
                    marginBottom: 9,
                  }}
                >
                  What will be deleted?
                </Text>

                <View>
                  <Text
                    style={{
                      fontSize: 12,
                      color: "#494A65",
                      lineHeight: 22,
                    }}
                  >
                    • Your personal information and profile.
                  </Text>

                  <Text
                    style={{
                      fontSize: 12,
                      color: "#494A65",
                      lineHeight: 22,
                    }}
                  >
                    • All order history and transaction details.
                  </Text>

                  <Text
                    style={{
                      fontSize: 12,
                      color: "#494A65",
                      lineHeight: 22,
                    }}
                  >
                    • Saved addresses and payment methods.
                  </Text>

                  <Text
                    style={{
                      fontSize: 12,
                      color: "#494A65",
                      lineHeight: 22,
                    }}
                  >
                    • Account preferences and settings.
                  </Text>

                  <Text
                    style={{
                      fontSize: 12,
                      color: "#494A65",
                      lineHeight: 22,
                    }}
                  >
                    • Any remaining positive credit balance.
                  </Text>
                </View>
              </View>

              {hasNegativeCredit ? (
                <View
                  style={{
                    backgroundColor: "#FFEAEA",
                    borderRadius: 16,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    flexDirection: "row",
                    alignItems: "center",
                    marginTop: 40,
                    marginHorizontal: 3,
                  }}
                >
                  <FontAwesome6
                    name="shield-halved"
                    size={16}
                    color="#FF3B42"
                  />
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
                    marginTop: 40,
                    marginHorizontal: 3,
                  }}
                >
                  <FontAwesome6
                    name="shield-halved"
                    size={16}
                    color="#FF3B42"
                  />
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
                      marginTop: 47,
                      marginBottom: 22,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "500",
                        color: "#111111",
                        textAlign: "center",
                        lineHeight: 19,
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
                        lineHeight: 19,
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
                    style={{
                      height: 50,
                      borderWidth: 1,
                      borderColor: "#DDE2E7",
                      borderRadius: 999,
                      flexDirection: "row",
                      alignItems: "center",
                      paddingHorizontal: 7,
                      marginHorizontal: 0,
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
                      <FontAwesome6
                        name="lock"
                        solid
                        size={13}
                        color="#000000"
                      />
                    </View>

                    {/* Input */}
                    <TextInput
                      value={confirmation}
                      onChangeText={(text) => {
                        setConfirmation(text.toUpperCase());
                      }}
                      onFocus={() => {
                        setTimeout(() => {
                          scrollViewRef.current?.scrollToEnd({
                            animated: true,
                          });
                        }, 120);
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

            {deleting && (
              <View
                style={{
                  position: "absolute",
                  top: 0,
                  bottom: 0,
                  left: 0,
                  right: 0,
                  backgroundColor: "rgba(255, 255, 255, 0.85)",
                  justifyContent: "center",
                  alignItems: "center",
                  zIndex: 999,
                }}
              >
                <LoadingPage message="Deleting Account..." fullScreen={false} />
              </View>
            )}

            {/* BOTTOM BUTTON */}
            {(!hasProcessingOrders || hasNegativeCredit) && (
              <View
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  bottom: 0,
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
      </View>
    </KeyboardAvoidingView>
  );
};

export default DeleteAccount;
