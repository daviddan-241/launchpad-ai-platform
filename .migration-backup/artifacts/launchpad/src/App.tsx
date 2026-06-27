import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";
import NotFound from "@/pages/not-found";

import Dashboard from "@/pages/dashboard";
import Leads from "@/pages/leads/index";
import LeadDiscover from "@/pages/leads/discover";
import LeadDetail from "@/pages/leads/detail";
import Chat from "@/pages/chat/index";
import Campaigns from "@/pages/campaigns/index";
import CampaignNew from "@/pages/campaigns/new";
import CampaignDetail from "@/pages/campaigns/detail";
import Projects from "@/pages/projects/index";
import ProjectNew from "@/pages/projects/new";
import ProjectDetail from "@/pages/projects/detail";
import Settings from "@/pages/settings/index";

const queryClient = new QueryClient();

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/leads" component={Leads} />
        <Route path="/leads/discover" component={LeadDiscover} />
        <Route path="/leads/:id" component={LeadDetail} />
        <Route path="/chat" component={Chat} />
        <Route path="/campaigns" component={Campaigns} />
        <Route path="/campaigns/new" component={CampaignNew} />
        <Route path="/campaigns/:id" component={CampaignDetail} />
        <Route path="/projects" component={Projects} />
        <Route path="/projects/new" component={ProjectNew} />
        <Route path="/projects/:id" component={ProjectDetail} />
        <Route path="/settings" component={Settings} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
