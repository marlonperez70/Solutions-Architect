import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";

// Pages
import Home from "./pages/Home";
import NotFound from "./pages/NotFound";
import Dashboard from "./pages/dashboard/Dashboard";
import AlertCenter from "./pages/alerts/AlertCenter";
import AgentsList from "./pages/agents/AgentsList";
import UsersList from "./pages/users/UsersList";

function Router() {
  return (
    <Switch>
      {/* Public Routes */}
      <Route path={"/"} component={Home} />
      
      {/* Dashboard Routes */}
      <Route path={"/dashboard"} component={Dashboard} />
      <Route path={"/alerts"} component={AlertCenter} />
      <Route path={"/agents"} component={AgentsList} />
      <Route path={"/users"} component={UsersList} />
      
      {/* Error Routes */}
      <Route path={"/404"} component={NotFound} />
      
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
