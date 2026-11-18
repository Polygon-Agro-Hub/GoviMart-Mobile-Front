import React from "react";
import ConfirmationModal from "@/component/common/ConfirmationModal";

interface ExitConfirmModalProps {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ExitConfirmModal: React.FC<ExitConfirmModalProps> = ({
  visible,
  onConfirm,
  onCancel,
}) => (
  <ConfirmationModal
    visible={visible}
    title="Are you sure you want to go back?"
    message="Going back will cause you to lose all your changes."
    confirmLabel="Yes, Go Back"
    cancelLabel="No, Stay on the page"
    confirmButtonColor="#000000"
    confirmButtonTextColor="#FFFFFF"
    cancelButtonBgColor="#EAEFF5"
    cancelButtonTextColor="#4B5563"
    iconName="warning"
    iconColor="#D32F2F"
    iconBgColor="bg-[#FEECEC]"
    buttonLayout="column"
    showCloseButton={false}
    onConfirm={onConfirm}
    onCancel={onCancel}
  />
);

export default ExitConfirmModal;
