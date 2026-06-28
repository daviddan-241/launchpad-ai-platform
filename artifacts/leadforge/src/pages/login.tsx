import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useLogin } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function Login() {
  const [, setLocation] = useLocation();
  const { setToken } = useAuth();
  const { toast } = useToast();
  const loginMutation = useLogin();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = (data: LoginFormValues) => {
    loginMutation.mutate(
      { data },
      {
        onSuccess: (res) => {
          setToken(res.token);
          toast({ title: "Welcome back!", description: "Successfully logged in." });
          setLocation("/dashboard");
        },
        onError: (error) => {
          toast({ 
            variant: "destructive", 
            title: "Login failed", 
            description: error.data?.error || "Invalid email or password." 
          });
        },
      }
    );
  };

  return (
    <div className="min-h-screen flex bg-background">
      <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:flex-none lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          <div className="flex items-center gap-2 font-bold text-2xl mb-8">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground">L</span>
            </div>
            LeadForge
          </div>
          
          <Card className="border-0 shadow-none lg:border lg:shadow-sm bg-transparent lg:bg-card">
            <CardHeader className="px-0 lg:px-6">
              <CardTitle className="text-2xl font-semibold tracking-tight">Sign in to your account</CardTitle>
              <CardDescription>
                Enter your details to access your workspace
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0 lg:px-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="name@company.com" {...field} data-testid="input-email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="••••••••" {...field} data-testid="input-password" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={loginMutation.isPending}
                    data-testid="button-submit"
                  >
                    {loginMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Sign in
                  </Button>
                </form>
              </Form>
            </CardContent>
            <CardFooter className="px-0 lg:px-6 flex justify-center text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Link href="/signup" className="ml-1 font-medium text-primary hover:underline" data-testid="link-signup">
                Sign up
              </Link>
            </CardFooter>
          </Card>
        </div>
      </div>
      
      <div className="hidden lg:block relative w-0 flex-1 bg-sidebar overflow-hidden">
        <div className="absolute inset-0 h-full w-full bg-[radial-gradient(#ffffff15_1px,transparent_1px)] [background-size:20px_20px] opacity-20"></div>
        <div className="absolute inset-0 flex items-center justify-center p-12">
          <div className="max-w-lg text-sidebar-foreground">
            <h2 className="text-3xl font-bold tracking-tight mb-4 text-white">Precision sales intelligence.</h2>
            <p className="text-lg text-sidebar-foreground/80 mb-8">
              Discover leads globally, run targeted email campaigns, and manage your pipeline with AI assistance—all from a single cockpit.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
                <div className="text-2xl font-bold text-white mb-1">100M+</div>
                <div className="text-sm text-sidebar-foreground/70">Verified Contacts</div>
              </div>
              <div className="p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
                <div className="text-2xl font-bold text-white mb-1">AI-Powered</div>
                <div className="text-sm text-sidebar-foreground/70">Sales Workflows</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
