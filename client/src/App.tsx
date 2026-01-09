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
import Archive from "./pages/Archive";
import Settings from "./pages/Settings";
import Compilation from "./pages/Compilation";
import ContentPackage from "./pages/ContentPackage";

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
      <Route path={"/archive"}>
        <AppLayout>
          <Archive />
        </AppLayout>
      </Route>
      <Route path={"/settings"}>
        <AppLayout>
          <Settings />
        </AppLayout>
      </Route>
      <Route path={"/compile"}>
        <AppLayout>
          <Compilation />
        </AppLayout>
      </Route>
      <Route path={"/content"}>
        <AppLayout>
          <ContentPackage />
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
