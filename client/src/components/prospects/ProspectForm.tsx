import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

// Schema for form validation
const prospectFormSchema = z.object({
  name: z.string()
    .min(1, "Name is required")
    .max(50, "Name must be 50 characters or less"),
  email: z.string()
    .min(1, "Email is required")
    .email("Invalid email address"),
  company: z.string()
    .max(50, "Company name must be 50 characters or less")
    .optional()
    .or(z.literal("")),
  position: z.string()
    .max(20, "Position must be 20 characters or less")
    .optional()
    .or(z.literal("")),
  phone: z.string()
    .regex(/^\d{0,10}$/, "Phone must contain only numbers and be 10 digits or less")
    .optional()
    .or(z.literal("")),
  category: z.string().optional(),
});

type ProspectFormValues = z.infer<typeof prospectFormSchema>;

interface ProspectFormProps {
  isOpen: boolean;
  onClose: () => void;
  prospect?: any; // For editing existing prospect
  onProspectCreated?: (prospect: any) => void;
}

export default function ProspectForm({ isOpen, onClose, prospect, onProspectCreated }: ProspectFormProps) {
  const { toast } = useToast();
  const isEditing = !!prospect;
  
  // Setup form with default values
  const form = useForm<ProspectFormValues>({
    resolver: zodResolver(prospectFormSchema),
    mode: "onBlur", // Validate on blur by default
    defaultValues: {
      name: prospect?.name || "",
      email: prospect?.email || "",
      company: prospect?.company || "",
      position: prospect?.position || "",
      phone: prospect?.phone || "",
      category: prospect?.category || "",
    },
  });
  
  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      form.reset({
        name: prospect?.name || "",
        email: prospect?.email || "",
        company: prospect?.company || "",
        position: prospect?.position || "",
        phone: prospect?.phone || "",
        category: prospect?.category || "",
      });
    } else {
      // Reset form when modal is closed
      form.reset();
    }
  }, [isOpen, prospect, form]);
  
  // Create prospect mutation
  const createProspect = useMutation({
    mutationFn: async (data: ProspectFormValues) => {
      const res = await apiRequest("POST", "/api/prospects", data);
      return res.json();
    },
    onSuccess: (newProspect) => {
      // Update the prospects list cache immediately
      queryClient.setQueryData(["/api/prospects"], (oldData: any[]) => {
        if (!oldData) return [newProspect];
        return [newProspect, ...oldData];
      });
      
      toast({
        title: "Prospect created",
        description: "The prospect has been created successfully.",
      });
      
      if (onProspectCreated) {
        onProspectCreated(newProspect);
      }
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create prospect",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Update prospect mutation
  const updateProspect = useMutation({
    mutationFn: async (data: ProspectFormValues) => {
      const res = await apiRequest("PUT", `/api/prospects/${prospect.id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/prospects"] });
      queryClient.invalidateQueries({ queryKey: [`/api/prospects/${prospect.id}`] });
      toast({
        title: "Prospect updated",
        description: "The prospect has been updated successfully.",
      });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update prospect",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Form submit handler
  const onSubmit = (data: ProspectFormValues) => {
    if (isEditing) {
      updateProspect.mutate(data);
    } else {
      createProspect.mutate(data);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Prospect" : "Add New Prospect"}</DialogTitle>
          <DialogDescription>
            {isEditing 
              ? "Update information for this prospect." 
              : "Enter the details for a new prospect."
            }
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="John Doe" 
                      className={cn(
                        fieldState.error && "border-red-500 focus:border-red-500 focus:ring-red-500"
                      )}
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        // Trigger immediate validation for name
                        form.trigger("name");
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="email"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="john@example.com" 
                      className={cn(
                        fieldState.error && "border-red-500 focus:border-red-500 focus:ring-red-500"
                      )}
                      {...field}
                      onBlur={(e) => {
                        field.onBlur();
                        // Trigger validation on blur for email field
                        form.trigger("email");
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="company"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>Company</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Company name" 
                        className={cn(
                          fieldState.error && "border-red-500 focus:border-red-500 focus:ring-red-500"
                        )}
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          form.trigger("company");
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="position"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>Position</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Job title" 
                        className={cn(
                          fieldState.error && "border-red-500 focus:border-red-500 focus:ring-red-500"
                        )}
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          form.trigger("position");
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="phone"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Phone number" 
                        className={cn(
                          fieldState.error && "border-red-500 focus:border-red-500 focus:ring-red-500"
                        )}
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          form.trigger("phone");
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Technology">Technology</SelectItem>
                        <SelectItem value="Finance">Finance</SelectItem>
                        <SelectItem value="Healthcare">Healthcare</SelectItem>
                        <SelectItem value="Education">Education</SelectItem>
                        <SelectItem value="Retail">Retail</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={createProspect.isPending || updateProspect.isPending}
              >
                {(createProspect.isPending || updateProspect.isPending) 
                  ? "Saving..." 
                  : isEditing ? "Update Prospect" : "Add Prospect"
                }
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
