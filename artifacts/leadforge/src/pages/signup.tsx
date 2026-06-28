import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useSignup } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

const signupSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
});

type SignupFormValues = z.infer<typeof signupSchema>;

export default function Signup() {
  const [, setLocation] = useLocation();
  const { setToken } = useAuth();
  const { toast } = useToast();
  const signupMutation = useSignup();

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  const onSubmit = (data: SignupFormValues) => {
    signupMutation.mutate(
      { data },
      {
        onSuccess: (res) => {
          setToken(res.token);
          toast({ title: "Account created!", description: "Welcome to LeadForge." });
          setLocation("/dashboard");
        },
        onError: (error) => {
          toast({ 
            variant: "destructive", 
            title: "Signup failed", 
            description: error.data?.error || "Could not create account. Please try again." 
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
              <CardTitle className="text-2xl font-semibold tracking-tight">Create your account</CardTitle>
              <CardDescription>
                Join LeadForge and turbocharge your sales process.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0 lg:px-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John Doe" {...field} data-testid="input-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Work Email</FormLabel>
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
                    disabled={signupMutation.isPending}
                    data-testid="button-submit"
                  >
                    {signupMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Sign up
                  </Button>
                </form>
              </Form>
            </CardContent>
            <CardFooter className="px-0 lg:px-6 flex justify-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="ml-1 font-medium text-primary hover:underline" data-testid="link-login">
                Sign in
              </Link>
            </CardFooter>
          </Card>
        </div>
      </div>
      
      <div className="hidden lg:block relative w-0 flex-1 bg-sidebar overflow-hidden">
        <div className="absolute inset-0 h-full w-full bg-[radial-gradient(#ffffff15_1px,transparent_1px)] [background-size:20px_20px] opacity-20"></div>
        <div className="absolute inset-0 flex items-center justify-center p-12">
          <div className="max-w-lg text-sidebar-foreground">
            <h2 className="text-3xl font-bold tracking-tight mb-4 text-white">Scale your outbound.</h2>
            <p className="text-lg text-sidebar-foreground/80 mb-8">
              Stop switching between ten different tabs. Manage discovery, sequences, and conversations in one purpose-built workspace.
            </p>
            <div className="space-y-4">
              {[
                "Global B2B contact database",
                "Automated email sequences",
                "AI-driven intent signaling",
                "Built-in chat assistant"
              ].map((feature, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary shrink-0">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  </div>
                  <span className="text-sidebar-foreground/90 font-medium">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
