import React, { useState } from "react";
import { useTranslation } from "react-i18next";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";



export const SUPPORT_INFO = `
Contact Support
We're here to help!

Email:
wegostores@gmail.com
wegostationdev@gmail.com

Phone Number:
+201200908090

Delete Account Support
To delete your account please contact us on:
wegostationdev@gmail.com
`;


const ContactSupport = () => {
  const { t } = useTranslation();
  const [support, setSupport] = useState(SUPPORT_INFO);

  return (
    <section className="p-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("Support")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label>{t("Support Information")}</Label>
          <Textarea
            value={support}
            onChange={(e) => setSupport(e.target.value)}
            rows={12}
            className="resize-none"
          />
        </CardContent>
      </Card>
    </section>
  );
};

export default ContactSupport;