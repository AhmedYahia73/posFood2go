import { getCurrencySymbol } from '../../utils/currency';
// src/Pages/DeliveryOrder/AllOrder.jsx
import {
  TableRow,
  TableCell,
} from "@/components/ui/table";
import Loading from "@/components/Loading";

export default function AllOrder({ orders, selectedOrders, setSelectedOrders, isLoading }) {
  const toggleOrder = (id) => {
    setSelectedOrders((prev) =>
      prev.includes(id)
        ? prev.filter((o) => o !== id)
        : [...prev, id]
    );
  };

  if (isLoading) {
    return (
      <TableRow>
        <TableCell colSpan={8} className="text-center py-10">
          <Loading />
        </TableCell>
      </TableRow>
    );
  }

  if (orders.length === 0) {
    return (
      <TableRow>
        <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
          No orders found
        </TableCell>
      </TableRow>
    );
  }

  return (
    <>
      {orders.map((order) => (
        <TableRow className="!text-center" key={order?.id}>
          <TableCell>
            <input
              type="checkbox"
              checked={selectedOrders.includes(order?.id)}
              onChange={() => toggleOrder(order?.id)}
            />
          </TableCell>

          <TableCell>{order?.id}</TableCell>

          <TableCell className="text-red-600 font-medium">
            {order?.order_number}
          </TableCell>

          <TableCell>{order?.user?.name}</TableCell>

          <TableCell>{order?.user?.phone}</TableCell>

          <TableCell className="max-w-[240px] truncate">
            {order?.address?.address || "-"}
          </TableCell>

          <TableCell className="font-semibold">
            {order?.amount} {getCurrencySymbol()}
          </TableCell>

          <TableCell>{order?.date}</TableCell>
        </TableRow>
      ))}
    </>
  );
}