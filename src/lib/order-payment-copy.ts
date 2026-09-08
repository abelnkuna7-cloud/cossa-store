export function orderPaymentMethod(provider: string | null): string {
  switch (provider) {
    case "eft":
    case "eft_manual":
      return "EFT / Bank transfer";
    case "yoco_test":
      return "Yoco — Test payment";
    case "yoco":
    case "yoco_live":
      return "Yoco";
    default:
      return "Payment method not available";
  }
}

export function unpaidDownloadMessage(provider: string | null): string {
  return provider === "yoco_test"
    ? "Test payments do not unlock downloads. No real payment was made."
    : "Download available once payment has been verified.";
}
