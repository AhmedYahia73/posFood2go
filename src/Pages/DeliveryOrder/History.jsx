// src/Pages/DeliveryOrder/History.jsx
"use client";

import {
  TableRow,
  TableCell,
} from "@/components/ui/table";
import Loading from "@/components/Loading";
import { useGet } from "@/Hooks/useGet";

export default function History() {
  const { data, isLoading } = useGet("cashier/delivery_balance/delivery_history");

  const history = data?.history || [];

  if (isLoading) {
    return (
      <TableRow>
        <TableCell colSpan={7} className="text-center py-10">
          <Loading />
        </TableCell>
      </TableRow>
    );
  }

  if (history.length === 0) {
    return (
      <TableRow>
        <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
          No history found
        </TableCell>
      </TableRow>
    );
  }

  return (
    <>
      {history.map((item) => (
        <TableRow className="!text-center" key={item.id}>
          <TableCell>{item.id}</TableCell>
          <TableCell className="font-semibold">{item.amount}</TableCell>
          <TableCell>{item.delivery || "-"}</TableCell>
          <TableCell>{item.financial || "-"}</TableCell>
          <TableCell>{item.branch || "-"}</TableCell>
          <TableCell>{item.cashier_man || "-"}</TableCell>
          {/* لو مفيش cashier_man في الـ response، هيظهر - */}
          <TableCell>{item.cashier || "-"}</TableCell>
        </TableRow>
      ))}
    </>
  );
}