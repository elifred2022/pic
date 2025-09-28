import { createClient } from "@/lib/supabase/server";
import { type EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/";

  console.log("🔍 Confirm route - Params:", { token_hash, type, next });

  if (token_hash && type) {
    const supabase = await createClient();

    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });
    
    console.log("🔍 OTP verification result:", { error: error?.message });
    
    if (!error) {
      // Para recuperación de contraseña, asegurar que el usuario esté autenticado
      if (type === "recovery") {
        console.log("✅ Password recovery verified, redirecting to update password page");
        redirect("/auth/update-password");
      } else {
        // redirect user to specified redirect URL or root of app
        console.log("✅ OTP verified successfully, redirecting to:", next);
        redirect(next);
      }
    } else {
      // redirect the user to an error page with some instructions
      console.error("❌ OTP verification failed:", error.message);
      redirect(`/auth/error?error=${encodeURIComponent(error.message)}`);
    }
  }

  // redirect the user to an error page with some instructions
  console.error("❌ Missing token_hash or type");
  redirect(`/auth/error?error=${encodeURIComponent("No token hash or type")}`);
}
