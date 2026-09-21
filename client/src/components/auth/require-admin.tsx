import { ReactNode, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

interface RequireAdminProps {
  children: ReactNode;
}

export function RequireAdmin({ children }: RequireAdminProps) {
  const { t } = useTranslation("account");
  const { user, isLoading, isAdmin } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Redirect to login if not authenticated after loading
    if (!isLoading && !user) {
      setLocation("/admin/login");
    }
  }, [isLoading, user, setLocation]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8">
            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-lg text-muted-foreground">{t("require-admin.s1")}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If not logged in, show nothing (will redirect)
  if (!user) {
    return null;
  }

  // If logged in but not admin, show access denied
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md shadow-xl border-destructive">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto bg-destructive/10 p-4 rounded-full w-fit">
              <AlertCircle className="w-12 h-12 text-destructive" />
            </div>
            <CardTitle className="text-2xl text-destructive">{t("require-admin.s2")}</CardTitle>
            <CardDescription className="text-base">
              {t("require-admin.s3")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground text-center">
                <Shield className="w-4 h-4 inline ml-1" />
                {t("require-admin.s4")} <strong>{user.email}</strong>
              </p>
              <p className="text-sm text-muted-foreground text-center mt-2">
                {t("require-admin.s5")} <strong>{user.role}</strong>
              </p>
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setLocation("/")}
            >
              {t("require-admin.s6")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // User is admin, render children
  return <>{children}</>;
}
