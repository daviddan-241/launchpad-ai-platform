import { useGetLeadAnalytics, getGetLeadAnalyticsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from "recharts";

const COLORS = ['#7c3aed', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function Analytics() {
  const { data: analytics, isLoading } = useGetLeadAnalytics({
    query: { queryKey: getGetLeadAnalyticsQueryKey() }
  });

  if (isLoading) {
    return <div className="flex justify-center items-center h-[50vh]"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground mt-2">Deep dive into your pipeline performance and lead quality.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Lead Pipeline Status</CardTitle>
            <CardDescription>Current distribution of leads across the sales funnel</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            {analytics?.byStatus && analytics.byStatus.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.byStatus} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                  <XAxis type="number" />
                  <YAxis dataKey="status" type="category" width={80} tick={{ fontSize: 12, fill: '#6b7280' }} />
                  <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No data available</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Geographic Distribution</CardTitle>
            <CardDescription>Top countries for your leads</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            {analytics?.byCountry && analytics.byCountry.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analytics.byCountry}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="count"
                    nameKey="country"
                  >
                    {analytics.byCountry.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No data available</div>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2 lg:col-span-1">
          <CardHeader>
            <CardTitle>Industry Breakdown</CardTitle>
            <CardDescription>Sectors your leads belong to</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
             {analytics?.byIndustry && analytics.byIndustry.length > 0 ? (
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={analytics.byIndustry} margin={{ top: 20, right: 30, left: 0, bottom: 25 }}>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                   <XAxis dataKey="industry" tick={{ fontSize: 11, fill: '#6b7280' }} angle={-45} textAnchor="end" height={60} />
                   <YAxis />
                   <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                   <Bar dataKey="count" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                 </BarChart>
               </ResponsiveContainer>
             ) : (
               <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No data available</div>
             )}
          </CardContent>
        </Card>
        
        <Card className="md:col-span-2 lg:col-span-1">
          <CardHeader>
            <CardTitle>Lead Score Quality</CardTitle>
            <CardDescription>Distribution of AI-assigned lead scores</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
             {analytics?.scoreDistribution && analytics.scoreDistribution.length > 0 ? (
               <ResponsiveContainer width="100%" height="100%">
                 <LineChart data={analytics.scoreDistribution} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                   <XAxis dataKey="range" tick={{ fontSize: 12, fill: '#6b7280' }} />
                   <YAxis />
                   <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                   <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 4, fill: "hsl(var(--primary))" }} activeDot={{ r: 6 }} />
                 </LineChart>
               </ResponsiveContainer>
             ) : (
               <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No data available</div>
             )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
