import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Form schema
const followUpRulesSchema = z.object({
  initialResponseDays: z.number().min(1).max(30),
  standardFollowUpDays: z.number().min(1).max(30),
  notifyEmail: z.boolean(),
  notifyBrowser: z.boolean(),
  notifyDailyDigest: z.boolean(),
  highPriorityDays: z.number().min(1).max(10),
  mediumPriorityDays: z.number().min(1).max(10),
  lowPriorityDays: z.number().min(1).max(10),
});

type FollowUpRulesFormValues = z.infer<typeof followUpRulesSchema>;

interface FollowUpRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function FollowUpRulesModal({ isOpen, onClose }: FollowUpRulesModalProps) {
  const { toast } = useToast();
  
  // Query for current settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ["/api/follow-up-settings"],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  // Setup form
  const form = useForm<FollowUpRulesFormValues>({
    resolver: zodResolver(followUpRulesSchema),
    defaultValues: {
      initialResponseDays: settings?.initialResponseDays || 2,
      standardFollowUpDays: settings?.standardFollowUpDays || 4,
      notifyEmail: settings?.notifyEmail ?? true,
      notifyBrowser: settings?.notifyBrowser ?? true,
      notifyDailyDigest: settings?.notifyDailyDigest ?? true,
      highPriorityDays: settings?.highPriorityDays || 3,
      mediumPriorityDays: settings?.mediumPriorityDays || 1,
      lowPriorityDays: settings?.lowPriorityDays || 3,
    },
    values: settings as FollowUpRulesFormValues || undefined,
  });
  
  // Update settings mutation
  const updateSettings = useMutation({
    mutationFn: async (data: FollowUpRulesFormValues) => {
      const res = await apiRequest("PUT", "/api/follow-up-settings", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/follow-up-settings"] });
      toast({
        title: "Settings updated",
        description: "Your follow-up rules have been updated successfully.",
      });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update settings",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Form submit handler
  const onSubmit = (data: FollowUpRulesFormValues) => {
    updateSettings.mutate(data);
  };
  
  if (isLoading) {
    return null;
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Customize Follow-up Rules</DialogTitle>
          <DialogDescription>
            Configure when and how you want to be notified about prospect follow-ups.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            {/* Default Follow-up Timeline */}
            <div className="border border-neutral-300 dark:border-border rounded-md p-4">
              <h4 className="font-medium mb-3">Default Follow-up Timeline</h4>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="initialResponseDays"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Initial Response</FormLabel>
                      <div className="flex items-center">
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
                            max={30}
                            className="w-20"
                            {...field}
                            onChange={e => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <span className="ml-2 text-sm text-neutral-500">days</span>
                      </div>
                      <FormDescription className="text-xs text-neutral-500">
                        After first contact with prospect
                      </FormDescription>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="standardFollowUpDays"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Standard Follow-up</FormLabel>
                      <div className="flex items-center">
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
                            max={30}
                            className="w-20"
                            {...field}
                            onChange={e => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <span className="ml-2 text-sm text-neutral-500">days</span>
                      </div>
                      <FormDescription className="text-xs text-neutral-500">
                        After last communication
                      </FormDescription>
                    </FormItem>
                  )}
                />
              </div>
            </div>
            
            {/* Notification Preferences */}
            <div className="border border-neutral-300 dark:border-border rounded-md p-4">
              <h4 className="font-medium mb-3">Notification Preferences</h4>
              <div className="space-y-3">
                <FormField
                  control={form.control}
                  name="notifyEmail"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="font-normal text-sm">
                        Email notifications
                      </FormLabel>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="notifyBrowser"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="font-normal text-sm">
                        Browser notifications
                      </FormLabel>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="notifyDailyDigest"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="font-normal text-sm">
                        Daily digest summary
                      </FormLabel>
                    </FormItem>
                  )}
                />
              </div>
            </div>
            
            {/* Priority Rules */}
            <div className="border border-neutral-300 dark:border-border rounded-md p-4">
              <h4 className="font-medium mb-3">Priority Rules</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-alert rounded-full mr-2"></div>
                    <span className="text-sm">High Priority</span>
                  </div>
                  <div>
                    <FormField
                      control={form.control}
                      name="highPriorityDays"
                      render={({ field }) => (
                        <FormItem>
                          <Select
                            value={field.value.toString()}
                            onValueChange={val => field.onChange(parseInt(val))}
                          >
                            <FormControl>
                              <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Select days" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="1">Overdue by 1+ days</SelectItem>
                              <SelectItem value="2">Overdue by 2+ days</SelectItem>
                              <SelectItem value="3">Overdue by 3+ days</SelectItem>
                              <SelectItem value="5">Overdue by 5+ days</SelectItem>
                              <SelectItem value="7">Overdue by 7+ days</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-orange-400 rounded-full mr-2"></div>
                    <span className="text-sm">Medium Priority</span>
                  </div>
                  <div>
                    <FormField
                      control={form.control}
                      name="mediumPriorityDays"
                      render={({ field }) => (
                        <FormItem>
                          <Select
                            value={field.value.toString()}
                            onValueChange={val => field.onChange(parseInt(val))}
                          >
                            <FormControl>
                              <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Select days" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="0">Due today</SelectItem>
                              <SelectItem value="1">Due tomorrow</SelectItem>
                              <SelectItem value="2">Due in 2 days</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-secondary rounded-full mr-2"></div>
                    <span className="text-sm">Low Priority</span>
                  </div>
                  <div>
                    <FormField
                      control={form.control}
                      name="lowPriorityDays"
                      render={({ field }) => (
                        <FormItem>
                          <Select
                            value={field.value.toString()}
                            onValueChange={val => field.onChange(parseInt(val))}
                          >
                            <FormControl>
                              <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Select days" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="3">Due in next 3 days</SelectItem>
                              <SelectItem value="5">Due in next 5 days</SelectItem>
                              <SelectItem value="7">Due in next week</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>
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
                disabled={updateSettings.isPending}
                className="bg-primary hover:bg-primary/90 text-white"
              >
                {updateSettings.isPending ? "Saving..." : "Save Rules"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
