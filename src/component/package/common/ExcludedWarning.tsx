import React from "react";
import { Text } from "react-native";

export const renderExcludedWarning = (warning: string, productName?: string) => {
  if (!productName) return warning;

  const idx = warning.toLowerCase().indexOf(productName.toLowerCase());
  if (idx === -1) return warning;

  const before = warning.slice(0, idx);
  const match = warning.slice(idx, idx + productName.length);
  const after = warning.slice(idx + productName.length);

  return (
    <>
      {before}
      <Text style={{ fontWeight: "700" }}>{match}</Text>
      {after}
    </>
  );
};

