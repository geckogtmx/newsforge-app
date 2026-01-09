import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import AppLayout from "./components/AppLayout";
import Dashboard from "./pages/Dashboard";
import Sources from "./pages/Sources";
import NewsInbox from "./pages/NewsInbox";

function Router() {
  return (
    <Switch>
      <Route path={"/"}>
        <AppLayout>
          <Dashboard />
        </AppLayout>
      </Route>
      <Route path={"/sources"}>
        <AppLayout>
          <Sources />
        </AppLayout>
      </Route>
      <Route path={"/run"}>
        <AppLayout>
          <NewsInbox />
        </AppLayout>
      </Route>
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
