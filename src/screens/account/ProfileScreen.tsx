import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Alert,
  ScrollView,
} from "react-native";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "@/store";
import { logoutSuccess } from "@/store/authSlice";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "@/types/types";
import { FontAwesome6 } from "@expo/vector-icons";
import CustomHeader from "@/component/common/CustomHeader";
import ProfileMenuItem from "@/component/my-profile/ProfileMenuItemCard";
import BottomNavigation from "@/component/common/BottomNavigationBar";
import customerService from "@/services/customer/customer.service";

type ProfileNavigationProp = StackNavigationProp<
  RootStackParamList,
  "Profile"
>;

interface ProfileProps {
  navigation: ProfileNavigationProp;
}

const Profile: React.FC<ProfileProps> = ({ navigation }) => {
  const user = useSelector(
    (state: RootState) => state.auth.userProfile
  );

  const dispatch = useDispatch();


  const [creditBalance, setCreditBalance] = useState<number>(0);
  const [isCreditBalanceLoading, setIsCreditBalanceLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchAcccountDetails = async () => {
      try {
        setIsCreditBalanceLoading(true);
        const response = await customerService.getAccountDetails()
        if (response.data) {
          const { creditBalance } = response.data.data
          setCreditBalance(Number(creditBalance!))
        }
        console.log("acc details fetchihng success: ", response.data.data)
      }

      catch (error) {
        console.log("error fetching acc details: ", error)
      } finally {
        setIsCreditBalanceLoading(false);
      }
    }
    fetchAcccountDetails()
  }, [])


  const handleLogout = async () => {
    Alert.alert(
      "Confirm Logout",
      "Are you sure you want to log out?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            try {
              await AsyncStorage.removeItem("userToken");
              await AsyncStorage.removeItem("userProfile");
              await AsyncStorage.removeItem("userLoginTime");

              dispatch(logoutSuccess());

              navigation.reset({
                index: 0,
                routes: [{ name: "ChooseAuth" }],
              });
            } catch (e) {
              console.error("Logout error:", e);
            }
          },
        },
      ]
    );
  };

  const placeholderImage =
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200";

  const userImage = user?.image || placeholderImage;

  const fullName = user
    ? `${user.firstName} ${user.lastName}`
    : "Guest User";

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#FFFFFF",
      }}
    >
      {/* Header */}

      <CustomHeader
        title="My Profile"
        titleColor="black"
        showBackButton={true}
        navigation={navigation}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 20,
          paddingBottom: 120,
        }}
      >
        <View
          style={{
            alignItems: "center",
          }}
        >
          {/* Profile Image */}

          <View
            style={{
              shadowColor: "#000",
              shadowOffset: {
                width: 0,
                height: 2,
              },
              shadowOpacity: 0.15,
              shadowRadius: 5,
              elevation: 3,
            }}
          >
            <Image
              source={{
                uri: userImage,
              }}
              style={{
                width: 110,
                height: 110,
                borderRadius: 55,
                borderWidth: 4,
                borderColor: "#F3F4F6",
              }}
            />
          </View>

          {/* Name */}

          <Text
            style={{
              color: "#000",
              fontSize: 23,
              fontWeight: "800",
              marginTop: 12,
            }}
          >
            {fullName}
          </Text>


        </View>

        {/* CREDIT BALANCE */}

        <View
          style={{
            width: "100%",
            padding: 10,
            marginTop: 22,
            marginBottom: 24,
            backgroundColor: isCreditBalanceLoading
              ? "#F2F2F6"
              : creditBalance === 0
                ? "#F2F2F6"
                : creditBalance > 0
                  ? "#E3FFEA"
                  : "#FFEBEB",
            borderRadius: 12,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          {isCreditBalanceLoading ? (
            <>
              {/* Credit Icon Skeleton */}
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: "#D9DCE3",
                }}
              />

              {/* Label Skeleton */}
              <View
                style={{
                  width: 120,
                  height: 14,
                  borderRadius: 7,
                  backgroundColor: "#D9DCE3",
                  marginTop: 15,
                }}
              />

              {/* Amount Skeleton */}
              <View
                style={{
                  width: 100,
                  height: 22,
                  borderRadius: 8,
                  backgroundColor: "#D9DCE3",
                  marginTop: 6,
                  marginBottom: 4,
                }}
              />
            </>
          ) : (
            <>
              {/* Credit Icon */}

              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 999,
                  backgroundColor: "#000",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <FontAwesome6
                  name="wallet"
                  size={15}
                  color="#FFF"
                />
              </View>

              <Text
                style={{
                  marginTop: 15,
                  fontSize: 14,
                  color: "#111",
                  fontWeight: "400",
                }}
              >
                My Credit Balance
              </Text>

              <Text
                style={{
                  marginTop: 1,
                  fontSize: 20,
                  fontWeight: "800",
                  color:
                    creditBalance < 0
                      ? "#FF383C"
                      : "#000",
                }}
              >
                Rs. {creditBalance.toFixed(2)}
              </Text>

              {creditBalance < 0 && (
                <>
                  <Text
                    className="text-center px-5 my-2"
                    style={{
                      fontSize: 13,
                    }}
                  >
                    You won’t be able to place a new order until
                    the negative balance is cleared. This balance
                    occurred due to a previous return order. Once
                    the outstanding amount is paid, you’ll be able
                    to place orders again. Thank you for your
                    understanding!
                  </Text>

                  <TouchableOpacity
                    activeOpacity={0.85}
                    style={{
                      paddingVertical: 12,
                      marginTop: 10,
                      marginBottom: 10,
                      width: "90%",
                      backgroundColor: "#FF383C",
                      borderRadius: 30,
                      justifyContent: "center",
                      alignItems: "center",
                      shadowColor: "#000",
                      shadowOpacity: 0.18,
                      shadowRadius: 6,
                      shadowOffset: {
                        width: 0,
                        height: 3,
                      },
                      elevation: 6,
                    }}
                  >
                    <Text
                      style={{
                        color: "#FFF",
                        fontSize: 17,
                        fontWeight: "700",
                      }}
                    >
                      Proceed to Checkout
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </>
          )}
        </View>

        {/* MENU */}

        <View>
          {/* My Account */}

          <ProfileMenuItem
            icon="thumbs-up"
            title="My Account"
            onPress={() => {
              navigation.navigate("MyAccount");
            }}
          />

          {/* Update Password */}

          <ProfileMenuItem
            icon="lock"
            title="Update My Password"
            onPress={() => {
              navigation.navigate("UpdatePassword", { redirectTo: "Profile" });
            }}
          />

          {/* Package Preferences */}

          <ProfileMenuItem
            icon="thumbs-up"
            title="My Package Preferences"
            onPress={() => {
              // navigation.navigate("PackagePreferences");
            }}
          />

          {/* Saved Addresses */}

          <ProfileMenuItem
            icon="house"
            title="My Saved Addresses"
            onPress={() => {
              navigation.navigate("SavedAddresses");
            }}
          />

          {/* Complaint */}

          <ProfileMenuItem
            icon="headset"
            title="Report a Complaint"
            onPress={() => {
              navigation.navigate("ReportComplaint");
            }}
          /><ProfileMenuItem
            icon="list"
            title="My Complaints"
            onPress={() => {
              navigation.navigate("ComplaintHistory");
            }}
          />

          {/* Logout */}

          <ProfileMenuItem
            icon="right-from-bracket"
            title="Logout"
            danger={true}
            onPress={handleLogout}
          />
        </View>
      </ScrollView>
      {/* Floating Bottom Navigation Bar */}
      <BottomNavigation activeScreen="Profile" navigation={navigation} />
    </View>
  );
};

export default Profile;