interface CredentialResponse {
  credential: string;
  select_by: string;
}

interface GoogleInitializeConfig {
  client_id: string;
  callback: (response: CredentialResponse) => void;
  auto_select?: boolean;
  cancel_on_tap_outside?: boolean;
}

interface GoogleButtonConfig {
  type: "standard" | "icon";
  theme?: "outline" | "filled_blue" | "filled_black";
  size?: "large" | "medium" | "small";
  text?: "signin_with" | "signup_with" | "continue_with" | "signin";
  shape?: "rectangular" | "pill" | "circle" | "square";
  logo_alignment?: "left" | "center";
  width?: number;
  locale?: string;
}

interface GooglePromptNotification {
  isNotDisplayed: () => boolean;
  isSkippedMoment: () => boolean;
  getNotDisplayedReason: () => string;
  getSkippedReason: () => string;
}

interface GoogleAccountsId {
  initialize(config: GoogleInitializeConfig): void;
  prompt(callback?: (notification: GooglePromptNotification) => void): void;
  renderButton(parent: HTMLElement, config: GoogleButtonConfig): void;
  disableAutoSelect(): void;
}

interface GoogleAccounts {
  id: GoogleAccountsId;
}

interface GoogleGIS {
  accounts: GoogleAccounts;
}

declare global {
  interface Window {
    google?: GoogleGIS;
  }
}

export {};
