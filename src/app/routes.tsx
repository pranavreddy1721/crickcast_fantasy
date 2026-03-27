import { createBrowserRouter } from "react-router";
import Leaderboard from "./pages/Leaderboard";
import AdminPanel from "./pages/AdminPanel";
import FirstTimeSetup from "./pages/FirstTimeSetup";
import RootLayout from "./components/RootLayout";
import ErrorBoundary from "./components/ErrorBoundary";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: RootLayout,
    errorElement: <ErrorBoundary />,
    children: [
      { 
        index: true, 
        Component: Leaderboard,
        errorElement: <ErrorBoundary />
      },
      { 
        path: "admin", 
        Component: AdminPanel,
        errorElement: <ErrorBoundary />
      },
      { 
        path: "setup", 
        Component: FirstTimeSetup,
        errorElement: <ErrorBoundary />
      },
    ],
  },
]);