import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import ProspectList from "@/components/prospects/ProspectList";
import ProspectDetail from "@/components/prospects/ProspectDetail";
import ProspectForm from "@/components/prospects/ProspectForm";
import { useQuery } from "@tanstack/react-query";

export default function Prospects() {
  const [location, setLocation] = useLocation();
  const search = useSearch();
  const searchParams = new URLSearchParams(search);
  
  // State for selected prospect and modal
  const [selectedProspectId, setSelectedProspectId] = useState<number | undefined>(
    searchParams.get("id") ? parseInt(searchParams.get("id") || "0") : undefined
  );
  const [showNewProspectModal, setShowNewProspectModal] = useState(
    searchParams.get("new") === "true"
  );
  
  // Update URL when selected prospect changes
  useEffect(() => {
    if (selectedProspectId) {
      setLocation(`/prospects?id=${selectedProspectId}`, { replace: true });
    } else if (showNewProspectModal) {
      setLocation('/prospects?new=true', { replace: true });
    } else {
      setLocation('/prospects', { replace: true });
    }
  }, [selectedProspectId, showNewProspectModal, setLocation]);
  
  // Query for prospect list
  const { data: prospects } = useQuery({
    queryKey: ["/api/prospects"],
    staleTime: 60 * 1000, // 1 minute
  });
  
  // Handle prospect selection
  const handleSelectProspect = (prospect: any) => {
    setSelectedProspectId(prospect.id);
    setShowNewProspectModal(false);
  };
  
  // Open New Prospect Modal
  const handleAddProspect = () => {
    setShowNewProspectModal(true);
    setSelectedProspectId(undefined);
  };
  
  // Close New Prospect Modal
  const handleCloseNewProspectModal = () => {
    setShowNewProspectModal(false);
    setLocation('/prospects', { replace: true });
  };
  
  // Find first prospect if none selected
  useEffect(() => {
    if (!selectedProspectId && !showNewProspectModal && prospects?.length > 0) {
      setSelectedProspectId(prospects[0].id);
    }
  }, [selectedProspectId, showNewProspectModal, prospects]);
  
  return (
    <div className="flex h-full overflow-hidden">
      <ProspectList 
        selectedProspectId={selectedProspectId}
        onSelectProspect={handleSelectProspect}
        onAddProspect={handleAddProspect}
      />
      
      <ProspectDetail 
        prospectId={selectedProspectId!}
      />
      
      <ProspectForm 
        isOpen={showNewProspectModal}
        onClose={handleCloseNewProspectModal}
      />
    </div>
  );
}
