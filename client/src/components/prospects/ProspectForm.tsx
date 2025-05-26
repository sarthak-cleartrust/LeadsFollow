import { useState } from "react";
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

// Schema for form validation
const prospectFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  company: z.string().optional(),
  position: z.string().optional(),
  phone: z.string().optional(),
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
    defaultValues: {
      name: prospect?.name || "",
      email: prospect?.email || "",
      company: prospect?.company || "",
      position: prospect?.position || "",
      phone: prospect?.phone || "",
      category: prospect?.category || "",
    },
  });
  
  // Create prospect mutation
  const createProspect = useMutation({
    mutationFn: async (data: ProspectFormValues) => {
      const res = await apiRequest("POST", "/api/prospects", data);
      return res.json();
    },
    onSuccess: (newProspect) => {
      queryClient.invalidateQueries({ queryKey: ["/api/prospects"] });
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
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} />
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
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="john@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="company"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company</FormLabel>
                    <FormControl>
                      <Input placeholder="Company name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="position"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Position</FormLabel>
                    <FormControl>
                      <Input placeholder="Job title" {...field} />
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
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="Phone number" {...field} />
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
