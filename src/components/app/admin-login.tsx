import { loginAdmin } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AdminLogin({ error }: { error?: boolean }) {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md items-center">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Private access</CardTitle>
          <CardDescription>Enter the admin secret to open Jason Daily Pulse.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={loginAdmin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="secret">Admin secret</Label>
              <Input id="secret" name="secret" type="password" autoComplete="current-password" required />
            </div>
            {error ? <p className="text-sm text-red-400">That secret did not match.</p> : null}
            <Button type="submit" className="w-full">Unlock dashboard</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
