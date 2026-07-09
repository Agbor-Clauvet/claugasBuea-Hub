import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import logoAsset from "@/assets/claugas-express-logo.jpeg.asset.json";
import { normalizeCameroonPhone, phoneToSyntheticEmail } from "@/lib/phone";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — ClauGas" },
      { name: "description", content: "Sign in or create a ClauGas account to order cooking gas delivery in Buea." },
    ],
  }),
  component: AuthPage,
});

type Mode = "login" | "register" | "forgot";
type IdentifierKind = "phone" | "email";

function AuthPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<Mode>("login");
  const [loginKind, setLoginKind] = useState<IdentifierKind>("phone");
  const [forgotKind, setForgotKind] = useState<IdentifierKind>("phone");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [regEmail, setRegEmail] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    let loginEmail: string | null = null;
    if (loginKind === "phone") {
      loginEmail = phoneToSyntheticEmail(phone);
      if (!loginEmail) return toast.error(t("auth.phoneInvalid"));
    } else {
      loginEmail = email.trim();
      if (!loginEmail) return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success(t("auth.signedIn"));
    navigate({ to: "/dashboard", replace: true });
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    const norm = normalizeCameroonPhone(phone);
    if (!norm) return toast.error(t("auth.phoneInvalid"));
    if (password !== confirmPassword) return toast.error(t("auth.passwordsMismatch"));
    // Use provided email if given, otherwise a synthetic phone-based email.
    const signupEmail = regEmail.trim() || `${norm}@phone.claugas.local`;
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: signupEmail,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: { full_name: fullName, phone: `+${norm}`, recovery_email: regEmail.trim() || null },
      },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success(t("auth.accountCreated"));
    setMode("login");
    setLoginKind("phone");
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    let target: string | null = null;
    if (forgotKind === "phone") {
      const norm = normalizeCameroonPhone(phone);
      if (!norm) return toast.error(t("auth.phoneInvalid"));
      target = `${norm}@phone.claugas.local`;
    } else {
      target = email.trim();
      if (!target) return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(target, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success(t("auth.resetSent"));
    setMode("login");
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <div className="flex items-center justify-between px-4 py-3 border-b bg-background/60 backdrop-blur">
        <Link to="/" className="flex items-center gap-2">
          <img src={logoAsset.url} alt="ClauGas Express — Hub Buea" className="h-9 w-9 rounded-full object-cover ring-1 ring-border" />
          <span className="font-semibold text-primary">ClauGas</span>
        </Link>
        <LanguageSwitcher />
      </div>
      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="text-center">
            <img src={logoAsset.url} alt="ClauGas Express" className="mx-auto h-16 w-16 rounded-full object-cover ring-1 ring-border mb-2" />
            <CardTitle className="text-primary">ClauGas</CardTitle>
            <CardDescription>
              {mode === "forgot" ? t("auth.resetTitle") : t("auth.title")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {mode === "forgot" ? (
              <form onSubmit={handleForgot} className="space-y-4">
                <Tabs value={forgotKind} onValueChange={(v) => setForgotKind(v as IdentifierKind)}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="phone">{t("auth.forgotByPhone")}</TabsTrigger>
                    <TabsTrigger value="email">{t("auth.forgotByEmail")}</TabsTrigger>
                  </TabsList>
                  <TabsContent value="phone" className="mt-4 space-y-2">
                    <Label htmlFor="fp-phone">{t("auth.phone")}</Label>
                    <Input id="fp-phone" type="tel" inputMode="tel" placeholder={t("auth.phonePlaceholder")}
                      value={phone} onChange={(e) => setPhone(e.target.value)} />
                    <p className="text-xs text-muted-foreground">{t("auth.resetNoRecovery")}</p>
                  </TabsContent>
                  <TabsContent value="email" className="mt-4 space-y-2">
                    <Label htmlFor="fp-email">{t("auth.email")}</Label>
                    <Input id="fp-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                    <p className="text-xs text-muted-foreground">{t("auth.resetNote")}</p>
                  </TabsContent>
                </Tabs>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? t("auth.sending") : t("auth.sendReset")}
                </Button>
                <button type="button" className="text-sm text-muted-foreground hover:underline w-full text-center"
                  onClick={() => setMode("login")}>
                  {t("auth.backToSignIn")}
                </button>
              </form>
            ) : (
              <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="login">{t("auth.signIn")}</TabsTrigger>
                  <TabsTrigger value="register">{t("auth.register")}</TabsTrigger>
                </TabsList>

                <TabsContent value="login">
                  <form onSubmit={handleLogin} className="space-y-4 mt-4">
                    <Tabs value={loginKind} onValueChange={(v) => setLoginKind(v as IdentifierKind)}>
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="phone">{t("auth.phoneTab")}</TabsTrigger>
                        <TabsTrigger value="email">{t("auth.emailTab")}</TabsTrigger>
                      </TabsList>
                      <TabsContent value="phone" className="mt-3 space-y-2">
                        <Label htmlFor="login-phone">{t("auth.phone")}</Label>
                        <div className="flex items-center gap-2">
                          <span className="rounded-md border bg-muted px-2 py-2 text-sm text-muted-foreground">+237</span>
                          <Input id="login-phone" type="tel" inputMode="tel" placeholder={t("auth.phonePlaceholder")}
                            required value={phone} onChange={(e) => setPhone(e.target.value)} />
                        </div>
                        <p className="text-xs text-muted-foreground">{t("auth.phoneHint")}</p>
                      </TabsContent>
                      <TabsContent value="email" className="mt-3 space-y-2">
                        <Label htmlFor="login-email">{t("auth.email")}</Label>
                        <Input id="login-email" type="email" required value={email}
                          onChange={(e) => setEmail(e.target.value)} />
                      </TabsContent>
                    </Tabs>
                    <div className="space-y-2">
                      <Label htmlFor="login-password">{t("auth.password")}</Label>
                      <Input id="login-password" type="password" required value={password}
                        onChange={(e) => setPassword(e.target.value)} />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? t("auth.signingIn") : t("auth.signIn")}
                    </Button>
                    <button type="button" className="text-sm text-muted-foreground hover:underline w-full text-center"
                      onClick={() => setMode("forgot")}>
                      {t("auth.forgot")}
                    </button>
                  </form>
                </TabsContent>

                <TabsContent value="register">
                  <form onSubmit={handleRegister} className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="reg-name">{t("auth.fullName")}</Label>
                      <Input id="reg-name" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-phone">{t("auth.phone")}</Label>
                      <div className="flex items-center gap-2">
                        <span className="rounded-md border bg-muted px-2 py-2 text-sm text-muted-foreground">+237</span>
                        <Input id="reg-phone" type="tel" inputMode="tel" required placeholder={t("auth.phonePlaceholder")}
                          value={phone} onChange={(e) => setPhone(e.target.value)} />
                      </div>
                      <p className="text-xs text-muted-foreground">{t("auth.phoneHint")}</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-email">{t("auth.emailOptional")}</Label>
                      <Input id="reg-email" type="email" value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-password">{t("auth.passwordHint")}</Label>
                      <Input id="reg-password" type="password" required minLength={6} value={password}
                        onChange={(e) => setPassword(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-confirm">{t("auth.confirmPassword")}</Label>
                      <Input id="reg-confirm" type="password" required minLength={6} value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)} />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? t("auth.creating") : t("auth.createAccount")}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
