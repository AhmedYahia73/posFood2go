import { createBrowserRouter } from "react-router-dom";
import Login from "./components/Login";
import ProtAuth from "./components/Auth/ProtAuth";
import MainLayouts from "./Layout/MainLayouts";
import { SidebarProvider } from "./components/ui/sidebar";
import AuthLayout from "./Layout/AuthLayout";
import ProtectedRoute from "./components/Auth/ProtectedRoute";
import Home from "./Pages/Home";
import Cashier from "./Pages/Cashier";
import Item from "./Pages/Item";
import Orders from "./Pages/OrdersView";
import TakeAway from "./Pages/TakeAway";
import NotFound from "./Pages/NotFound";
import DeliveryAdd from "./Pages/Delivery/DeliveryAdd";
import OrdersView from "./Pages/OrdersView";
import Shift from "./Pages/Shift";
import PendingOrders from "./Pages/PendingOrders";
import Profile from "./Pages/Profile";
import DueUsers from "./Pages/Due/DueUsers";
import AllOrders from "./Pages/AllOrders/AllOrders";
import Dine from "./Pages/Dine/Dine";
import SinglePage from "./Pages/OnlineOrders/SinglePage";
import OnlineTabs from "./Pages/OnlineOrders/OnlineTabs";
import ContactSupport from "./Pages/ContactSupport";
import Policy from "./Pages/Policy";
import FakeOrders from "./Pages/FakeOrders/FakeOrders";
import DeliveryOrder from "./Pages/DeliveryOrder/DeliveryOrder";
import InvoicePage from "./Pages/OnlineOrders/InvoicePage";
import DineInReport from "./Pages/DineInReport/DineInReport";
import ExpensesList from "./Pages/OnlineOrders/ExpensesList";

const router = createBrowserRouter(
  [
    {
      element: <AuthLayout />,
      children: [
        {
          path: "login",
          element: (
            <ProtAuth>
              <Login />
            </ProtAuth>
          ),
        },

      ],
    },

    {
      element: (
        <SidebarProvider>
          <MainLayouts />
        </SidebarProvider>
      ),
      children: [
        // for take away
        {
          path: "/",
          element: (
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          ),
        },

        // for delivery
        {
          path: "/deliveryusers",
          element: (
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          ),
        },
        // for dine in
        {
          path: "/order-page",
          element: (
            <ProtectedRoute>
              {" "}
              {/* نفس permission الـ Home */}
              <Home />
            </ProtectedRoute>
          ),
        },
        {
          path: "/profile",
          element: (
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          ),
        },
        {
          path: "/delivery-order",
          element: (
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          ),
        },

        {
          path: "cashier",
          children: [
            {
              index: true,
              element: (
                <ProtectedRoute>
                  <Cashier />
                </ProtectedRoute>
              ),
            },
          ],
        },

        {
          path: "item",
          children: [
            {
              index: true,
              element: (
                <ProtectedRoute>
                  <Item />
                </ProtectedRoute>
              ),
            },
          ],
        },

        {
          path: "order",
          children: [
            {
              index: true,
              element: (
                <ProtectedRoute>
                  <Orders />
                </ProtectedRoute>
              ),
            },
          ],
        },
        {
          path: "take",
          children: [
            {
              index: true,
              element: (
                <ProtectedRoute>
                  <TakeAway />
                </ProtectedRoute>
              ),
            },
          ],
        },
        {
          path: "add", // حالة الإضافة
          element: <DeliveryAdd />,
        },
        {
          path: "/order-page/add/:id", // حالة التعديل
          element: <DeliveryAdd />,
        },

        {
          path: "orders",
          element: <OrdersView />,
        },
        {
          path: "shift",
          element: (
            <ProtectedRoute>
              <Shift />
            </ProtectedRoute>
          ),
        },
        {
          path: "pending-orders",
          element: (
            <ProtectedRoute>
              <PendingOrders />
            </ProtectedRoute>
          ),
        },
        {
          path: "due",
          element: (
            <ProtectedRoute>
              <DueUsers />
            </ProtectedRoute>
          ),
        },
        {
          path: "/invoice/:id",
          element: (
            <ProtectedRoute>
              <InvoicePage />
            </ProtectedRoute>
          )
        },

        {
          path: "*",
          element: <NotFound />,
        },

        {
          path: "/all-orders"
          , element: (
            <ProtectedRoute>
              <AllOrders />
            </ProtectedRoute>
          )
        },
        {
          path: "/tables"
          , element: (
            <ProtectedRoute>
              <Dine />
            </ProtectedRoute>
          )
        },
        {
          path: "/online-orders",
          element: (
            <ProtectedRoute>
              <OnlineTabs />
            </ProtectedRoute>
          )
        },
        {
          path: "/online-orders/:id",
          element: (
            <ProtectedRoute>
              <SinglePage />
            </ProtectedRoute>
          )
        },
        {
          path: "/support",
          element: (

            <ContactSupport />

          )
        },
        {
          path: "/Forders",
          element: (

            <FakeOrders />

          )
        },
        {
          path: "/policy",
          element: (

            <Policy />

          )
        },
        {
          path: "/deliveryOrders",
          element: (
            <ProtectedRoute>
              <DeliveryOrder />
            </ProtectedRoute>
          )
        },
        {
          path: "/dine-in-orders",
          element: (
            <ProtectedRoute>
              <DineInReport />
            </ProtectedRoute>
          )
        },
        {
          path: "/expenses",
          element: (
            <ProtectedRoute>
              <ExpensesList />
            </ProtectedRoute>
          )
        },
      ],
    },
  ],
  {
    basename: "/point-of-sale",
  }
);

export default router;
