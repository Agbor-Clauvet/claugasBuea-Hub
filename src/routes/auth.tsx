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
import logoAsset from "@/assets/clautech-logo.png.asset.json";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — ClauGas" },
      { name: "description", content: "Sign in or create an account to order gas cylinder delivery from ClauGas." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"login" | "register" | "forgot">("login");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success(t("auth.signedIn"));
    navigate({ to: "/dashboard", replace: true });
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: { full_name: fullName, phone },
      },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success(t("auth.accountCreated"));
    setMode("login");
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
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
          <img src={logoAsset.url} alt="ClauGas" className="h-8 w-auto rounded" />
          <span className="font-semibold text-primary">ClauGas</span>
        </Link>
        <LanguageSwitcher />
      </div>
      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="text-center">
            <img src={logoAsset.url} alt="ClauGas" className="mx-auto h-14 w-auto rounded mb-2" />
            <CardTitle className="text-primary">ClauGas</CardTitle>
            <CardDescription>
              {mode === "forgot" ? t("auth.resetTitle") : t("auth.title")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {mode === "forgot" ? (
              <form onSubmit={handleForgot} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">{t("auth.email")}</Label>
                  <Input id="email" type="email" value={email} required onChange={(e) => setEmail(e.target.value)} />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? t("auth.sending") : t("auth.sendReset")}
                </Button>
                <button type="button" className="text-sm text-muted-foreground hover:underline w-full text-center" onClick={() => setMode("login")}>
                  {t("auth.backToSignIn")}
                </button>
              </form>
            ) : (
              <Tabs value={mode} onValueChange={(v) => setMode(v as "login" | "register")}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="login">{t("auth.signIn")}</TabsTrigger>
                  <TabsTrigger value="register">{t("auth.register")}</TabsTrigger>
                </TabsList>
                <TabsContent value="login">
                  <form onSubmit={handleLogin} className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email">{t("auth.email")}</Label>
                      <Input id="login-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="login-password">{t("auth.password")}</Label>
                      <Input id="login-password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? t("auth.signingIn") : t("auth.signIn")}
                    </Button>
                    <button type="button" className="text-sm text-muted-foreground hover:underline w-full text-center" onClick={() => setMode("forgot")}>
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
                      <Input id="reg-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-email">{t("auth.email")}</Label>
                      <Input id="reg-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-password">{t("auth.passwordHint")}</Label>
                      <Input id="reg-password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
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
