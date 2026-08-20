import { getAuthHeader } from "../config-service/auth-header"
import apiClient from "../config-service/axio-config"
import { ENDPOINTS } from "../config-service/endpoints"

class ComplaintService {
    async getComplaintCategories() {
        const headers = await getAuthHeader();
        return apiClient.get(ENDPOINTS.COMPLAINT.GET_CATEGORIES, { headers })
    }

    async createComplaint(formData: FormData) {
        const headers = await getAuthHeader();
        return apiClient.post(
            ENDPOINTS.COMPLAINT.CREATE_COMPLAINT,
            formData,
            {
                headers: {
                    ...headers,
                    "Content-Type": "multipart/form-data",
                },
            }
        );
    }

    async getMyComplaints() {
        const headers = await getAuthHeader();
        return apiClient.get(ENDPOINTS.COMPLAINT.GET_MY_COMPLAINTS, { headers })
    }

    async getComplaintDetails(complaintId: number) {
        const headers = await getAuthHeader();
        return apiClient.get(
            `${ENDPOINTS.COMPLAINT.GET_COMPLAINT_DETAILS}/${complaintId}`,
            { headers }
        );
    }
}

export default new ComplaintService
