import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface UsernameModalProps {
  initialUsername: string;
  onSubmit: (username: string) => void;
}

const usernameSchema = z.object({
  username: z.string().min(2, {
    message: "Username must be at least 2 characters.",
  }),
});

type FormValues = z.infer<typeof usernameSchema>;

const UsernameModal = ({ initialUsername, onSubmit }: UsernameModalProps) => {
  const form = useForm<FormValues>({
    resolver: zodResolver(usernameSchema),
    defaultValues: {
      username: initialUsername,
    },
  });

  const handleSubmit = (values: FormValues) => {
    onSubmit(values.username);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Welcome to AI Chat</h2>
        <p className="text-gray-600 mb-6">Please enter your name to get started.</p>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-700">Your Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter your name"
                      {...field}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              className="w-full bg-primary hover:bg-accent text-white py-2 px-4 rounded-lg transition-colors duration-200"
            >
              Start Chatting
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
};

export default UsernameModal;
