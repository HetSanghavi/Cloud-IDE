export function loginFormMessage(code?: string): string {
  if (code === "rate_limited") {
    return "Too many login attempts. Please try again later.";
  }

  if (code === "invalid_input") {
    return "Please enter a valid email address and password.";
  }

  return "Incorrect email or password.";
}

export function oauthFormMessage(code?: string): string {
  if (code === "OAuthAccountNotLinked") {
    return "An account already exists with this email. Sign in with email and password before linking Google.";
  }

  if (code === "AccessDenied") {
    return "Google sign-in was cancelled or could not verify your Google email.";
  }

  if (code === "Configuration") {
    return "Google sign-in is not configured. Please use email and password for now.";
  }

  return "Google sign-in could not be completed. Please try again.";
}
