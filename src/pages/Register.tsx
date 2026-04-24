import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, KeyRound, UserCheck, Building2 } from "lucide-react";
import { QfLogo } from "@/components/QfLogo";

/**
 * /register
 *
 * Self-registration has been removed. Customer accounts are now
 * exclusively created by the admin (via Customers page) or by
 * the admin approving a request (via Customer Requests page).
 *
 * The portal is auto-provisioned with the default password "qaisfoods".
 *
 * This page now serves as an informational hub pointing users
 * to the correct next step.
 */
const Register = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4 py-10">
      <div className="w-full max-w-sm space-y-6">

        <div className="text-center">
          <QfLogo className="mx-auto w-16 h-16 mb-4" />
          <h1 className="text-2xl font-bold">Customer Portal Access</h1>
          <p className="text-sm text-muted-foreground mt-2">
            How does account creation work at QAIS Foods?
          </p>
        </div>

        <div className="space-y-3">

          <div className="rounded-xl border bg-card p-4 flex gap-3 items-start shadow-sm">
            <div className="mt-0.5 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <UserCheck className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-sm">Already a registered customer?</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Your account was created by QAIS Foods. Login with your registered email and the default password <strong className="text-foreground font-mono">qaisfoods</strong>.
              </p>
            </div>
          </div>

          <div className="rounded-xl border bg-card p-4 flex gap-3 items-start shadow-sm">
            <div className="mt-0.5 w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
              <Building2 className="h-4 w-4 text-amber-600" />
            </div>
            <div>
              <p className="font-semibold text-sm">New customer?</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Submit a request and the QAIS Foods team will review it. Once approved, your portal will be created automatically.
              </p>
            </div>
          </div>

          <div className="rounded-xl border bg-card p-4 flex gap-3 items-start shadow-sm">
            <div className="mt-0.5 w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
              <KeyRound className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <p className="font-semibold text-sm">Default password</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                All newly created portals use the password <strong className="text-foreground font-mono">qaisfoods</strong>. You can update it after logging in from your profile settings.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Link to="/request-access">
            <Button className="w-full">
              <Building2 className="h-4 w-4 mr-2" /> Submit a Customer Request
            </Button>
          </Link>
          <Link to="/login">
            <Button variant="outline" className="w-full">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Login
            </Button>
          </Link>
        </div>

        <p className="text-xs text-center text-muted-foreground">
          Need help?{" "}
          <a href="https://wa.me/923001234567" target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline">
            Contact factory on WhatsApp
          </a>
        </p>
      </div>
    </div>
  );
};

export default Register;