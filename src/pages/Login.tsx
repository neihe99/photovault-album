import { useState } from "react";
import { useNavigate } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { KeyRound, Loader2 } from "lucide-react";
import { trpc } from "@/providers/trpc";

function getOAuthUrl() {
  const kimiAuthUrl = import.meta.env.VITE_KIMI_AUTH_URL;
  const appID = import.meta.env.VITE_APP_ID;
  const redirectUri = `${window.location.origin}/api/oauth/callback`;
  const state = btoa(redirectUri);

  const url = new URL(`${kimiAuthUrl}/api/oauth/authorize`);
  url.searchParams.set("client_id", appID);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "profile");
  url.searchParams.set("state", state);

  return url.toString();
}

export default function Login() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const passwordLogin = trpc.auth.passwordLogin.useMutation({
    onSuccess: () => {
      navigate("/", { replace: true });
      window.location.reload();
    },
    onError: (e) => setError(e.message || "登录失败"),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.trim()) passwordLogin.mutate({ password });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">PhotoVault 相册</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            className="w-full"
            size="lg"
            onClick={() => {
              window.location.href = getOAuthUrl();
            }}
          >
            使用 Kimi 账号登录
          </Button>

          <div className="flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-xs text-muted-foreground">或</span>
            <Separator className="flex-1" />
          </div>

          <form onSubmit={submit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm">
                访问密码
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="输入站点访问密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <Button
              type="submit"
              variant="secondary"
              className="w-full"
              disabled={!password.trim() || passwordLogin.isPending}
            >
              {passwordLogin.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <KeyRound className="mr-2 h-4 w-4" />
              )}
              密码登录
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              密码登录仅在站长设置了 LOGIN_PASSWORD 时可用
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
