import React from "react";
import { useNavigate } from "react-router-dom";
import { cashManagementFeature } from "@corely/web-features";
import { OnboardingShell } from "@corely/web-features/modules/onboarding";

export const CashManagementOnboardingRoute = () => {
  const navigate = useNavigate();

  const handleCompleted = () => {
    navigate("/dashboard");
  };

  const handleExit = () => {
    navigate("/dashboard");
  };

  return (
    <OnboardingShell
      config={cashManagementFeature.CASH_MANAGEMENT_JOURNEY}
      onCompleted={handleCompleted}
      onExit={handleExit}
      onSkip={handleExit}
    />
  );
};
