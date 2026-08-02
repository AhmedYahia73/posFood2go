import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export const PRIVACY_POLICY = `
Privacy Policy
Last updated: December 2025

This Privacy Policy describes our policies and procedures on the collection, use, and disclosure of Your information when You use the Service, and informs You about Your privacy rights and how the law protects You.

Application refers to Food2go POS.
Country refers to: Egypt.

Personal Data collected:

- Name
- Phone number
- Address

Purpose of data collection:

- Employee login credentials (User ID) are used solely for app access and functionality.
- Customer contact information is collected only for order delivery purposes and optionally for saving for future orders.
- Takeaway and dine-in orders do not require customer personal data.
- All payments are processed externally via third-party providers. No customer payment information is collected or stored.
- Collected data is not used for tracking, marketing, or shared with third parties.

Security of Your Personal Data:

We strive to protect Your Personal Data but cannot guarantee absolute security.
`;

const Policy = () => {
  const { t } = useTranslation();
  const [policy, setPolicy] = useState(PRIVACY_POLICY);

  return (
    <section className="p-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("Privacy Policy")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label>{t("Policy Text")}</Label>
          <Textarea
            value={policy}
            onChange={(e) => setPolicy(e.target.value)}
            rows={16}
            className="resize-none"
          />
        </CardContent>
      </Card>
    </section>
  );
};

export default Policy;
