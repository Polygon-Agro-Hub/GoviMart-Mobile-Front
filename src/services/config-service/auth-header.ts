import { store } from "@/store";
import { tokenStorage } from "@/utils/tokenStorage";

export const getAuthHeader = async () => {
  const reduxToken = store.getState().auth.token;
  const token = reduxToken || (await tokenStorage.getToken());

  return {
    Authorization: `Bearer ${token}`,
  };
};